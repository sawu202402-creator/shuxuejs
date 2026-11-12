import os
import json
import math
from collections import deque
from PIL import Image, ImageDraw

from build_world2_assets import load_newsucai_img, defringe_1bit_rgba, save_gif
from import_jspvz_assets import strict_clean_frame, build_seed_card

SCRATCH_DIR = '/home/better/.gemini/antigravity/brain/d889d774-4418-4123-8b63-9d3a075eaeac/scratch'
HD_DIR = 'sucai/hd_zombies'


def clean_hd_cutout(cache_key, fn, crop_box, hole_seeds=()):
    """Extract high-res Rich Werner PVZ1 sprite from #FFFFFF sheet with zero white halo."""
    cache_path = os.path.join(HD_DIR, f'clean_{cache_key}.png')
    if os.path.exists(cache_path):
        return Image.open(cache_path).convert('RGBA')

    im = Image.open(os.path.join(HD_DIR, fn)).crop(crop_box).convert('RGBA')
    w, h = im.size
    px = im.load()

    def is_white_bg(r, g, b):
        lum = (r + g + b) // 3
        sat = max(r, g, b) - min(r, g, b)
        return lum >= 224 and sat <= 26

    vis = [bytearray(w) for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    for sx, sy in hole_seeds:
        if 0 <= sx < w and 0 <= sy < h:
            q.append((sx, sy))

    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h or vis[y][x]:
            continue
        vis[y][x] = 1
        r, g, b, a = px[x, y]
        if is_white_bg(r, g, b):
            px[x, y] = (0, 0, 0, 0)
            q.append((x - 1, y))
            q.append((x + 1, y))
            q.append((x, y - 1))
            q.append((x, y + 1))

    # Clean 3px JPEG anti-alias halo into crisp dark cartoon ink outline
    for _ in range(3):
        upd = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if (
                    x == 0 or x == w - 1 or y == 0 or y == h - 1
                    or px[x - 1, y][3] == 0 or px[x + 1, y][3] == 0
                    or px[x, y - 1][3] == 0 or px[x, y + 1][3] == 0
                ):
                    lum = (r + g + b) // 3
                    sat = max(r, g, b) - min(r, g, b)
                    if lum > 180 and sat < 32:
                        upd.append((x, y, (0, 0, 0, 0)))
                    elif lum > 105 and sat < 38:
                        upd.append((x, y, (24, 26, 28, 255)))
        for x, y, val in upd:
            px[x, y] = val

    bb = im.getbbox()
    out = im.crop(bb) if bb else im
    out.save(cache_path)
    return out


def shear_x(im, factor, pivot_y=None):
    """Apply subtle horizontal shear for natural leg stride / body sway."""
    w, h = im.size
    if pivot_y is None:
        pivot_y = h
    pad = int(abs(factor) * h) + 8
    canvas = Image.new('RGBA', (w + pad * 2, h), (0, 0, 0, 0))
    canvas.alpha_composite(im, (pad, 0))
    # x_in = x_out - factor * (y - pivot_y)
    # PIL AFFINE maps (x_out, y_out) -> (a*x + b*y + c, d*x + e*y + f)
    c_off = factor * pivot_y
    warped = canvas.transform(
        canvas.size,
        Image.AFFINE,
        (1.0, -factor, c_off, 0.0, 1.0, 0.0),
        resample=Image.BICUBIC,
    )
    return warped, pad


def build_walk_frames(sprite_rgba, canvas_size, anchor_cx, anchor_bottom, target_h, n_frames=12, split_ratio=0.58, sway_deg=2.2, bob_px=2.5, stride_shear=0.11):
    """Articulated PVZ1 walk cycle: counter-shearing lower legs + bobbing/swaying upper torso."""
    scale = target_h / float(max(1, sprite_rgba.height))
    nw = max(1, int(round(sprite_rgba.width * scale)))
    nh = max(1, int(round(sprite_rgba.height * scale)))
    base = strict_clean_frame(sprite_rgba.resize((nw, nh), Image.LANCZOS))

    split_y = int(round(nh * split_ratio))
    overlap = 5
    upper = base.crop((0, 0, nw, min(nh, split_y + overlap)))
    lower = base.crop((0, max(0, split_y - overlap), nw, nh))

    cw, ch = canvas_size
    frames = []
    for i in range(n_frames):
        ph = (i / float(n_frames)) * math.tau
        fr = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))

        # Two footsteps per cycle (abs/cos double-frequency bob, single-frequency leg scissor)
        bob = int(round(abs(math.sin(ph)) * bob_px))
        sh = math.sin(ph) * stride_shear
        tilt = math.sin(ph) * sway_deg

        low_sheared, pad = shear_x(lower, sh, pivot_y=0)
        up_rot = upper.rotate(tilt, Image.BICUBIC, expand=True)

        ox_base = int(round(anchor_cx - nw / 2.0))
        oy_base = int(round(anchor_bottom - nh))

        # Paste lower legs anchored at hip
        lx = ox_base - pad
        ly = oy_base + max(0, split_y - overlap)
        fr.alpha_composite(low_sheared, (lx, ly))

        # Paste upper torso bobbing slightly
        ux = ox_base - (up_rot.width - upper.width) // 2 + int(round(math.sin(ph) * 1.2))
        uy = oy_base - bob - (up_rot.height - upper.height) // 2
        fr.alpha_composite(up_rot, (ux, uy))

        frames.append(strict_clean_frame(fr))
    return frames


