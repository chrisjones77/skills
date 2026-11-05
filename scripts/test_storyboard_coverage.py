"""The selected bytes, not a substitute digest, must satisfy the review record."""
import json
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
import unittest

from unittest.mock import patch

from validate_storyboards import coverage_errors, validate


class StoryboardCoverageTest(unittest.TestCase):
    def setUp(self):
        gallery = Path(__file__).resolve().parents[1] / 'docs/skill-storyboards'
        self.board = next(b for b in json.loads((gallery / 'manifest.json').read_text())['boards']
                          if b['slug'] == 'unified-work-harness')
        self.name = 'coverage-unified-work-harness.json'
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        (self.root / 'assets').mkdir()
        for name in [self.board['asset'], self.name]:
            shutil.copyfile(gallery / name, self.root / name)

    def test_valid_human_hold(self):
        self.assertEqual(coverage_errors(self.root, self.board), [])

    def test_wrong_asset_digest(self):
        file = self.root / self.name
        record = json.loads(file.read_text())
        record['provenance']['asset_sha256'] = '0' * 64
        file.write_text(json.dumps(record))
        self.assertIn(f'{self.name}: ASSET_HASH_MISMATCH', coverage_errors(self.root, self.board))


class GalleryRegressionTest(unittest.TestCase):
    def test_transcript_and_parent_substitutions(self):
        repo = Path(__file__).resolve().parents[1]
        read = Path.read_text
        for name, expected in [('index.html', 'Rendered transcript differs'), ('asset-lineage.json', 'Broken lineage parent')]:
            target = repo / 'docs/skill-storyboards' / name
            data = read(target)
            if name == 'index.html':
                old = '<li>Verify workspace — check clean workspace, branch and commit against the packet.</li>'
                self.assertEqual(data.count(old), 1)
                data = data.replace(old, '<li>Verify that the workspace is empty.</li>')
            else:
                lineage = json.loads(data)
                record = next(b for b in lineage['boards'] if b['slug'] == 'unified-work-harness')
                record['stages'][-1]['parent_sha256'] = '0' * 64
                data = json.dumps(lineage)
            with self.subTest(name=name), patch.object(Path, 'read_text', lambda p, *a, **kw: data if p == target else read(p, *a, **kw)):
                self.assertIn(expected + ': unified-work-harness', validate(repo))


if __name__ == '__main__':
    unittest.main()
