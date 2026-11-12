import os
import json
import base64
import math
import glob
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

from build_world2_assets import (
    get_exterior_bg,
    defringe_1bit_rgba,
    clean_newsucai_2x,
    load_newsucai_img,
    save_gif,
)

SCRATCH_DIR = '/home/better/.gemini/antigravity/brain/d889d774-4418-4123-8b63-9d3a075eaeac/scratch'
os.makedirs(SCRATCH_DIR, exist_ok=True)
os.makedirs('assets/plants', exist_ok=True)
os.makedirs('assets/cards', exist_ok=True)
os.makedirs('assets/zombies', exist_ok=True)
os.makedirs('assets/projectiles', exist_ok=True)
os.makedirs('assets/ui', exist_ok=True)

with open('newsucai/project.json', 'r', encoding='utf-8') as f:
    proj = json.load(f)

TARGETS = {t['name']: {c['name']: c for c in t.get('costumes', [])} for t in proj['targets']}

FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def extract_frames(path):
    im = Image.open(path)
    frames = []
    durations = []
    for i in range(getattr(im, 'n_frames', 1)):
        im.seek(i)
        frames.append(im.convert('RGBA'))
        durations.append(im.info.get('duration', 90) or 90)
    avg_dur = int(round(sum(durations) / max(1, len(durations))))
    return frames, max(60, min(140, avg_dur))


def crop_nonempty(im, pad=0):
    bb = im.getbbox()
    if not bb:
        return im
    x0 = max(0, bb[0] - pad)
    y0 = max(0, bb[1] - pad)
    x1 = min(im.width, bb[2] + pad)
    y1 = min(im.height, bb[3] + pad)
    return im.crop((x0, y0, x1, y1))


def new_2x(w, h):
    canvas = Image.new('RGBA', (w * 2, h * 2), (0, 0, 0, 0))
    return canvas, ImageDraw.Draw(canvas)


def finish_2x(canvas, w, h):
    return defringe_1bit_rgba(canvas.resize((w, h), Image.LANCZOS))


# ============================================================================
# 1. UI, Mowers/Cleaners, Conveyor, Projectiles & Crater
# ============================================================================
def build_ui_and_projectiles():
    print('--- [1/4] Building UI cleaners, conveyor track, and projectiles ---')
    mowers = TARGETS.get('小推车', {})
    # Pool Cleaner (land & water) + Roof Cleaner
    pool_land = load_newsucai_img(mowers['小推车1'])
    if pool_land:
        pool_land = defringe_1bit_rgba(crop_nonempty(pool_land, 2).resize((72, 68), Image.LANCZOS))
        pool_land.save('assets/ui/pool_cleaner.png')

    pool_water = load_newsucai_img(mowers['小推车11'])
    if pool_water:
        pool_water = defringe_1bit_rgba(crop_nonempty(pool_water, 2).resize((72, 64), Image.LANCZOS))
        pool_water.save('assets/ui/pool_cleaner_water.png')

    roof_cleaner = load_newsucai_img(mowers['小推车2'])
    if roof_cleaner:
        roof_cleaner = defringe_1bit_rgba(crop_nonempty(roof_cleaner, 2).resize((74, 60), Image.LANCZOS))
        roof_cleaner.save('assets/ui/roof_cleaner.png')

    slots = TARGETS.get('卡片槽', {})
    conv = load_newsucai_img(slots['传送带1'])
    if conv:
        conv_crop = crop_nonempty(conv, 0)
        conv_crop.save('assets/ui/conveyor_track.png')

    b_costumes = TARGETS.get('子弹&掉落物&饰品&动画', {})
    thorn = load_newsucai_img(b_costumes['仙人掌刺'])
    if thorn:
        thorn_clean = defringe_1bit_rgba(crop_nonempty(thorn, 1))
        thorn_clean.save('assets/projectiles/cactus_thorn.png')

    butter_hat = load_newsucai_img(b_costumes['黄油-盖'])
    if butter_hat:
        bh = defringe_1bit_rgba(crop_nonempty(butter_hat, 1).resize((46, 42), Image.LANCZOS))
        bh.save('assets/projectiles/butter_hat.png')

    # Crisp PVZ1 Catapult Basketball
    c, d = new_2x(30, 30)
    d.ellipse((4, 4, 56, 56), fill=(235, 112, 28, 255), outline=(24, 26, 30, 255), width=4)
    d.ellipse((10, 8, 36, 26), fill=(252, 162, 72, 175))
    d.arc((4, 4, 56, 56), 0, 360, fill=(24, 26, 30, 255), width=4)
    d.line((6, 30, 54, 30), fill=(24, 26, 30, 255), width=3)
    d.line((30, 6, 30, 54), fill=(24, 26, 30, 255), width=3)
    d.arc((-14, 10, 28, 50), -65, 65, fill=(24, 26, 30, 255), width=3)
    d.arc((32, 10, 74, 50), 115, 245, fill=(24, 26, 30, 255), width=3)
    finish_2x(c, 30, 30).save('assets/projectiles/basketball.png')

    # Clean & resize crater.png if oversized
    if os.path.exists('assets/backgrounds/crater.png'):
        cr = Image.open('assets/backgrounds/crater.png').convert('RGBA')
        cr_bb = crop_nonempty(cr, 2)
        if cr_bb.width > 160:
            cr_bb = cr_bb.resize((120, 80), Image.LANCZOS)
        defringe_1bit_rgba(cr_bb).save('assets/backgrounds/crater.png')


# ============================================================================
# 2. Plant Sprites Import, Repair & Night Defringe
# ============================================================================
def clean_gravebuster():
    """Remove top horizontal card-frame scanline artifacts from gravebuster.gif and defringe."""
    # Extract clean Grave Buster body from sucai/╤╧╓╪╡─┐╦╨╟(Grave.png top portrait (100x60)
    raw = Image.open('sucai/╤╧╓╪╡─┐╦╨╟(Grave.png').convert('RGBA')
    top = raw.crop((0, 0, 100, 58))
    w, h = top.size
    px = top.load()

    # Remove card border frame & light sky/hill background outside the dark gnarled bark + green vines
    # Flood-fill from borders through any light / cyan / pale-green / white card-frame pixels
    visited = [[False] * w for _ in range(h)]
    stack = []
    for x in range(w):
        stack.extend(((x, 0), (x, 1), (x, h - 1), (x, h - 2)))
    for y in range(h):
        stack.extend(((0, y), (1, y), (w - 1, y), (w - 2, y)))

    def is_bg_pixel(r, g, b, a):
        if a < 40:
            return True
        lum = (r + g + b) / 3.0
        # Card frame grays/beiges near border or bright sky/green backdrop
        if lum > 152:
            return True
        # Pale green/cyan background inside the card icon
        if g > r + 18 and lum > 118:
            return True
        if b > r + 18 and lum > 115:
            return True
        return False

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        # Force border ring (within 7px of left/right or bottom>=52 or top<=5 except central vine tips)
        is_frame_band = (x <= 8 or x >= w - 9 or y >= 52 or (y <= 8 and (x < 22 or x > 74)))
        if is_frame_band or is_bg_pixel(r, g, b, a):
            px[x, y] = (0, 0, 0, 0)
            stack.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    # Strip any remaining isolated horizontal frame remnants at y <= 12
    for y in range(13):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and (r + g + b) / 3.0 > 135:
                px[x, y] = (0, 0, 0, 0)

    body = defringe_1bit_rgba(crop_nonempty(top, 2))
    body = body.resize((int(round(body.width * 1.12)), int(round(body.height * 1.22))), Image.LANCZOS)
    body = defringe_1bit_rgba(body)

    frames = []
    for i in range(12):
        fr = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
        phase = (i / 12.0) * math.tau
        dx = int(round(math.sin(phase * 2) * 1.5))
        dy = int(round(math.cos(phase) * 2.0))
        squash_w = body.width + (2 if i % 3 == 0 else 0)
        squash_h = body.height - (2 if i % 3 == 0 else 0)
        part = body.resize((squash_w, squash_h), Image.LANCZOS)
        bx = (96 - squash_w) // 2 + dx
        by = 84 - squash_h + dy
        fr.alpha_composite(part, (bx, by))

        # Subtle stone dust crumbs kicked up at bottom while gnawing tombstone
        d = ImageDraw.Draw(fr)
        for k in range(3):
            ang = phase + k * 2.1
            cx = 48 + int(math.cos(ang) * (16 + k * 5))
            cy = 83 + int(abs(math.sin(ang * 1.5)) * 6)
            d.rectangle((cx - 2, cy - 2, cx + 1, cy + 1), fill=(138, 142, 146, 255), outline=(32, 34, 38, 255))
        frames.append(defringe_1bit_rgba(fr))

    save_gif(frames, 'assets/plants/gravebuster.gif', duration=85)


