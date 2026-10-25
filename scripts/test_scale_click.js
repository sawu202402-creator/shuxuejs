import puppeteer from 'puppeteer-core';

async function testClicking() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto('http://127.0.0.1:8089/', { waitUntil: 'networkidle0' });

    // 等待遮罩消失
    await page.waitForFunction(() => {
        const overlay = document.getElementById('loadingOverlay');
        return !overlay || overlay.style.display === 'none';
    });

    // 应用自适应缩放
    await page.evaluate(() => {
        const app = document.getElementById('game-app');
        const baseW = 1260;
        const baseH = 720;
        const availW = window.innerWidth - 16;
        const availH = window.innerHeight - 12;
        const scale = Math.min(availW / baseW, availH / baseH, 1);

        app.style.transformOrigin = 'top center';
        app.style.transform = `scale(${scale})`;
        app.style.width = `${baseW}px`;
        app.style.maxWidth = 'none';

        const chalk = document.querySelector('.chalkboard-card');
        chalk.style.width = '320px';
    });

    // 选中第一张植物卡牌 (豌豆射手)
    await page.waitForSelector('.plant-card');
    await page.click('.plant-card:first-child');
    console.log('Selected card successfully.');

    // 点击画布第二行第二列
    const canvas = await page.$('#battleCanvas');
    const box = await canvas.boundingBox();
    console.log('Canvas bounding box on 1024x768:', box);

    // 点击 (row 2, col 2)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);

    // 检查植物是否已种植
    const plantCount = await page.evaluate(() => {
        return window.gameApp.pvzEngine.plants.length;
    });
    console.log('Plants count after click:', plantCount);

    // 测试计算器按键 '7'
    const btn7 = await page.$('.cookie-key');
    await btn7.click();
    const inputVal = await page.evaluate(() => document.getElementById('answerInput').value);
    console.log('Calculator input after click 7:', inputVal);

    await browser.close();
    if (plantCount === 1 && inputVal === '7') {
        console.log('✅ Click accuracy verified under scale!');
    } else {
        console.error('❌ Mismatch in click or plant:', { plantCount, inputVal });
        process.exit(1);
    }
}
testClicking().catch(console.error);
