#!/usr/bin/env python3
"""Validate documentation coverage and byte bindings, never image semantics."""

import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import runpy
import struct
import sys
from urllib.parse import unquote, urlsplit


class GalleryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()
        self.images = []
        self.details = 0
        self.transcripts = {}
        self.article = None
        self.in_details = False
        self.step = None
        self.language = None
        self.viewport = False
        self.errors = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if 'id' in values:
            if values['id'] in self.ids:
                self.errors.append('Duplicate HTML id: ' + values['id'])
            self.ids.add(values['id'])
        if tag == 'html':
            self.language = values.get('lang')
        if tag == 'meta' and values.get('name') == 'viewport':
            self.viewport = True
        if tag == 'article':
            self.article = values.get('id')
            self.transcripts[self.article] = []
        if tag == 'li' and self.in_details and self.article:
            self.step = []
        if tag == 'details':
            self.in_details = True
            self.details += 1
        if tag == 'img':
            self.images.append(values)
        if tag in ('script', 'iframe', 'object', 'embed', 'base', 'form'):
            self.errors.append('Unexpected active HTML element: ' + tag)
        for key, value in attrs:
            if key.startswith('on'):
                self.errors.append('Unexpected HTML event handler: ' + key)
            if key in ('src', 'href'):
                self.links.append(value or '')


    def handle_data(self, data):
        if self.step is not None:
            self.step.append(data)

    def handle_endtag(self, tag):
        if tag == 'li' and self.step is not None:
            self.transcripts[self.article].append(' '.join(''.join(self.step).split()))
            self.step = None
        if tag == 'details':
            self.in_details = False
        if tag == 'article':
            self.article = None


# These boards ship independent image review records alongside the gallery.
REVIEWED_BOARDS = {'build-music-video', 'farmer-jones-victory-garden',
                   'image-card-coverage-harness', 'unified-work-harness'}
harness_path = Path(__file__).resolve().parents[1] / 'image-card-coverage-harness/scripts/harness.py'
validate_coverage = runpy.run_path(str(harness_path))['validate']


def coverage_errors(gallery, board):
    slug = board['slug']
    manifest = gallery / f'coverage-{slug}.json'
    record = json.loads(manifest.read_text(encoding='utf-8'))
    report = validate_coverage(record, asset_root=gallery)
    errors = [finding['code'] for finding in report['findings'] if finding['severity'] == 'blocker']
    binding = report['asset_binding']
    if (report['artifact_id'] != f'CURRENT-GALLERY-{slug}' or
            binding != {'status': 'verified', 'asset_ref': board['asset'], 'asset_sha256': board['asset_sha256']}):
        errors.append('Review must identify the selected board and its exact asset')
    if (report['validation_status'], report['reviewer_kind'], report['reviewer_decision'],
            report['release_outcome']) != ('clear', 'assistant', 'hold', 'hold'):
        errors.append('Expected a clear assistant review held for human acceptance')
    return [f'{manifest.name}: {error}' for error in errors]


