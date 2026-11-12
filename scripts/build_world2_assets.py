import os
import json
import base64
import math
from io import BytesIO
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

os.makedirs('assets/zombies', exist_ok=True)
os.makedirs('assets/plants', exist_ok=True)
os.makedirs('assets/ui', exist_ok=True)

with open('newsucai/project.json', 'r', encoding='utf-8') as f:
    proj = json.load(f)

targets = {t['name']: {c['name']: c for c in t.get('costumes', [])} for t in proj['targets']}
z_costumes = targets.get('僵尸', {})
b_costumes = targets.get('子弹&掉落物&饰品&动画', {})


def load_newsucai_img(costume):
    md5ext = costume['md5ext']
    path = os.path.join('newsucai', md5ext)
    if not os.path.exists(path):
        return None
    if md5ext.endswith('.png'):
        im = Image.open(path).convert('RGBA')
    else:
        content = open(path, 'r', encoding='utf-8', errors='ignore').read()
        idx = content.find('data:image/png;base64,')
        if idx != -1:
            start = idx + len('data:image/png;base64,')
            end = content.find('"', start)
            im = Image.open(BytesIO(base64.b64decode(content[start:end]))).convert('RGBA')
        else:
            return None
    res = costume.get('bitmapResolution', 1)
    if res == 2:
        im = im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.LANCZOS)
    return im


def save_gif(frames, out_path, duration=90):
    if not frames:
        return
    pal_frames = []
    for fr in frames:
        rgba = fr.convert('RGBA')
        alpha = rgba.getchannel('A')
        rgb = Image.new('RGB', rgba.size, (0, 0, 0))
        rgb.paste(rgba, mask=alpha.point(lambda a: 255 if a >= 96 else 0))
        # Quantize to 254 colors so we can shift indices +1 and reserve index 0 for transparency!
        q = rgb.quantize(colors=254, method=Image.FASTOCTREE)
        raw_pal = q.getpalette() or []
        # Pad raw_pal to 254*3 if shorter
        raw_pal = (raw_pal + [0] * 768)[:254 * 3]
        new_pal = [0, 0, 0] + raw_pal + [0, 0, 0]
        shifted = q.point(lambda p: p + 1)
        transparent_mask = alpha.point(lambda a: 255 if a < 96 else 0)
        shifted.paste(0, mask=transparent_mask)
        shifted.putpalette(new_pal)
        shifted.info['transparency'] = 0
        pal_frames.append(shifted)

    pal_frames[0].save(
        out_path,
        save_all=True,
        append_images=pal_frames[1:],
        duration=duration,
        loop=0,
        transparency=0,
        disposal=2
    )
    print(f'Saved {out_path} ({len(pal_frames)} frames, {frames[0].size})')


def extract_gif_frames(path):
    im = Image.open(path)
    frames = []
    durations = []
    for i in range(getattr(im, 'n_frames', 1)):
        im.seek(i)
        frames.append(im.convert('RGBA'))
        durations.append(im.info.get('duration', 90) or 90)
    avg_dur = int(sum(durations) / max(1, len(durations)))
    return frames, max(60, min(130, avg_dur))


