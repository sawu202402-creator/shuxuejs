/**
 * plants.js - 原版 1:1 植物实体系统与 DOM 60fps 动态 GIF 动画层
 */
import { GAME_CONFIG } from './config.js';
import { Projectile, ExplosionEffect, SunEntity, FumeCloud, HitSplat, FloatingText, JalapenoFireLine, StarProjectile, LobbedProjectile } from './projectiles.js';
import { soundEngine } from './audio.js';

export class Plant {
    constructor(type, row, col, x, y, entityLayer = null) {
        this.id = 'plant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        this.type = type;
        this.row = row;
        this.col = col;
        this.x = x;
        this.y = y;
        this.config = GAME_CONFIG.plants[type] || GAME_CONFIG.plants.peashooter;
        this.hp = this.config.hp || 300;
        this.maxHp = this.hp;
        this.isDead = false;
        this.anim = this.config.anim;
        this.currentAnim = this.anim;
        this.age = 0;
        this.isSuperGatling = false;
        this.gatlingTimer = 0;
        this.domElement = null;
        this.isAsleep = false;
        this.isNocturnal = !!this.config.isNocturnal;
        this.isDiurnal = !!this.config.isDiurnal;
        this.zzzElement = null;

        if (entityLayer) {
            this.createDOM(entityLayer);
        }
    }

    createDOM(container) {
        if (!container) return;
        this.domElement = document.createElement('div');
        this.domElement.className = `plant-entity plant-${this.type} ${this.isAsleep ? 'is-asleep' : ''}`;
        this.domElement.setAttribute('data-id', this.id);
        
        // 大嘴花/霸王花特殊规格(130x114)，原版基准对齐
        if (this.type === 'chomper') {
            this.domElement.style.width = '130px';
            this.domElement.style.height = '114px';
            this.domElement.style.left = `${this.x - 45}px`;
            this.domElement.style.top = `${this.y - 65}px`;
        } else {
            // 普通植物原版草坪格宽82，高98。将植物水平居中、底部对齐草地
            this.domElement.style.left = `${this.x - 38}px`;
            this.domElement.style.top = `${this.y - 48}px`;
        }

        this.domImg = document.createElement('img');
        this.domImg.className = 'plant-gif';
        this.domImg.src = this.currentAnim;
        this.domElement.appendChild(this.domImg);

        if (this.isAsleep) {
            this.createZzzBubble();
        }

        container.appendChild(this.domElement);
    }

    putToSleep() {
        this.isAsleep = true;
        if (this.config.sleepAnim) {
            this.setAnim(this.config.sleepAnim);
        }
        if (this.domElement) {
            this.domElement.classList.add('is-asleep');
            this.createZzzBubble();
        }
    }

    createZzzBubble() {
        if (!this.domElement || this.zzzElement) return;
        this.zzzElement = document.createElement('div');
        this.zzzElement.className = 'plant-zzz-bubble';
        this.zzzElement.innerHTML = '<span>Z</span><span>z</span><span>z</span>';
        this.domElement.appendChild(this.zzzElement);
    }

    wakeUp(engine) {
        if (!this.isAsleep) return;
        this.isAsleep = false;
        this.setAnim(this.config.anim);
        if (this.domElement) {
            this.domElement.classList.remove('is-asleep');
            if (this.zzzElement && this.zzzElement.parentNode) {
                this.zzzElement.parentNode.removeChild(this.zzzElement);
                this.zzzElement = null;
            }
        }
        if (engine) {
            engine.floatingTexts.push(new FloatingText(this.x, this.y - 30, '✨ 唤醒啦!', '#2ecc71', 20));
            soundEngine.playSplat();
        }
    }

    setAnim(newSrc) {
        if (this.currentAnim !== newSrc) {
            this.currentAnim = newSrc;
            if (this.domImg) {
                this.domImg.src = newSrc;
            }
        }
    }

    takeDamage(amount, attacker = null) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.destroy();
        }
    }

    destroy() {
        this.isDead = true;
        if (this.hostLilypad) {
            this.hostLilypad.carriedPlant = null;
            this.hostLilypad = null;
        }
        if (this.zzzElement && this.zzzElement.parentNode) {
            this.zzzElement.parentNode.removeChild(this.zzzElement);
            this.zzzElement = null;
        }
        if (this.domElement && this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
            this.domElement = null;
        }
    }

    update(dt, engine) {
        if (this.isDead) return;
        this.age += dt;
        if (this.isSuperGatling) {
            this.gatlingTimer -= dt;
            if (this.gatlingTimer <= 0) {
                this.isSuperGatling = false;
                if (this.domElement) this.domElement.classList.remove('super-gatling');
            }
        }
    }

    render(ctx) {
        // 植物实体直接由 DOM 原生 60fps GIF 渲染，Canvas 仅绘制血量条提示
        if (this.isDead) return;
        if (this.type === 'wallnut' && this.hp < this.maxHp) {
            const barW = 46;
            const barH = 5;
            const pct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(this.x - barW / 2, this.y - 40, barW, barH);
            ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillRect(this.x - barW / 2, this.y - 40, barW * pct, barH);
        }
    }
}