def validate(root):
    root = root.resolve()
    gallery = root / 'docs/skill-storyboards'
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    def local_path(base, value):
        parsed = urlsplit(value)
        require(not parsed.scheme and not parsed.netloc, 'External/absolute resource: ' + value)
        raw = unquote(parsed.path)
        require(not raw.startswith('/') and '\\' not in raw, 'Unsafe path: ' + value)
        target = (base / raw).resolve()
        require(target.is_relative_to(root), 'Link escapes checkout: ' + value)
        require(target.exists(), 'Missing target: ' + value)
        return target

    data = json.loads((gallery / 'manifest.json').read_text())
    require(data.get('schema_version') == 1, 'Unsupported manifest schema')
    require(bool(re.fullmatch(r'[0-9a-f]{40}', data.get('source_revision', ''))), 'Invalid source revision')
    boards = data['boards']
    slugs = [b['slug'] for b in boards]
    require(len(set(slugs)) == len(slugs), 'Duplicate board slug')
    expected = {p.relative_to(root).as_posix() for p in root.rglob('*')
                if p.is_file() and p.name.lower() == 'skill.md' and '.git' not in p.relative_to(root).parts}
    require(len(boards) == len(expected), 'Board count differs from current skill inventory')
    actual = [b['source_path'] for b in boards]
    require(len(set(actual)) == len(actual), 'Duplicate source entrypoint')
    require(set(actual) == expected, 'Skill inventory differs: ' + repr(set(actual) ^ expected))
    require(REVIEWED_BOARDS.issubset(slugs), 'Missing independently reviewed board')
    for b in boards:
        label = b['slug']
        if label in REVIEWED_BOARDS:
            errors.extend(coverage_errors(gallery, b))
        require(bool(re.fullmatch(r'[a-z0-9-]+', label)), 'Unsafe slug: ' + label)
        source = local_path(root, b['source_path'])
        asset = local_path(gallery, b['asset'])
        require(asset.is_relative_to(gallery / 'assets'), 'Asset outside gallery assets: ' + label)
        if source.is_file():
            raw = source.read_bytes()
            digest = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
            require(digest == b['source_blob_sha'], 'Source binding stale: ' + label)
        if asset.is_file():
            raw = asset.read_bytes()
            require(hashlib.sha256(raw).hexdigest() == b['asset_sha256'], 'Asset hash mismatch: ' + label)
            require(raw[:8] == b'\x89PNG\r\n\x1a\n', 'Asset is not PNG: ' + label)
            if len(raw) >= 24:
                width, height = struct.unpack('>II', raw[16:24])
                require(width > 0 and height > 0, 'Invalid PNG dimensions: ' + label)
            else:
                require(False, 'Truncated PNG: ' + label)
        require(len(b['transcript']) == 6 and all(isinstance(x, str) and x.strip() for x in b['transcript']), 'Expected six text steps: ' + label)
        require(bool(b.get('limitation')), 'Missing limitation: ' + label)
        require(b['review'].get('method') == 'AI visual inspection against source and brief', 'Unlabelled review method: ' + label)
        require(b['review'].get('human_acceptance') == 'pending', 'Unsubstantiated human acceptance: ' + label)
    require({p.relative_to(gallery).as_posix() for p in (gallery / 'assets').glob('*.png')} == {b['asset'] for b in boards}, 'Untracked/extra PNG in gallery')
    lineage = json.loads((gallery / 'asset-lineage.json').read_text())
    require(lineage.get('schema_version') == 1, 'Unsupported lineage schema')
    generation = json.loads((gallery / 'generation.json').read_text())
    initial_prompts = generation.get('initial_prompts', [])
    history = lineage['boards']
    require(len(history) == len(boards) and {b['slug'] for b in history} == set(slugs), 'Lineage inventory differs')
    require(lineage.get('human_acceptance') == 'pending', 'Unsubstantiated lineage acceptance')
    revisions = 0
    for record in history:
        stages = record['stages']
        selected = next((b for b in boards if b['slug'] == record['slug']), None)
        if selected is None:
            require(False, 'Unknown lineage board: ' + record['slug'])
            continue
        if not stages:
            require(False, 'Missing initial lineage stage: ' + record['slug'])
            continue
        require(stages[0]['stage'] == 'initial', 'Missing initial lineage stage: ' + record['slug'])
        require(stages[0].get('prompt_record') == 'generation.json: initial_prompts entry with matching slug', 'Invalid initial prompt pointer: ' + record['slug'])
        matching_prompts = [p for p in initial_prompts if p.get('slug') == record['slug']]
        require(len(matching_prompts) == 1 and isinstance(matching_prompts[0].get('prompt'), str) and bool(matching_prompts[0]['prompt'].strip()), 'Missing or ambiguous initial prompt: ' + record['slug'])
        for index, stage in enumerate(stages):
            if 'retained_asset' in stage:
                retained = local_path(gallery, stage['retained_asset'])
                require(retained.is_file() and hashlib.sha256(retained.read_bytes()).hexdigest() == stage['asset_sha256'],
                        'Retained revision hash mismatch: ' + record['slug'])
            require(bool(re.fullmatch(r'[0-9a-f]{64}', stage.get('asset_sha256', ''))), 'Invalid lineage digest: ' + record['slug'])
            if index:
                require(stage.get('parent_sha256') == stages[index - 1]['asset_sha256'], 'Broken lineage parent: ' + record['slug'])
                require(bool(stage.get('edit_prompt', '').strip()), 'Missing edit prompt: ' + record['slug'])
                revisions += 1
        require(record['selected_asset'] == selected['asset'], 'Lineage asset differs: ' + record['slug'])
        require(stages[-1]['asset_sha256'] == record['selected_asset_sha256'] == selected['asset_sha256'], 'Lineage final binding differs: ' + record['slug'])
    require(lineage.get('generation_count') == len(history), 'Lineage initial generation count differs')
    require(lineage.get('revision_count') == revisions, 'Lineage revision count differs')
    parser = GalleryParser()
    html = (gallery / 'index.html').read_text()
    parser.feed(html)
    errors.extend(parser.errors)
    for board in boards:
        steps = [' '.join(re.sub(r'^\d{2}\s+', '', step).split()) for step in board['transcript']]
        require(parser.transcripts.get(board['slug']) == steps, 'Rendered transcript differs: ' + board['slug'])
    require(parser.language == 'en' and parser.viewport, 'Missing HTML language or viewport')
    require(parser.details == len(boards), 'Missing HTML transcripts')
    require(len(parser.images) == len(boards), 'HTML image count differs')
    require(all(i.get('alt', '').strip() for i in parser.images), 'Missing image alt text')
    require(':focus-visible' in html, 'Missing visible keyboard focus styling')
    require(not re.search(r'@import|url\s*\(', html, re.I), 'Unexpected CSS resource')
    for link in parser.links:
        parsed = urlsplit(link)
        target = local_path(gallery, link)
        if parsed.fragment and target == gallery:
            require(parsed.fragment in parser.ids, 'Broken HTML fragment: ' + link)
    require(set(slugs).issubset(parser.ids), 'Missing board anchors')
    for file in [root / 'README.md', gallery / 'README.md', *sorted((root / 'specs/001-skill-storyboards').glob('*.md'))]:
        for link in re.findall(r'\]\(([^)]+)\)', file.read_text()):
            parsed = urlsplit(link)
            if not parsed.scheme and not parsed.netloc:
                local_path(file.parent, link)
    for file in [*gallery.glob('*.json'), *gallery.glob('*.md'), gallery / 'index.html', *sorted((root / 'specs/001-skill-storyboards').glob('*.md'))]:
        require(not re.search(r'/(?:Users|home|private|var/folders)/|file://|sk-proj-', file.read_text()), 'Local/private material marker: ' + file.name)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        errors = validate(args.root)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        errors = ['Unable to validate package: ' + str(exc)]
    if errors:
        for error in errors:
            print('ERROR: ' + error, file=sys.stderr)
        return 1
    print('PASS: Current skill inventory, source/asset byte bindings, revision lineage, six-step transcripts, links and offline HTML structure.')
    print('LIMIT: Structural checks do not inspect pixels, establish rights or record human acceptance.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
