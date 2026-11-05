# Independent work recorder

A first working slice of [issue #27](https://github.com/chrisjones77/skills/issues/27),
based on [AI Operational Governance](../ai-operational-governance/SKILL.md).
QVCH and UWH produce observations through a shared contract. This independent module
records them; a Git adapter persists them and an offline HTML monitor displays them.
No harness, model, service or database is required for the synthetic example.

Open [the synthetic monitor](examples/monitor.html) in a browser, or run from the repository root:

```sh
node --test work-recorder/recorder.test.mjs
node work-recorder/examples/demo.mjs /absolute/new-demo-directory
```

Use a POSIX host with Node 22 or later, trusted Git on PATH, a trusted local filesystem
and an absolute, new output directory. Generated ledgers contain synthetic data only;
real use requires a separately selected private location and owner-defined retention.
The output directory is created owner-only. Open its monitor.html locally; no web server
or dependencies are needed. The committed preview is a synthetic capture, not a live view.

## Interface

`recorder.mjs` exports initialization, strict event validation/construction, append,
readback, explicit Git commit, derived persistence receipts and a read-only view.
`adapters.mjs` projects caller-validated QVCH profiles, UWH attended records and read-only
executor receipts, plus bounded worker-failure observations. These adapters do not validate
an entire harness contract, authenticate a person or transition work. They default to
producer-declared provenance; the examples explicitly use synthetic provenance.
`monitor.mjs` exports a render-only HTML view and an explicit non-overwriting file export.

```js
import {randomUUID} from 'node:crypto';
import {makeEvent, appendEvent, commitLedger} from './recorder.mjs';

const event = makeEvent({
  producer: {name: 'uwh', instance: randomUUID(), revision: 'reviewed-source-id'},
  sequence: 1,
  task: {id: 'R-042', assignment_digest: null, attempt: null},
  purpose: '0xC', kind: 'execution_started', state: 'active',
  observation: 'producer_declared'
});
const saved = appendEvent(canonicalInitializedLedger, event);
// An explicit checkpoint owned by the ledger writer:
const receipts = commitLedger(canonicalInitializedLedger);
```

Initialize an existing empty canonical directory owned by the current user, mode 0700,
with initializeLedger first. Keep this ledger separate from source repositories. This
prototype owns its dedicated Git repository and refuses unexpected files, modifications
and pre-existing staged changes. It uses fixed local recorder author metadata, disables
Git hooks and inherited Git configuration, and never pushes, fetches or contacts providers.

## Event contract v1

Events have exactly these fields:

| Field | Meaning |
| --- | --- |
| schema / id | work-recorder.event.v1; globally distinct UUID, stable across delivery retries. |
| producer | qvch, uwh or synthetic; instance UUID and reviewed source revision label. |
| sequence | Positive safe integer within a producer instance; numbering starts at one. |
| observed_at | Canonical UTC observation timestamp; display order only. |
| task | Task ID, nullable accepted-assignment SHA-256 and nullable attempt label. |
| purpose | Existing 0x0–0xF code and its canonical command; separate from event kind. |
| kind | Bounded checkpoint vocabulary exported as kinds; no executable command. |
| observation | synthetic, producer_declared or derived; no authenticated-observer claim. |
| evidence | Bounded fixture:, artifact: or record: labels plus SHA-256; no raw payloads or filesystem paths. |
| detail | Bounded state, nullable reason code and phase. |
| corrects | Nullable earlier event UUID for a correction; never rewrites the original. |

Persist the same instance and next sequence if its allocation state survives restart.
Otherwise create a new instance starting at one; source revision changes also start a
new instance. Allocation and durable delivery belong to the producer. The recorder does
not invent missing producer events. It detects observed sequence gaps, not an unobserved
trailing loss, and never treats display order as global causal order. Revision labels are
claims supplied by the producer. SHA-256 references identify bytes, not their correctness.

Events are canonical JSON, at most 16 KiB, one UUID-named file each under events/. There
are at most 10,000 events per prototype ledger. Identical delivery is idempotent, different
content under the same ID or position is a conflict. Out-of-order delivery is retained;
a gap can disappear when the missing event arrives. Unknown outcomes remain unknown.
Corrections can reference unavailable earlier records; the reference alone proves nothing.

## Acknowledgement, persistence and recovery

Append holds the single-writer lock, writes and fsyncs a private temporary file, links it
exclusively into the event directory, and fsyncs that directory. A successful return means
saved_locally under the stated filesystem assumptions. Durability across power loss remains
dependent on host/storage behavior. A failure after linking may leave an event present even
without an acknowledgement: inspect it and retry identical delivery, not the work itself.

Receipts are derived separately: event digest, saved_locally or committed, commit identity,
duplicate indication, and remote_persistence: unverified. No pushed state is inferred and no
push API is provided. Commit explicitly batches current events. Changing or deleting an
observed committed event is refused when comparing the current Git history. Git history can
still be rewritten or removed by the owner; this is not an authenticated or tamper-proof log.

A crash can leave .git/recorder.lock or a temporary link. There is no automatic stale-lock
recovery. Stop writers, establish that the former writer exited, preserve evidence and
inspect both Git and event bytes before owner reconciliation. Never clear an authoritative
UWH attempt claim or retry work to repair recording. The Git adapter is single-writer only;
multiple producers must serialize their delivery or retain it for later reconciliation.

This slice does not atomically instrument UWH SQLite transitions or provide a transactional
outbox. Adapters observe after the host's supported operation. A crash between a harness
transition and recording can lose the observation. Producers must retain a source receipt or
use an authorized outbox before claiming durable lifecycle coverage. Recorder failure must
be surfaced to the operation owner, who selects whether the operation holds or continues
with a declared gap. No existing UWH gate is modified by this module.

## Actual UWH compatibility demonstration

The separate demonstration exercises UWH's existing package profile, intake, offer,
acceptance, resume, result submission and review APIs with fictional human responses.
It performs a deterministic shelf-label comparison. No worker or model is launched.
Only an explicitly supplied source package with the exact file pins in
[the source record](examples/uwh-source-pin.json) may be loaded. The inspected source is
PR #24 at f5ffbde38ffebaf83f181038c65a6117c0c8e236; it remains an external implementation,
not a bundled recorder dependency. Review that source before running it.

```sh
node work-recorder/examples/uwh-roundtrip.mjs /canonical/reviewed/unified-work-harness /absolute/new-output
```

The pin is checked before importing modules. An ordinary installed UWH copy may differ;
do not refresh hashes automatically to make the example run. Its synthetic accepted review
is not actual human acceptance. The core suite runs independently; CI additionally exercises
this pinned external example. No installed QVCH profile or UWH runtime is changed.

## Monitor and verification limits

The monitor embeds its data and performs only filtering and event selection. CSP blocks
network connections. Replay cannot import modules or call the recorder/harness. Export
writes only the explicitly chosen, new HTML output file; inspecting a ledger does not
change its events or contract state. Detailed text wraps on narrow screens; the ledger
has an explicitly labelled horizontal scroll region.

Tests exercise identity/conflicts, epoch restarts, missing/reordered events, locks, readback,
changed/deleted history, unsafe entries, adapters and replay/source preservation. The
synthetic preview deliberately includes a gap, pending review, and saved-only events.
It does not prove loss-free delivery, producer authenticity, complete telemetry, OS isolation,
control effectiveness, real human consent or standards conformance.

Remaining work from #27 includes UWH transactional emission/outbox, process-boundary failure
code transport, live producer wiring, retention tooling and owner acceptance. The bounded
failure adapter already accepts code/phase without copying raw worker messages. Feedback
from this slice should become reviewed changes at explicit source/task checkpoints.