# ==============================================================================
# 1. 读报僵尸 (Newspaper Zombie) - 对齐到 166x144 标准僵尸画布 (脚底 y=142, 中心 x=105)
# ==============================================================================
def build_newspaper_assets():
    mapping = [
        ('sucai/═╖╫▀1(HeadWalk1).gif', 'assets/zombies/newspaper_walk.gif'),
        ('sucai/═╖▓┐╣Ñ╗≈1(HeadAttack.gif', 'assets/zombies/newspaper_attack.gif'),
        ('sucai/╢¬╩º╡─▒¿╓╜(LostNewspa.gif', 'assets/zombies/newspaper_lost.gif'),
        ('sucai/═╖╫▀0(HeadWalk0).gif', 'assets/zombies/newspaper_rage_walk.gif'),
        ('sucai/═╖▓┐╣Ñ╗≈0(HeadAttack.gif', 'assets/zombies/newspaper_rage_attack.gif'),
        ('sucai/╦└(Die).gif', 'assets/zombies/newspaper_die.gif'),
    ]
    for src, dst in mapping:
        if not os.path.exists(src):
            print('Missing:', src)
            continue
        raw_frames, dur = extract_gif_frames(src)
        # Compute union bbox across frames so animation doesn't jitter
        boxes = [fr.getbbox() for fr in raw_frames if fr.getbbox()]
        max_b = max(b[3] for b in boxes)
        avg_cx = int(sum((b[0] + b[2]) / 2 for b in boxes) / len(boxes))
        out_frames = []
        for fr in raw_frames:
            canvas = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
            dx = 100 - avg_cx
            dy = 142 - max_b
            canvas.alpha_composite(fr, (dx, dy))
            out_frames.append(canvas)
        save_gif(out_frames, dst, duration=dur)

    # Torn newspaper drop sprite
    walk_frames, _ = extract_gif_frames('sucai/═╖╫▀1(HeadWalk1).gif')
    # Crop newspaper region from frame 0
    paper = Image.new('RGBA', (52, 46), (0, 0, 0, 0))
    draw = ImageDraw.Draw(paper)
    # Crisp PVZ cartoon torn newspaper sheets
    draw.polygon([(6, 12), (34, 4), (46, 30), (16, 40)], fill=(235, 232, 222, 255), outline=(55, 55, 55, 255))
    draw.polygon([(14, 18), (44, 12), (48, 38), (18, 43)], fill=(246, 244, 236, 255), outline=(65, 65, 65, 255))
    for ly in range(18, 36, 5):
        draw.line([(20, ly), (40, ly - 3)], fill=(120, 120, 120, 220), width=2)
    draw.rectangle([20, 19, 28, 26], fill=(150, 60, 60, 220))
    paper.save('assets/zombies/newspaper_drop.png')
    print('Saved assets/zombies/newspaper_drop.png')


# ==============================================================================
# 2. 铁栅门僵尸 (Screen Door Zombie) - 原版 166x144 持门行走与啃咬
# ==============================================================================
def build_screendoor_assets():
    walk_src = 'sucai/═╖╫▀1(HeadWalk1)(1).gif'
    atk_src = 'sucai/═╖▓┐╣Ñ╗≈1(HeadAttack(1).gif'

    walk_frames, dur_w = extract_gif_frames(walk_src)
    # Shift slightly right (+12px) so body matches standard zombie x=105
    w_out = []
    for fr in walk_frames:
        c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        c.alpha_composite(fr, (12, 0))
        w_out.append(c)
    save_gif(w_out, 'assets/zombies/screendoor_walk.gif', duration=dur_w)

    atk_frames, dur_a = extract_gif_frames(atk_src)
    boxes = [fr.getbbox() for fr in atk_frames if fr.getbbox()]
    max_b = max(b[3] for b in boxes)
    a_out = []
    for fr in atk_frames:
        c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        c.alpha_composite(fr, (12, 142 - max_b))
        a_out.append(c)
    save_gif(a_out, 'assets/zombies/screendoor_attack.gif', duration=dur_a)

    # Extract screen door portion for falling armor effect
    fr0 = walk_frames[0]
    door_crop = fr0.crop((40, 52, 98, 140)).resize((48, 72), Image.LANCZOS)
    door_drop = Image.new('RGBA', (60, 76), (0, 0, 0, 0))
    door_drop.alpha_composite(door_crop, (6, 2))
    door_drop.save('assets/zombies/screendoor_drop.png')
    print('Saved assets/zombies/screendoor_drop.png')


# ==============================================================================
# 3. 橄榄球僵尸 (Football Zombie) - 原版红球衣 + 红头盔合成与脱盔状态
# ==============================================================================
def find_zombie_head_top(im):
    """Locate the green zombie head top-center inside a 1x frame."""
    px = im.load()
    w, h = im.size
    xs, ys = [], []
    for y in range(0, min(h, 65)):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 120 and g > r + 6 and g > b + 6 and g > 85:
                xs.append(x)
                ys.append(y)
    if not xs:
        return w // 2, 18
    min_y = min(ys)
    top_xs = [x for x, y in zip(xs, ys) if y <= min_y + 18]
    cx = int(sum(top_xs) / len(top_xs))
    return cx, min_y


