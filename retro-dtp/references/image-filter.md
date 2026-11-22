# Raster finishing for an existing composition

Use this branch for an explicit pixel, colour or dither treatment. For a design-strength request, follow the design workflow in [the skill](../SKILL.md) before generating the image. Apply Retro-DTP to its finished raster. For an existing image, start at the filtering step. Titles, faces and layout in the source are sampled together. Every adjustment uses the same original file.

## In a regular ChatGPT conversation

Attach the supplied `retro-filter.txt` to a chat with Python file tools. The text file contains the complete executable helper. A request can cover both steps:

> Generate the cover normally. Then run the attached Retro-DTP filter on the finished image. Use Print Shop at 4/8. Give me the PNG and a downloadable dial so I can choose the strength myself.

If the Python session cannot access the image from the conversation, save the generated original and attach it to the chat. Open the returned HTML file in a browser. Its slider works offline, **Show original** toggles a comparison, and **Save displayed PNG** exports the full canvas at the displayed setting. To switch archetype, ask for another dial from the same original. Each dial is specific to the image and mode used to create it. File-processing capabilities depend on the chat environment. [OpenAI’s data analysis guide](https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt)

## Run the helper

Requires Python 3.9 or newer with Pillow 9.2 or newer. The helper can run independently of the publishing package. The package CLI also accepts `filter --source IMAGE --out PATH` with the same optional flags.

```sh
python3 scripts/retro_filter.py cover.png --mode print-shop --strength 4 --out cover-4.png
python3 scripts/retro_filter.py cover.png --mode print-shop --strength 2 --out cover-dial.html
```

Strength **0** returns the oriented, decoded sRGB image. **1–2** gently reduce the working grid and the number of levels in each colour channel. **3–8** use progressively smaller grids and palette budgets. Existing images smaller than the selected grid keep their dimensions. The PNG always returns to the original oriented canvas size and keeps its alpha channel. The slider changes source detail; it never retypes or reinterprets words.

| Preset | Long edge at 8/8 | Ink palette at 8/8 | Default dithering at 3–8 |
| --- | ---: | --- | --- |
| `selectric` | 128 px | Black and white | Off |
| `wordstar` | 192 px | 4 gray levels | On |
| `macpaint` | 384 px | Black and white | On |
| `print-shop` | 256 px | Up to 8 sampled colours | On |
| `deskmate` | 320 px | Up to 16 sampled colours | Off |
| `geoworks` | 512 px | Up to 32 sampled colours | On |
| `pagemaker` | 768 px | 64 gray levels | On |
| `windows-truetype` | 896 px | Up to 128 sampled colours | Off |

These settings translate the eight print archetypes into raster treatments. The grid sizes are artistic choices. Dithering distributes ink across neighbouring samples to suggest intermediate tones. Choose `--dither off` for flat areas or `--dither on` for a smoother tonal transition at palette-limited settings. Use a new output filename for each revision.

An HTML dial includes a full-size PNG for each strength. For large images or a single requested setting, a PNG alone takes less space. Filtering works on a single still frame.
