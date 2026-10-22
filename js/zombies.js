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

        // 动画资产
        this.walkAnim = this.type === 'polevault' ? (this.config.runAnim || 'assets/zombies/polevault_run.gif') : this.config.walkAnims[Math.floor(Math.random() * this.config.walkAnims.length)];
        this.attackAnim = this.config.attackAnim;
        this.headAnim = this.config.headAnim;
        this.dieAnim = this.config.dieAnim;
        this.currentAnim = this.walkAnim;

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

    takeDamage(amount, isSlow = false) {
        if (this.isDead || this.isDying) return;

        this.hitFlashTimer = 0.08;
        if (this.domElement) {
            this.domElement.classList.add('hit-flash');
            setTimeout(() => {
                if (this.domElement) this.domElement.classList.remove('hit-flash');
            }, 80);
        }

        if (isSlow) {
            this.slowTimer = 10.0;
            this.isSlowed = true;
            if (this.domElement) this.domElement.classList.add('slowed');
        }

        if (this.armorHp > 0) {
            this.armorHp -= amount;
            if (this.armorHp <= 0) {
                const overflow = -this.armorHp;
                this.armorHp = 0;
                const prevShield = this.shieldType;
                this.hasShield = false;
                if (this.domShield) this.domShield.style.display = 'none';

                // 击落防具动效
                this.spawnFallingArmor(prevShield);
                soundEngine.playSplat();

                if (this.type === 'newspaper') {
                    this.speed = this.config.rageSpeed || 48;
                    this.dps = this.config.rageDps || 150;
                    this.walkAnim = this.config.rageAnim || 'assets/zombies/newspaper_lost.gif';
                    this.attackAnim = this.config.rageAnim || 'assets/zombies/newspaper_lost.gif';
                    this.setAnim(this.walkAnim);
                    soundEngine.playGroan();
                } else {
                    this.walkAnim = GAME_CONFIG.zombies.normal.walkAnims[0];
                    this.attackAnim = GAME_CONFIG.zombies.normal.attackAnim;
                    this.setAnim(this.state === 'attack' ? this.attackAnim : this.walkAnim);
                }
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

    takePiercingDamage(amount) {
        if (this.isDead || this.isDying) return;
        this.hitFlashTimer = 0.12;
        if (this.domElement) this.domElement.classList.add('hit-flash');

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
        const imgSrc = shieldType === 'bucket' ? 'assets/zombies/bucket_drop.png' :
                       (shieldType === 'newspaper' ? 'assets/zombies/newspaper_drop.png' : 'assets/zombies/cone_drop.png');
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
        this.armorHp = 0;
        this.hasShield = false;
        if (this.domShield) this.domShield.style.display = 'none';

        this.spawnFallingArmor(prevShield);
        if (this.type === 'newspaper') {
            this.speed = this.config.rageSpeed || 48;
            this.dps = this.config.rageDps || 150;
            this.walkAnim = this.config.rageAnim || 'assets/zombies/newspaper_lost.gif';
            this.attackAnim = this.config.rageAnim || 'assets/zombies/newspaper_lost.gif';
            this.setAnim(this.walkAnim);
        } else {
            this.walkAnim = GAME_CONFIG.zombies.normal.walkAnims[0];
            this.attackAnim = GAME_CONFIG.zombies.normal.attackAnim;
            this.setAnim(this.state === 'attack' ? this.attackAnim : this.walkAnim);
        }

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

    update(dt, engine) {
        if (this.isDead) return;

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

        // 倒戈魅惑状态 (反向向右走，攻击其他僵尸)
        if (this.isHypnotized) {
            const enemyZombie = engine.zombies.find(z =>
                !z.isDead && !z.isHypnotized && z.row === this.row && Math.abs(z.x - this.x) <= 35
            );
            if (enemyZombie) {
                this.biteTimer += dt;
                if (this.biteTimer >= this.biteInterval) {
                    this.biteTimer = 0;
                    enemyZombie.takeDamage(this.biteDamage);
                    soundEngine.playBite();
                }
            } else {
                this.x += Math.abs(this.speed) * dt;
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

        // 同步引擎当前网格尺寸 (泳池关 6 行 rowCount=6, cellH=85)
        if (engine) {
            if (engine.cellH) this.cellH = engine.cellH;
            if (engine.gridStartY) this.gridStartY = engine.gridStartY;
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

        // 失去头部状态 (不能再啃咬植物)
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
                if (this.state !== 'walk') {
                    this.state = 'walk';
                    this.setAnim(this.walkAnim);
                }
                const curSpeed = this.isSlowed ? this.speed * 0.5 : this.speed;
                this.x -= curSpeed * dt;
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
