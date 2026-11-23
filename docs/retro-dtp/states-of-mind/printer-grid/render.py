"""Rebuild the States of Mind printer proofs from their published clean masters."""
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps

HERE = Path(__file__).resolve().parent
# Artistic print settings, in master-image pixels. Four ribbon passes share
# the same nine-pin head. The small offsets are fractions of the pin pitch.
PITCH = 2.25
SCALE = 3
RIBBONS = (
    ((29, 140, 160), -0.15, 0.03),
    ((185, 48, 94), 0.13, -0.08),
    ((244, 192, 55), 0.03, 0.10),
    ((34, 35, 35), 0.00, 0.00),
)
SCREEN = ((0, 8, 2, 10), (12, 4, 14, 6), (3, 11, 1, 9), (15, 7, 13, 5))


def ribbon_proof(master, *, monochrome):
    width, height = master.size
    grid = (round(width / PITCH), round(height / PITCH))
    samples = master.convert("RGB").resize(grid, Image.Resampling.BOX)
    # Neutral areas print with black ink. Only residual colour uses the ribbons.
    red, green, blue = samples.split()
    light = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    coverages = [ImageChops.subtract(light, channel) for channel in (red, green, blue)]
    coverages.append(ImageChops.invert(light))
    page = Image.new("RGB", master.size, (252, 250, 242))
    px = width * SCALE / grid[0]
    py = height * SCALE / grid[1]
    for channel, (ink, offset_x, offset_y) in enumerate(RIBBONS):
        if monochrome and channel != 3:
            continue
        coverage = (ImageOps.invert(samples.convert("L")) if monochrome
                    else coverages[channel]).load()
        mask = Image.new("L", (width * SCALE, height * SCALE))
        pen = ImageDraw.Draw(mask)
        for y in range(grid[1]):
            sweep, pin = divmod(y, 9)
            # Feed error varies by sweep. The last pin leaves a slightly lighter mark.
            cy = (y + 0.5 + offset_y + 0.065 * math.sin(sweep * 0.91)) * py
            shift = 0.5 + offset_x + 0.055 * math.sin(sweep * 1.7 + channel)
            radius = 0.535 + 0.018 * math.sin(pin * 1.6)
            rx, ry = radius * px, 0.95 * radius * py
            for x in range(grid[0]):
                tone = coverage[x, y]
                threshold = (SCREEN[(y + channel) % 4][(x + 2 * channel) % 4] + 0.5) / 16
                # Soften the decision at a stroke edge to keep small lettering readable.
                amount = max(0, min(1, (tone / 255 - threshold) * 5 + 0.5)) if tone else 0
                if channel == 3:
                    amount = 0.4 * amount + 0.6 * (tone / 255) ** 0.85
                if amount:
                    cx = (x + shift) * px
                    pen.ellipse((cx-rx, cy-ry, cx+rx, cy+ry),
                                fill=round(amount * (233 if pin == 8 else 246)))
        mask = mask.resize(master.size, Image.Resampling.LANCZOS)
        layer = Image.composite(Image.new("RGB", master.size, ink),
                                Image.new("RGB", master.size, "white"), mask)
        page = ImageChops.multiply(page, layer)
    return page


# Clustered black dots on a four-spot screen at 300 addressable spots/inch.
# On these 1254-pixel covers the assumed printed width is 4.18 inches.
LASER_SCREEN = ((12, 5, 6, 13), (4, 0, 1, 7), (11, 3, 2, 8), (15, 10, 9, 14))


def laser_proof(master):
    density = ImageOps.invert(master.convert("L"))
    screen = Image.new("L", (4, 4))
    screen.putdata([round((rank + 0.5) * 255 / 16)
                    for row in LASER_SCREEN for rank in row])
    threshold = Image.new("L", density.size)
    # Tile the screen by doubling along each axis.
    threshold.paste(screen)
    span = 4
    while span < threshold.width:
        threshold.paste(threshold.crop((0, 0, span, 4)), (span, 0))
        span *= 2
    span = 4
    while span < threshold.height:
        threshold.paste(threshold.crop((0, 0, threshold.width, span)), (0, span))
        span *= 2
    toner = ImageChops.subtract(density, threshold).point(lambda d: 255 if d else 0)
    return ImageOps.colorize(toner, black=(255, 255, 253), white=(31, 31, 31))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    raster = json.loads((HERE.parent / "raster-grid/frames.json").read_text())
    rows = []
    for row in raster["styles"]:
        clean = row["frames"][0]
        source = HERE / clean["file"]
        if clean["strength"] != 0 or sha(source) != clean["sha256"]:
            raise ValueError(f"Unexpected clean master for {row['mode']}")
        entry = {"mode": row["mode"], "name": row["name"],
                 "clean": {"file": clean["file"], "sha256": clean["sha256"]}}
        with Image.open(source) as image:
            for finish in ("nine-pin-colour", "nine-pin-monochrome", "monochrome-laser"):
                file = f"{finish}/{row['mode']}.png"
                target = HERE / file
                target.parent.mkdir(exist_ok=True)
                if finish == "monochrome-laser":
                    proof = laser_proof(image)
                else:
                    proof = ribbon_proof(image, monochrome=finish == "nine-pin-monochrome")
                proof.save(target)
                entry[finish] = {"file": file, "sha256": sha(target)}
        rows.append(entry)
    (HERE / "frames.json").write_text(json.dumps(
        {"design": 8, "raster": 0, "renderer": "render.py", "styles": rows}, indent=2) + "\n")


if __name__ == "__main__":
    main()
