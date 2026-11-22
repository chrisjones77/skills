#!/usr/bin/env python3
"""Retro-DTP raster finishing helper for ChatGPT. Python 3.9+ and Pillow 9.2+.

For raster finishing, use the finished image as the source. For a design-strength
request, use the retro-design-filter.txt card with the ordinary image generator.
This attachment is executable Python whether saved as .py or .txt.
Run it with the actual source path. For example:

    python retro-filter.txt image.png --mode print-shop --strength 4 --out filtered.png
    python retro-filter.txt image.png --mode print-shop --strength 4 --out dial.html

Return the PNG and, when requested, the downloadable HTML dial. Open the HTML
in a browser to compare settings and save a full-size PNG. Always start from the
original when changing strength. If the generator output is unavailable as a
file, ask the user to attach its downloaded version.
"""
import argparse
import base64
import io
import json
import sys
from pathlib import Path
from typing import NamedTuple

from PIL import Image, ImageEnhance, ImageOps


class Profile(NamedTuple):
    edge: int               # Long edge of the working raster at maximum reduction
    colors: int             # Maximum ink colours at maximum reduction
    grayscale: bool
    diffuse: bool


# Artistic raster treatments. These are separate from the publishing templates.
PROFILES = {
    "selectric": Profile(128, 2, True, False),
    "wordstar": Profile(192, 4, True, True),
    "macpaint": Profile(384, 2, True, True),
    "print-shop": Profile(256, 8, False, True),
    "deskmate": Profile(320, 16, False, False),
    "geoworks": Profile(512, 32, False, True),
    "pagemaker": Profile(768, 64, True, True),
    "windows-truetype": Profile(896, 128, False, False),
}


def read_image(path):
    with Image.open(path) as image:
        if getattr(image, "n_frames", 1) != 1:
            raise ValueError("Select a single still frame for filtering.")
        upright = ImageOps.exif_transpose(image)
        rgba = upright.convert("RGBA")
        if profile := upright.info.get("icc_profile"):
            from PIL import ImageCms
            # RGB and CMYK input profiles need their corresponding input channels.
            color = upright if upright.mode in ("RGB", "CMYK", "L", "LAB") else rgba.convert("RGB")
            srgb = ImageCms.profileToProfile(color, ImageCms.ImageCmsProfile(io.BytesIO(profile)),
                                             ImageCms.createProfile("sRGB"), outputMode="RGB")
            srgb.putalpha(rgba.getchannel("A"))
            rgba = srgb
        # The working pixels are oriented sRGB; original EXIF/ICC no longer apply.
        rgba.info.clear()
        return rgba


def palette_for(grid, count, neutral):
    if neutral:
        inks = [(v, v, v) for v in (round(i * 255 / (count - 1)) for i in range(count))]
    else:
        sample = grid.copy()
        sample.thumbnail((256, 256), Image.Resampling.BOX)
        pixels = sample.get_flattened_data() if hasattr(sample, "get_flattened_data") else sample.getdata()
        visible = [rgb[:3] for rgb in pixels if rgb[3]]
        strip = Image.new("RGB", (max(1, len(visible)), 1))
        if visible:
            strip.putdata(visible)
        table = strip.quantize(colors=count, method=Image.Quantize.MEDIANCUT).getpalette()
        inks = [tuple(table[i:i + 3]) for i in range(0, min(count * 3, len(table)), 3)]
    # Pillow accepts 256 slots. Duplicate an allowed ink in all unused slots.
    palette = Image.new("P", (1, 1))
    palette.putpalette([c for rgb in (inks + [inks[-1]] * (256 - len(inks))) for c in rgb])
    return palette


def apply_filter(original, mode, strength, dither="auto"):
    if mode not in PROFILES or strength not in range(9) or dither not in ("auto", "on", "off"):
        raise ValueError("Choose a listed mode, strength 0–8 and dither auto, on or off.")
    if strength == 0:
        return original.copy(), original.size, "Original colours"
    p = PROFILES[mode]
    amount = strength / 8
    longest = max(original.size)
    edge = max(1, round(longest * (min(p.edge, longest) / longest) ** amount))
    size = tuple(max(1, round(v * edge / longest)) for v in original.size)
    grid = original.resize(size, Image.Resampling.BOX)
    rgb = grid.convert("RGB")
    if p.grayscale:
        rgb = ImageEnhance.Color(rgb).enhance(1 - amount)
    if strength <= 2:
        # A gentler transition from full RGB than jumping immediately to 256 colours.
        channel_steps = 128 if strength == 1 else 32
        lut = [round(round(v * (channel_steps - 1) / 255) * 255 / (channel_steps - 1))
               for v in range(256)]
        reduced = rgb.point(lut * 3)
        detail = f"{channel_steps} steps/channel"
    else:
        count = round(256 * (p.colors / 256) ** ((strength - 3) / 5))
        grid = Image.merge("RGBA", (*rgb.split(), grid.getchannel("A")))
        palette = palette_for(grid, count, p.grayscale and strength == 8)
        diffuse = p.diffuse if dither == "auto" else dither == "on"
        reduced = rgb.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG
                               if diffuse else Image.Dither.NONE).convert("RGB")
        detail = f"Up to {count} ink colours"
    output = reduced.resize(original.size, Image.Resampling.NEAREST)
    output.putalpha(original.getchannel("A"))
    return output, size, detail


