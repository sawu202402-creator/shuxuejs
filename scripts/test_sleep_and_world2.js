import puppeteer from 'puppeteer-core';

(async () => {
    console.log('--- Testing Canonical PVZ1 Sleeping Mechanics & World 2 Plants ---');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });

    await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => window.gameApp && window.gameApp.pvzEngine, { timeout: 10000 });
    console.log('✓ Game initialized');

    // 1. Switch to Level 2-1: verify initialSun=50, Puff-shroom unlocked, and regular plants do NOT sleep at night!
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('2-1');
    });

    const nightInfo = await page.evaluate(() => {
        const engine = window.gameApp.pvzEngine;
        const cards = Array.from(document.querySelectorAll('.plant-card')).map(c => ({
            id: c.getAttribute('data-id'),
            hasSleepBadge: !!c.querySelector('.card-sleep-badge')
        }));

        engine.sun = 500;
        engine.selectedCard = 'sunflower';
        const grid = engine.getGridCoords(2, 2);
        engine.handleClick(grid.x, grid.y);
        const sf = engine.plants.find(p => p.row === 2 && p.col === 2);

        engine.selectedCard = 'puffshroom';
        const grid2 = engine.getGridCoords(2, 1);
        engine.handleClick(grid2.x, grid2.y);
        const puff = engine.plants.find(p => p.row === 1 && p.col === 2);

        return {
            cards,
            sunflowerAsleepAtNight: sf ? sf.isAsleep : null,
            puffAsleepAtNight: puff ? puff.isAsleep : null
        };
    });

    if (!nightInfo.cards.some(c => c.id === 'puffshroom')) {
        throw new Error('2-1 missing puffshroom!');
    }
    if (nightInfo.cards.some(c => c.hasSleepBadge)) {
        throw new Error('No plant should have sleep badge in Night level 2-1!');
    }
    if (nightInfo.sunflowerAsleepAtNight !== false || nightInfo.puffAsleepAtNight !== false) {
        throw new Error('Both Sunflower and Puff-shroom must stay awake at night!');
    }
    console.log('✓ Regular plants & mushrooms stay awake at night (canonical PVZ1)');

    // 2. Switch to Day level (3-1 Pool Day) with custom deck including nocturnal mushrooms + Coffee Bean
    const dayWakeCheck = await page.evaluate(() => {
        window.gameApp.loadNewLevel('3-1');
        const engine = window.gameApp.pvzEngine;
        engine.setCustomDeck(['puffshroom', 'fumeshroom', 'hypnoshroom', 'coffeebean', 'lilypad', 'sunflower', 'peashooter', 'wallnut']);

        const puffCard = document.querySelector('.plant-card[data-id="puffshroom"]');
        const sfCard = document.querySelector('.plant-card[data-id="sunflower"]');
        const puffCardHasBadge = !!puffCard?.querySelector('.card-sleep-badge');
        const sfCardHasBadge = !!sfCard?.querySelector('.card-sleep-badge');

        engine.sun = 500;
        engine.selectedCard = 'fumeshroom';
        const pos = engine.getGridCoords(1, 0); // land row 0
        engine.handleClick(pos.x, pos.y);
        const fume = engine.plants.find(p => p.type === 'fumeshroom' && p.row === 0 && p.col === 1);
        const asleepBeforeBean = fume ? fume.isAsleep : null;
        const hasZzzBefore = !!fume?.domElement?.querySelector('.plant-zzz-bubble');

        // Wake up with Coffee Bean!
        engine.selectedCard = 'coffeebean';
        engine.handleClick(pos.x, pos.y);
        for (let i = 0; i < 30; i++) engine.update(0.033);

        return {
            puffCardHasBadge,
            sfCardHasBadge,
            asleepBeforeBean,
            hasZzzBefore,
            asleepAfterBean: fume ? fume.isAsleep : null,
            hasZzzAfter: !!fume?.domElement?.querySelector('.plant-zzz-bubble')
        };
    });

    console.log('Daytime mushroom sleep & Coffee Bean wakeup:', dayWakeCheck);
    if (!dayWakeCheck.puffCardHasBadge || dayWakeCheck.sfCardHasBadge) {
        throw new Error('Only nocturnal mushrooms should show sleep badge in daytime!');
    }
    if (!dayWakeCheck.asleepBeforeBean || !dayWakeCheck.hasZzzBefore) {
        throw new Error('Fume-shroom planted in daytime should be asleep with Zzz bubble!');
    }
    if (dayWakeCheck.asleepAfterBean !== false || dayWakeCheck.hasZzzAfter) {
        throw new Error('Coffee Bean failed to wake up daytime sleeping mushroom!');
    }
    console.log('✓ Daytime nocturnal mushroom sleep + Coffee Bean wakeup verified!');

    if (errors.length > 0) {
        throw new Error('Console errors detected: ' + errors.join('; '));
    }

    await browser.close();
    console.log('\n>>> ALL CANONICAL SLEEP & WORLD 2 CHECKS PASSED! <<<');
})().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
