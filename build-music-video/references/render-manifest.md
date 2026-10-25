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

The renderer fills the canvas by centre crop, adds an alternating 3.5% zoom and short black fades, and uses exact frame boundaries to avoid cumulative rounding drift. This is a neutral baseline. Compose portrait-safe art first or explicitly adapt the layout for letterboxing, title bands and caption areas. Review crops before accepting the output. ASS should match the output canvas and use installed fonts.

Run:

```bash
python /path/to/skill/scripts/render_video.py project.json video.mp4
python /path/to/skill/scripts/verify_video.py video.mp4 --audio song.mp3 --width 720 --height 1280 --fps 24
```

Both commands return nonzero on failure. The renderer does not overwrite the output until the new video passes structural checks. The validator prints a JSON report; preserve it in the project review notes. It does not validate story facts, caption semantics or aesthetic quality.
