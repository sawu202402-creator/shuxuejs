import os, sys, json, base64, shutil
from PIL import Image
from io import BytesIO

def get_image(filename):
    path = os.path.join('newsucai', filename)
    if not os.path.exists(path):
        return None
    if filename.endswith('.png'):
        return Image.open(path).convert('RGBA')
    elif filename.endswith('.svg'):
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        idx = content.find('data:image/png;base64,')
        if idx != -1:
            start = idx + len('data:image/png;base64,')
            end = content.find('"', start)
            b64data = content[start:end]
            return Image.open(BytesIO(base64.b64decode(b64data))).convert('RGBA')
    return None

def make_gif_from_frames(frames, out_path, duration=100, max_size=None):
    if not frames:
        return
    if max_size:
        resized = []
        for im in frames:
            im2 = im.copy()
            im2.thumbnail(max_size, Image.Resampling.LANCZOS)
            resized.append(im2)
        frames = resized

    # Normalize dimensions
    max_w = max(im.width for im in frames)
    max_h = max(im.height for im in frames)
    padded = []
    for im in frames:
        bg = Image.new('RGBA', (max_w, max_h), (0, 0, 0, 0))
        off_x = (max_w - im.width) // 2
        off_y = (max_h - im.height)
        bg.paste(im, (off_x, off_y), im)
        padded.append(bg)

    padded[0].save(
        out_path,
        save_all=True,
        append_images=padded[1:],
        duration=duration,
        loop=0,
        disposal=2
    )
    print(f'Saved {out_path} ({len(padded)} frames, {max_w}x{max_h})')

with open('newsucai/project.json') as f:
    d = json.load(f)

targets = {t['name']: {c['name']: c['md5ext'] for c in t.get('costumes', [])} for t in d['targets']}
costumes_plant = targets.get('植物', {})
costumes_bullet = targets.get('子弹&掉落物&饰品&动画', {})

os.makedirs('assets/plants', exist_ok=True)
os.makedirs('assets/projectiles', exist_ok=True)

# 1. 卷心菜投手
cabbage_idle_frames = [get_image(costumes_plant[f'卷心菜投手{i}']) for i in range(1, 13) if f'卷心菜投手{i}' in costumes_plant]
make_gif_from_frames([f for f in cabbage_idle_frames if f], 'assets/plants/cabbagepult.gif', duration=110, max_size=(80, 85))

cabbage_atk_frames = [get_image(costumes_plant[f'卷心菜投手a{i}']) for i in range(1, 11) if f'卷心菜投手a{i}' in costumes_plant]
make_gif_from_frames([f for f in cabbage_atk_frames if f], 'assets/plants/cabbagepult_attack.gif', duration=90, max_size=(80, 85))

# 卷心菜子弹
if '卷心菜' in costumes_bullet:
    im = get_image(costumes_bullet['卷心菜'])
    if im:
        im.thumbnail((32, 32), Image.Resampling.LANCZOS)
        im.save('assets/projectiles/cabbage.png')
        print('Saved assets/projectiles/cabbage.png')

# 2. 玉米投手
corn_idle_frames = [get_image(costumes_plant[f'玉米投手{i}']) for i in range(1, 9) if f'玉米投手{i}' in costumes_plant]
make_gif_from_frames([f for f in corn_idle_frames if f], 'assets/plants/kernelpult.gif', duration=120, max_size=(80, 85))

corn_atk_frames = [get_image(costumes_plant[f'玉米投手a{i}']) for i in range(1, 10) if f'玉米投手a{i}' in costumes_plant]
make_gif_from_frames([f for f in corn_atk_frames if f], 'assets/plants/kernelpult_attack.gif', duration=90, max_size=(80, 85))

# 玉米粒与黄油子弹
if '玉米粒' in costumes_bullet:
    im = get_image(costumes_bullet['玉米粒'])
    if im:
        im.thumbnail((28, 28), Image.Resampling.LANCZOS)
        im.save('assets/projectiles/corn.png')
        print('Saved assets/projectiles/corn.png')

if '黄油' in costumes_bullet:
    im = get_image(costumes_bullet['黄油'])
    if im:
        im.thumbnail((34, 28), Image.Resampling.LANCZOS)
        im.save('assets/projectiles/butter.png')
        print('Saved assets/projectiles/butter.png')

# 3. 西瓜投手
melon_idle_frames = [get_image(costumes_plant[f'西瓜投手{i}']) for i in range(1, 12) if f'西瓜投手{i}' in costumes_plant]
make_gif_from_frames([f for f in melon_idle_frames if f], 'assets/plants/melonpult.gif', duration=110, max_size=(86, 90))

melon_atk_frames = [get_image(costumes_plant[f'西瓜投手a{i}']) for i in range(1, 10) if f'西瓜投手a{i}' in costumes_plant]
make_gif_from_frames([f for f in melon_atk_frames if f], 'assets/plants/melonpult_attack.gif', duration=90, max_size=(86, 90))

if '西瓜' in costumes_bullet:
    im = get_image(costumes_bullet['西瓜'])
    if im:
        im.thumbnail((36, 32), Image.Resampling.LANCZOS)
        im.save('assets/projectiles/melon.png')
        print('Saved assets/projectiles/melon.png')

# 4. 杨桃 (星星果)
star_idle_frames = [get_image(costumes_plant[f'杨桃{i}']) for i in range(1, 10) if f'杨桃{i}' in costumes_plant]
make_gif_from_frames([f for f in star_idle_frames if f], 'assets/plants/starfruit.gif', duration=100, max_size=(75, 75))

if '星星' in costumes_bullet:
    im = get_image(costumes_bullet['星星'])
    if im:
        im.thumbnail((26, 26), Image.Resampling.LANCZOS)
        im.save('assets/projectiles/star.png')
        print('Saved assets/projectiles/star.png')

# 5. 磁力菇
magnet_frames = []
for name in ['磁力菇冷却1', '磁力菇吸收1', '磁力菇睡觉1']:
    if name in costumes_plant:
        f = get_image(costumes_plant[name])
        if f:
            magnet_frames.append(f)
if magnet_frames:
    make_gif_from_frames(magnet_frames, 'assets/plants/magnetshroom.gif', duration=300, max_size=(75, 75))

# 6. Copy from sucai/
def copy_from_sucai(src_pattern, dst_path):
    for f in glob.glob(f'sucai/{src_pattern}'):
        shutil.copy2(f, dst_path)
        print(f'Copied {f} -> {dst_path}')
        return True
    return False

import glob
# Pumpkin
copy_from_sucai('*PumpkinHead*.gif', 'assets/plants/pumpkin.gif')
copy_from_sucai('*PumpkinHead*1*.gif', 'assets/plants/pumpkin_cracked1.gif')
copy_from_sucai('*PumpkinHead*2*.gif', 'assets/plants/pumpkin_cracked2.gif')

# Flower Pot
copy_from_sucai('*FlowerPot*.gif', 'assets/plants/flowerpot.gif')

# Blover
copy_from_sucai('*Blover*.gif', 'assets/plants/blover.gif')

# Sea-shroom
for f in glob.glob('sucai/*'):
    if 'seashro' in f.lower() or 'seashroom' in f.lower() or ('shroom' in f.lower() and 'sea' in f.lower()):
        shutil.copy2(f, 'assets/plants/seashroom.gif')
        print(f'Copied {f} -> assets/plants/seashroom.gif')
        break

print('=== Asset Extraction Complete ===')
