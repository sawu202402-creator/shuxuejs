import os
import math
from PIL import Image, ImageDraw, ImageFont

from build_world2_assets import defringe_1bit_rgba, get_exterior_bg, save_gif

SCRATCH_DIR = '/home/better/.gemini/antigravity/brain/d889d774-4418-4123-8b63-9d3a075eaeac/scratch'
FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def strict_clean_frame(im, strip_top_y=0):
    """Convert palette/RGBA frame cleanly, remove exterior light fringes & isolated 1-2px specks."""
    rgba = im.convert('RGBA')
    w, h = rgba.size
    px = rgba.load()

    if strip_top_y > 0:
        for y in range(min(h, strip_top_y)):
            for x in range(w):
                px[x, y] = (0, 0, 0, 0)

    # First standard 1-bit defringe
    rgba = defringe_1bit_rgba(rgba)
    px = rgba.load()

    # Strip isolated tiny specks (pixels with <= 1 opaque 8-neighbor)
    to_clear = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                continue
            nbrs = 0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 0:
                        nbrs += 1
            if nbrs <= 1:
                to_clear.append((x, y))
    for x, y in to_clear:
        px[x, y] = (0, 0, 0, 0)

    # Darken any remaining bright exterior border pixels (prevents white/cyan halo on night/pool)
    for _ in range(2):
        bg = get_exterior_bg(rgba)
        edge_fixes = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                is_ext = False
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in bg:
                        is_ext = True
                        break
                if is_ext:
                    lum = (r + g + b) / 3.0
                    if lum > 175:
                        # Blend toward dark cartoon outline instead of leaving bright white halo
                        edge_fixes.append((x, y, (int(r * 0.28), int(g * 0.28), int(b * 0.30), 255)))
        for x, y, col in edge_fixes:
            px[x, y] = col

    return rgba


def import_zombie_gif(src_path, dst_path, canvas_size=(166, 144), anchor_cx=105, anchor_bottom=142, max_h=None, strip_top_y=0):
    im = Image.open(src_path)
    nf = getattr(im, 'n_frames', 1)
    raw_frames = []
    durations = []
    ux0, uy0, ux1, uy1 = 9999, 9999, 0, 0

    for i in range(nf):
        im.seek(i)
        durations.append(im.info.get('duration', 90) or 90)
        cleaned = strict_clean_frame(im, strip_top_y=strip_top_y)
        bb = cleaned.getbbox()
        if bb:
            ux0, uy0 = min(ux0, bb[0]), min(uy0, bb[1])
            ux1, uy1 = max(ux1, bb[2]), max(uy1, bb[3])
        raw_frames.append(cleaned)

    avg_dur = max(65, min(130, int(round(sum(durations) / max(1, len(durations))))))
    if ux1 <= ux0 or uy1 <= uy0:
        return

    union_w = ux1 - ux0
    union_h = uy1 - uy0
    scale = 1.0
    if max_h and union_h > max_h:
        scale = max_h / float(union_h)
    if union_w * scale > canvas_size[0] - 6:
        scale = min(scale, (canvas_size[0] - 6) / float(union_w))

    cw, ch = canvas_size
    out_frames = []
    for fr in raw_frames:
        sub = fr.crop((ux0, uy0, ux1, uy1))
        if abs(scale - 1.0) > 0.01:
            nw = max(1, int(round(sub.width * scale)))
            nh = max(1, int(round(sub.height * scale)))
            sub = strict_clean_frame(sub.resize((nw, nh), Image.LANCZOS))
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        ox = int(round(anchor_cx - sub.width / 2.0))
        ox = max(0, min(cw - sub.width, ox))
        oy = int(round(anchor_bottom - sub.height))
        oy = max(0, min(ch - sub.height, oy))
        canvas.alpha_composite(sub, (ox, oy))
        out_frames.append(canvas)

    save_gif(out_frames, dst_path, duration=avg_dur)
    print(f'  [Zombie] {os.path.basename(dst_path):26s} <- {src_path} ({len(out_frames)}f, scale={scale:.2f})')


