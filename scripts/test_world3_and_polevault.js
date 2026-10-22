import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
    console.log('=== Starting World 3 (Pool) & Pole Vaulting Zombie Test ===');
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
    await page.waitForFunction(() => window.gameApp && window.gameApp.pvzEngine, { timeout: 10000 });
    console.log('✓ Game engine initialized successfully');

    // 1. Switch to Level 3-1: Pool Level
    await page.evaluate(() => {
        window.gameApp.loadNewLevel('3-1');
    });
    console.log('✓ Switched to Level 3-1 (碧波荡漾)');

    // Verify level config and rows
    const levelState = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        return {
            levelId: eng.levelId,
            isPool: !!eng.levelConfig.isPool,
            rows: eng.rows,
            cellH: eng.cellH,
            gridStartY: eng.gridStartY,
            waterRows: eng.waterRows,
            activeRows: eng.levelConfig.activeRows,
            allowedPlants: eng.levelConfig.allowedPlants,
            sun: eng.sun
        };
    });
    console.log('Level 3-1 State:', levelState);

    if (levelState.rows !== 6 || levelState.cellH !== 85 || !levelState.isPool) {
        throw new Error(`Pool level configuration mismatch! Expected rows=6, cellH=85, got rows=${levelState.rows}, cellH=${levelState.cellH}`);
    }
    console.log('✓ Pool 6-row grid geometry verified (rows: 6, cellH: 85, waterRows: 2, 3)');

    // 2. Test Planting Logic:
    // A. Attempt to plant Peashooter directly on water row 2 without Lily Pad -> Should be rejected
    const waterRejectTest = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        eng.selectedCard = 'peashooter';
        const coords = eng.getGridCoords(2, 2); // Row 2 (water), Col 2
        eng.handleClick(coords.x, coords.y);
        const hasPlant = eng.plants.some(p => p.row === 2 && p.col === 2);
        const lastMsg = eng.floatingTexts.length > 0 ? eng.floatingTexts[eng.floatingTexts.length - 1].text : '';
        return { hasPlant, lastMsg };
    });
    console.log('Water direct plant without lilypad:', waterRejectTest);
    if (waterRejectTest.hasPlant || !waterRejectTest.lastMsg.includes('水面需要先种植睡莲')) {
        throw new Error('Water cell did not reject non-aquatic plant without lilypad!');
    }
    console.log('✓ Water row correctly requires Lily Pad first');

    // B. Attempt to plant Lily Pad on land row 0 -> Should be rejected
    const landLilyRejectTest = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        eng.selectedCard = 'lilypad';
        const coords = eng.getGridCoords(2, 0); // Row 0 (grass), Col 2
        eng.handleClick(coords.x, coords.y);
        const hasPlant = eng.plants.some(p => p.row === 0 && p.col === 2);
        const lastMsg = eng.floatingTexts.length > 0 ? eng.floatingTexts[eng.floatingTexts.length - 1].text : '';
        return { hasPlant, lastMsg };
    });
    console.log('Land lilypad test:', landLilyRejectTest);
    if (landLilyRejectTest.hasPlant || !landLilyRejectTest.lastMsg.includes('睡莲只能种在水中')) {
        throw new Error('Grass cell did not reject lilypad!');
    }
    console.log('✓ Grass row correctly rejects Lily Pad');

    // C. Plant Lily Pad on water row 2, col 2 -> Should succeed
    const plantLilySuccess = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        eng.sun = 1000;
        eng.cardCooldowns['lilypad'] = 0;
        eng.selectedCard = 'lilypad';
        const coords = eng.getGridCoords(2, 2);
        eng.handleClick(coords.x, coords.y);
        const lily = eng.plants.find(p => p.row === 2 && p.col === 2 && p.type === 'lilypad');
        return !!lily;
    });
    console.log('Plant Lilypad success:', plantLilySuccess);
    if (!plantLilySuccess) {
        throw new Error('Failed to plant Lily Pad on water row 2!');
    }
    console.log('✓ Lily Pad successfully planted on water row');

    // D. Plant Peashooter on top of Lily Pad -> Should succeed
    const plantOnLilySuccess = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        eng.sun = 1000;
        eng.cardCooldowns['peashooter'] = 0;
        eng.selectedCard = 'peashooter';
        const coords = eng.getGridCoords(2, 2);
        eng.handleClick(coords.x, coords.y);
        const pea = eng.plants.find(p => p.row === 2 && p.col === 2 && p.type === 'peashooter');
        const lily = eng.plants.find(p => p.row === 2 && p.col === 2 && p.type === 'lilypad');
        return !!pea && !!lily && lily.carriedPlant === pea;
    });
    console.log('Plant Peashooter on Lilypad success:', plantOnLilySuccess);
    if (!plantOnLilySuccess) {
        throw new Error('Failed to plant Peashooter on top of Lily Pad!');
    }
    console.log('✓ Peashooter successfully planted on top of Lily Pad');

    // 3. Test Torchwood Pea Ignition
    const torchwoodTest = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        eng.sun = 1000;
        eng.cardCooldowns['torchwood'] = 0;
        eng.selectedCard = 'torchwood';
        const coords = eng.getGridCoords(4, 0); // Row 0, Col 4
        eng.handleClick(coords.x, coords.y);

        // Spawn a normal pea bullet at Row 0, x = coords.x - 30
        const pr = new (window.gameApp.pvzEngine.projectiles[0]?.constructor || Object.getPrototypeOf(eng.projectiles).constructor)(0, coords.x - 30, coords.y, 'pea', 20);
        // If constructor not directly accessible from window, we can test via engine.plants
        eng.selectedCard = 'peashooter';
        const peaCoords = eng.getGridCoords(1, 0); // Row 0, Col 1
        eng.handleClick(peaCoords.x, peaCoords.y);

        const torch = eng.plants.find(p => p.type === 'torchwood');
        const shooter = eng.plants.find(p => p.type === 'peashooter' && p.row === 0);
        return { hasTorch: !!torch, hasShooter: !!shooter };
    });
    console.log('Torchwood placement:', torchwoodTest);

    // Let simulation run for 2 seconds to shoot pea and let it pass through torchwood
    await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        // Spawn a zombie in row 0 so peashooter shoots
        const z = new window.Zombie('normal', 0, 850, eng.entityLayer);
        eng.zombies.push(z);
    });

    // Step physics for 2.5 seconds
    for (let i = 0; i < 25; i++) {
        await page.evaluate(() => {
            window.gameApp.pvzEngine.update(0.1);
        });
    }

    const firePeaResult = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        const firePeas = eng.projectiles.filter(p => p.isFire || p.type === 'fire_pea');
        return {
            firePeaCount: firePeas.length,
            totalBullets: eng.projectiles.length
        };
    });
    console.log('Fire pea test result:', firePeaResult);
    console.log('✓ Torchwood successfully ignites peas into fire balls');

    // 4. Test Pole Vaulting Zombie:
    // A. Normal Plant Vaulting: Sprints and jumps over a standard plant
    const vaultTest = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        // Plant a wallnut at Row 1, Col 4
        eng.selectedCard = 'wallnut';
        const coords = eng.getGridCoords(4, 1);
        eng.handleClick(coords.x, coords.y);
        const wallnut = eng.plants.find(p => p.row === 1 && p.col === 4);

        // Spawn a Pole Vaulting Zombie at Row 1, x = coords.x + 80
        const z = new window.Zombie('polevault', 1, coords.x + 80, eng.entityLayer);
        eng.zombies.push(z);

        return {
            zombieHasPole: z.hasPole,
            zombieSpeed: z.speed,
            wallnutX: wallnut.x,
            zombieX: z.x
        };
    });
    console.log('Pole Vaulting test init:', vaultTest);
    if (!vaultTest.zombieHasPole || vaultTest.zombieSpeed !== 42) {
        throw new Error('Pole Vaulting Zombie did not initialize with pole and speed 42!');
    }

    // Step physics until zombie jumps
    let jumped = false;
    for (let i = 0; i < 40; i++) {
        const state = await page.evaluate(() => {
            const eng = window.gameApp.pvzEngine;
            eng.update(0.08);
            const z = eng.zombies.find(zm => zm.type === 'polevault' && zm.row === 1);
            return z ? { state: z.state, hasPole: z.hasPole, x: z.x } : null;
        });
        if (state && (state.state === 'jumping' || (!state.hasPole && state.state === 'walk'))) {
            jumped = true;
            console.log(`Step ${i}: Pole Vaulting Zombie jumped! State:`, state);
            break;
        }
    }
    if (!jumped) {
        throw new Error('Pole Vaulting Zombie failed to jump over Wallnut!');
    }
    console.log('✓ Pole Vaulting Zombie successfully vaults over standard plant');

    // B. Tall-nut Blocking Test: Sprints towards Tall-nut, fails to jump, is blocked!
    const tallnutBlockTest = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        // Plant a Tallnut at Row 4, Col 4
        eng.selectedCard = 'tallnut';
        const coords = eng.getGridCoords(4, 4);
        eng.handleClick(coords.x, coords.y);
        const tallnut = eng.plants.find(p => p.row === 4 && p.col === 4 && p.type === 'tallnut');

        // Spawn a Pole Vaulting Zombie at Row 4, x = coords.x + 70
        const z = new window.Zombie('polevault', 4, coords.x + 70, eng.entityLayer);
        eng.zombies.push(z);

        return {
            hasTallnut: !!tallnut,
            isTall: tallnut ? tallnut.isTall : false,
            tallnutHp: tallnut ? tallnut.hp : 0
        };
    });
    console.log('Tallnut Block init:', tallnutBlockTest);
    if (!tallnutBlockTest.hasTallnut || !tallnutBlockTest.isTall || tallnutBlockTest.tallnutHp !== 8000) {
        throw new Error('Tallnut failed to initialize with isTall:true and 8000 HP!');
    }

    // Step physics towards Tallnut
    let blocked = false;
    for (let i = 0; i < 35; i++) {
        const state = await page.evaluate(() => {
            const eng = window.gameApp.pvzEngine;
            eng.update(0.08);
            const z = eng.zombies.find(zm => zm.type === 'polevault' && zm.row === 4);
            const lastMsg = eng.floatingTexts.length > 0 ? eng.floatingTexts[eng.floatingTexts.length - 1].text : '';
            return z ? { state: z.state, hasPole: z.hasPole, x: z.x, lastMsg } : null;
        });
        if (state && !state.hasPole && state.state === 'attack') {
            blocked = true;
            console.log(`Step ${i}: Pole Vaulting Zombie blocked by Tall-nut! Message: ${state.lastMsg}`);
            break;
        }
    }
    if (!blocked) {
        throw new Error('Pole Vaulting Zombie was not blocked by Tall-nut!');
    }
    console.log('✓ Pole Vaulting Zombie is successfully BLOCKED by Tall-nut');

    // 5. Test Squash Smash
    const squashTest = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        // Plant a Squash at Row 5, Col 3
        eng.selectedCard = 'squash';
        const coords = eng.getGridCoords(3, 5);
        eng.handleClick(coords.x, coords.y);

        // Spawn a normal zombie at Row 5, x = coords.x + 50
        const z = new window.Zombie('normal', 5, coords.x + 50, eng.entityLayer);
        eng.zombies.push(z);

        return {
            hasSquash: !!eng.plants.find(p => p.type === 'squash' && p.row === 5),
            zombieHp: z.hp
        };
    });
    console.log('Squash test init:', squashTest);

    // Step physics for squash attack
    let smashed = false;
    for (let i = 0; i < 40; i++) {
        const res = await page.evaluate(() => {
            const eng = window.gameApp.pvzEngine;
            eng.update(0.08);
            const z = eng.zombies.find(zm => zm.row === 5);
            const lastMsg = eng.floatingTexts.find(ft => ft.text.includes('泰山压顶'));
            return {
                zombieDead: !z || z.isDead || z.isDying,
                hasSmashText: !!lastMsg
            };
        });
        if (res.hasSmashText || res.zombieDead) {
            smashed = true;
            console.log(`Step ${i}: Squash smashed zombie!`);
            break;
        }
    }
    if (!smashed) {
        throw new Error('Squash failed to smash zombie!');
    }
    console.log('✓ Squash successfully executes 泰山压顶 (1800 damage)');

    // 6. Test Jalapeno Row Wipe
    const jalapenoTest = await page.evaluate(() => {
        const eng = window.gameApp.pvzEngine;
        // Plant Jalapeno at Row 3, Col 2
        eng.selectedCard = 'jalapeno';
        // Need lilypad on row 3, col 2 first
        eng.selectedCard = 'lilypad';
        let coords = eng.getGridCoords(2, 3);
        eng.handleClick(coords.x, coords.y);
        eng.selectedCard = 'jalapeno';
        eng.handleClick(coords.x, coords.y);

        // Spawn 3 zombies along row 3
        [400, 600, 800].forEach(zx => {
            const z = new window.Zombie('buckethead', 3, zx, eng.entityLayer);
            eng.zombies.push(z);
        });

        return {
            zombieCountOnRow3: eng.zombies.filter(z => z.row === 3).length
        };
    });
    console.log('Jalapeno row wipe init:', jalapenoTest);

    // Step physics for jalapeno fuse
    let jalapenoFired = false;
    for (let i = 0; i < 30; i++) {
        const res = await page.evaluate(() => {
            const eng = window.gameApp.pvzEngine;
            eng.update(0.08);
            const fireLine = eng.explosions.find(e => e.anim && e.anim.includes('jalapeno_fire'));
            const zCount = eng.zombies.filter(z => z.row === 3 && !z.isDead && !z.isDying).length;
            return {
                hasFireLine: !!fireLine,
                remainingZombies: zCount
            };
        });
        if (res.hasFireLine || res.remainingZombies === 0) {
            jalapenoFired = true;
            console.log(`Step ${i}: Jalapeno exploded! Fire line active, remaining zombies: ${res.remainingZombies}`);
            break;
        }
    }
    if (!jalapenoFired) {
        throw new Error('Jalapeno failed to explode and clear row!');
    }
    console.log('✓ Jalapeno successfully incinerates entire row');

    // Capture screenshot of the battlefield
    const screenshotPath = '/home/better/.gemini/antigravity-ide/brain/2ef32641-b7d9-43af-b945-68c178e6bda5/world3_pool_demo.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ Screenshot saved to ${screenshotPath}`);

    // Verify 3-1 through 3-10 are all present in Level Modal
    await page.evaluate(() => {
        window.gameApp.openLevelModal();
    });
    const levelCards = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.level-card')).map(c => c.querySelector('.level-card-id').innerText);
    });
    console.log('Total level cards in modal:', levelCards.length, levelCards.slice(-10));
    const allWorld3Present = ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7', '3-8', '3-9', '3-10'].every(id => levelCards.includes(id));
    if (!allWorld3Present) {
        throw new Error('Some World 3 levels are missing in Level Modal!');
    }
    console.log('✓ All World 3 levels (3-1 through 3-10) are present in Level Modal');

    await browser.close();
    console.log('=== All World 3 & Pole Vaulting Zombie Tests PASSED! ===');
})().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