// 豌豆射手
export class PeashooterPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('peashooter', row, col, x, y, entityLayer);
        this.shootTimer = 0.5;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.shootTimer += dt;

        let interval = this.config.attackInterval || 1.425;
        if (this.isSuperGatling) {
            interval = 0.15;
            if (this.domElement) this.domElement.classList.add('super-gatling');
        } else if (engine.isSuperCharge) {
            interval *= 0.65;
        }

        if (this.shootTimer >= interval) {
            const hasZombieAhead = engine.zombies.some(z => 
                z.row === this.row && !z.isDead && z.x >= this.x && z.x <= 900
            );

            if (hasZombieAhead || this.isSuperGatling) {
                this.shootTimer = 0;
                engine.projectiles.push(
                    new Projectile(this.row, this.x + 30, this.y - 14, 'pea', this.config.damage, false)
                );
                soundEngine.playShoot();
            }
        }
    }
}

// 向日葵
export class SunflowerPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('sunflower', row, col, x, y, entityLayer);
        this.sunTimer = 0;
        this.hasProducedFirstSun = false;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.sunTimer += dt;
        const interval = this.hasProducedFirstSun ? (this.config.sunInterval || 24.0) : (this.config.firstSunTime || 7.0);

        if (this.sunTimer >= interval) {
            this.sunTimer = 0;
            this.hasProducedFirstSun = true;
            // 产出向日葵阳光并弹跳至向日葵正前方地面 (比花心略靠下，确保在植物前)
            const sunX = this.x + (Math.random() * 20 - 10);
            const sunY = this.y - 10;
            const targetY = this.y + 25;
            const sun = new SunEntity(sunX, sunY, targetY, 25, false, engine.sunLayer, engine);
            engine.suns.push(sun);
            soundEngine.playSun();
        }
    }
}

// 樱桃炸弹
export class CherryBombPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('cherrybomb', row, col, x, y, entityLayer);
        this.fuseTimer = 0;
        this.fuseTime = this.config.fuseTime || 1.2;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead) return;
        this.fuseTimer += dt;
        const scale = 1.0 + (this.fuseTimer / this.fuseTime) * 0.45;
        if (this.domElement) {
            this.domElement.style.transform = `scale(${scale})`;
        }

        if (this.fuseTimer >= this.fuseTime) {
            this.explode(engine);
        }
    }

    explode(engine) {
        this.destroy();
        engine.explosions.push(new ExplosionEffect(this.x, this.y, 'cherry'));
        soundEngine.playExplosion();

        // 3x3 范围造成 1800 毁灭伤害
        const cellW = GAME_CONFIG.canvas.cellWidth;
        engine.zombies.forEach(z => {
            if (!z.isDead && Math.abs(z.row - this.row) <= 1) {
                const dist = Math.abs(z.x - this.x);
                if (dist <= cellW * 1.5) {
                    if (typeof z.blastDie === 'function') {
                        z.blastDie();
                    } else {
                        z.takeDamage(this.config.damage);
                    }
                }
            }
        });
    }
}

// 坚果墙
export class WallnutPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('wallnut', row, col, x, y, entityLayer);
    }

    takeDamage(amount) {
        super.takeDamage(amount);
        this.checkCrackState();
    }

    checkCrackState() {
        if (this.isDead) return;
        if (this.hp <= this.config.crackThreshold2) {
            this.setAnim(this.config.crack2Anim);
        } else if (this.hp <= this.config.crackThreshold1) {
            this.setAnim(this.config.crack1Anim);
        } else {
            this.setAnim(this.config.anim);
        }
    }

    update(dt, engine) {
        super.update(dt, engine);
        this.checkCrackState();
    }
}

// 土豆地雷
export class PotatoMinePlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('potatomine', row, col, x, y, entityLayer);
        this.isArmed = false;
        this.armTimer = 0;
        this.anim = this.config.unarmedAnim;
        this.setAnim(this.config.unarmedAnim);
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead) return;
        if (!this.isArmed) {
            this.armTimer += dt;
            if (this.armTimer >= this.config.armTime) {
                this.isArmed = true;
                this.setAnim(this.config.armedAnim);
            }
        } else {
            const zombieOnTop = engine.zombies.find(z =>
                z.row === this.row && !z.isDead && Math.abs(z.x - this.x) <= 35
            );
            if (zombieOnTop) {
                this.explode(engine, zombieOnTop);
            }
        }
    }

    explode(engine, triggerZombie) {
        this.destroy();
        engine.explosions.push(new ExplosionEffect(this.x, this.y, 'potato'));
        soundEngine.playExplosion();
        if (typeof triggerZombie.blastDie === 'function') {
            triggerZombie.blastDie();
        } else {
            triggerZombie.takeDamage(this.config.damage);
        }
        engine.zombies.forEach(z => {
            if (!z.isDead && z.row === this.row && Math.abs(z.x - this.x) <= 45) {
                if (typeof z.blastDie === 'function') {
                    z.blastDie();
                } else {
                    z.takeDamage(this.config.damage);
                }
            }
        });
    }
}

// 雪花豌豆
export class SnowPeaPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('snowpea', row, col, x, y, entityLayer);
        this.shootTimer = 0.5;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.shootTimer += dt;

        let interval = this.config.attackInterval || 1.425;
        if (engine.isSuperCharge) interval *= 0.65;

        if (this.shootTimer >= interval) {
            const hasZombieAhead = engine.zombies.some(z => 
                z.row === this.row && !z.isDead && z.x >= this.x && z.x <= 900
            );

            if (hasZombieAhead) {
                this.shootTimer = 0;
                engine.projectiles.push(
                    new Projectile(this.row, this.x + 30, this.y - 14, 'snow_pea', this.config.damage, true)
                );
                soundEngine.playShoot();
            }
        }
    }
}

