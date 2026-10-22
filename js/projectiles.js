/**
 * projectiles.js - 子弹、投掷物、爆炸粒子、飘字与阳光飞行动画系统
 */
import { assetsLoader } from './assetsLoader.js';
import { soundEngine } from './audio.js';

export class Projectile {
    constructor(row, x, y, type = 'pea', damage = 20, isSlow = false, maxRange = 960) {
        this.row = row;
        this.startX = x;
        this.x = x;
        this.y = y;
        this.type = type;
        this.damage = damage;
        this.isSlow = isSlow;
        this.maxRange = maxRange;
        this.speed = type === 'shroom' ? 320 : 360; // 像素/秒
        this.radius = 12;
        this.isDead = false;
        this.isFire = type === 'fire_pea';
        if (type === 'snow_pea') {
            this.anim = 'assets/projectiles/snow_pea.gif';
        } else if (type === 'shroom') {
            this.anim = 'assets/projectiles/shroom_bullet.gif';
        } else if (type === 'fire_pea') {
            this.anim = 'assets/projectiles/fire_pea.gif';
        } else {
            this.anim = 'assets/projectiles/pea.gif';
        }
    }

    update(dt) {
        this.x += this.speed * dt;
        if (this.x > 960 || (this.x - this.startX) >= this.maxRange) {
            this.isDead = true;
        }
    }

    render(ctx) {
        const img = assetsLoader.getImage(this.anim);
        if (this.isFire) {
            if (img && img.complete) {
                ctx.drawImage(img, this.x - 24, this.y - 14, 48, 28);
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
                ctx.fillStyle = '#e74c3c';
                ctx.fill();
            }
            return;
        }

        if (img && img.complete) {
            ctx.drawImage(img, this.x - 14, this.y - 14, 28, 28);
        } else {
            // 兜底绘制球形子弹
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.type === 'shroom' ? '#9b59b6' : (this.isSlow ? '#38ef7d' : '#2ecc71');
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
    }
}

// 命中击碎火花 / 豌豆飞溅 / 孢子碎裂效果
export class HitSplat {
    constructor(x, y, type = 'pea') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.age = 0;
        this.lifespan = 0.18; // 持续0.18秒
        this.isDead = false;
        this.anim = type === 'shroom' ? 'assets/projectiles/shroom_splat.gif' : 'assets/projectiles/pea_splat.gif';
    }

    update(dt) {
        this.age += dt;
        if (this.age >= this.lifespan) {
            this.isDead = true;
        }
    }

    render(ctx) {
        const img = assetsLoader.getImage(this.anim);
        if (img && img.complete) {
            ctx.drawImage(img, this.x - 20, this.y - 20, 40, 40);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 16 * (1 - this.age / this.lifespan), 0, Math.PI * 2);
            ctx.fillStyle = this.type === 'snow' ? 'rgba(74, 189, 255, 0.8)' : (this.type === 'shroom' ? 'rgba(155, 89, 182, 0.8)' : 'rgba(46, 204, 113, 0.8)');
            ctx.fill();
        }
    }
}

// 大喷菇穿透云雾
export class FumeCloud {
    constructor(row, x, y, range = 340, damage = 20) {
        this.row = row;
        this.x = x;
        this.y = y;
        this.range = range;
        this.damage = damage;
        this.age = 0;
        this.lifespan = 0.5;
        this.isDead = false;
        this.anim = 'assets/projectiles/fume_cloud.gif';
        this.hitZombies = new Set();
    }

    update(dt, engine) {
        this.age += dt;
        if (this.age >= this.lifespan) {
            this.isDead = true;
            return;
        }

        // 贯穿攻击：直线 range 距离内所有僵尸受伤害（穿透铁栅门）
        if (engine && engine.zombies) {
            engine.zombies.forEach(z => {
                if (z.row === this.row && !z.isDead && !this.hitZombies.has(z.id)) {
                    if (z.x >= this.x - 20 && z.x <= this.x + this.range) {
                        this.hitZombies.add(z.id);
                        if (typeof z.takePiercingDamage === 'function') {
                            z.takePiercingDamage(this.damage);
                        } else {
                            z.takeDamage(this.damage);
                        }
                    }
                }
            });
        }
    }

