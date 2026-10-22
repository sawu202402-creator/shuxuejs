/**
 * main.js - 游戏全局协调控制器、事件总线与主循环
 * 深度融合原版 1:1 植物大战僵尸战场与儿童趣味心算学习引擎
 */
import { GAME_CONFIG, AVATAR_LIST, DIFFICULTY_PRESETS } from './config.js';
import { assetsLoader } from './assetsLoader.js';
import { soundEngine } from './audio.js';
import { mathEngine } from './mathEngine.js';
import { profileManager } from './profileManager.js';
import { PvzEngine } from './pvzEngine.js';
import { createPlant } from './plants.js';
import { Zombie } from './zombies.js';

window.createPlant = createPlant;
window.Zombie = Zombie;

class GameApp {
    constructor() {
        this.canvas = document.getElementById('battleCanvas');
        this.pvzEngine = null;
        this.mathEngine = mathEngine;
        this.profileManager = profileManager;
        this.soundEngine = soundEngine;
        this.inputBuffer = '';
        this.lastTime = performance.now();

        // 档案弹窗内部编辑暂存状态
        this.editingKidId = null; // null 表示编辑当前选中孩子
        this.selectedAvatar = '🐰';
        this.selectedRange = 20;
        this.selectedMultiplier = 5;
        this.selectedPresetGrade = 'grade1_2';
        this.activeDiffTab = 'custom'; // 'custom' | 'preset'
        this.viewingRecordsKidId = null;

        // 绑定 DOM 元素
        this.dom = {
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingBarFill: document.getElementById('loadingBarFill'),
            loadingHintText: document.getElementById('loadingHintText'),
            entityLayer: document.getElementById('entityLayer'),

            // HUD
            hudUserAvatar: document.getElementById('hudUserAvatar'),
            hudUserName: document.getElementById('hudUserName'),
            sunVal: document.getElementById('sunVal'),
            livesVal: document.getElementById('livesVal'),
            waveVal: document.getElementById('waveVal'),
            syringeFluid: document.getElementById('syringeFluid'),
            comboBadge: document.getElementById('comboBadge'),
            comboCount: document.getElementById('comboCount'),
            btnSelectLevel: document.getElementById('btnSelectLevel'),
            btnPause: document.getElementById('btnPause'),
            btnMute: document.getElementById('btnMute'),
            btnUserProfile: document.getElementById('btnUserProfile'),
            btnScoreRecords: document.getElementById('btnScoreRecords') || document.getElementById('btnMistakes'),

            // 卡牌栏与铲子
            cardsList: document.getElementById('cardsList'),
            shovelSlot: document.getElementById('shovelSlot'),

            // 小黑板
            mascotEmoji: document.getElementById('mascotEmoji'),
            mascotTalk: document.getElementById('mascotTalk'),
            questionHint: document.getElementById('questionHint'),
            questionFormula: document.getElementById('questionFormula'),
            answerInput: document.getElementById('answerInput'),
            btnSubmitAnswer: document.getElementById('btnSubmitAnswer'),
            feedbackMsg: document.getElementById('feedbackMsg'),
            virtualKeypad: document.getElementById('virtualKeypad'),
            bbKidAvatar: document.getElementById('bbKidAvatar'),
            bbKidName: document.getElementById('bbKidName'),
            bbKidDiffTag: document.getElementById('bbKidDiffTag'),
            btnBbKidGear: document.getElementById('btnBbKidGear'),

            // 关卡选择弹窗
            levelModal: document.getElementById('levelModal'),
            levelGrid: document.getElementById('levelGrid'),
            btnCloseLevelModal: document.getElementById('btnCloseLevelModal'),

            // 小朋友档案与难度设置大弹窗 (对标 shuxue)
            userProfileModal: document.getElementById('userProfileModal'),
            btnAddNewKid: document.getElementById('btnAddNewKid'),
            kidProfilesList: document.getElementById('kidProfilesList'),
            profileEditModeTag: document.getElementById('profileEditModeTag'),
            btnDeleteKid: document.getElementById('btnDeleteKid'),
            inputKidName: document.getElementById('inputKidName'),
            avatarSelectGrid: document.getElementById('avatarSelectGrid'),
            tabBtnCustom: document.getElementById('tabBtnCustom'),
            tabBtnPreset: document.getElementById('tabBtnPreset'),
            tabContentCustom: document.getElementById('tabContentCustom'),
            tabContentPreset: document.getElementById('tabContentPreset'),
            chkOp_add: document.getElementById('chkOp_add'),
            chkOp_sub: document.getElementById('chkOp_sub'),
            chkOp_mul: document.getElementById('chkOp_mul'),
            chkOp_div: document.getElementById('chkOp_div'),
            rangesGrid: document.getElementById('rangesGrid'),
            multipliersGrid: document.getElementById('multipliersGrid'),
            blockMultiplierLimit: document.getElementById('blockMultiplierLimit'),
            chkOptFillBlank: document.getElementById('chkOptFillBlank'),
            chkOptCarryBorrow: document.getElementById('chkOptCarryBorrow'),
            presetGradeCards: document.getElementById('presetGradeCards'),
            btnSaveUserProfile: document.getElementById('btnSaveUserProfile'),
            btnCancelUserProfile: document.getElementById('btnCancelUserProfile'),

            // 战报与错题攻坚大弹窗 (对标 shuxue)
            scoreRecordsModal: document.getElementById('scoreRecordsModal'),
            recordsKidSelector: document.getElementById('recordsKidSelector'),
            tabBtnHistoryList: document.getElementById('tabBtnHistoryList'),
            tabBtnMistakesBook: document.getElementById('tabBtnMistakesBook'),
            recordsHistoryContent: document.getElementById('recordsHistoryContent'),
            recordsMistakesContent: document.getElementById('recordsMistakesContent'),
            historyListBox: document.getElementById('historyListBox'),
            mistakesListBox: document.getElementById('mistakesListBox'),
            btnClearKidHistory: document.getElementById('btnClearKidHistory'),
            btnCloseRecordsModal: document.getElementById('btnCloseRecordsModal'),

            // 胜利与失败结算弹窗
            victoryModal: document.getElementById('victoryModal'),
            victoryRewardText: document.getElementById('victoryRewardText'),
            reportTotalQ: document.getElementById('reportTotalQ'),
            reportAccuracy: document.getElementById('reportAccuracy'),
            reportMaxCombo: document.getElementById('reportMaxCombo'),
            btnNextLevel: document.getElementById('btnNextLevel'),
            btnReplayVictory: document.getElementById('btnReplayVictory'),
            defeatModal: document.getElementById('defeatModal'),
            btnRetryLevel: document.getElementById('btnRetryLevel'),
            btnSelectLevelFromDefeat: document.getElementById('btnSelectLevelFromDefeat')
        };

        this.init();
    }