def build_chomp_frames(sprite_rgba, canvas_size, anchor_cx, anchor_bottom, target_h, n_frames=10, lunge_px=4.0, tilt_deg=5.5):
    """Articulated PVZ1 chomp/attack cycle: rhythmic forward lunge & upper-body chomp."""
    scale = target_h / float(max(1, sprite_rgba.height))
    nw = max(1, int(round(sprite_rgba.width * scale)))
    nh = max(1, int(round(sprite_rgba.height * scale)))
    base = strict_clean_frame(sprite_rgba.resize((nw, nh), Image.LANCZOS))

    split_y = int(round(nh * 0.56))
    overlap = 5
    upper = base.crop((0, 0, nw, min(nh, split_y + overlap)))
    lower = base.crop((0, max(0, split_y - overlap), nw, nh))

    cw, ch = canvas_size
    frames = []
    for i in range(n_frames):
        ph = (i / float(n_frames)) * math.tau
        fr = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        ox_base = int(round(anchor_cx - nw / 2.0))
        oy_base = int(round(anchor_bottom - nh))

        fr.alpha_composite(lower, (ox_base, oy_base + max(0, split_y - overlap)))

        # Forward chomp lean (positive PIL rotate = counter-clockwise = leans LEFT!)
        lean = (0.5 - 0.5 * math.cos(ph)) * tilt_deg
        dx = -int(round((0.5 - 0.5 * math.cos(ph)) * lunge_px))
        dy = int(round(math.sin(ph) * 1.5))
        up_rot = upper.rotate(lean, Image.BICUBIC, expand=True)
        ux = ox_base + dx - (up_rot.width - upper.width) // 2
        uy = oy_base + dy - (up_rot.height - upper.height) // 2
        fr.alpha_composite(up_rot, (ux, uy))
        frames.append(strict_clean_frame(fr))
    return frames


