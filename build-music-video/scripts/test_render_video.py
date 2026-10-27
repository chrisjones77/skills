"""Integration regressions; requires FFmpeg/FFprobe, no network or media assets."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import render_video as renderer
from verify_video import run


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        # Tiny and large inputs exercise explicit up/downscaling in FFmpeg.
        for name, w, h in [('small', 16, 9), ('large', 640, 360)]:
            (self.root / f'{name}.ppm').write_bytes(f'P6\n{w} {h}\n255\n'.encode() + bytes([130, 75, 25]) * w * h)
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
             'sine=frequency=440:duration=1', str(self.root / 'audio.wav')])
        self.manifest = self.root / 'project.json'
        self.manifest.write_text(json.dumps(dict(audio='audio.wav', width=160, height=90, fps=24,
            shots=[dict(start=0, end=.5, image='small.ppm'),
                   dict(start=.5, end=1, image='large.ppm')])) )
        self.output = self.root / 'video.mp4'

    def test_complete_render_and_small_source(self):
        report = renderer.render(self.manifest, self.output)
        self.assertEqual(report['decoded_frames'], 24)
        self.assertEqual((report['width'], report['height']), (160, 90))

    def test_damaged_clip_blocks_publish_and_preserves_previous_output(self):
        self.output.write_bytes(b'previous accepted output')
        original = renderer.validate_clip
        count = 0
        def corrupt_after_first_validation(path, *args):
            nonlocal count
            count += 1
            original(path, *args)
            if count == 1:
                path.write_bytes(b'broken clip')
        with patch.object(renderer, 'validate_clip', side_effect=corrupt_after_first_validation):
            with self.assertRaises((ValueError, RuntimeError)):
                renderer.render(self.manifest, self.output)
        self.assertEqual(self.output.read_bytes(), b'previous accepted output')

    def test_failed_final_verification_preserves_previous_output(self):
        self.output.write_bytes(b'previous accepted output')
        with patch.object(renderer, 'verify', side_effect=ValueError('decode failure')):
            with self.assertRaises(ValueError):
                renderer.render(self.manifest, self.output)
        self.assertEqual(self.output.read_bytes(), b'previous accepted output')


if __name__ == '__main__':
    unittest.main()