    render(ctx) {
        const img = assetsLoader.getImage(this.anim);
        const w = this.range;
        const h = 76;
        if (img && img.complete) {
            ctx.drawImage(img, this.x, this.y - h / 2, w, h);
        } else {
            ctx.save();
            ctx.fillStyle = 'rgba(165, 55, 253, 0.45)';
            ctx.fillRect(this.x, this.y - 25, this.range, 50);
            ctx.restore();
        }
    }
}

// 爆炸效果 (樱桃炸弹 / 土豆地雷 / 毁灭菇核爆)
export class ExplosionEffect {
    constructor(x, y, type = 'cherry') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.age = 0;
        this.lifespan = type === 'doom' ? 2.4 : (type === 'cherry' ? 0.75 : 0.6);
        this.isDead = false;
        if (type === 'doom') {
            this.anim = 'assets/projectiles/doom_cloud.png';
        } else if (type === 'cherry') {
            this.anim = 'assets/projectiles/cherry_boom.gif';
        } else {
            this.anim = 'assets/projectiles/spudow.gif';
        }
    }

    update(dt) {
        this.age += dt;
        if (this.age >= this.lifespan) {
            this.isDead = true;
        }
    }

    render(ctx) {
        if (this.type === 'ice') {
            const alpha = Math.max(0, (this.lifespan - this.age) / this.lifespan);
            ctx.save();
            ctx.fillStyle = `rgba(130, 215, 255, ${0.45 * alpha})`;
            ctx.fillRect(0, 0, ctx.canvas.width || 960, ctx.canvas.height || 640);
            ctx.restore();
            return;
        }

        if (this.type === 'doom') {
            // 1. 前 0.4 秒全屏强光白闪/紫闪
            if (this.age < 0.4) {
                const flashAlpha = (0.4 - this.age) / 0.4;
                ctx.save();
                ctx.fillStyle = `rgba(235, 210, 255, ${0.85 * flashAlpha})`;
                ctx.fillRect(0, 0, ctx.canvas.width || 960, ctx.canvas.height || 640);
                ctx.restore();
            }

            // 2. 拔地而起的巨型暗紫核爆蘑菇云
            const img = assetsLoader.getImage(this.anim);
            if (img && img.complete) {
                ctx.save();
                // 向上膨胀升腾动画
                const growProgress = Math.min(1.0, this.age / 0.7);
                const scale = 0.35 + 0.65 * Math.sin(growProgress * Math.PI / 2);
                const riseY = (1 - growProgress) * 40;
                
                // 晚期消散淡出
                let alpha = 1.0;
                if (this.age > 1.4) {
                    alpha = Math.max(0, (this.lifespan - this.age) / (this.lifespan - 1.4));
                }
                ctx.globalAlpha = alpha;
                
                const cloudW = 280 * scale;
                const cloudH = 345 * scale;
                // 蘑菇云底部坐落于爆炸中心
                ctx.drawImage(img, this.x - cloudW / 2, this.y - cloudH + 30 + riseY, cloudW, cloudH);
                ctx.restore();
            }
            return;
        }

        const img = assetsLoader.getImage(this.anim);
        const w = this.type === 'cherry' ? 180 : 130;
        const h = this.type === 'cherry' ? 180 : 130;
        if (img && img.complete) {
            ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
        } else {
            const alpha = 1 - this.age / this.lifespan;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, w / 2, 0, Math.PI * 2);
            ctx.fillStyle = this.type === 'cherry' ? '#ff4757' : '#e67e22';
            ctx.fill();
            ctx.restore();
        }
    }
}

// 阳光实体 (自然掉落 / 向日葵产出 / 算术超级阳光)
export class SunEntity {
    constructor(startX, startY, targetY, value = 25, isMathSuper = false, container = null, engine = null) {
        this.x = startX;
        this.y = startY;
        this.targetY = targetY;
        this.value = value;
        this.isMathSuper = isMathSuper;
        this.speedY = isMathSuper ? 130 : 75;
        this.anim = 'assets/ui/sun.gif';
        // 原版阳光规格：标准阳光 78px 直径 (半径 39)，算术超级阳光 96px 直径 (半径 48)
        this.radius = isMathSuper ? 48 : 39;
        this.age = 0;
        this.lifespan = 12.0; // 地面停留12秒未拾取自动飞入收集
        this.isCollecting = false;
        this.collectProgress = 0;
        this.isDead = false;
        this.scale = 0.5; // 出生弹性放大
        this.container = container || (typeof document !== 'undefined' ? document.getElementById('sunLayer') : null);
        this.engine = engine;
        this.domElement = null;

        if (this.container) {
            this.createDOM();
        }
    }

