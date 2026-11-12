/**
 * zombies.js - 原版 1:1 僵尸实体系统与 DOM 60fps 动态 GIF 动画层
 */
import { GAME_CONFIG } from './config.js';
import { soundEngine } from './audio.js';
import { FloatingText } from './projectiles.js';

export class Zombie {
    constructor(type = 'normal', row = 2, startX = 900, entityLayer = null) {
        this.id = 'zombie_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        this.type = type;
        this.row = row;
        this.config = GAME_CONFIG.zombies[type] || GAME_CONFIG.zombies.normal;
        this.x = startX;
        this.cellH = GAME_CONFIG.canvas.cellHeight;
        this.cellW = GAME_CONFIG.canvas.cellWidth;
        this.gridStartY = GAME_CONFIG.canvas.gridStartY;
        this.y = this.gridStartY + row * this.cellH + this.cellH / 2;
        this.hp = this.config.hp || 270;
        this.armorHp = this.config.armorHp || 0;
        this.headLossThreshold = this.config.headLossThreshold || 70;
        this.maxTotalHp = this.hp + this.armorHp;
        this.speed = this.config.speed || 18;
        this.dps = this.config.dps || 100;
        this.biteDamage = this.config.biteDamage || 25;
        this.biteInterval = this.config.biteInterval || 0.25;
        this.biteTimer = 0;

        this.state = 'walk';
        this.isDead = false;
        this.isDying = false;
        this.dyingTimer = 0;
        this.dyingDuration = 1.0;

        this.hasLostHead = false;
        this.slowTimer = 0;
        this.isSlowed = false;
        this.hitFlashTimer = 0;

        // 撑杆跳机制
        this.hasPole = this.type === 'polevault';
        this.jumpTimer = 0;
        this.jumpStartX = 0;
        this.jumpTargetX = 0;

        // 读报僵尸失报问号停顿与狂暴状态
        this.isEnraged = false;
        this.enrageTimer = 0;

        // 舞王僵尸太空步与伴舞召唤状态机
        this.dancePhase = this.type === 'dancing' ? 'moonwalk' : null;
        this.moonwalkTimer = 2.8;
        this.summonTimer = 0;
        this.summonCooldown = 1.5;
        this.backupDancers = { front: null, back: null, up: null, down: null };
        if (this.type === 'dancing') {
            this.speed = this.config.moonwalkSpeed || 48;
        }

        // 动画资产
        this.walkAnim = this.type === 'polevault' ? (this.config.runAnim || 'assets/zombies/polevault_run.gif') : this.config.walkAnims[Math.floor(Math.random() * this.config.walkAnims.length)];
        this.attackAnim = this.config.attackAnim;
        this.headAnim = this.config.headAnim;
        this.dieAnim = this.config.dieAnim;
        this.currentAnim = this.type === 'dancing' ? (this.config.moonwalkAnim || this.walkAnim) : this.walkAnim;

        // 数理破盾徽章
        this.hasShield = !!this.config.hasShield && this.armorHp > 0;
        this.shieldType = this.config.shieldType || null;
        this.shieldMathSymbol = this.type === 'conehead' ? '🔺' : (this.type === 'buckethead' ? '🪣' : (this.type === 'newspaper' ? '📰' : (this.type === 'football' ? '🏈' : '🚪')));

        this.freezeTimer = 0;
        this.isHypnotized = false;

        this.domElement = null;
        this.domImg = null;
        this.domShield = null;
        this.entityLayer = entityLayer;

        if (entityLayer) {
            this.createDOM(entityLayer);
        }
    }

    createDOM(container) {
        if (!container) return;
        this.domElement = document.createElement('div');
        this.domElement.className = `zombie-entity zombie-${this.type}`;
        this.domElement.setAttribute('data-id', this.id);
        const baseTop = this.gridStartY + this.row * this.cellH - 46;
        this.domElement.style.left = `${this.x - 105}px`;
        this.domElement.style.top = `${baseTop}px`;

        this.domImg = document.createElement('img');
        this.domImg.className = 'zombie-gif';
        this.domImg.src = this.currentAnim;
        this.domElement.appendChild(this.domImg);

        container.appendChild(this.domElement);
    }

