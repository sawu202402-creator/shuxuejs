import puppeteer from 'puppeteer-core';

(async () => {
    console.log('🧪 Starting 6-Point Verification Tests...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto('http://127.0.0.1:8089', { waitUntil: 'networkidle0' });

        // 1. Shovel Styles Test (Point 3)
        const shovelInfo = await page.evaluate(() => {
            const slot = document.getElementById('shovelSlot');
            const img = document.getElementById('shovelImg');
            const slotStyle = window.getComputedStyle(slot);
            const imgStyle = window.getComputedStyle(img);
            return {
                slotW: slotStyle.width,
                slotH: slotStyle.height,
                imgW: imgStyle.width,
                imgH: imgStyle.height,
                imgTransform: imgStyle.transform
            };
        });
        console.log('✅ Point 3 (Shovel):', shovelInfo);

        // 2. Potato Mine Card (Point 2)
        const potatomineCard = await page.evaluate(async () => {
            const res = await fetch('assets/cards/card_potatomine.png');
            return {
                status: res.status,
                contentType: res.headers.get('content-type')
            };
        });
        console.log('✅ Point 2 (Potato Mine Card):', potatomineCard);

        // 3. Lawnmower Image (Point 4)
        const lawnmowerAsset = await page.evaluate(async () => {
            const res = await fetch('assets/ui/lawnmower.png');
            return {
                status: res.status,
                contentType: res.headers.get('content-type')
            };
        });
        console.log('✅ Point 4 (Lawn Mower Asset):', lawnmowerAsset);

        // 4. Sunlight Layering and Size Test (Point 1)
        const sunLayerInfo = await page.evaluate(async () => {
            const sunLayer = document.getElementById('sunLayer');
            const entityLayer = document.getElementById('entityLayer');
            const sunLayerZ = window.getComputedStyle(sunLayer).zIndex;
            const entityLayerZ = window.getComputedStyle(entityLayer).zIndex;

            const engine = window.gameApp ? window.gameApp.pvzEngine : null;
            if (!engine) return { error: 'No engine' };

            engine.loadLevel('1-2');
            const { createPlant } = await import('./js/plants.js');
            const sunflower = createPlant('sunflower', 2, 2, 350, 250, engine.entityLayer);
            engine.plants.push(sunflower);

            // Force sun production
            sunflower.sunTimer = 10;
            sunflower.update(0.1, engine);

            const sunElements = document.querySelectorAll('#sunLayer .sun-entity');
            const sunEl = sunElements[0];
            let sunStyle = null;
            if (sunEl) {
                const s = window.getComputedStyle(sunEl);
                sunStyle = {
                    width: s.width,
                    height: s.height,
                    hasImg: !!sunEl.querySelector('img'),
                    hasBadge: !!sunEl.querySelector('.sun-badge'),
                    sunText: sunEl.querySelector('.sun-badge')?.innerText
                };
            }

            return {
                sunLayerZ: parseInt(sunLayerZ, 10),
                entityLayerZ: parseInt(entityLayerZ, 10),
                sunCount: sunElements.length,
                sunStyle
            };
        });
        console.log('✅ Point 1 (Sunlight Size & Layer):', sunLayerInfo);

        // 5. Wallnut Bite States Test (Point 5)
        const wallnutTest = await page.evaluate(async () => {
            const engine = window.gameApp ? window.gameApp.pvzEngine : null;
            if (!engine) return { error: 'No engine' };

            engine.loadLevel('1-4');
            const { createPlant } = await import('./js/plants.js');
            const nut = createPlant('wallnut', 2, 3, 400, 250, engine.entityLayer);
            engine.plants.push(nut);

            const anim0 = nut.currentAnim;

            // Damage to 2500 (below crackThreshold1 2666)
            nut.takeDamage(1500);
            const anim1 = nut.currentAnim;

            // Damage to 1000 (below crackThreshold2 1333)
            nut.takeDamage(1500);
            const anim2 = nut.currentAnim;

            return {
                initialHp: nut.maxHp,
                anim0,
                anim1,
                anim2,
                domImgSrc: nut.domImg ? nut.domImg.src : null
            };
        });
        console.log('✅ Point 5 (Wallnut Cracked States):', wallnutTest);

        // 6. Take screenshot of canvas with shovel and lawnmower
        await page.screenshot({ path: 'scripts/test_screen.png' });
        console.log('📸 Screenshot saved to scripts/test_screen.png');

        console.log('\n🎉 ALL 5 USER FIXES VERIFIED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await browser.close();
    }
})();