def build_magnetshroom():
    """Build crisp animated active, cooldown, and sleep GIFs for Magnet-shroom."""
    p_costumes = TARGETS.get('植物', {})
    slp = load_newsucai_img(p_costumes['磁力菇睡觉1'])
    slp_crop = crop_nonempty(slp, 2) if slp else None

    def draw_magnet_frame(mode='active', phase=0.0):
        c, d = new_2x(84, 86)
        bob_y = int(round(math.sin(phase) * 3))
        tilt = math.sin(phase) * (4.0 if mode == 'active' else 1.5)

        # Green stem + purple ruffed mushroom cap base
        d.polygon([(76, 158), (92, 158), (88, 124), (80, 124)], fill=(98, 168, 58, 255), outline=(24, 26, 30, 255))
        d.line((76, 158, 92, 158), fill=(24, 26, 30, 255), width=3)
        d.ellipse((58, 112 + bob_y, 110, 138 + bob_y), fill=(154, 58, 168, 255), outline=(24, 26, 30, 255), width=4)
        d.ellipse((66, 116 + bob_y, 94, 126 + bob_y), fill=(196, 102, 208, 255))

        # U-shaped horseshoe magnet head on separate layer so it tilts naturally
        head, hd = new_2x(68, 62)
        red_main = (214, 42, 42, 255) if mode != 'cooldown' else (112, 92, 92, 255)
        red_hi = (246, 94, 86, 255) if mode != 'cooldown' else (142, 122, 122, 255)
        tip_col = (224, 232, 240, 255) if mode != 'cooldown' else (150, 156, 162, 255)

        # Outer U body
        hd.pieslice((14, 16, 122, 116), 0, 180, fill=red_main, outline=(24, 26, 30, 255), width=4)
        hd.rectangle((14, 24, 48, 70), fill=red_main, outline=(24, 26, 30, 255), width=4)
        hd.rectangle((88, 24, 122, 70), fill=red_main, outline=(24, 26, 30, 255), width=4)
        # Re-fill interior seam of U arms cleanly
        hd.rectangle((18, 58, 44, 76), fill=red_main)
        hd.rectangle((92, 58, 118, 76), fill=red_main)
        hd.arc((22, 28, 46, 96), 120, 220, fill=red_hi, width=5)

        # Inner U cutout
        hd.pieslice((48, 38, 88, 86), 0, 180, fill=(0, 0, 0, 0), outline=(24, 26, 30, 255), width=4)
        hd.rectangle((48, 16, 88, 64), fill=(0, 0, 0, 0))
        # Redraw inner vertical outlines
        hd.line((48, 24, 48, 64), fill=(24, 26, 30, 255), width=4)
        hd.line((88, 24, 88, 64), fill=(24, 26, 30, 255), width=4)

        # Silver magnetic pole tips
        hd.rectangle((14, 14, 48, 34), fill=tip_col, outline=(24, 26, 30, 255), width=4)
        hd.rectangle((88, 14, 122, 34), fill=tip_col, outline=(24, 26, 30, 255), width=4)
        hd.rectangle((18, 18, 32, 24), fill=(255, 255, 255, 220))
        hd.rectangle((92, 18, 106, 24), fill=(255, 255, 255, 220))

        # Eyes on magnet base
        ey = 88
        if mode == 'sleep':
            hd.arc((44, ey, 62, ey + 10), 10, 170, fill=(24, 26, 30, 255), width=4)
            hd.arc((74, ey, 92, ey + 10), 10, 170, fill=(24, 26, 30, 255), width=4)
        else:
            hd.ellipse((46, ey - 4, 60, ey + 12), fill=(255, 255, 255, 255), outline=(24, 26, 30, 255), width=3)
            hd.ellipse((76, ey - 4, 90, ey + 12), fill=(255, 255, 255, 255), outline=(24, 26, 30, 255), width=3)
            hd.ellipse((51, ey, 58, ey + 9), fill=(24, 26, 30, 255))
            hd.ellipse((81, ey, 88, ey + 9), fill=(24, 26, 30, 255))

        # Magnetic spark arc when active
        if mode == 'active' and math.sin(phase * 2) > 0.15:
            hd.line((48, 22, 62, 14, 72, 26, 88, 20), fill=(130, 245, 255, 255), width=4)

        rot_head = head.rotate(tilt, Image.BICUBIC, expand=False)
        c.alpha_composite(rot_head, (16, 6 + bob_y))
        return finish_2x(c, 84, 86)

    save_gif([draw_magnet_frame('active', i * math.tau / 10) for i in range(10)], 'assets/plants/magnetshroom.gif', 90)
    save_gif([draw_magnet_frame('cooldown', i * math.tau / 8) for i in range(8)], 'assets/plants/magnetshroom_cooldown.gif', 110)
    if slp_crop:
        slp_frames = []
        base_slp = defringe_1bit_rgba(slp_crop.resize((62, 82), Image.LANCZOS))
        for i in range(8):
            fr = Image.new('RGBA', (84, 86), (0, 0, 0, 0))
            dy = int(round(math.sin(i * math.tau / 8) * 1.5))
            fr.alpha_composite(base_slp, (11, 4 + dy))
            slp_frames.append(fr)
        save_gif(slp_frames, 'assets/plants/magnetshroom_sleep.gif', 120)
    else:
        save_gif([draw_magnet_frame('sleep', i * math.tau / 8) for i in range(8)], 'assets/plants/magnetshroom_sleep.gif', 120)


def build_and_defringe_all_plants():
    print('--- [2/4] Importing missing PVZ1 plants, fixing Grave Buster & Magnet-shroom, defringing all plants ---')
    sucai_imports = [
        ('sucai/Tallnut ╞╞╜Γ1(Tall.gif', 'assets/plants/tallnut_cracked1.gif'),
        ('sucai/Tallnut ╞╞╜Γ2(Tall.gif', 'assets/plants/tallnut_cracked2.gif'),
        ('sucai/plantern(Planter.gif', 'assets/plants/plantern.gif'),
        ('sucai/╧╔╚╦╒╞(Cactus).gif', 'assets/plants/cactus.gif'),
        ('sucai/═π╢╣(SplitPea).gif', 'assets/plants/splitpea.gif'),
        ('sucai/Spikerock.gif', 'assets/plants/spikerock.gif'),
        ('sucai/╝╙╠╪┴╓═π╢╣(GatlingPea.gif', 'assets/plants/gatlingpea.gif'),
        ('sucai/╦½╧≥╚╒┐√(TwinSunflow.gif', 'assets/plants/twinsunflower.gif'),
    ]
    for src, dst in sucai_imports:
        if os.path.exists(src):
            frs, dur = extract_frames(src)
            save_gif([defringe_1bit_rgba(f) for f in frs], dst, duration=dur)

    clean_gravebuster()
    build_magnetshroom()

    # Defringe every plant GIF in assets/plants/*.gif so night/fog levels have zero white fringes
    skip_already = {
        'tallnut_cracked1.gif', 'tallnut_cracked2.gif', 'plantern.gif', 'cactus.gif',
        'splitpea.gif', 'spikerock.gif', 'gatlingpea.gif', 'twinsunflower.gif',
        'gravebuster.gif', 'magnetshroom.gif', 'magnetshroom_cooldown.gif', 'magnetshroom_sleep.gif'
    }
    for path in sorted(glob.glob('assets/plants/*.gif')):
        bn = os.path.basename(path)
        if bn in skip_already:
            continue
        frs, dur = extract_frames(path)
        cleaned = [defringe_1bit_rgba(f) for f in frs]
        save_gif(cleaned, path, duration=dur)


