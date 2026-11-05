# UWH transactional outbox: verification and handoff

## Scope and branch relationship

This is the separate follow-up to issue #27, stacked on PR #24 at
`e65c733784167f4f7e79a4faf8324917380d39ef`. It does not modify that branch or add a
merge condition to it. Review the outbox changes separately; after #24 merges, reconcile
this branch with main and retarget the PR before considering its merge. Do not merge it
into the active #24 branch as an implicit scope expansion.

The independent recorder remains a separate component. The integration fixture reads its
merged source at `2d3e2d69d2f8ac052e0e75e59a2e7582504dd83d`, checks exact module pins, and
supplies it events through the versioned interface. UWH does not import that package.

## Observed results

- Final code revision: `61d5c9d3786ab750ee971f3aa4f5954b25d2315b`.
- Package identity: `2e2ec062e29d4067a6c7d839b879e48ace16ecabdb6ae995385b9950e756ee01`.
- Local environment: v24.10.0, git version 2.54.0 (Apple Git-157), macOS with observed case-insensitive filesystem.
- Full convergence gate: 154 passing cases, no failures. Only the two explicitly
  opt-in model tests skipped. No live model test was performed for this queue-recording change.
- Installed OpenCode 1.18.25 synthetic lane: 25 passing cases, no failures or skips,
  at `aa7e55f5e663c7b34bb6eaa75d6815ec72b3782a`. Later local changes added a stop-observation test, clarified docs,
  and tightened acknowledgement commit-ID typing; the final-head hosted lane runs separately.
- All five seeded faults were detected with their valid controls: worker redirect, late
  reservation validation, lexical ancestry, stale lease owner and storyboard digest.
- Independent-recorder integration passed on the final code: five correlated attended events,
  no sequence gaps, identical bytes/digests in the outbox and recorder, duplicate-safe redelivery
  after interruption before source acknowledgement, and recorder-lock failure preserving both
  pending events and source state. No provider or model was contacted by this check.
- Existing storyboard inventory/hash/lineage checks, three coverage tests, affected links and
  Git whitespace checks passed. No UI changed, so no browser acceptance is claimed here.

## New exercised boundaries

Eight outbox tests cover explicit opt-in and rejection before storage, compatibility without
recording, attended lifecycle mapping, event-insertion rollback, a process killed before
SQLite COMMIT, restart after COMMIT, typed/exact/idempotent acknowledgement, acknowledgement
write failure, corrupt event readback, paging and cancellation.

Three queue regressions cover opted-in v5 and v6 success paths, invalid endpoint and failed
outbox insertion preserving jobs/budgets with zero provider requests, and the distinction
between an active stop request and actual worker termination. Original queue admission,
location-binding, process-group, timeout, review and recovery cases remain in the full gate.

The process-loss test kills a disposable child at the actual SQLite COMMIT boundary. The
owner opens the original location for hot-journal recovery before inspecting the unchanged
state and sequence, then the valid original response succeeds. The separate after-COMMIT
case retains both accepted state and its exact pending UUID. These are synthetic observations
under the stated filesystem assumptions, not a general storage-reliability guarantee.

## Operating and acceptance boundaries

Recording is optional at new queue creation and required for transitions once selected.
Existing queues are not migrated. Source revision changes hold new recording transitions;
old pending events remain readable/acknowledgeable. Owner-managed receipt acknowledgement is
not authenticated proof of storage or human acceptance and never advances work.

Failed recording cannot undo an external effect. Preserve uncertain state and invocation
claims for reconciliation, and use separately authorized host/provider cancellation where
SQLite cannot record an urgent stop. A reservation is not a worker-start or invocation-claim
observation. This outbox deliberately does not invent those events.

Direct contract emission, lower-level worker-failure transport, live producer installation,
automated delivery, retention tooling and actual owner acceptance remain outstanding under
issue #27. The local checkout also contains an unrelated untracked synchronization duplicate;
it was not opened, changed or included in this PR.

Hosted Linux/macOS reports belong to this PR's actual head. A green automated gate does not
constitute human acceptance, merge authorization, installed deployment or professional approval.
