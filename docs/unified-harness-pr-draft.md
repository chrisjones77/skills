# Local PR draft: bound read-only work execution

Suggested title: **Add context-bound v5 read-only harness execution and verification**

This is a local review handoff, not a submitted PR, release approval or completion
claim for the broader unified harness. No commit, push or remote PR update was
performed during preparation.

## Summary

Extend the self-contained Node-builtins-only bundle with a bounded integrated
path from purpose/intake records to an explicitly accepted read-only assignment.
Routing metadata is not authority; offer, acceptance, resume and human review
remain separate. Professional engineering/advisory guidance is retained without
claiming professional approval or automatically acting on advice.

- Add metadata-only capability/profile and assignment-intake inspection. Partial,
  planned and unresolved capabilities hold rather than silently dispatching.
- Bind exact profile, intake, assignment and workspace records, bundle bytes,
  purpose, roles, review criteria and endpoint into accepted scope.
- Add optional private result retention with accepted destination policy,
  owner-only files and hash-bound receipts; raw answer text is not in ordinary
  receipts or executor event logs.
- Add an accepted single-attempt ledger policy and explicit UTC start window.
  Existing or uncertain claims block reuse; no automatic retry, renewal or reset.
- Reject unbound evidence destinations and unsupported/conflicting prohibitions;
  sanitize untrusted event metadata and preserve split UTF-8 responses.
- Include all harness tests in CI, reconcile capability documentation against
  runtime status, and record a bounded strict live v5 smoke test.

## Review map

- Runtime and authority boundaries: `unified-work-harness/bundle.mjs`.
- Deterministic binding, expiry, integration and inventory checks:
  `binding.test.mjs`, `roundtrip.test.mjs`, `package.test.mjs` in that directory.
- Opt-in live fixture and evidence summary: `live-roundtrip.test.mjs` and
  [live-test-results.md](../unified-work-harness/live-test-results.md).
- Operating instructions and selected-capability scope:
  [SKILL.md](../unified-work-harness/SKILL.md) and
  [delivery-checklist.md](../unified-work-harness/delivery-checklist.md).
- CI discovery: `.github/workflows/unified-work-harness.yml`.
- Entry links and source-byte reconciliation: `README.md` and
  `docs/skill-storyboards/manifest.json`. No new artwork or human image acceptance.

New local files must be included when committing; a plain tracked-file diff
alone omits the binding test, package test, delivery checklist and this handoff.
Review the complete intended file set and preserve any unrelated dirty changes.

## Verification

- `node --test unified-work-harness/*.test.mjs`: 13 deterministic tests passed;
  the opt-in live test is skipped by default.
- Separately authorized strict live v5 test: one first-attempt pass using local
  Ollama `qwen2.5:3b`, exact token-only output, one completed source read, no source
  changes or violations, and review pending. Tested bundle/fixture hashes and
  receipt identity are in the linked result record. Temporary synthetic files
  were removed; this is a summary, not a retained raw evidence archive.
- Bundle and live-fixture syntax checks, storyboard structural validation and
  `git diff --check` passed.
- Installed skill-creator structural validator passed in an isolated temporary
  Python 3.14.7 environment with PyYAML 6.0.3. This dependency is not part of the
  self-contained Node runtime and was not installed into system Python.
- CI configuration is prepared locally; no new remote CI result is claimed.

## Compatibility and limitations requiring review

The CLI remains legacy v1. New integrated v5 work uses the API; scopes v1–v4
remain supported with their documented weaker guarantees. Do not advertise the
CLI as having v5 replay/expiry controls or silently upgrade accepted contracts.
Contract callers can no longer supply `outputRoot`; v3+ accepted private-result
retention is the supported persistent result channel. Prohibition labels outside
the adapter's supported vocabulary now reject rather than being ignored.

The ledger provides at-most-one attempt per accepted digest only for cooperating
processes sharing intact trusted local storage. It is not exactly-once execution,
distributed locking, authenticated consent, rollback protection or a transaction
covering artifact persistence and receipt delivery. Same-user tampering and path
races require external controls. No real power-loss assurance is claimed.

The UTC window limits starting work; it does not terminate an already launched
worker at expiry or establish continuing consent/evidence freshness. Existing
worker timeouts still apply. Read violations are detected after exposure, not
prevented by an OS sandbox. Loopback URLs do not independently attest model
locality. Private-file permissions are not encryption or an ACL/backup audit.

One live token test is not a reliability benchmark, substantive professional
validation, human acceptance or production readiness. Reviewers should focus on
pre-provider rejection, mixed-version rejection, claim consumption after failure,
terminal-state uncertainty, raw-content handling and the exact extent of the
start-window checks.

## Outside this change

Full QVCH dependency/source resolution, general queues, goal dispatch, broader
provider supervision, full human/hybrid lifecycle and candidate-change execution
remain partial or planned. Their inventory entries are not a delivery claim.
Selected professional/advisory, coverage and triage guidance does not imply
fully validated automated adapters. No specialist excluded workflows were added.

Public release still needs the separate source-rights/private-content review and
appropriate human acceptance. This preparation changes no license and does not
assert that all selected source capabilities have been fully incorporated.

## Before submission

- [ ] Review the full local diff, including new files, and approve the narrow scope.
- [ ] Obtain explicit authorization to commit/push and create or update the
  intended PR; verify its repository, branch and current state before doing so.
- [ ] After submission, verify actual remote checks; local passes are not remote CI.
- [ ] Obtain independent/human review appropriate to the intended use before merge
  or release. Neither is authorized by this draft.