def png_bytes(image):
    buf = io.BytesIO()
    if image.getchannel("A").getextrema() == (255, 255):
        image = image.convert("RGB")
    image.save(buf, "PNG")
    return buf.getvalue()


def exclusive_write(path, writer):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as file:
        try:
            writer(file)
        except BaseException:
            file.close()
            path.unlink()
            raise


DIAL = """<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Retro-DTP image dial</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#efece4;color:#201e1a;font:16px/1.4 system-ui,sans-serif}
main{width:min(1180px,100%);margin:auto;padding:clamp(14px,3vw,42px);display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,290px);gap:24px}
figure{margin:0;background:#d4d1c9;align-self:start}img{width:100%;height:auto;display:block}
aside{align-self:start;position:sticky;top:1em}h1{font:normal clamp(1.7rem,3vw,2.6rem)/1.1 Georgia,serif;margin:0 0 1.2rem;overflow-wrap:anywhere}
label{display:block;font-weight:650}input{width:100%;margin:14px 0;accent-color:#365b51}.ends{display:flex;justify-content:space-between;font-size:.8em}
button,a{display:inline-block;padding:9px 12px;margin:4px 0;font:inherit;border:1px solid #615c4f;border-radius:3px;background:white;color:inherit;cursor:pointer;text-decoration:none}
a{background:#28483f;color:white}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #0077bb}
@media(max-width:690px){main{grid-template-columns:1fr;gap:14px}aside{position:static;grid-row:1}h1{margin-bottom:.6rem}}
</style><main><figure><img id="art" alt="Image at the selected quantization strength"></figure>
<aside><h1 id="title"></h1><label for="strength">Quantization <output id="value"></output></label>
<input id="strength" type="range" min="0" max="8" step="1" value="4"><div class="ends"><span>Original</span><span>Strongest</span></div>
<p id="details" aria-live="polite"></p><button id="compare" aria-pressed="false">Show original</button><br>
<a id="download" download>Save displayed PNG</a></aside></main><script>
const job=JOB_DATA;
const $=id=>document.getElementById(id);
let comparing=false;
$('title').textContent=job.title;
$('strength').value=job.initial;
function show(){
  const n=comparing?0:Number($('strength').value), frame=job.frames[n];
  $('value').textContent=n+' / 8';
  $('details').textContent=job.mode+' · '+frame.grid.join(' × ')+' · '+frame.detail;
  $('art').src=frame.png; $('download').href=frame.png;
  $('download').download=job.file+'-'+job.mode+'-'+n+'.png';
  $('compare').setAttribute('aria-pressed',String(comparing));
  $('compare').textContent=comparing?'Back to setting':'Show original';
}
$('strength').oninput=()=>{comparing=false;show()};
$('compare').onclick=()=>{comparing=!comparing;show()};
show();</script></html>"""


def make_dial(file, original, source, mode, initial, dither):
    # Stream the data URLs so peak memory is one PNG, independent of level count.
    before, after = DIAL.split("JOB_DATA")
    def json_safe(value):
        return json.dumps(value, ensure_ascii=True).replace("<", "\\u003c")
    job = {"title": source.stem.replace("-", " "), "file": source.stem, "mode": mode, "initial": initial}
    file.write((before + json_safe(job)[:-1] + ',"frames":[').encode())
    for level in range(9):
        frame, size, detail = apply_filter(original, mode, level, dither)
        meta = {"grid": size, "detail": detail}
        file.write((("," if level else "") + json_safe(meta)[:-1] + ',"png":"data:image/png;base64,').encode())
        file.write(base64.b64encode(png_bytes(frame)))
        file.write(b'"}')
    file.write(("]}" + after).encode())


def main():
    parser = argparse.ArgumentParser(description="Filter a finished image or build an offline nine-position image dial.")
    parser.add_argument("source", type=Path, help="Original single-frame image")
    parser.add_argument("--mode", choices=PROFILES, default="print-shop")
    parser.add_argument("--strength", type=int, choices=range(9), default=4, help="0 = original, 8 = strongest")
    parser.add_argument("--dither", choices=("auto", "on", "off"), default="auto")
    parser.add_argument("--out", type=Path, required=True, help="New .png or interactive .html dial")
    args = parser.parse_args()
    suffix = args.out.suffix.lower()
    if suffix not in (".html", ".png"):
        parser.error("Output must end in .png or .html")
    try:
        original = read_image(args.source)
        if suffix == ".html":
            exclusive_write(args.out, lambda f: make_dial(f, original, args.source, args.mode,
                                                           args.strength, args.dither))
        else:
            image, _, _ = apply_filter(original, args.mode, args.strength, args.dither)
            exclusive_write(args.out, lambda f: f.write(png_bytes(image)))
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Filter failed: {exc}\n")
    print(args.out)


if __name__ == "__main__":
    main()
