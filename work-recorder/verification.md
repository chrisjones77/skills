# First-slice verification — 2026-11-05

## Scope and source

The recorder implements independent immutable event ingestion, a dedicated Git storage
adapter, caller-validated observation projections and an offline read-only monitor.
The foundation is merged PR #26, commit abfb983b28801b895dab9dae87702dfd6b8dcfa9.
The external UWH compatibility example is pinned to PR #24 commit
f5ffbde38ffebaf83f181038c65a6117c0c8e236 and exact module hashes in examples/uwh-source-pin.json.
It does not change the UWH source or its package manifest.

## Local results

- Node v24.10.0 on macOS; trusted local Git and POSIX owner-only temporary directories.
- All 16 recorder tests passed. Cases cover immutable content and derived receipts, duplicate
  and conflicting deliveries, producer-instance restarts, revision changes, out-of-order
  observations and gap reconciliation, invalid fields/purposes/references, linked corrections,
  writer locks, a separate-process readback, altered/deleted committed events, unrelated staged
  files, symlinks/permissions, bounded adapters and raw-message exclusion, monitor script
  parsing, offline replay/source preservation, the end-to-end synthetic preview, and a producer
  killed before acknowledgement followed by identical redelivery.
- The pinned UWH example passed: actual package-profile resolution, intake review, offer,
  acceptance, resume, deterministic label comparison, submission and review APIs emitted six
  correlated events with no observed sequence gaps. Fictional participant decisions are
  explicitly synthetic, including accepted review; no human acceptance or provider execution
  is claimed. The recorder did not launch a model or worker.
- Existing storyboard inventory/source/asset/lineage validation and git whitespace checks passed.
- Browser checks on the synthetic monitor: task R-042 selected eight rows; producer QVCH
  narrowed that to two. Keyboard Enter selected the review event and exposed pending review,
  saved-local state and commit pending. Desktop document width was 1280 at viewport 1280;
  phone document width was 390 at viewport 390. The table has its own labelled scroll region,
  the details wrap, and the selected button has an amber focus outline. Producer timeline,
  declared gap and separate persistence strip were visible. The temporary viewport was reset,
  test tab closed and loopback server stopped.
- Browser testing caught a generated-script newline bug after a detail-panel edit. It was
  repaired; generated script parsing is now included in the tests, and filters/selection were
  retested successfully. This is functional browser QA, not accessibility conformance.

## Distributed preview

examples/monitor.html is an embedded synthetic capture generated from examples/demo.mjs.
Its Git commits identify only that disposable synthetic ledger. It includes a deliberately
missing producer sequence, a pending review and an independently bounded worker-failure
observation. Events saved after its commit remain labelled saved locally. No remote push
is performed or inferred. Raw records are available through a separate disclosure.

## Remaining limits and owner decisions

This is a working first slice of issue #27, not completion of every production acceptance
criterion. It has no UWH transactional outbox, automatic live producer hooks, raw worker
error transport across UWH's process boundary, delivery daemon, pushed-state verification,
retention tooling, provider/model validation or authenticated identities. The observation
adapters are not full contract validators. Hosts must verify source records before use.
A transition-to-recording crash can lose an observation; missing trailing events cannot be
detected from sequence gaps alone. One writer and a trusted filesystem are prerequisites.
Manual reconciliation preserves authoritative UWH contracts and attempt claims.

No installed skill, live project overlay, external account or production service was
modified. Human acceptance, adoption and release remain separate. Hosted Linux/macOS CI
results are recorded on the implementation PR, not inferred from the local results above.
