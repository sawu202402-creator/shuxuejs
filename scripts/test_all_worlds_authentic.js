import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const ROOT_DIR = process.cwd();
const SCRATCH_DIR = '/home/better/.gemini/antigravity/brain/d889d774-4418-4123-8b63-9d3a075eaeac/scratch';

const MIME_MAP = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

function startStaticServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
            const relPath = urlPath === '/' ? '/index.html' : urlPath;
            const filePath = path.join(ROOT_DIR, relPath);
            if (!filePath.startsWith(ROOT_DIR)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not found: ' + relPath);
                    return;
                }
                const ext = path.extname(filePath).toLowerCase();
                res.writeHead(200, { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' });
                res.end(data);
            });
        });
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            resolve({ server, port: server.address().port });
        });
    });
}

async function main() {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    const { server, port } = await startStaticServer();
    const browser = await puppeteer.launch({
        executablePath: '/opt/google/chrome/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1360,860']
    });

    const pageErrors = [];
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1320, height: 840, deviceScaleFactor: 1 });
        page.on('pageerror', err => pageErrors.push(err.message));
        page.on('response', res => {
            if (res.status() >= 400 && !res.url().includes('fonts.googleapis')) {
                pageErrors.push(`HTTP ${res.status()}: ${res.url()}`);
            }
        });

        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle2' });
        await page.waitForFunction(() => window.gameApp && window.pvzGame && document.getElementById('loadingOverlay').style.display === 'none', { timeout: 25000 });

        // =========================================================================
        // TEST 1: Seed Chooser on 5-9 (Zero blank cards, clean prices, Roof zombies)
        // =========================================================================
        const seedResult = await page.evaluate(() => {
            window.gameApp.loadNewLevel('5-9', { openChooser: true });
            const imgs = Array.from(document.querySelectorAll('#seedChooserModal img'));
            const broken = imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
            const poolCards = Array.from(document.querySelectorAll('#seedPoolGrid .seed-pool-card img'));
            const wrongDim = poolCards.filter(img => img.naturalWidth !== 100 || img.naturalHeight !== 140).map(img => img.src);
            const zombiePreviewNames = Array.from(document.querySelectorAll('#seedChooserZombies .zombie-preview-chip span')).map(s => s.textContent);
            return {
                poolCount: poolCards.length,
                broken,
                wrongDim,
                zombiePreviewNames
            };
        });
        console.log('[TEST 1] Seed Chooser 5-9:', JSON.stringify(seedResult));
        assert.equal(seedResult.broken.length, 0, 'Broken images in Seed Chooser: ' + seedResult.broken.join(', '));
        assert.equal(seedResult.wrongDim.length, 0, 'Wrong card dimensions: ' + seedResult.wrongDim.join(', '));
        assert(seedResult.poolCount >= 35, 'Expected >= 35 unlocked plants in 5-9 chooser');
        assert(seedResult.zombiePreviewNames.includes('伽刚特尔巨人'), 'Expected Gargantuar in 5-9 preview');
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'verify_seed_chooser_5_9.png') });

        // =========================================================================
        // TEST 2: World 2 Night (2-4) — Defringe + Puff-shroom Mouth Spore + Mower Flatten
        // =========================================================================
        const w2Result = await page.evaluate(() => {
            const eng = window.pvzGame;
            window.gameApp.loadNewLevel('2-4');
            eng.sun = 900;

            const place = (type, r, c) => {
                eng.selectedCard = type;
                eng.cardCooldowns[type] = 0;
                const pos = eng.getGridCoords(c, r);
                eng.handleClick(pos.x, pos.y);
            };

            place('sunshroom', 1, 0);
            place('puffshroom', 1, 2);
            place('puffshroom', 2, 1);
            place('fumeshroom', 2, 2);

            if (eng.tombstones.length > 0) {
                const t = eng.tombstones[0];
                eng.selectedCard = 'gravebuster';
                eng.cardCooldowns.gravebuster = 0;
                eng.handleClick(t.x, t.y);
            }

            const z1 = new window.Zombie('conehead', 1, 470, eng.entityLayer);
            const z2 = new window.Zombie('screendoor', 2, 520, eng.entityLayer);
            eng.zombies.push(z1, z2);

            // Step until Puff-shroom fires a spore bullet
            let sporeBullet = null;
            for (let i = 0; i < 40; i++) {
                eng.update(0.05);
                const sh = eng.projectiles.find(p => p.type === 'shroom' && p.row === 1);
                if (sh && !sporeBullet) {
                    const puff = eng.plants.find(p => p.type === 'puffshroom' && p.row === 1);
                    sporeBullet = { bulletX: sh.x, bulletY: sh.y, puffX: puff.x, puffY: puff.y, dy: sh.y - puff.y };
                    break;
                }
            }
            eng.render();
            return { sporeBullet };
        });
        console.log('[TEST 2A] Puff-shroom Mouth Spore:', JSON.stringify(w2Result));
        assert(w2Result.sporeBullet, 'Puff-shroom should fire a spore projectile');
        assert.equal(Math.round(w2Result.sporeBullet.dy), 23, 'Puff-shroom spore must exit from mouth (y + 23)');
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'verify_world2_mouth_and_defringe.png') });

        // Test Lawn Mower knockdown (mowerDie vs NOT charred ash)
        const mowerResult = await page.evaluate(() => {
            const eng = window.pvzGame;
            const breachZ = new window.Zombie('buckethead', 3, 38, eng.entityLayer);
            eng.zombies.push(breachZ);
            for (let i = 0; i < 6; i++) {
                eng.update(0.05);
            }
            eng.render();
            return {
                mowerState: eng.lawnMowers.find(m => m.row === 3).state,
                isDying: breachZ.isDying,
                hasMowerDieClass: breachZ.domElement ? breachZ.domElement.classList.contains('mower-die') : false,
                hasCharredClass: breachZ.domElement ? breachZ.domElement.classList.contains('charred-die') : false,
                anim: breachZ.currentAnim
            };
        });
        console.log('[TEST 2B] Mower Knockdown:', JSON.stringify(mowerResult));
        assert.equal(mowerResult.mowerState, 'active');
        assert.equal(mowerResult.isDying, true);
        assert.equal(mowerResult.hasMowerDieClass, true);
        assert.equal(mowerResult.hasCharredClass, false);
        assert(!mowerResult.anim.includes('charred'), 'Mower kill must NOT use zombie_charred.gif');
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'verify_mower_flatten.png') });

        // =========================================================================
        // TEST 3: Conveyor Belt Animation & Wall-nut Bowling (1-5)
        // =========================================================================
        const convResult = await page.evaluate(() => {
            const eng = window.pvzGame;
            window.gameApp.loadNewLevel('1-5');
            const initialX = eng.conveyorItems.map(i => i.x);
            const initialTrack = eng.conveyorTrackOffset;

            // Spawn zombies & step 1.4 seconds
            eng.zombies.push(
                new window.Zombie('normal', 1, 640, eng.entityLayer),
                new window.Zombie('conehead', 2, 700, eng.entityLayer),
                new window.Zombie('buckethead', 3, 750, eng.entityLayer)
            );
            for (let i = 0; i < 28; i++) {
                eng.update(0.05);
            }
            window.gameApp.updateConveyorAnimation();
            const afterX = eng.conveyorItems.map(i => i.x);
            const afterTrack = eng.conveyorTrackOffset;

            // Launch first bowling nut on row 2
            eng.selectedCard = eng.conveyorItems[0].type;
            eng.selectedConveyorIdx = 0;
            const launchPos = eng.getGridCoords(1, 2);
            eng.handleClick(launchPos.x, launchPos.y);
            for (let i = 0; i < 12; i++) {
                eng.update(0.05);
            }
            window.gameApp.updateConveyorAnimation();
            eng.render();

            const cardCssVars = Array.from(document.querySelectorAll('.conveyor-card')).map(el => el.style.getPropertyValue('--card-x'));
            return { initialX, afterX, initialTrack, afterTrack, cardCssVars, activeBowlingNuts: eng.bowlingNuts.length };
        });
        console.log('[TEST 3] Conveyor & Bowling 1-5:', JSON.stringify(convResult));
        assert(convResult.afterX[0] < convResult.initialX[0], 'Conveyor cards must smoothly slide leftward');
        assert(convResult.afterTrack !== convResult.initialTrack, 'Conveyor belt tread offset must animate');
        assert(convResult.activeBowlingNuts >= 1, 'Bowling nut should roll across lawn');
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'verify_conveyor_bowling_1_5.png') });

        // =========================================================================
        // TEST 4: World 3 Pool (3-8) — 6-Row Pool, Aquatic Zombies & Spikeweed vs Zomboni
        // =========================================================================
        const poolResult = await page.evaluate(() => {
            const eng = window.pvzGame;
            window.gameApp.loadNewLevel('3-8');
            if (document.getElementById('seedChooserModal').style.display !== 'none') {
                window.gameApp.confirmSeedDeck();
            }
            eng.sun = 2000;

            const placeDirect = (type, r, c) => {
                eng.selectedCard = type;
                eng.cardCooldowns[type] = 0;
                const pos = eng.getGridCoords(c, r);
                eng.handleClick(pos.x, pos.y);
            };

            placeDirect('lilypad', 2, 2);
            placeDirect('threepeater', 2, 2);
            placeDirect('lilypad', 3, 3);
            placeDirect('tallnut', 3, 3);
            placeDirect('spikeweed', 1, 5);
            placeDirect('spikeweed', 0, 4);
            placeDirect('peashooter', 0, 1);
            placeDirect('torchwood', 4, 3);
            placeDirect('repeater', 4, 1);

            const ducky = new window.Zombie('ducky', 2, 650, eng.entityLayer);
            const snorkel = new window.Zombie('snorkel', 2, 560, eng.entityLayer);
            const dolphin = new window.Zombie('dolphin', 3, 620, eng.entityLayer);
            const zomboni = new window.Zombie('zomboni', 1, 540, eng.entityLayer);
            eng.zombies.push(ducky, snorkel, dolphin, zomboni);

            // Step 0.6s so Zomboni rolls onto Spikeweed at col 5 (x=520)
            for (let i = 0; i < 24; i++) {
                eng.update(0.05);
            }
            // Spawn one more Zomboni further right so it's visible in the screenshot!
            const zomboni2 = new window.Zombie('zomboni', 0, 720, eng.entityLayer);
            eng.zombies.push(zomboni2);
            eng.update(0.05);
            eng.render();

            return {
                rows: eng.rows,
                poolCleaners: eng.lawnMowers.filter(m => m.cleanerType === 'pool').map(m => m.row),
                snorkelSubmerged: snorkel.isSubmerged,
                firstZomboniPopped: zomboni.isDead || zomboni.isDying
            };
        });
        console.log('[TEST 4] World 3 Pool 3-8:', JSON.stringify(poolResult));
        assert.equal(poolResult.rows, 6);
        assert.deepEqual(poolResult.poolCleaners, [2, 3]);
        assert.equal(poolResult.snorkelSubmerged, true, 'Snorkel zombie must swim submerged');
        assert.equal(poolResult.firstZomboniPopped, true, 'Spikeweed must pop Zomboni tires');
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'verify_world3_pool.png') });

        // =========================================================================
        // TEST 5: World 4 Fog (4-9) — Foreground Fog, Plantern Halo, Balloon, Digger + Split Pea
        // =========================================================================
        const fogResult = await page.evaluate(() => {
            const eng = window.pvzGame;
            window.gameApp.loadNewLevel('4-9');
            if (document.getElementById('seedChooserModal').style.display !== 'none') {
                window.gameApp.confirmSeedDeck();
            }
            eng.sun = 2500;

            const placeDirect = (type, r, c) => {
                eng.selectedCard = type;
                eng.cardCooldowns[type] = 0;
                const pos = eng.getGridCoords(c, r);
                eng.handleClick(pos.x, pos.y);
            };

            // Plantern at row 2, col 5 on a Lily Pad inside the fog!
            placeDirect('lilypad', 2, 5);
            placeDirect('plantern', 2, 5);
            placeDirect('cactus', 0, 2);
            placeDirect('splitpea', 4, 4);
            placeDirect('magnetshroom', 1, 3);

            const balloon = new window.Zombie('balloon', 0, 620, eng.entityLayer);
            const pogo = new window.Zombie('pogo', 1, 520, eng.entityLayer);
            const jack = new window.Zombie('jackinthebox', 5, 680, eng.entityLayer);
            const digger = new window.Zombie('digger', 4, 150, eng.entityLayer); // close to left edge so it surfaces!
            eng.zombies.push(balloon, pogo, jack, digger);

            for (let i = 0; i < 42; i++) {
                eng.update(0.05);
            }
            // Spawn another visible balloon at row 3 for screenshot clarity
            const balloon2 = new window.Zombie('balloon', 3, 540, eng.entityLayer);
            eng.zombies.push(balloon2);
            eng.update(0.05);
            eng.render();

            const fogCanvas = document.getElementById('fogCanvas');
            const fctx = fogCanvas.getContext('2d');
            const planternPos = eng.getGridCoords(5, 2);
            const alphaAtPlantern = fctx.getImageData(Math.round(planternPos.x), Math.round(planternPos.y), 1, 1).data[3];
            const alphaInDeepFog = fctx.getImageData(820, 520, 1, 1).data[3];

            return {
                balloon1GroundedByCactus: !balloon.isFlying,
                pogoMagnetized: !pogo.hasShield,
                diggerPhase: digger.diggerPhase,
                alphaAtPlantern,
                alphaInDeepFog
            };
        });
        console.log('[TEST 5] World 4 Fog 4-9:', JSON.stringify(fogResult));
        assert.equal(fogResult.balloon1GroundedByCactus, true, 'Cactus thorn must pop Balloon Zombie');
        assert.equal(fogResult.pogoMagnetized, true, 'Magnet-shroom must steal Pogo stick');
        assert(fogResult.diggerPhase === 'dizzy' || fogResult.diggerPhase === 'backwards', 'Digger should surface on left edge');
        assert(fogResult.alphaInDeepFog > 200, 'Deep fog on #fogCanvas must shroud right lanes');
        assert(fogResult.alphaAtPlantern < 80, 'Plantern must clear a light hole in #fogCanvas');
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'verify_world4_fog_plantern.png') });

        // =========================================================================
        // TEST 6: World 5 Roof (5-8) — Sloped Roof Cleaners, Pots, Sloped Zombies, Ridge Block & Gargantuar
        // =========================================================================
        const roofResult = await page.evaluate(() => {
            const eng = window.pvzGame;
            window.gameApp.loadNewLevel('5-8');
            if (document.getElementById('seedChooserModal').style.display !== 'none') {
                window.gameApp.confirmSeedDeck();
            }
            eng.sun = 3000;

            const initialPots = eng.plants.filter(p => p.type === 'flowerpot').length;

            const placeDirect = (type, r, c) => {
                eng.selectedCard = type;
                eng.cardCooldowns[type] = 0;
                const pos = eng.getGridCoords(c, r);
                eng.handleClick(pos.x, pos.y);
            };

            // Plant lobbed catapults & test straight peashooter on sloped Col 0
            placeDirect('peashooter', 0, 0);
            placeDirect('cabbagepult', 1, 0);
            placeDirect('kernelpult', 2, 1);
            placeDirect('melonpult', 3, 1);
            placeDirect('flowerpot', 2, 3);
            placeDirect('wallnut', 2, 3);

            const zSlope = new window.Zombie('ladder', 2, 380, eng.entityLayer);
            const zGarg = new window.Zombie('gargantuar', 3, 660, eng.entityLayer);
            const zCatapult = new window.Zombie('catapult', 1, 710, eng.entityLayer);
            const zBungee = new window.Zombie('bungee', 4, 500, eng.entityLayer);
            const zRidge = new window.Zombie('conehead', 0, 560, eng.entityLayer);
            eng.zombies.push(zSlope, zGarg, zCatapult, zBungee, zRidge);

            let ridgeHitX = null;
            for (let i = 0; i < 45; i++) {
                eng.update(0.05);
                const splatOnRoof = eng.hitSplats.find(s => s.x >= 200 && s.x <= 450);
                if (splatOnRoof && ridgeHitX === null) {
                    ridgeHitX = splatOnRoof.x;
                }
            }
            eng.render();

            const row0Mower = eng.lawnMowers.find(m => m.row === 0);
            return {
                initialPots,
                row0MowerCleanerType: row0Mower.cleanerType,
                row0MowerY: Math.round(row0Mower.y),
                ridgeHitX,
                zSlopeY: Math.round(zSlope.y),
                zRidgeFlatY: Math.round(zRidge.y)
            };
        });
        console.log('[TEST 6] World 5 Roof 5-8:', JSON.stringify(roofResult));
        assert.equal(roofResult.initialPots, 15, 'Roof must spawn 15 pre-placed Flower Pots (Cols 0..2 x 5 rows)');
        assert.equal(roofResult.row0MowerCleanerType, 'roof');
        assert(roofResult.row0MowerY >= 225 && roofResult.row0MowerY <= 250, `Row 0 Roof Cleaner must sit on sloped eave (~236px), got ${roofResult.row0MowerY}`);
        assert(roofResult.ridgeHitX !== null && roofResult.ridgeHitX <= 445, 'Straight pea from Col 0 must be blocked by Roof slope');
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'verify_world5_roof_slope.png') });

        assert.equal(pageErrors.length, 0, 'Page errors encountered: ' + pageErrors.join(' | '));
        console.log('ALL_6_WORLD_AUTHENTIC_TESTS_PASSED!');
    } finally {
        await browser.close();
        server.close();
    }
}

main().catch(err => {
    console.error('TEST_FAILED:', err);
    process.exit(1);
});