    setAnim(newSrc) {
        if (this.currentAnim !== newSrc) {
            this.currentAnim = newSrc;
            if (this.domImg) {
                this.domImg.src = newSrc;
            }
        }
    }

    onArmorBroken(prevShield) {
        this.armorHp = 0;
        this.hasShield = false;
        if (this.domShield) this.domShield.style.display = 'none';

        this.spawnFallingArmor(prevShield);

        if (this.type === 'newspaper') {
            this.isEnraged = true;
            this.state = 'enraging';
            this.enrageTimer = this.config.enragePauseDuration || 1.35;
            const nextSpeed = this.config.rageSpeed || 52;
            this.speed = this.isHypnotized ? -Math.abs(nextSpeed) : nextSpeed;
            this.dps = this.config.rageDps || 165;
            this.biteInterval = this.config.rageBiteInterval || 0.15;
            this.walkAnim = this.config.rageAnim || 'assets/zombies/newspaper_rage_walk.gif';
            this.attackAnim = this.config.rageAttackAnim || this.walkAnim;
            this.setAnim(this.config.lostPaperAnim || 'assets/zombies/newspaper_lost.gif');
            soundEngine.playGroan();
        } else if (this.type === 'football') {
            this.walkAnim = this.config.noHelmetWalkAnim || 'assets/zombies/football_nohelmet_walk.gif';
            this.attackAnim = this.config.noHelmetAttackAnim || 'assets/zombies/football_nohelmet_attack.gif';
            this.setAnim(this.state === 'attack' ? this.attackAnim : this.walkAnim);
        } else {
            this.walkAnim = GAME_CONFIG.zombies.normal.walkAnims[0];
            this.attackAnim = GAME_CONFIG.zombies.normal.attackAnim;
            this.setAnim(this.state === 'attack' ? this.attackAnim : this.walkAnim);
        }
    }

    takeDamage(amount, isSlow = false) {
        if (this.isDead || this.isDying) return;

        this.hitFlashTimer = 0.08;
        if (this.domElement) {
            this.domElement.classList.add('hit-flash');
            setTimeout(() => {
                if (this.domElement) this.domElement.classList.remove('hit-flash');
            }, 80);
        }

        // 原版机制：前向手持护盾（铁栅门/报纸）完好时阻挡寒冰豌豆的减速效果
        const shieldBlocksChill = this.hasShield && this.armorHp > 0 &&
            (this.shieldType === 'screendoor' || this.shieldType === 'newspaper');
        if (isSlow && !shieldBlocksChill) {
            this.slowTimer = 10.0;
            this.isSlowed = true;
            if (this.domElement) this.domElement.classList.add('slowed');
        }

        if (this.armorHp > 0) {
            this.armorHp -= amount;
            if (this.armorHp <= 0) {
                const overflow = -this.armorHp;
                const prevShield = this.shieldType;
                soundEngine.playSplat();
                this.onArmorBroken(prevShield);
                this.hp -= overflow;
            }
        } else {
            this.hp -= amount;
        }

        if (this.hp <= this.headLossThreshold && !this.hasLostHead) {
            this.hasLostHead = true;
            this.spawnFallingHead();
            if (this.config.lostHeadWalkAnim) {
                this.walkAnim = this.config.lostHeadWalkAnim;
                this.setAnim(this.walkAnim);
            }
        }

        if (this.hp <= 0) {
            this.hp = 0;
            if (amount >= 1000) {
                this.blastDie();
            } else {
                this.die();
            }
        }
    }

    takeFumeDamage(amount) {
        if (this.isDead || this.isDying) return;
        // 大喷菇孢子雾：穿透铁栅门与报纸直击本体，但不能绕过路障/铁桶/橄榄球等头顶防具
        if (this.hasShield && this.shieldType === 'screendoor') {
            this.takePiercingDamage(amount);
            return;
        }
        if (this.hasShield && this.shieldType === 'newspaper') {
            // 同时侵蚀报纸与读报僵尸本体
            if (this.armorHp > 0) {
                this.armorHp -= amount;
                if (this.armorHp <= 0) {
                    const prevShield = this.shieldType;
                    soundEngine.playSplat();
                    this.onArmorBroken(prevShield);
                }
            }
            this.takePiercingDamage(amount);
            return;
        }
        this.takeDamage(amount, false);
    }

