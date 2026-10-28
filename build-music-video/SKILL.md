---
name: build-music-video
description: Storyboard a supplied song and create a DIY illustrated music video using scene art, gentle motion, section-aware editing, and optional timed lyrics. Use for song-to-video, Suno MP3-to-video, moving-cover storytelling, lyric videos, or requests to turn an approved storyboard into a reproducible FFmpeg edit.
---

# Build Music Video

Carry the task through storyboard, render, verification, and saved deliverables when the user requests a video. For storyboard-only requests, stop at the storyboard. Treat a supplied recording as the soundtrack source; do not silently replace it with generated music.

## 1. Establish the source and continuity

- Resolve the supplied audio, latest lyrics, reference art, and corrections. Use connected storage for referenced files; use local paths when supplied. Inspect actual audio metadata with FFprobe.
- Maintain a compact continuity ledger: characters/count, appearance, objects/colours, left/right orientation, locations, chronological constraints, and pending versus completed events. Separate reported facts, lyrical metaphor, uncertain claims, and invented visuals.
- Preserve the user's corrections across art, captions, and shot order. Do not infer endorsement from a helpful business or turn a pending action into a completed event.
- Use any explicitly invoked creative skill for lyrics/style/identity. Keep this production workflow genre-neutral. Do not import unrelated personal lore or private reference images into reusable skill code.
- Default to portrait for a social/story request, otherwise use the requested format. State any consequential assumption once and proceed within the authorized scope.

## 2. Storyboard before rendering

Build a section map and a separate lyric-payoff map before choosing a shot count. Identify lines whose object, action, contradiction or emotional turn needs its own image. Build a shot table with start/end (unset until timed), lyric or instrumental cue, scene reference, camera motion, factual coverage, and continuity constraints. Reprise a visual motif for choruses; show instrumental breaks without stale captions. Keep credits and emotional targets aligned with the source. Read [editorial-coverage.md](references/editorial-coverage.md) for payoff, pace, action and revision checks.

Present a reviewable illustrated storyboard, then continue rendering without adding an approval gate unless the user requested one. Use image-generation tools for art. Specify consistent cast, palette, lighting, age, clothing, and vehicles. Generate individual production shots in the output aspect ratio; storyboard page orientation is independent. A portrait review sheet does not authorize portrait art in a landscape video. Contact-sheet crops are preview-only unless the user explicitly accepts that compromise after seeing the output-size crop. Inspect subjects, action, text and safe areas at final display size.

Use a portable HTML storyboard with embedded images or a PDF. Keep visual storytelling and captions legible on a phone. Avoid rapid flashes. Distinguish moving still images from generated character animation.

## 3. Establish timing honestly

Read [timing-and-review.md](references/timing-and-review.md) before captioning.

- Preserve the lyric draft separately from the performance transcript and display captions.
- Obtain word/phrase times from transcription or manual listening when available. Treat ASR as fallible, particularly over music and repeated choruses.
- Verify repeated sections separately. Record unresolved words and estimated intervals; do not silently overwrite the lyric draft.
- If only estimated timings are possible, label them as estimates. Never claim a listening review based on transcription alone.
- Export editable SRT or ASS and retain timing provenance. Word-highlight karaoke requires word-level evidence; use line captions when word timing is weak.
- When the user accepts timing, freeze a baseline: source-audio hash, duration, FPS, section boundaries, approved cut boundaries and protected intervals. Subdivide allowed windows for new shots; retain accepted boundaries unless the user authorizes a timing change. Record what was actually compared; use stream/pixel hashes when claiming identical audio or protected footage.

## 4. Assemble reproducibly

Read [render-manifest.md](references/render-manifest.md). Use `scripts/render_video.py MANIFEST.json OUTPUT.mp4` for a basic full-frame moving-stills edit, or adapt it for a designed title/caption layout. Use an available font and FFmpeg with libass when burning captions. The renderer accepts already prepared art and optional ASS; it does not generate art or transcribe.

Keep project inputs relative to the manifest. Record dimensions, FPS, shot boundaries, source audio, caption basis, and asset provenance. Do not hard-code a song duration, workstation path, branding, or family identity into reusable code. Preserve edits to captions rather than regenerating over them unannounced.

Render each clip to a temporary file, verify it, then assemble. Validate every clip before concatenation. Use bounded concurrency or sequential rendering; wait for all processes. Failed or incomplete clips must block export. Stage outputs and atomically replace the destination only after validation. Do not hide a short picture stream by freezing its last frame or relying on container duration.

## 5. Check the actual output

Run `scripts/verify_video.py OUTPUT.mp4 --audio SOURCE_AUDIO --width WIDTH --height HEIGHT --fps FPS`. It checks both stream durations, decoded video frame count, dimensions, frame rate, and a full audio/video decode. Audio encoder padding and one-frame rounding have a small tolerance; substantive truncation fails.

Then visually inspect representative frames: opening, each unique scene, critical chronology, caption-heavy lines, transitions, and ending. Inspect subject crops and caption safe areas. Listen to representative boundaries when playback is available. Record separately:

- structural media validation;
- visual/continuity review;
- automated caption timing;
- actual listening review, including its scope.

Fix failures and rerun affected checks. A successful FFmpeg exit or playable first minute is insufficient.

## 6. Deliver

Save the storyboard, completed MP4, and a portable project kit using the environment's artifact-persistence workflow. Include art, supplied soundtrack when authorized as part of the project, editable captions, manifest, provenance/review notes, and rebuild instructions. Exclude temporary renders, caches, credentials, and unrelated private materials. Do not publish to social platforms without authorization.

Render the video inline when the host supports it, especially when requested. Put the portable kit and download links after the playable result. Describe runtime, format, moving-stills versus character animation, and material review limits. Include any unresolved caption words without implying the whole video was verified by listening.

Workflow inspiration: https://aituber.app/blog/suno-song-to-music-video/ (DIY scene images, section assembly, motion, lyric timing, export). This skill implements the workflow locally and does not require that service. Consult current official documentation only when making current platform, licensing, or distribution claims; do not infer music rights from possession of an MP3.