def build_football_assets():
    helmet_im = load_newsucai_img(b_costumes['橄榄球头盔1'])
    # Scale helmet slightly to fit 1x zombie head snugly
    helmet_fit = helmet_im.resize((52, 56), Image.LANCZOS)
    helmet_drop = helmet_im.resize((54, 58), Image.LANCZOS)
    helmet_drop.save('assets/zombies/football_drop.png')
    print('Saved assets/zombies/football_drop.png')

    def build_seq(prefix, count, anchor_x=105, scale=0.88, with_helmet=True):
        raw = []
        for i in range(1, count + 1):
            key = f'{prefix}{i}'
            if key not in z_costumes:
                continue
            c = z_costumes[key]
            im = load_newsucai_img(c)
            res = c.get('bitmapResolution', 1)
            rx = c['rotationCenterX'] / res
            ry = c['rotationCenterY'] / res
            raw.append((im, rx, ry))

        # Determine foot bottom relative to anchor ry across sequence
        foot_rels = []
        for im, rx, ry in raw:
            bb = im.getbbox()
            if bb:
                foot_rels.append(bb[3] - ry)
        max_foot_rel = max(foot_rels) if foot_rels else 70

        frames = []
        for im, rx, ry in raw:
            work = im.copy()
            if with_helmet:
                hx, hy = find_zombie_head_top(work)
                tmp = Image.new('RGBA', (work.width + 40, work.height + 40), (0, 0, 0, 0))
                tmp.alpha_composite(work, (20, 20))
                # Place football helmet right over cranium
                tmp.alpha_composite(helmet_fit, (20 + hx - 26, 20 + hy - 7))
                work = tmp
                rx += 20
                ry += 20

            sw = max(1, int(work.width * scale))
            sh = max(1, int(work.height * scale))
            scaled = work.resize((sw, sh), Image.LANCZOS)
            srx = rx * scale
            sry = ry * scale
            target_ry = 142 - max_foot_rel * scale

            canvas = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
            px = int(round(anchor_x - srx))
            py = int(round(target_ry - sry))
            canvas.alpha_composite(scaled, (px, py))
            frames.append(canvas)
        return frames

    save_gif(build_seq('橄榄球僵尸1w', 9, anchor_x=104, scale=0.88, with_helmet=True), 'assets/zombies/football_walk.gif', duration=75)
    save_gif(build_seq('橄榄球僵尸1a', 9, anchor_x=100, scale=0.88, with_helmet=True), 'assets/zombies/football_attack.gif', duration=80)
    save_gif(build_seq('橄榄球僵尸1w', 9, anchor_x=104, scale=0.88, with_helmet=False), 'assets/zombies/football_nohelmet_walk.gif', duration=75)
    save_gif(build_seq('橄榄球僵尸1a', 9, anchor_x=100, scale=0.88, with_helmet=False), 'assets/zombies/football_nohelmet_attack.gif', duration=80)

    # Football die sequence
    die_frames = build_seq('橄榄球僵尸倒下', 7, anchor_x=95, scale=0.88, with_helmet=False)
    if die_frames:
        save_gif(die_frames, 'assets/zombies/football_die.gif', duration=100)


# ==============================================================================
# 4. 旗帜僵尸 (Flag Zombie) - 原版举脑子红旗行走与啃咬
# ==============================================================================
def build_flag_assets():
    def build_flag_seq(prefix, count, anchor_x=104, scale=0.88):
        raw = []
        for i in range(1, count + 1):
            key = f'{prefix}{i}'
            if key not in z_costumes:
                continue
            c = z_costumes[key]
            im = load_newsucai_img(c)
            res = c.get('bitmapResolution', 1)
            rx = c['rotationCenterX'] / res
            ry = c['rotationCenterY'] / res
            raw.append((im, rx, ry))

        foot_rels = [im.getbbox()[3] - ry for im, rx, ry in raw if im.getbbox()]
        max_foot_rel = max(foot_rels) if foot_rels else 70

        frames = []
        for im, rx, ry in raw:
            sw = max(1, int(im.width * scale))
            sh = max(1, int(im.height * scale))
            scaled = im.resize((sw, sh), Image.LANCZOS)
            srx = rx * scale
            sry = ry * scale
            target_ry = 142 - max_foot_rel * scale
            canvas = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
            canvas.alpha_composite(scaled, (int(round(anchor_x - srx)), int(round(target_ry - sry))))
            frames.append(canvas)
        return frames

    save_gif(build_flag_seq('旗帜僵尸1w', 11, anchor_x=96, scale=0.88), 'assets/zombies/flag_walk.gif', duration=85)
    save_gif(build_flag_seq('旗帜僵尸1a', 10, anchor_x=98, scale=0.88), 'assets/zombies/flag_attack.gif', duration=85)


