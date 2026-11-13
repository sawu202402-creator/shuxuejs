import os
import colorsys
import math
from PIL import Image, ImageDraw, ImageFont

from build_world2_assets import defringe_1bit_rgba, save_gif
from import_jspvz_assets import strict_clean_frame, FONT_BOLD_PATH
from build_authentic_w4_w5_zombies import clean_hd_cutout, shear_x

HD_DIR = 'sucai/hd_zombies'
SCRATCH_DIR = '/home/better/.gemini/antigravity/brain/d889d774-4418-4123-8b63-9d3a075eaeac/scratch'


def place_on_canvas(sp, cw, ch, cx, bottom_y):
    canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    ox = int(round(cx - sp.width / 2.0))
    oy = int(round(bottom_y - sp.height))
    canvas.alpha_composite(sp, (ox, oy))
    return canvas


def make_breathing_frames(base_sp, cw, ch, cx, bottom_y, n=8, sx_amp=0.025, sy_amp=0.032, shear_amp=0.02):
    frames = []
    for i in range(n):
        ang = 2.0 * math.pi * i / n
        sx = 1.0 + sx_amp * math.sin(ang)
        sy = 1.0 - sy_amp * math.sin(ang)
        nw = max(1, int(round(base_sp.width * sx)))
        nh = max(1, int(round(base_sp.height * sy)))
        sp = base_sp.resize((nw, nh), Image.LANCZOS)
        if shear_amp > 0:
            sp = shear_x(sp, shear_amp * math.cos(ang), pivot_y=sp.height)[0]
            bb = sp.getbbox()
            if bb:
                sp = sp.crop(bb)
        frames.append(place_on_canvas(sp, cw, ch, cx, bottom_y))
    return frames


def recolor_green_to_icy_blue(rgba):
    """Transform Melon-pult's green hues into authentic PVZ1 Winter Melon sapphire/frost blue."""
    out = rgba.copy().convert('RGBA')
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
            hue, sat, val = colorsys.rgb_to_hsv(rf, gf, bf)
            deg = hue * 360.0
            # Green / yellow-green rind & leaves (55..165 deg) -> sapphire / cyan-blue (196..222 deg)
            if 50.0 <= deg <= 170.0 and sat > 0.12:
                ratio = (deg - 50.0) / 120.0
                new_deg = 192.0 + ratio * 30.0
                # Bright yellow-green stripes become icy frost cyan-white!
                if deg < 92.0 and val > 0.68:
                    new_sat = max(0.28, sat * 0.62)
                    new_val = min(1.0, val * 1.08)
                else:
                    new_sat = min(0.95, sat * 1.08)
                    new_val = min(1.0, val * 0.98)
                nr, ng, nb = colorsys.hsv_to_rgb(new_deg / 360.0, new_sat, new_val)
                px[x, y] = (int(round(nr * 255)), int(round(ng * 255)), int(round(nb * 255)), a)
    return out