// 大嘴花 (霸王花)
export class ChomperPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('chomper', row, col, x, y, entityLayer);
        this.state = 'idle';
        this.chewTimer = 0;
        this.biteTimer = 0;
        this.targetZombie = null;
        this.digestAnim = this.config.digestAnim || 'assets/plants/chomper_digest.gif';
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;

        if (this.state === 'bite') {
            this.biteTimer -= dt;
            if (this.biteTimer <= 0) {
                // 咬住结束，吞入腹中，进入闭嘴咀嚼消化状态
                this.state = 'chewing';
                this.setAnim(this.digestAnim);
                if (this.targetZombie && !this.targetZombie.isDead) {
                    this.targetZombie.destroy();
                    this.targetZombie = null;
                }
            }
        } else if (this.state === 'chewing') {
            this.chewTimer -= dt;
            if (this.chewTimer <= 0) {
                // 消化完毕，恢复常态摇摆待命
                this.state = 'idle';
                this.setAnim(this.config.anim);
            }
        } else if (this.state === 'idle') {
            const cellW = GAME_CONFIG.canvas.cellWidth;
            // 索敌：前方1.5格内未死活体僵尸
            const target = engine.zombies.find(z => 
                z.row === this.row && !z.isDead && !z.isDying && (z.x - this.x) > 0 && (z.x - this.x) <= cellW * 1.5
            );
            if (target) {
                this.swallow(target);
            }
        }
    }

    swallow(target) {
        this.state = 'bite';
        this.targetZombie = target;
        this.biteTimer = 0.8; // 咬合动作持续约0.8秒
        this.chewTimer = this.config.chewTime || 40.0;
        this.setAnim(this.config.attackAnim);
        soundEngine.playBite();
    }
}

// 双发射手
export class RepeaterPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('repeater', row, col, x, y, entityLayer);
        this.shootTimer = 0.5;
        this.subShotPending = false;
        this.subShotDelay = 0.2;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.shootTimer += dt;

        let interval = this.config.attackInterval || 1.425;
        if (engine.isSuperCharge) interval *= 0.65;

        if (this.subShotPending) {
            this.subShotDelay -= dt;
            if (this.subShotDelay <= 0) {
                this.subShotPending = false;
                engine.projectiles.push(
                    new Projectile(this.row, this.x + 30, this.y - 14, 'pea', this.config.damage, false)
                );
                soundEngine.playShoot();
            }
        }

        if (this.shootTimer >= interval) {
            const hasZombieAhead = engine.zombies.some(z => 
                z.row === this.row && !z.isDead && z.x >= this.x && z.x <= 900
            );

            if (hasZombieAhead) {
                this.shootTimer = 0;
                engine.projectiles.push(
                    new Projectile(this.row, this.x + 30, this.y - 14, 'pea', this.config.damage, false)
                );
                soundEngine.playShoot();
                this.subShotPending = true;
                this.subShotDelay = 0.2;
            }
        }
    }
}

// 小喷菇 (0阳光近程射手)
export class PuffshroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('puffshroom', row, col, x, y, entityLayer);
        this.shootTimer = 0.5;
        this.range = this.config.range || 300;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.shootTimer += dt;
        let interval = this.config.attackInterval || 1.425;
        if (engine.isSuperCharge) interval *= 0.65;

        if (this.shootTimer >= interval) {
            const hasZombieAhead = engine.zombies.some(z =>
                z.row === this.row && !z.isDead && !z.isHypnotized && z.x >= this.x && z.x <= (this.x + this.range)
            );
            if (hasZombieAhead) {
                this.shootTimer = 0;
                engine.projectiles.push(
                    new Projectile(this.row, this.x + 18, this.y + 12, 'shroom', this.config.damage, false, this.range)
                );
                soundEngine.playShoot();
            }
        }
    }
}

// 阳光菇 (25阳光，成长型产日)
export class SunshroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('sunshroom', row, col, x, y, entityLayer);
        this.sunTimer = 0;
        this.growTimer = 0;
        this.isGrown = false;
        this.hasProducedFirstSun = false;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;

        // 90秒成长机制
        if (!this.isGrown) {
            this.growTimer += dt;
            if (this.growTimer >= (this.config.growTime || 90.0)) {
                this.isGrown = true;
                this.setAnim(this.config.bigAnim || 'assets/plants/sunshroom_big.gif');
                engine.floatingTexts.push(new FloatingText(this.x, this.y - 35, '✨ 阳光菇长大了!', '#f1c40f', 18));
            }
        }

        this.sunTimer += dt;
        const interval = this.hasProducedFirstSun ? 24.0 : 7.0;
        if (this.sunTimer >= interval) {
            this.sunTimer = 0;
            this.hasProducedFirstSun = true;
            const sunVal = this.isGrown ? 25 : 15;
            const sunX = this.x + (Math.random() * 16 - 8);
            const sunY = this.y - 10;
            const targetY = this.y + 22;
            const sun = new SunEntity(sunX, sunY, targetY, sunVal, false, engine.sunLayer, engine);
            engine.suns.push(sun);
            soundEngine.playSun();
        }
    }
}

// 大喷菇 (75阳光，穿透性直线云雾)
export class FumeshroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('fumeshroom', row, col, x, y, entityLayer);
        this.shootTimer = 0.5;
        this.range = this.config.range || 340;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.shootTimer += dt;
        let interval = this.config.attackInterval || 1.425;
        if (engine.isSuperCharge) interval *= 0.65;

        if (this.shootTimer >= interval) {
            const hasZombieAhead = engine.zombies.some(z =>
                z.row === this.row && !z.isDead && !z.isHypnotized && z.x >= this.x - 20 && z.x <= (this.x + this.range)
            );
            if (hasZombieAhead) {
                this.shootTimer = 0;
                engine.projectiles.push(
                    new FumeCloud(this.row, this.x + 28, this.y, this.range, this.config.damage)
                );
                soundEngine.playShoot();
            }
        }
    }
}