# ==============================================================================
# 5. 舞王僵尸 (Dancing Zombie) & 伴舞僵尸 (Backup Dancer)
#    基于原版僵尸骨骼帧定制爆炸头、墨镜、迪斯科红西装/紫马甲与聚光灯召唤动画
# ==============================================================================
def tint_coat(im, coat_rgb, pants_rgb):
    """Recolor brown coat & blue pants pixels on a PVZ zombie frame while keeping green skin intact."""
    out = im.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            # Keep green zombie skin, white eyes, red tie/mouth
            if g > r + 8 and g > b + 5:
                continue
            # Brown coat -> disco jacket color
            if r > g + 12 and g > b + 8 and r < 185 and y < 118:
                lum = (r * 0.35 + g * 0.45 + b * 0.2) / 110.0
                nr = min(255, int(coat_rgb[0] * lum))
                ng = min(255, int(coat_rgb[1] * lum))
                nb = min(255, int(coat_rgb[2] * lum))
                px[x, y] = (nr, ng, nb, a)
            # Blue-grey pants -> disco bell-bottoms
            elif b > r + 8 and y >= 92:
                lum = (r * 0.3 + g * 0.4 + b * 0.3) / 100.0
                nr = min(255, int(pants_rgb[0] * lum))
                ng = min(255, int(pants_rgb[1] * lum))
                nb = min(255, int(pants_rgb[2] * lum))
                px[x, y] = (nr, ng, nb, a)
    return out


def draw_star_sparkle(draw, cx, cy, size, color):
    draw.line([(cx - size, cy), (cx + size, cy)], fill=color, width=2)
    draw.line([(cx, cy - size), (cx, cy + size)], fill=color, width=2)
    draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 255, 255, 255))


