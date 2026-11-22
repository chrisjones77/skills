# Retro-DTP

Redesign an image as if its maker had a typewriter, a bitmap paint program or an early page-layout system. Retro-DTP can also compose editable flyers, cards, banners, newsletters and office documents. The *States of Mind* gallery shows how the same album cover changes across every style and design strength. [Browse the full grid](https://github.com/chrisjones77/skills/tree/main/docs/retro-dtp/states-of-mind/grid) · [Compare the nine raster strengths at design 8/8](https://github.com/chrisjones77/skills/tree/main/docs/retro-dtp/states-of-mind/raster-grid)

## Try it in ChatGPT Images

Download the design card, attach it with your original image, and say which words and motifs matter. For a new design, attach the card and describe the subject. [Download the design card](https://raw.githubusercontent.com/chrisjones77/skills/main/docs/retro-dtp/retro-design-filter.txt)

> Redesign this album cover for DeskMate Draw at design 4/8. Keep the artist, album title and seven state names in order. Use raster 0 and clean output.

| Choice | What it controls |
| --- | --- |
| Style | Pick IBM Selectric, WordStar 3.3, MacPaint, The New Print Shop for DOS, Tandy DeskMate Draw, GeoWorks Ensemble, PageMaker / LaserWriter PostScript or Windows 3.1 TrueType. |
| Design strength, 0–8 | At 0 the original is used. At 1 one placement or lettering decision changes. At 4 the page is recomposed. At 8 every element must be explainable by the chosen toolset. |
| Raster strength, 0–8 | Applies pixel-grid, palette and optional dithering changes to the finished composition. Choose 0 to see the design at full detail. |
| Printer appearance | Clean output is the default for a redesign. Request a simulated finish, such as nine-pin colour, after composing the page. |

When trying a different setting, reuse the original reference and required words. For an image brief with no style or strength specified, the skill defaults to Print Shop at 4/8.

## Use as a standalone skill

Copy this entire `retro-dtp/` directory into your host’s skills directory. Keep its fonts, artwork, templates, scripts and references together. In Codex, invoke `$retro-dtp` with your brief. The agent instructions and supported print formats are in the [skill entry point](SKILL.md).

For the local CLI, use Node.js 24. From this directory run:

```sh
npm ci
node scripts/retro-dtp.mjs design-card --out retro-design-filter.txt
```

To generate instructions for one specific composition, put your required wording in a UTF-8 file named `subject.txt`:

```sh
node scripts/retro-dtp.mjs design --mode deskmate --strength 4 --brief subject.txt --out prompt.txt
```

Give the resulting prompt and original reference to the image generator. Choose fresh output names for revisions.

## Produce a print document

Install Poppler, then install the Chromium build selected by the package. Run these commands from the skill directory:

```sh
node node_modules/playwright/cli.js install chromium
node scripts/retro-dtp.mjs doctor --json
node scripts/retro-dtp.mjs modes --json
```

Use the sample JSON brief and the `prepare`, `render` and `verify` commands in the production guide. A print job includes editable source, a PDF and previews rendered from that PDF. Inspect the copy, margins and page order before marking a revision complete. [Production guide](references/production.md) · [Editing a revision](references/editing.md)

The optional raster helper runs with Python 3.9+ and Pillow 9.2+. It can export a PNG or an offline raster dial. The presets are period-inspired interpretations using redistributable assets. [Raster guide](references/image-filter.md) · [Historical sources](references/historical-sources.md)