def build_official_jspvz_card(card_id, sprite_path, cost_text, theme='upgrade'):
    """Build 100x140 seed packet card with 1:1 unstretched sprite portrait matching card_gatlingpea.png."""
    ref = Image.open('assets/cards/card_sunflower.png').convert('RGBA')
    sun_coin = ref.crop((9, 109, 32, 132))
    font_cost = ImageFont.truetype(FONT_BOLD_PATH, 19 if len(str(cost_text)) >= 3 else 20)

    card = Image.new('RGBA', (100, 140), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    if theme == 'upgrade':
        frame_fill = (88, 44, 112, 255)
        inner_fill = (236, 218, 248, 255)
        inner_outline = (138, 82, 168, 255)
        top_bg, bot_bg = (132, 68, 174, 255), (174, 106, 212, 255)
    elif theme == 'imitater':
        frame_fill = (74, 76, 80, 255)
        inner_fill = (218, 220, 224, 255)
        inner_outline = (118, 122, 128, 255)
        top_bg, bot_bg = (168, 172, 178, 255), (132, 136, 142, 255)
    else:
        frame_fill = (92, 66, 44, 255)
        inner_fill = (238, 224, 186, 255)
        inner_outline = (146, 114, 76, 255)
        top_bg, bot_bg = (138, 208, 246, 255), (108, 186, 82, 255)

    d.rounded_rectangle((1, 1, 98, 138), radius=8, fill=frame_fill, outline=(36, 24, 14, 255), width=3)
    d.rounded_rectangle((5, 5, 94, 134), radius=6, fill=inner_fill, outline=inner_outline, width=2)
    d.rectangle((8, 8, 91, 66), fill=top_bg)
    d.rectangle((8, 66, 91, 102), fill=bot_bg)

    sp = Image.open(sprite_path)
    if getattr(sp, 'n_frames', 1) > 1:
        sp.seek(0)
    sp = sp.convert('RGBA')
    bb = sp.getbbox()
    if bb:
        sp = sp.crop(bb)
    sp.thumbnail((76, 78), Image.LANCZOS)
    card.alpha_composite(sp, ((100 - sp.width) // 2, 11 + (86 - sp.height) // 2))
    d.rectangle((8, 8, 91, 102), outline=(88, 68, 44, 255) if theme != 'imitater' else (82, 84, 88, 255), width=2)

    bar_fill = (232, 234, 238, 255) if theme == 'imitater' else (246, 236, 202, 255)
    d.rectangle((8, 104, 91, 132), fill=bar_fill, outline=(128, 98, 62, 255), width=1)
    card.alpha_composite(sun_coin, (10, 107))
    tb = d.textbbox((0, 0), str(cost_text), font=font_cost)
    tw = tb[2] - tb[0]
    d.text((86 - tw, 108), str(cost_text), font=font_cost, fill=(28, 22, 14, 255))

    out_path = f'assets/cards/card_{card_id}.png'
    card.save(out_path)
    print(f'  [Card] {out_path} ({cost_text})')


def build_cob_cannon():
    loaded = clean_hd_cutout('cobcannon_loaded', 'cobcannon_sheet.jpg', (50, 105, 495, 452))
    fired = clean_hd_cutout('cobcannon_fired', 'cobcannon_sheet.jpg', (530, 32, 1010, 452))
    empty = clean_hd_cutout('cobcannon_empty', 'cobcannon_sheet.jpg', (55, 578, 460, 932))
    rocket = clean_hd_cutout('cobcannon_rocket', 'cobcannon_sheet.jpg', (660, 585, 875, 932))

    # Scale 2-tile Cob Cannon onto 156x112 canvas (spans 2 horizontal 80px cells cleanly!)
    cw, ch = 156, 112
    loaded_s = loaded.resize((142, int(round(loaded.height * 142 / loaded.width))), Image.LANCZOS)
    fired_s = fired.resize((148, int(round(fired.height * 148 / fired.width))), Image.LANCZOS)
    empty_s = empty.resize((136, int(round(empty.height * 136 / empty.width))), Image.LANCZOS)

    idle_frames = make_breathing_frames(loaded_s, cw, ch, 76, 108, n=8, sx_amp=0.02, sy_amp=0.028, shear_amp=0.012)
    save_gif(idle_frames, 'assets/plants/cobcannon.gif', duration=110)

    empty_frames = make_breathing_frames(empty_s, cw, ch, 74, 108, n=8, sx_amp=0.02, sy_amp=0.025, shear_amp=0.01)
    save_gif(empty_frames, 'assets/plants/cobcannon_empty.gif', duration=120)

    # Firing sequence: crouch compress -> burst upward -> recoil -> settle empty
    fire_frames = [
        place_on_canvas(loaded_s.resize((146, int(loaded_s.height * 0.92)), Image.LANCZOS), cw, ch, 74, 108),
        place_on_canvas(fired_s, cw, ch, 78, 108),
        place_on_canvas(fired_s.resize((146, min(110, int(fired_s.height * 1.03))), Image.LANCZOS), cw, ch, 76, 108),
        place_on_canvas(empty_s.resize((140, int(empty_s.height * 0.94)), Image.LANCZOS), cw, ch, 71, 108),
        place_on_canvas(empty_s, cw, ch, 74, 108),
    ]
    save_gif(fire_frames, 'assets/plants/cobcannon_fire.gif', duration=105)

    # Giant Corn Cob Rocket projectile (44x88 vertical pointing up)
    rk = rocket.copy()
    rk.thumbnail((44, 88), Image.LANCZOS)
    rk_canvas = Image.new('RGBA', (46, 90), (0, 0, 0, 0))
    rk_canvas.alpha_composite(rk, ((46 - rk.width) // 2, (90 - rk.height) // 2))
    rk_canvas.save('assets/projectiles/cob_rocket.png')

    build_official_jspvz_card('cobcannon', 'assets/plants/cobcannon.gif', 500, theme='upgrade')
    print('  [Plant] Built Cob Cannon (idle, fire, empty, cob_rocket.png)')


def build_winter_melon():
    for src_name, dst_name in [
        ('assets/plants/melonpult.gif', 'assets/plants/wintermelon.gif'),
        ('assets/plants/melonpult_attack.gif', 'assets/plants/wintermelon_attack.gif'),
    ]:
        im = Image.open(src_name)
        nf = getattr(im, 'n_frames', 1)
        frames = []
        durs = []
        for i in range(nf):
            im.seek(i)
            durs.append(im.info.get('duration', 95) or 95)
            fr = defringe_1bit_rgba(im.convert('RGBA'))
            frames.append(recolor_green_to_icy_blue(fr))
        save_gif(frames, dst_name, duration=durs)

    melon_proj = Image.open('assets/projectiles/melon.png').convert('RGBA')
    recolor_green_to_icy_blue(melon_proj).save('assets/projectiles/winter_melon.png')
    build_official_jspvz_card('wintermelon', 'assets/plants/wintermelon.gif', 400, theme='upgrade')
    print('  [Plant] Built Winter Melon (idle, attack, winter_melon.png)')


def build_cattail_and_umbrellaleaf():
    cat_idle = clean_hd_cutout('cattail_idle', 'cattail_umbrella_sheet.jpg', (75, 50, 430, 485))
    # Mask out the 3 detached flying spikes in top-right of cat_atk quadrant before cutout
    raw_sheet = Image.open(os.path.join(HD_DIR, 'cattail_umbrella_sheet.jpg')).crop((540, 85, 990, 485)).convert('RGBA')
    d_mask = ImageDraw.Draw(raw_sheet)
    d_mask.rectangle((272, 0, 450, 126), fill=(255, 255, 255, 255))
    masked_atk_path = os.path.join(HD_DIR, '_tmp_cat_atk_masked.png')
    raw_sheet.save(masked_atk_path)
    if os.path.exists(os.path.join(HD_DIR, 'clean_cattail_atk_clean.png')):
        os.remove(os.path.join(HD_DIR, 'clean_cattail_atk_clean.png'))
    cat_atk = clean_hd_cutout('cattail_atk_clean', '_tmp_cat_atk_masked.png', (0, 0, raw_sheet.width, raw_sheet.height))

    cat_idle.thumbnail((78, 84), Image.LANCZOS)
    cat_atk.thumbnail((82, 82), Image.LANCZOS)
    save_gif(make_breathing_frames(cat_idle, 86, 88, 43, 85, n=8, sx_amp=0.025, sy_amp=0.03, shear_amp=0.025),
             'assets/plants/cattail.gif', duration=105)
    atk_frames = [
        place_on_canvas(cat_idle, 86, 88, 42, 85),
        place_on_canvas(shear_x(cat_atk, -0.05)[0], 86, 88, 45, 85),
        place_on_canvas(cat_atk, 86, 88, 46, 85),
        place_on_canvas(cat_idle, 86, 88, 43, 85),
    ]
    save_gif(atk_frames, 'assets/plants/cattail_attack.gif', duration=95)

    # Cattail homing red spike from newsucai
    thorn_src = 'newsucai/b593c16109199cf4106dbcc2e9f3be84.png'
    if os.path.exists(thorn_src):
        th = Image.open(thorn_src).convert('RGBA')
        bb = th.getbbox()
        if bb:
            th = th.crop(bb)
        th = th.resize((30, 15), Image.LANCZOS)
        th.save('assets/projectiles/cattail_thorn.png')
    build_official_jspvz_card('cattail', 'assets/plants/cattail.gif', 225, theme='upgrade')

    # Umbrella Leaf
    umb_idle = clean_hd_cutout('umbrellaleaf_idle', 'cattail_umbrella_sheet.jpg', (100, 600, 430, 940))
    umb_open = clean_hd_cutout('umbrellaleaf_open', 'cattail_umbrella_sheet.jpg', (515, 565, 995, 940))
    umb_idle.thumbnail((74, 78), Image.LANCZOS)
    umb_open.thumbnail((94, 86), Image.LANCZOS)

    save_gif(make_breathing_frames(umb_idle, 96, 90, 48, 87, n=8, sx_amp=0.028, sy_amp=0.032, shear_amp=0.02),
             'assets/plants/umbrellaleaf.gif', duration=110)
    block_frames = [
        place_on_canvas(umb_idle.resize((78, 68), Image.LANCZOS), 96, 90, 48, 87),
        place_on_canvas(umb_open, 96, 90, 48, 87),
        place_on_canvas(umb_open.resize((96, 88), Image.LANCZOS), 96, 90, 48, 87),
        place_on_canvas(umb_open, 96, 90, 48, 87),
        place_on_canvas(umb_idle, 96, 90, 48, 87),
    ]
    save_gif(block_frames, 'assets/plants/umbrellaleaf_block.gif', duration=85)
    build_official_jspvz_card('umbrellaleaf', 'assets/plants/umbrellaleaf.gif', 100, theme='day')
    print('  [Plant] Built Cattail & Umbrella Leaf')


def build_marigold_goldmagnet_imitater():
    marigold = clean_hd_cutout('marigold_idle', 'misc_plants_sheet.jpg', (90, 48, 422, 465))
    goldmag = clean_hd_cutout('goldmagnet_idle', 'misc_plants_sheet.jpg', (610, 78, 925, 465))
    imitater = clean_hd_cutout('imitater_idle', 'misc_plants_sheet.jpg', (68, 558, 445, 978))
    coin_gold = clean_hd_cutout('coin_gold', 'misc_plants_sheet.jpg', (548, 648, 765, 888))
    coin_silver = clean_hd_cutout('coin_silver', 'misc_plants_sheet.jpg', (765, 648, 988, 888))

    marigold.thumbnail((74, 80), Image.LANCZOS)
    save_gif(make_breathing_frames(marigold, 82, 86, 41, 83, n=8, sx_amp=0.03, sy_amp=0.03, shear_amp=0.03),
             'assets/plants/marigold.gif', duration=115)
    build_official_jspvz_card('marigold', 'assets/plants/marigold.gif', 50, theme='day')

    goldmag.thumbnail((72, 80), Image.LANCZOS)
    save_gif(make_breathing_frames(goldmag, 82, 86, 41, 83, n=8, sx_amp=0.025, sy_amp=0.03, shear_amp=0.02),
             'assets/plants/goldmagnet.gif', duration=110)
    # Magnetic pull pulse animation
    pull_frames = []
    for i in range(6):
        ang = 2.0 * math.pi * i / 6
        tilt = goldmag.rotate(math.sin(ang) * 7.0, resample=Image.BICUBIC, expand=True)
        bb = tilt.getbbox()
        if bb:
            tilt = tilt.crop(bb)
        tilt.thumbnail((76, 82), Image.LANCZOS)
        pull_frames.append(place_on_canvas(tilt, 82, 86, 41, 83))
    save_gif(pull_frames, 'assets/plants/goldmagnet_pull.gif', duration=85)
    build_official_jspvz_card('goldmagnet', 'assets/plants/goldmagnet.gif', 50, theme='upgrade')

    imitater.thumbnail((72, 80), Image.LANCZOS)
    save_gif(make_breathing_frames(imitater, 82, 86, 41, 83, n=8, sx_amp=0.028, sy_amp=0.032, shear_amp=0.025),
             'assets/plants/imitater.gif', duration=110)
    # PVZ1 Imitater rapid horizontal spin transformation!
    spin_frames = []
    widths = [72, 48, 20, 48, 72, 48, 20, 48]
    flips = [False, False, True, True, True, True, False, False]
    for w_target, do_flip in zip(widths, flips):
        sp = imitater.transpose(Image.FLIP_LEFT_RIGHT) if do_flip else imitater
        sp = sp.resize((max(8, w_target), imitater.height), Image.LANCZOS)
        spin_frames.append(place_on_canvas(sp, 82, 86, 41, 83))
    save_gif(spin_frames, 'assets/plants/imitater_spin.gif', duration=65)
    build_official_jspvz_card('imitater', 'assets/plants/imitater.gif', '★', theme='imitater')

    # Coins
    cg = coin_gold.copy()
    cg.thumbnail((52, 52), Image.LANCZOS)
    cg.save('assets/ui/coin_gold.png')

    cs = coin_silver.copy()
    cs.thumbnail((46, 46), Image.LANCZOS)
    cs.save('assets/ui/coin_silver.png')
    print('  [Plant] Built Marigold, Gold Magnet, Imitater & Coins')


def render_preview_sheet():
    os.makedirs(SCRATCH_DIR, exist_ok=True)
    sheet = Image.new('RGBA', (980, 420), (46, 125, 50, 255))
    d = ImageDraw.Draw(sheet)
    d.rectangle((0, 210, 980, 420), fill=(36, 44, 68, 255))

    plants = [
        ('cobcannon', 'assets/plants/cobcannon.gif', 'assets/cards/card_cobcannon.png'),
        ('wintermelon', 'assets/plants/wintermelon.gif', 'assets/cards/card_wintermelon.png'),
        ('cattail', 'assets/plants/cattail.gif', 'assets/cards/card_cattail.png'),
        ('umbrellaleaf', 'assets/plants/umbrellaleaf.gif', 'assets/cards/card_umbrellaleaf.png'),
        ('marigold', 'assets/plants/marigold.gif', 'assets/cards/card_marigold.png'),
        ('goldmagnet', 'assets/plants/goldmagnet.gif', 'assets/cards/card_goldmagnet.png'),
        ('imitater', 'assets/plants/imitater.gif', 'assets/cards/card_imitater.png'),
    ]
    x = 24
    for name, gpath, cpath in plants:
        card = Image.open(cpath).convert('RGBA').resize((72, 100), Image.LANCZOS)
        sheet.alpha_composite(card, (x + 20, 18))
        sp = Image.open(gpath).convert('RGBA')
        sheet.alpha_composite(sp, (x + max(0, (120 - sp.width) // 2), 200 - sp.height))
        sheet.alpha_composite(sp, (x + max(0, (120 - sp.width) // 2), 395 - sp.height))
        x += 135

    rk = Image.open('assets/projectiles/cob_rocket.png').convert('RGBA')
    wm = Image.open('assets/projectiles/winter_melon.png').convert('RGBA')
    ct = Image.open('assets/projectiles/cattail_thorn.png').convert('RGBA')
    cg = Image.open('assets/ui/coin_gold.png').convert('RGBA')
    cs = Image.open('assets/ui/coin_silver.png').convert('RGBA')
    sheet.alpha_composite(rk, (20, 230))
    sheet.alpha_composite(wm, (85, 255))
    sheet.alpha_composite(ct, (140, 260))
    sheet.alpha_composite(cg, (190, 245))
    sheet.alpha_composite(cs, (255, 248))

    out = os.path.join(SCRATCH_DIR, 'preview_7_missing_plants.png')
    sheet.save(out)
    print('Saved preview to', out)


if __name__ == '__main__':
    build_cob_cannon()
    build_winter_melon()
    build_cattail_and_umbrellaleaf()
    build_marigold_goldmagnet_imitater()
    render_preview_sheet()
