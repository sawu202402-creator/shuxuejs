import math
import os
from PIL import Image, ImageDraw
from build_world2_assets import get_exterior_bg, defringe_1bit_rgba, save_gif, extract_gif_frames

SCRATCH_DIR = '/home/better/.gemini/antigravity/brain/d889d774-4418-4123-8b63-9d3a075eaeac/scratch'
os.makedirs(SCRATCH_DIR, exist_ok=True)

INK = (24, 26, 30, 255)


def new_2x(w, h):
    c = Image.new('RGBA', (w * 2, h * 2), (0, 0, 0, 0))
    return c, ImageDraw.Draw(c)


def strict_ink_silhouette(im):
    """Ensure zero bright/pale matte pixels exist on the 1px exterior silhouette against any background."""
    out = defringe_1bit_rgba(im.convert('RGBA'))
    w, h = out.size
    px = out.load()
    ext = get_exterior_bg(out)

    # Strip any remaining bright outer halo spurs (lum > 155 facing >=2 exterior neighbors)
    strip = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 145:
                if a > 0:
                    strip.append((x, y))
                continue
            ext_4 = sum(
                1 for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in ext
            )
            if ext_4 >= 2 and (r + g + b) / 3.0 > 165 and (max(r, g, b) - min(r, g, b)) < 55:
                strip.append((x, y))
    for x, y in strip:
        px[x, y] = (0, 0, 0, 0)
        ext.add((x, y))

    # Clamp 1px exterior outline to crisp PVZ dark ink so there is zero white/gray/cyan fringe
    orig = out.copy()
    opx = orig.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = opx[x, y]
            if a < 145:
                continue
            ext_4 = sum(
                1 for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in ext
            )
            if ext_4 >= 1:
                lum = (r + g + b) / 3.0
                if lum > 62:
                    t = 0.80 if lum > 110 else 0.68
                    px[x, y] = (
                        int(round(r * (1 - t) + INK[0] * t)),
                        int(round(g * (1 - t) + INK[1] * t)),
                        int(round(b * (1 - t) + INK[2] * t)),
                        255
                    )
                else:
                    px[x, y] = (r, g, b, 255)
            else:
                px[x, y] = (r, g, b, 255)
    return out


def finish_2x(canvas, w, h):
    return strict_ink_silhouette(canvas.resize((w, h), Image.LANCZOS))


def draw_ducky_tube_2x(d, wy):
    """Draw crisp dark-outlined yellow inflatable rubber ducky ring around waist (in 2x coordinates).
    Zero un-outlined white/cyan outer puddle halo!"""
    # Yellow inflatable rubber ducky ring around waist
    d.ellipse((150, wy - 8, 272, wy + 28), fill=(250, 212, 38, 255), outline=INK, width=5)
    # Warm specular highlight strictly inside ring
    d.arc((164, wy - 1, 258, wy + 15), 18, 162, fill=(255, 242, 130, 255), width=4)
    # Bottom orange-gold shading inside ring
    d.arc((158, wy + 4, 264, wy + 23), 195, 345, fill=(224, 168, 20, 255), width=3)
    # Cute rubber duck head facing left at front of ring
    d.ellipse((134, wy - 34, 178, wy + 6), fill=(252, 218, 42, 255), outline=INK, width=5)
    # Orange duck bill with crisp INK border
    d.polygon([(118, wy - 16), (140, wy - 24), (140, wy - 8)], fill=(242, 126, 28, 255), outline=INK)
    d.line((118, wy - 16, 140, wy - 24), fill=INK, width=4)
    d.line((118, wy - 16, 140, wy - 8), fill=INK, width=4)
    # Glossy black button eye
    d.ellipse((146, wy - 24, 156, wy - 14), fill=INK)
    d.ellipse((148, wy - 22, 151, wy - 19), fill=(255, 255, 255, 255))