// 墓碑吞噬者 (种在墓碑上吞噬)
export class GraveBusterPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('gravebuster', row, col, x, y, entityLayer);
        this.chewTimer = 0;
        this.chewTime = this.config.chewTime || 4.5;
        this.chipTimer = 0;
    }

    createDOM(container) {
        super.createDOM(container);
        if (this.domElement) {
            this.domElement.style.width = '78px';
            this.domElement.style.height = '88px';
            this.domElement.style.left = `${this.x - 39}px`;
            this.domElement.style.top = `${this.y - 42}px`;
            this.domElement.style.zIndex = '12';
        }
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.chewTimer += dt;
        this.chipTimer += dt;

        // 持续啃咬震动与碎石飞溅音效
        if (this.chipTimer >= 0.35) {
            this.chipTimer = 0;
            soundEngine.playBite();
            if (this.domElement) {
                this.domElement.style.transform = `scale(${1 + (Math.random() - 0.5) * 0.08}) translate(${(Math.random() - 0.5) * 4}px, ${(Math.random() - 0.5) * 4}px)`;
            }
            if (engine.hitSplats) {
                engine.hitSplats.push(new HitSplat(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 20, 'stone'));
            }
        }

        if (this.chewTimer >= this.chewTime) {
            this.destroy();
            if (engine.removeTombstone) {
                engine.removeTombstone(this.row, this.col);
            }
            // 掉落 25 阳光
            const sun = new SunEntity(this.x, this.y - 15, this.y + 20, 25, false, engine.sunLayer, engine);
            engine.suns.push(sun);
            soundEngine.playSun();
            engine.floatingTexts.push(new FloatingText(this.x, this.y - 20, '🪦 墓碑破除! +25 ☀️', '#2ecc71', 20));
        }
    }
}

// 魅惑菇 (被啃食后使僵尸倒戈)
export class HypnoshroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('hypnoshroom', row, col, x, y, entityLayer);
    }

    takeDamage(amount, attacker = null) {
        super.takeDamage(amount, attacker);
        if (attacker && typeof attacker.hypnotize === 'function') {
            attacker.hypnotize();
            this.destroy();
        }
    }
}

// 胆小菇 (远距射击，僵尸接近则抱头缩地)
export class ScaredyshroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('scaredyshroom', row, col, x, y, entityLayer);
        this.shootTimer = 0.5;
        this.isScared = false;
        this.scaredDistance = this.config.scaredDistance || 130;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;

        // 检测是否有敌方僵尸靠近 (前后 130px 范围，包含上下相邻行)
        const nearbyZombie = engine.zombies.some(z =>
            !z.isDead && !z.isHypnotized &&
            Math.abs(z.row - this.row) <= 1 &&
            Math.abs(z.x - this.x) <= this.scaredDistance
        );

        if (nearbyZombie) {
            if (!this.isScared) {
                this.isScared = true;
                this.setAnim(this.config.hideAnim || 'assets/plants/scaredyshroom_hide.gif');
            }
            return;
        } else {
            if (this.isScared) {
                this.isScared = false;
                this.setAnim(this.config.anim);
            }
        }

        this.shootTimer += dt;
        let interval = this.config.attackInterval || 1.425;
        if (engine.isSuperCharge) interval *= 0.65;

        if (this.shootTimer >= interval) {
            const hasZombieAhead = engine.zombies.some(z =>
                z.row === this.row && !z.isDead && !z.isHypnotized && z.x >= this.x && z.x <= 900
            );
            if (hasZombieAhead) {
                this.shootTimer = 0;
                engine.projectiles.push(
                    new Projectile(this.row, this.x + 22, this.y - 12, 'shroom', this.config.damage, false, 960)
                );
                soundEngine.playShoot();
            }
        }
    }
}

// 寒冰菇 (全场极冻与减速)
export class IceshroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('iceshroom', row, col, x, y, entityLayer);
        this.fuseTimer = 0;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.fuseTimer += dt;
        if (this.fuseTimer >= 0.5) {
            this.freezeAll(engine);
            this.destroy();
        }
    }

    freezeAll(engine) {
        engine.floatingTexts.push(new FloatingText(450, 200, '❄️ 全场极度深寒！', '#3498db', 32));
        soundEngine.playSplat();
        engine.explosions.push(new ExplosionEffect(this.x, this.y, 'ice'));
        engine.zombies.forEach(z => {
            if (!z.isDead) {
                z.takeDamage(20);
                if (typeof z.applyFreeze === 'function') {
                    z.applyFreeze(4.0, 10.0);
                } else {
                    z.slowTimer = 10.0;
                    z.isSlowed = true;
                }
            }
        });
    }
}

// 毁灭菇 (超广域核爆，1800伤害)
export class DoomshroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('doomshroom', row, col, x, y, entityLayer);
        this.fuseTimer = 0;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.fuseTimer += dt;
        if (this.fuseTimer >= 0.8) {
            this.nuke(engine);
            this.destroy();
        }
    }

    nuke(engine) {
        soundEngine.playBoom();
        soundEngine.playThunder();
        engine.explosions.push(new ExplosionEffect(this.x, this.y, 'doom'));

        // 留下毁灭菇弹坑 (阻碍该格子种植约45秒)
        if (!engine.craters) engine.craters = [];
        engine.craters.push({
            row: this.row,
            col: this.col,
            x: this.x,
            y: this.y,
            maxLifespan: 45.0,
            lifespan: 45.0
        });

        const dmg = this.config.damage || 1800;
        engine.zombies.forEach(z => {
            if (!z.isDead) {
                const rowDiff = Math.abs(z.row - this.row);
                const colDiff = Math.abs(z.x - this.x) / engine.cellW;
                if (rowDiff <= 3 && colDiff <= 4.5) {
                    if (z.blastDie) {
                        z.blastDie();
                    } else {
                        z.takeDamage(dmg);
                    }
                }
            }
        });
    }
}