def build_topple_die_frames(sprite_rgba, canvas_size, anchor_cx, anchor_bottom, target_h, n_frames=12):
    """Smooth forward collapse onto the lawn, holding final fallen pose."""
    scale = target_h / float(max(1, sprite_rgba.height))
    nw = max(1, int(round(sprite_rgba.width * scale)))
    nh = max(1, int(round(sprite_rgba.height * scale)))
    base = strict_clean_frame(sprite_rgba.resize((nw, nh), Image.LANCZOS))

    cw, ch = canvas_size
    frames = []
    # Pivot around feet at bottom-center of `base`
    pad_canvas = Image.new('RGBA', (nh * 2 + 40, nh * 2 + 40), (0, 0, 0, 0))
    pcx, pcy = pad_canvas.width // 2, pad_canvas.height // 2
    pad_canvas.alpha_composite(base, (pcx - nw // 2, pcy - nh))

    for i in range(n_frames):
        t = min(1.0, i / float(max(1, n_frames - 3)))
        # Accelerating gravity fall (t^2) from 0 to +82 deg (counter-clockwise = falls forward-left)
        ang = (t * t) * 82.0
        rot = pad_canvas.rotate(ang, Image.BICUBIC, expand=False)
        fr = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        # Shift pivot slightly right so fallen body stays fully inside canvas
        piv_x = min(cw - 18, anchor_cx + int(t * 28))
        piv_y = anchor_bottom - 4
        fr.alpha_composite(rot, (piv_x - pcx, piv_y - pcy))

        # Small dust puff when hitting ground on frame n_frames-3
        if i in (n_frames - 3, n_frames - 2):
            d = ImageDraw.Draw(fr)
            for k in range(4):
                dx = piv_x - 20 - k * 18
                dy = piv_y - 4 - (k % 2) * 5
                d.ellipse((dx - 6, dy - 4, dx + 6, dy + 4), fill=(158, 146, 126, 255), outline=(42, 38, 32, 255))
        frames.append(strict_clean_frame(fr))
    return frames


def build_magnetshroom_authentic():
    print('=== [0/7] Rebuilding 100% Authentic PVZ1 Magnet-shroom ===')
    with open('newsucai/project.json', 'r', encoding='utf-8') as f:
        proj = json.load(f)
    p_cost = {c['name']: c for t in proj['targets'] if t['name'] == '植物' for c in t.get('costumes', [])}

    cool_raw = load_newsucai_img(p_cost['磁力菇冷却1'])
    slp_raw = load_newsucai_img(p_cost['磁力菇睡觉1'])

    cb = cool_raw.crop(cool_raw.getbbox())
    base_part = defringe_1bit_rgba(slp_raw.crop((0, 44, 52, 73)).resize((60, 34), Image.LANCZOS))
    head_cool = defringe_1bit_rgba(cb.resize((64, 63), Image.LANCZOS))

    head_red = head_cool.copy()
    px = head_red.load()
    w, h = head_red.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 40:
                px[x, y] = (0, 0, 0, 0)
                continue
            lum = (r + g + b) / 3.0
            if lum < 44:
                px[x, y] = (22, 20, 22, 255)
                continue
            warmth = r - b
            if warmth <= 7 and y < 33:
                v = min(236, int(lum * 1.28 + 20))
                px[x, y] = (v, min(240, v + 3), min(244, v + 6), 255)
            else:
                if lum > 118:
                    nr = min(242, int(lum * 1.65 + 22))
                    ng = min(112, int(lum * 0.56))
                    nb = min(110, int(lum * 0.54))
                elif lum > 68:
                    nr = min(198, int(lum * 1.95 + 14))
                    ng = int(lum * 0.26)
                    nb = int(lum * 0.26)
                else:
                    nr = min(126, int(lum * 1.62 + 8))
                    ng = int(lum * 0.16)
                    nb = int(lum * 0.16)
                px[x, y] = (nr, ng, nb, 255)

    def add_eyes(im):
        out = im.copy()
        dr = ImageDraw.Draw(out)
        for ex, ey, b_off in [(26, 41, -1), (45, 37, 1)]:
            dr.ellipse((ex - 3, ey - 5, ex + 3, ey + 4), fill=(24, 16, 16, 255))
            dr.ellipse((ex - 2, ey - 4, ex + 1, ey), fill=(252, 253, 255, 255))
            dr.point((ex + 1, ey + 2), fill=(212, 216, 220, 255))
            dr.line((ex - 3, ey - 8, ex + 3, ey - 8 + b_off), fill=(36, 42, 34, 255), width=2)
        return out

    head_red_awake = add_eyes(head_red)
    head_cool_awake = add_eyes(head_cool)

    act_frames = []
    for i in range(12):
        ph = i * math.tau / 12
        fr = Image.new('RGBA', (84, 88), (0, 0, 0, 0))
        fr.alpha_composite(base_part, (15, 52))
        tilt = math.sin(ph) * 4.2
        bob = int(round(math.cos(ph) * 2.0))
        hd_frame = head_red_awake.copy()
        # Crisp solid electric magnetic spark arc between the two silver poles on peak frames (zero soft halo!)
        if i in (2, 3, 8, 9):
            hd_dr = ImageDraw.Draw(hd_frame)
            zig = [(20, 14), (27, 8 + (i % 2) * 3), (34, 15 - (i % 2) * 3), (42, 10)]
            hd_dr.line(zig, fill=(24, 48, 68, 255), width=4)
            hd_dr.line(zig, fill=(135, 248, 255, 255), width=2)
        rh = hd_frame.rotate(tilt, Image.BICUBIC, expand=False)
        fr.alpha_composite(rh, (10, 4 + bob))
        act_frames.append(strict_clean_frame(fr))

    cool_frames = []
    for i in range(10):
        ph = i * math.tau / 10
        fr = Image.new('RGBA', (84, 88), (0, 0, 0, 0))
        fr.alpha_composite(base_part, (15, 52))
        rh = head_cool_awake.rotate(math.sin(ph) * 2.0, Image.BICUBIC, expand=False)
        fr.alpha_composite(rh, (10, 6 + int(round(math.cos(ph) * 1.0))))
        cool_frames.append(strict_clean_frame(fr))

    slp_scaled = strict_clean_frame(slp_raw.resize((62, 84), Image.LANCZOS))
    slp_frames = []
    for i in range(10):
        ph = i * math.tau / 10
        fr = Image.new('RGBA', (84, 88), (0, 0, 0, 0))
        fr.alpha_composite(slp_scaled, (11, 2 + int(round(math.sin(ph) * 1.5))))
        slp_frames.append(strict_clean_frame(fr))

    save_gif(act_frames, 'assets/plants/magnetshroom.gif', duration=90)
    save_gif(cool_frames, 'assets/plants/magnetshroom_cooldown.gif', duration=110)
    save_gif(slp_frames, 'assets/plants/magnetshroom_sleep.gif', duration=120)
    build_seed_card('magnetshroom', 'assets/plants/magnetshroom.gif', 100, 'night')


def build_all_7_zombies():
    print('=== [1/7] Balloon Zombie ===')
    bal_full = clean_hd_cutout('balloon', 'balloon_bungee.jpg', (0, 0, 430, 768), [(213, 554), (245, 574), (295, 639)])
    # Scale full balloon zombie to fit 166x176 nicely (~166px tall)
    sc = 166.0 / bal_full.height
    bal_s = strict_clean_frame(bal_full.resize((int(round(bal_full.width * sc)), 166), Image.LANCZOS))

    # Split balloon (top y < 74) vs zombie body (y >= 62) for articulated floating sway
    bal_top = bal_s.crop((0, 0, bal_s.width, 72))
    bal_body = bal_s.crop((0, 62, bal_s.width, bal_s.height))

    fly_frames = []
    for i in range(12):
        ph = i * math.tau / 12
        fr = Image.new('RGBA', (166, 176), (0, 0, 0, 0))
        bob = int(round(math.sin(ph) * 3.0))
        ox = int(round(102 - bal_s.width / 2.0))
        oy = 5 + bob

        # Dangling body sways gently like a pendulum
        body_sheared, pad = shear_x(bal_body, math.sin(ph - 0.6) * 0.08, pivot_y=12)
        fr.alpha_composite(body_sheared, (ox - pad, oy + 62))

        # Balloon tilts slightly counter-phase
        b_rot = bal_top.rotate(math.sin(ph) * 2.5, Image.BICUBIC, expand=False)
        fr.alpha_composite(b_rot, (ox, oy))

        # Spinning propeller blur highlight on alternating frames
        if i % 2 == 1:
            d = ImageDraw.Draw(fr)
            px_c = ox + int(bal_s.width * 0.34)
            py_c = oy + 64
            d.line((px_c - 6, py_c, px_c + 6, py_c), fill=(220, 230, 235, 255), width=2)

        fly_frames.append(strict_clean_frame(fr))
    save_gif(fly_frames, 'assets/zombies/balloon_fly.gif', duration=85)

    # Grounded Balloon Zombie (crop out red balloon & string above propeller beanie!)
    beanie_y = int(bal_full.height * 0.362)
    bal_ground = bal_full.crop((0, beanie_y, bal_full.width, bal_full.height)).copy()
    ImageDraw.Draw(bal_ground).rectangle(
        (int(bal_ground.width * 0.62), 0, bal_ground.width, int(bal_ground.height * 0.30)),
        fill=(0, 0, 0, 0),
    )
    bal_ground = bal_ground.crop(bal_ground.getbbox())

    save_gif(build_walk_frames(bal_ground, (166, 144), 105, 142, 118), 'assets/zombies/balloon_walk.gif', duration=85)
    save_gif(build_chomp_frames(bal_ground, (166, 144), 105, 142, 118), 'assets/zombies/balloon_attack.gif', duration=80)
    save_gif(build_topple_die_frames(bal_ground, (166, 144), 105, 142, 118), 'assets/zombies/balloon_die.gif', duration=[85]*11 + [900])

    print('=== [2/7] Bungee Zombie ===')
    bun_drop_raw = clean_hd_cutout('bungee_drop', 'balloon_bungee.jpg', (430, 0, 900, 768), [(266, 308)])
    bun_grab_raw = clean_hd_cutout('bungee_grab', 'balloon_bungee.jpg', (900, 0, 1376, 768), [(286, 249)])

    def find_boots_top(im):
        px = im.load()
        w, h = im.size
        for y in range(0, h, 2):
            x0, x1 = w, -1
            for x in range(w):
                if px[x, y][3] > 0:
                    if x < x0:
                        x0 = x
                    x1 = x
            if x1 > x0 and (x1 - x0) > 42:
                return max(0, y - 8)
        return 0

    bd_body = bun_drop_raw.crop((0, find_boots_top(bun_drop_raw), bun_drop_raw.width, bun_drop_raw.height))
    bg_body = bun_grab_raw.crop((0, find_boots_top(bun_grab_raw), bun_grab_raw.width, bun_grab_raw.height))

    drop_frames = []
    sc_d = 142.0 / bd_body.height
    bd_s = strict_clean_frame(bd_body.resize((int(round(bd_body.width * sc_d)), 142), Image.LANCZOS))
    for i in range(10):
        ph = i * math.tau / 10
        fr = Image.new('RGBA', (166, 180), (0, 0, 0, 0))
        d = ImageDraw.Draw(fr)
        stretch_h = int(round(142 + math.sin(ph) * 4))
        cur = strict_clean_frame(bd_s.resize((bd_s.width, stretch_h), Image.LANCZOS))
        sway = int(round(math.cos(ph) * 1.5))
        ox = int(round(105 - cur.width / 2.0)) + sway
        oy = 26
        d.rectangle((103 + sway, 0, 107 + sway, oy + 12), fill=(238, 242, 246, 255), outline=(24, 26, 28, 255))
        fr.alpha_composite(cur, (ox, oy))
        drop_frames.append(strict_clean_frame(fr))
    save_gif(drop_frames, 'assets/zombies/bungee_drop.gif', duration=75)

    grab_frames = []
    sc_g = 156.0 / bg_body.height
    bg_s = strict_clean_frame(bg_body.resize((int(round(bg_body.width * sc_g)), 156), Image.LANCZOS))
    for i in range(10):
        ph = i * math.tau / 10
        fr = Image.new('RGBA', (166, 180), (0, 0, 0, 0))
        d = ImageDraw.Draw(fr)
        src = bd_s if i == 0 else bg_s
        bob = int(round(math.sin(ph * 2) * 3))
        ox = int(round(105 - src.width / 2.0))
        oy = 18 + bob
        d.rectangle((103, 0, 107, oy + 12), fill=(238, 242, 246, 255), outline=(24, 26, 28, 255))
        fr.alpha_composite(src, (ox, oy))
        grab_frames.append(strict_clean_frame(fr))
    save_gif(grab_frames, 'assets/zombies/bungee_grab.gif', duration=85)

    print('=== [3/7] Digger Zombie ===')
    dig_w = clean_hd_cutout('digger_walk', 'digger_pogo.jpg', (0, 0, 460, 768), [(203, 304), (298, 402)])
    dig_m = clean_hd_cutout('digger_mound', 'digger_pogo.jpg', (460, 0, 950, 768), [])

    sc_m = 92.0 / dig_m.width
    mound_s = strict_clean_frame(dig_m.resize((92, int(round(dig_m.height * sc_m))), Image.LANCZOS))
    dig_frames = []
    for i in range(10):
        ph = i * math.tau / 10
        fr = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        dx = int(round(math.sin(ph * 2) * 2.0))
        sq_w = 92 + int(round(math.cos(ph * 2) * 3))
        sq_h = mound_s.height - int(round(math.cos(ph * 2) * 2))
        part = strict_clean_frame(mound_s.resize((sq_w, sq_h), Image.LANCZOS))
        ox = 105 - sq_w // 2 + dx
        oy = 140 - sq_h
        fr.alpha_composite(part, (ox, oy))
        d = ImageDraw.Draw(fr)
        for k in range(4):
            t_clod = ((i / 10.0) + k * 0.25) % 1.0
            cx = 105 + int((k - 1.5) * 22 + (t_clod - 0.5) * 16)
            cy = 128 - int(math.sin(t_clod * math.pi) * 22)
            r_c = 3 if k % 2 == 0 else 2
            d.ellipse((cx - r_c, cy - r_c, cx + r_c, cy + r_c), fill=(112, 78, 44, 255), outline=(26, 22, 18, 255))
        dig_frames.append(strict_clean_frame(fr))
    save_gif(dig_frames, 'assets/zombies/digger_dig.gif', duration=75)

    save_gif(build_walk_frames(dig_w, (166, 144), 102, 142, 120), 'assets/zombies/digger_walk.gif', duration=85)
    save_gif(build_chomp_frames(dig_w, (166, 144), 102, 142, 120, lunge_px=5.0, tilt_deg=7.5), 'assets/zombies/digger_attack.gif', duration=75)
    save_gif(build_topple_die_frames(dig_w, (166, 144), 102, 142, 120), 'assets/zombies/digger_die.gif', duration=[85]*11 + [900])

    pick_crop = dig_m.crop((int(dig_m.width * 0.48), 0, dig_m.width, int(dig_m.height * 0.58)))
    pick_crop = strict_clean_frame(pick_crop.resize((46, 44), Image.LANCZOS))
    pick_crop.save('assets/zombies/pickaxe_drop.png')

    dig_nopick = dig_w.crop((int(dig_w.width * 0.24), 0, dig_w.width, dig_w.height)).copy()
    dig_nopick = dig_nopick.crop(dig_nopick.getbbox())
    save_gif(build_walk_frames(dig_nopick, (166, 144), 105, 142, 120), 'assets/zombies/digger_nopick_walk.gif', duration=85)
    save_gif(build_chomp_frames(dig_nopick, (166, 144), 105, 142, 120), 'assets/zombies/digger_nopick_attack.gif', duration=80)

    print('=== [4/7] Pogo Zombie ===')
    pogo_raw = clean_hd_cutout('pogo', 'digger_pogo.jpg', (950, 0, 1376, 768), [(233, 255), (263, 300), (254, 357), (171, 360), (233, 383)])
    sc_p = 132.0 / pogo_raw.height
    pogo_s = strict_clean_frame(pogo_raw.resize((int(round(pogo_raw.width * sc_p)), 132), Image.LANCZOS))

    sp_y = int(pogo_s.height * 0.70)
    p_top = pogo_s.crop((0, 0, pogo_s.width, sp_y + 4))
    p_bot = pogo_s.crop((0, sp_y - 2, pogo_s.width, pogo_s.height))

    pogo_frames = []
    for i in range(12):
        fr = Image.new('RGBA', (166, 156), (0, 0, 0, 0))
        if i in (0, 1, 11):
            jump_y = 0
            comp = 0.72 if i == 1 else 0.84
            tilt = 2.8 if i == 1 else 1.2
        else:
            air_t = (i - 1.5) / 9.0
            jump_y = int(round(math.sin(air_t * math.pi) * 4))
            comp = 1.06
            tilt = -2.2 * math.cos(air_t * math.pi)

        bot_h = max(8, int(round(p_bot.height * comp)))
        bot_scaled = strict_clean_frame(p_bot.resize((p_bot.width, bot_h), Image.LANCZOS))
        top_rot = p_top.rotate(tilt, Image.BICUBIC, expand=False)

        ox = int(round(105 - pogo_s.width / 2.0))
        foot_y = 153 - jump_y
        by = foot_y - bot_h
        ty = by - sp_y + 2
        fr.alpha_composite(bot_scaled, (ox, by))
        fr.alpha_composite(top_rot, (ox, max(0, ty)))
        pogo_frames.append(strict_clean_frame(fr))
    save_gif(pogo_frames, 'assets/zombies/pogo_bounce.gif', duration=70)

    pogo_stick = pogo_raw.crop((int(pogo_raw.width * 0.16), int(pogo_raw.height * 0.42), int(pogo_raw.width * 0.62), pogo_raw.height))
    strict_clean_frame(pogo_stick.resize((26, 62), Image.LANCZOS)).save('assets/zombies/pogo_drop.png')

    pogo_body = pogo_raw.crop((0, 0, pogo_raw.width, int(pogo_raw.height * 0.86)))
    save_gif(build_walk_frames(pogo_body, (166, 144), 105, 142, 120), 'assets/zombies/pogo_walk.gif', duration=85)
    save_gif(build_chomp_frames(pogo_body, (166, 144), 105, 142, 120), 'assets/zombies/pogo_attack.gif', duration=80)
    save_gif(build_topple_die_frames(pogo_body, (166, 144), 105, 142, 120), 'assets/zombies/pogo_die.gif', duration=[85]*11 + [900])

    print('=== [5/7] Ladder Zombie ===')
    lad_w = clean_hd_cutout('ladder_walk', 'ladder.jpg', (0, 0, 720, 768), [(134, 391), (211, 403), (428, 453), (499, 471), (247, 462)])
    lad_c = clean_hd_cutout('ladder_chomp', 'ladder.jpg', (720, 0, 1376, 768), [(408, 363), (514, 631)])

    save_gif(build_walk_frames(lad_w, (166, 144), 98, 142, 124), 'assets/zombies/ladder_walk.gif', duration=80)
    save_gif(build_chomp_frames(lad_w, (166, 144), 98, 142, 124), 'assets/zombies/ladder_attack.gif', duration=80)
    save_gif(build_walk_frames(lad_c, (166, 144), 105, 142, 124), 'assets/zombies/ladder_noladder_walk.gif', duration=85)
    save_gif(build_chomp_frames(lad_c, (166, 144), 105, 142, 124, lunge_px=5.0, tilt_deg=6.5), 'assets/zombies/ladder_noladder_attack.gif', duration=75)
    save_gif(build_topple_die_frames(lad_c, (166, 144), 105, 142, 124), 'assets/zombies/ladder_die.gif', duration=[85]*11 + [900])

    lad_icon = Image.new('RGBA', (68, 148), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lad_icon)
    for rx in (10, 50):
        ld.rectangle((rx, 6, rx + 8, 142), fill=(196, 204, 212, 255), outline=(22, 24, 28, 255), width=2)
        ld.line((rx + 2, 8, rx + 2, 140), fill=(242, 246, 250, 255), width=2)
    for ry in (22, 48, 74, 100, 126):
        ld.rectangle((16, ry, 52, ry + 7), fill=(182, 190, 198, 255), outline=(22, 24, 28, 255), width=2)
        ld.line((18, ry + 2, 50, ry + 2), fill=(236, 240, 245, 255), width=1)
    strict_clean_frame(lad_icon.resize((34, 74), Image.LANCZOS)).save('assets/zombies/ladder_drop.png')

    print('=== [6/7] Catapult Zombie ===')
    cat_cock = clean_hd_cutout('catapult_cocked', 'catapult.jpg', (0, 0, 690, 768), [(253, 486), (220, 523)])
    cat_fire = clean_hd_cutout('catapult_fired', 'catapult.jpg', (690, 0, 1376, 768), [(346, 491), (313, 527)])

    sc_cat = 156.0 / cat_cock.width
    cc_s = strict_clean_frame(cat_cock.resize((156, int(round(cat_cock.height * sc_cat))), Image.LANCZOS))
    cf_s = strict_clean_frame(cat_fire.resize((int(round(cat_fire.width * sc_cat)), int(round(cat_fire.height * sc_cat))), Image.LANCZOS))

    drive_frames = []
    for i in range(10):
        ph = i * math.tau / 10
        fr = Image.new('RGBA', (196, 164), (0, 0, 0, 0))
        bob = 1 if (i % 2 == 1) else 0
        ox = int(round(104 - cc_s.width / 2.0))
        oy = 158 - cc_s.height - bob
        fr.alpha_composite(cc_s, (ox, oy))
        d = ImageDraw.Draw(fr)
        ang = ph
        for wx, wy, wr in [(ox + 36, oy + cc_s.height - 20, 9), (ox + 101, oy + cc_s.height - 22, 11)]:
            sx = wx + int(round(math.cos(ang) * wr))
            sy = wy - int(round(math.sin(ang) * wr))
            d.ellipse((sx - 2, sy - 2, sx + 2, sy + 2), fill=(195, 202, 208, 255))
        drive_frames.append(strict_clean_frame(fr))
    save_gif(drive_frames, 'assets/zombies/catapult_drive.gif', duration=75)

    shoot_frames = []
    for i in range(10):
        fr = Image.new('RGBA', (196, 164), (0, 0, 0, 0))
        if i <= 1:
            src = cc_s
            recoil_x, tilt = 0, -1.5 * i
        elif i <= 6:
            src = cf_s
            recoil_x = 3 if i in (2, 3) else (1 if i == 4 else 0)
            tilt = 2.5 if i == 2 else (1.0 if i == 3 else 0.0)
        else:
            src = cc_s
            recoil_x, tilt = 0, 0.0
        rot_s = src.rotate(tilt, Image.BICUBIC, expand=False) if abs(tilt) > 0.1 else src
        ox = int(round(104 - src.width / 2.0)) + recoil_x
        oy = 158 - src.height
        fr.alpha_composite(rot_s, (ox, max(0, oy)))
        shoot_frames.append(strict_clean_frame(fr))
    save_gif(shoot_frames, 'assets/zombies/catapult_shoot.gif', duration=85)

    # Catapult explosion animation: charring/shaking vehicle + genuine PVZ1 explosion frames from newsucai!
    with open('newsucai/project.json', 'r', encoding='utf-8') as f:
        proj_boom = json.load(f)
    b_cost = {c['name']: c for t in proj_boom['targets'] if t['name'] == '子弹&掉落物&饰品&动画' for c in t.get('costumes', [])}
    pvz_booms = []
    for k in range(1, 6):
        nm = f'樱桃炸弹爆炸{k}'
        if nm in b_cost:
            bm = load_newsucai_img(b_cost[nm])
            if bm:
                bm = bm.crop(bm.getbbox())
                bm.thumbnail((150, 140), Image.LANCZOS)
                pvz_booms.append(strict_clean_frame(bm))

    cat_die_frames = []
    for i in range(14):
        fr = Image.new('RGBA', (196, 164), (0, 0, 0, 0))
        if i < 11:
            shk = (-4 if i % 2 == 0 else 4) if i < 6 else 0
            sink = max(0, (i - 4) * 2)
            tilted = cf_s.rotate(-4 - i * 1.4, Image.BICUBIC, expand=False)
            if i >= 3:
                t_px = tilted.load()
                dark_f = max(0.18, 0.72 - (i - 3) * 0.08)
                for yy in range(tilted.height):
                    for xx in range(tilted.width):
                        rr, gg, bb, aa = t_px[xx, yy]
                        if aa > 0:
                            t_px[xx, yy] = (int(rr * dark_f), int(gg * dark_f), int(bb * dark_f), aa)
            fr.alpha_composite(tilted, (int(round(104 - cf_s.width / 2.0)) + shk, min(160 - cf_s.height // 2, 158 - cf_s.height + sink)))

        d = ImageDraw.Draw(fr)
        if 1 <= i <= 9:
            bt = (i - 1) / 8.0
            for vx, vy0 in [(-42, -55), (38, -62), (14, -72)]:
                bx = 112 + int(vx * bt)
                by = 98 + int(vy0 * bt + 95 * bt * bt)
                if 6 <= bx <= 188 and 6 <= by <= 156:
                    d.ellipse((bx - 7, by - 7, bx + 7, by + 7), fill=(230, 108, 28, 255), outline=(24, 24, 26, 255), width=2)

        if pvz_booms and 2 <= i <= 10:
            bi = min(len(pvz_booms) - 1, (i - 2) * len(pvz_booms) // 9)
            bm = pvz_booms[bi]
            fr.alpha_composite(bm, ((196 - bm.width) // 2, 154 - bm.height))

        cat_die_frames.append(strict_clean_frame(fr))
    save_gif(cat_die_frames, 'assets/zombies/catapult_die.gif', duration=[95]*13 + [800])

    print('=== [7/7] Gargantuar (with Imp & after throwing Imp!) ===')
    gw_raw = clean_hd_cutout('garg_walk', 'gargantuar.jpg', (0, 0, 710, 768), [(159, 455), (308, 466), (93, 507)])
    gs_raw = clean_hd_cutout('garg_smash', 'gargantuar.jpg', (710, 0, 1376, 768), [(577, 76), (278, 162), (553, 138)])

    def remove_basket_imp(im, x0_r, y0_r, x1_r, y1_r, patch_rim=None):
        out = im.copy()
        w, h = out.size
        x0, x1 = int(w * x0_r), int(w * x1_r)
        y0, y1 = int(h * y0_r), int(h * y1_r)
        px = out.load()
        for y in range(max(0, y0), min(h, y1)):
            for x in range(max(0, x0), min(w, x1)):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if y < y0 + int((y1 - y0) * 0.52):
                    px[x, y] = (0, 0, 0, 0)
                else:
                    if g >= r - 10 or (r > 180 and g > 180):
                        px[x, y] = (0, 0, 0, 0)
        if patch_rim:
            # Draw empty wicker basket opening behind shoulder so there is zero notch!
            rim_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            rd = ImageDraw.Draw(rim_layer)
            rx0, ry0, rx1, ry1 = int(w * patch_rim[0]), int(h * patch_rim[1]), int(w * patch_rim[2]), int(h * patch_rim[3])
            rd.ellipse((rx0, ry0, rx1, ry1), fill=(96, 64, 38, 255), outline=(22, 22, 24, 255), width=5)
            rd.ellipse((rx0 + 8, ry0 + 6, rx1 - 8, ry1 - 6), fill=(62, 40, 24, 255), outline=(22, 22, 24, 255), width=3)
            rim_layer.alpha_composite(out, (0, 0))
            out = rim_layer
        return out.crop(out.getbbox())

    gw_noimp = remove_basket_imp(gw_raw, 0.67, 0.0, 0.94, 0.22, patch_rim=(0.66, 0.145, 0.91, 0.235))
    gs_noimp = remove_basket_imp(gs_raw, 0.58, 0.17, 0.80, 0.35, patch_rim=(0.58, 0.295, 0.79, 0.375))

    # Canvas: 240x210, anchor_cx=118, anchor_bottom=206, standing height=168px (towering giant!)
    save_gif(
        build_walk_frames(gw_raw, (240, 210), 118, 206, 168, n_frames=12, split_ratio=0.60, sway_deg=2.0, bob_px=4.0, stride_shear=0.10),
        'assets/zombies/gargantuar_walk.gif',
        duration=95,
    )
    save_gif(
        build_walk_frames(gw_noimp, (240, 210), 118, 206, 160, n_frames=12, split_ratio=0.58, sway_deg=2.0, bob_px=4.0, stride_shear=0.10),
        'assets/zombies/gargantuar_noimp_walk.gif',
        duration=95,
    )

    def build_garg_smash_seq(walk_im, smash_im, walk_h, smash_h):
        sw_sc = walk_h / float(walk_im.height)
        ss_sc = smash_h / float(smash_im.height)
        w_s = strict_clean_frame(walk_im.resize((int(round(walk_im.width * sw_sc)), walk_h), Image.LANCZOS))
        s_s = strict_clean_frame(smash_im.resize((int(round(smash_im.width * ss_sc)), smash_h), Image.LANCZOS))

        seq = []
        # 12 frames (~0.90s): 0..4 wind-up overhead, 5..8 violent downward slam with shockwave dust, 9..11 recovery
        for i in range(12):
            fr = Image.new('RGBA', (240, 210), (0, 0, 0, 0))
            if i <= 4:
                # Wind-up raising telephone pole overhead
                tilt = -4.0 * (i / 4.0)  # leans slightly back while hoisting pole high
                rot = s_s.rotate(tilt, Image.BICUBIC, expand=True)
                ox = int(round(122 - rot.width / 2.0))
                oy = 206 - rot.height
                fr.alpha_composite(rot, (max(0, ox), max(0, oy)))
            elif i == 5:
                # Mid-swing forward acceleration
                rot = s_s.rotate(14.0, Image.BICUBIC, expand=True)
                ox = int(round(112 - rot.width / 2.0))
                oy = 206 - rot.height + 4
                fr.alpha_composite(rot, (max(0, ox), max(0, oy)))
            elif i <= 9:
                # Slam impact on ground! Forward lean of w_s so pole tip hits y=202 ground!
                slam_ang = 12.0 if i in (6, 7) else 6.0
                rot = w_s.rotate(slam_ang, Image.BICUBIC, expand=True)
                shk_y = 3 if i == 6 else 0
                ox = int(round(110 - rot.width / 2.0))
                oy = 206 - rot.height + 6 + shk_y
                fr.alpha_composite(rot, (max(0, ox), max(0, oy)))
                if i in (6, 7, 8):
                    d = ImageDraw.Draw(fr)
                    for k in range(5):
                        ang_d = (k / 4.0) * math.pi
                        rad = (i - 5) * 12 + 8
                        cx = 36 + int(math.cos(ang_d) * rad)
                        cy = 198 - int(math.sin(ang_d) * (rad * 0.45))
                        d.ellipse((cx - 5, cy - 4, cx + 5, cy + 4), fill=(168, 150, 122, 255), outline=(36, 30, 24, 255))
            else:
                ox = int(round(118 - w_s.width / 2.0))
                oy = 206 - w_s.height
                fr.alpha_composite(w_s, (max(0, ox), max(0, oy)))
            seq.append(strict_clean_frame(fr))
        return seq

    save_gif(build_garg_smash_seq(gw_raw, gs_raw, 168, 196), 'assets/zombies/gargantuar_smash.gif', duration=75)
    save_gif(build_garg_smash_seq(gw_noimp, gs_noimp, 160, 196), 'assets/zombies/gargantuar_noimp_smash.gif', duration=75)
    save_gif(build_topple_die_frames(gw_noimp, (240, 210), 125, 206, 158, n_frames=14), 'assets/zombies/gargantuar_die.gif', duration=[85]*13 + [1000])


def save_verification_sheet():
    items = [
        'assets/zombies/balloon_fly.gif',
        'assets/zombies/balloon_walk.gif',
        'assets/zombies/bungee_drop.gif',
        'assets/zombies/bungee_grab.gif',
        'assets/zombies/digger_dig.gif',
        'assets/zombies/digger_walk.gif',
        'assets/zombies/pogo_bounce.gif',
        'assets/zombies/pogo_walk.gif',
        'assets/zombies/ladder_walk.gif',
        'assets/zombies/ladder_noladder_attack.gif',
        'assets/zombies/catapult_drive.gif',
        'assets/zombies/catapult_shoot.gif',
        'assets/zombies/gargantuar_walk.gif',
        'assets/zombies/gargantuar_smash.gif',
        'assets/plants/magnetshroom.gif',
    ]
    sheet = Image.new('RGBA', (5 * 240, 3 * 220), (32, 46, 66, 255))
    sd = ImageDraw.Draw(sheet)
    for idx, p in enumerate(items):
        c, r = idx % 5, idx // 5
        ox, oy = c * 240, r * 220
        sd.rectangle((ox + 2, oy + 2, ox + 238, oy + 218), outline=(92, 118, 148, 255))
        # Roof / grass stripe behind sprite to prove zero fringes and clean ladder rungs!
        sd.rectangle((ox + 16, oy + 100, ox + 224, oy + 150), fill=(168, 76, 48, 255) if r == 2 else (48, 96, 58, 255))
        im = Image.open(p)
        im.seek(min(getattr(im, 'n_frames', 1) - 1, 2 if 'smash' not in p else 6))
        fr = im.convert('RGBA')
        sheet.alpha_composite(fr, (ox + (240 - fr.width) // 2, oy + (220 - fr.height) // 2))
        sd.text((ox + 6, oy + 4), f"{os.path.basename(p)} ({getattr(im, 'n_frames', 1)}f)", fill=(255, 240, 140, 255))
    out = os.path.join(SCRATCH_DIR, 'authentic_w4_w5_verified.png')
    sheet.save(out)
    print('Saved verification sheet:', out)


if __name__ == '__main__':
    build_magnetshroom_authentic()
    build_all_7_zombies()
    save_verification_sheet()
