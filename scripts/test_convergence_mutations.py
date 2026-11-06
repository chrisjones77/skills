"""Seed one fault per disposable copy. Require both a specific failed assertion and a passing control."""
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PKG = 'unified-work-harness'
# target and control are actual TAP names, not input substrings used as evidence
cases = [
    ('unbounded-lease-read', 'bundle.mjs', 'readPrivateFileBytes(path.join(directory,"owner.json"),4096)',
     'readFileSync(path.join(directory,"owner.json"))', 'roundtrip', 'provider lease storage: receipt FIFO',
     'provider lease storage: ordinary release', 'lease operation must finish within its deadline: receipt FIFO'),
    ('oversized-discovery', 'bundle.mjs', 'const discoveryByteLimit = 1024 * 1024;', 'const discoveryByteLimit = 2 * 1024 * 1024;',
     'integrated', 'provider discovery: compressed list one byte over', 'provider discovery: model list at limit',
     'discovery admitted: compressed list one byte over'),
    ('stale-v5-discovery', 'bundle.mjs', 'needsTools, checkFreshness);', 'needsTools, packageBound ? checkFreshness : undefined);',
     'integrated', 'provider discovery: v5 expires after model list', 'provider discovery: model list at limit',
     'discovery continued after hold: v5 expires after model list'),
    ('erased-clarification', 'bundle.mjs', "if (packet.checkpoints.some(cp => cp?.concern_id !== undefined || String(cp?.kind).startsWith('clarification-')))",
     'if (false)', 'coordination', 'clarification replay: deleted collection', 'clarification replay: same-tick resolution and explicit resume',
     'inconsistent clarification accepted: deleted collection'),
    ('unrelated-handoff', 'coordination.mjs', 'first.work_id !== prior.work_id || ', '',
     'coordination', 'handoff lineage: different task', 'handoff lineage: same work', 'invalid handoff accepted: different task'),
    ('regressing-work-history', 'bundle.mjs', 'time < previousTime || time < created ||',
     'time < created ||', 'coordination', 'work event history: rework before submission',
     'work event history: reviewed revision retains its earlier workspace', 'invalid history admitted: rework before submission'),
    ('stale-resume-count', 'bundle.mjs', 'cp.assignment_digest === assignment.digest && cp.work_event_count === eventCount',
     'cp.assignment_digest === assignment.digest', 'coordination', 'attended resume history: different event count',
     'attended resume history: explicit same millisecond resume', 'stale checkpoint admitted: different event count'),
    ('missing-submission-resume', 'bundle.mjs', "if (e.kind === 'review-submit') {",
     'if (false) {', 'coordination', 'submitted checkpoint history: no resume',
     'work event history: reviewed revision retains its earlier workspace', 'submission has no matching resume: no resume'),
    ('redirected-terminal-write', 'bundle.mjs', 'durableExclusiveJson(directory, terminalName,',
     'durableExclusiveJson(policy.directory, terminalName,', 'roundtrip', 'ledger finalization: policy redirected',
     'ledger finalization: completed pair', 'finish must stay in the claimed directory'),
    ('unbound-candidate-claim', 'candidate.mjs', ' && ledger.claim_sha256===receipt.claim_sha256', '',
     'candidate', 'candidate recovery: replacement claim', 'candidate recovery: intact receipt', 'review must refuse replacement claim'),
    ('over-budget-edit-output', 'bundle.mjs', 'timeout:seconds*1000,maxBuffer:assignment.resources.max_output_bytes',
     'timeout:seconds*1000,maxBuffer:assignment.resources.max_output_bytes*2',
     'integrated', 'edit worker termination: excess stdout', 'edit worker termination: exact stdout',
     'unexpected worker result: excess stdout'),
    ('unbound-check-result', 'bundle.mjs', 'passed: expectedExit && candidateUnchanged !== false,',
     'passed: expectedExit,', 'integrated', 'acceptance patch binding: moved revision',
     'acceptance patch binding: untracked build output', 'check result must match the delivered patch'),
    ('incomplete-codex-turn', 'bundle.mjs',
     'if (result.code === 0 && (!steps || turnOpen)) violations.push("Codex CLI returned an incomplete turn");',
     '// trust proposal text without a terminal turn event', 'integrated', 'Codex proposal transcript: missing completion',
     'Codex proposal transcript: ordered turn', 'unexpected proposal disposition: missing completion'),
    ('unbounded-direct-response', 'bundle.mjs',
     'if (size > maximumBytes) return {size, hash:null, violation:', 'if (false) return {size, hash:null, violation:',
     'integrated', 'direct response stream: one byte over', 'direct response stream: exact bytes',
     'cancel the stream on the first over-budget byte'),
    ('symlinked-context-parent', 'bundle.mjs',
     'if (hasSymlinkComponent(worktree, normalized)) throw new Error(`declared context path crosses a symbolic link: ${normalized}`);',
     '// omit the ancestor check', 'integrated', 'direct context rejects a grant below a symlink before sending source',
     'direct proposal: authorized proposal', 'Missing expected rejection'),
    ('unstaged-only-patch', 'bundle.mjs', '"--no-renames", baseCommit, "--"], 20_971_520)',
     '"--no-renames", "--"], 20_971_520)', 'integrated', 'edit worker: staged authorized edit',
     'edit worker: new ignored file', 'candidate.patch'),
    ('worker-redirect', 'bundle.mjs',
     'await runGuardedOpenCode({ assignment, worktree, artifactDirectory, endpoint, getTempParent, capturePrivateResult }, beforeProvider, beforeCompletion)',
     'await runOpenCode({ assignment, worktree, configPath, artifactDirectory, endpoint, getTempParent, capturePrivateResult })',
     'integrated', 'OpenCode completion after a source read, upstream status 307',
     'OpenCode completion after a source read, upstream status 200', 'the second listener must receive no requests'),
    ('late-reservation-check', 'queue.mjs', "if (offeredScope !== offer.scope) throw Error('Dispatch scope differs from the accepted offer.');",
     '// intentionally defer rejection to worker', 'queue', 'v5 rejects substituted policies before reservation and accepts the original envelope',
     'v6 queued dispatch rechecks the full package profile and reviewed intake', 'rejection must preserve the queue reservation'),
    ('lexical-ancestry', 'bundle.mjs', 'ancestor.dev === source.dev && ancestor.ino === source.ino',
     'directory === sourceRoot || directory.startsWith(sourceRoot + path.sep)', 'integrated',
     'physical ancestry refuses an aliased private directory','reviewed and accepted v6 produces a package-bound candidate receipt','Missing expected exception'),
    ('stale-owner', 'bundle.mjs','if (current?.token !== owner.token || current.pid !== owner.pid) return false;',
     '// intentionally remove replacement-owner check', 'roundtrip','concurrent stale lease recovery preserves the replacement owner',
     'equivalent endpoint URLs share a provider lease until release','Missing expected rejection'),
]