    async init() {
        this.updateProfileUI();

        // 收集所有需要预加载的资产
        const assetPaths = [
            'assets/backgrounds/day_1row_viewport.jpg',
            'assets/backgrounds/day_5row_viewport.jpg',
            'assets/ui/sun.gif',
            'assets/ui/shovel.png',
            'assets/ui/trophy.png',
            'assets/projectiles/pea.gif',
            'assets/projectiles/pea_splat.gif',
            'assets/projectiles/snow_pea.gif',
            'assets/projectiles/cherry_boom.gif',
            'assets/projectiles/spudow.gif',
            'assets/zombies/zombie_walk.gif',
            'assets/zombies/zombie_attack.gif',
            'assets/zombies/zombie_head.gif',
            'assets/zombies/zombie_die.gif',
            'assets/zombies/conehead_walk.gif',
            'assets/zombies/conehead_attack.gif',
            'assets/zombies/buckethead_walk.gif',
            'assets/zombies/buckethead_attack.gif',
            'assets/zombies/newspaper_lost.gif',
            'assets/zombies/newspaper_drop.png',
            'assets/backgrounds/tombstone.png',
            'assets/backgrounds/night_viewport.jpg',
            'assets/backgrounds/pool_viewport.jpg',
            'assets/backgrounds/fog_viewport.jpg',
            'assets/backgrounds/roof_viewport.jpg',
            'assets/projectiles/cabbage.png',
            'assets/projectiles/corn.png',
            'assets/projectiles/butter.png',
            'assets/projectiles/melon.png',
            'assets/projectiles/star.png',
            'assets/zombies/polevault_run.gif',
            'assets/zombies/polevault_jump.gif',
            'assets/zombies/polevault_walk.gif',
            'assets/zombies/polevault_attack.gif',
            'assets/zombies/polevault_die.gif',
            'assets/zombies/zombie_charred.gif',
            'assets/projectiles/doom_cloud.png',
            'assets/backgrounds/crater.png',
            'assets/cards/card_rednut.png',
            'assets/plants/wallnut_red.png',
            'assets/projectiles/fire_pea.gif',
            'assets/projectiles/jalapeno_fire.gif',
            'assets/ui/lawnmower.png',
            'assets/ui/shovel.png',
            'assets/ui/sun.gif'
        ];

        // 加入所有植物卡牌与动画及状态变体
        Object.values(GAME_CONFIG.plants).forEach(p => {
            if (p.anim) assetPaths.push(p.anim);
            if (p.icon) assetPaths.push(p.icon);
            if (p.crack1Anim) assetPaths.push(p.crack1Anim);
            if (p.crack2Anim) assetPaths.push(p.crack2Anim);
            if (p.unarmedAnim) assetPaths.push(p.unarmedAnim);
            if (p.armedAnim) assetPaths.push(p.armedAnim);
            if (p.bigAnim) assetPaths.push(p.bigAnim);
            if (p.hideAnim) assetPaths.push(p.hideAnim);
            if (p.sleepAnim) assetPaths.push(p.sleepAnim);
            if (p.eatAnim) assetPaths.push(p.eatAnim);
            if (p.bulletAnim) assetPaths.push(p.bulletAnim);
            if (p.splatAnim) assetPaths.push(p.splatAnim);
            if (p.cloudAnim) assetPaths.push(p.cloudAnim);
        });

        // 预加载资产
        await assetsLoader.preloadAll(assetPaths, (loaded, total, pct) => {
            if (this.dom.loadingBarFill) this.dom.loadingBarFill.style.width = `${pct}%`;
            if (this.dom.loadingHintText) this.dom.loadingHintText.innerText = `资源加载中 ${pct}% (${loaded}/${total})`;
        });

        if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.style.display = 'none';
        }