    createDOM() {
        if (!this.container || typeof document === 'undefined') return;
        this.domElement = document.createElement('div');
        this.domElement.className = `sun-entity${this.isMathSuper ? ' super-sun' : ''}`;
        this.domElement.innerHTML = `
            <img src="${this.anim}" class="sun-img" alt="sun" />
            <span class="sun-badge">+${this.value}</span>
        `;
        this.updateDOMTransform();

        const collectHandler = (e) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            if (this.engine) {
                this.engine.collectSun(this);
            } else {
                this.collect();
            }
        };

        this.domElement.addEventListener('pointerdown', collectHandler);
        this.container.appendChild(this.domElement);
    }

    updateDOMTransform() {
        if (!this.domElement) return;
        const left = this.x - this.radius;
        const top = this.y - this.radius;
        this.domElement.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${this.scale})`;
        if (this.isCollecting) {
            this.domElement.style.opacity = Math.max(0.1, 1.0 - this.collectProgress * 0.9);
        }
    }

    update(dt, targetHudX = 80, targetHudY = 20) {
        this.age += dt;
        if (this.scale < 1.0) {
            this.scale = Math.min(1.0, this.scale + dt * 4);
        }

        if (this.isCollecting) {
            this.collectProgress += dt * 3.2;
            if (this.collectProgress >= 1.0) {
                this.destroy();
                return;
            } else {
                // 抛物线飞向 HUD 阳光池
                this.x += (targetHudX - this.x) * (dt * 8);
                this.y += (targetHudY - this.y) * (dt * 8);
                this.scale = Math.max(0.15, 1.0 - this.collectProgress * 0.85);
                this.updateDOMTransform();
            }
            return;
        }

        // 下落状态
        if (this.y < this.targetY) {
            this.y += this.speedY * dt;
        }

        this.updateDOMTransform();

        if (this.age >= this.lifespan) {
            if (this.engine) {
                this.engine.collectSun(this);
            } else {
                this.collect();
            }
        }
    }

    collect() {
        if (!this.isCollecting) {
            this.isCollecting = true;
            this.collectProgress = 0;
        }
    }

    destroy() {
        this.isDead = true;
        if (this.domElement && this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
            this.domElement = null;
        }
    }

    // 命中点击判定
    contains(px, py) {
        if (this.isCollecting || this.isDead) return false;
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) <= (this.radius * 1.35) * (this.radius * 1.35);
    }

    render(ctx) {
        // 如果已在 DOM sunLayer 中渲染，Canvas 无需重复绘制
        if (this.domElement) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        if (this.isMathSuper) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.45)';
            ctx.fill();
        }

        const img = assetsLoader.getImage(this.anim);
        const size = this.radius * 2;
        if (img && img.complete) {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#f1c40f';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#e67e22';
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☀️', 0, 0);
        }

        ctx.fillStyle = '#fff';
        ctx.font = '900 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 4;
        ctx.fillText(`+${this.value}`, 0, this.radius + 14);

        ctx.restore();
    }
}

// 战区浮动文字 (如: "+50 ☀️", "💥 破盾!", "⚡ 狂暴!")
export class FloatingText {
    constructor(x, y, text, color = '#f1c40f', fontSize = 20) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.fontSize = fontSize;
        this.age = 0;
        this.lifespan = 1.2;
        this.isDead = false;
    }

    update(dt) {
        this.age += dt;
        this.y -= 25 * dt; // 慢慢向上飘
        if (this.age >= this.lifespan) {
            this.isDead = true;
        }
    }

    render(ctx) {
        const alpha = Math.max(0, 1 - (this.age / this.lifespan));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `900 ${this.fontSize}px sans-serif`;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3.5;
        ctx.textAlign = 'center';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// 火爆辣椒整行烈焰效果
export class JalapenoFireLine {
    constructor(row, y) {
        this.row = row;
        this.y = y;
        this.age = 0;
        this.lifespan = 0.95;
        this.isDead = false;
        this.anim = 'assets/projectiles/jalapeno_fire.gif';
    }

    update(dt) {
        this.age += dt;
        if (this.age >= this.lifespan) {
            this.isDead = true;
        }
    }

    render(ctx) {
        const img = assetsLoader.getImage(this.anim);
        if (img && img.complete) {
            ctx.drawImage(img, 0, this.y - 75, 900, 150);
        } else {
            ctx.save();
            ctx.fillStyle = 'rgba(231, 76, 60, 0.75)';
            ctx.fillRect(0, this.y - 40, 900, 80);
            ctx.restore();
        }
    }
}

// 杨桃五向飞星
export class StarProjectile {
    constructor(startX, startY, vx, vy, damage = 20) {
        this.type = 'star';
        this.x = startX;
        this.y = startY;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.radius = 14;
        this.rotation = 0;
        this.isDead = false;
        this.anim = 'assets/projectiles/star.png';
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += 10 * dt;
        if (this.x < -30 || this.x > 960 || this.y < -30 || this.y > 630) {
            this.isDead = true;
        }
    }

    render(ctx) {
        const img = assetsLoader.getImage(this.anim);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        if (img && img.complete) {
            ctx.drawImage(img, -14, -14, 28, 28);
        } else {
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// 抛物线投掷物 (卷心菜、玉米粒、黄油、西瓜)
export class LobbedProjectile {
    constructor(row, startX, startY, targetZombie, type = 'cabbage', damage = 40) {
        this.row = row;
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetZombie = targetZombie;
        this.targetX = targetZombie ? targetZombie.x : startX + 320;
        this.targetY = startY;
        this.type = type;
        this.damage = damage;
        this.t = 0;
        this.duration = 0.95; // 0.95秒高抛物线
        this.arcHeight = 135;
        this.isDead = false;
        this.isLobbed = true;

        if (type === 'butter') {
            this.anim = 'assets/projectiles/butter.png';
        } else if (type === 'corn') {
            this.anim = 'assets/projectiles/corn.png';
        } else if (type === 'melon') {
            this.anim = 'assets/projectiles/melon.png';
        } else {
            this.anim = 'assets/projectiles/cabbage.png';
        }
    }

    update(dt, engine) {
        this.t += dt / this.duration;
        if (this.targetZombie && !this.targetZombie.isDead) {
            this.targetX = this.targetZombie.x;
        }

        const t = Math.min(1.0, this.t);
        this.x = this.startX + (this.targetX - this.startX) * t;
        const linearY = this.startY + (this.targetY - this.startY) * t;
        const parabola = 4 * this.arcHeight * t * (1 - t);
        this.y = linearY - parabola;

        if (this.t >= 1.0) {
            this.isDead = true;
            this.onImpact(engine);
        }
    }

    onImpact(engine) {
        if (!engine) return;

        if (this.type === 'melon') {
            soundEngine.playBoom();
            // 西瓜造成 80 直接伤害 + 周围 3x3 溅射 26 伤害
            engine.zombies.forEach(z => {
                if (!z.isDead && Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.targetX) <= 85) {
                    const dmg = (z.row === this.row && Math.abs(z.x - this.targetX) <= 35) ? this.damage : 26;
                    z.takeDamage(dmg);
                }
            });
            engine.hitSplats.push(new HitSplat(this.x, this.y, 'pea'));
        } else if (this.type === 'butter') {
            soundEngine.playSplat();
            if (this.targetZombie && !this.targetZombie.isDead) {
                this.targetZombie.takeDamage(this.damage);
                this.targetZombie.freezeTimer = 4.0;
                engine.floatingTexts.push(new FloatingText(this.targetZombie.x, this.targetZombie.y - 40, '🧈 黄油盖脸! 定身4秒!', '#f39c12', 20));
            }
        } else {
            soundEngine.playSplat();
            if (this.targetZombie && !this.targetZombie.isDead) {
                this.targetZombie.takeDamage(this.damage);
            }
            engine.hitSplats.push(new HitSplat(this.x, this.y, 'pea'));
        }
    }

    render(ctx) {
        const img = assetsLoader.getImage(this.anim);
        const size = this.type === 'melon' ? 36 : (this.type === 'butter' ? 32 : 28);
        if (img && img.complete) {
            ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = this.type === 'butter' ? '#f1c40f' : (this.type === 'melon' ? '#27ae60' : '#2ecc71');
            ctx.fill();
        }
    }
}

// 坚果保龄球实体 (原版 1:1 滚动、斜向反弹折射、赤红触敌核爆)
export class BowlingNutEntity {
    constructor(type, row, startX, startY, engine) {
        this.id = 'bowling_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        this.type = type; // 'bowling_nut' | 'bowling_rednut'
        this.row = row;
        this.targetRow = row;
        this.x = startX;
        this.y = startY;
        this.engine = engine;
        this.vx = 420; // 滚动冲刺速度
        this.vy = 0;   // 斜向反弹纵向速率
        this.rotation = 0;
        this.radius = 34;
        this.damage = type === 'bowling_rednut' ? 1800 : 400;
        this.isDead = false;
        this.hitZombies = new Set();
        this.dustTimer = 0;
    }

    update(dt, engine) {
        if (this.isDead) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += dt * 720; // 滚动自转

        // 尘土粒子效果
        this.dustTimer += dt;
        if (this.dustTimer >= 0.08) {
            this.dustTimer = 0;
            if (engine.hitSplats) {
                engine.hitSplats.push(new HitSplat(this.x - 22, this.y + 16, 'dirt'));
            }
        }

        // 斜向反弹平滑过渡到目标轨道
        if (this.vy !== 0) {
            const targetY = engine.gridStartY + this.targetRow * engine.cellH + engine.cellH / 2;
            if ((this.vy > 0 && this.y >= targetY) || (this.vy < 0 && this.y <= targetY)) {
                this.y = targetY;
                this.row = this.targetRow;
                this.vy = 0; // 恢复平直滚动
            }
        }

        // 上下草坪边界弹射
        const minY = engine.gridStartY + engine.cellH / 2;
        const maxY = engine.gridStartY + (engine.rows - 1) * engine.cellH + engine.cellH / 2;
        if (this.y <= minY && this.vy < 0) {
            this.targetRow = 1;
            this.vy = 180;
        } else if (this.y >= maxY && this.vy > 0) {
            this.targetRow = engine.rows - 2;
            this.vy = -180;
        }

        // 僵尸碰撞检测
        engine.zombies.forEach(z => {
            if (z.isDead || this.hitZombies.has(z.id)) return;
            // 距离小于坚果半径 + 僵尸躯干半径
            const dist = Math.hypot(z.x - this.x, z.y - this.y);
            if (dist <= 48) {
                this.hitZombies.add(z.id);

                if (this.type === 'bowling_rednut') {
                    // 赤红爆炸坚果：撞击首个目标触发 3x3 剧烈烈火爆破
                    this.isDead = true;
                    soundEngine.playBoom();
                    soundEngine.playThunder();
                    engine.explosions.push(new ExplosionEffect(this.x, this.y, 'cherry'));
                    engine.zombies.forEach(targetZ => {
                        if (!targetZ.isDead) {
                            const rDiff = Math.abs(targetZ.row - this.row);
                            const cDiff = Math.abs(targetZ.x - this.x) / engine.cellW;
                            if (rDiff <= 1.2 && cDiff <= 1.5) {
                                if (targetZ.blastDie) targetZ.blastDie();
                                else targetZ.takeDamage(1800);
                            }
                        }
                    });
                    return;
                }

                // 普通保龄坚果：造成 400 重击伤害，并触发原版经典斜向折射！
                soundEngine.playBowlingStrike();
                if (engine.hitSplats) {
                    engine.hitSplats.push(new HitSplat(z.x, z.y - 18, 'nut'));
                }

                if (z.hp <= 400 && z.blastDie) {
                    z.blastDie();
                } else {
                    z.takeDamage(400);
                }

                // 核心斜向反弹逻辑 (Ricochet)
                if (this.vy === 0) {
                    if (this.row === 0) {
                        this.targetRow = 1;
                        this.vy = 185;
                    } else if (this.row >= engine.rows - 1) {
                        this.targetRow = this.row - 1;
                        this.vy = -185;
                    } else {
                        const goDown = Math.random() < 0.5;
                        this.targetRow = goDown ? this.row + 1 : this.row - 1;
                        this.vy = goDown ? 185 : -185;
                    }
                } else {
                    this.vy = -this.vy;
                    this.targetRow = this.vy > 0 ? Math.min(engine.rows - 1, this.row + 1) : Math.max(0, this.row - 1);
                }
            }
        });

        // 滚出荧幕右侧
        if (this.x > 960) {
            this.isDead = true;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        const assetPath = this.type === 'bowling_rednut' ? 'assets/plants/wallnut_red.png' : 'assets/plants/wallnut.gif';
        const img = assetsLoader.getImage(assetPath);
        if (img && img.complete) {
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.type === 'bowling_rednut' ? '#c0392b' : '#d35400';
            ctx.fill();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        if (this.type === 'bowling_rednut') {
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}
