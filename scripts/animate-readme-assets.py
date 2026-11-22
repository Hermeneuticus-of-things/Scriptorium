from pathlib import Path
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
source_dir = root / 'assets' / 'readme'
output_dir = root / 'docs' / 'assets' / 'gif'
raster_dir = root / '.work' / 'readme-gif-raster'
output_dir.mkdir(parents=True, exist_ok=True)
raster_dir.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 900, 540
SCALES = [1.0, 1.004, 1.008, 1.012, 1.008, 1.004]

for source in sorted(raster_dir.glob('*.png')):
    with Image.open(source) as original:
        original = original.convert('RGBA')
        frames = []
        for scale in SCALES:
            base = Image.new('RGBA', (WIDTH, HEIGHT), (255, 255, 255, 255))
            image = original.copy()
            image.thumbnail((WIDTH - 12, HEIGHT - 12), Image.Resampling.LANCZOS)
            if scale != 1.0:
                size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
                image = image.resize(size, Image.Resampling.LANCZOS)
            x = (WIDTH - image.width) // 2
            y = (HEIGHT - image.height) // 2
            base.alpha_composite(image, (x, y))
            frames.append(base.convert('P', palette=Image.Palette.ADAPTIVE, colors=128))
        output = output_dir / f'readme-{source.stem}.gif'
        frames[0].save(output, save_all=True, append_images=frames[1:], duration=140, loop=0, optimize=True, disposal=2)
        print(f'created {output.relative_to(root)} ({output.stat().st_size // 1024} KB)')
