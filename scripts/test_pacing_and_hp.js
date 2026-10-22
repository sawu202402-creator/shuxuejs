/**
 * test_pacing_and_hp.js - 验证原版节奏与血量数值系统
 */
import puppeteer from 'puppeteer-core';

async function testPacingAndHp() {
    console.log('🚀 Starting Pacing and HP Validation Test...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('Browser Error:', msg.text());
            errors.push(msg.text());
        }
    });

    page.on('pageerror', err => {
        console.error('Page Error:', err.message);
        errors.push(err.message);
    });

    await page.goto('http://127.0.0.1:8089', { waitUntil: 'networkidle2' });
    console.log('✅ Loaded page http://127.0.0.1:8089');

    // 1. 验证 GAME_CONFIG 数值体系
    const configCheck = await page.evaluate(async () => {
        const { GAME_CONFIG } = await import('./js/config.js');
        const normal = GAME_CONFIG.zombies.normal;
        const conehead = GAME_CONFIG.zombies.conehead;
        const buckethead = GAME_CONFIG.zombies.buckethead;
        const level1_1 = GAME_CONFIG.levels['1-1'];

        return {
            normalHp: normal.hp,
            normalHeadThreshold: normal.headLossThreshold,
            coneheadHp: conehead.hp,
            coneheadArmor: conehead.armorHp,
            bucketheadHp: buckethead.hp,
            bucketheadArmor: buckethead.armorHp,
            level1_1_wave1Delay: level1_1.waves[0].delay,
            level1_1_waveCount: level1_1.waves.length
        };
    });

    console.log('Config Check Result:', configCheck);

    if (configCheck.normalHp !== 270 || configCheck.normalHeadThreshold !== 70) {
        throw new Error(`Normal zombie HP mismatch! Expected 270/70, got ${configCheck.normalHp}/${configCheck.normalHeadThreshold}`);
    }
    if (configCheck.coneheadHp !== 270 || configCheck.coneheadArmor !== 370) {
        throw new Error(`Conehead zombie HP mismatch! Expected 270/370, got ${configCheck.coneheadHp}/${configCheck.coneheadArmor}`);
    }
    if (configCheck.bucketheadHp !== 270 || configCheck.bucketheadArmor !== 1100) {
        throw new Error(`Buckethead zombie HP mismatch! Expected 270/1100, got ${configCheck.bucketheadHp}/${configCheck.bucketheadArmor}`);
    }
    if (configCheck.level1_1_wave1Delay < 20) {
        throw new Error(`Level 1-1 opening wave delay too short! Expected >=20s, got ${configCheck.level1_1_wave1Delay}s`);
    }
    console.log('✅ 1. Official PVZ HP & Wave Delay Configuration 100% Verified');

    // 2. 模拟战斗伤害与击退测试 (测试 10 颗豌豆恰好击落头部)
    const combatSimulation = await page.evaluate(async () => {
        const { Zombie } = await import('./js/zombies.js');
        const z = new Zombie('normal', 2, 800, null);

        let peasFired = 0;
        let headDropPea = null;

        // 每次射入一颗 20 伤害的豌豆
        for (let i = 1; i <= 15; i++) {
            z.takeDamage(20, false);
            peasFired++;
            if (z.hasLostHead && headDropPea === null) {
                headDropPea = peasFired;
            }
        }

        // 测试路障僵尸
        const cz = new Zombie('conehead', 2, 800, null);
        let coneDropPea = null;
        let coneHeadDropPea = null;
        for (let i = 1; i <= 35; i++) {
            cz.takeDamage(20, false);
            if (!cz.hasShield && cz.armorHp === 0 && coneDropPea === null) {
                coneDropPea = i;
            }
            if (cz.hasLostHead && coneHeadDropPea === null) {
                coneHeadDropPea = i;
            }
        }

        // 测试铁桶僵尸
        const bz = new Zombie('buckethead', 2, 800, null);
        let bucketDropPea = null;
        let bucketHeadDropPea = null;
        for (let i = 1; i <= 70; i++) {
            bz.takeDamage(20, false);
            if (!bz.hasShield && bz.armorHp === 0 && bucketDropPea === null) {
                bucketDropPea = i;
            }
            if (bz.hasLostHead && bucketHeadDropPea === null) {
                bucketHeadDropPea = i;
            }
        }

        return {
            normalHeadDropPea: headDropPea,
            coneDropPea: coneDropPea,
            coneHeadDropPea: coneHeadDropPea,
            bucketDropPea: bucketDropPea,
            bucketHeadDropPea: bucketHeadDropPea
        };
    });

    console.log('Combat Simulation Result:', combatSimulation);

    if (combatSimulation.normalHeadDropPea !== 10) {
        throw new Error(`Regular zombie head did not drop at exactly 10 peas! Dropped at ${combatSimulation.normalHeadDropPea}`);
    }
    if (combatSimulation.coneDropPea !== 19 || combatSimulation.coneHeadDropPea !== 29) {
        throw new Error(`Conehead drop timings incorrect! Cone dropped at ${combatSimulation.coneDropPea}, head dropped at ${combatSimulation.coneHeadDropPea}`);
    }
    if (combatSimulation.bucketDropPea !== 55 || combatSimulation.bucketHeadDropPea !== 65) {
        throw new Error(`Buckethead drop timings incorrect! Bucket dropped at ${combatSimulation.bucketDropPea}, head dropped at ${combatSimulation.bucketHeadDropPea}`);
    }
    console.log('✅ 2. Pea Hit Counts & Armor Breaking 100% Match Official PVZ (10 peas / 29 peas / 65 peas)');

    // 3. 验证波次与旗帜预警引擎节拍
    const enginePacingCheck = await page.evaluate(async () => {
        const { PvzEngine } = await import('./js/pvzEngine.js');
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 600;
        const layer = document.createElement('div');
        const engine = new PvzEngine(canvas, layer);

        // 初始状态
        const initialWave = engine.waveIndex;
        const initialWaveTimer = engine.waveTimer;

        // 模拟推进 10 秒（开局未达到 25 秒），应该还没有刷出僵尸
        engine.update(10.0);
        const zombiesAt10s = engine.zombies.length;

        // 再推进 15 秒（总共 25 秒），应该刚好刷出第1波僵尸
        engine.update(15.1);
        const zombiesAt25s = engine.zombies.length;

        // 杀死第1波僵尸
        engine.zombies.forEach(z => z.takeDamage(9999));
        // 更新1帧清理尸体
        engine.update(1.2);
        
        // 验证进入 5 秒休整期
        const graceTimerStarted = engine.clearedGraceTimer > 0;
        const waveAtClearing = engine.waveIndex; // 应该是第1波已经刷出

        // 推进 5.1 秒，应该触发第2波
        engine.update(5.1);
        const waveAfterGrace = engine.waveIndex;

        return {
            initialWave,
            zombiesAt10s,
            zombiesAt25s,
            graceTimerStarted,
            waveAtClearing,
            waveAfterGrace
        };
    });

    console.log('Engine Pacing Check:', enginePacingCheck);

    if (enginePacingCheck.zombiesAt10s !== 0) {
        throw new Error(`First zombie spawned too early! Present at 10s.`);
    }
    if (enginePacingCheck.zombiesAt25s !== 1) {
        throw new Error(`First zombie did not spawn at 25s! Count: ${enginePacingCheck.zombiesAt25s}`);
    }
    if (!enginePacingCheck.graceTimerStarted) {
        throw new Error(`Cleared grace period timer did not start after zombie died!`);
    }
    if (enginePacingCheck.waveAfterGrace !== 2) {
        throw new Error(`Wave 2 did not trigger after 5s grace period! Current waveIndex: ${enginePacingCheck.waveAfterGrace}`);
    }
    console.log('✅ 3. Wave Engine Rhythm & Cleared Breather Timer 100% Validated');

    // 4. 验证向日葵阳光生产周期 (第1颗 7秒，后续 24秒)
    const sunflowerCheck = await page.evaluate(async () => {
        const { SunflowerPlant } = await import('./js/plants.js');
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 600;
        const layer = document.createElement('div');
        const { PvzEngine } = await import('./js/pvzEngine.js');
        const engine = new PvzEngine(canvas, layer);

        const sf = new SunflowerPlant(2, 2, 200, 200, null);
        engine.plants.push(sf);

        // 推进 6.5 秒，还没有产出
        sf.update(6.5, engine);
        const sunsAt6_5s = engine.suns.length;

        // 推进到 7.2 秒，产出第1颗阳光
        sf.update(0.7, engine);
        const sunsAt7_2s = engine.suns.length;

        // 再推进 20 秒 (总距第1颗20秒)，不应该产出第2颗
        sf.update(20.0, engine);
        const sunsAt27_2s = engine.suns.length;

        // 再推进 4.5 秒 (距第1颗达到24.5秒)，产出第2颗阳光
        sf.update(4.5, engine);
        const sunsAt31_7s = engine.suns.length;

        return {
            sunsAt6_5s,
            sunsAt7_2s,
            sunsAt27_2s,
            sunsAt31_7s
        };
    });

    console.log('Sunflower Pacing Check:', sunflowerCheck);

    if (sunflowerCheck.sunsAt6_5s !== 0 || sunflowerCheck.sunsAt7_2s !== 1) {
        throw new Error(`Sunflower first sun production timing mismatch!`);
    }
    if (sunflowerCheck.sunsAt27_2s !== 1 || sunflowerCheck.sunsAt31_7s !== 2) {
        throw new Error(`Sunflower subsequent 24s interval mismatch!`);
    }
    console.log('✅ 4. Sunflower Production Timing 100% Verified (First 7s, Subsequent 24s)');

    if (errors.length > 0) {
        throw new Error(`Encountered ${errors.length} browser errors during test`);
    }

    await browser.close();
    console.log('🎉 ALL PACING AND HP VALIDATION TESTS PASSED 100%!');
}

testPacingAndHp().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
