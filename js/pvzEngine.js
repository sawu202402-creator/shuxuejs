/**
 * pvzEngine.js - 核心战场循环、波次推进、除草机与 DOM 实体混合架构
 */
import { GAME_CONFIG } from './config.js';
import { assetsLoader } from './assetsLoader.js';
import { soundEngine } from './audio.js';
import { createPlant } from './plants.js';
import { Zombie } from './zombies.js';
import { SunEntity, FloatingText, HitSplat, StarProjectile, LobbedProjectile, BowlingNutEntity } from './projectiles.js';

export class PvzEngine {
    constructor(canvas, entityLayer, onStateChange = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.entityLayer = entityLayer;
        this.sunLayer = (typeof document !== 'undefined') ? document.getElementById('sunLayer') : null;
        this.onStateChange = onStateChange;

        this.levelId = '1-1';
        this.levelConfig = GAME_CONFIG.levels['1-1'];
        this.sun = GAME_CONFIG.initialSun;
        this.lives = GAME_CONFIG.maxLives;

        this.gridStartX = GAME_CONFIG.canvas.gridStartX;
        this.gridStartY = GAME_CONFIG.canvas.gridStartY;
        this.cellW = GAME_CONFIG.canvas.cellWidth;
        this.cellH = GAME_CONFIG.canvas.cellHeight;
        this.rows = GAME_CONFIG.canvas.rows;
        this.cols = GAME_CONFIG.canvas.cols;

        // 实体容器
        this.plants = [];
        this.zombies = [];
        this.projectiles = [];
        this.hitSplats = [];
        this.explosions = [];
        this.suns = [];
        this.floatingTexts = [];
        this.lawnMowers = [];
        this.tombstones = [];
        this.craters = [];
        this.bowlingNuts = [];
        this.conveyorBelt = [];
        this.conveyorTimer = 0;
        this.conveyorInterval = 3.2;
        this.selectedConveyorIdx = null;
        this.isBowling = false;
        this.isNight = false;
        this.isFog = false;
        this.isRoof = false;
        this.fogClearTimer = 0;

        // 植物卡片槽与冷却表
        this.cardCooldowns = {};
        this.selectedCard = null;
        this.isShovelActive = false;

        // 波次推进状态
        this.waveIndex = 0;
        this.waveTimer = 0;
        this.totalWaves = 0;
        this.isWaitingWave = true;
        this.flagWaveBannerTimer = 0;
        this.flagWaveText = '';
        this.isFlagWarning = false;
        this.flagWarningTimer = 0;
        this.clearedGraceTimer = -1;

        // 自然阳光掉落计时 (初始2.5s，第一颗在7.5s掉落，后续每10秒)
        this.skySunTimer = 2.5;
        this.skySunInterval = 10.0;

        // 超载状态
        this.isSuperCharge = false;
        this.superChargeTimer = 0;

        // 运行状态
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;

        this.loadLevel('1-1');
        this.bindEvents();
    }

    loadLevel(levelId) {
        this.levelId = levelId;
        this.levelConfig = GAME_CONFIG.levels[levelId] || GAME_CONFIG.levels['1-1'];
        this.sun = this.levelConfig.isConveyorBelt ? 0 : GAME_CONFIG.initialSun;
        this.lives = GAME_CONFIG.maxLives;

        // 泳池关卡网格适配 (6行水陆系统)
        if (this.levelConfig.isPool) {
            this.rows = this.levelConfig.rowCount || 6;
            this.cellH = 85;
            this.gridStartY = 80;
        } else {
            this.rows = GAME_CONFIG.canvas.rows;
            this.cellH = GAME_CONFIG.canvas.cellHeight;
            this.gridStartY = GAME_CONFIG.canvas.gridStartY;
        }
        this.waterRows = this.levelConfig.waterRows || [];

        // 清理实体图层中的旧 DOM
        if (this.entityLayer) {
            this.entityLayer.innerHTML = '';
        }
        if (this.sunLayer) {
            this.sunLayer.innerHTML = '';
        }
        this.suns.forEach(s => s.destroy());

        this.plants = [];
        this.zombies = [];
        this.projectiles = [];
        this.hitSplats = [];
        this.explosions = [];
        this.suns = [];
        this.floatingTexts = [];

        // 关卡环境与属性 (World 2 黑夜、World 4 浓雾夜间)
        this.isNight = this.levelConfig.world === 2 || this.levelConfig.world === 4;
        this.isFog = !!this.levelConfig.isFog;
        this.isRoof = !!this.levelConfig.isRoof;
        this.fogClearTimer = 0;

        // 初始化黑夜/浓雾墓碑
        this.tombstones = (this.levelConfig.tombstones || []).map(t => ({
            row: t.row,
            col: t.col,
            x: this.gridStartX + t.col * this.cellW + this.cellW / 2,
            y: this.gridStartY + t.row * this.cellH + this.cellH / 2
        }));
        this.craters = [];

        // 初始化除草机
        this.lawnMowers = [];
        this.levelConfig.activeRows.forEach(row => {
            this.lawnMowers.push({
                row: row,
                x: 10,
                y: this.gridStartY + row * this.cellH + this.cellH / 2,
                state: 'ready',
                speed: 450
            });
        });

        // 重置冷却表
        this.cardCooldowns = {};
        (this.levelConfig.allowedPlants || []).forEach(pId => {
            this.cardCooldowns[pId] = 0;
        });

        this.waveIndex = 0;
        this.waveTimer = 0;
        this.totalWaves = (this.levelConfig.waves || []).length;
        this.isWaitingWave = true;
        this.isFlagWarning = false;
        this.flagWarningTimer = 0;
        this.clearedGraceTimer = -1;
        this.flagWaveBannerTimer = 0;
        this.flagWaveText = '';
        this.skySunTimer = 2.5;
        this.skySunInterval = this.isNight ? 0 : 10.0;

        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        this.isSuperCharge = false;

        this.selectedCard = null;
        this.selectedConveyorIdx = null;
        this.isShovelActive = false;

        // 保龄球与传送带系统重置
        this.isBowling = !!this.levelConfig.isBowling;
        this.bowlingNuts = [];
        this.conveyorBelt = [];
        this.conveyorTimer = 0;
        this.conveyorInterval = this.isBowling ? 2.5 : 3.5;

        // 初始装载传送带卡片 (上料 2~3 张)
        if (this.levelConfig.isConveyorBelt) {
            if (this.isBowling) {
                this.spawnConveyorCard('bowling_nut');
                this.spawnConveyorCard('bowling_nut');
                this.spawnConveyorCard('bowling_rednut');
            } else {
                const pool = this.levelConfig.conveyorCards || this.levelConfig.allowedPlants || ['peashooter'];
                if (pool && pool.length > 0) {
                    this.spawnConveyorCard(pool[0]);
                    this.spawnConveyorCard(pool[1] || pool[0]);
                }
            }
        }

        if (this.onStateChange) {
            this.onStateChange('level_loaded', { levelId, title: this.levelConfig.title });
        }
    }