// 咖啡豆 (唤醒睡眠植物)
export class CoffeeBeanPlant extends Plant {
    constructor(row, col, x, y, entityLayer, targetPlant = null) {
        super('coffeebean', row, col, x, y, entityLayer);
        this.targetPlant = targetPlant;
        this.timer = 0;
        this.hasWoken = false;
        if (this.config.eatAnim) {
            this.setAnim(this.config.eatAnim);
        }
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead) return;
        this.timer += dt;
        if (!this.hasWoken && this.timer >= 0.4) {
            this.hasWoken = true;
            if (this.targetPlant && !this.targetPlant.isDead) {
                this.targetPlant.wakeUp(engine);
            }
        }
        if (this.timer >= 0.9) {
            this.destroy();
        }
    }
}

// 睡莲 (水生承载底座)
export class LilyPadPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('lilypad', row, col, x, y, entityLayer);
        this.carriedPlant = null;
        this.isAquatic = true;
    }

    createDOM(container) {
        super.createDOM(container);
        if (this.domElement) {
            this.domElement.style.width = '82px';
            this.domElement.style.height = '56px';
            this.domElement.style.left = `${this.x - 41}px`;
            this.domElement.style.top = `${this.y - 14}px`; // 稳稳漂浮在水波中央
            this.domElement.style.zIndex = '5'; // 始终处于底座层
        }
    }

    destroy() {
        if (this.carriedPlant && !this.carriedPlant.isDead) {
            this.carriedPlant.destroy();
            this.carriedPlant = null;
        }
        super.destroy();
    }
}

// 窝瓜 (泰山压顶)
export class SquashPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('squash', row, col, x, y, entityLayer);
        this.state = 'idle'; // 'idle' | 'aiming' | 'jumping' | 'smashing'
        this.targetZombie = null;
        this.timer = 0;
        this.jumpTargetX = this.x;
        this.jumpStartY = this.y;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;

        if (this.state === 'idle') {
            // 索敌：同航道前方 1.5 格内，或后方 0.8 格内
            const cellW = engine.cellW || 82;
            const target = engine.zombies.find(z => 
                z.row === this.row && !z.isDead && !z.isDying && (z.x >= this.x - cellW * 0.8 && z.x <= this.x + cellW * 1.5)
            );
            if (target) {
                this.targetZombie = target;
                this.state = 'aiming';
                this.timer = 0.35; // 怒目注视蓄力 0.35秒
                this.jumpTargetX = target.x;
                if (target.x < this.x && this.domElement) {
                    this.domElement.style.transform = 'scaleX(-1)';
                }
            }
        } else if (this.state === 'aiming') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = 'jumping';
                this.timer = 0.45; // 腾空跃起
                this.setAnim(this.config.attackAnim || 'assets/plants/squash_attack.gif');
                if (this.targetZombie && !this.targetZombie.isDead) {
                    this.jumpTargetX = this.targetZombie.x;
                }
            }
        } else if (this.state === 'jumping') {
            this.timer -= dt;
            const progress = 1 - Math.max(0, this.timer) / 0.45;
            const curX = this.x + (this.jumpTargetX - this.x) * progress;
            const curY = this.jumpStartY - Math.sin(progress * Math.PI) * 70;
            if (this.domElement) {
                this.domElement.style.left = `${curX - 38}px`;
                this.domElement.style.top = `${curY - 48}px`;
            }

            if (this.timer <= 0) {
                this.state = 'smashing';
                this.smash(engine, curX);
            }
        }
    }

    smash(engine, impactX) {
        soundEngine.playSplat();
        soundEngine.playGroan();
        engine.floatingTexts.push(new FloatingText(impactX, this.y - 40, '💥 泰山压顶!', '#27ae60', 26));

        // 压扁周围 65px 范围内的所有僵尸
        engine.zombies.forEach(z => {
            if (z.row === this.row && !z.isDead && Math.abs(z.x - impactX) <= 65) {
                z.takeDamage(this.config.damage || 1800);
            }
        });

        setTimeout(() => {
            this.destroy();
        }, 300);
    }
}

// 三线射手 (三路连珠火力)
export class ThreepeaterPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('threepeater', row, col, x, y, entityLayer);
        this.attackTimer = 0;
        this.attackInterval = this.config.attackInterval || 1.425;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;

        this.attackTimer += dt;
        const currentInterval = (engine.isSuperCharge || this.isSuperGatling) ? this.attackInterval * 0.6 : this.attackInterval;

        if (this.attackTimer >= currentInterval) {
            // 检测自身行以及上下两行是否有僵尸
            const targetRows = [this.row - 1, this.row, this.row + 1].filter(r => r >= 0 && r < engine.rows && engine.levelConfig.activeRows.includes(r));
            const hasEnemy = engine.zombies.some(z => 
                targetRows.includes(z.row) && !z.isDead && !z.isHypnotized && z.x > this.x && z.x < 960
            );

            if (hasEnemy) {
                this.attackTimer = 0;
                this.shootPeas(engine, targetRows);
            }
        }
    }

    shootPeas(engine, targetRows) {
        soundEngine.playShoot();
        targetRows.forEach(r => {
            const bulletY = engine.gridStartY + r * engine.cellH + engine.cellH / 2 - 8;
            engine.projectiles.push(
                new Projectile(r, this.x + 28, bulletY, 'pea', this.config.damage || 20)
            );
        });
    }
}

