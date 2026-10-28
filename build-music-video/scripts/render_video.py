#!/usr/bin/env python3
"""Render a portable shot manifest; verify before atomically replacing output."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import tempfile
from verify_video import run, probe, verify, audio_duration


def load_project(manifest):
    m = json.loads(manifest.read_text())
    root = manifest.parent
    w, h, fps = (m.get(k, d) for k, d in [('width', 720), ('height', 1280), ('fps', 24)])
    if any(type(v) is not int or v <= 0 for v in (w, h, fps)) or w % 2 or h % 2:
        raise ValueError('Require positive even integer dimensions and positive integer FPS')
    audio = (root / m['audio']).resolve()
    duration = audio_duration(audio)
    shots = m['shots']
    if not shots:
        raise ValueError('At least one shot is required')
    previous = 0.0
    prepared = []
    for i, s in enumerate(shots):
        start, end = float(s['start']), float(s['end'])
        if not all(math.isfinite(t) for t in (start, end)) or abs(start - previous) > 1e-6 or end <= start:
            raise ValueError(f'Shot {i}: require finite contiguous increasing times from zero')
        frames = round(end * fps) - round(start * fps)
        if frames < 1:
            raise ValueError(f'Shot {i} occupies less than one frame')
        image = (root / s['image']).resolve()
        if not image.is_file():
            raise ValueError(f'Missing scene image: {image}')
        fade = s.get('fade_seconds', 0)
        if type(fade) not in (int, float) or not math.isfinite(fade) or fade < 0:
            raise ValueError(f'Shot {i}: fade_seconds must be finite and nonnegative')
        prepared.append((image, frames, min(fade, frames / fps / 4)))
        previous = end
    if abs(previous - duration) > 1 / fps:
        raise ValueError('Shot timeline must cover the full audio within one frame')
    captions = (root / m['captions_ass']).resolve() if m.get('captions_ass') else None
    if captions and not captions.is_file():
        raise ValueError('Missing ASS captions')
    return audio, duration, w, h, fps, prepared, captions


def validate_clip(path, frames, w, h, fps):
    streams = probe(path, count=True)['streams']
    videos = [s for s in streams if s['codec_type'] == 'video']
    if len(videos) != 1 or len(streams) != 1:
        raise ValueError(f'Expected a video-only clip: {path.name}')
    v = videos[0]
    if ((v['width'], v['height']) != (w, h) or
            int(v.get('nb_read_frames', 0)) != frames or
            abs(float(v.get('duration', 0)) - frames / fps) > 1 / fps):
        raise ValueError(f'Incomplete or wrong-geometry clip: {path.name}')
    run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(path), '-map', '0:v:0', '-f', 'null', '-'])


def file_digest(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def render(manifest, output):
    audio, duration, w, h, fps, shots, captions = load_project(manifest)
    # Avoid replacing any source input, including the manifest itself.
    inputs = {manifest.resolve(), audio, *(image for image, _, _ in shots)}
    if captions:
        inputs.add(captions)
    if output.resolve() in inputs:
        raise ValueError('Output must not overwrite a project input')
    output.parent.mkdir(parents=True, exist_ok=True)
    # Staging on the destination filesystem makes replace atomic. Generated local
    # names keep user paths out of FFmpeg filter and concat syntax.
    with tempfile.TemporaryDirectory(prefix='music-video-', dir=output.parent) as temp:
        work = Path(temp).resolve()
        shutil.copyfile(audio, work / ('audio' + audio.suffix))
        clip_digests = []
        for i, (image, frames, fade) in enumerate(shots):
            seconds = frames / fps
            zoom = f'1.035-0.035*on/{max(1, frames-1)}' if i % 2 else f'1+0.035*on/{max(1, frames-1)}'
            vf = (f'scale={w*2}:{h*2}:force_original_aspect_ratio=increase,crop={w*2}:{h*2},'
                  f"zoompan=z='{zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s={w}x{h}:fps={fps},"
                  + (f'fade=t=in:st=0:d={fade},fade=t=out:st={seconds-fade}:d={fade},' if fade else '')
                  + 'format=yuv420p')
            name = f'{i:04d}.mp4'
            run(['ffmpeg', '-y', '-v', 'error', '-xerror', '-i', str(image), '-vf', vf,
                 '-frames:v', str(frames), '-an', '-c:v', 'libx264', '-preset', 'veryfast',
                 '-crf', '21', '-threads', '2', 'pending.mp4'], cwd=work)
            validate_clip(work / 'pending.mp4', frames, w, h, fps)
            (work / 'pending.mp4').replace(work / name)
            clip_digests.append(file_digest(work / name))
        (work / 'concat.txt').write_text(''.join(f"file '{i:04d}.mp4'\n" for i in range(len(shots))))
        # Check again immediately before concat; an earlier successful probe
        # does not establish that a clip is still intact or unchanged.
        for i, (_, frames, _) in enumerate(shots):
            clip = work / f'{i:04d}.mp4'
            if file_digest(clip) != clip_digests[i]:
                raise ValueError(f'Clip changed after render: {i}')
            validate_clip(clip, frames, w, h, fps)
        run(['ffmpeg', '-y', '-v', 'error', '-xerror', '-f', 'concat', '-safe', '1',
             '-i', 'concat.txt', '-c', 'copy', 'picture.mp4'], cwd=work)
        filters = []
        if captions:
            shutil.copyfile(captions, work / 'captions.ass')
            filters = ['-vf', 'ass=captions.ass']
        run(['ffmpeg', '-y', '-v', 'error', '-xerror', '-i', 'picture.mp4',
             '-i', 'audio' + audio.suffix, *filters, '-map', '0:v:0', '-map', '1:a:0',
             '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-threads', '2',
             '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'result.mp4'], cwd=work)
        report = verify(work / 'result.mp4', duration, w, h, fps)
        (work / 'result.mp4').replace(output)
        return report


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('manifest', type=Path)
    p.add_argument('output', type=Path)
    args = p.parse_args()
    print(json.dumps(render(args.manifest.resolve(), args.output.resolve()), indent=2))

