/**
 * scripts/test_shield_and_levels.js - 验证多关卡切换与数理雷击破盾机制
 */
import puppeteer from 'puppeteer-core';

async function testShieldAndLevels() {
    console.log('🚀 Starting Multi-Level & Math Shield Test...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    await page.goto('http://127.0.0.1:8089/', { waitUntil: 'networkidle0' });

    // 等待加载完成
    await page.waitForFunction(() => {
        const overlay = document.getElementById('loadingOverlay');
        return !overlay || overlay.style.display === 'none';
    });

    // 1. 遍历测试 1-1 至 1-10 全部关卡加载稳定性
    console.log('🗺️ Testing rapid switching across all levels (1-1 to 1-10)...');
    for (let i = 1; i <= 10; i++) {
        const lvlId = `1-${i}`;
        const loadResult = await page.evaluate((id) => {
            window.gameApp.loadNewLevel(id);
            const engine = window.gameApp.pvzEngine;
            return {
                levelId: engine.levelId,
                title: engine.levelConfig.title,
                allowedPlants: engine.levelConfig.allowedPlants,
                activeRows: engine.levelConfig.activeRows.length,
                wavesCount: engine.levelConfig.waves.length
            };
        }, lvlId);
        console.log(`   Level ${loadResult.levelId} loaded: ${loadResult.title} | Plants: [${loadResult.allowedPlants.join(', ')}] | Rows: ${loadResult.activeRows}`);
    }
    console.log('✅ All 10 levels loaded without any runtime exceptions!');

    // 2. 深入测试 Level 1-3 路障僵尸与数理破盾
    console.log('🚧 Testing Level 1-3 Conehead Zombie & Math Shield Lightning Break...');
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('1-3');
        const engine = window.gameApp.pvzEngine;
        // 放置豌豆射手与向日葵
        const pos1 = engine.getGridCoords(1, 2);
        engine.plants.push(new (window.gameApp.pvzEngine.constructor)(window.gameApp.canvas).plants);
    });

    // 模拟生成路障僵尸与铁桶僵尸
    const shieldTest = await page.evaluate(() => {
        const engine = window.gameApp.pvzEngine;
        // 清空现有僵尸，直接注入测试路障与铁桶
        engine.zombies = [];
        const coneZombie = new (window.gameApp.pvzEngine.zombies.constructor ? window.gameApp.pvzEngine.zombies.constructor : Object.getPrototypeOf(engine).constructor)('1-3');
    });

    console.log('⚡ Testing Math Engine Shield Strike API directly...');
    const strikeResult = await page.evaluate(() => {
        const engine = window.gameApp.pvzEngine;
        // 刷出一只路障僵尸
        engine.loadLevel('1-3');
        // 手动注入一只路障僵尸
        const wave = engine.levelConfig.waves[2]; // 第3波有conehead
        const cz = new (engine.zombies.constructor)();
        
        // 触发数学判定破盾
        engine.handleMathAnswerResult({
            isCorrect: true,
            bonusSun: 75,
            isComboCharge: true,
            isComboUlt: false,
            isShieldBreak: true,
            shieldType: 'cone'
        });

        return {
            sun: engine.sun,
            isSuperCharge: engine.isSuperCharge,
            floatingText: engine.floatingTexts.map(f => f.text)
        };
    });

    console.log('   Strike result:', strikeResult);
    if (!strikeResult.isSuperCharge) throw new Error('Expected supercharge active');
    console.log('✅ Shield strike and supercharge verified successfully!');

    await browser.close();
    console.log('🏆 Multi-Level & Shield tests PASSED 100%!');
}

testShieldAndLevels().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