// 火爆辣椒 (整行烈火净化)
export class JalapenoPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('jalapeno', row, col, x, y, entityLayer);
        this.fuseTimer = 0;
        this.fuseTime = this.config.fuseTime || 0.9;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead) return;

        this.fuseTimer += dt;
        const progress = this.fuseTimer / this.fuseTime;
        const scale = 1.0 + progress * 0.35;
        const shake = (Math.random() - 0.5) * progress * 8;
        if (this.domElement) {
            this.domElement.style.transform = `scale(${scale}) translate(${shake}px, 0)`;
        }

        if (this.fuseTimer >= this.fuseTime) {
            this.burnRow(engine);
        }
    }

    burnRow(engine) {
        this.destroy();
        soundEngine.playExplosion();
        soundEngine.playThunder();
        engine.floatingTexts.push(new FloatingText(450, this.y - 30, '🔥 烈焰燎原！整行净化！', '#e74c3c', 28));

        // 烈焰动画条
        engine.explosions.push(new JalapenoFireLine(this.row, this.y));

        // 消灭整行僵尸并化为灰烬
        engine.zombies.forEach(z => {
            if (z.row === this.row && !z.isDead) {
                if (z.blastDie) {
                    z.blastDie();
                } else {
                    z.takeDamage(this.config.damage || 1800);
                }
            }
        });
    }
}

// 火炬树桩 (引燃豌豆翻倍伤害)
export class TorchwoodPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('torchwood', row, col, x, y, entityLayer);
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead) return;

        // 检查穿过自身的普通豌豆，将其点燃为双倍伤害的火球
        engine.projectiles.forEach(p => {
            if (!p.isDead && p.row === this.row && !p.isFire && (p.type === 'pea' || p.type === 'snow_pea')) {
                if (p.x >= this.x - 22 && p.x <= this.x + 36) {
                    p.type = 'fire_pea';
                    p.isFire = true;
                    p.damage *= 2;
                    p.anim = 'assets/projectiles/fire_pea.gif';
                    p.isSlow = false; // 烈焰破冰
                }
            }
        });
    }
}

// 高坚果 (8000超高耐久且拦截撑杆跳)
export class TallnutPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('tallnut', row, col, x, y, entityLayer);
        this.isTall = true;
    }

    createDOM(container) {
        super.createDOM(container);
        if (this.domElement) {
            this.domElement.style.top = `${this.y - 68}px`;
            this.domElement.style.height = '118px';
        }
    }

    takeDamage(amount, attacker) {
        super.takeDamage(amount, attacker);
        this.checkCrackState();
    }

    checkCrackState() {
        if (this.isDead) return;
        if (this.hp <= this.config.crackThreshold2) {
            this.setAnim(this.config.crack2Anim);
        } else if (this.hp <= this.config.crackThreshold1) {
            this.setAnim(this.config.crack1Anim);
        } else {
            this.setAnim(this.config.anim);
        }
    }

    update(dt, engine) {
        super.update(dt, engine);
        this.checkCrackState();
    }
}

// 海蘑菇 (0阳光水生蘑菇)
export class SeaShroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('seashroom', row, col, x, y, entityLayer);
        this.isAquatic = true;
        this.attackTimer = 0;
        this.range = this.config.range || 300;
        this.attackInterval = this.config.attackInterval || 1.425;
    }

    createDOM(container) {
        super.createDOM(container);
        if (this.domElement) {
            this.domElement.style.top = `${this.y - 28}px`; // 水生植物贴近水面
        }
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.attackTimer += dt;
        const currentInterval = (engine.isSuperCharge || this.isSuperGatling) ? this.attackInterval * 0.6 : this.attackInterval;
        if (this.attackTimer >= currentInterval) {
            const enemy = engine.zombies.find(z => 
                z.row === this.row && !z.isDead && !z.isHypnotized && z.x > this.x && (z.x - this.x) <= this.range
            );
            if (enemy) {
                this.attackTimer = 0;
                soundEngine.playShoot();
                engine.projectiles.push(
                    new Projectile(this.row, this.x + 20, this.y - 8, 'shroom', this.config.damage || 20, false, this.range)
                );
            }
        }
    }
}

// 杨桃 / 星星果 (五向飞星)
export class StarfruitPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('starfruit', row, col, x, y, entityLayer);
        this.attackTimer = 0;
        this.attackInterval = this.config.attackInterval || 1.425;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.attackTimer += dt;
        const currentInterval = (engine.isSuperCharge || this.isSuperGatling) ? this.attackInterval * 0.6 : this.attackInterval;
        if (this.attackTimer >= currentInterval) {
            const hasEnemy = engine.zombies.some(z => !z.isDead && !z.isHypnotized);
            if (hasEnemy) {
                this.attackTimer = 0;
                soundEngine.playShoot();
                const spd = 360;
                const starConfigs = [
                    { vx: spd, vy: 0 },
                    { vx: -spd, vy: 0 },
                    { vx: 0, vy: -spd },
                    { vx: 0, vy: spd },
                    { vx: -spd * 0.75, vy: -spd * 0.65 }
                ];
                starConfigs.forEach(cfg => {
                    engine.projectiles.push(
                        new StarProjectile(this.x, this.y, cfg.vx, cfg.vy, this.config.damage || 20)
                    );
                });
            }
        }
    }
}