def main():
    z_walk_raw, _ = extract_gif_frames('assets/zombies/zombie_walk.gif')
    z_atk_raw, _ = extract_gif_frames('assets/zombies/zombie_attack.gif')
    z_walk = [strict_ink_silhouette(z_walk_raw[int(i * len(z_walk_raw) / 10)]) for i in range(10)]
    z_atk = [strict_ink_silhouette(z_atk_raw[int(i * len(z_atk_raw) / 10)]) for i in range(10)]

    # 1. Ducky Land Walk (walking on right stone walkway BEFORE entering pool: full legs + ducky ring at waist!)
    ducky_land = []
    for idx, bf in enumerate(z_walk):
        bob = int(round(math.sin(idx * math.tau / len(z_walk)) * 1.5))
        c = bf.copy()
        ov, d = new_2x(166, 144)
        wy = (96 + bob) * 2
        draw_ducky_tube_2x(d, wy)
        c.alpha_composite(finish_2x(ov, 166, 144))
        ducky_land.append(strict_ink_silhouette(c))
    save_gif(ducky_land, 'assets/zombies/ducky_land_walk.gif', 90)

    # 2. Ducky Swim & Attack IN POOL (submerged below waist, crisp yellow ducky tube, ZERO white/cyan outer halo!)
    def make_ducky_pool(base_frames):
        out = []
        for idx, bf in enumerate(base_frames):
            bob = int(round(math.sin(idx * math.tau / len(base_frames)) * 2))
            c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
            upper = bf.crop((0, 0, 166, 104))
            c.alpha_composite(upper, (0, 12 + bob))

            ov, d = new_2x(166, 144)
            wy = (114 + bob) * 2
            draw_ducky_tube_2x(d, wy)
            c.alpha_composite(finish_2x(ov, 166, 144))
            out.append(strict_ink_silhouette(c))
        return out

    ducky_w = make_ducky_pool(z_walk)
    ducky_a = make_ducky_pool(z_atk)
    save_gif(ducky_w, 'assets/zombies/ducky_walk.gif', 95)
    save_gif(ducky_a, 'assets/zombies/ducky_attack.gif', 90)

    # 3. Snorkel Land Walk + Pool Swim + Pool Attack (zero pale halo)
    snorkel_land = []
    for idx, bf in enumerate(z_walk):
        c = bf.copy()
        ov, d = new_2x(166, 144)
        hy = 34 * 2
        d.rounded_rectangle((150, hy + 10, 200, hy + 30), radius=6, fill=(82, 224, 248, 255), outline=INK, width=4)
        d.rounded_rectangle((200, hy - 18, 212, hy + 36), radius=4, fill=(46, 192, 86, 255), outline=INK, width=4)
        d.ellipse((198, hy - 24, 214, hy - 14), fill=(242, 196, 38, 255), outline=INK, width=3)
        c.alpha_composite(finish_2x(ov, 166, 144))
        snorkel_land.append(strict_ink_silhouette(c))
    save_gif(snorkel_land, 'assets/zombies/snorkel_land_walk.gif', 90)

    snorkel_swim = []
    for i in range(8):
        phase = i * math.tau / 8
        bob = int(round(math.sin(phase) * 2))
        c, d = new_2x(166, 144)
        wy = (118 + bob) * 2
        # Dark-outlined water wake crest + submerged zombie crown + green snorkel tube
        d.ellipse((142, wy + 2, 266, wy + 24), fill=(44, 146, 208, 255), outline=INK, width=4)
        d.pieslice((166, wy - 24, 236, wy + 20), 180, 360, fill=(116, 144, 118, 255), outline=INK, width=5)
        d.rounded_rectangle((158, wy - 14, 190, wy + 2), radius=5, fill=(78, 218, 242, 255), outline=INK, width=4)
        d.rounded_rectangle((176, wy - 60, 190, wy - 6), radius=5, fill=(46, 192, 86, 255), outline=INK, width=4)
        d.ellipse((174, wy - 66, 192, wy - 54), fill=(242, 196, 38, 255), outline=INK, width=3)
        snorkel_swim.append(finish_2x(c, 166, 144))
    save_gif(snorkel_swim, 'assets/zombies/snorkel_swim.gif', 95)

    snorkel_atk = []
    for idx, bf in enumerate(z_atk):
        bob = int(round(math.sin(idx * math.tau / len(z_atk)) * 2))
        c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        c.alpha_composite(bf.crop((0, 0, 166, 100)), (0, 22 + bob))
        ov, d = new_2x(166, 144)
        wy = (118 + bob) * 2
        d.ellipse((148, wy, 268, wy + 22), fill=(48, 152, 214, 255), outline=INK, width=4)
        hy = (56 + bob) * 2
        d.rounded_rectangle((154, hy + 8, 204, hy + 28), radius=6, fill=(82, 224, 248, 255), outline=INK, width=4)
        d.rounded_rectangle((204, hy - 22, 216, hy + 34), radius=4, fill=(46, 192, 86, 255), outline=INK, width=4)
        c.alpha_composite(finish_2x(ov, 166, 144))
        snorkel_atk.append(strict_ink_silhouette(c))
    save_gif(snorkel_atk, 'assets/zombies/snorkel_attack.gif', 90)

    # 4. Dolphin Rider Land Walk (carrying dolphin under arm) + Ride + Swim + Attack (zero pale halo)
    dolphin_land = []
    for idx, bf in enumerate(z_walk):
        bob = int(round(math.sin(idx * math.tau / len(z_walk)) * 1.5))
        c = bf.copy()
        ov, d = new_2x(166, 144)
        dy = (88 + bob) * 2
        d.ellipse((112, dy - 14, 248, dy + 18), fill=(92, 152, 204, 255), outline=INK, width=4)
        d.ellipse((94, dy - 2, 126, dy + 12), fill=(92, 152, 204, 255), outline=INK, width=4)
        d.polygon([(184, dy - 12), (202, dy - 32), (214, dy - 10)], fill=(76, 134, 188, 255), outline=INK)
        d.line((184, dy - 12, 202, dy - 32, 214, dy - 10), fill=INK, width=4)
        d.ellipse((122, dy - 6, 130, dy + 2), fill=INK)
        c.alpha_composite(finish_2x(ov, 166, 144))
        dolphin_land.append(strict_ink_silhouette(c))
    save_gif(dolphin_land, 'assets/zombies/dolphin_land_walk.gif', 90)

    dolphin_ride = []
    for i in range(8):
        phase = i * math.tau / 8
        bob = int(round(math.sin(phase) * 3))
        c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        rider = z_walk[i % len(z_walk)].crop((0, 0, 166, 100))
        c.alpha_composite(rider, (6, 8 + bob))
        ov, d = new_2x(166, 144)
        dy = (108 + bob) * 2
        d.ellipse((104, dy - 16, 286, dy + 28), fill=(92, 152, 204, 255), outline=INK, width=5)
        d.pieslice((114, dy - 2, 270, dy + 23), 0, 180, fill=(214, 236, 250, 255))
        d.ellipse((104, dy - 16, 286, dy + 28), outline=INK, width=5)
        d.ellipse((84, dy + 2, 126, dy + 20), fill=(92, 152, 204, 255), outline=INK, width=4)
        d.polygon([(202, dy - 14), (226, dy - 42), (242, dy - 12)], fill=(76, 134, 188, 255), outline=INK)
        d.line((202, dy - 14, 226, dy - 42, 242, dy - 12), fill=INK, width=4)
        d.ellipse((122, dy - 6, 132, dy + 4), fill=INK)
        d.ellipse((124, dy - 4, 128, dy), fill=(255, 255, 255, 255))
        c.alpha_composite(finish_2x(ov, 166, 144))
        dolphin_ride.append(strict_ink_silhouette(c))
    save_gif(dolphin_ride, 'assets/zombies/dolphin_ride.gif', 75)
    save_gif(dolphin_ride, 'assets/zombies/dolphin_jump.gif', 75)

    dolphin_swim = []
    for idx, bf in enumerate(z_walk):
        bob = int(round(math.sin(idx * math.tau / len(z_walk)) * 2))
        c = Image.new('RGBA', (166, 144), (0, 0, 0, 0))
        c.alpha_composite(bf.crop((0, 0, 166, 98)), (0, 24 + bob))
        ov, d = new_2x(166, 144)
        wy = (120 + bob) * 2
        d.ellipse((148, wy, 268, wy + 22), fill=(48, 152, 214, 255), outline=INK, width=4)
        c.alpha_composite(finish_2x(ov, 166, 144))
        dolphin_swim.append(strict_ink_silhouette(c))
    save_gif(dolphin_swim, 'assets/zombies/dolphin_swim.gif', 95)
    save_gif(snorkel_atk, 'assets/zombies/dolphin_attack.gif', 90)

    # Render 2x zoomed inspection sheet over Grass, Day Pool Cyan, and Night Fog Indigo!
    bgs = [
        ('Walkway/Grass', (78, 148, 42, 255)),
        ('Day Pool Water', (46, 198, 242, 255)),
        ('Night Fog Water', (24, 34, 78, 255)),
    ]
    samples = [
        ('ducky_land', Image.open('assets/zombies/ducky_land_walk.gif').convert('RGBA')),
        ('ducky_pool', Image.open('assets/zombies/ducky_walk.gif').convert('RGBA')),
        ('snorkel_land', Image.open('assets/zombies/snorkel_land_walk.gif').convert('RGBA')),
        ('snorkel_swim', Image.open('assets/zombies/snorkel_swim.gif').convert('RGBA')),
        ('dolphin_land', Image.open('assets/zombies/dolphin_land_walk.gif').convert('RGBA')),
        ('dolphin_ride', Image.open('assets/zombies/dolphin_ride.gif').convert('RGBA')),
    ]
    sheet = Image.new('RGBA', (len(samples) * 180, len(bgs) * 160), (20, 20, 20, 255))
    for r, (_, bg_col) in enumerate(bgs):
        for c_idx, (_, spr) in enumerate(samples):
            tile = Image.new('RGBA', (180, 160), bg_col)
            tile.alpha_composite(spr, (7, 8))
            sheet.paste(tile, (c_idx * 180, r * 160))
    zoom = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST)
    out_check = os.path.join(SCRATCH_DIR, 'aquatic_defringe_check.png')
    zoom.save(out_check)
    print('Saved inspection sheet:', out_check)


if __name__ == '__main__':
    main()
