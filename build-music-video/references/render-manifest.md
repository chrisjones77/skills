# Render manifest

Requirements: Python 3, FFmpeg/FFprobe with libx264 and AAC; libass plus a suitable installed font when `captions_ass` is present. No Python packages are required by the bundled scripts.

```json
{
  "audio": "song.mp3",
  "width": 720,
  "height": 1280,
  "fps": 24,
  "captions_ass": "captions.ass",
  "shots": [
    {"start": 0, "end": 5.5, "image": "art/01.png", "title": "The plan"},
    {"start": 5.5, "end": 12.0, "image": "art/02.png", "title": "The interruption"}
  ]
}
```

Replace the example end with the measured audio duration and add enough shots to cover it. `captions_ass` is optional; omit it for caption-free output. Width/height must be positive even integers; FPS must be a positive integer. Shots must be contiguous from zero through the full recording. Each shot must occupy at least one output frame. Asset paths resolve relative to this manifest. `title` is descriptive metadata, not burned text.

The renderer fills the canvas by centre crop, adds an alternating 3.5% zoom, and uses exact frame boundaries to avoid cumulative rounding drift. Set `fade_seconds` on individual shots to request black fades; the default is zero for clean cuts. Compose each asset for the output aspect ratio, independently of storyboard page orientation. Review crops before accepting the output. ASS should match the output canvas and use installed fonts.

When adapting a renderer to a matte/fit layout, explicitly compute `scale = min(target_width / source_width, target_height / source_height)` and resize to the resulting dimensions before pasting. Pillow `thumbnail()` only shrinks; it does not enlarge a small source to the intended fit box. Inspect both small and large source images in the final canvas.

Run:

```bash
python /path/to/skill/scripts/render_video.py project.json video.mp4
python /path/to/skill/scripts/verify_video.py video.mp4 --audio song.mp3 --width 720 --height 1280 --fps 24
```

Both commands return nonzero on failure. The renderer does not overwrite the output until the new video passes structural checks. The validator prints a JSON report; preserve it in the project review notes. It does not validate story facts, caption semantics or aesthetic quality.


## Review derivatives and retained versions

The manifest describes one edit. Keep a phone encode’s actual dimensions, file hash, encoding recipe and verification report in a separate export receipt; do not silently change the master manifest to describe it. Run the same full-duration validator with the derivative’s real geometry, and inspect its exported text/crops. See the [one-shot review method](one-shot-review.md) for delivery and preservation.

Preserve prior accepted manifests and portable kits as historical artifacts. Append receipts for new exports, publication or retained copies, rather than rewriting old evidence to make its status look current. Source-file identity, encoded-stream identity and decoded-signal similarity are separate observations.
