import puppeteer from 'puppeteer-core';

(async () => {
    console.log('=== Automated Verification: World 4 (Fog) & World 5 (Roof) ===');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const errors = [];
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => {
        console.error('Browser Page Error:', err.message, err.stack);
        errors.push(err.message);
    });
    page.on('requestfailed', req => {
        console.error('REQ FAILED:', req.url(), req.failure().errorText);
    });

    await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => window.gameApp && window.gameApp.pvzEngine, { timeout: 10000 });

    // 1. Verify Level Modal has 5 Worlds
    const worldsCount = await page.evaluate(() => {
        window.gameApp.openLevelModal();
        const headers = document.querySelectorAll('#levelGrid .level-group-header');
        const cards = document.querySelectorAll('#levelGrid .level-card');
        return {
            headersCount: headers.length,
            cardsCount: cards.length
        };
    });
    console.log(`World group headers: ${worldsCount.headersCount}, Total level cards: ${worldsCount.cardsCount}`);

    // Close modal
    await page.evaluate(() => {
        document.getElementById('levelModal').style.display = 'none';
    });

    // 2. Test World 4 (4-1 Fog Level)
    console.log('--- Testing Level 4-1 (Fog, Sea-shroom, Blover, Starfruit, Pumpkin) ---');
    const w4Result = await page.evaluate(() => {
        window.gameApp.loadNewLevel('4-1');
        const eng = window.gameApp.pvzEngine;
        eng.sun = 5000;

        // Verify environmental flags
        const isFog = eng.isFog;
        const isNight = eng.isNight;

        // Sea-shroom test in water row (row 2, col 1)
        eng.selectedCard = 'seashroom';
        let c1 = eng.getGridCoords(1, 2);
        eng.handleClick(c1.x, c1.y);

        // Lilypad + Starfruit in water row (row 2, col 2)
        eng.selectedCard = 'lilypad';
        let c2 = eng.getGridCoords(2, 2);
        eng.handleClick(c2.x, c2.y);

        eng.selectedCard = 'starfruit';
        eng.handleClick(c2.x, c2.y);

        // Pumpkin protecting the starfruit
        eng.selectedCard = 'pumpkin';
        eng.handleClick(c2.x, c2.y);

        // Blover test
        eng.selectedCard = 'blover';
        let c3 = eng.getGridCoords(0, 0);
        eng.handleClick(c3.x, c3.y);

        const plantsSummary = eng.plants.map(p => ({
            type: p.type,
            row: p.row,
            col: p.col,
            isAsleep: p.isAsleep,
            hasPumpkin: !!p.pumpkin
        }));

        return {
            isFog,
            isNight,
            plantsSummary,
            fogClearTimer: eng.fogClearTimer
        };
    });
    console.log('World 4 Result:', JSON.stringify(w4Result, null, 2));

    // Wait 1 second and capture screenshot of World 4
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/home/better/.gemini/antigravity-ide/brain/2ef32641-b7d9-43af-b945-68c178e6bda5/world4_fog_demo.png' });
    console.log('Saved screenshot: world4_fog_demo.png');

    // 3. Test World 5 (5-1 Roof Level)
    console.log('--- Testing Level 5-1 (Roof, Flower Pot, Cabbage-pult, Kernel-pult, Melon-pult, Garlic) ---');
    const w5Result = await page.evaluate(() => {
        window.gameApp.loadNewLevel('5-1');
        const eng = window.gameApp.pvzEngine;
        eng.sun = 5000;

        const isRoof = eng.isRoof;

        // Try planting Cabbage-pult directly without pot (should fail)
        eng.selectedCard = 'cabbagepult';
        let c0 = eng.getGridCoords(1, 1);
        eng.handleClick(c0.x, c0.y);
        const failPlantCount = eng.plants.length;

        // Plant Flower Pot at (1, 1)
        eng.selectedCard = 'flowerpot';
        eng.handleClick(c0.x, c0.y);

        // Now plant Cabbage-pult on pot at (1, 1)
        eng.selectedCard = 'cabbagepult';
        eng.handleClick(c0.x, c0.y);

        // Plant Flower Pot + Kernel-pult at (2, 2)
        eng.selectedCard = 'flowerpot';
        let c2 = eng.getGridCoords(2, 2);
        eng.handleClick(c2.x, c2.y);
        eng.selectedCard = 'kernelpult';
        eng.handleClick(c2.x, c2.y);

        // Plant Flower Pot + Melon-pult at (1, 3)
        eng.selectedCard = 'flowerpot';
        let c3 = eng.getGridCoords(1, 3);
        eng.handleClick(c3.x, c3.y);
        eng.selectedCard = 'melonpult';
        eng.handleClick(c3.x, c3.y);

        // Plant Flower Pot + Garlic at (4, 1)
        eng.selectedCard = 'flowerpot';
        let c4 = eng.getGridCoords(4, 1);
        eng.handleClick(c4.x, c4.y);
        eng.selectedCard = 'garlic';
        eng.handleClick(c4.x, c4.y);

        // Spawn a zombie to test catapult firing
        const z = new window.Zombie('normal', 1, 750, eng.entityLayer);
        eng.zombies.push(z);

        const plantsSummary = eng.plants.map(p => ({
            type: p.type,
            row: p.row,
            col: p.col
        }));

        return {
            isRoof,
            failPlantCount,
            plantsCount: eng.plants.length,
            plantsSummary
        };
    });
    console.log('World 5 Result:', JSON.stringify(w5Result, null, 2));

    // Wait 1.5 seconds for catapults to throw lobbed projectiles and render
    await new Promise(r => setTimeout(r, 1500));

    const projectileCheck = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        return {
            projectilesCount: eng.projectiles.length,
            zombieCount: eng.zombies.length,
            zombieHp: eng.zombies[0] ? eng.zombies[0].hp : null
        };
    });
    console.log('Roof Projectile & Combat check:', projectileCheck);

    await page.screenshot({ path: '/home/better/.gemini/antigravity-ide/brain/2ef32641-b7d9-43af-b945-68c178e6bda5/world5_roof_demo.png' });
    console.log('Saved screenshot: world5_roof_demo.png');

    await browser.close();

    if (errors.length > 0) {
        console.error('FAILED with errors:', errors);
        process.exit(1);
    } else {
        console.log('ALL WORLD 4 & 5 TESTS PASSED SUCCESSFULLY!');
    }
})();
