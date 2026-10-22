const puppeteer = require('puppeteer-core');

(async () => {
    console.log('--- Starting Wall-nut Bowling Puppeteer Test ---');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1200,800']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('[BROWSER ERROR]', msg.text());
            errors.push(msg.text());
        } else {
            console.log('[BROWSER LOG]', msg.text());
        }
    });
    page.on('pageerror', err => {
        console.error('[PAGE ERROR]', err.message);
        errors.push(err.message);
    });

    await page.goto('http://127.0.0.1:8089', { waitUntil: 'networkidle2' });

    // Wait until engine is ready
    await page.waitForFunction(() => {
        const overlay = document.getElementById('loadingOverlay');
        return overlay && overlay.style.display === 'none' && window.pvzGame && window.gameApp;
    }, { timeout: 15000 });

    console.log('1. Loading Level 1-5: Wall-nut Bowling...');
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('1-5');
    });
    await new Promise(r => setTimeout(r, 600));

    const state1 = await page.evaluate(() => {
        return {
            isBowling: window.pvzGame.isBowling,
            isConveyorBelt: window.pvzGame.levelConfig.isConveyorBelt,
            conveyorCards: window.pvzGame.conveyorBelt,
            domCardsCount: document.querySelectorAll('.plant-card').length,
            sunValText: document.getElementById('sunVal').innerText
        };
    });
    console.log('Level 1-5 initial state:', state1);
    await page.screenshot({ path: 'scripts/bowling_level_start.png' });

    console.log('2. Testing Red Line boundary check (Attempt to click on column 5)...');
    const blockedCheck = await page.evaluate(() => {
        window.pvzGame.selectedCard = 'bowling_nut';
        const coords = window.pvzGame.getGridCoords(5, 2);
        window.pvzGame.handleClick(coords.x, coords.y);
        const lastFloating = window.pvzGame.floatingTexts.slice(-1)[0];
        return {
            bowlingNutsCount: window.pvzGame.bowlingNuts.length,
            floatingText: lastFloating ? lastFloating.text : null
        };
    });
    console.log('Click on right of red line blocked result:', blockedCheck);

    console.log('3. Spawning zombies and launching Regular Bowling Wall-nut on row 2 col 1...');
    await page.evaluate(() => {
        // Spawn 2 zombies in row 2
        const z1 = new window.Zombie('normal', 2, 500, window.pvzGame.entityLayer);
        const z2 = new window.Zombie('conehead', 2, 700, window.pvzGame.entityLayer);
        window.pvzGame.zombies.push(z1, z2);

        // Select and launch bowling nut on row 2, col 1 (to the left of red line)
        window.pvzGame.selectedCard = 'bowling_nut';
        const coords = window.pvzGame.getGridCoords(1, 2);
        window.pvzGame.handleClick(coords.x, coords.y);
    });

    // Wait 0.8s for rolling and collision
    await new Promise(r => setTimeout(r, 800));

    const rollStatus = await page.evaluate(() => {
        const nut = window.pvzGame.bowlingNuts[0];
        return {
            nutsCount: window.pvzGame.bowlingNuts.length,
            nutX: nut ? Math.round(nut.x) : null,
            nutY: nut ? Math.round(nut.y) : null,
            nutRow: nut ? nut.row : null,
            nutTargetRow: nut ? nut.targetRow : null,
            nutVy: nut ? nut.vy : null
        };
    });
    console.log('Bowling nut rolling & bouncing status:', rollStatus);
    await page.screenshot({ path: 'scripts/bowling_rolling_ricochet.png' });

    console.log('4. Launching Red Exploding Wall-nut...');
    await page.evaluate(() => {
        // Spawn zombie group in row 3
        const z3 = new window.Zombie('buckethead', 3, 520, window.pvzGame.entityLayer);
        const z4 = new window.Zombie('conehead', 3, 560, window.pvzGame.entityLayer);
        window.pvzGame.zombies.push(z3, z4);

        window.pvzGame.selectedCard = 'bowling_rednut';
        const coords = window.pvzGame.getGridCoords(1, 3);
        window.pvzGame.handleClick(coords.x, coords.y);
    });

    await new Promise(r => setTimeout(r, 700));

    const redNutStatus = await page.evaluate(() => {
        const hasExplosion = window.pvzGame.explosions.length > 0;
        const charredZombies = document.querySelectorAll('.charred-die').length;
        return {
            hasExplosion,
            charredZombies
        };
    });
    console.log('Red exploding nut impact status:', redNutStatus);
    await page.screenshot({ path: 'scripts/bowling_rednut_boom.png' });

    console.log('5. Testing math reward for conveyor belt delivery...');
    await page.evaluate(() => {
        // Simulate correct math answer
        window.gameApp.handleKeyInput('clear');
        const q = window.gameApp.mathEngine.currentQuestion;
        const expected = q.answer.toString();
        for (let ch of expected) {
            window.gameApp.handleKeyInput(ch);
        }
        window.gameApp.submitCurrentAnswer();
    });
    await new Promise(r => setTimeout(r, 300));

    const conveyorAfterMath = await page.evaluate(() => {
        return {
            conveyorCards: window.pvzGame.conveyorBelt,
            domCards: document.querySelectorAll('.plant-card').length
        };
    });
    console.log('Conveyor cards after solving math question:', conveyorAfterMath);

    await browser.close();
    console.log('--- Wall-nut Bowling Verification Completed ---');
    console.log('Total Browser Errors:', errors.length);
})();