def import_charred_gif(src_path, dst_path, canvas_size=(166, 144), anchor_cx=105, anchor_bottom=142, target_h=120):
    im = Image.open(src_path)
    nf = getattr(im, 'n_frames', 1)
    raw = []
    ux0, uy0, ux1, uy1 = 9999, 9999, 0, 0
    for i in range(nf):
        im.seek(i)
        cl = strict_clean_frame(im)
        bb = cl.getbbox()
        if bb:
            ux0, uy0 = min(ux0, bb[0]), min(uy0, bb[1])
            ux1, uy1 = max(ux1, bb[2]), max(uy1, bb[3])
        raw.append(cl)
    if not raw or not raw[0].getbbox():
        return
    f0_bb = raw[0].getbbox()
    scale = target_h / float(max(1, f0_bb[3] - f0_bb[1]))
    cw, ch = canvas_size
    out = []
    for fr in raw:
        sub = fr.crop((ux0, uy0, ux1, uy1))
        if abs(scale - 1.0) > 0.01:
            nw = max(1, int(round(sub.width * scale)))
            nh = max(1, int(round(sub.height * scale)))
            sub = strict_clean_frame(sub.resize((nw, nh), Image.LANCZOS))
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        ox = max(0, min(cw - sub.width, int(round(anchor_cx - sub.width / 2.0))))
        oy = max(0, min(ch - sub.height, int(round(anchor_bottom - sub.height))))
        canvas.alpha_composite(sub, (ox, oy))
        out.append(canvas)
    durs = [115] * (len(out) - 1) + [1200]
    save_gif(out, dst_path, duration=durs)
    print(f'  [Charred] {os.path.basename(dst_path):25s} <- {src_path} ({len(out)}f, scale={scale:.2f})')


def import_plant_gif(src_path, dst_path, max_size=None):
    im = Image.open(src_path)
    nf = getattr(im, 'n_frames', 1)
    frames = []
    durations = []
    for i in range(nf):
        im.seek(i)
        durations.append(im.info.get('duration', 90) or 90)
        fr = strict_clean_frame(im)
        if max_size and (fr.width > max_size[0] or fr.height > max_size[1]):
            fr.thumbnail(max_size, Image.LANCZOS)
            fr = strict_clean_frame(fr)
        frames.append(fr)
    avg_dur = max(65, min(130, int(round(sum(durations) / max(1, len(durations))))))
    save_gif(frames, dst_path, duration=avg_dur)
    print(f'  [Plant]  {os.path.basename(dst_path):26s} <- {src_path} ({len(frames)}f, {frames[0].size})')