        // 初始化核心战场 (传入 canvas, entityLayer, 状态回调)
        this.pvzEngine = new PvzEngine(
            this.canvas,
            this.dom.entityLayer,
            (evt, data) => this.handleEngineState(evt, data)
        );
        window.pvzGame = this.pvzEngine;

        // 绑定 UI 交互
        this.bindDOMEvents();
        this.initProfileModalControls();
        this.renderCardsList();
        this.syncQuestionToBlackboard();

        // 启动主渲染循环
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(currentTime) {
        const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
        this.lastTime = currentTime;

        if (this.pvzEngine) {
            this.pvzEngine.update(dt);
            this.pvzEngine.render();
            this.updateHUD();
            this.updateCardCooldowns();
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    updateHUD() {
        if (!this.pvzEngine) return;
        if (this.pvzEngine.levelConfig.isBowling) {
            this.dom.sunVal.innerText = '🎳保龄';
        } else if (this.pvzEngine.levelConfig.isConveyorBelt) {
            this.dom.sunVal.innerText = 'FREE';
        } else {
            this.dom.sunVal.innerText = this.pvzEngine.sun;
        }
        this.dom.livesVal.innerText = this.pvzEngine.lives;

        const curWave = this.pvzEngine.waveIndex;
        const totalWave = this.pvzEngine.totalWaves;
        this.dom.waveVal.innerText = `${curWave}/${totalWave}`;
        const pct = totalWave > 0 ? (curWave / totalWave) * 100 : 0;
        this.dom.syringeFluid.style.width = `${pct}%`;

        // 连对勋章
        const combo = mathEngine.combo;
        this.dom.comboCount.innerText = `x${combo}`;
        if (combo >= 3) {
            this.dom.comboBadge.style.display = 'flex';
        } else {
            this.dom.comboBadge.style.display = 'none';
        }
    }

    updateCardCooldowns() {
        if (!this.pvzEngine) return;
        const cardElements = this.dom.cardsList.querySelectorAll('.plant-card');
        cardElements.forEach(cardEl => {
            const pId = cardEl.getAttribute('data-id');
            const conf = GAME_CONFIG.plants[pId];
            if (!conf) return;

            const cdRemain = this.pvzEngine.cardCooldowns[pId] || 0;
            const cdTotal = conf.cooldown || 7.5;
            const overlay = cardEl.querySelector('.card-cooldown-overlay');

            if (cdRemain > 0) {
                const pct = (cdRemain / cdTotal) * 100;
                overlay.style.height = `${pct}%`;
                cardEl.classList.add('disabled');
            } else {
                overlay.style.height = '0%';
                if (!this.pvzEngine.levelConfig.isConveyorBelt && this.pvzEngine.sun < conf.cost) {
                    cardEl.classList.add('disabled');
                } else {
                    cardEl.classList.remove('disabled');
                }
            }

            if (this.pvzEngine.selectedCard === pId) {
                cardEl.classList.add('selected');
            } else {
                cardEl.classList.remove('selected');
            }
        });
    }

    renderCardsList() {
        if (!this.pvzEngine) return;
        this.dom.cardsList.innerHTML = '';

        // 传送带关卡 (如 1-5 坚果保龄球、1-10 决战)：展示动态输送的传送带卡片队列
        if (this.pvzEngine.levelConfig.isConveyorBelt) {
            const beltCards = this.pvzEngine.conveyorBelt || [];
            beltCards.forEach((pId, idx) => {
                const conf = GAME_CONFIG.plants[pId];
                if (!conf) return;

                const isSelected = (this.pvzEngine.selectedCard === pId && this.pvzEngine.selectedConveyorIdx === idx);

                const card = document.createElement('div');
                card.className = `plant-card conveyor-card ${isSelected ? 'selected' : ''}`;
                card.setAttribute('data-id', pId);
                card.setAttribute('data-conveyor-idx', idx);
                card.setAttribute('title', `${conf.name} (传送带免费卡片)`);
                card.innerHTML = `
                    <div class="card-cooldown-overlay"></div>
                    <img src="${conf.icon}" alt="${conf.name}" class="card-seed-img" />
                    <span class="card-conveyor-tag">FREE</span>
                `;

                card.addEventListener('click', () => {
                    soundEngine.playPlant();
                    if (this.pvzEngine.selectedCard === pId && this.pvzEngine.selectedConveyorIdx === idx) {
                        this.pvzEngine.selectedCard = null;
                        this.pvzEngine.selectedConveyorIdx = null;
                    } else {
                        this.pvzEngine.selectedCard = pId;
                        this.pvzEngine.selectedConveyorIdx = idx;
                        this.pvzEngine.isShovelActive = false;
                        this.dom.shovelSlot.classList.remove('active');
                    }
                    this.renderCardsList();
                });

                this.dom.cardsList.appendChild(card);
            });
            return;
        }

        const allowed = this.pvzEngine.levelConfig.allowedPlants || ['peashooter'];
        const isNight = !!this.pvzEngine.isNight;

        allowed.forEach(pId => {
            const conf = GAME_CONFIG.plants[pId];
            if (!conf) return;

            const isAsleepInLevel = (isNight && conf.isDiurnal) || (!isNight && conf.isNocturnal);

            const card = document.createElement('div');
            card.className = `plant-card ${isAsleepInLevel ? 'plant-card-sleep' : ''}`;
            card.setAttribute('data-id', pId);
            card.setAttribute('title', isAsleepInLevel ? `${conf.name} (在此关卡处于睡眠状态，种下后需咖啡豆唤醒)` : conf.name);
            card.innerHTML = `
                <div class="card-cooldown-overlay"></div>
                <img src="${conf.icon}" alt="${conf.name}" class="card-seed-img" />
                ${isAsleepInLevel ? '<span class="card-sleep-badge" title="休眠状态">💤 睡</span>' : ''}
                ${this.pvzEngine.levelConfig.isConveyorBelt ? '<span class="card-conveyor-tag">FREE</span>' : ''}
            `;

            card.addEventListener('click', () => {
                if (card.classList.contains('disabled')) {
                    soundEngine.playMathWrong();
                    return;
                }
                soundEngine.playPlant();
                // 切换选中状态
                if (this.pvzEngine.selectedCard === pId) {
                    this.pvzEngine.selectedCard = null;
                } else {
                    this.pvzEngine.selectedCard = pId;
                    this.pvzEngine.isShovelActive = false;
                    this.dom.shovelSlot.classList.remove('active');
                }
            });

            this.dom.cardsList.appendChild(card);
        });
    }

    bindDOMEvents() {
        // 铲子点击切换
        this.dom.shovelSlot.addEventListener('click', () => {
            this.pvzEngine.isShovelActive = !this.pvzEngine.isShovelActive;
            if (this.pvzEngine.isShovelActive) {
                this.dom.shovelSlot.classList.add('active');
                this.pvzEngine.selectedCard = null;
                soundEngine.playPlant();
            } else {
                this.dom.shovelSlot.classList.remove('active');
            }
        });

        // 虚拟键盘按键
        this.dom.virtualKeypad.addEventListener('click', (e) => {
            const btn = e.target.closest('.cookie-key');
            if (!btn) return;
            const key = btn.getAttribute('data-key');
            this.handleKeyInput(key);
        });

        // 提交答案
        this.dom.btnSubmitAnswer.addEventListener('click', () => {
            this.submitCurrentAnswer();
        });

        // 物理键盘监听
        window.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') {
                this.handleKeyInput(e.key);
            } else if (e.key === 'Backspace') {
                this.handleKeyInput('backspace');
            } else if (e.key === 'Escape') {
                this.handleKeyInput('clear');
            } else if (e.key === 'Enter') {
                this.submitCurrentAnswer();
            }
        });

