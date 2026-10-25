import puppeteer from 'puppeteer-core';

async function testFit() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const viewports = [
        { name: 'iPad (1024x768)', width: 1024, height: 768 },
        { name: 'iPad 10.2 (1080x810)', width: 1080, height: 810 },
        { name: 'iPad Air (1180x820)', width: 1180, height: 820 },
        { name: 'iPad Pro 11 (1194x834)', width: 1194, height: 834 },
        { name: 'iPad Pro 12.9 (1366x1024)', width: 1366, height: 1024 },
        { name: 'Laptop (1366x768)', width: 1366, height: 768 },
        { name: 'Desktop (1920x1080)', width: 1920, height: 1080 }
    ];

    for (const vp of viewports) {
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto('http://127.0.0.1:8089/', { waitUntil: 'networkidle0' });

        await page.waitForFunction(() => {
            const overlay = document.getElementById('loadingOverlay');
            return !overlay || overlay.style.display === 'none';
        });

        // 注入新版 fitToScreen 逻辑
        const result = await page.evaluate(() => {
            const app = document.getElementById('game-app');
            const baseW = 1250;
            const baseH = 760;
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            const padX = 16;
            const padY = 16;
            const availW = Math.max(320, winW - padX);
            const availH = Math.max(320, winH - padY);

            const scaleX = availW / baseW;
            const scaleY = availH / baseH;
            const scale = Math.min(scaleX, scaleY, 1);

            if (scale < 0.995) {
                app.style.transformOrigin = 'top center';
                app.style.transform = `scale(${scale})`;
                app.style.width = `${baseW}px`;
                app.style.maxWidth = 'none';

                const scaledH = Math.ceil(baseH * scale);
                const topMargin = Math.max(0, Math.floor((winH - scaledH) / 2));
                document.body.style.overflow = 'hidden';
                document.body.style.paddingTop = `${topMargin}px`;
                document.body.style.paddingBottom = '0px';
                document.body.style.paddingLeft = '0px';
                document.body.style.paddingRight = '0px';
            } else {
                app.style.transformOrigin = 'top center';
                app.style.transform = '';
                app.style.width = '100%';
                app.style.maxWidth = '1250px';
                document.body.style.overflow = '';
                document.body.style.padding = '8px 12px';
            }

            const chalk = document.querySelector('.chalkboard-card');
            const chalkRect = chalk.getBoundingClientRect();
            const appRect = app.getBoundingClientRect();

            return {
                scale: scale.toFixed(3),
                winW,
                winH,
                appRect: { left: Math.round(appRect.left), right: Math.round(appRect.right), top: Math.round(appRect.top), bottom: Math.round(appRect.bottom) },
                chalkRect: { left: Math.round(chalkRect.left), right: Math.round(chalkRect.right), top: Math.round(chalkRect.top), bottom: Math.round(chalkRect.bottom) },
                overflowX: chalkRect.right > winW || appRect.left < 0,
                overflowY: appRect.bottom > winH
            };
        });

        console.log(`\n=== Viewport: ${vp.name} ===`);
        console.log(`Scale applied: ${result.scale}`);
        console.log(`Window: ${result.winW}x${result.winH}`);
        console.log(`App rect: left=${result.appRect.left}, right=${result.appRect.right}, top=${result.appRect.top}, bottom=${result.appRect.bottom}`);
        console.log(`Chalkboard rect: left=${result.chalkRect.left}, right=${result.chalkRect.right}, top=${result.chalkRect.top}, bottom=${result.chalkRect.bottom}`);
        console.log(`Overflow X: ${result.overflowX ? '❌ YES' : '✅ NO'}`);
        console.log(`Overflow Y: ${result.overflowY ? '❌ YES' : '✅ NO'}`);

        // 交互验证
        await page.click('.plant-card:first-child');
        const canvas = await page.$('#battleCanvas');
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);

        const plantCount = await page.evaluate(() => window.gameApp.pvzEngine.plants.length);
        const btn9 = await page.$('.cookie-key:nth-child(9)');
        await btn9.click();
        const inputVal = await page.evaluate(() => document.getElementById('answerInput').value);

        if (plantCount === 1 && inputVal === '9') {
            console.log('✅ Planting & Calculator click: 100% OK!');
        } else {
            console.error('❌ Interaction failed:', { plantCount, inputVal });
        }

        await page.close();
    }

    await browser.close();
}

testFit().catch(console.error);
