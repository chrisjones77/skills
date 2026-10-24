#!/usr/bin/env python3
"""Fail closed on truncated picture/audio, wrong geometry, or decode errors."""
import argparse
from fractions import Fraction
import json
import math
from pathlib import Path
import subprocess


def run(args, **kw):
    p = subprocess.run(args, capture_output=True, text=True, **kw)
    if p.returncode:
        raise RuntimeError(p.stderr.strip() or f'Command failed: {args[0]}')
    return p.stdout


def probe(path, count=False):
    return json.loads(run(['ffprobe', '-v', 'error'] + (['-count_frames'] if count else []) +
                          ['-show_streams', '-show_format', '-of', 'json', str(path)]))


def audio_duration(path):
    info = probe(path)
    tracks = [s for s in info['streams'] if s['codec_type'] == 'audio']
    if not tracks:
        raise ValueError('Source has no audio stream')
    duration = float(tracks[0].get('duration', info['format'].get('duration', 0)))
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError('Source duration is unavailable or invalid')
    return duration


def verify(path, duration, width, height, fps):
    info = probe(path, count=True)
    videos = [s for s in info['streams'] if s['codec_type'] == 'video']
    audios = [s for s in info['streams'] if s['codec_type'] == 'audio']
    if len(videos) != 1 or len(audios) != 1:
        raise ValueError('Expected one video and one audio stream')
    v, a = videos[0], audios[0]
    tolerance = max(0.15, 2 / fps)
    for stream in (v, a):
        actual = float(stream.get('duration', 0))
        if not math.isfinite(actual) or abs(actual - duration) > tolerance:
            raise ValueError(f"{stream['codec_type']} duration {actual} differs from source {duration}")
        if abs(float(stream.get('start_time', 0))) > tolerance:
            raise ValueError('Stream does not start near zero')
    if (v['width'], v['height']) != (width, height):
        raise ValueError('Unexpected output dimensions')
    if abs(float(Fraction(v['avg_frame_rate'])) - fps) > 0.001:
        raise ValueError('Unexpected output frame rate')
    frames = int(v.get('nb_read_frames', 0))
    if abs(frames - round(duration * fps)) > 2:
        raise ValueError('Decoded video frame count does not cover the recording')
    run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(path), '-map', '0:v:0',
         '-map', '0:a:0', '-f', 'null', '-'])
    return dict(structural_validation='passed', duration=duration, video_duration=float(v['duration']),
                audio_duration=float(a['duration']), decoded_frames=frames, width=width,
                height=height, fps=fps, listening_review='not_performed_by_this_script')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('video', type=Path)
    p.add_argument('--audio', required=True, type=Path)
    p.add_argument('--width', required=True, type=int)
    p.add_argument('--height', required=True, type=int)
    p.add_argument('--fps', required=True, type=int)
    args = p.parse_args()
    if min(args.width, args.height, args.fps) <= 0:
        p.error('Dimensions and FPS must be positive')
    print(json.dumps(verify(args.video, audio_duration(args.audio), args.width, args.height, args.fps), indent=2))


if __name__ == '__main__':
    main()
