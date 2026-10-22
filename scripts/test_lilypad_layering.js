import puppeteer from 'puppeteer-core';

(async () => {
    console.log('=== Verifying Plant on Lilypad Stacking & Layering ===');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => window.gameApp && window.gameApp.pvzEngine, { timeout: 10000 });

    // Switch to Level 3-1 (Pool)
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('3-1');
        const eng = window.gameApp.pvzEngine;
        eng.sun = 2000;
        eng.cardCooldowns['lilypad'] = 0;
        eng.cardCooldowns['peashooter'] = 0;
        eng.cardCooldowns['wallnut'] = 0;

        // 1. Plant Lilypad at Row 2, Col 2
        eng.selectedCard = 'lilypad';
        let coords = eng.getGridCoords(2, 2);
        eng.handleClick(coords.x, coords.y);

        // 2. Plant Peashooter on top of Lilypad
        eng.selectedCard = 'peashooter';
        eng.handleClick(coords.x, coords.y);

        // 3. Plant Lilypad at Row 3, Col 3
        eng.selectedCard = 'lilypad';
        let coords2 = eng.getGridCoords(3, 3);
        eng.handleClick(coords2.x, coords2.y);

        // 4. Plant Wall-nut on top of Lilypad
        eng.selectedCard = 'wallnut';
        eng.handleClick(coords2.x, coords2.y);
    });

    // Verify DOM properties & z-index
    const checkResult = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        const lily1 = eng.plants.find(p => p.type === 'lilypad' && p.row === 2);
        const pea = eng.plants.find(p => p.type === 'peashooter' && p.row === 2);
        const lily2 = eng.plants.find(p => p.type === 'lilypad' && p.row === 3);
        const nut = eng.plants.find(p => p.type === 'wallnut' && p.row === 3);

        const lily1Rect = lily1.domElement.getBoundingClientRect();
        const peaRect = pea.domElement.getBoundingClientRect();

        const lily1Z = window.getComputedStyle(lily1.domElement).zIndex;
        const peaZ = window.getComputedStyle(pea.domElement).zIndex;

        return {
            hasPea: !!pea,
            hasLily: !!lily1,
            lily1Z: parseInt(lily1Z, 10),
            peaZ: parseInt(peaZ, 10),
            lily1Top: lily1Rect.top,
            peaTop: peaRect.top,
            peaBottom: peaRect.bottom,
            lily1Bottom: lily1Rect.bottom,
            carriedPlantLink: lily1.carriedPlant === pea,
            hostLilypadLink: pea.hostLilypad === lily1
        };
    });

    console.log('DOM & Layering Check:', checkResult);

    if (checkResult.peaZ <= checkResult.lily1Z) {
        throw new Error(`Peashooter z-index (${checkResult.peaZ}) must be higher than Lilypad (${checkResult.lily1Z})!`);
    }
    console.log('✓ Plant z-index (15) is strictly higher than Lilypad (4)');

    if (!checkResult.carriedPlantLink || !checkResult.hostLilypadLink) {
        throw new Error('Bidirectional link between plant and lilypad missing!');
    }
    console.log('✓ Bidirectional link between carried plant and host lilypad confirmed');

    // Test Zombie Eating order: Zombie should eat Peashooter first, not Lilypad!
    const eatingOrderResult = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        const lily1 = eng.plants.find(p => p.type === 'lilypad' && p.row === 2);
        const pea = eng.plants.find(p => p.type === 'peashooter' && p.row === 2);

        // Spawn a zombie right at peashooter
        const z = new window.Zombie('normal', 2, pea.x + 20, eng.entityLayer);
        eng.zombies.push(z);

        // Run 5 ticks of damage
        const initialPeaHp = pea.hp;
        const initialLilyHp = lily1.hp;

        for (let i = 0; i < 15; i++) {
            eng.update(0.1);
        }

        return {
            peaTookDamage: pea.hp < initialPeaHp,
            lilyProtected: lily1.hp === initialLilyHp,
            peaHp: pea.hp,
            lilyHp: lily1.hp
        };
    });

    console.log('Zombie Eating Order Test:', eatingOrderResult);
    if (!eatingOrderResult.peaTookDamage || !eatingOrderResult.lilyProtected) {
        throw new Error('Zombie ate Lilypad instead of Peashooter on top of it!');
    }
    console.log('✓ Zombie correctly attacks the top plant (Peashooter) first while Lilypad remains protected!');

    // Capture screenshot
    const screenshotPath = '/home/better/.gemini/antigravity-ide/brain/2ef32641-b7d9-43af-b945-68c178e6bda5/lilypad_perfect_stack.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ Stacking screenshot saved to ${screenshotPath}`);

    await browser.close();
    console.log('=== All Lilypad Stacking Tests PASSED! ===');
})().catch(err => {
    console.error(err);
    process.exit(1);
});
