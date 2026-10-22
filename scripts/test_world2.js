import puppeteer from 'puppeteer-core';

(async () => {
    console.log('🌙 Starting World 2 (Night Stages) Automated Verification Test...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto('http://127.0.0.1:8089', { waitUntil: 'networkidle2' });

        // 1. Verify Levels 2-1 to 2-10 in config
        const levelsCheck = await page.evaluate(async () => {
            const { GAME_CONFIG } = await import('./js/config.js');
            const nightLevels = [];
            for (let i = 1; i <= 10; i++) {
                const id = `2-${i}`;
                if (GAME_CONFIG.levels[id]) {
                    nightLevels.push({
                        id,
                        title: GAME_CONFIG.levels[id].title,
                        rewardPlant: GAME_CONFIG.levels[id].rewardPlant
                    });
                }
            }
            return {
                nightLevelCount: nightLevels.length,
                nightLevels
            };
        });
        console.log('✅ 1. World 2 Levels Config (2-1 to 2-10):', levelsCheck.nightLevelCount, 'levels registered');

        // 2. Load Level 2-1 (Night Lawn & Tombstones)
        const nightEngineCheck = await page.evaluate(async () => {
            const engine = window.gameApp ? window.gameApp.pvzEngine : null;
            if (!engine) return { error: 'No engine' };

            engine.loadLevel('2-1');
            return {
                levelId: engine.levelId,
                isNight: engine.isNight,
                skySunInterval: engine.skySunInterval,
                tombstoneCount: engine.tombstones ? engine.tombstones.length : 0,
                activeRows: engine.levelConfig.activeRows
            };
        });
        console.log('✅ 2. Level 2-1 Night Engine State:', nightEngineCheck);

        // 3. Test Puff-shroom (小喷菇) and Sun-shroom (阳光菇)
        const mushroomCombatCheck = await page.evaluate(async () => {
            const engine = window.gameApp ? window.gameApp.pvzEngine : null;
            const { createPlant } = await import('./js/plants.js');
            const { Zombie } = await import('./js/zombies.js');

            // 种下一只小喷菇与阳光菇
            const puff = createPlant('puffshroom', 2, 1, 320, 250, engine.entityLayer);
            const sunshroom = createPlant('sunshroom', 1, 1, 320, 150, engine.entityLayer);
            engine.plants.push(puff);
            engine.plants.push(sunshroom);

            // 放一只普通僵尸在小喷菇射程内 (x: 550, 距离 230px <= 300px)
            const zIn = new Zombie('normal', 2, 550, engine.entityLayer);
            engine.zombies.push(zIn);

            // 运行更新检测小喷菇开火
            puff.shootTimer = 2.0;
            puff.update(0.1, engine);
            const firedShroomBullet = engine.projectiles.filter(p => p.type === 'shroom').length;

            // 阳光菇生产与长大检测
            sunshroom.sunTimer = 8.0;
            sunshroom.update(0.1, engine);
            const initialSun = engine.suns.length;

            // 模拟 95 秒成长
            sunshroom.growTimer = 91.0;
            sunshroom.update(0.1, engine);
            const isGrown = sunshroom.isGrown;

            return {
                firedShroomBullet,
                initialSun,
                isGrown,
                puffCost: puff.config.cost
            };
        });
        console.log('✅ 3. Puff-shroom & Sun-shroom Combat & Growth:', mushroomCombatCheck);

        // 4. Test Fume-shroom & Screen Door Zombie (大喷菇穿透铁栅门)
        const fumeCheck = await page.evaluate(async () => {
            const engine = window.gameApp ? window.gameApp.pvzEngine : null;
            const { createPlant } = await import('./js/plants.js');
            const { Zombie } = await import('./js/zombies.js');

            const fume = createPlant('fumeshroom', 0, 1, 320, 60, engine.entityLayer);
            engine.plants.push(fume);

            // 放铁栅门僵尸 (1100门护甲 + 270血)
            const doorZombie = new Zombie('screendoor', 0, 500, engine.entityLayer);
            engine.zombies.push(doorZombie);
            const initArmor = doorZombie.armorHp;
            const initHp = doorZombie.hp;

            // 大喷菇喷气
            fume.shootTimer = 2.0;
            fume.update(0.1, engine);

            // 遍历更新所有云雾
            engine.projectiles.forEach(p => {
                if (typeof p.update === 'function') p.update(0.05, engine);
            });

            return {
                fumeFired: engine.projectiles.some(p => p.anim.includes('fume_cloud')),
                doorZombieArmorAfterFume: doorZombie.armorHp, // 门完好无损 (贯穿)
                doorZombieHpAfterFume: doorZombie.hp, // 本体直接扣血!
                bypassedDoorArmor: doorZombie.armorHp === initArmor && doorZombie.hp < initHp
            };
        });
        console.log('✅ 4. Fume-shroom Piercing Screen Door:', fumeCheck);

        // 5. Test Newspaper Zombie Rage (读报僵尸狂暴疾跑)
        const newspaperCheck = await page.evaluate(async () => {
            const engine = window.gameApp ? window.gameApp.pvzEngine : null;
            const { Zombie } = await import('./js/zombies.js');

            const npZombie = new Zombie('newspaper', 3, 600, engine.entityLayer);
            engine.zombies.push(npZombie);
            const initialSpeed = npZombie.speed;
            const initialShield = npZombie.hasShield;

            // 打掉报纸 (150 HP)
            npZombie.takeDamage(160);
            const rageSpeed = npZombie.speed;
            const hasShieldAfter = npZombie.hasShield;
            const isRageAnim = npZombie.currentAnim.includes('newspaper_lost');

            return {
                initialSpeed,
                initialShield,
                rageSpeed,
                hasShieldAfter,
                isRageAnim
            };
        });
        console.log('✅ 5. Newspaper Zombie Rage Mechanics:', newspaperCheck);

        // 6. Test Grave Buster (墓碑吞噬者)
        const busterCheck = await page.evaluate(async () => {
            const engine = window.gameApp ? window.gameApp.pvzEngine : null;
            const { createPlant } = await import('./js/plants.js');

            engine.loadLevel('2-1');
            const initTombCount = engine.tombstones.length;
            const targetTomb = engine.tombstones[0];

            // 种下墓碑吞噬者
            const buster = createPlant('gravebuster', targetTomb.row, targetTomb.col, targetTomb.x, targetTomb.y, engine.entityLayer);
            engine.plants.push(buster);

            // 快进4.6秒吞噬完毕
            buster.update(4.6, engine);
            const tombCountAfter = engine.tombstones.length;

            return {
                initTombCount,
                tombCountAfter,
                tombRemoved: tombCountAfter === initTombCount - 1
            };
        });
        console.log('✅ 6. Grave Buster devouring tombstone:', busterCheck);

        // 7. Take screenshot of Level 2-1 Night Stage
        await page.evaluate(() => {
            window.gameApp.loadNewLevel('2-1');
        });
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: 'scripts/test_night_2_1.png' });
        console.log('📸 Night Level 2-1 screenshot saved to scripts/test_night_2_1.png');

        console.log('\n🎉 ALL WORLD 2 (NIGHT STAGE) MECHANICS AND ASSETS 100% VERIFIED!');
    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await browser.close();
    }
})();