def decorate_disco_head(im, is_leader=True, spotlight_phase=None):
    canvas = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
    draw_bg = ImageDraw.Draw(canvas)

    # Disco floor ring & sparkles during summoning (1-bit GIF safe!)
    if spotlight_phase is not None:
        ring_cols = [(255, 215, 60, 255), (90, 230, 255, 255), (255, 105, 220, 255)]
        rcol = ring_cols[spotlight_phase % len(ring_cols)]
        draw_bg.arc([68, 129, 142, 143], start=0, end=360, fill=rcol, width=3)

    canvas.alpha_composite(im, (0, 0))
    hx, hy = find_zombie_head_top(im)
    d = ImageDraw.Draw(canvas)

    if is_leader:
        # Big fluffy 70s Disco Afro around cranium
        afro_layer = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        ad = ImageDraw.Draw(afro_layer)
        cx, cy = hx + 3, hy + 10
        for ox, oy, rad in [(-14, -4, 13), (0, -10, 15), (14, -4, 13), (-18, 8, 11), (18, 8, 11), (8, -7, 13), (-7, -7, 13)]:
            ad.ellipse([cx + ox - rad, cy + oy - rad, cx + ox + rad, cy + oy + rad],
                       fill=(42, 26, 52, 255), outline=(20, 10, 28, 255), width=2)
        ad.arc([cx - 14, cy - 18, cx + 14, cy + 2], start=200, end=340, fill=(125, 88, 155, 255), width=2)
        canvas.alpha_composite(afro_layer)
        face_box = (max(0, hx - 22), min(143, hy + 10), min(165, hx + 18), min(143, hy + 46))
        face_patch = im.crop(face_box)
        canvas.alpha_composite(face_patch, (face_box[0], face_box[1]))

        # Funky Gold Disco Sunglasses
        gy = hy + 14
        d.rectangle([hx - 16, gy, hx - 5, gy + 8], fill=(255, 205, 45, 255), outline=(40, 25, 10, 255))
        d.rectangle([hx - 2, gy, hx + 9, gy + 8], fill=(255, 205, 45, 255), outline=(40, 25, 10, 255))
        d.line([(hx - 5, gy + 3), (hx - 2, gy + 3)], fill=(40, 25, 10, 255), width=2)
        d.line([(hx - 14, gy + 2), (hx - 10, gy + 6)], fill=(255, 255, 235, 255), width=1)
        d.line([(hx, gy + 2), (hx + 4, gy + 6)], fill=(255, 255, 235, 255), width=1)

        # Gold disco medallion on chest
        d.line([(hx - 4, hy + 38), (hx - 2, hy + 49)], fill=(255, 215, 0, 255), width=2)
        d.ellipse([hx - 6, hy + 47, hx + 2, hy + 55], fill=(255, 215, 0, 255), outline=(140, 95, 0, 255))

        if spotlight_phase is not None:
            # Disco arm pointing skyward + musical disco sparkles!
            arm_up = (spotlight_phase % 2) * 3
            d.polygon([
                (hx + 4, hy + 44),
                (hx + 10, hy + 46),
                (hx + 22, hy + 10 - arm_up),
                (hx + 15, hy + 8 - arm_up)
            ], fill=(215, 48, 42, 255), outline=(45, 15, 15, 255))
            d.ellipse([hx + 14, hy + 1 - arm_up, hx + 24, hy + 11 - arm_up],
                      fill=(138, 178, 118, 255), outline=(40, 55, 35, 255))
            sp_cols = [(255, 230, 70, 255), (95, 235, 255, 255), (255, 115, 230, 255)]
            draw_star_sparkle(d, hx - 26, hy + 6 + (spotlight_phase % 3) * 4, 6, sp_cols[spotlight_phase % 3])
            draw_star_sparkle(d, hx + 30, hy + 18 - (spotlight_phase % 3) * 4, 5, sp_cols[(spotlight_phase + 1) % 3])
            draw_star_sparkle(d, hx + 18, max(5, hy - 12), 5, sp_cols[(spotlight_phase + 2) % 3])
    else:
        # Backup Dancer: slicked hair headband + purple shades + 70s mustache
        d.arc([hx - 16, hy - 2, hx + 16, hy + 18], start=190, end=355, fill=(230, 65, 190, 255), width=4)
        gy = hy + 14
        d.rectangle([hx - 15, gy, hx - 5, gy + 7], fill=(90, 210, 255, 235), outline=(25, 35, 50, 255))
        d.rectangle([hx - 2, gy, hx + 8, gy + 7], fill=(90, 210, 255, 235), outline=(25, 35, 50, 255))
        # Mustache
        d.arc([hx - 13, hy + 25, hx + 5, hy + 33], start=180, end=360, fill=(45, 30, 25, 255), width=3)

    return canvas


def build_dancing_assets():
    base_walk, _ = extract_gif_frames('assets/zombies/zombie_walk2.gif')
    base_atk, _ = extract_gif_frames('assets/zombies/zombie_attack.gif')

    # Leader walk (red disco suit + white/gold bell-bottoms)
    leader_walk = []
    for i, fr in enumerate(base_walk[::2]):
        recolored = tint_coat(fr, (220, 52, 48), (235, 225, 215))
        leader_walk.append(decorate_disco_head(recolored, is_leader=True, spotlight_phase=None))
    save_gif(leader_walk, 'assets/zombies/dancing_walk.gif', duration=85)

    # Leader moonwalk entrance (facing right while sliding left with spotlight!)
    moonwalk = []
    for i, fr in enumerate(leader_walk):
        # Flip around zombie center x=105 so he moonwalks backwards!
        cropped = fr.crop((22, 0, 166, 144)).transpose(Image.FLIP_LEFT_RIGHT)
        mw = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        d_bg = ImageDraw.Draw(mw)
        col = [(255, 105, 220, 255), (90, 230, 255, 255), (255, 220, 70, 255)][i % 3]
        d_bg.arc([68, 131, 142, 143], start=0, end=360, fill=col, width=2)
        mw.alpha_composite(cropped, (28, 0))
        moonwalk.append(mw)
    save_gif(moonwalk, 'assets/zombies/dancing_moonwalk.gif', duration=65)

    # Leader summon pose (spotlight + pointing skyward)
    summon_frames = []
    base_stand = base_walk[0]
    for i in range(8):
        recolored = tint_coat(base_stand, (230, 60, 55), (240, 230, 220))
        summon_frames.append(decorate_disco_head(recolored, is_leader=True, spotlight_phase=i))
    save_gif(summon_frames, 'assets/zombies/dancing_summon.gif', duration=100)

    # Leader attack
    leader_atk = []
    for fr in base_atk[::2]:
        recolored = tint_coat(fr, (220, 52, 48), (235, 225, 215))
        leader_atk.append(decorate_disco_head(recolored, is_leader=True, spotlight_phase=None))
    save_gif(leader_atk, 'assets/zombies/dancing_attack.gif', duration=80)

    # Backup Dancer walk & attack (purple disco vest + cyan pants)
    backup_walk = []
    for fr in base_walk[::2]:
        recolored = tint_coat(fr, (142, 68, 215), (75, 165, 215))
        backup_walk.append(decorate_disco_head(recolored, is_leader=False))
    save_gif(backup_walk, 'assets/zombies/backup_walk.gif', duration=90)

    backup_atk = []
    for fr in base_atk[::2]:
        recolored = tint_coat(fr, (142, 68, 215), (75, 165, 215))
        backup_atk.append(decorate_disco_head(recolored, is_leader=False))
    save_gif(backup_atk, 'assets/zombies/backup_attack.gif', duration=85)


