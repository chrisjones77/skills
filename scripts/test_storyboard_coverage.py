"""Regression for the independent review record consumed by storyboard CI."""
import json
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
import unittest

from validate_storyboards import coverage_errors


class StoryboardCoverageTest(unittest.TestCase):
    def test_selected_asset_and_digest(self):
        gallery = Path(__file__).resolve().parents[1] / 'docs/skill-storyboards'
        board = next(b for b in json.loads((gallery / 'manifest.json').read_text())['boards']
                     if b['slug'] == 'unified-work-harness')
        name = 'coverage-unified-work-harness.json'
        with TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'assets').mkdir()
            shutil.copyfile(gallery / board['asset'], root / board['asset'])
            shutil.copyfile(gallery / name, root / name)
            self.assertEqual(coverage_errors(root, board), [])
            manifest = json.loads((root / name).read_text())
            manifest['provenance']['asset_sha256'] = '0' * 64
            (root / name).write_text(json.dumps(manifest))
            self.assertIn(f'{name}: ASSET_HASH_MISMATCH', coverage_errors(root, board))


if __name__ == '__main__':
    unittest.main()