def build_seed_card(card_id, sprite_path, cost, theme='day'):
    ref = Image.open('assets/cards/card_sunflower.png').convert('RGBA')
    sun_coin = ref.crop((9, 109, 32, 132))
    font_cost = ImageFont.truetype(FONT_BOLD_PATH, 20)

    card = Image.new('RGBA', (100, 140), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    # Outer bevelled frame matching build_full_game_assets.py
    d.rounded_rectangle((1, 1, 98, 138), radius=8, fill=(92, 66, 44, 255), outline=(36, 24, 14, 255), width=3)
    d.rounded_rectangle((5, 5, 94, 134), radius=6, fill=(238, 224, 186, 255), outline=(146, 114, 76, 255), width=2)

    # Portrait backdrop by theme
    if theme == 'night':
        top_bg, bot_bg = (42, 48, 96, 255), (68, 56, 118, 255)
    elif theme == 'pool':
        top_bg, bot_bg = (96, 198, 242, 255), (42, 148, 208, 255)
    elif theme == 'upgrade':
        top_bg, bot_bg = (128, 66, 168, 255), (168, 98, 206, 255)
    else:
        top_bg, bot_bg = (138, 208, 246, 255), (108, 186, 82, 255)

    d.rectangle((8, 8, 91, 66), fill=top_bg)
    d.rectangle((8, 66, 91, 102), fill=bot_bg)
    d.rectangle((8, 8, 91, 102), outline=(88, 68, 44, 255), width=2)

    # Plant sprite centered in portrait
    sp = Image.open(sprite_path)
    if getattr(sp, 'n_frames', 1) > 1:
        sp.seek(0)
    sp = strict_clean_frame(sp)
    bb = sp.getbbox()
    if bb:
        sp = sp.crop(bb)
    sp.thumbnail((68, 76), Image.LANCZOS)
    card.alpha_composite(sp, ((100 - sp.width) // 2, 12 + (84 - sp.height) // 2))

    # Bottom parchment price bar
    d.rectangle((8, 104, 91, 132), fill=(246, 236, 202, 255), outline=(128, 98, 62, 255), width=1)
    card.alpha_composite(sun_coin, (10, 107))
    cost_str = str(cost)
    tb = d.textbbox((0, 0), cost_str, font=font_cost)
    tw = tb[2] - tb[0]
    d.text((86 - tw, 108), cost_str, font=font_cost, fill=(28, 22, 14, 255))

    out_path = f'assets/cards/card_{card_id}.png'
    card.save(out_path)
    print(f'  [Card]   {out_path} ({cost})')


def main():
    z_base = 'sucai/jspvz/images/Zombies'
    p_base = 'sucai/jspvz/images/Plants'
    i_base = 'sucai/jspvz/images/interface'

    print('=== 1. Importing 8 Original PVZ1 Zombie Families ===')
    # 1. Dancing Zombie
    import_zombie_gif(f'{z_base}/DancingZombie/SlidingStep.gif', 'assets/zombies/dancing_moonwalk.gif', max_h=130)
    import_zombie_gif(f'{z_base}/DancingZombie/Summon.gif', 'assets/zombies/dancing_summon.gif', max_h=130)
    import_zombie_gif(f'{z_base}/DancingZombie/Dancing.gif', 'assets/zombies/dancing_walk.gif', max_h=132)
    import_zombie_gif(f'{z_base}/DancingZombie/Attack.gif', 'assets/zombies/dancing_attack.gif', max_h=130)
    import_zombie_gif(f'{z_base}/DancingZombie/Die.gif', 'assets/zombies/dancing_die.gif', max_h=130)

    # 2. Backup Dancer
    import_zombie_gif(f'{z_base}/BackupDancer/BackupDancer.gif', 'assets/zombies/backup_walk.gif', max_h=128)
    import_zombie_gif(f'{z_base}/BackupDancer/Attack.gif', 'assets/zombies/backup_attack.gif', max_h=128)
    import_zombie_gif(f'{z_base}/BackupDancer/Die.gif', 'assets/zombies/backup_die.gif', max_h=128)

    # 3. Ducky Tube Zombie (strip_top_y=22 on Walk2 removes the 3 stray pixels at top)
    import_zombie_gif(f'{z_base}/DuckyTubeZombie1/Walk1.gif', 'assets/zombies/ducky_land_walk.gif', max_h=124)
    import_zombie_gif(f'{z_base}/DuckyTubeZombie1/Walk2.gif', 'assets/zombies/ducky_walk.gif', anchor_bottom=136, max_h=96, strip_top_y=22)
    import_zombie_gif(f'{z_base}/DuckyTubeZombie1/Attack.gif', 'assets/zombies/ducky_attack.gif', anchor_bottom=136, max_h=94)
    import_zombie_gif(f'{z_base}/DuckyTubeZombie1/Die.gif', 'assets/zombies/ducky_die.gif', anchor_bottom=138, max_h=105)

    # 4. Snorkel Zombie
    import_zombie_gif(f'{z_base}/SnorkelZombie/Walk1.gif', 'assets/zombies/snorkel_land_walk.gif', max_h=128)
    import_zombie_gif(f'{z_base}/SnorkelZombie/Walk2.gif', 'assets/zombies/snorkel_swim.gif', anchor_bottom=136, max_h=56)
    import_zombie_gif(f'{z_base}/SnorkelZombie/Attack.gif', 'assets/zombies/snorkel_attack.gif', anchor_bottom=136, max_h=82)
    import_zombie_gif(f'{z_base}/SnorkelZombie/Die.gif', 'assets/zombies/snorkel_die.gif', anchor_bottom=138, max_h=100)

    # 5. Dolphin Rider Zombie
    import_zombie_gif(f'{z_base}/DolphinRiderZombie/Walk1.gif', 'assets/zombies/dolphin_land_walk.gif', max_h=126)
    import_zombie_gif(f'{z_base}/DolphinRiderZombie/Walk2.gif', 'assets/zombies/dolphin_ride.gif', anchor_bottom=138, max_h=98)
    import_zombie_gif(f'{z_base}/DolphinRiderZombie/Jump.gif', 'assets/zombies/dolphin_jump.gif', anchor_bottom=138, max_h=136)
    import_zombie_gif(f'{z_base}/DolphinRiderZombie/Walk3.gif', 'assets/zombies/dolphin_swim.gif', anchor_bottom=136, max_h=86)
    import_zombie_gif(f'{z_base}/DolphinRiderZombie/Attack.gif', 'assets/zombies/dolphin_attack.gif', anchor_bottom=136, max_h=84)
    import_zombie_gif(f'{z_base}/DolphinRiderZombie/Die.gif', 'assets/zombies/dolphin_die.gif', anchor_bottom=138, max_h=98)

    # 6. Zomboni (196x164 vehicle canvas) + Ice Trail
    import_zombie_gif(f'{z_base}/Zomboni/1.gif', 'assets/zombies/zomboni_drive.gif', canvas_size=(196, 164), anchor_cx=106, anchor_bottom=158, max_h=152)
    import_zombie_gif(f'{z_base}/Zomboni/BoomDie.gif', 'assets/zombies/zomboni_die.gif', canvas_size=(196, 164), anchor_cx=106, anchor_bottom=158, max_h=154)
    if os.path.exists(f'{z_base}/Zomboni/ice.png'):
        Image.open(f'{z_base}/Zomboni/ice.png').convert('RGBA').save('assets/ui/ice_trail.png')
    if os.path.exists(f'{z_base}/Zomboni/ice_cap.png'):
        Image.open(f'{z_base}/Zomboni/ice_cap.png').convert('RGBA').save('assets/ui/ice_cap.png')

    # 7. Jack-in-the-Box Zombie
    import_zombie_gif(f'{z_base}/JackinTheBoxZombie/Walk.gif', 'assets/zombies/jack_walk.gif', max_h=130)
    import_zombie_gif(f'{z_base}/JackinTheBoxZombie/OpenBox.gif', 'assets/zombies/jack_open.gif', max_h=130)
    import_zombie_gif(f'{z_base}/JackinTheBoxZombie/Attack.gif', 'assets/zombies/jack_attack.gif', max_h=130)
    import_zombie_gif(f'{z_base}/JackinTheBoxZombie/Die.gif', 'assets/zombies/jack_die.gif', max_h=130)

    # 8. Imp
    import_zombie_gif(f'{z_base}/Imp/1.gif', 'assets/zombies/imp_walk.gif', max_h=86)
    import_zombie_gif(f'{z_base}/Imp/Attack.gif', 'assets/zombies/imp_attack.gif', max_h=84)
    import_zombie_gif(f'{z_base}/Imp/Die.gif', 'assets/zombies/imp_die.gif', max_h=86)
    import_charred_gif(f'{z_base}/Zombie/BoomDie.gif', 'assets/zombies/zombie_charred.gif', target_h=120)
    import_charred_gif(f'{z_base}/Imp/BoomDie.gif', 'assets/zombies/imp_charred.gif', target_h=80)

    print('=== 2. Importing Original PVZ1 Plants & Effects ===')
    import_plant_gif(f'{p_base}/GraveBuster/GraveBuster.gif', 'assets/plants/gravebuster.gif', max_size=(96, 98))
    import_plant_gif(f'{p_base}/TangleKlep/Float.gif', 'assets/plants/tanglekelp.gif', max_size=(88, 72))
    if os.path.exists(f'{p_base}/TangleKlep/Grab.png'):
        strict_clean_frame(Image.open(f'{p_base}/TangleKlep/Grab.png')).save('assets/plants/tanglekelp_grab.png')

    import_plant_gif(f'{p_base}/GloomShroom/GloomShroom.gif', 'assets/plants/gloomshroom.gif', max_size=(95, 83))
    import_plant_gif(f'{p_base}/GloomShroom/GloomShroomAttack.gif', 'assets/plants/gloomshroom_attack.gif', max_size=(95, 83))
    import_plant_gif(f'{p_base}/GloomShroom/GloomShroomSleep.gif', 'assets/plants/gloomshroom_sleep.gif', max_size=(95, 83))

    import_plant_gif(f'{p_base}/PumpkinHead/PumpkinHead1.gif', 'assets/plants/pumpkin_cracked1.gif', max_size=(97, 67))
    import_plant_gif(f'{p_base}/PumpkinHead/PumpkinHead2.gif', 'assets/plants/pumpkin_cracked2.gif', max_size=(97, 67))
    import_plant_gif(f'{p_base}/HypnoShroom/HypnoShroomSleep.gif', 'assets/plants/hypnoshroom_sleep.gif', max_size=(71, 80))
    import_plant_gif(f'{p_base}/IceShroom/IceShroomSleep.gif', 'assets/plants/iceshroom_sleep.gif', max_size=(83, 75))
    import_plant_gif(f'{p_base}/DoomShroom/Sleep.gif', 'assets/plants/doomshroom_sleep.gif', max_size=(92, 84))

    # Bowling rolling animations
    import_plant_gif(f'{p_base}/WallNut/WallNutRoll.gif', 'assets/plants/wallnut_roll.gif', max_size=(71, 71))
    import_plant_gif(f'{p_base}/WallNut/BoomWallNutRoll.gif', 'assets/plants/wallnut_red_roll.gif', max_size=(71, 71))

    # Seed cards for Tangle Kelp & Gloom-shroom (Gatling, TwinSunflower, Spikerock already have cards!)
    build_seed_card('tanglekelp', 'assets/plants/tanglekelp.gif', 25, 'pool')
    build_seed_card('gloomshroom', 'assets/plants/gloomshroom.gif', 150, 'upgrade')
    build_seed_card('gravebuster', 'assets/plants/gravebuster.gif', 75, 'night')

    # Night Roof background for 5-10
    if os.path.exists(f'{i_base}/background6boss.jpg'):
        bg6 = Image.open(f'{i_base}/background6boss.jpg').convert('RGB')
        bg6.crop((220, 0, 1120, 600)).save('assets/backgrounds/roof_night_viewport.jpg', quality=92)
        print('  [BG]     assets/backgrounds/roof_night_viewport.jpg (900x600)')

    # Verification contact sheet on Night & Pool backdrops
    verify_list = [
        'assets/zombies/dancing_moonwalk.gif',
        'assets/zombies/backup_walk.gif',
        'assets/zombies/ducky_land_walk.gif',
        'assets/zombies/ducky_walk.gif',
        'assets/zombies/snorkel_land_walk.gif',
        'assets/zombies/snorkel_swim.gif',
        'assets/zombies/dolphin_land_walk.gif',
        'assets/zombies/dolphin_ride.gif',
        'assets/zombies/zomboni_drive.gif',
        'assets/zombies/jack_walk.gif',
        'assets/zombies/jack_open.gif',
        'assets/zombies/imp_walk.gif',
        'assets/plants/gravebuster.gif',
        'assets/plants/tanglekelp.gif',
        'assets/plants/gloomshroom.gif',
    ]
    sheet = Image.new('RGBA', (5 * 200, 3 * 170), (20, 30, 56, 255))
    sd = ImageDraw.Draw(sheet)
    for idx, p in enumerate(verify_list):
        c, r = idx % 5, idx // 5
        if r == 1:
            sd.rectangle((c * 200, r * 170, (c + 1) * 200, (r + 1) * 170), fill=(36, 152, 214, 255))
        im = Image.open(p)
        im.seek(getattr(im, 'n_frames', 1) // 2)
        fr = im.convert('RGBA')
        ox = c * 200 + (200 - fr.width) // 2
        oy = r * 170 + (170 - fr.height) // 2
        sheet.alpha_composite(fr, (ox, oy))
        sd.text((c * 200 + 6, r * 170 + 4), os.path.basename(p), fill=(255, 240, 150, 255))
    sheet.save(os.path.join(SCRATCH_DIR, 'jspvz_imported_verified.png'))
    print('Saved verification sheet:', os.path.join(SCRATCH_DIR, 'jspvz_imported_verified.png'))


if __name__ == '__main__':
    main()
