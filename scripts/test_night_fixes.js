const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log('--- Starting Night Fixes Puppeteer Verification ---');
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
    console.log('Page loaded, waiting for loading overlay to vanish...');

    // Wait until loading overlay is gone and engine is initialized
    await page.waitForFunction(() => {
        const overlay = document.getElementById('loadingOverlay');
        return overlay && overlay.style.display === 'none' && window.pvzGame;
    }, { timeout: 15000 });

    console.log('Engine ready! Testing 1: Wave Banner styling...');
    // Trigger wave banner
    await page.evaluate(() => {
        window.pvzGame.flagWaveBannerTimer = 3.0;
        window.pvzGame.flagWaveText = '🧟 一大波僵尸正在逼近！';
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: 'scripts/night_huge_wave_banner_demo.png' });
    console.log('Wave banner screenshot saved: scripts/night_huge_wave_banner_demo.png');

    console.log('Testing 2: Load Night Level 2-4 (Tombstones & Grave Buster)...');
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('2-4');
        window.pvzGame.sun = 500;
    });
    await new Promise(r => setTimeout(r, 600));

    // Verify Grave Buster card exists
    const busterCardExists = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.plant-card'));
        return cards.some(c => c.getAttribute('data-id') === 'gravebuster');
    });
    console.log('Grave Buster card exists in Level 2-4:', busterCardExists);

    // Find first tombstone and plant Grave Buster on it
    const plantResult = await page.evaluate(() => {
        const tomb = window.pvzGame.tombstones[0];
        if (!tomb) return { success: false, reason: 'No tombstones' };
        window.pvzGame.selectedCard = 'gravebuster';
        // Simulate click on cell with (x, y)
        const coords = window.pvzGame.getGridCoords(tomb.col, tomb.row);
        window.pvzGame.handleClick(coords.x, coords.y);
        const plant = window.pvzGame.plants.find(p => p.type === 'gravebuster');
        return {
            success: !!plant,
            plantRow: plant ? plant.row : null,
            plantCol: plant ? plant.col : null
        };
    });
    console.log('Grave Buster planting result:', plantResult);

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'scripts/night_gravebuster_demo.png' });
    console.log('Grave buster screenshot saved: scripts/night_gravebuster_demo.png');

    console.log('Testing 3: Puff-shroom projectile spawn alignment & Zombie head badge check...');
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('2-1');
        window.pvzGame.sun = 500;
        // Plant Puff-shroom at row 2, col 2
        window.pvzGame.selectedCard = 'puffshroom';
        const coords = window.pvzGame.getGridCoords(2, 2);
        window.pvzGame.handleClick(coords.x, coords.y);
        // Spawn a zombie at row 2, col 5
        const z = new window.Zombie('conehead', 2, 550, window.pvzGame.entityLayer);
        window.pvzGame.zombies.push(z);
    });
    await new Promise(r => setTimeout(r, 1200));

    // Check if any circular shield badge exists in DOM
    const badgeCount = await page.evaluate(() => {
        return document.querySelectorAll('.shield-badge').length;
    });
    console.log('Circular shield badge DOM count (should be 0):', badgeCount);

    await page.screenshot({ path: 'scripts/night_puffshroom_demo.png' });
    console.log('Puff-shroom demo screenshot saved: scripts/night_puffshroom_demo.png');

    console.log('Testing 4: Doom-shroom explosion, charred zombie death & crater...');
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('2-8');
        window.pvzGame.sun = 1000;
        // Spawn 3 zombies
        const z1 = new window.Zombie('normal', 2, 450, window.pvzGame.entityLayer);
        const z2 = new window.Zombie('conehead', 2, 500, window.pvzGame.entityLayer);
        const z3 = new window.Zombie('buckethead', 3, 460, window.pvzGame.entityLayer);
        window.pvzGame.zombies.push(z1, z2, z3);

        // Plant Doom-shroom at row 2, col 3
        window.pvzGame.selectedCard = 'doomshroom';
        const coords = window.pvzGame.getGridCoords(3, 2);
        window.pvzGame.handleClick(coords.x, coords.y);
    });

    // Wait for fuse (0.8s) + boom
    await new Promise(r => setTimeout(r, 1200));

    const doomStatus = await page.evaluate(() => {
        const craters = window.pvzGame.craters || [];
        const hasDoomExplosion = window.pvzGame.explosions.some(e => e.type === 'doom');
        const charredZombies = Array.from(document.querySelectorAll('.charred-die')).length;
        return {
            cratersCount: craters.length,
            hasDoomExplosion,
            charredZombies
        };
    });
    console.log('Doom-shroom detonation status:', doomStatus);

    await page.screenshot({ path: 'scripts/night_doom_blast_crater_demo.png' });
    console.log('Doom-shroom explosion & charred demo screenshot saved.');

    // Test planting on crater (should be rejected)
    const plantOnCraterResult = await page.evaluate(() => {
        window.pvzGame.selectedCard = 'puffshroom';
        const coords = window.pvzGame.getGridCoords(3, 2);
        window.pvzGame.handleClick(coords.x, coords.y);
        const plantAtCrater = window.pvzGame.plants.find(p => p.row === 2 && p.col === 3);
        return {
            plantPlaced: !!plantAtCrater,
            floatingText: window.pvzGame.floatingTexts.slice(-1)[0]?.text
        };
    });
    console.log('Planting on crater result (should be blocked):', plantOnCraterResult);

    await browser.close();
    console.log('--- Night Fixes Verification Completed ---');
    console.log('Total Browser Errors:', errors.length);
})();
