import puppeteer from 'puppeteer-core';

(async () => {
    console.log('--- Testing Sleeping Mechanics & World 2 Plants ---');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    let errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });

    await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle2' });

    // Wait for game to initialize
    await page.waitForFunction(() => window.gameApp && window.gameApp.pvzEngine, { timeout: 10000 });
    console.log('✓ Game initialized');

    // Switch to Level 2-1
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('2-1');
    });
    console.log('✓ Switched to Level 2-1');

    // Check level cards
    const cardsInfo = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.plant-card'));
        return cards.map(c => ({
            id: c.getAttribute('data-id'),
            hasSleepBadge: !!c.querySelector('.card-sleep-badge'),
            hasSleepClass: c.classList.contains('plant-card-sleep')
        }));
    });
    console.log('Cards in 2-1:', cardsInfo);

    // Verify 2-1 card list contains puffshroom and sunshroom
    const hasPuff = cardsInfo.some(c => c.id === 'puffshroom');
    const hasSunShroom = cardsInfo.some(c => c.id === 'sunshroom');
    const hasCoffee = cardsInfo.some(c => c.id === 'coffeebean');
    if (!hasPuff || !hasSunShroom || !hasCoffee) {
        throw new Error('World 2-1 missing essential mushroom/coffee cards!');
    }
    console.log('✓ Puff-shroom, Sun-shroom and Coffee Bean are present in 2-1 card bank');

    // Verify diurnal plants (sunflower, peashooter) have sleep badges in 2-1
    const sunflowerCard = cardsInfo.find(c => c.id === 'sunflower');
    const peashooterCard = cardsInfo.find(c => c.id === 'peashooter');
    const puffCard = cardsInfo.find(c => c.id === 'puffshroom');

    if (!sunflowerCard.hasSleepBadge || !peashooterCard.hasSleepBadge) {
        throw new Error('Diurnal plants should have sleep badge in night level 2-1!');
    }
    if (puffCard.hasSleepBadge) {
        throw new Error('Puff-shroom should NOT have sleep badge in night level 2-1!');
    }
    console.log('✓ Daytime plants correctly flagged as sleeping in Night 2-1');

    // Give 200 sun and plant a Sunflower in (row 2, col 2)
    const plantResult = await page.evaluate(() => {
        const engine = window.gameApp.pvzEngine;
        engine.sun = 500;
        engine.selectedCard = 'sunflower';
        // Click row 2, col 2
        const grid = engine.getGridCoords(2, 2);
        engine.handleClick(grid.x, grid.y);

        const plant = engine.plants.find(p => p.row === 2 && p.col === 2);
        return {
            planted: !!plant,
            type: plant ? plant.type : null,
            isAsleep: plant ? plant.isAsleep : false,
            hasDOMElement: !!plant?.domElement,
            hasSleepClass: plant?.domElement?.classList.contains('is-asleep'),
            hasZzzBubble: !!plant?.domElement?.querySelector('.plant-zzz-bubble')
        };
    });
    console.log('Planted Sunflower state:', plantResult);
    if (!plantResult.isAsleep || !plantResult.hasSleepClass || !plantResult.hasZzzBubble) {
        throw new Error('Sunflower planted at night should be asleep with Zzz bubble!');
    }
    console.log('✓ Sunflower is asleep with floating Zzz bubble on lawn');

    // Now test Coffee Bean waking up the Sunflower!
    const wakeResult = await page.evaluate(async () => {
        const engine = window.gameApp.pvzEngine;
        engine.sun = 500;
        engine.selectedCard = 'coffeebean';
        const grid = engine.getGridCoords(2, 2);
        engine.handleClick(grid.x, grid.y);

        // Update engine 1.2 second to let coffee bean wake sunflower
        for (let i = 0; i < 40; i++) {
            engine.update(0.033);
        }

        const plant = engine.plants.find(p => p.type === 'sunflower' && p.row === 2 && p.col === 2);
        return {
            isAsleep: plant ? plant.isAsleep : null,
            hasSleepClass: plant?.domElement?.classList.contains('is-asleep'),
            hasZzzBubble: !!plant?.domElement?.querySelector('.plant-zzz-bubble')
        };
    });
    console.log('After Coffee Bean:', wakeResult);
    if (wakeResult.isAsleep !== false || wakeResult.hasSleepClass || wakeResult.hasZzzBubble) {
        throw new Error('Sunflower should be awakened by Coffee Bean!');
    }
    console.log('✓ Coffee Bean successfully woke up the Sunflower!');

    // Now plant Puff-shroom (0 sun) in (row 1, col 2)
    const puffPlantResult = await page.evaluate(() => {
        const engine = window.gameApp.pvzEngine;
        engine.selectedCard = 'puffshroom';
        const grid = engine.getGridCoords(2, 1);
        engine.handleClick(grid.x, grid.y);

        const plant = engine.plants.find(p => p.row === 1 && p.col === 2);
        return {
            planted: !!plant,
            type: plant ? plant.type : null,
            isAsleep: plant ? plant.isAsleep : false
        };
    });
    console.log('Puff-shroom plant result in 2-1:', puffPlantResult);
    if (puffPlantResult.isAsleep) {
        throw new Error('Puff-shroom should be active/awake in Night!');
    }
    console.log('✓ Puff-shroom is active and awake in Night!');

    // Now switch to Day level (1-1) and test that Puff-shroom sleeps in Day!
    const dayResult = await page.evaluate(() => {
        window.gameApp.loadNewLevel('1-1');
        const engine = window.gameApp.pvzEngine;
        // Check if puffshroom is nocturnal
        const plant = window.createPlant('puffshroom', 2, 2, 300, 300, engine.entityLayer, engine.isNight);
        return {
            isNight: engine.isNight,
            isAsleep: plant.isAsleep,
            anim: plant.currentAnim
        };
    });
    console.log('Puff-shroom in Day 1-1:', dayResult);
    if (dayResult.isNight !== false || !dayResult.isAsleep) {
        throw new Error('Puff-shroom should sleep in Daytime (World 1)!');
    }
    console.log('✓ Puff-shroom correctly sleeps in Daytime (World 1)!');

    await browser.close();
    console.log('\n>>> ALL SLEEP & WORLD 2 CHECKS PASSED SUCCESSFULLY! <<<');
})().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