    spawnConveyorCard(specificType = null) {
        if (!this.levelConfig.isConveyorBelt) return;
        if (!this.conveyorBelt) this.conveyorBelt = [];
        if (this.conveyorBelt.length >= 7) return;

        let type = specificType;
        if (!type) {
            if (this.isBowling) {
                type = Math.random() < 0.28 ? 'bowling_rednut' : 'bowling_nut';
            } else {
                const pool = this.levelConfig.conveyorCards || this.levelConfig.allowedPlants || ['peashooter'];
                type = pool[Math.floor(Math.random() * pool.length)];
            }
        }

        this.conveyorBelt.push(type);
        if (this.onStateChange) {
            this.onStateChange('conveyor_updated', this.conveyorBelt);
        }
    }

    consumeConveyorCard(type, index = null) {
        if (!this.conveyorBelt) return;
        if (index !== null && index >= 0 && index < this.conveyorBelt.length && this.conveyorBelt[index] === type) {
            this.conveyorBelt.splice(index, 1);
        } else {
            const idx = this.conveyorBelt.indexOf(type);
            if (idx !== -1) {
                this.conveyorBelt.splice(idx, 1);
            }
        }
        this.selectedConveyorIdx = null;
        if (this.onStateChange) {
            this.onStateChange('conveyor_updated', this.conveyorBelt);
        }
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => {
            if (this.isPaused || this.isGameOver || this.isVictory) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            this.handleClick(clickX, clickY);
        });