def substitute(file, old, new):
    text = file.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f'Seed no longer targets exactly one location: {file.name}')
    file.write_text(text.replace(old, new))


def verify(cmd, adverse, control, message, cwd, python=False):
    result = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                            timeout=90, env={**os.environ, 'UNIFIED_TEST_INSTALLED_OPENCODE': '0'})
    if python:
        bad = re.search(r'^'+re.escape(adverse)+r' .* \.\.\. FAIL$', result.stdout,re.M)
        good = re.search(r'^'+re.escape(control)+r' .* \.\.\. ok$', result.stdout,re.M)
    else:
        bad = re.search(r'^not ok \d+ - '+re.escape(adverse)+r'$',result.stdout,re.M)
        good = re.search(r'^ok \d+ - '+re.escape(control)+r'$',result.stdout,re.M)
    if result.returncode != 1 or not (bad and good and message in result.stdout):
        raise RuntimeError('Seed survived, failed for the wrong reason, or lost its control:\n'+result.stdout)


def main():
    for name, source, old, new, suite, adverse, control, message in cases:
        with tempfile.TemporaryDirectory() as scratch:
            pkg = Path(scratch) / PKG
            shutil.copytree(ROOT / PKG,pkg)
            substitute(pkg / source,old,new)
            verify(['node','--test','--test-reporter=tap','--test-name-pattern=^('+re.escape(adverse)+'|'+re.escape(control)+')$',
                    suite+'.test.mjs'],adverse,control,message,pkg)
            print('DETECTED '+name+'; control passed',flush=True)
    with tempfile.TemporaryDirectory() as scratch:
        root = Path(scratch)
        for file in ['scripts/test_storyboard_coverage.py','scripts/validate_storyboards.py',
                     'docs/skill-storyboards/manifest.json','docs/skill-storyboards/assets/unified-work-harness.png',
                     'docs/skill-storyboards/coverage-unified-work-harness.json','image-card-coverage-harness/scripts/harness.py']:
            (root / file).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / file,root / file)
        substitute(root / 'scripts/validate_storyboards.py', '    report = validate_coverage(record, asset_root=gallery)',
                   "    record['provenance']['asset_sha256'] = board['asset_sha256']\n    report = validate_coverage(record, asset_root=gallery)")
        verify(['python3','scripts/test_storyboard_coverage.py','StoryboardCoverageTest','-v'],'test_wrong_asset_digest','test_valid_human_hold',
               'ASSET_HASH_MISMATCH',root,python=True)
        print('DETECTED storyboard-digest; control passed')


if __name__ == '__main__':
    main()
