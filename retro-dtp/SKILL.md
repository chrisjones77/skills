---
name: retro-dtp
description: Create and revise editable retro-styled print documents in eight period styles spanning IBM Selectric, WordStar, MacPaint, The New Print Shop for DOS, DeskMate, GeoWorks Ensemble, PageMaker PostScript and Windows 3.1 TrueType. Use to redesign covers and images with period-limited tools in ChatGPT Images, compose print documents, or optionally quantize finished pixels.
---

# Retro DTP

Make useful printable documents with a distinct period-inspired composition. Deliver editable source, a PDF at the agreed physical size, and previews rendered from that PDF. Keep supplied text exact unless editing was requested.

## Redesign an image for a historical toolset

For a ChatGPT Images request such as “dial this cover down to Print Shop”, control the **design strength** before image generation. Default to 4/8 for an unspecified strength and Print Shop for an unspecified preset. At 0/8, return the original reference or generate the new brief normally. At 8/8, account for every element with a tool the selected archetype provides.

1. Inspect the original or new subject brief. Identify the essential identity, required words in order, and optional scenery or decoration. Carry required copy into the generator prompt verbatim. If the user specified all copy, make room for it.
2. Select the strength and mode in [design rules](assets/design-rules.json), or run `node scripts/retro-dtp.mjs design --mode print-shop --strength 6 --brief subject.txt`. Translate source elements into a concrete layout: for example, turn seven dimensional signs into seven aligned text rows and draw a truss bridge as one stamp. At low strengths make only the structural changes indicated by the level.
3. Use the ordinary image generator with that plan. Supply the original reference image for an edit. The CLI produces the instructions; run the generator to deliver the actual image. When the user changes strength, go back to the original reference and locked copy.
4. Inspect the resulting layout, its available drawing and lettering tools, spelling and reading order. Correct mistakes. Record any deliberate condensation. For an ordinary ChatGPT handoff, `design-card` emits self-contained plain-text instructions for all eight modes.

## Choose the finish

For a design-only request use raster strength 0 and clean output. A request like “Print Shop, design 6, raster 2, nine-pin colour” calls for three steps. First rebuild the design, then apply the requested raster reduction, then simulate the ribbon passes on that composition. Keep a clean master for another finish. Inspect the simulated result for readable letters and preserved layout. The raster helper handles the pixel step; describe the printer appearance separately to the image generator or produce a separate simulation proof.

## Reduce output quality

When the user specifically wants fewer pixels, fewer colours or dither on the same composition, follow the [raster filter guide](references/image-filter.md). Its `filter` command and downloadable HTML dial operate on finished pixels. If both effects are requested, compose the constrained design first and apply the requested raster strength to that result.

## Select a mode

Use the requested full name or short ID. If omitted, use New Print Shop for flyers, notices, cards and banners; GeoWorks for newsletters and letterhead; DeskMate for letters, memos and forms. State the selection and production defaults. An unsupported mode/type combination needs a supported choice, not an undisclosed substitution.

Choose by the constraint that should show on the finished paper.

| Mode | What to look for |
| --- | --- |
| [IBM Selectric](assets/modes/selectric/mode.md) | One type element, fixed pitch, tab stops and underlined subjects |
| [WordStar 3.3](assets/modes/wordstar/mode.md) | Reflow within a character measure, centred headings and printer emphasis |
| [MacPaint](assets/modes/macpaint/mode.md) | A black-and-white picture plane, pattern fills and stepped lettering |
| [New Print Shop](references/modes/print-shop.md) | Independently scaled bitmap letters and graphic stamps |
| [DeskMate](references/modes/deskmate.md) | Draw primitives and placed lettering for flyers, ruled cells for forms |
| [GeoWorks](references/modes/geoworks.md) | Scalable lettering, movable graphics and reading columns |
| [PageMaker / LaserWriter](assets/modes/pagemaker/mode.md) | Cubic outlines, fine rules, page composition and a Level 1 PostScript export |
| [Windows 3.1 TrueType](assets/modes/windows-truetype/mode.md) | Quadratic outline faces with sans, serif and fixed-pitch roles |

The [eight-archetype comparison](references/eight-archetypes.png) uses the same words and sheet size throughout. Choose a period example in the [historical source notes](references/historical-sources.md). Identify a decision about lettering and another about art or placement that the example supports. Compare the finished page with that example during visual review. Apply any requested printer simulation as a separate output treatment.

## Produce the document

1. Capture purpose, exact copy, mode, paper, orientation and supplied assets. Default to Letter portrait, monochrome, 12.7 mm margins and at least 10 pt body text. Ask for missing factual details or a decision on incompatible constraints; otherwise proceed.
2. Follow [production](references/production.md) for the literal brief format and local helpers. Run `doctor` before production. `prepare` creates a new editable source from a profile/type template; it is a starting composition, not a completed design.
3. Compose the HTML/CSS layout and separate SVG art. Text lives only in `document.json`; named HTML slots bind it at render time. Read [editing](references/editing.md) for revisions and reflow. Keep typography, composition and artwork distinct between modes.
4. Render to a new revision folder. Never regenerate customized layout from its original template or overwrite a completed revision. Resolve missing assets/glyphs and overflow; do not discard words or silently shrink body text.
5. Open and inspect every final-PDF preview, including card/banner assembly views. Compare the source copy to the brief. Record actual findings and artifact hashes in `review.json`, then run `verify`. Rendering and automated tests do not establish visual review. A failed or unavailable required check means the output is incomplete until actually resolved.
6. Link the source, PDF, previews and document-specific editing/printing instructions. Explain substitutions or limitations. Keep user creative acceptance and physical printer testing separate from local PDF verification.

Local creation and revision do not imply publication, sending or physical printing. Preserve prior work. Do not install the skill globally unless requested.

For adding a mode, read [mode authoring](references/mode-authoring.md). Existing production requests do not need that guide.
