# Transactional queue recording (opt-in)

This follow-up adds an optional SQLite outbox to new UWH queues. It retains the independent
work-recorder.event.v1 interface. A queue transition and its pending event commit together;
delivery, recording acknowledgement and Git commit are separate operations. Existing queues
are not migrated and retain their prior behavior.

## Creation and delivery

```js
createQueue(queueDirectory, {
  ...reviewedQueueInputs,
  recording: {mode: 'transactional-outbox-v1'}
});

// An explicitly authorized recorder host performs delivery. No queue API imports it.
for (const row of readPendingEvents(queueDirectory, {limit: 100})) {
  const receipt = appendEvent(privateLedgerDirectory, row.event);
  acknowledgeEvent(queueDirectory, {
    eventId: row.event.id, eventSha256: row.sha256, receipt
  });
}
// A separate, explicit checkpoint may commit the Git ledger.
```

Import readPendingEvents and acknowledgeEvent from queue.mjs. appendEvent is supplied by
the separately reviewed independent recorder. No recorder service, automatic import,
background delivery, push, or additional executor is installed. The caller must authorize
source-read, ledger-write and queue-acknowledgement effects separately from task execution.

The source outbox uses the same canonical JSON plus trailing newline as the independent
recorder. Acknowledgement requires the exact event ID/digest and a coherent v1 saved-local
or committed receipt. The receipt is a caller declaration, not authenticated proof of
storage. Its schema checks never establish authority or unlock a task. Reading and
acknowledging events change no job state, budget, contract or invocation claim. An already
acknowledged event can be acknowledged again without adding a transition. Acknowledgement
is separate from task acceptance, review and Git commit/push.

All events are retained in sequence; acknowledgement only marks delivery. Readback pages
pending events in producer order. No event is deleted or rewritten to make delivery pass.
An interruption after recorder save but before source acknowledgement leaves the same UUID
pending, so identical redelivery can return the recorder's duplicate receipt. A failed
acknowledgement remains pending. The at-least-once delivery pattern is not exactly-once
execution or a guarantee against loss of the database/ledger.

## Recorded boundary and provenance

A new queue opts into recording before storage creation. Invalid recording policies fail
without creating files. New tables preserve producer identity, source/task mapping and
immutable event bytes/digests. Event insertion and sequence allocation occur inside the
same BEGIN IMMEDIATE / synchronous FULL transaction as each supported queue change.
An insertion failure rolls back that queue change. A process killed before COMMIT retains
neither; after COMMIT both survive under the existing trusted-filesystem assumptions.

Recorded checkpoints include queue admission of an offer, provider reservation, received
result, review, attended responses, stop requests/cancellations and reconciliation. A
reservation is not proof that a worker started or claimed an invocation. The queue does
not emit those lower-level facts without observing them. Its task attempt field remains
null; accepted assignment digests remain available for correlation.

The producer instance and sequence persist in the original database across process restart.
The producer revision hashes queue.mjs and outbox.mjs as observed on disk; it is an identity
claim, not loaded-code attestation or source approval. If that implementation changes,
further recording transitions hold pending review of a newly created queue; pending events
remain readable and acknowledgeable through their original identities. There is no automatic
migration, clearing of old records, or renewal of an accepted offer. Package changes also
invalidate reviewed package pins through the existing package mechanism.

Event provenance is producer_declared: the code reports the state it recorded, while actor
identity and real human decisions remain the host's responsibility. The source emits only
task IDs, accepted digests, code/state labels, timestamps and evidence hashes. No outcome,
response note, actor name, prompt or raw worker error is copied. These identifiers can still
be sensitive. The explicit recording option selects additional private metadata storage; it grants no
authority. The owner must establish permission, location, access and retention before enabling it.

## Failures, stopping and recovery

Recording is required for transitions in an opted-in queue. A recording/SQLite write failure
fails the operation and preserves the prior durable state. Before provider reservation this
also preserves budgets and makes no provider request. A failure after an external effect
cannot undo it: preserve the running/uncertain queue state and invocation evidence for owner
reconciliation. Do not rerun work merely to obtain an event.

A stop request records stop_requested for a currently running job, not a claim that the
worker has exited. Cancellation of waiting work has its own event. Existing supervisor and
process-group controls remain responsible for actual termination. If SQLite or recording
fails while stopping, the caller must surface that failure and use its separately authorized
host/provider cancellation route where necessary; do not rely on the absent stop flag or
wait for this recorder during an urgent protective action. No stop or recovery gate is
weakened by selecting a purpose code or acknowledging delivery.

The original storage-location marker, owner-only directory/file checks, budget admission,
contract scope, review and recovery gates remain in force. Queue copies/relocations cannot
acquire a writable outbox through this API. Read-only inspection may reveal a copied history;
it does not authorize acknowledgement, migration or execution. Retention and optional
compaction require separate owner policy; no purge command is added here.

## Evidence and remaining scope

outbox.test.mjs covers explicit opt-in, attended lifecycle mapping, insertion/acknowledgement
failure, process loss before and after commit, exact/idempotent acknowledgement, corrupt
readback, paging and stop recording. queue.test.mjs exercises opted-in v5/v6 provider paths,
including zero provider calls and unchanged budgets when an event cannot be committed.
The existing queue and convergence suites continue to test unrecorded compatibility paths.

The repository integration check scripts/test_outbox_recorder.mjs takes an explicitly supplied,
pinned recorder directory. It verifies the independent recorder's emitted byte digests,
interruption before source acknowledgement, duplicate-safe redelivery, a blocked recorder,
unchanged source state during delivery, and five correlated attended events with no gaps.
All participants and responses in that test are fictional. The recorder pins are retained in
scripts/outbox-recorder-pin.json; do not update them automatically to clear a failure.

This slice covers queue-owned state, not every direct UWH call or worker process. Direct
contract invocation claims, actual worker start, detailed worker failure transport, live
producer installation, automated delivery and retention tooling remain outside this slice.
The generic supervision failure reason remains a bounded queue observation, not a root-cause
assertion. Issue #27 stays open until the remaining integration and owner acceptance are resolved.