// 南瓜头 (套在植物外层的坚实铠甲)
export class PumpkinPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('pumpkin', row, col, x, y, entityLayer);
        this.isPumpkin = true;
        this.protectedPlant = null;
    }

    createDOM(container) {
        super.createDOM(container);
        if (this.domElement) {
            this.domElement.style.width = '86px';
            this.domElement.style.height = '82px';
            this.domElement.style.left = `${this.x - 43}px`;
            this.domElement.style.top = `${this.y - 45}px`;
            this.domElement.style.zIndex = '18'; // 罩在植物外层
        }
    }

    takeDamage(amount, attacker) {
        super.takeDamage(amount, attacker);
        this.checkCrackState();
    }

    checkCrackState() {
        if (this.isDead) return;
        if (this.hp <= this.config.crackThreshold2) {
            this.setAnim(this.config.crack2Anim || 'assets/plants/pumpkin_cracked2.gif');
        } else if (this.hp <= this.config.crackThreshold1) {
            this.setAnim(this.config.crack1Anim || 'assets/plants/pumpkin_cracked1.gif');
        } else {
            this.setAnim(this.config.anim);
        }
    }

    destroy() {
        if (this.protectedPlant) {
            this.protectedPlant.pumpkin = null;
            this.protectedPlant = null;
        }
        super.destroy();
    }
}

// 磁力菇 (吸走铁质防具)
export class MagnetShroomPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('magnetshroom', row, col, x, y, entityLayer);
        this.coolDownTimer = 0;
        this.attractInterval = 12.0;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        if (this.coolDownTimer > 0) {
            this.coolDownTimer -= dt;
            return;
        }

        const metalZombies = engine.zombies.filter(z => 
            !z.isDead && !z.isHypnotized && z.hasShield && ['bucket', 'screendoor', 'football'].includes(z.shieldType)
        );

        if (metalZombies.length > 0) {
            metalZombies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
            const target = metalZombies[0];
            target.breakShieldInstantly(engine);
            this.coolDownTimer = this.attractInterval;
            soundEngine.playSplat();
            soundEngine.playThunder();
            engine.floatingTexts.push(new FloatingText(this.x, this.y - 35, '🧲 磁力吸取金属防具!', '#e74c3c', 20));
        }
    }
}

// 三叶草 (吹散浓雾)
export class BloverPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('blover', row, col, x, y, entityLayer);
        this.timer = 0;
        this.blown = false;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead) return;
        this.timer += dt;
        if (this.timer >= 0.4 && !this.blown) {
            this.blown = true;
            engine.fogClearTimer = 18.0;
            soundEngine.playShoot();
            engine.floatingTexts.push(new FloatingText(this.x, this.y - 35, '💨 狂风大作！浓雾消散！', '#2ecc71', 24));
        }
        if (this.timer >= 1.6) {
            this.destroy();
        }
    }
}

// 卷心菜投手 (抛物线越过屋顶)
export class CabbagePultPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('cabbagepult', row, col, x, y, entityLayer);
        this.attackTimer = 0;
        this.attackInterval = this.config.attackInterval || 2.85;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.attackTimer += dt;
        const currentInterval = (engine.isSuperCharge || this.isSuperGatling) ? this.attackInterval * 0.5 : this.attackInterval;
        if (this.attackTimer >= currentInterval) {
            const enemy = engine.zombies.find(z => 
                z.row === this.row && !z.isDead && !z.isHypnotized && z.x > this.x && z.x < 960
            );
            if (enemy) {
                this.attackTimer = 0;
                soundEngine.playShoot();
                engine.projectiles.push(
                    new LobbedProjectile(this.row, this.x + 20, this.y - 15, enemy, 'cabbage', this.config.damage || 40)
                );
            }
        }
    }
}

// 花盆 (屋顶种植底座)
export class FlowerPotPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('flowerpot', row, col, x, y, entityLayer);
        this.isPot = true;
        this.carriedPlant = null;
    }

    createDOM(container) {
        super.createDOM(container);
        if (this.domElement) {
            this.domElement.style.width = '82px';
            this.domElement.style.height = '62px';
            this.domElement.style.left = `${this.x - 41}px`;
            this.domElement.style.top = `${this.y - 18}px`;
            this.domElement.style.zIndex = '5';
        }
    }

    destroy() {
        if (this.carriedPlant && !this.carriedPlant.isDead) {
            this.carriedPlant.destroy();
            this.carriedPlant = null;
        }
        super.destroy();
    }
}

// 玉米投手 (玉米+黄油定身)
export class KernelPultPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('kernelpult', row, col, x, y, entityLayer);
        this.attackTimer = 0;
        this.attackInterval = this.config.attackInterval || 2.85;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.attackTimer += dt;
        const currentInterval = (engine.isSuperCharge || this.isSuperGatling) ? this.attackInterval * 0.5 : this.attackInterval;
        if (this.attackTimer >= currentInterval) {
            const enemy = engine.zombies.find(z => 
                z.row === this.row && !z.isDead && !z.isHypnotized && z.x > this.x && z.x < 960
            );
            if (enemy) {
                this.attackTimer = 0;
                soundEngine.playShoot();
                const isButter = Math.random() < 0.28;
                const pType = isButter ? 'butter' : 'corn';
                const pDmg = isButter ? 40 : 20;
                engine.projectiles.push(
                    new LobbedProjectile(this.row, this.x + 20, this.y - 15, enemy, pType, pDmg)
                );
            }
        }
    }
}