        // 顶部 HUD 按钮
        this.dom.btnPause.addEventListener('click', () => {
            this.pvzEngine.isPaused = !this.pvzEngine.isPaused;
            this.dom.btnPause.innerText = this.pvzEngine.isPaused ? '▶️' : '⏸️';
        });

        this.dom.btnMute.addEventListener('click', () => {
            const muted = soundEngine.toggleMute();
            this.dom.btnMute.innerText = muted ? '🔇' : '🔊';
        });

        // 关卡选择弹窗
        this.dom.btnSelectLevel.addEventListener('click', () => {
            this.openLevelModal();
        });
        this.dom.btnCloseLevelModal.addEventListener('click', () => {
            this.dom.levelModal.style.display = 'none';
        });

        // 小朋友档案与难度设置
        this.dom.btnUserProfile.addEventListener('click', () => this.openProfileModal());
        this.dom.btnBbKidGear.addEventListener('click', () => this.openProfileModal());
        const bbKidFooter = document.getElementById('bbKidFooter');
        if (bbKidFooter) {
            bbKidFooter.addEventListener('click', () => this.openProfileModal());
        }

        // 战报与错题本
        if (this.dom.btnScoreRecords) {
            this.dom.btnScoreRecords.addEventListener('click', () => this.openRecordsModal());
        }
        this.dom.btnCloseRecordsModal.addEventListener('click', () => {
            this.dom.scoreRecordsModal.style.display = 'none';
        });
        this.dom.btnClearKidHistory.addEventListener('click', () => {
            const cur = this.viewingRecordsKidId || profileManager.getActiveUser().id;
            profileManager.clearUserHistory(cur);
            this.renderScoreRecords(cur);
        });

        // 胜利与失败结算按钮
        this.dom.btnNextLevel.addEventListener('click', () => {
            this.dom.victoryModal.style.display = 'none';
            const parts = this.pvzEngine.levelId.split('-');
            const curWorld = parseInt(parts[0], 10);
            const curIdx = parseInt(parts[1], 10);
            let nextLevel = this.pvzEngine.levelId;
            if (curIdx < 10) {
                nextLevel = `${curWorld}-${curIdx + 1}`;
            } else if (curWorld < 5) {
                nextLevel = `${curWorld + 1}-1`;
            }
            this.loadNewLevel(nextLevel);
        });