# ============================================================================
# 3. Unified Authentic PVZ1 Seed Packet Builder (100x140)
# ============================================================================
def build_all_seed_cards():
    print('--- [3/4] Rebuilding ALL 100x140 seed packet cards cleanly ---')
    # Extract exact sun coin icon from card_sunflower.png (10..33, 108..131)
    ref = Image.open('assets/cards/card_sunflower.png').convert('RGBA')
    sun_coin = ref.crop((9, 109, 32, 132))
    font_cost = ImageFont.truetype(FONT_BOLD_PATH, 20)
    font_free = ImageFont.truetype(FONT_BOLD_PATH, 16)

    # Full catalog of all cards in assets/cards/ + newly unlocked plants
    cards_spec = [
        # World 1
        ('peashooter', 'assets/plants/peashooter.gif', 100, 'day'),
        ('sunflower', 'assets/plants/sunflower.gif', 50, 'day'),
        ('cherrybomb', 'assets/plants/cherrybomb.gif', 150, 'day'),
        ('wallnut', 'assets/plants/wallnut.gif', 50, 'day'),
        ('bowling_nut', 'assets/plants/wallnut.gif', 0, 'bowling'),
        ('rednut', 'assets/plants/wallnut_red.png', 0, 'bowling'),
        ('potatomine', 'assets/plants/potatomine_armed.gif', 25, 'day'),
        ('snowpea', 'assets/plants/snowpea.gif', 175, 'day'),
        ('chomper', 'assets/plants/chomper.gif', 150, 'day'),
        ('repeater', 'assets/plants/repeater.gif', 200, 'day'),
        # World 2
        ('puffshroom', 'assets/plants/puffshroom.gif', 0, 'night'),
        ('sunshroom', 'assets/plants/sunshroom_big.gif', 25, 'night'),
        ('fumeshroom', 'assets/plants/fumeshroom.gif', 75, 'night'),
        ('gravebuster', 'assets/plants/gravebuster.gif', 75, 'night'),
        ('coffeebean', 'assets/plants/coffeebean.gif', 75, 'day'),
        ('hypnoshroom', 'assets/plants/hypnoshroom.gif', 75, 'night'),
        ('scaredyshroom', 'assets/plants/scaredyshroom.gif', 25, 'night'),
        ('iceshroom', 'assets/plants/iceshroom.gif', 75, 'night'),
        ('doomshroom', 'assets/plants/doomshroom.gif', 125, 'night'),
        # World 3
        ('lilypad', 'assets/plants/lilypad.gif', 25, 'pool'),
        ('squash', 'assets/plants/squash.gif', 50, 'day'),
        ('threepeater', 'assets/plants/threepeater.gif', 325, 'day'),
        ('jalapeno', 'assets/plants/jalapeno.gif', 125, 'day'),
        ('spikeweed', 'assets/plants/spikeweed.gif', 100, 'day'),
        ('torchwood', 'assets/plants/torchwood.gif', 175, 'day'),
        ('tallnut', 'assets/plants/tallnut.gif', 125, 'day'),
        # World 4
        ('seashroom', 'assets/plants/seashroom.gif', 0, 'night_pool'),
        ('plantern', 'assets/plants/plantern.gif', 25, 'night'),
        ('cactus', 'assets/plants/cactus.gif', 125, 'day'),
        ('blover', 'assets/plants/blover.gif', 100, 'day'),
        ('splitpea', 'assets/plants/splitpea.gif', 125, 'day'),
        ('starfruit', 'assets/plants/starfruit.gif', 125, 'day'),
        ('pumpkin', 'assets/plants/pumpkin.gif', 125, 'day'),
        ('magnetshroom', 'assets/plants/magnetshroom.gif', 100, 'night'),
        # World 5 & Upgrades
        ('cabbagepult', 'assets/plants/cabbagepult.gif', 100, 'roof'),
        ('flowerpot', 'assets/plants/flowerpot.gif', 25, 'roof'),
        ('kernelpult', 'assets/plants/kernelpult.gif', 100, 'roof'),
        ('garlic', 'assets/plants/garlic.gif', 50, 'day'),
        ('melonpult', 'assets/plants/melonpult.gif', 300, 'roof'),
        ('gatlingpea', 'assets/plants/gatlingpea.gif', 250, 'day'),
        ('twinsunflower', 'assets/plants/twinsunflower.gif', 150, 'day'),
        ('spikerock', 'assets/plants/spikerock.gif', 125, 'day'),
    ]

    rebuilt_cards = []
    for cid, sprite_path, cost, theme in cards_spec:
        card = Image.new('RGBA', (100, 140), (0, 0, 0, 0))
        d = ImageDraw.Draw(card)

        # Outer beveled wood-brown seed packet frame (matching card_sunflower.png)
        d.rounded_rectangle((0, 0, 99, 139), radius=7, fill=(44, 28, 16, 255))
        d.rounded_rectangle((2, 2, 97, 137), radius=6, fill=(142, 114, 74, 255))
        d.rounded_rectangle((4, 4, 95, 135), radius=5, fill=(239, 232, 211, 255))

        # Portrait window background (7, 7, 92, 100) with subtle biome sky/turf gradient
        win = Image.new('RGBA', (86, 94), (0, 0, 0, 0))
        wd = ImageDraw.Draw(win)
        for y in range(94):
            t = y / 93.0
            if theme == 'night':
                r = int(48 + 30 * t)
                g = int(52 + 34 * t)
                b = int(96 + 38 * t)
            elif theme == 'night_pool':
                r = int(38 + 24 * t)
                g = int(68 + 46 * t)
                b = int(112 + 48 * t)
            elif theme == 'pool':
                r = int(188 - 30 * t)
                g = int(236 - 14 * t)
                b = int(248 - 10 * t)
            elif theme == 'roof':
                r = int(224 + 14 * t)
                g = int(236 - 12 * t)
                b = int(245 - 38 * t)
            else:
                r = int(224 - 10 * t)
                g = int(242 - 6 * t)
                b = int(220 - 16 * t)
            wd.line((0, y, 85, y), fill=(r, g, b, 255))
        # Subtle ground band at bottom of portrait window
        if theme in ('night', 'night_pool'):
            wd.rectangle((0, 74, 85, 93), fill=(44, 72, 68, 160) if theme == 'night' else (32, 98, 138, 175))
        elif theme == 'pool':
            wd.rectangle((0, 68, 85, 93), fill=(86, 188, 232, 165))
        elif theme == 'roof':
            wd.rectangle((0, 74, 85, 93), fill=(196, 112, 74, 135))
        else:
            wd.rectangle((0, 74, 85, 93), fill=(168, 216, 148, 145))

        card.alpha_composite(win, (7, 7))
        border_col = (110, 122, 168, 255) if 'night' in theme else (154, 192, 146, 255)
        d.rounded_rectangle((7, 7, 92, 100), radius=4, outline=border_col, width=1)

        # Load best representative frame of plant sprite
        if os.path.exists(sprite_path):
            sp_im = Image.open(sprite_path)
            # Pick mid-idle frame for liveliest pose
            if getattr(sp_im, 'n_frames', 1) > 2:
                sp_im.seek(min(2, sp_im.n_frames - 1))
            sp_rgba = defringe_1bit_rgba(sp_im.convert('RGBA'))
            sp_crop = crop_nonempty(sp_rgba, 1)
            max_w, max_h = 74, 78
            if cid in ('spikeweed', 'spikerock'):
                max_w, max_h = 76, 44
            elif cid in ('lilypad', 'flowerpot'):
                max_w, max_h = 72, 62
            scale = min(max_w / max(1, sp_crop.width), max_h / max(1, sp_crop.height), 1.35)
            nw = max(1, int(round(sp_crop.width * scale)))
            nh = max(1, int(round(sp_crop.height * scale)))
            sp_scaled = sp_crop.resize((nw, nh), Image.LANCZOS)
            px_x = 7 + (86 - nw) // 2
            px_y = 7 + (90 - nh) // 2 + (8 if cid in ('spikeweed', 'spikerock', 'lilypad', 'flowerpot') else 2)
            card.alpha_composite(sp_scaled, (px_x, px_y))

        # Bottom cream price tag bar (7, 104, 92, 133)
        d.rounded_rectangle((7, 104, 92, 133), radius=4, fill=(214, 198, 162, 255), outline=(124, 102, 68, 255), width=1)
        card.alpha_composite(sun_coin, (10, 107))

        label = '0' if theme == 'bowling' else str(cost)
        fnt = font_free if len(label) >= 4 else font_cost
        tb = d.textbbox((0, 0), label, font=fnt)
        tw = tb[2] - tb[0]
        th = tb[3] - tb[1]
        tx = 88 - tw - tb[0]
        ty = 104 + (29 - th) // 2 - tb[1]
        # Subtle light emboss + crisp dark ink text
        d.text((tx, ty + 1), label, font=fnt, fill=(245, 238, 220, 200))
        d.text((tx, ty), label, font=fnt, fill=(22, 16, 10, 255))

        out_path = f'assets/cards/card_{cid}.png'
        card.save(out_path)
        rebuilt_cards.append((cid, card))

    # Save contact sheet of all 42 rebuilt cards for visual verification
    cols = 9
    rows = math.ceil(len(rebuilt_cards) / cols)
    sheet = Image.new('RGBA', (cols * 110 + 16, rows * 160 + 16), (44, 30, 22, 255))
    sd = ImageDraw.Draw(sheet)
    lbl_font = ImageFont.truetype(FONT_BOLD_PATH, 11)
    for idx, (cid, im) in enumerate(rebuilt_cards):
        gx = 12 + (idx % cols) * 110
        gy = 10 + (idx // cols) * 160
        sheet.alpha_composite(im, (gx, gy))
        sd.text((gx + 2, gy + 142), cid[:13], font=lbl_font, fill=(255, 236, 179, 255))
    sheet.save(os.path.join(SCRATCH_DIR, 'all_cards_rebuilt_verified.png'))
    print(f'Rebuilt {len(rebuilt_cards)} seed cards -> all_cards_rebuilt_verified.png')


# ============================================================================
# 4. World 3 / World 4 / World 5 Authentic Animated Zombie GIFs
# ============================================================================
def build_world345_zombies():
    print('--- [4/4] Building World 3 (Pool), World 4 (Fog), and World 5 (Roof) zombie sprites ---')
    z_walk_raw, _ = extract_frames('assets/zombies/zombie_walk.gif')
    z_atk_raw, _ = extract_frames('assets/zombies/zombie_attack.gif')
    # Sample 10 smooth frames from base zombie (166x144, feet ~ y=139, center ~ x=105)
    z_walk = [z_walk_raw[int(i * len(z_walk_raw) / 10)] for i in range(10)]
    z_atk = [z_atk_raw[int(i * len(z_atk_raw) / 10)] for i in range(10)]

    b_costumes = TARGETS.get('子弹&掉落物&饰品&动画', {})
    imp_head_raw = load_newsucai_img(b_costumes['小鬼僵尸头颅'])
    imp_head = defringe_1bit_rgba(crop_nonempty(imp_head_raw, 1)) if imp_head_raw else None
    z_head_raw = load_newsucai_img(b_costumes['普通僵尸头颅'])
    z_head_hd = defringe_1bit_rgba(crop_nonempty(z_head_raw, 1)) if z_head_raw else None
    fb_body_frames, _ = extract_frames('assets/zombies/football_nohelmet_walk.gif')

    INK = (24, 26, 30, 255)
    previews = []

    # ------------------------------------------------------------------
    # (A) DUCKY TUBE ZOMBIE (鸭子救生圈僵尸 - World 3/4 Water Lanes)
    # ------------------------------------------------------------------
    def make_ducky(base_frames):
        out = []
        for idx, bf in enumerate(base_frames):
            bob = int(round(math.sin(idx * math.tau / len(base_frames)) * 2))
            c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
            # Clip zombie below waist (y=106) so lower legs are submerged inside tube
            upper = bf.crop((0, 0, 166, 106))
            c.alpha_composite(upper, (0, 10 + bob))

            ov, d = new_2x(166, 144)
            wy = (112 + bob) * 2
            # Blue water ripple ellipse under tube
            d.ellipse((136, wy + 12, 286, wy + 40), fill=(68, 178, 236, 195), outline=(220, 248, 255, 235), width=3)
            # Yellow inflatable rubber ducky ring around waist
            d.ellipse((150, wy - 8, 272, wy + 28), fill=(250, 212, 38, 255), outline=INK, width=4)
            d.arc((162, wy - 2, 260, wy + 16), 15, 165, fill=(255, 242, 130, 255), width=4)
            # Cute rubber duck head facing left at front of ring
            d.ellipse((134, wy - 34, 178, wy + 6), fill=(252, 218, 42, 255), outline=INK, width=4)
            # Orange duck bill
            d.polygon([(118, wy - 16), (140, wy - 24), (140, wy - 8)], fill=(242, 126, 28, 255), outline=INK)
            d.line((118, wy - 16, 140, wy - 24), fill=INK, width=3)
            d.line((118, wy - 16, 140, wy - 8), fill=INK, width=3)
            # Glossy black button eye
            d.ellipse((146, wy - 24, 156, wy - 14), fill=INK)
            d.ellipse((148, wy - 22, 152, wy - 18), fill=(255, 255, 255, 255))

            c.alpha_composite(finish_2x(ov, 166, 144))
            out.append(defringe_1bit_rgba(c))
        return out

    ducky_w = make_ducky(z_walk)
    ducky_a = make_ducky(z_atk)
    save_gif(ducky_w, 'assets/zombies/ducky_walk.gif', 95)
    save_gif(ducky_a, 'assets/zombies/ducky_attack.gif', 90)
    previews.append(('ducky', ducky_w[0]))

    # ------------------------------------------------------------------
    # (B) SNORKEL ZOMBIE (潜水僵尸 - swims low underwater, surfaces to bite)
    # ------------------------------------------------------------------
    snorkel_swim = []
    for i in range(8):
        phase = i * math.tau / 8
        bob = int(round(math.sin(phase) * 2))
        c, d = new_2x(166, 144)
        wy = (118 + bob) * 2
        # Water foam ripples
        d.ellipse((128, wy + 2, 292, wy + 34), fill=(52, 162, 224, 210), outline=(215, 246, 255, 240), width=3)
        # Submerged zombie back/head crown barely peeking out
        d.pieslice((166, wy - 24, 236, wy + 22), 180, 360, fill=(116, 144, 118, 255), outline=INK, width=4)
        # Goggles strap & cyan lens peeking at front
        d.rounded_rectangle((158, wy - 14, 190, wy + 2), radius=5, fill=(78, 218, 242, 255), outline=INK, width=3)
        # Iconic green J-shaped snorkel tube rising out of water + air bubbles
        d.line((182, wy - 6, 182, wy - 56), fill=(46, 192, 86, 255), width=9)
        d.line((182, wy - 6, 182, wy - 56), fill=INK, width=2)
        d.rounded_rectangle((176, wy - 60, 190, wy - 6), radius=5, fill=(46, 192, 86, 255), outline=INK, width=4)
        d.ellipse((174, wy - 66, 192, wy - 54), fill=(242, 196, 38, 255), outline=INK, width=3)
        # Small air bubble
        by = wy - 74 - int((i % 4) * 7)
        d.ellipse((178, by, 188, by + 10), fill=(215, 248, 255, 230), outline=INK, width=2)
        snorkel_swim.append(finish_2x(c, 166, 144))
    save_gif(snorkel_swim, 'assets/zombies/snorkel_swim.gif', 95)

    snorkel_atk = []
    for idx, bf in enumerate(z_atk):
        bob = int(round(math.sin(idx * math.tau / len(z_atk)) * 2))
        c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        c.alpha_composite(bf.crop((0, 0, 166, 100)), (0, 22 + bob))
        ov, d = new_2x(166, 144)
        wy = (118 + bob) * 2
        d.ellipse((142, wy, 276, wy + 28), fill=(58, 168, 228, 205), outline=(220, 248, 255, 235), width=3)
        # Snorkel goggles + green breathing tube on surfaced zombie head
        hy = (56 + bob) * 2
        d.rounded_rectangle((154, hy + 8, 204, hy + 28), radius=6, fill=(82, 224, 248, 235), outline=INK, width=4)
        d.rounded_rectangle((204, hy - 22, 216, hy + 34), radius=4, fill=(46, 192, 86, 255), outline=INK, width=3)
        c.alpha_composite(finish_2x(ov, 166, 144))
        snorkel_atk.append(defringe_1bit_rgba(c))
    save_gif(snorkel_atk, 'assets/zombies/snorkel_attack.gif', 90)
    previews.append(('snorkel', snorkel_swim[0]))

    # ------------------------------------------------------------------
    # (C) DOLPHIN RIDER ZOMBIE (海豚骑士僵尸 - fast water vault)
    # ------------------------------------------------------------------
    dolphin_ride = []
    for i in range(8):
        phase = i * math.tau / 8
        bob = int(round(math.sin(phase) * 3))
        c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        rider = z_walk[i % len(z_walk)].crop((0, 0, 166, 100))
        c.alpha_composite(rider, (6, 8 + bob))
        ov, d = new_2x(166, 144)
        dy = (108 + bob) * 2
        # Sleek blue-grey cartoon dolphin body + dorsal fin + snout + smile
        d.ellipse((104, dy - 16, 286, dy + 28), fill=(92, 152, 204, 255), outline=INK, width=4)
        d.pieslice((112, dy - 4, 272, dy + 26), 0, 180, fill=(214, 236, 250, 255))
        # Snout beak
        d.ellipse((84, dy + 2, 126, dy + 20), fill=(92, 152, 204, 255), outline=INK, width=4)
        # Dorsal fin
        d.polygon([(202, dy - 14), (226, dy - 42), (242, dy - 12)], fill=(76, 134, 188, 255), outline=INK)
        d.line((202, dy - 14, 226, dy - 42, 242, dy - 12), fill=INK, width=4)
        # Dolphin eye + white wake spray
        d.ellipse((122, dy - 6, 132, dy + 4), fill=INK)
        d.ellipse((124, dy - 4, 128, dy), fill=(255, 255, 255, 255))
        d.arc((96, dy + 16, 300, dy + 40), 180, 360, fill=(228, 250, 255, 245), width=4)
        c.alpha_composite(finish_2x(ov, 166, 144))
        dolphin_ride.append(defringe_1bit_rgba(c))
    save_gif(dolphin_ride, 'assets/zombies/dolphin_ride.gif', 75)
    save_gif(dolphin_ride, 'assets/zombies/dolphin_jump.gif', 75)

    dolphin_swim = []
    for idx, bf in enumerate(z_walk):
        bob = int(round(math.sin(idx * math.tau / len(z_walk)) * 2))
        c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        c.alpha_composite(bf.crop((0, 0, 166, 98)), (0, 24 + bob))
        ov, d = new_2x(166, 144)
        wy = (120 + bob) * 2
        d.ellipse((142, wy, 276, wy + 26), fill=(64, 174, 232, 205), outline=(220, 248, 255, 240), width=3)
        c.alpha_composite(finish_2x(ov, 166, 144))
        dolphin_swim.append(defringe_1bit_rgba(c))
    save_gif(dolphin_swim, 'assets/zombies/dolphin_swim.gif', 95)
    save_gif(snorkel_atk, 'assets/zombies/dolphin_attack.gif', 90)
    previews.append(('dolphin', dolphin_ride[0]))

    # ------------------------------------------------------------------
    # (D) ZOMBONI (雪橇车僵尸 - 196x160 ice machine, popped by Spikeweed)
    # ------------------------------------------------------------------
    zomboni_frames = []
    for i in range(8):
        phase = i * math.tau / 8
        rumble = 1 if i % 2 == 0 else 0
        c = Image.new('RGBA', (196, 160), (0, 0, 0, 0))
        # Driver zombie torso sitting in rear cab with red/blue knit beanie
        drv = z_walk[i % len(z_walk)].crop((58, 18, 148, 96))
        c.alpha_composite(drv, (92, 16 + rumble))

        ov, d = new_2x(196, 160)
        ry = rumble * 2
        # Knit winter beanie on driver's head
        d.pieslice((230, 32 + ry, 294, 78 + ry), 180, 360, fill=(208, 44, 44, 255), outline=INK, width=4)
        d.rectangle((228, 52 + ry, 296, 64 + ry), fill=(52, 118, 212, 255), outline=INK, width=3)
        d.ellipse((254, 18 + ry, 274, 36 + ry), fill=(245, 214, 56, 255), outline=INK, width=3)

        # Steering wheel
        d.line((212, 128 + ry, 230, 156 + ry), fill=INK, width=5)
        d.ellipse((198, 116 + ry, 226, 138 + ry), outline=INK, width=4)

        # Iconic red & white Zomboni hood + chrome grill + rear ice conditioner
        d.rounded_rectangle((36, 148 + ry, 344, 246 + ry), radius=14, fill=(214, 42, 38, 255), outline=INK, width=5)
        # White racing stripe & upper hood highlight
        d.rectangle((42, 184 + ry, 338, 206 + ry), fill=(242, 246, 250, 255), outline=INK, width=3)
        d.rounded_rectangle((52, 156 + ry, 210, 174 + ry), radius=6, fill=(248, 102, 92, 255))
        # Chrome front radiator grille + Z badge
        d.rounded_rectangle((32, 164 + ry, 62, 234 + ry), radius=6, fill=(198, 212, 224, 255), outline=INK, width=4)
        for gy in range(174, 228, 10):
            d.line((38, gy + ry, 56, gy + ry), fill=INK, width=3)
        # Rear ice-smoothing blade + frosty mist
        d.rectangle((334, 218 + ry, 372, 256 + ry), fill=(176, 194, 210, 255), outline=INK, width=4)
        d.ellipse((342, 248, 386, 274), fill=(210, 244, 255, 190))

        # Two heavy rubber tires with rotating hubcaps
        for wx in (104, 276):
            d.ellipse((wx - 36, 220, wx + 36, 292), fill=(42, 46, 52, 255), outline=INK, width=5)
            d.ellipse((wx - 18, 238, wx + 18, 274), fill=(198, 208, 218, 255), outline=INK, width=3)
            ang = phase + (0.6 if wx > 200 else 0)
            sx = int(math.cos(ang) * 14)
            sy = int(math.sin(ang) * 14)
            d.line((wx - sx, 256 - sy, wx + sx, 256 + sy), fill=INK, width=3)

        c.alpha_composite(finish_2x(ov, 196, 160))
        zomboni_frames.append(defringe_1bit_rgba(c))
    save_gif(zomboni_frames, 'assets/zombies/zomboni_drive.gif', 80)
    previews.append(('zomboni', zomboni_frames[0]))

    # ------------------------------------------------------------------
    # (E) JACK-IN-THE-BOX ZOMBIE (小丑玩偶匣僵尸 - World 4 Fog)
    # ------------------------------------------------------------------
    def make_jack(base_frames):
        out = []
        for idx, bf in enumerate(base_frames):
            phase = idx * math.tau / len(base_frames)
            c = bf.copy()
            ov, d = new_2x(166, 144)
            # Wild white Einstein/jester hair tufts flanking actual head (x=66..108 -> 132..216 in 2x)
            d.polygon([(196, 54), (226, 38), (214, 66), (236, 66), (210, 84)], fill=(236, 240, 245, 255), outline=INK)
            d.polygon([(142, 56), (118, 42), (132, 68)], fill=(236, 240, 245, 255), outline=INK)
            # Colorful metal Jack-in-the-Box held in hands with rotating crank
            bx, by = 132, 152 + int(round(math.sin(phase * 2) * 3))
            d.rounded_rectangle((bx, by, bx + 48, by + 48), radius=5, fill=(168, 54, 204, 255), outline=INK, width=4)
            d.polygon([(bx + 24, by + 6), (bx + 42, by + 24), (bx + 24, by + 42), (bx + 6, by + 24)],
                      fill=(248, 206, 42, 255), outline=INK)
            cx = bx + 24 + int(math.cos(phase * 2) * 14)
            cy = by - 8 + int(math.sin(phase * 2) * 8)
            d.line((bx + 24, by + 4, cx, cy), fill=(210, 220, 230, 255), width=4)
            d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=(232, 62, 52, 255), outline=INK, width=2)
            c.alpha_composite(finish_2x(ov, 166, 144))
            out.append(defringe_1bit_rgba(c))
        return out

    jack_w = make_jack(z_walk)
    jack_a = make_jack(z_atk)
    save_gif(jack_w, 'assets/zombies/jack_walk.gif', 70)
    save_gif(jack_a, 'assets/zombies/jack_attack.gif', 75)
    jb, jbd = new_2x(48, 48)
    jbd.rounded_rectangle((14, 18, 80, 82), radius=8, fill=(168, 54, 204, 255), outline=INK, width=5)
    jbd.polygon([(47, 26), (72, 50), (47, 74), (22, 50)], fill=(248, 206, 42, 255), outline=INK)
    finish_2x(jb, 48, 48).save('assets/zombies/jackbox_drop.png')
    previews.append(('jackinthebox', jack_w[0]))

    # ------------------------------------------------------------------
    # (F) BALLOON ZOMBIE (气球僵尸 - 166x176 floating on red balloon)
    # ------------------------------------------------------------------
    balloon_frames = []
    for i in range(10):
        phase = i * math.tau / 10
        sway_x = int(round(math.sin(phase) * 3))
        bob_y = int(round(math.cos(phase) * 4))
        c = Image.new('RGBA', (166, 176), (0, 0, 0, 0))
        body = z_walk[i % len(z_walk)]
        c.alpha_composite(body, (sway_x, 30 + bob_y))

        ov, d = new_2x(166, 176)
        sx = sway_x * 2
        by = bob_y * 2
        # Red & yellow propeller beanie centered on head (x=144..204 in 2x)
        d.pieslice((146 + sx, 96 + by, 206 + sx, 130 + by), 180, 360, fill=(228, 48, 42, 255), outline=INK, width=4)
        prop_w = 24 if i % 2 == 0 else 8
        d.ellipse((176 + sx - prop_w, 88 + by, 176 + sx + prop_w, 96 + by), fill=(250, 218, 46, 255), outline=INK, width=2)
        d.line((192 + sx, 94 + by, 196 + sx, 174 + by), fill=(235, 238, 242, 255), width=3)
        d.ellipse((152 + sx, 6 + by, 232 + sx, 96 + by), fill=(228, 38, 38, 255), outline=INK, width=4)
        d.polygon([(186 + sx, 96 + by), (198 + sx, 96 + by), (192 + sx, 104 + by)], fill=(208, 32, 32, 255), outline=INK)
        d.ellipse((164 + sx, 18 + by, 186 + sx, 46 + by), fill=(255, 138, 138, 225))
        c.alpha_composite(finish_2x(ov, 166, 176))
        balloon_frames.append(defringe_1bit_rgba(c))
    save_gif(balloon_frames, 'assets/zombies/balloon_fly.gif', 85)
    previews.append(('balloon', balloon_frames[0]))

    # ------------------------------------------------------------------
    # (G) DIGGER ZOMBIE (矿工僵尸 - tunnels underground, surfaces & walks right)
    # ------------------------------------------------------------------
    digger_dig = []
    for i in range(8):
        phase = i * math.tau / 8
        c, d = new_2x(166, 144)
        gy = 242
        for k, (ox, r) in enumerate([(-34, 24), (-10, 30), (18, 28), (42, 22)]):
            jit = int(round(math.sin(phase * 2 + k) * 4))
            d.pieslice((206 + ox - r, gy - r + jit, 206 + ox + r, gy + r + jit), 180, 360,
                       fill=(124, 82, 46, 255), outline=INK, width=4)
        d.pieslice((182, gy - 44, 230, gy - 8), 180, 360, fill=(246, 204, 36, 255), outline=INK, width=4)
        px_ang = phase * 2
        tx = 166 + int(math.cos(px_ang) * 18)
        ty = gy - 26 + int(math.sin(px_ang) * 14)
        d.line((182, gy - 18, tx, ty), fill=(186, 198, 210, 255), width=5)
        digger_dig.append(finish_2x(c, 166, 144))
    save_gif(digger_dig, 'assets/zombies/digger_dig.gif', 75)

    def make_digger_surface(base_frames, with_pick=True):
        out = []
        for idx, bf in enumerate(base_frames):
            phase = idx * math.tau / len(base_frames)
            c = bf.copy()
            ov, d = new_2x(166, 144)
            # Yellow miner hard-hat + headlamp fitted squarely onto zombie crown (x=136..212 in 2x)
            d.pieslice((138, 34, 212, 86), 180, 360, fill=(246, 204, 36, 255), outline=INK, width=4)
            d.rounded_rectangle((128, 56, 218, 66), radius=4, fill=(232, 186, 24, 255), outline=INK, width=3)
            d.ellipse((136, 42, 154, 60), fill=(255, 248, 170, 255), outline=INK, width=3)
            if with_pick:
                sw = int(round(math.sin(phase) * 12))
                d.line((150, 168, 118, 122 + sw), fill=(154, 98, 48, 255), width=6)
                d.arc((96, 102 + sw, 146, 148 + sw), 200, 340, fill=(192, 206, 220, 255), width=7)
            c.alpha_composite(finish_2x(ov, 166, 144))
            out.append(defringe_1bit_rgba(c))
        return out

    digger_w = make_digger_surface(z_walk, True)
    digger_a = make_digger_surface(z_atk, True)
    save_gif(digger_w, 'assets/zombies/digger_walk.gif', 90)
    save_gif(digger_a, 'assets/zombies/digger_attack.gif', 85)
    pk, pkd = new_2x(48, 48)
    pkd.line((24, 80, 70, 24), fill=(154, 98, 48, 255), width=7)
    pkd.arc((36, 12, 88, 56), 200, 345, fill=(196, 210, 224, 255), width=8)
    finish_2x(pk, 48, 48).save('assets/zombies/pickaxe_drop.png')
    previews.append(('digger', digger_w[0]))

    # ------------------------------------------------------------------
    # (H) POGO ZOMBIE (跳跳僵尸 - bounces over plants on metal pogo stick)
    # ------------------------------------------------------------------
    pogo_frames = []
    for i in range(8):
        phase = i * math.tau / 8
        hop = int(round(abs(math.sin(phase)) * 18))
        c = Image.new('RGBA', (166, 156), (0, 0, 0, 0))
        c.alpha_composite(z_walk[0], (0, 6 - hop))
        ov, d = new_2x(166, 156)
        hy = hop * 2
        # Crash helmet fitted squarely on zombie head (x=138..212 in 2x)
        d.pieslice((138, 44 - hy, 212, 94 - hy), 180, 360, fill=(238, 242, 246, 255), outline=INK, width=4)
        d.line((152, 50 - hy, 198, 50 - hy), fill=(224, 42, 38, 255), width=5)
        px = 154
        d.line((px - 16, 152 - hy, px + 16, 152 - hy), fill=INK, width=5)
        d.rectangle((px - 5, 152 - hy, px + 5, 268 - hy // 2), fill=(218, 44, 38, 255), outline=INK, width=3)
        d.rectangle((px - 14, 244 - hy, px + 14, 252 - hy), fill=(196, 206, 216, 255), outline=INK, width=3)
        for sy in range(254 - hy, 294, 8):
            d.line((px - 8, sy, px + 8, sy + 4), fill=(192, 204, 216, 255), width=3)
        d.ellipse((px - 8, 292, px + 8, 306), fill=(46, 50, 56, 255), outline=INK, width=3)
        c.alpha_composite(finish_2x(ov, 166, 156))
        pogo_frames.append(defringe_1bit_rgba(c))
    save_gif(pogo_frames, 'assets/zombies/pogo_bounce.gif', 70)
    pg, pgd = new_2x(48, 48)
    pgd.line((26, 20, 68, 20), fill=INK, width=5)
    pgd.rectangle((43, 20, 53, 84), fill=(218, 44, 38, 255), outline=INK, width=3)
    finish_2x(pg, 48, 48).save('assets/zombies/pogo_drop.png')
    previews.append(('pogo', pogo_frames[2]))

    # ------------------------------------------------------------------
    # (I) BUNGEE ZOMBIE (蹦极僵尸 - World 5 Roof sky ambusher)
    # ------------------------------------------------------------------
    bungee_frames = []
    for i in range(8):
        phase = i * math.tau / 8
        stretch = int(round(math.sin(phase) * 4))
        c, d = new_2x(166, 180)
        d.line((210, 0, 210, 124 + stretch), fill=(238, 232, 214, 255), width=6)
        d.line((207, 0, 207, 124 + stretch), fill=INK, width=2)
        d.line((213, 0, 213, 124 + stretch), fill=INK, width=2)
        zy = 120 + stretch
        d.rounded_rectangle((192, zy - 6, 208, zy + 24), radius=5, fill=(52, 56, 64, 255), outline=INK, width=4)
        d.rounded_rectangle((212, zy - 6, 228, zy + 24), radius=5, fill=(52, 56, 64, 255), outline=INK, width=4)
        d.rounded_rectangle((182, zy + 22, 238, zy + 96), radius=12, fill=(216, 42, 38, 255), outline=INK, width=4)
        d.polygon([(188, zy + 36), (210, zy + 74), (232, zy + 36)], fill=(250, 212, 42, 255), outline=INK)
        reach = int(round(math.cos(phase) * 8))
        d.line((186, zy + 82, 162, zy + 144 + reach), fill=(216, 42, 38, 255), width=12)
        d.line((234, zy + 82, 258, zy + 144 + reach), fill=(216, 42, 38, 255), width=12)
        d.ellipse((152, zy + 138 + reach, 172, zy + 158 + reach), fill=(128, 158, 126, 255), outline=INK, width=3)
        d.ellipse((248, zy + 138 + reach, 268, zy + 158 + reach), fill=(128, 158, 126, 255), outline=INK, width=3)
        fr1x = finish_2x(c, 166, 180)
        if z_head_hd:
            hd = z_head_hd.resize((42, 44), Image.LANCZOS)
            fr1x.alpha_composite(hd, (84, 98 + stretch // 2))
        bungee_frames.append(defringe_1bit_rgba(fr1x))
    save_gif(bungee_frames, 'assets/zombies/bungee_drop.gif', 80)
    previews.append(('bungee', bungee_frames[0]))

    # ------------------------------------------------------------------
    # (J) LADDER ZOMBIE (扶梯僵尸 - carries metallic aluminum ladder shield)
    # ------------------------------------------------------------------
    def make_ladder(base_frames):
        out = []
        for idx, bf in enumerate(base_frames):
            bob = int(round(math.sin(idx * math.tau / len(base_frames)) * 2))
            c = bf.copy()
            ov, d = new_2x(166, 144)
            # Tilted tall metallic aluminum 5-rung ladder held in front of zombie
            lx0, ly0 = 134, 48 + bob * 2
            lx1, ly1 = 176, 266 + bob * 2
            # Two side rails
            d.line((lx0, ly0, lx0 + 14, ly1), fill=(204, 216, 228, 255), width=9)
            d.line((lx0, ly0, lx0 + 14, ly1), fill=INK, width=2)
            d.line((lx1, ly0 + 6, lx1 + 14, ly1), fill=(176, 190, 204, 255), width=9)
            d.line((lx1, ly0 + 6, lx1 + 14, ly1), fill=INK, width=2)
            # 5 horizontal rungs
            for r in range(5):
                t = (r + 0.5) / 5.0
                rx0 = int(lx0 + 14 * t)
                ry0 = int(ly0 + (ly1 - ly0) * t)
                rx1 = int(lx1 + 14 * t)
                ry1 = int(ly0 + 6 + (ly1 - ly0 - 6) * t)
                d.line((rx0, ry0, rx1, ry1), fill=(225, 235, 245, 255), width=7)
                d.line((rx0, ry0, rx1, ry1), fill=INK, width=2)
            c.alpha_composite(finish_2x(ov, 166, 144))
            out.append(defringe_1bit_rgba(c))
        return out

    ladder_w = make_ladder(z_walk)
    ladder_a = make_ladder(z_atk)
    save_gif(ladder_w, 'assets/zombies/ladder_walk.gif', 80)
    save_gif(ladder_a, 'assets/zombies/ladder_attack.gif', 85)
    ld, ldd = new_2x(48, 54)
    ldd.line((24, 10, 28, 98), fill=(204, 216, 228, 255), width=7)
    ldd.line((64, 10, 68, 98), fill=(184, 198, 212, 255), width=7)
    for ry in (26, 48, 70, 90):
        ldd.line((25, ry, 66, ry), fill=(225, 235, 245, 255), width=5)
    finish_2x(ld, 48, 54).save('assets/zombies/ladder_drop.png')
    previews.append(('ladder', ladder_w[0]))

    # ------------------------------------------------------------------
    # (K) CATAPULT ZOMBIE (投石车僵尸 - 196x164 basketball launcher on Roof)
    # ------------------------------------------------------------------
    catapult_frames = []
    for i in range(8):
        phase = i * math.tau / 8
        rumble = 1 if i % 2 == 0 else 0
        c = Image.new('RGBA', (196, 164), (0, 0, 0, 0))
        drv = z_walk[i % len(z_walk)].crop((58, 18, 148, 98))
        c.alpha_composite(drv, (42, 28 + rumble))
        ov, d = new_2x(196, 164)
        ry = rumble * 2
        # Timber & red iron catapult chassis
        d.rounded_rectangle((46, 194 + ry, 348, 248 + ry), radius=10, fill=(164, 96, 46, 255), outline=INK, width=5)
        d.rectangle((56, 206 + ry, 338, 224 + ry), fill=(198, 48, 38, 255), outline=INK, width=3)
        # Rear basketball basket + stacked orange basketballs
        d.rounded_rectangle((246, 150 + ry, 344, 198 + ry), radius=6, fill=(122, 74, 38, 255), outline=INK, width=4)
        for bx, by in ((266, 142), (304, 142), (285, 118)):
            d.ellipse((bx - 18, by + ry - 18, bx + 18, by + ry + 18), fill=(235, 112, 28, 255), outline=INK, width=3)
        # Pivoting catapult arm + cup holding ready basketball
        arm_ang = math.sin(phase) * 0.16
        ax = int(300 + math.cos(-2.45 + arm_ang) * 145)
        ay = int(196 + ry + math.sin(-2.45 + arm_ang) * 145)
        d.line((252, 196 + ry, ax, ay), fill=(172, 108, 52, 255), width=12)
        d.line((252, 196 + ry, ax, ay), fill=INK, width=3)
        d.pieslice((ax - 28, ay - 22, ax + 28, ay + 24), 0, 180, fill=(138, 84, 40, 255), outline=INK, width=4)
        d.ellipse((ax - 20, ay - 36, ax + 20, ay + 4), fill=(238, 116, 28, 255), outline=INK, width=3)
        # Heavy wooden/iron wheels
        for wx in (102, 284):
            d.ellipse((wx - 34, 226, wx + 34, 294), fill=(62, 54, 48, 255), outline=INK, width=5)
            d.ellipse((wx - 22, 238, wx + 22, 282), fill=(168, 112, 58, 255), outline=INK, width=3)
            sx = int(math.cos(phase) * 18)
            sy = int(math.sin(phase) * 18)
            d.line((wx - sx, 260 - sy, wx + sx, 260 + sy), fill=INK, width=3)
        c.alpha_composite(finish_2x(ov, 196, 164))
        catapult_frames.append(defringe_1bit_rgba(c))
    save_gif(catapult_frames, 'assets/zombies/catapult_drive.gif', 85)
    previews.append(('catapult', catapult_frames[0]))

    # ------------------------------------------------------------------
    # (L) IMP (小鬼僵尸 - thrown forward by Gargantuar)
    # ------------------------------------------------------------------
    def make_imp(is_attack=False):
        out = []
        for i in range(8):
            phase = i * math.tau / 8
            c, d = new_2x(166, 144)
            step = int(round(math.sin(phase) * 12))
            reach = int(round(math.cos(phase * 2) * 8)) if is_attack else int(round(math.cos(phase) * 6))
            # Stubby blue pants + tiny brown shoes near ground y=138 (276 in 2x)
            d.line((202, 238, 194 - step, 272), fill=(58, 88, 138, 255), width=11)
            d.line((218, 238, 226 + step, 272), fill=(58, 88, 138, 255), width=11)
            d.ellipse((176 - step, 266, 204 - step, 282), fill=(76, 52, 36, 255), outline=INK, width=3)
            d.ellipse((212 + step, 266, 240 + step, 282), fill=(76, 52, 36, 255), outline=INK, width=3)
            # Brown tattered vest torso
            d.rounded_rectangle((188, 196, 232, 246), radius=10, fill=(106, 78, 52, 255), outline=INK, width=4)
            # Tiny reaching green arms
            d.line((194, 210, 164 - reach, 220 - reach // 2), fill=(132, 162, 124, 255), width=10)
            d.ellipse((154 - reach, 212 - reach // 2, 170 - reach, 228 - reach // 2), fill=(132, 162, 124, 255), outline=INK, width=3)
            small_c = finish_2x(c, 166, 144)
            if imp_head:
                hd = imp_head.resize((44, 46), Image.LANCZOS)
                small_c.alpha_composite(hd, (80, 62 + int(round(math.sin(phase * 2) * 1.5))))
            out.append(defringe_1bit_rgba(small_c))
        return out

    imp_w = make_imp(False)
    imp_a = make_imp(True)
    save_gif(imp_w, 'assets/zombies/imp_walk.gif', 75)
    save_gif(imp_a, 'assets/zombies/imp_attack.gif', 70)
    previews.append(('imp', imp_w[0]))

    # ------------------------------------------------------------------
    # (M) GARGANTUAR (伽刚特尔巨人僵尸 - 220x190 massive PVZ1 boss giant)
    # ------------------------------------------------------------------
    def make_gargantuar(is_smash=False):
        out = []
        n = len(fb_body_frames)
        for i in range(n):
            phase = i * math.tau / n
            bob = int(round(abs(math.cos(phase)) * 2))
            fr1x = Image.new('RGBA', (220, 190), (0, 0, 0, 0))

            # Wooden basket strapped to giant's hunchback + peeking Imp head!
            bk, bkd = new_2x(220, 190)
            bkd.rounded_rectangle((286, 54 + bob * 2, 348, 128 + bob * 2), radius=8, fill=(156, 108, 56, 255), outline=INK, width=5)
            for by in range(68, 120, 14):
                bkd.line((290, by + bob * 2, 344, by + bob * 2), fill=INK, width=3)
            fr1x.alpha_composite(finish_2x(bk, 220, 190))
            if imp_head:
                ih = imp_head.resize((36, 38), Image.LANCZOS)
                fr1x.alpha_composite(ih, (144, 6 + bob))

            # Enlarged muscular hunched PVZ1 giant body (from football_nohelmet_walk, olive-brown coat recolored)
            fb = fb_body_frames[i].copy()
            # Shift red jersey pixels on football body to Gargantuar olive-brown tunic!
            fpx = fb.load()
            for yy in range(fb.height):
                for xx in range(fb.width):
                    r, g, b, a = fpx[xx, yy]
                    if a > 0 and r > g + 35 and r > b + 35:
                        fpx[xx, yy] = (int(r * 0.52 + 34), int(g * 0.65 + 36), int(b * 0.55 + 24), a)
            giant_body = defringe_1bit_rgba(fb.resize((216, 182), Image.LANCZOS))
            fr1x.alpha_composite(giant_body, (6, 6))

            # Giant right arm wielding the iconic PVZ1 Wooden Telephone Pole!
            ov, d = new_2x(220, 190)
            if is_smash:
                t_ang = -1.05 + (i / max(1, n - 1)) * 1.85
            else:
                t_ang = -0.62 + math.sin(phase) * 0.14
            px0, py0 = 248, 168 + bob * 2
            ang = math.pi + t_ang
            px1 = int(px0 + math.cos(ang) * 205)
            py1 = int(py0 + math.sin(ang) * 205)
            d.line((px0 + 34, py0 + 22, px1, py1), fill=(138, 88, 46, 255), width=20)
            d.line((px0 + 34, py0 + 22, px1, py1), fill=INK, width=4)
            cx = int(px0 + (px1 - px0) * 0.78)
            cy = int(py0 + (py1 - py0) * 0.78)
            nx = int(-math.sin(ang) * 32)
            ny = int(math.cos(ang) * 32)
            d.line((cx - nx, cy - ny, cx + nx, cy + ny), fill=(158, 104, 54, 255), width=11)
            d.ellipse((cx - nx - 6, cy - ny - 6, cx - nx + 6, cy - ny + 6), fill=(120, 212, 230, 255), outline=INK, width=3)
            d.ellipse((cx + nx - 6, cy + ny - 6, cx + nx + 6, cy + ny + 6), fill=(120, 212, 230, 255), outline=INK, width=3)
            gx = int(px0 + (px1 - px0) * 0.24)
            gy = int(py0 + (py1 - py0) * 0.24)
            d.ellipse((gx - 18, gy - 18, gx + 18, gy + 18), fill=(128, 156, 124, 255), outline=INK, width=4)
            fr1x.alpha_composite(finish_2x(ov, 220, 190))

            out.append(defringe_1bit_rgba(fr1x))
        return out

    garg_w = make_gargantuar(False)
    garg_s = make_gargantuar(True)
    save_gif(garg_w, 'assets/zombies/gargantuar_walk.gif', 95)
    save_gif(garg_s, 'assets/zombies/gargantuar_smash.gif', 80)
    previews.append(('gargantuar', garg_w[0]))

    # Save contact sheet of all 13 new World 3-5 zombies on dark & lawn backgrounds
    cols = 5
    rows = math.ceil(len(previews) / cols)
    zsheet = Image.new('RGBA', (cols * 224 + 20, rows * 214 + 20), (30, 42, 56, 255))
    zd = ImageDraw.Draw(zsheet)
    lbl_font = ImageFont.truetype(FONT_BOLD_PATH, 13)
    for idx, (zname, zim) in enumerate(previews):
        gx = 14 + (idx % cols) * 224
        gy = 12 + (idx // cols) * 214
        zd.rounded_rectangle((gx, gy, gx + 214, gy + 200), radius=8, fill=(44, 68, 52, 255), outline=(92, 128, 96, 255), width=2)
        ox = gx + (214 - zim.width) // 2
        oy = gy + (182 - zim.height) // 2
        zsheet.alpha_composite(zim, (ox, max(gy + 2, oy)))
        zd.text((gx + 8, gy + 182), zname, font=lbl_font, fill=(255, 240, 160, 255))
    zsheet.save(os.path.join(SCRATCH_DIR, 'new_zombies_verified.png'))
    print(f'Built {len(previews)} new zombie types -> new_zombies_verified.png')


if __name__ == '__main__':
    build_ui_and_projectiles()
    build_and_defringe_all_plants()
    build_all_seed_cards()
    build_world345_zombies()
    print('=== ALL FULL-GAME ASSETS BUILT SUCCESSFULLY ===')
