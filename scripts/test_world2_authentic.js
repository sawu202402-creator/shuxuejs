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

(async () => {
    console.log('🌙 Starting Comprehensive World 2 PVZ1-Fidelity Verification Suite...');
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    const { server, port } = await startStaticServer();
    const baseUrl = `http://127.0.0.1:${port}/index.html`;

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        const consoleErrors = [];
        const failedRequests = [];
        page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', err => consoleErrors.push(err.message));
        page.on('requestfailed', req => failedRequests.push(`${req.url()} (${req.failure()?.errorText})`));
        page.on('response', res => {
            if (res.status() >= 400 && !res.url().endsWith('favicon.ico')) {
                failedRequests.push(`${res.url()} -> HTTP ${res.status()}`);
            }
        });

        await page.goto(baseUrl, { waitUntil: 'networkidle2' });
        await page.waitForFunction(() => {
            const ov = document.getElementById('loadingOverlay');
            return window.gameApp && window.gameApp.pvzEngine && (!ov || ov.style.display === 'none');
        }, { timeout: 15000 });

        // 0. World 1-1 Regression Check
        const w1Check = await page.evaluate(() => ({
            levelId: window.gameApp.pvzEngine.levelId,
            sun: window.gameApp.pvzEngine.sun,
            hudSun: document.getElementById('sunVal')?.innerText
        }));
        assert.equal(w1Check.levelId, '1-1');
        assert.equal(w1Check.sun, 150, '1-1 initial sun must remain 150');
        assert.equal(w1Check.hudSun, '150');
        console.log('✅ 0. Level 1-1 regression check passed (initialSun=150)');

        // 1. Canonical 2-1 ~ 2-10 Progression, Initial Sun & Reward Uniqueness
        const prog = await page.evaluate(async () => {
            const { GAME_CONFIG } = await import('./js/config.js');
            const rewards = [];
            const summary = [];
            for (let i = 1; i <= 10; i++) {
                const id = `2-${i}`;
                const lvl = GAME_CONFIG.levels[id];
                window.gameApp.pvzEngine.loadLevel(id);
                rewards.push(lvl.rewardPlant);
                summary.push({
                    id,
                    sun: window.gameApp.pvzEngine.sun,
                    graves: window.gameApp.pvzEngine.tombstones.length,
                    reward: lvl.rewardPlant,
                    isWhack: !!lvl.isWhackAZombie,
                    isConveyor: !!lvl.isConveyorBelt
                });
            }
            return { summary, uniqueRewards: new Set(rewards).size };
        });
        assert.equal(prog.uniqueRewards, 10, 'Each level 2-1..2-10 must have a unique canonical reward');
        assert.equal(prog.summary[0].sun, 50, '2-1 initialSun must be 50');
        assert.equal(prog.summary[4].sun, 75, '2-5 Whack-a-Zombie initialSun must be 75');
        assert.equal(prog.summary[4].isWhack, true, '2-5 must be Whack-a-Zombie');
        assert.equal(prog.summary[9].sun, 0, '2-10 Conveyor initialSun must be 0');
        assert.equal(prog.summary[9].reward, 'lilypad', '2-10 must unlock Lily Pad');
        console.log('✅ 1. Canonical 2-1 ~ 2-10 progression, initialSun=50 & rewards verified');

        // 1b. Canonical Sleep Rules (Regular plants awake at night; Nocturnal mushrooms sleep in day + Coffee Bean wakeup)
        const sleepRules = await page.evaluate(() => {
            window.gameApp.loadNewLevel('2-1');
            const engine = window.gameApp.pvzEngine;
            engine.sun = 500;
            engine.selectedCard = 'sunflower';
            const g1 = engine.getGridCoords(1, 2);
            engine.handleClick(g1.x, g1.y);
            const nightSf = engine.plants.find(p => p.type === 'sunflower');
            const nightSleepBadges = document.querySelectorAll('#cardsList .card-sleep-badge').length;

            // Daytime level 3-1 with mushrooms + Coffee Bean
            window.gameApp.loadNewLevel('3-1');
            engine.setCustomDeck(['puffshroom', 'fumeshroom', 'coffeebean', 'lilypad', 'sunflower', 'peashooter', 'wallnut', 'cherrybomb']);
            const puffBadgeInDay = !!document.querySelector('.plant-card[data-id="puffshroom"] .card-sleep-badge');
            const sfBadgeInDay = !!document.querySelector('.plant-card[data-id="sunflower"] .card-sleep-badge');

            engine.sun = 500;
            engine.selectedCard = 'fumeshroom';
            const g2 = engine.getGridCoords(1, 0);
            engine.handleClick(g2.x, g2.y);
            const dayFume = engine.plants.find(p => p.type === 'fumeshroom');
            const asleepBefore = dayFume.isAsleep;

            engine.selectedCard = 'coffeebean';
            engine.handleClick(g2.x, g2.y);
            for (let i = 0; i < 30; i++) engine.update(0.033);

            return {
                nightSfAsleep: nightSf.isAsleep,
                nightSleepBadges,
                puffBadgeInDay,
                sfBadgeInDay,
                asleepBefore,
                asleepAfter: dayFume.isAsleep
            };
        });
        assert.equal(sleepRules.nightSfAsleep, false, 'Sunflower must NOT sleep at night');
        assert.equal(sleepRules.nightSleepBadges, 0, 'No sleep badges at night');
        assert.equal(sleepRules.puffBadgeInDay, true, 'Puff-shroom card must show sleep badge in day');
        assert.equal(sleepRules.sfBadgeInDay, false, 'Sunflower card must NOT show sleep badge in day');
        assert.equal(sleepRules.asleepBefore, true, 'Fume-shroom must sleep in daytime');
        assert.equal(sleepRules.asleepAfter, false, 'Coffee Bean must wake Fume-shroom');
        console.log('✅ 1b. Canonical PVZ1 sleep rules & Coffee Bean wakeup verified');

        // 2. Fume-shroom Piercing vs Overhead Helmets + Front Shield Chill Immunity + Football Helmetless Sprite
        const shieldCombat = await page.evaluate(async () => {
            const engine = window.gameApp.pvzEngine;
            engine.loadLevel('2-6');
            const { createPlant } = await import('./js/plants.js');
            const { Zombie } = await import('./js/zombies.js');

            const fume = createPlant('fumeshroom', 1, 1, 300, 180, engine.entityLayer, true);
            engine.plants.push(fume);

            const doorZ = new Zombie('screendoor', 1, 460, engine.entityLayer);
            const paperZ = new Zombie('newspaper', 1, 480, engine.entityLayer);
            const bucketZ = new Zombie('buckethead', 1, 500, engine.entityLayer);
            const fbZ = new Zombie('football', 1, 520, engine.entityLayer);
            engine.zombies.push(doorZ, paperZ, bucketZ, fbZ);

            fume.shootTimer = 2.0;
            fume.update(0.1, engine);
            engine.projectiles.forEach(p => p.update(0.05, engine));

            const doorChillZ = new Zombie('screendoor', 2, 500, engine.entityLayer);
            const paperChillZ = new Zombie('newspaper', 2, 520, engine.entityLayer);
            const coneChillZ = new Zombie('conehead', 2, 540, engine.entityLayer);
            doorChillZ.takeDamage(20, true);
            paperChillZ.takeDamage(20, true);
            coneChillZ.takeDamage(20, true);

            fbZ.takeDamage(1500, false);

            return {
                doorPierced: doorZ.armorHp === 1100 && doorZ.hp === 250,
                paperBothHit: paperZ.armorHp === 130 && paperZ.hp === 250,
                bucketBlockedBody: bucketZ.armorHp === 1080 && bucketZ.hp === 270,
                fbWalkAfterBreak: fbZ.walkAnim,
                doorSlowed: doorChillZ.isSlowed,
                paperSlowed: paperChillZ.isSlowed,
                coneSlowed: coneChillZ.isSlowed
            };
        });
        assert.equal(shieldCombat.doorPierced, true);
        assert.equal(shieldCombat.paperBothHit, true);
        assert.equal(shieldCombat.bucketBlockedBody, true);
        assert.equal(shieldCombat.fbWalkAfterBreak, 'assets/zombies/football_nohelmet_walk.gif');
        assert.equal(shieldCombat.doorSlowed, false);
        assert.equal(shieldCombat.paperSlowed, false);
        assert.equal(shieldCombat.coneSlowed, true);
        console.log('✅ 2. Fume-shroom shield/helmet distinction, Snow Pea chill immunity & Football helmetless sprite verified');

        // 3. Newspaper Zombie 1.35s Puzzled Pause -> Enraged Sprint + Doom-shroom 180s Crater + Sun-shroom 120s Growth
        const npAndDoom = await page.evaluate(async () => {
            const engine = window.gameApp.pvzEngine;
            engine.loadLevel('2-9');
            const { createPlant } = await import('./js/plants.js');
            const { Zombie } = await import('./js/zombies.js');

            const np = new Zombie('newspaper', 2, 620, engine.entityLayer);
            engine.zombies.push(np);
            np.takeDamage(160);
            const stateDuringPause = np.state;
            const animDuringPause = np.currentAnim;
            const xBeforePauseStep = np.x;
            np.update(0.5, engine);
            const movedDuringPause = np.x !== xBeforePauseStep;

            np.update(1.0, engine);
            const stateAfterPause = np.state;
            const animAfterPause = np.currentAnim;
            np.update(0.5, engine);
            const movedAfterPause = np.x < xBeforePauseStep;

            const doom = createPlant('doomshroom', 0, 2, 400, 120, engine.entityLayer, true);
            engine.plants.push(doom);
            doom.update(0.9, engine);
            const craterLife = engine.craters[0] ? engine.craters[0].maxLifespan : 0;

            const ss = createPlant('sunshroom', 1, 2, 400, 200, engine.entityLayer, true);
            ss.growTimer = 110;
            ss.update(0.1, engine);
            const grownAt110 = ss.isGrown;
            ss.growTimer = 120.5;
            ss.update(0.1, engine);
            const grownAt121 = ss.isGrown;

            return {
                stateDuringPause,
                animDuringPause,
                movedDuringPause,
                stateAfterPause,
                animAfterPause,
                movedAfterPause,
                craterLife,
                grownAt110,
                grownAt121
            };
        });
        assert.equal(npAndDoom.stateDuringPause, 'enraging');
        assert.equal(npAndDoom.animDuringPause, 'assets/zombies/newspaper_lost.gif');
        assert.equal(npAndDoom.movedDuringPause, false);
        assert.equal(npAndDoom.stateAfterPause, 'walk');
        assert.equal(npAndDoom.animAfterPause, 'assets/zombies/newspaper_rage_walk.gif');
        assert.equal(npAndDoom.movedAfterPause, true);
        assert.equal(npAndDoom.craterLife, 180);
        assert.equal(npAndDoom.grownAt110, false);
        assert.equal(npAndDoom.grownAt121, true);
        console.log('✅ 3. Newspaper 1.35s puzzled pause -> rage sprint, Doom-shroom 180s crater & Sun-shroom 120s growTime verified');

        // 4. Hypno-shroom Daytime Sleep Non-Trigger & Night Mutual Zombie-vs-Zombie Combat
        const hypnoCheck = await page.evaluate(async () => {
            const engine = window.gameApp.pvzEngine;
            const { createPlant } = await import('./js/plants.js');
            const { Zombie } = await import('./js/zombies.js');

            engine.loadLevel('1-3');
            const sleepHypno = createPlant('hypnoshroom', 2, 2, 420, 280, engine.entityLayer, false);
            engine.plants.push(sleepHypno);
            const dayAttacker = new Zombie('normal', 2, 430, engine.entityLayer);
            engine.zombies.push(dayAttacker);
            for (let i = 0; i < 10; i++) dayAttacker.update(0.1, engine);
            const sleepingHypnotized = dayAttacker.isHypnotized;

            engine.loadLevel('2-6');
            const awakeHypno = createPlant('hypnoshroom', 2, 2, 420, 280, engine.entityLayer, true);
            engine.plants.push(awakeHypno);
            const z1 = new Zombie('normal', 2, 430, engine.entityLayer);
            const z2 = new Zombie('normal', 2, 450, engine.entityLayer);
            engine.zombies.push(z1, z2);
            for (let i = 0; i < 20; i++) {
                z1.update(0.1, engine);
                z2.update(0.1, engine);
            }
            return {
                sleepingHypnotized,
                z1Hypnotized: z1.isHypnotized,
                z1TookMutualDamage: z1.hp < 270,
                z2TookMutualDamage: z2.hp < 270
            };
        });
        assert.equal(hypnoCheck.sleepingHypnotized, false);
        assert.equal(hypnoCheck.z1Hypnotized, true);
        assert.equal(hypnoCheck.z1TookMutualDamage, true);
        assert.equal(hypnoCheck.z2TookMutualDamage, true);
        console.log('✅ 4. Sleeping Hypno-shroom safety & mutual zombie-vs-zombie combat verified');

        // 5. Dancing Zombie Moonwalk + 4 Backup Dancers Summon (+ Screenshot of 2-8)
        const discoCheck = await page.evaluate(async () => {
            window.gameApp.loadNewLevel('2-8');
            const engine = window.gameApp.pvzEngine;
            const { createPlant } = await import('./js/plants.js');
            const { Zombie } = await import('./js/zombies.js');

            // Place mushrooms on left for visual fidelity in screenshot
            [[1, 1, 'sunshroom'], [2, 1, 'fumeshroom'], [3, 1, 'scaredyshroom'], [2, 2, 'puffshroom']].forEach(([r, c, t]) => {
                const pos = engine.getGridCoords(c, r);
                engine.plants.push(createPlant(t, r, c, pos.x, pos.y, engine.entityLayer, true));
            });

            const dancer = new Zombie('dancing', 2, 800, engine.entityLayer);
            const fb = new Zombie('football', 1, 710, engine.entityLayer);
            const sd = new Zombie('screendoor', 3, 690, engine.entityLayer);
            const np = new Zombie('newspaper', 4, 730, engine.entityLayer);
            const flag = new Zombie('flag', 0, 760, engine.entityLayer);
            engine.zombies.push(dancer, fb, sd, np, flag);

            const initialPhase = dancer.dancePhase;
            const initialAnim = dancer.currentAnim;

            for (let i = 0; i < 45; i++) {
                dancer.update(0.1, engine);
            }
            const backups = engine.zombies.filter(z => z.type === 'backup_dancer');
            engine.render();
            return {
                initialPhase,
                initialAnim,
                backupCount: backups.length,
                backupRows: backups.map(b => b.row).sort()
            };
        });
        assert.equal(discoCheck.initialPhase, 'moonwalk');
        assert.equal(discoCheck.initialAnim, 'assets/zombies/dancing_moonwalk.gif');
        assert.equal(discoCheck.backupCount, 4);
        assert.deepEqual(discoCheck.backupRows, [1, 2, 2, 3]);
        await new Promise(r => setTimeout(r, 250));
        await page.screenshot({ path: `${SCRATCH_DIR}/verify_2_8_disco.png` });
        console.log('✅ 5. Dancing Zombie moonwalk & 4 Backup Dancers summon verified (+ screenshot saved)');

        // 6. Level 2-5 Whack-a-Zombie Mallet Smash + Grave Wave Emergence (+ Screenshot)
        const whackCheck = await page.evaluate(async () => {
            window.gameApp.loadNewLevel('2-5');
            const engine = window.gameApp.pvzEngine;
            for (let i = 0; i < 42; i++) engine.update(0.1);
            const spawnedFromGraves = engine.zombies.length;
            const target = engine.zombies[0];
            engine.handleClick(target.x, target.y);
            engine.render();
            return {
                badgeVisible: document.getElementById('whackModeBadge')?.style.display === 'flex',
                spawnedFromGraves,
                targetDeadOrDying: target.isDead || target.isDying,
                whackEffectCount: engine.whackEffects.length
            };
        });
        assert.equal(whackCheck.badgeVisible, true);
        assert.ok(whackCheck.spawnedFromGraves >= 2);
        assert.equal(whackCheck.targetDeadOrDying, true);
        await new Promise(r => setTimeout(r, 200));
        await page.screenshot({ path: `${SCRATCH_DIR}/verify_2_5_whack.png` });
        console.log('✅ 6. Level 2-5 Whack-a-Zombie mallet smash & grave emergence verified (+ screenshot saved)');

        // 7. Seed Chooser Modal UI & Custom Deck Application (+ Screenshot)
        const chooserCheck = await page.evaluate(async () => {
            window.gameApp.loadNewLevel('2-9', { openChooser: true });
            const modalVisible = document.getElementById('seedChooserModal')?.style.display === 'flex';
            const isPausedWhileChoosing = window.gameApp.pvzEngine.isPaused;
            const poolCount = document.querySelectorAll('#seedPoolGrid .seed-pool-card').length;
            const zombieChipCount = document.querySelectorAll('#seedChooserZombies .zombie-preview-chip').length;

            const lastSlot = document.querySelector('#seedSelectedSlots .seed-slot-item.filled:last-child');
            lastSlot.click();
            const repeaterPoolCard = document.querySelector('#seedPoolGrid .seed-pool-card[data-pool-id="repeater"]');
            repeaterPoolCard.click();
            return {
                modalVisible,
                isPausedWhileChoosing,
                poolCount,
                zombieChipCount
            };
        });
        assert.equal(chooserCheck.modalVisible, true);
        assert.equal(chooserCheck.isPausedWhileChoosing, true);
        assert.ok(chooserCheck.poolCount >= 16);
        assert.ok(chooserCheck.zombieChipCount >= 5);
        await new Promise(r => setTimeout(r, 200));
        await page.screenshot({ path: `${SCRATCH_DIR}/verify_seed_chooser.png` });

        const afterConfirm = await page.evaluate(() => {
            document.getElementById('btnConfirmSeedDeck').click();
            const activeIds = Array.from(document.querySelectorAll('#cardsList .plant-card')).map(c => c.getAttribute('data-id'));
            return {
                modalHidden: document.getElementById('seedChooserModal')?.style.display === 'none',
                unpaused: !window.gameApp.pvzEngine.isPaused,
                hasRepeaterInBank: activeIds.includes('repeater')
            };
        });
        assert.equal(afterConfirm.modalHidden, true);
        assert.equal(afterConfirm.unpaused, true);
        assert.equal(afterConfirm.hasRepeaterInBank, true);
        console.log('✅ 7. Seed Chooser modal selection, zombie preview & custom deck verified (+ screenshot saved)');

        assert.equal(consoleErrors.length, 0, `Unexpected console/page errors: ${consoleErrors.join('; ')}`);
        assert.equal(failedRequests.length, 0, `Failed asset requests: ${failedRequests.join('; ')}`);

        console.log('\n🎉 ALL WORLD 2 PVZ1-FIDELITY TESTS PASSED WITH 0 ERRORS & 100% ASSETS LOADED!');
    } finally {
        await browser.close();
        server.close();
    }
})().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