# ==============================================================================
# 6. 2-5 锤僵尸木槌 (Wooden Mallet) & 蘑菇白天睡眠贴图补全
# ==============================================================================
def build_mallet_and_sleep_assets():
    # Crisp PVZ1 Wooden Mallet (88x88)
    mallet = Image.new('RGBA', (88, 88), (0, 0, 0, 0))
    d = ImageDraw.Draw(mallet)
    # Handle (angled bottom-right to center)
    d.polygon([(42, 44), (50, 38), (82, 74), (74, 82)], fill=(168, 112, 56, 255), outline=(65, 38, 15, 255))
    d.line([(48, 43), (77, 75)], fill=(205, 150, 88, 220), width=3)
    # Heavy barrel mallet head
    head_layer = Image.new('RGBA', (88, 88), (0, 0, 0, 0))
    hd = ImageDraw.Draw(head_layer)
    hd.rounded_rectangle([12, 14, 62, 48], radius=9, fill=(138, 82, 36, 255), outline=(52, 28, 10, 255), width=3)
    # Iron bands on mallet head
    hd.rectangle([18, 15, 24, 47], fill=(120, 130, 140, 255), outline=(45, 50, 55, 255))
    hd.rectangle([50, 15, 56, 47], fill=(120, 130, 140, 255), outline=(45, 50, 55, 255))
    # Highlight on wood barrel
    hd.rounded_rectangle([26, 19, 48, 26], radius=3, fill=(182, 120, 65, 200))
    head_rot = head_layer.rotate(28, center=(37, 31), resample=Image.BICUBIC)
    mallet.alpha_composite(head_rot)
    mallet.save('assets/ui/mallet.png')
    print('Saved assets/ui/mallet.png')

    # Gentle sleeping animations for Hypno-shroom, Ice-shroom, Doom-shroom (for daytime levels)
    for p_name, src in [
        ('hypnoshroom', 'assets/plants/hypnoshroom.gif'),
        ('iceshroom', 'assets/plants/iceshroom.gif'),
        ('doomshroom', 'assets/plants/doomshroom.gif'),
    ]:
        frames, _ = extract_gif_frames(src)
        base = frames[0]
        sleep_frames = []
        for i in range(8):
            # Subtle slow breathing vertical squash & dim slightly
            phase = math.sin(i / 8.0 * 2 * math.pi)
            sy = 1.0 + 0.035 * phase
            sx = 1.0 - 0.025 * phase
            nw = max(1, int(base.width * sx))
            nh = max(1, int(base.height * sy))
            scaled = base.resize((nw, nh), Image.LANCZOS)
            dimmed = ImageEnhance.Brightness(scaled).enhance(0.88)
            c = Image.new('RGBA', base.size, (0, 0, 0, 0))
            c.alpha_composite(dimmed, ((base.width - nw) // 2, base.height - nh))
            sleep_frames.append(c)
        save_gif(sleep_frames, f'assets/plants/{p_name}_sleep.gif', duration=160)


if __name__ == '__main__':
    build_newspaper_assets()
    build_screendoor_assets()
    build_football_assets()
    build_flag_assets()
    build_dancing_assets()
    build_mallet_and_sleep_assets()
    print('All World 2 assets built successfully!')