// 大蒜 (辛辣驱敌换道)
export class GarlicPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('garlic', row, col, x, y, entityLayer);
    }

    takeDamage(amount, attacker) {
        super.takeDamage(amount, attacker);
        if (attacker && !attacker.isDead && !attacker.isDying) {
            attacker.biteTimer = 0;
            const maxRow = 4;
            const possibleRows = [attacker.row - 1, attacker.row + 1].filter(r => r >= 0 && r <= maxRow);
            if (possibleRows.length > 0) {
                attacker.row = possibleRows[Math.floor(Math.random() * possibleRows.length)];
                attacker.y = attacker.gridStartY + attacker.row * attacker.cellH + attacker.cellH / 2;
                attacker.state = 'walk';
                soundEngine.playGroan();
            }
        }
    }
}

// 西瓜投手 (重击与3x3群伤溅射)
export class MelonPultPlant extends Plant {
    constructor(row, col, x, y, entityLayer) {
        super('melonpult', row, col, x, y, entityLayer);
        this.attackTimer = 0;
        this.attackInterval = this.config.attackInterval || 2.85;
    }

    update(dt, engine) {
        super.update(dt, engine);
        if (this.isDead || this.isAsleep) return;
        this.attackTimer += dt;
        const currentInterval = (engine.isSuperCharge || this.isSuperGatling) ? this.attackInterval * 0.5 : this.attackInterval;
        if (this.attackTimer >= currentInterval) {
            const enemy = engine.zombies.find(z => 
                z.row === this.row && !z.isDead && !z.isHypnotized && z.x > this.x && z.x < 960
            );
            if (enemy) {
                this.attackTimer = 0;
                soundEngine.playShoot();
                engine.projectiles.push(
                    new LobbedProjectile(this.row, this.x + 25, this.y - 20, enemy, 'melon', this.config.damage || 80)
                );
            }
        }
    }
}

// 植物工厂函数
export function createPlant(type, row, col, x, y, entityLayer, isNight = false, targetPlant = null) {
    if (type === 'coffeebean') {
        return new CoffeeBeanPlant(row, col, x, y, entityLayer, targetPlant);
    }

    let p;
    switch (type) {
        case 'peashooter': p = new PeashooterPlant(row, col, x, y, entityLayer); break;
        case 'sunflower': p = new SunflowerPlant(row, col, x, y, entityLayer); break;
        case 'cherrybomb': p = new CherryBombPlant(row, col, x, y, entityLayer); break;
        case 'wallnut': p = new WallnutPlant(row, col, x, y, entityLayer); break;
        case 'potatomine': p = new PotatoMinePlant(row, col, x, y, entityLayer); break;
        case 'snowpea': p = new SnowPeaPlant(row, col, x, y, entityLayer); break;
        case 'chomper': p = new ChomperPlant(row, col, x, y, entityLayer); break;
        case 'repeater': p = new RepeaterPlant(row, col, x, y, entityLayer); break;
        case 'puffshroom': p = new PuffshroomPlant(row, col, x, y, entityLayer); break;
        case 'sunshroom': p = new SunshroomPlant(row, col, x, y, entityLayer); break;
        case 'fumeshroom': p = new FumeshroomPlant(row, col, x, y, entityLayer); break;
        case 'gravebuster': p = new GraveBusterPlant(row, col, x, y, entityLayer); break;
        case 'hypnoshroom': p = new HypnoshroomPlant(row, col, x, y, entityLayer); break;
        case 'scaredyshroom': p = new ScaredyshroomPlant(row, col, x, y, entityLayer); break;
        case 'iceshroom': p = new IceshroomPlant(row, col, x, y, entityLayer); break;
        case 'doomshroom': p = new DoomshroomPlant(row, col, x, y, entityLayer); break;
        case 'lilypad': p = new LilyPadPlant(row, col, x, y, entityLayer); break;
        case 'squash': p = new SquashPlant(row, col, x, y, entityLayer); break;
        case 'threepeater': p = new ThreepeaterPlant(row, col, x, y, entityLayer); break;
        case 'jalapeno': p = new JalapenoPlant(row, col, x, y, entityLayer); break;
        case 'torchwood': p = new TorchwoodPlant(row, col, x, y, entityLayer); break;
        case 'tallnut': p = new TallnutPlant(row, col, x, y, entityLayer); break;
        case 'seashroom': p = new SeaShroomPlant(row, col, x, y, entityLayer); break;
        case 'starfruit': p = new StarfruitPlant(row, col, x, y, entityLayer); break;
        case 'pumpkin': p = new PumpkinPlant(row, col, x, y, entityLayer); break;
        case 'magnetshroom': p = new MagnetShroomPlant(row, col, x, y, entityLayer); break;
        case 'blover': p = new BloverPlant(row, col, x, y, entityLayer); break;
        case 'cabbagepult': p = new CabbagePultPlant(row, col, x, y, entityLayer); break;
        case 'flowerpot': p = new FlowerPotPlant(row, col, x, y, entityLayer); break;
        case 'kernelpult': p = new KernelPultPlant(row, col, x, y, entityLayer); break;
        case 'garlic': p = new GarlicPlant(row, col, x, y, entityLayer); break;
        case 'melonpult': p = new MelonPultPlant(row, col, x, y, entityLayer); break;
        default: p = new PeashooterPlant(row, col, x, y, entityLayer); break;
    }

    if (isNight && p.isDiurnal) {
        p.putToSleep();
    } else if (!isNight && p.isNocturnal) {
        p.putToSleep();
    }
    return p;
}