    takePiercingDamage(amount) {
        if (this.isDead || this.isDying) return;
        this.hitFlashTimer = 0.12;
        if (this.domElement) {
            this.domElement.classList.add('hit-flash');
            setTimeout(() => {
                if (this.domElement) this.domElement.classList.remove('hit-flash');
            }, 80);
        }

        this.hp -= amount;
        if (this.hp <= this.headLossThreshold && !this.hasLostHead) {
            this.hasLostHead = true;
            this.spawnFallingHead();
            if (this.config.lostHeadWalkAnim) {
                this.walkAnim = this.config.lostHeadWalkAnim;
                this.setAnim(this.walkAnim);
            }
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    hypnotize() {
        if (this.isHypnotized || this.isDead || this.isDying) return;
        this.isHypnotized = true;
        this.speed = -Math.abs(this.speed || 18);
        if (this.domElement) {
            this.domElement.style.transformOrigin = this.type === 'football' ? '122px center' : '105px center';
            this.domElement.style.transform = 'scaleX(-1)';
            this.domElement.style.filter = 'drop-shadow(0 0 12px #d980fa) hue-rotate(280deg)';
        }
    }

    applyFreeze(freezeSec = 4.0, slowSec = 10.0) {
        this.freezeTimer = freezeSec;
        this.slowTimer = freezeSec + slowSec;
        this.isSlowed = true;
        if (this.domElement) {
            this.domElement.classList.add('frozen');
        }
    }

    spawnFallingArmor(shieldType) {
        if (!this.entityLayer) return;
        const armorEl = document.createElement('div');
        armorEl.className = `armor-drop-entity armor-${shieldType || 'cone'}`;
        armorEl.style.left = `${this.x - 20}px`;
        armorEl.style.top = `${this.gridStartY + this.row * this.cellH - 35}px`;
        const dropMap = {
            bucket: 'assets/zombies/bucket_drop.png',
            newspaper: 'assets/zombies/newspaper_drop.png',
            screendoor: 'assets/zombies/screendoor_drop.png',
            football: 'assets/zombies/football_drop.png',
            cone: 'assets/zombies/cone_drop.png'
        };
        const imgSrc = dropMap[shieldType] || 'assets/zombies/cone_drop.png';
        armorEl.innerHTML = `<img src="${imgSrc}" />`;
        this.entityLayer.appendChild(armorEl);

        setTimeout(() => {
            if (armorEl.parentNode) armorEl.parentNode.removeChild(armorEl);
        }, 800);
    }

    spawnFallingHead() {
        if (!this.entityLayer) return;
        const headEl = document.createElement('div');
        headEl.className = 'head-drop-entity';
        headEl.style.left = `${this.x - 30}px`;
        headEl.style.top = `${this.gridStartY + this.row * this.cellH - 25}px`;
        headEl.innerHTML = `<img src="${this.headAnim}" class="head-gif" />`;
        this.entityLayer.appendChild(headEl);

        setTimeout(() => {
            if (headEl.parentNode) headEl.parentNode.removeChild(headEl);
        }, 800);
    }

    breakShieldInstantly(engine) {
        if (!this.hasShield || this.armorHp <= 0) return;
        const prevShield = this.shieldType;
        this.onArmorBroken(prevShield);

        engine.floatingTexts.push(
            new FloatingText(this.x, this.y - 45, '💥 破盾神雷!', '#ff3838', 22)
        );
        soundEngine.playThunder();
    }

    die(isCharred = false) {
        if (this.isDying || this.isDead) return;
        this.isDying = true;
        this.state = 'dying';

        if (this.domShield) {
            this.domShield.style.display = 'none';
        }

        if (isCharred) {
            this.dyingDuration = 2.4;
            this.setAnim('assets/zombies/zombie_charred.gif');
            if (this.domElement) {
                this.domElement.classList.add('charred-die');
            }
        } else {
            this.setAnim(this.dieAnim);
        }

        setTimeout(() => {
            this.destroy();
        }, this.dyingDuration * 1000);
    }

    blastDie() {
        this.hp = 0;
        this.die(true);
    }

    destroy() {
        this.isDead = true;
        if (this.domElement && this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
            this.domElement = null;
        }
    }

    getBackupSlots(engine) {
        const activeRows = (engine && engine.levelConfig && engine.levelConfig.activeRows) || [0, 1, 2, 3, 4];
        const waterRows = (engine && engine.waterRows) || [];
        const dir = this.isHypnotized ? 1 : -1;
        const rawSlots = {
            front: { row: this.row, dx: 68 * dir },
            back: { row: this.row, dx: -68 * dir },
            up: { row: this.row - 1, dx: 0 },
            down: { row: this.row + 1, dx: 0 }
        };
        const valid = {};
        Object.keys(rawSlots).forEach(k => {
            const s = rawSlots[k];
            if (activeRows.includes(s.row) && !waterRows.includes(s.row)) {
                valid[k] = s;
            }
        });
        return valid;
    }

    hasMissingBackup(engine) {
        const slots = this.getBackupSlots(engine);
        return Object.keys(slots).some(k => {
            const d = this.backupDancers[k];
            return !d || d.isDead || d.isDying;
        });
    }

    summonBackupDancers(engine) {
        if (!engine || !engine.zombies) return;
        const slots = this.getBackupSlots(engine);
        let spawned = 0;
        Object.keys(slots).forEach(k => {
            const cur = this.backupDancers[k];
            if (!cur || cur.isDead || cur.isDying) {
                const s = slots[k];
                const spawnX = Math.max(90, Math.min(890, this.x + s.dx));
                const dancer = new Zombie('backup_dancer', s.row, spawnX, this.entityLayer);
                if (this.isHypnotized) {
                    dancer.hypnotize();
                }
                this.backupDancers[k] = dancer;
                engine.zombies.push(dancer);
                spawned++;
            }
        });
        if (spawned > 0) {
            soundEngine.playDisco();
            if (engine.floatingTexts) {
                engine.floatingTexts.push(
                    new FloatingText(this.x, this.y - 45, '🕺 迪斯科伴舞登场!', '#f368e0', 18)
                );
            }
        }
    }

    update(dt, engine) {
        if (this.isDead) return;

        // 同步引擎当前网格尺寸 (泳池关 6 行 rowCount=6, cellH=85)
        if (engine) {
            if (engine.cellH) this.cellH = engine.cellH;
            if (engine.gridStartY) this.gridStartY = engine.gridStartY;
            this.y = this.gridStartY + this.row * this.cellH + this.cellH / 2;
        }

        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0 && this.domElement) {
                this.domElement.classList.remove('frozen');
            }
            return;
        }

        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.isSlowed = false;
                if (this.domElement) this.domElement.classList.remove('slowed');
            }
        }

        if (this.isDying) {
            return;
        }

        // 读报僵尸报纸被打碎后的原地问号愤怒停顿 (原版 ~1.35s)
        if (this.state === 'enraging') {
            this.enrageTimer -= dt;
            if (this.enrageTimer > 0) {
                if (this.domElement) {
                    this.domElement.style.left = `${this.x - 105}px`;
                    this.domElement.style.top = `${this.gridStartY + this.row * this.cellH - 46}px`;
                }
                return;
            }
            this.state = 'walk';
            this.setAnim(this.walkAnim);
            if (engine && engine.floatingTexts) {
                engine.floatingTexts.push(new FloatingText(this.x, this.y - 45, '😡 报纸碎了！狂暴冲锋！', '#e74c3c', 18));
            }
        }

        // 舞王僵尸太空步入场与聚光灯召唤伴舞状态机 (支持魅惑状态下召唤魅惑伴舞)
        if (this.type === 'dancing' && !this.hasLostHead && engine) {
            if (this.dancePhase === 'moonwalk') {
                this.moonwalkTimer -= dt;
                const hasObstacle = this.isHypnotized
                    ? engine.zombies.some(z => !z.isDead && !z.isDying && !z.isHypnotized && z.row === this.row && Math.abs(z.x - this.x) <= 45)
                    : (engine.plants.some(p => p.row === this.row && !p.isDead && p.x <= this.x && Math.abs(p.x - this.x) <= 45) ||
                       engine.zombies.some(z => !z.isDead && !z.isDying && z.isHypnotized && z.row === this.row && Math.abs(z.x - this.x) <= 45));
                if (this.moonwalkTimer <= 0 || hasObstacle || (!this.isHypnotized && this.x <= 680)) {
                    this.dancePhase = 'summon';
                    this.summonTimer = 1.15;
                    const baseSpd = this.config.speed || 16;
                    this.speed = this.isHypnotized ? -Math.abs(baseSpd) : baseSpd;
                    this.setAnim(this.config.summonAnim || 'assets/zombies/dancing_summon.gif');
                    soundEngine.playDisco();
                    return;
                }
            } else if (this.dancePhase === 'summon') {
                this.summonTimer -= dt;
                this.setAnim(this.config.summonAnim || 'assets/zombies/dancing_summon.gif');
                if (this.summonTimer <= 0) {
                    this.summonBackupDancers(engine);
                    this.dancePhase = 'dance_walk';
                    this.summonCooldown = 7.0;
                    this.state = 'walk';
                    this.setAnim(this.walkAnim);
                }
                if (this.domElement) {
                    this.domElement.style.left = `${this.x - 105}px`;
                    this.domElement.style.top = `${this.gridStartY + this.row * this.cellH - 46}px`;
                }
                return;
            } else if (this.dancePhase === 'dance_walk') {
                this.summonCooldown -= dt;
                if (this.summonCooldown <= 0 && this.state !== 'attack' && this.hasMissingBackup(engine)) {
                    this.dancePhase = 'summon';
                    this.summonTimer = 1.15;
                    this.setAnim(this.config.summonAnim || 'assets/zombies/dancing_summon.gif');
                    soundEngine.playDisco();
                    return;
                }
            }
        }

        // 倒戈魅惑状态 (反向向右走，与其他僵尸双向互啃)
        if (this.isHypnotized) {
            const enemyZombie = !this.hasLostHead && engine.zombies.find(z =>
                !z.isDead && !z.isDying && !z.isHypnotized && z.row === this.row && Math.abs(z.x - this.x) <= 35
            );
            if (enemyZombie) {
                if (this.state !== 'attack') {
                    this.state = 'attack';
                    this.setAnim(this.attackAnim);
                }
                this.biteTimer += dt;
                const biteRate = this.isSlowed ? this.biteInterval * 2 : this.biteInterval;
                if (this.biteTimer >= biteRate) {
                    this.biteTimer = 0;
                    enemyZombie.takeDamage(this.biteDamage);
                    soundEngine.playBite();
                }
            } else {
                const desiredWalk = (this.type === 'dancing' && this.dancePhase === 'moonwalk')
                    ? (this.config.moonwalkAnim || this.walkAnim)
                    : this.walkAnim;
                if (this.state !== 'walk' || this.currentAnim !== desiredWalk) {
                    this.state = 'walk';
                    this.setAnim(desiredWalk);
                }
                const baseMove = this.isSlowed ? Math.abs(this.speed) * 0.5 : Math.abs(this.speed);
                this.x += (this.hasLostHead ? baseMove * 0.75 : baseMove) * dt;
                if (this.hasLostHead) {
                    this.hp -= dt * 20;
                    if (this.hp <= 0) {
                        this.hp = 0;
                        this.die();
                    }
                }
                if (this.x > 960) {
                    this.destroy();
                }
            }
            if (this.domElement) {
                this.domElement.style.left = `${this.x - 105}px`;
                this.domElement.style.top = `${this.gridStartY + this.row * this.cellH - 46}px`;
            }
            return;
        }

        // 撑杆跳跃飞行动画
        if (this.state === 'jumping') {
            this.jumpTimer -= dt;
            const progress = 1 - Math.max(0, this.jumpTimer) / 0.85;
            this.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * progress;
            const jumpArc = Math.sin(progress * Math.PI) * 45;
            if (this.domElement) {
                this.domElement.style.left = `${this.x - 105}px`;
                this.domElement.style.top = `${this.gridStartY + this.row * this.cellH - 46 - jumpArc}px`;
            }
            if (this.jumpTimer <= 0) {
                this.hasPole = false;
                this.state = 'walk';
                this.speed = this.config.walkSpeed || 18;
                this.walkAnim = 'assets/zombies/polevault_walk.gif';
                this.attackAnim = 'assets/zombies/polevault_attack.gif';
                this.setAnim(this.walkAnim);
            }
            return;
        }

        // 失去头部状态 (不能再啃咬植物或僵尸)
        if (this.hasLostHead) {
            if (this.state !== 'walk') {
                this.state = 'walk';
                this.setAnim(this.walkAnim);
            }
            const curSpeed = (this.isSlowed ? this.speed * 0.5 : this.speed) * 0.75;
            this.x -= curSpeed * dt;
            // 掉头后剩余70血量，持续流血约3.5秒后自然倒地化灰 (20 HP/s)
            this.hp -= dt * 20;
            if (this.hp <= 0) {
                this.hp = 0;
                this.die();
            }
        } else {
            // 优先检测同行魅惑倒戈僵尸 (原版双向互啃对决)
            const hypnoTarget = engine.zombies.find(z =>
                !z.isDead && !z.isDying && z.isHypnotized && z.row === this.row && Math.abs(z.x - this.x) <= 35
            );
            if (hypnoTarget) {
                if (this.hasPole) {
                    this.hasPole = false;
                    this.speed = this.config.walkSpeed || 18;
                    this.walkAnim = 'assets/zombies/polevault_walk.gif';
                    this.attackAnim = 'assets/zombies/polevault_attack.gif';
                }
                if (this.state !== 'attack') {
                    this.state = 'attack';
                    this.setAnim(this.attackAnim);
                }
                this.biteTimer += dt;
                const biteRate = this.isSlowed ? this.biteInterval * 2 : this.biteInterval;
                if (this.biteTimer >= biteRate) {
                    this.biteTimer = 0;
                    hypnoTarget.takeDamage(this.biteDamage);
                    soundEngine.playBite();
                }
            } else {
                const candidates = engine.plants.filter(p => 
                    p.row === this.row && !p.isDead && (p.x <= this.x && Math.abs(p.x - this.x) <= 38)
                );
                // 优先攻击荷叶之上的植物；只有在没有上层植物时才啃咬荷叶底座
                const targetPlant = candidates.find(p => p.type !== 'lilypad') || candidates[0];

                if (targetPlant) {
                    // 撑杆跳僵尸遇到第一株植物！
                    if (this.hasPole) {
                        if (targetPlant.isTall) {
                            // 遇到高坚果！起跳失败！
                            this.hasPole = false;
                            this.speed = this.config.walkSpeed || 18;
                            this.walkAnim = 'assets/zombies/polevault_walk.gif';
                            this.attackAnim = 'assets/zombies/polevault_attack.gif';
                            this.state = 'attack';
                            this.setAnim(this.attackAnim);
                            engine.floatingTexts.push(new FloatingText(this.x, this.y - 45, '🛑 高坚果拦截！起跳失败！', '#e74c3c', 20));
                            soundEngine.playSplat();
                        } else {
                            // 成功起跳！越过植物落于其身后！
                            this.state = 'jumping';
                            this.jumpTimer = 0.85;
                            this.jumpStartX = this.x;
                            this.jumpTargetX = targetPlant.x - 48;
                            this.setAnim(this.config.jumpAnim || 'assets/zombies/polevault_jump.gif');
                            soundEngine.playGroan();
                            return;
                        }
                    }

                    if (this.state !== 'attack') {
                        this.state = 'attack';
                        this.setAnim(this.attackAnim);
                    }
                    this.biteTimer += dt;
                    const biteRate = this.isSlowed ? this.biteInterval * 2 : this.biteInterval;
                    if (this.biteTimer >= biteRate) {
                        this.biteTimer = 0;
                        targetPlant.takeDamage(this.biteDamage, this);
                        soundEngine.playBite();
                    }
                } else {
                    const desiredWalk = (this.type === 'dancing' && this.dancePhase === 'moonwalk')
                        ? (this.config.moonwalkAnim || this.walkAnim)
                        : this.walkAnim;
                    if (this.state !== 'walk' || this.currentAnim !== desiredWalk) {
                        this.state = 'walk';
                        this.setAnim(desiredWalk);
                    }
                    const curSpeed = this.isSlowed ? this.speed * 0.5 : this.speed;
                    this.x -= curSpeed * dt;
                }
            }
        }

        // 更新 DOM 坐标
        if (this.domElement) {
            this.domElement.style.left = `${this.x - 105}px`;
            this.domElement.style.top = `${this.gridStartY + this.row * this.cellH - 46}px`;
        }
    }

    render(ctx) {
        // 实体由 DOM 渲染，Canvas 不需要绘制静态图像
    }
}