        if (this.entityLayer) {
            this.entityLayer.addEventListener('click', (e) => {
                if (this.isPaused || this.isGameOver || this.isVictory) return;
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const clickX = (e.clientX - rect.left) * scaleX;
                const clickY = (e.clientY - rect.top) * scaleY;

                this.handleClick(clickX, clickY);
            });
        }
    }

    handleClick(x, y) {
        // 1. 优先检测点击拾取阳光
        for (let i = this.suns.length - 1; i >= 0; i--) {
            const sun = this.suns[i];
            if (sun.contains(x, y)) {
                this.collectSun(sun);
                return;
            }
        }

        // 2. 网格种植 / 铲除逻辑
        const cell = this.getCellAt(x, y);
        if (!cell) {
            this.selectedCard = null;
            this.isShovelActive = false;
            return;
        }

        if (!this.levelConfig.activeRows.includes(cell.row)) {
            this.floatingTexts.push(new FloatingText(x, y, '🚫 此行未开放', '#e74c3c', 16));
            return;
        }

        // 铲子模式 (若睡莲上有植物，优先铲除上面的植物；若只剩睡莲，则铲除睡莲)
        if (this.isShovelActive) {
            const topPlant = this.plants.find(p => p.row === cell.row && p.col === cell.col && p.type !== 'lilypad' && !p.isDead);
            const lilyPlant = this.plants.find(p => p.row === cell.row && p.col === cell.col && p.type === 'lilypad' && !p.isDead);
            const targetP = topPlant || lilyPlant;
            if (targetP) {
                const pIdx = this.plants.indexOf(targetP);
                if (pIdx !== -1) {
                    targetP.destroy();
                    this.plants.splice(pIdx, 1);
                    if (topPlant && lilyPlant) {
                        lilyPlant.carriedPlant = null;
                    }
                    soundEngine.playPlant();
                    this.floatingTexts.push(new FloatingText(x, y, '🪓 已铲除', '#bdc3c7', 16));
                }
            }
            this.isShovelActive = false;
            if (this.onStateChange) this.onStateChange('shovel_deactivated');
            return;
        }

        // 种植植物模式
        if (this.selectedCard) {
            // 特殊模式：坚果保龄球 (Wall-nut Bowling)
            if (this.isBowling) {
                const boundaryX = this.gridStartX + 2.7 * this.cellW;
                if (x > boundaryX || cell.col > 2) {
                    this.floatingTexts.push(new FloatingText(x, y, '⚠️ 只能在红线左侧发射保龄球!', '#e74c3c', 18));
                    soundEngine.playMathWrong();
                    return;
                }

                // 在该行红线左侧快速发射保龄坚果
                const startX = this.gridStartX + 25;
                const startY = this.gridStartY + cell.row * this.cellH + this.cellH / 2;
                soundEngine.playBowlingRoll();
                this.bowlingNuts.push(new BowlingNutEntity(this.selectedCard, cell.row, startX, startY, this));
                this.floatingTexts.push(new FloatingText(startX + 30, startY - 25, '🎳 滚出!', '#e67e22', 18));

                this.consumeConveyorCard(this.selectedCard, this.selectedConveyorIdx);
                this.selectedCard = null;
                this.selectedConveyorIdx = null;
                return;
            }

            const plantConf = GAME_CONFIG.plants[this.selectedCard];
            if (!plantConf) return;

            if (!this.levelConfig.isConveyorBelt && this.sun < plantConf.cost) {
                this.floatingTexts.push(new FloatingText(x, y, '☀️ 阳光不足!', '#e74c3c', 18));
                return;
            }

            // 毁灭菇弹坑阻挡 (弹坑未完全愈合前无法种植)
            const craterOnCell = this.craters && this.craters.find(c => c.row === cell.row && c.col === cell.col && c.lifespan > 0);
            if (craterOnCell) {
                this.floatingTexts.push(new FloatingText(x, y, '🕳️ 弹坑尚未恢复，无法种植!', '#e74c3c', 16));
                return;
            }

            // 墓碑阻挡与吞噬逻辑
            const tombOnCell = this.tombstones && this.tombstones.find(t => t.row === cell.row && t.col === cell.col);
            if (tombOnCell && this.selectedCard !== 'gravebuster') {
                this.floatingTexts.push(new FloatingText(x, y, '🪦 墓碑阻挡，请先清除!', '#e74c3c', 16));
                return;
            }
            if (!tombOnCell && this.selectedCard === 'gravebuster') {
                this.floatingTexts.push(new FloatingText(x, y, '🪦 只能种在墓碑上!', '#e74c3c', 16));
                return;
            }

            const existingPlant = this.plants.find(p => p.row === cell.row && p.col === cell.col && !p.isDead);
            // 咖啡豆特殊种植逻辑 (只能种在睡眠中的植物上)
            if (this.selectedCard === 'coffeebean') {
                if (!existingPlant) {
                    this.floatingTexts.push(new FloatingText(x, y, '☕ 只能种在睡觉的植物上!', '#e74c3c', 16));
                    return;
                }
                if (!existingPlant.isAsleep) {
                    this.floatingTexts.push(new FloatingText(x, y, '😊 植物没有在睡觉哦!', '#f39c12', 16));
                    return;
                }
                if (!this.levelConfig.isConveyorBelt) {
                    this.sun -= plantConf.cost;
                }
                this.cardCooldowns[this.selectedCard] = plantConf.cooldown;
                const gridPos = this.getGridCoords(cell.col, cell.row);
                const bean = createPlant('coffeebean', cell.row, cell.col, gridPos.x, gridPos.y, this.entityLayer, this.isNight, existingPlant);
                this.plants.push(bean);
                soundEngine.playPlant();
                this.selectedCard = null;
                if (this.onStateChange) this.onStateChange('plant_placed', { plantType: 'coffeebean' });
                return;
            }

            // 实体检索 (水生底座、屋顶花盆、南瓜防护罩、常规植物)
            const isWaterRow = (this.waterRows || []).includes(cell.row);
            const lilyOnCell = this.plants.find(p => p.row === cell.row && p.col === cell.col && p.type === 'lilypad' && !p.isDead);
            const potOnCell = this.plants.find(p => p.row === cell.row && p.col === cell.col && p.type === 'flowerpot' && !p.isDead);
            const pumpkinOnCell = this.plants.find(p => p.row === cell.row && p.col === cell.col && p.type === 'pumpkin' && !p.isDead);
            const normalPlantOnCell = this.plants.find(p => p.row === cell.row && p.col === cell.col && !['lilypad', 'flowerpot', 'pumpkin'].includes(p.type) && !p.isDead);

            // 1. 南瓜头种植检测 (可套在已有植物外层防护)
            if (this.selectedCard === 'pumpkin') {
                if (pumpkinOnCell) {
                    this.floatingTexts.push(new FloatingText(x, y, '🎃 此处已有南瓜头', '#e67e22', 16));
                    return;
                }
                if (isWaterRow && !lilyOnCell) {
                    this.floatingTexts.push(new FloatingText(x, y, '💧 水面需要先种植睡莲!', '#3498db', 18));
                    return;
                }
                if (this.isRoof && !potOnCell) {
                    this.floatingTexts.push(new FloatingText(x, y, '🪴 屋顶需要先种植花盆!', '#e67e22', 18));
                    return;
                }
            } else if (this.isRoof) {
                // 2. 屋顶关卡种植规则 (必须有花盆底座)
                if (this.selectedCard === 'flowerpot') {
                    if (potOnCell) {
                        this.floatingTexts.push(new FloatingText(x, y, '🪴 此处已有花盆', '#e67e22', 16));
                        return;
                    }
                } else {
                    if (!potOnCell) {
                        this.floatingTexts.push(new FloatingText(x, y, '🪴 屋顶需要先种植花盆!', '#e67e22', 18));
                        return;
                    }
                    if (normalPlantOnCell) {
                        this.floatingTexts.push(new FloatingText(x, y, '🌱 花盆中已有植物', '#e67e22', 16));
                        return;
                    }
                }
            } else if (isWaterRow) {
                // 3. 水路种植检测
                if (this.selectedCard === 'seashroom') {
                    // 海蘑菇水生植物，直接种在水中，不需要睡莲
                    if (lilyOnCell || normalPlantOnCell) {
                        this.floatingTexts.push(new FloatingText(x, y, '🌊 此处水面已有植物', '#3498db', 16));
                        return;
                    }
                } else if (this.selectedCard === 'lilypad') {
                    if (lilyOnCell) {
                        this.floatingTexts.push(new FloatingText(x, y, '🌱 此处已有睡莲', '#3498db', 16));
                        return;
                    }
                } else {
                    if (!lilyOnCell) {
                        this.floatingTexts.push(new FloatingText(x, y, '💧 水面需要先种植睡莲!', '#3498db', 18));
                        return;
                    }
                    if (normalPlantOnCell) {
                        this.floatingTexts.push(new FloatingText(x, y, '🌱 睡莲上已有植物', '#e67e22', 16));
                        return;
                    }
                }
            } else {
                // 4. 普通陆地种植检测
                if (this.selectedCard === 'flowerpot') {
                    this.floatingTexts.push(new FloatingText(x, y, '🪴 花盆只能在屋顶关卡种植!', '#e67e22', 18));
                    return;
                }
                if (this.selectedCard === 'lilypad') {
                    this.floatingTexts.push(new FloatingText(x, y, '🚫 睡莲只能种在水中!', '#3498db', 18));
                    return;
                }
                if (this.selectedCard === 'seashroom') {
                    this.floatingTexts.push(new FloatingText(x, y, '🚫 海蘑菇只能种在水中!', '#3498db', 18));
                    return;
                }
                if (normalPlantOnCell) {
                    this.floatingTexts.push(new FloatingText(x, y, '🌱 此处已有植物', '#e67e22', 16));
                    return;
                }
            }

            if (!this.levelConfig.isConveyorBelt) {
                this.sun -= plantConf.cost;
            }
            this.cardCooldowns[this.selectedCard] = plantConf.cooldown;

            const gridPos = this.getGridCoords(cell.col, cell.row);
            const plantObj = createPlant(this.selectedCard, cell.row, cell.col, gridPos.x, gridPos.y, this.entityLayer, this.isNight);

            if (this.selectedCard === 'pumpkin') {
                if (normalPlantOnCell) {
                    plantObj.protectedPlant = normalPlantOnCell;
                    normalPlantOnCell.pumpkin = plantObj;
                }
            } else if (lilyOnCell && this.selectedCard !== 'lilypad') {
                lilyOnCell.carriedPlant = plantObj;
                plantObj.hostLilypad = lilyOnCell;
                if (plantObj.domElement) {
                    plantObj.domElement.classList.add('planted-on-lilypad');
                    plantObj.domElement.style.zIndex = '15';
                    plantObj.domElement.style.top = `${gridPos.y - 50}px`;
                }
            } else if (potOnCell && this.selectedCard !== 'flowerpot') {
                potOnCell.carriedPlant = plantObj;
                plantObj.hostPot = potOnCell;
                if (plantObj.domElement) {
                    plantObj.domElement.classList.add('planted-on-pot');
                    plantObj.domElement.style.zIndex = '15';
                    plantObj.domElement.style.top = `${gridPos.y - 48}px`;
                }
            }
            this.plants.push(plantObj);
            if (plantObj.isAsleep) {
                this.floatingTexts.push(new FloatingText(gridPos.x, gridPos.y - 32, '💤 植物睡眠中 (需咖啡豆)', '#9b59b6', 16));
            }
            soundEngine.playPlant();

            if (this.levelConfig.isConveyorBelt) {
                this.consumeConveyorCard(this.selectedCard, this.selectedConveyorIdx);
            }
            this.selectedCard = null;
            this.selectedConveyorIdx = null;
            if (this.onStateChange) this.onStateChange('plant_placed', { plantType: plantConf.id });
        }
    }

    collectSun(sun) {
        soundEngine.playSun();
        this.sun += sun.value;
        this.floatingTexts.push(new FloatingText(sun.x, sun.y - 20, `+${sun.value} ☀️`, '#f1c40f', 20));
        sun.collect();
        if (this.onStateChange) this.onStateChange('sun_changed', { sun: this.sun });
    }

    removeTombstone(row, col) {
        if (!this.tombstones) return;
        this.tombstones = this.tombstones.filter(t => !(t.row === row && t.col === col));
    }

    getCellAt(canvasX, canvasY) {
        if (canvasX < this.gridStartX || canvasX > this.gridStartX + this.cols * this.cellW ||
            canvasY < this.gridStartY || canvasY > this.gridStartY + this.rows * this.cellH) {
            return null;
        }
        const col = Math.floor((canvasX - this.gridStartX) / this.cellW);
        const row = Math.floor((canvasY - this.gridStartY) / this.cellH);
        return { col, row };
    }

    getGridCoords(col, row) {
        return {
            x: this.gridStartX + col * this.cellW + this.cellW / 2,
            y: this.gridStartY + row * this.cellH + this.cellH / 2
        };
    }

    handleMathAnswerResult(result) {
        if (!result) return;

        if (result.isCorrect) {
            this.sun += result.bonusSun;
            if (this.onStateChange) this.onStateChange('sun_changed', { sun: this.sun });

            const targetX = 200 + Math.random() * 450;
            const targetY = 150 + Math.random() * 320;
            const isSuper = result.bonusSun >= 75;
            const sunEntity = new SunEntity(targetX, 0, targetY, result.bonusSun, isSuper, this.sunLayer, this);
            sunEntity.collect();
            this.suns.push(sunEntity);
            soundEngine.playMathCorrect();

            this.floatingTexts.push(
                new FloatingText(targetX, targetY - 30, `+${result.bonusSun} ☀️ 口算奖励!`, '#f1c40f', 24)
            );

            // 传送带与保龄球关卡口算奖励：传送带急速送达卡片！
            if (this.levelConfig.isConveyorBelt) {
                if (this.isBowling) {
                    const cardType = (result.combo >= 3) ? 'bowling_rednut' : 'bowling_nut';
                    this.spawnConveyorCard(cardType);
                    this.floatingTexts.push(
                        new FloatingText(targetX, targetY - 55, cardType === 'bowling_rednut' ? '🎳 连击大奖！送达赤红爆炸核弹坚果！' : '🎳 传送带急速送达保龄坚果！', '#e67e22', 20)
                    );
                } else {
                    this.spawnConveyorCard();
                }
            }

            if (result.isShieldBreak) {
                this.breakAllShields(result.shieldType);
            }

            if (result.isComboCharge) {
                this.isSuperCharge = true;
                this.superChargeTimer = GAME_CONFIG.chargeDuration;
                soundEngine.playUlt();
                this.floatingTexts.push(new FloatingText(450, 200, '🔥 连击超载狂暴！攻速大增！', '#ff793f', 26));
            }

            if (result.isComboUlt) {
                this.triggerSuperComboUlt();
            }
        } else {
            soundEngine.playMathWrong();
            this.isSuperCharge = false;
        }
    }

    breakAllShields(shieldType = null) {
        this.zombies.forEach(z => {
            if (!z.isDead && z.hasShield) {
                if (!shieldType || z.shieldType === shieldType) {
                    z.breakShieldInstantly(this);
                }
            }
        });
    }

    triggerSuperComboUlt() {
        soundEngine.playUlt();
        const ultTypeRoll = Math.random();
        if (ultTypeRoll < 0.45) {
            this.floatingTexts.push(new FloatingText(450, 180, '🌪️ 【觉醒】豌豆加特林暴风雨！', '#2ecc71', 28));
            this.plants.forEach(p => {
                if (p.type === 'peashooter' || p.type === 'repeater') {
                    p.isSuperGatling = true;
                    p.gatlingTimer = 4.0;
                }
            });
        } else if (ultTypeRoll < 0.8) {
            this.floatingTexts.push(new FloatingText(450, 180, '❄️ 【觉醒】绝对零度全场急冻！', '#3498db', 28));
            this.zombies.forEach(z => {
                if (!z.isDead) {
                    z.slowTimer = 8.0;
                    z.isSlowed = true;
                    if (z.domElement) z.domElement.classList.add('slowed');
                    z.takeDamage(40);
                }
            });
        } else {
            this.floatingTexts.push(new FloatingText(450, 180, '☀️ 【觉醒】太阳风暴天降甘霖！', '#f1c40f', 28));
            for (let i = 0; i < 6; i++) {
                const sx = 150 + Math.random() * 550;
                const sy = 120 + Math.random() * 350;
                this.suns.push(new SunEntity(sx, 0, sy, 50, true, this.sunLayer, this));
            }
        }
    }

    update(dt) {
        if (this.isPaused || this.isGameOver || this.isVictory) return;

        Object.keys(this.cardCooldowns).forEach(k => {
            if (this.cardCooldowns[k] > 0) {
                this.cardCooldowns[k] = Math.max(0, this.cardCooldowns[k] - dt);
            }
        });

        if (this.isSuperCharge) {
            this.superChargeTimer -= dt;
            if (this.superChargeTimer <= 0) {
                this.isSuperCharge = false;
            }
        }

        if (!this.levelConfig.isConveyorBelt && this.skySunInterval > 0) {
            this.skySunTimer += dt;
            if (this.skySunTimer >= this.skySunInterval) {
                this.skySunTimer = 0;
                const dropX = 180 + Math.random() * 550;
                const targetY = 120 + Math.random() * 360;
                this.suns.push(new SunEntity(dropX, 0, targetY, GAME_CONFIG.sunValueNatural, false, this.sunLayer, this));
            }
        }

        if (this.fogClearTimer > 0) {
            this.fogClearTimer = Math.max(0, this.fogClearTimer - dt);
        }

        if (this.flagWaveBannerTimer > 0) {
            this.flagWaveBannerTimer = Math.max(0, this.flagWaveBannerTimer - dt);
        }

        // 更新毁灭菇弹坑倒计时
        if (this.craters && this.craters.length > 0) {
            this.craters.forEach(c => {
                c.lifespan -= dt;
            });
            this.craters = this.craters.filter(c => c.lifespan > 0);
        }

        // 传送带自动输送卡片
        if (this.levelConfig.isConveyorBelt) {
            this.conveyorTimer += dt;
            if (this.conveyorTimer >= this.conveyorInterval && this.conveyorBelt.length < 6) {
                this.conveyorTimer = 0;
                this.spawnConveyorCard();
            }
        }

        // 保龄球物理模拟与碰撞更新
        if (this.bowlingNuts && this.bowlingNuts.length > 0) {
            this.bowlingNuts.forEach(bn => bn.update(dt, this));
            this.bowlingNuts = this.bowlingNuts.filter(bn => !bn.isDead);
        }

        this.updateWaves(dt);

        this.plants.forEach(p => p.update(dt, this));
        this.zombies.forEach(z => z.update(dt, this));
        this.projectiles.forEach(pr => pr.update(dt, this));
        this.hitSplats.forEach(hs => hs.update(dt));
        this.explosions.forEach(ex => ex.update(dt));
        this.suns.forEach(s => s.update(dt, 160, 30));
        this.floatingTexts.forEach(ft => ft.update(dt));
        this.updateLawnMowers(dt);

        this.checkBulletCollisions();
        this.checkZombieBreach();

        this.plants = this.plants.filter(p => !p.isDead);
        this.zombies = this.zombies.filter(z => !z.isDead);
        this.projectiles = this.projectiles.filter(pr => !pr.isDead);
        this.hitSplats = this.hitSplats.filter(hs => !hs.isDead);
        this.explosions = this.explosions.filter(ex => !ex.isDead);
        this.suns = this.suns.filter(s => !s.isDead);
        this.floatingTexts = this.floatingTexts.filter(ft => !ft.isDead);

        this.checkVictoryCondition();
    }

    updateWaves(dt) {
        const waves = this.levelConfig.waves || [];
        if (this.waveIndex >= waves.length) return;

        const currentWave = waves[this.waveIndex];

        // 1. 旗帜大波预警声光倒计时 (3.5秒预警，横幅震撼展开，完毕后僵尸正式出击)
        if (this.isFlagWarning) {
            this.flagWarningTimer -= dt;
            if (this.flagWarningTimer <= 0) {
                this.isFlagWarning = false;
                currentWave.zombies.forEach(zData => {
                    const zombie = new Zombie(zData.type, zData.row, 900 + Math.random() * 40, this.entityLayer);
                    this.zombies.push(zombie);
                });

                // 黑夜关卡墓碑突袭：从每个尚未清除的墓碑中钻出一只僵尸！
                if (this.isNight && this.tombstones && this.tombstones.length > 0) {
                    this.tombstones.forEach(tomb => {
                        const ambushType = Math.random() < 0.4 ? 'conehead' : 'normal';
                        const ambushZ = new Zombie(ambushType, tomb.row, tomb.x, this.entityLayer);
                        this.zombies.push(ambushZ);
                        this.floatingTexts.push(new FloatingText(tomb.x, tomb.y - 30, '🪦 破土而出!', '#9b59b6', 18));
                    });
                }

                this.waveIndex++;
                this.waveTimer = 0;
                this.clearedGraceTimer = -1;
                if (this.onStateChange) {
                    this.onStateChange('wave_advanced', {
                        current: this.waveIndex,
                        total: this.totalWaves
                    });
                }
            }
            return;
        }

        this.waveTimer += dt;

        // 2. 检查场上是否还有存活且具攻击力的僵尸 (未掉头且未倒下)
        const hasActiveZombies = this.zombies.some(z => !z.isDead && !z.isDying && !z.hasLostHead);

        let shouldTriggerWave = false;

        // 原版官方节奏核心：
        // 第1波绝对不早产，必须等待完整的开局备战期(20~25s)，供玩家收集阳光和种植
        // 第2波及之后：若玩家提前全歼场上僵尸，则给 5 秒舒适休整期(捡阳光/思考)后刷下一波；若僵尸仍在慢走，则等待完整delay倒计时
        if (this.waveIndex > 0 && !hasActiveZombies) {
            if (this.clearedGraceTimer < 0) {
                this.clearedGraceTimer = 5.0; // 5秒休整倒计时
            } else {
                this.clearedGraceTimer -= dt;
                if (this.clearedGraceTimer <= 0) {
                    shouldTriggerWave = true;
                    this.clearedGraceTimer = -1;
                }
            }
        } else {
            this.clearedGraceTimer = -1;
        }

        if (!shouldTriggerWave && this.waveTimer >= currentWave.delay) {
            shouldTriggerWave = true;
        }

        if (shouldTriggerWave) {
            if (currentWave.isFlag) {
                // 旗帜波预警启动：播放3.5秒红金经典警报横幅与低频双音调警报，暂缓生成僵尸
                this.isFlagWarning = true;
                this.flagWarningTimer = 3.5;
                this.flagWaveBannerTimer = 3.5;
                const isFinal = (this.waveIndex === waves.length - 1);
                this.flagWaveText = isFinal ? '🧟 最后一波！' : '🧟 一大波僵尸正在逼近！';
                soundEngine.playHugeWave();
            } else {
                // 普通波次正常出击
                currentWave.zombies.forEach(zData => {
                    const zombie = new Zombie(zData.type, zData.row, 900 + Math.random() * 40, this.entityLayer);
                    this.zombies.push(zombie);
                });

                this.waveIndex++;
                this.waveTimer = 0;
                this.clearedGraceTimer = -1;
                if (this.onStateChange) {
                    this.onStateChange('wave_advanced', {
                        current: this.waveIndex,
                        total: this.totalWaves
                    });
                }
            }
        }
    }

    updateLawnMowers(dt) {
        this.lawnMowers.forEach(mower => {
            if (mower.state === 'active') {
                mower.x += mower.speed * dt;
                this.zombies.forEach(z => {
                    if (!z.isDead && z.row === mower.row && Math.abs(z.x - mower.x) <= 45) {
                        z.takeDamage(9999);
                    }
                });
                if (mower.x > 900) {
                    mower.state = 'gone';
                }
            }
        });
    }

    checkBulletCollisions() {
        this.projectiles.forEach(bullet => {
            if (bullet.isDead) return;
            // 抛物线投掷物由其自身在到达落点时进行爆炸/命中结算
            if (bullet.isLobbed) return;

            // 屋顶斜坡机制：左侧斜坡发射的直线直射子弹越不过屋脊 (x >= 440)
            if (this.isRoof && bullet.startX < 440 && bullet.x >= 440) {
                bullet.isDead = true;
                this.hitSplats.push(new HitSplat(440, bullet.y, bullet.type));
                return;
            }

            // 杨桃五向飞星 (2D 欧几里得距离碰撞)
            if (bullet.type === 'star') {
                const hitZombie = this.zombies.find(z => 
                    !z.isDead && !z.isHypnotized && Math.hypot(z.x - bullet.x, z.y - bullet.y) <= 28
                );
                if (hitZombie) {
                    bullet.isDead = true;
                    hitZombie.takeDamage(bullet.damage);
                    this.hitSplats.push(new HitSplat(bullet.x, bullet.y, 'pea'));
                    soundEngine.playSplat();
                }
                return;
            }

            const hitZombie = this.zombies.find(z => 
                z.row === bullet.row && !z.isDead && !z.isHypnotized && Math.abs(z.x - bullet.x) <= 24
            );
            if (hitZombie) {
                bullet.isDead = true;
                hitZombie.takeDamage(bullet.damage, bullet.isSlow);
                this.hitSplats.push(new HitSplat(bullet.x, bullet.y, bullet.type));
                soundEngine.playSplat();
            }
        });
    }

    checkZombieBreach() {
        this.zombies.forEach(z => {
            if (z.isDead) return;
            if (z.x <= 40) {
                const mower = this.lawnMowers.find(m => m.row === z.row);
                if (mower && mower.state === 'ready') {
                    mower.state = 'active';
                    soundEngine.playMower();
                    this.floatingTexts.push(new FloatingText(mower.x + 30, mower.y - 25, '🚜 启动出击!', '#27ae60', 18));
                } else if (!mower || mower.state === 'gone') {
                    if (z.x <= 10) {
                        z.takeDamage(9999);
                        this.lives--;
                        soundEngine.playLose();
                        this.floatingTexts.push(new FloatingText(30, z.y, '💔 突破防线 -1', '#e74c3c', 22));
                        if (this.onStateChange) this.onStateChange('lives_changed', { lives: this.lives });

                        if (this.lives <= 0) {
                            this.isGameOver = true;
                            if (this.onStateChange) this.onStateChange('game_over');
                        }
                    }
                }
            }
        });
    }

    checkVictoryCondition() {
        const waves = this.levelConfig.waves || [];
        if (this.waveIndex >= waves.length && this.zombies.length === 0 && !this.isGameOver && !this.isVictory) {
            this.isVictory = true;
            soundEngine.playVictory();
            if (this.onStateChange) {
                this.onStateChange('victory', {
                    levelId: this.levelId,
                    rewardPlant: this.levelConfig.rewardPlant,
                    rewardText: this.levelConfig.rewardText
                });
            }
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. 绘制等比例背景 (900x600 真实草坪视窗)
        const bgImg = assetsLoader.getImage(this.levelConfig.bg);
        if (bgImg && bgImg.complete) {
            ctx.drawImage(bgImg, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 2. 原版除草机渲染
        const mowerImg = assetsLoader.getImage('assets/ui/lawnmower.png');
        this.lawnMowers.forEach(mower => {
            if (mower.state !== 'gone') {
                if (mowerImg && mowerImg.complete) {
                    ctx.drawImage(mowerImg, mower.x - 5, mower.y - 28, 70, 54);
                } else {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(mower.x + 15, mower.y, 20, 0, Math.PI * 2);
                    ctx.fillStyle = mower.state === 'active' ? '#e74c3c' : '#7f8c8d';
                    ctx.fill();
                    ctx.strokeStyle = '#2c3e50';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.restore();
                }
            }
        });

        // 2.5 毁灭菇核爆弹坑 (焦黑坑洞，随着时间缓慢愈合变浅)
        if (this.craters && this.craters.length > 0) {
            const craterImg = assetsLoader.getImage('assets/backgrounds/crater.png');
            this.craters.forEach(c => {
                const alpha = Math.min(1.0, c.lifespan / 8.0);
                ctx.save();
                ctx.globalAlpha = alpha;
                if (craterImg && craterImg.complete) {
                    ctx.drawImage(craterImg, c.x - 38, c.y - 12, 76, 52);
                } else {
                    ctx.fillStyle = 'rgba(25, 20, 15, 0.85)';
                    ctx.beginPath();
                    ctx.ellipse(c.x, c.y + 10, 36, 18, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(10, 8, 5, 0.95)';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
                ctx.restore();
            });
        }

        // 2.8 坚果保龄球红色警戒线 (原版经典发射界线)
        if (this.isBowling) {
            const bx = this.gridStartX + 2.7 * this.cellW;
            const topY = this.gridStartY;
            const bottomY = this.gridStartY + this.rows * this.cellH;

            ctx.save();
            // 警戒红光晕染
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(bx, topY);
            ctx.lineTo(bx, bottomY);
            ctx.stroke();

            // 鲜红警戒虚线
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 4;
            ctx.setLineDash([14, 8]);
            ctx.beginPath();
            ctx.moveTo(bx, topY);
            ctx.lineTo(bx, bottomY);
            ctx.stroke();
            ctx.setLineDash([]);

            // 顶部发射提示标
            ctx.fillStyle = '#e74c3c';
            ctx.font = '900 13px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('◀ 红线左侧发射保龄球', bx - 8, topY - 8);
            ctx.restore();
        }

        // 3. 黑夜墓碑渲染 (位于植物与背景之间，支持墓碑吞噬者蚕食沉降效果)
        if (this.tombstones && this.tombstones.length > 0) {
            const tombImg = assetsLoader.getImage('assets/backgrounds/tombstone.png');
            this.tombstones.forEach(tomb => {
                const buster = this.plants.find(p => p.row === tomb.row && p.col === tomb.col && p.type === 'gravebuster' && !p.isDead);
                const sinkRatio = buster ? Math.min(1.0, buster.chewTimer / buster.chewTime) : 0;
                const visibleH = 88 * (1.0 - sinkRatio);
                const offsetY = 88 * sinkRatio;

                ctx.save();
                if (buster && visibleH > 0) {
                    ctx.beginPath();
                    ctx.rect(tomb.x - 45, tomb.y - 42 + offsetY, 90, visibleH);
                    ctx.clip();
                }
                if (tombImg && tombImg.complete) {
                    ctx.drawImage(tombImg, tomb.x - 38, tomb.y - 42, 76, 88);
                } else {
                    ctx.fillStyle = '#7f8c8d';
                    ctx.fillRect(tomb.x - 30, tomb.y - 35, 60, 75);
                }
                ctx.restore();
            });
        }

        // 4. 画布层仅绘制植物、保龄球、投掷物、命中飞溅、爆炸与浮动文字
        this.plants.forEach(p => p.render(ctx));
        if (this.bowlingNuts && this.bowlingNuts.length > 0) {
            this.bowlingNuts.forEach(bn => bn.render(ctx));
        }
        this.projectiles.forEach(pr => pr.render(ctx));
        this.hitSplats.forEach(hs => hs.render(ctx));
        this.explosions.forEach(ex => ex.render(ctx));
        this.suns.forEach(s => s.render(ctx));
        this.floatingTexts.forEach(ft => ft.render(ctx));

        // 4.5. 浓雾层渲染 (World 4 迷雾系统，第4-8列被夜雾笼罩)
        if (this.isFog && this.fogClearTimer <= 0) {
            ctx.save();
            const fogGrad = ctx.createLinearGradient(320, 0, 880, 0);
            fogGrad.addColorStop(0, 'rgba(15, 25, 40, 0.0)');
            fogGrad.addColorStop(0.2, 'rgba(18, 30, 48, 0.65)');
            fogGrad.addColorStop(0.45, 'rgba(18, 32, 50, 0.93)');
            fogGrad.addColorStop(1.0, 'rgba(15, 26, 42, 0.97)');
            ctx.fillStyle = fogGrad;
            ctx.fillRect(320, 0, this.canvas.width - 320, this.canvas.height);

            // 漂浮雾霭微粒光晕
            ctx.fillStyle = 'rgba(200, 220, 240, 0.08)';
            const time = Date.now() * 0.001;
            for (let i = 0; i < 6; i++) {
                const fx = 420 + ((i * 85 + time * 25) % 450);
                const fy = 80 + (i * 90) % 500;
                ctx.beginPath();
                ctx.arc(fx, fy, 65, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } else if (this.isFog && this.fogClearTimer > 0 && this.fogClearTimer < 2.0) {
            // 三叶草吹散浓雾后，2秒渐进恢复
            ctx.save();
            const alpha = (2.0 - this.fogClearTimer) / 2.0;
            const fogGrad = ctx.createLinearGradient(320, 0, 880, 0);
            fogGrad.addColorStop(0, `rgba(15, 25, 40, 0.0)`);
            fogGrad.addColorStop(0.45, `rgba(18, 32, 50, ${0.93 * alpha})`);
            fogGrad.addColorStop(1.0, `rgba(15, 26, 42, ${0.97 * alpha})`);
            ctx.fillStyle = fogGrad;
            ctx.fillRect(320, 0, this.canvas.width - 320, this.canvas.height);
            ctx.restore();
        }

        // 5. 大波僵尸横幅 (原版红金震撼警报横幅与全屏警示)
        if (this.flagWaveBannerTimer > 0) {
            ctx.save();
            const elapsed = 3.5 - this.flagWaveBannerTimer;

            // 全屏红色危机呼吸闪烁 (Red Alert Vignette)
            const flashAlpha = Math.max(0, Math.sin(elapsed * 7) * 0.18);
            ctx.fillStyle = `rgba(220, 20, 20, ${flashAlpha})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // 横幅居中与弹性呼吸
            const bannerY = 240;
            const bannerH = 88;
            const centerY = bannerY + bannerH / 2;
            const scale = 1.0 + Math.sin(elapsed * 6.5) * 0.035;

            ctx.translate(this.canvas.width / 2, centerY);
            ctx.scale(scale, scale);
            ctx.translate(-this.canvas.width / 2, -centerY);

            // 横幅背景：深血红至炽烈红的三段渐变 + 左右边缘暗角
            const bgGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
            bgGrad.addColorStop(0, '#3a0202');
            bgGrad.addColorStop(0.18, '#850a0a');
            bgGrad.addColorStop(0.5, '#bd1010');
            bgGrad.addColorStop(0.82, '#850a0a');
            bgGrad.addColorStop(1, '#320202');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, bannerY, this.canvas.width, bannerH);

            // 左右边缘暗影羽化
            const fadeLeft = ctx.createLinearGradient(0, bannerY, 120, bannerY);
            fadeLeft.addColorStop(0, 'rgba(10, 2, 2, 0.7)');
            fadeLeft.addColorStop(1, 'rgba(10, 2, 2, 0)');
            ctx.fillStyle = fadeLeft;
            ctx.fillRect(0, bannerY, 120, bannerH);

            const fadeRight = ctx.createLinearGradient(this.canvas.width - 120, bannerY, this.canvas.width, bannerY);
            fadeRight.addColorStop(0, 'rgba(10, 2, 2, 0)');
            fadeRight.addColorStop(1, 'rgba(10, 2, 2, 0.7)');
            ctx.fillStyle = fadeRight;
            ctx.fillRect(this.canvas.width - 120, bannerY, 120, bannerH);

            // 顶部与底部双重纯正镀金边框
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(0, bannerY);
            ctx.lineTo(this.canvas.width, bannerY);
            ctx.moveTo(0, bannerY + bannerH);
            ctx.lineTo(this.canvas.width, bannerY + bannerH);
            ctx.stroke();

            // 内缘精致金线
            ctx.strokeStyle = '#b8860b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, bannerY + 5);
            ctx.lineTo(this.canvas.width, bannerY + 5);
            ctx.moveTo(0, bannerY + bannerH - 5);
            ctx.lineTo(this.canvas.width, bannerY + bannerH - 5);
            ctx.stroke();

            // 边框金色菱形铆钉点缀
            ctx.fillStyle = '#ffec8b';
            for (let rx = 24; rx < this.canvas.width; rx += 48) {
                // 顶钉
                ctx.beginPath();
                ctx.arc(rx, bannerY + 2.5, 2.5, 0, Math.PI * 2);
                ctx.fill();
                // 底钉
                ctx.beginPath();
                ctx.arc(rx, bannerY + bannerH - 2.5, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // 文字渲染：正统PVZ立体加粗描边 + 亮金向炽红渐变填充
            ctx.font = '900 42px "Microsoft YaHei", "SimHei", "PingFang SC", "Arial Black", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 投影
            ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
            ctx.shadowBlur = 14;
            ctx.shadowOffsetY = 4;

            // 厚黑描边
            ctx.strokeStyle = '#050202';
            ctx.lineWidth = 9;
            ctx.lineJoin = 'round';
            ctx.strokeText(this.flagWaveText, this.canvas.width / 2, centerY);

            // 亮金至烈火红渐变文字
            const textGrad = ctx.createLinearGradient(0, centerY - 22, 0, centerY + 22);
            textGrad.addColorStop(0, '#fff48d');
            textGrad.addColorStop(0.35, '#ffcc00');
            textGrad.addColorStop(0.7, '#ff5a1f');
            textGrad.addColorStop(1, '#d81212');
            ctx.fillStyle = textGrad;
            ctx.fillText(this.flagWaveText, this.canvas.width / 2, centerY);

            ctx.restore();
        }
    }
}
