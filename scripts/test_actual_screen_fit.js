import puppeteer from 'puppeteer-core';

async function testActualFit() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const viewports = [
        { name: 'iPad (1024x768)', width: 1024, height: 768, screenshot: true },
        { name: 'iPad 10.2 (1080x810)', width: 1080, height: 810 },
        { name: 'iPad Air (1180x820)', width: 1180, height: 820 },
        { name: 'iPad Pro 11 (1194x834)', width: 1194, height: 834 },
        { name: 'iPad Pro 12.9 (1366x1024)', width: 1366, height: 1024 },
        { name: 'Laptop (1366x768)', width: 1366, height: 768 },
        { name: 'Desktop (1920x1080)', width: 1920, height: 1080 }
    ];

    let allPassed = true;

    for (const vp of viewports) {
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto('http://127.0.0.1:8089/', { waitUntil: 'networkidle0' });

        await page.waitForFunction(() => {
            const overlay = document.getElementById('loadingOverlay');
            return !overlay || overlay.style.display === 'none';
        });

        // 稍作等待确保动画和布局稳定
        await new Promise(r => setTimeout(r, 200));

        const result = await page.evaluate(() => {
            const app = document.getElementById('game-app');
            const chalk = document.querySelector('.chalkboard-card');
            const chalkRect = chalk.getBoundingClientRect();
            const appRect = app.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            return {
                winW,
                winH,
                appRect: { left: Math.round(appRect.left), right: Math.round(appRect.right), top: Math.round(appRect.top), bottom: Math.round(appRect.bottom) },
                chalkRect: { left: Math.round(chalkRect.left), right: Math.round(chalkRect.right), top: Math.round(chalkRect.top), bottom: Math.round(chalkRect.bottom) },
                overflowX: chalkRect.right > winW || appRect.left < 0,
                overflowY: appRect.bottom > winH
            };
        });

        console.log(`\n=== Actual Run: ${vp.name} ===`);
        console.log(`Window: ${result.winW}x${result.winH}`);
        console.log(`App rect: left=${result.appRect.left}, right=${result.appRect.right}, top=${result.appRect.top}, bottom=${result.appRect.bottom}`);
        console.log(`Chalkboard rect: left=${result.chalkRect.left}, right=${result.chalkRect.right}, top=${result.chalkRect.top}, bottom=${result.chalkRect.bottom}`);
        console.log(`Overflow X (Horizontal cutoff): ${result.overflowX ? '❌ FAILED' : '✅ PASSED'}`);
        console.log(`Overflow Y (Vertical cutoff): ${result.overflowY ? '❌ FAILED' : '✅ PASSED'}`);

        if (result.overflowX || result.overflowY) {
            allPassed = false;
        }

        // 交互验证：选中卡片并在草坪种植
        await page.click('.plant-card:first-child');
        const canvas = await page.$('#battleCanvas');
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);

        const plantCount = await page.evaluate(() => window.gameApp.pvzEngine.plants.length);
        const btn5 = await page.$('.cookie-key:nth-child(5)');
        await btn5.click();
        const inputVal = await page.evaluate(() => document.getElementById('answerInput').value);

        if (plantCount === 1 && inputVal === '5') {
            console.log('✅ Planting & Calculator key 5: 100% OK!');
        } else {
            console.error('❌ Interaction failed:', { plantCount, inputVal });
            allPassed = false;
        }

        if (vp.screenshot) {
            await page.screenshot({ path: '/home/better/.gemini/antigravity-ide/brain/2ef32641-b7d9-43af-b945-68c178e6bda5/ipad_actual_screen.png' });
            console.log('📸 Screenshot saved: ipad_actual_screen.png');
        }

        await page.close();
    }

    await browser.close();

    if (allPassed) {
        console.log('\n🎉 ALL VIEWPORTS AND INTERACTIONS PASSED PERFECTLY!');
    } else {
        console.error('\n❌ SOME CHECKS FAILED!');
        process.exit(1);
    }
}

testActualFit().catch(console.error);