        this.dom.btnReplayVictory.addEventListener('click', () => {
            this.dom.victoryModal.style.display = 'none';
            this.loadNewLevel(this.pvzEngine.levelId);
        });

        this.dom.btnRetryLevel.addEventListener('click', () => {
            this.dom.defeatModal.style.display = 'none';
            this.loadNewLevel(this.pvzEngine.levelId);
        });

        this.dom.btnSelectLevelFromDefeat.addEventListener('click', () => {
            this.dom.defeatModal.style.display = 'none';
            this.openLevelModal();
        });
    }

    handleKeyInput(key) {
        soundEngine.resume();
        if (key === 'clear') {
            this.inputBuffer = '';
        } else if (key === 'backspace') {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
        } else if (this.inputBuffer.length < 5) {
            this.inputBuffer += key;
        }
        this.dom.answerInput.value = this.inputBuffer;
    }

    submitCurrentAnswer() {
        if (!this.inputBuffer.trim()) return;
        const res = mathEngine.checkAnswer(this.inputBuffer);
        this.inputBuffer = '';
        this.dom.answerInput.value = '';

        // 将结果同步传给核心战场引擎 (掉落阳光、连击狂暴、护盾击碎)
        if (this.pvzEngine) {
            this.pvzEngine.handleMathAnswerResult(res);
        }

        // 更新黑板反馈
        if (res.isCorrect) {
            this.dom.feedbackMsg.innerText = `🎉 太棒啦！算对了！获得 +${res.bonusSun} 阳光！`;
            this.dom.mascotEmoji.innerText = '🌻';
            this.dom.mascotTalk.innerText = '太聪明啦！继续算对积攒狂暴与大招！';
        } else {
            this.dom.feedbackMsg.innerText = `差一点点哦~ 正确答案是 ${res.expected}，再试一题！`;
            this.dom.mascotEmoji.innerText = '🌿';
            this.dom.mascotTalk.innerText = '没关系，慢慢算，向日葵支持你！';
        }

        this.syncQuestionToBlackboard();
    }

    syncQuestionToBlackboard() {
        const q = mathEngine.currentQuestion;
        if (!q) return;
        this.dom.questionFormula.innerText = q.formula;
        this.dom.questionHint.innerText = q.hint || '🎯 口算速算挑战';
    }

    updateProfileUI() {
        const p = profileManager.getActiveUser();
        if (!p) return;
        this.dom.hudUserAvatar.innerText = p.avatar || '🐰';
        this.dom.hudUserName.innerText = p.name;
        this.dom.bbKidAvatar.innerText = p.avatar || '🐰';
        this.dom.bbKidName.innerText = p.name;
        mathEngine.setDifficulty(p.difficulty);
        this.dom.bbKidDiffTag.innerText = mathEngine.getDifficultySummary();
    }

    // ==========================================
    // 小朋友档案与心算难度设置模块 (完全对标 shuxue)
    // ==========================================
    initProfileModalControls() {
        // 新增小朋友按钮
        this.dom.btnAddNewKid.addEventListener('click', () => {
            this.editingKidId = 'NEW';
            this.selectedAvatar = AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)];
            this.dom.inputKidName.value = '';
            this.activeDiffTab = 'custom';
            this.selectedRange = 20;
            this.selectedMultiplier = 5;
            this.selectedPresetGrade = 'grade1_2';
            this.renderProfileModalForm();
        });

        // 删除当前编辑小朋友
        this.dom.btnDeleteKid.addEventListener('click', () => {
            if (this.editingKidId && this.editingKidId !== 'NEW') {
                const targetUser = profileManager.getUser(this.editingKidId);
                if (targetUser && confirm(`确定要删除【${targetUser.name}】的档案吗？`)) {
                    profileManager.deleteUser(this.editingKidId);
                    this.editingKidId = profileManager.getActiveUser().id;
                    this.updateProfileUI();
                    this.renderProfileModalForm();
                }
            }
        });

        // 选项卡切换：自定义 vs 预设
        this.dom.tabBtnCustom.addEventListener('click', () => {
            this.activeDiffTab = 'custom';
            this.dom.tabBtnCustom.classList.add('active');
            this.dom.tabBtnPreset.classList.remove('active');
            this.dom.tabContentCustom.style.display = 'block';
            this.dom.tabContentPreset.style.display = 'none';
        });

        this.dom.tabBtnPreset.addEventListener('click', () => {
            this.activeDiffTab = 'preset';
            this.dom.tabBtnPreset.classList.add('active');
            this.dom.tabBtnCustom.classList.remove('active');
            this.dom.tabContentPreset.style.display = 'block';
            this.dom.tabContentCustom.style.display = 'none';
        });

        // 乘除法关联显示乘法上限
        const toggleMulBlock = () => {
            const hasMulDiv = this.dom.chkOp_mul.checked || this.dom.chkOp_div.checked;
            this.dom.blockMultiplierLimit.style.opacity = hasMulDiv ? '1' : '0.5';
        };
        this.dom.chkOp_mul.addEventListener('change', toggleMulBlock);
        this.dom.chkOp_div.addEventListener('change', toggleMulBlock);

        // 取消与保存
        this.dom.btnCancelUserProfile.addEventListener('click', () => {
            this.dom.userProfileModal.style.display = 'none';
        });

        this.dom.btnSaveUserProfile.addEventListener('click', () => {
            this.saveUserProfileSettings();
        });

        // 战报选项卡切换
        this.dom.tabBtnHistoryList.addEventListener('click', () => {
            this.dom.tabBtnHistoryList.classList.add('active');
            this.dom.tabBtnMistakesBook.classList.remove('active');
            this.dom.recordsHistoryContent.style.display = 'block';
            this.dom.recordsMistakesContent.style.display = 'none';
        });

        this.dom.tabBtnMistakesBook.addEventListener('click', () => {
            this.dom.tabBtnMistakesBook.classList.add('active');
            this.dom.tabBtnHistoryList.classList.remove('active');
            this.dom.recordsMistakesContent.style.display = 'block';
            this.dom.recordsHistoryContent.style.display = 'none';
        });
    }

    openProfileModal() {
        const curUser = profileManager.getActiveUser();
        this.editingKidId = curUser.id;
        this.renderProfileModalForm();
        this.dom.userProfileModal.style.display = 'flex';
    }

    renderProfileModalForm() {
        const users = profileManager.getUsers();
        const isNew = this.editingKidId === 'NEW';
        const targetUser = isNew ? null : profileManager.getUser(this.editingKidId) || profileManager.getActiveUser();

        // 1. 渲染小朋友列表标签
        this.dom.kidProfilesList.innerHTML = '';
        users.forEach(u => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `btn-jelly-pill ${(!isNew && u.id === targetUser.id) ? 'active' : ''}`;
            btn.innerHTML = `<span>${u.avatar}</span> <span>${u.name}</span>`;
            btn.addEventListener('click', () => {
                this.editingKidId = u.id;
                profileManager.setActiveUser(u.id);
                this.updateProfileUI();
                this.renderProfileModalForm();
            });
            this.dom.kidProfilesList.appendChild(btn);
        });

        // 2. 标题与删除按钮状态
        if (isNew) {
            this.dom.profileEditModeTag.innerText = '➕ 正在新增小勇士档案';
            this.dom.btnDeleteKid.style.display = 'none';
            this.dom.inputKidName.value = '';
        } else {
            this.dom.profileEditModeTag.innerText = `✏️ 正在编辑：${targetUser.name}`;
            this.dom.btnDeleteKid.style.display = users.length > 1 ? 'block' : 'none';
            this.dom.inputKidName.value = targetUser.name;
            this.selectedAvatar = targetUser.avatar;
            const diff = targetUser.difficulty || {};
            this.activeDiffTab = diff.mode === 'preset' ? 'preset' : 'custom';
            this.selectedRange = diff.range || 20;
            this.selectedMultiplier = diff.maxMultiplier || 5;
            this.selectedPresetGrade = diff.presetGrade || 'grade1_2';
        }

        // 3. 渲染 12 个萌宠头像
        this.dom.avatarSelectGrid.innerHTML = '';
        AVATAR_LIST.forEach(av => {
            const avBtn = document.createElement('div');
            avBtn.className = `avatar-item ${av === this.selectedAvatar ? 'selected' : ''}`;
            avBtn.innerText = av;
            avBtn.addEventListener('click', () => {
                this.selectedAvatar = av;
                this.dom.avatarSelectGrid.querySelectorAll('.avatar-item').forEach(el => el.classList.remove('selected'));
                avBtn.classList.add('selected');
            });
            this.dom.avatarSelectGrid.appendChild(avBtn);
        });

        // 4. 选项卡同步
        if (this.activeDiffTab === 'custom') {
            this.dom.tabBtnCustom.classList.add('active');
            this.dom.tabBtnPreset.classList.remove('active');
            this.dom.tabContentCustom.style.display = 'block';
            this.dom.tabContentPreset.style.display = 'none';
        } else {
            this.dom.tabBtnPreset.classList.add('active');
            this.dom.tabBtnCustom.classList.remove('active');
            this.dom.tabContentPreset.style.display = 'block';
            this.dom.tabContentCustom.style.display = 'none';
        }

        // 5. 自定义模式：运算多选框
        const diff = targetUser ? (targetUser.difficulty || {}) : {};
        const ops = diff.operations || ['add', 'sub'];
        this.dom.chkOp_add.checked = ops.includes('add');
        this.dom.chkOp_sub.checked = ops.includes('sub');
        this.dom.chkOp_mul.checked = ops.includes('mul');
        this.dom.chkOp_div.checked = ops.includes('div');

        // 6. 数值范围胶囊 [10, 20, 50, 100, 1000]
        const ranges = [10, 20, 50, 100, 1000];
        this.dom.rangesGrid.innerHTML = '';
        ranges.forEach(r => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `range-pill range-pill-btn ${r === this.selectedRange ? 'selected' : ''}`;
            pill.innerText = `${r}以内`;
            pill.addEventListener('click', () => {
                this.selectedRange = r;
                this.activeDiffTab = 'custom';
                this.dom.rangesGrid.querySelectorAll('.range-pill, .range-pill-btn').forEach(p => p.classList.remove('selected'));
                pill.classList.add('selected');
            });
            this.dom.rangesGrid.appendChild(pill);
        });

        // 7. 乘法倍数上限胶囊 [5, 9, 12]
        const mults = [5, 9, 12];
        this.dom.multipliersGrid.innerHTML = '';
        mults.forEach(m => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `range-pill range-pill-btn ${m === this.selectedMultiplier ? 'selected' : ''}`;
            pill.innerText = `${m}以内乘法`;
            pill.addEventListener('click', () => {
                this.selectedMultiplier = m;
                this.activeDiffTab = 'custom';
                this.dom.multipliersGrid.querySelectorAll('.range-pill, .range-pill-btn').forEach(p => p.classList.remove('selected'));
                pill.classList.add('selected');
            });
            this.dom.multipliersGrid.appendChild(pill);
        });

        // 8. 额外启发开关
        this.dom.chkOptFillBlank.checked = diff.allowFillBlank !== false;
        this.dom.chkOptCarryBorrow.checked = diff.allowCarryBorrow !== false;

        // 9. 渲染预设年级卡片
        this.dom.presetGradeCards.innerHTML = '';
        Object.values(DIFFICULTY_PRESETS).forEach(preset => {
            const card = document.createElement('div');
            card.className = `preset-card diff-card ${preset.id === this.selectedPresetGrade ? 'selected' : ''}`;
            card.setAttribute('data-preset', preset.id);
            card.innerHTML = `
                <div class="preset-title diff-card-title">${preset.name}</div>
                <div class="preset-desc diff-card-desc">${preset.desc}</div>
            `;
            card.addEventListener('click', () => {
                this.selectedPresetGrade = preset.id;
                this.activeDiffTab = 'preset';
                this.dom.presetGradeCards.querySelectorAll('.preset-card, .diff-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
            this.dom.presetGradeCards.appendChild(card);
        });
    }

    saveUserProfileSettings() {
        const name = (this.dom.inputKidName.value || '小宝贝').trim();
        const avatar = this.selectedAvatar || '🐰';

        // 运算类型检查 (防空)
        const ops = [];
        if (this.dom.chkOp_add.checked) ops.push('add');
        if (this.dom.chkOp_sub.checked) ops.push('sub');
        if (this.dom.chkOp_mul.checked) ops.push('mul');
        if (this.dom.chkOp_div.checked) ops.push('div');
        if (ops.length === 0) ops.push('add');

        const difficulty = {
            mode: this.activeDiffTab,
            presetGrade: this.selectedPresetGrade,
            operations: ops,
            range: this.selectedRange,
            maxMultiplier: this.selectedMultiplier,
            allowCarryBorrow: this.dom.chkOptCarryBorrow.checked,
            allowFillBlank: this.dom.chkOptFillBlank.checked
        };

        if (this.editingKidId === 'NEW') {
            profileManager.addUser({ name, avatar, difficulty });
        } else {
            profileManager.updateUser(this.editingKidId, { name, avatar, difficulty });
        }

        this.updateProfileUI();
        this.syncQuestionToBlackboard();
        this.dom.userProfileModal.style.display = 'none';
        soundEngine.playVictory();
    }

    // ==========================================
    // 战报与错题攻坚本展示 (完全对标 shuxue)
    // ==========================================
    openRecordsModal() {
        const curUser = profileManager.getActiveUser();
        this.viewingRecordsKidId = curUser.id;
        this.renderScoreRecords(curUser.id);
        this.dom.scoreRecordsModal.style.display = 'flex';
    }

    renderScoreRecords(userId) {
        const users = profileManager.getUsers();
        const user = profileManager.getUser(userId) || profileManager.getActiveUser();
        this.viewingRecordsKidId = user.id;

        // 1. 小朋友筛选器
        this.dom.recordsKidSelector.innerHTML = '';
        users.forEach(u => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `btn-jelly-pill ${u.id === user.id ? 'active' : ''}`;
            btn.innerHTML = `<span>${u.avatar}</span> <span>${u.name}</span>`;
            btn.addEventListener('click', () => {
                this.renderScoreRecords(u.id);
            });
            this.dom.recordsKidSelector.appendChild(btn);
        });

        // 2. 渲染历史答题战报
        const history = user.history || [];
        this.dom.historyListBox.innerHTML = '';
        if (history.length === 0) {
            this.dom.historyListBox.innerHTML = `
                <div style="text-align:center; padding:35px 20px; color:#bdc3c7; font-size:15px;">
                    🌱 ${user.name} 还没有出战记录哦，快去后院草坪答题打僵尸吧！
                </div>
            `;
        } else {
            history.forEach(h => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-item-header">
                        <span class="history-level-tag">🗺️ 关卡 ${h.levelId}</span>
                        <span class="history-date">${h.date}</span>
                    </div>
                    <div class="history-stats-grid">
                        <div class="h-stat-pill">答题：<strong>${h.correct}/${h.total}</strong></div>
                        <div class="h-stat-pill">正确率：<strong style="color:${h.accuracy >= 80 ? '#2ecc71' : '#e67e22'}">${h.accuracy}%</strong></div>
                        <div class="h-stat-pill">最高连击：<strong style="color:#f1c40f">🔥 x${h.maxCombo}</strong></div>
                    </div>
                `;
                this.dom.historyListBox.appendChild(item);
            });
        }

        // 3. 渲染错题攻坚本
        const mistakes = user.mistakes || [];
        this.dom.mistakesListBox.innerHTML = '';
        if (mistakes.length === 0) {
            this.dom.mistakesListBox.innerHTML = `
                <div style="text-align:center; padding:35px 20px; color:#2ecc71; font-weight:700; font-size:16px;">
                    🎉 太棒了！当前没有任何错题记录，${user.name} 是个心算小天才！
                </div>
            `;
        } else {
            mistakes.forEach(m => {
                const item = document.createElement('div');
                item.className = 'mistake-item';
                item.innerHTML = `
                    <span class="mistake-formula">${m.formula}</span>
                    <span class="mistake-answer">正确答案：<strong>${m.expected}</strong></span>
                `;
                this.dom.mistakesListBox.appendChild(item);
            });
        }
    }

    openLevelModal() {
        this.dom.levelGrid.innerHTML = '';
        const worlds = [
            { id: 1, name: '☀️ 第一大关：白天草坪 (1-1 ~ 1-10)' },
            { id: 2, name: '🌙 第二大关：黑夜墓地 (2-1 ~ 2-10)' },
            { id: 3, name: '🌊 第三大关：碧波泳池 (3-1 ~ 3-10)' },
            { id: 4, name: '🌫️ 第四大关：浓雾迷阵 (4-1 ~ 4-10)' },
            { id: 5, name: '🏠 第五大关：屋顶决战 (5-1 ~ 5-10)' }
        ];

        worlds.forEach(w => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'level-group-header';
            groupHeader.style.gridColumn = '1 / -1';
            groupHeader.style.padding = '8px 12px';
            groupHeader.style.margin = '10px 0 4px 0';
            groupHeader.style.background = 'rgba(255,255,255,0.08)';
            groupHeader.style.borderRadius = '8px';
            groupHeader.style.fontWeight = 'bold';
            groupHeader.style.fontSize = '14px';
            groupHeader.style.color = '#f1c40f';
            groupHeader.innerText = w.name;
            this.dom.levelGrid.appendChild(groupHeader);

            Object.keys(GAME_CONFIG.levels).filter(id => GAME_CONFIG.levels[id].world === w.id).forEach(lvlId => {
                const conf = GAME_CONFIG.levels[lvlId];
                const card = document.createElement('div');
                card.className = `level-card ${lvlId === this.pvzEngine.levelId ? 'active' : ''}`;
                card.innerHTML = `
                    <div class="level-card-id">${lvlId}</div>
                    <div class="level-card-name">${conf.title.split('：')[1] || conf.title}</div>
                `;
                card.addEventListener('click', () => {
                    this.dom.levelModal.style.display = 'none';
                    this.loadNewLevel(lvlId);
                });
                this.dom.levelGrid.appendChild(card);
            });
        });
        this.dom.levelModal.style.display = 'flex';
    }

    loadNewLevel(lvlId) {
        if (!this.pvzEngine) return;
        this.pvzEngine.loadLevel(lvlId);
        this.renderCardsList();
        this.dom.btnSelectLevel.innerText = `🗺️ 第 ${lvlId} 关 ▾`;
        mathEngine.resetRoundStats();
        this.syncQuestionToBlackboard();
    }

    handleEngineState(evt, data) {
        if (evt === 'conveyor_updated') {
            this.renderCardsList();
            return;
        }

        const total = mathEngine.totalAttempted;
        const correct = mathEngine.correctCount;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
        const maxCombo = mathEngine.maxCombo;

        if (evt === 'victory') {
            // 记录战报
            profileManager.recordGameRound({
                levelId: data.levelId,
                total,
                correct,
                accuracy,
                maxCombo,
                mistakes: mathEngine.mistakes
            });

            this.dom.victoryRewardText.innerText = data.rewardText || '恭喜守卫成功！';
            this.dom.reportTotalQ.innerText = total;
            this.dom.reportAccuracy.innerText = `${accuracy}%`;
            this.dom.reportMaxCombo.innerText = `🔥 x${maxCombo}`;
            this.dom.victoryModal.style.display = 'flex';
        } else if (evt === 'game_over') {
            profileManager.recordGameRound({
                levelId: this.pvzEngine.levelId,
                total,
                correct,
                accuracy,
                maxCombo,
                mistakes: mathEngine.mistakes
            });
            this.dom.defeatModal.style.display = 'flex';
        }
    }
}

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new GameApp();
});
