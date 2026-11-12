# Goal selection and sequential dispatch

Import `queue.mjs` on a POSIX host with Node 22.13 or later and its built-in
`node:sqlite` module enabled. Install the Git, OpenCode and local model
dependencies described in [the guide](SKILL.md). Use a trusted local filesystem
with POSIX permissions, SQLite locking and durable writes. Pick an existing,
empty, canonical directory owned by the executing user with mode 0700 outside
all source checkouts. Reserve it for this queue. Use separate private locations
for the v5 ledger, accepted input records and optional result.

## From goal to candidate

The operator proposes an objective, owner, stop conditions and named candidate
tasks. Explicitly select an ordered subset. `proposeGoal` returns those outcomes
for discussion. Each selected provider task requires its own v5 or v6 offer, acceptance,
and explicit resume, with the same task ID, outcome and assigner. An attended
human or hybrid task enters as a reviewed offer and waits for the recipient's reply. The worker's
source paths, effect limits and reviewer come from that accepted contract.
Before preparing offers, explicitly include `dispatch` in both `requestedEffects`
and `effectCeiling` of the bound profile. A v6 package profile must additionally
require `sequential_queue`, `readonly_roundtrip` and `assignment_intake`.

The example assumes the host already has two accepted v5 or v6 envelope objects
prepared using the guide. Each envelope contains `packet`, `assignmentPath`,
`endpoint`, `bindingInputs`, `invocationPolicy`, `executionWindow` and,
where accepted, `resultPolicy`. A v6 envelope also supplies its accepted
`packagePolicy`. For provider jobs the queue persists only identity hashes,
budgets, dates, states and evidence references. Keep the envelopes in approved
private storage and supply the current envelope again for each dispatch.

```js
import { createQueue, dispatchNext, inspectQueue, proposeGoal,
         reviewCandidate, stopQueue } from './queue.mjs';

const goal = {
  objective: 'Review the maintenance guide before the next workshop.',
  owner: 'coordinator',
  stopConditions: ['Pause if the evidence points to an incorrect procedure.'],
  tasks: [
    { id: 'scope', outcome: 'Review the stated scope.' },
    { id: 'steps', outcome: 'Review the steps against the source record.' }
  ],
  selectedIds: ['scope', 'steps']
};
const proposal = proposeGoal(goal); // Review selected outcomes with the owner.
createQueue(directory, {
  goal, packets: [scopeEnvelope, stepsEnvelope],
  deadline: agreedDeadlineUTC,
  providerBudgets: { mlx: { attempts: 2, workerSeconds: 120 } }
});

const receipt = await dispatchNext(directory, scopeEnvelope);
const status = inspectQueue(directory);
// The named reviewer inspects the actual result and records their decision.
reviewCandidate(directory, {
  assignmentDigest: receipt.assignment_digest,
  reviewer: 'designated-reviewer', // Must match this offer.
  receiptHash: receipt.receipt_sha256,
  evidenceHash: privateReviewRecordSHA256, accept: true
});
const nextReceipt = await dispatchNext(directory, stepsEnvelope);
```

An attempt is charged to its local provider before spawning a worker. Each
lane's budget limits the number of attempts and total reserved supervision
seconds. The queue reserves the full assignment timeout and uses it as a hard
wall-time ceiling for the complete worker process. A late, failed or cancelled
attempt consumes its reservation. The queue deadline caps all runs. Choose
timeouts large enough for Git setup, endpoint checks, provider waits, execution
and the return receipt. The v5 contract separately enforces its own start window.
Local MLX, Ollama and llama.cpp lanes enter through read-only OpenCode. Supply
trusted tool dependencies on PATH. Queue time budgets cover elapsed supervisor
time and do not measure billing or provider-side token use.

The durable reservation and FIFO order apply across processes. A second caller
can inspect progress but only the head of the queue can run. The caller supplies
a fresh accepted envelope for each step, and the child performs normal production
contract preflight and discovery. A successful receipt enters `pending_review`.
The provider recipient and reviewer must be distinct at admission and reservation. Only a decision attributed to the offer's reviewer with the matching receipt and
an evidence hash can advance the queue. A rejection stops the queue. The host
verifies the identity, authority and substance of each decision. For a receipt already pending from an older release, pass the original accepted envelope’s `packet` to `reviewCandidate` so it can verify both roles.

## Human, hybrid and mixed queues

Pass items to `createQueue` in the selected goal order. Use the offered
coordination **record** for a human or hybrid job, and the accepted read-only
**envelope** for a provider job. At admission, only its `packet` and
`bindingInputs` are required. Callers that previously supplied bare provider
packets must supply both fields so the queue can verify each source before
creating storage. Dispatch checks the storage location again before reserving work. Both source workspaces must resolve on the host.
Build each attended record with `offerCoordination` following [the attended
handoff guide](coordination.md). Use a distinct named recipient and reviewer.
An attended-only queue can omit `providerBudgets`. The provider budget applies
to agent dispatches. The attended intake records the person's agreed effort.

```js
import { createQueue, readAttended, respondAttended } from './queue.mjs';
import { inspectCoordination } from './coordination.mjs';

createQueue(directory, {
  goal: mixedGoal, deadline: agreedDeadlineUTC,
  packets: [analystOffer, agentEnvelope, hybridTeamOffer],
  providerBudgets: { mlx: { attempts: 1, workerSeconds: 60 } }
});
const assignmentDigest = inspectCoordination(analystOffer).assignmentDigest;
let { revision } = readAttended(directory, assignmentDigest);
// Each call records the actual named person's response at that stage.
({ revision } = respondAttended(directory, {
  assignmentDigest, revision, action: 'accept', by: 'analyst', note: 'Scope accepted.'
}));
({ revision } = respondAttended(directory, {
  assignmentDigest, revision, action: 'resume', by: 'analyst', note: 'Inputs checked.'
}));
// The analyst now takes the agreed action outside the queue.
({ revision } = respondAttended(directory, {
  assignmentDigest, revision, action: 'submit', by: 'analyst',
  note: 'Review requested.', evidence: privateWorkReference
}));
// The reviewer inspects the evidence and makes their own decision.
({ revision } = respondAttended(directory, {
  assignmentDigest, revision, action: 'approve', by: 'reviewer',
  note: 'Checked the evidence.', evidence: privateReviewReference
}));
respondAttended(directory, {
  assignmentDigest, revision, action: 'close', by: 'reviewer',
  note: 'Review complete.', evidence: privateReviewReference
});
// The operator can now call dispatchNext(directory, agentEnvelope).
```

Each response consumes the exact record revision displayed to its author.
Only the head job advances. An attended job can pause or ask for clarification
through the same `respondAttended` API. A reviewer can request `rework` after
submission. The recipient explicitly resumes before submitting again. Decline,
deferral, withdrawal and owner timeout preserve the disposition and stop the
queue. Further work needs an owner decision and a newly selected queue.
For hybrid work the named recipient reports which parts people and tools
performed. The queue executes no part of an attended job and sends no messages.

The private database retains the complete attended record, including intake,
scope, actor labels, clarification history, checkpoints and private evidence
references. Choose an approved retention location for this data. Keep large
work products in the authorized private evidence store. The current attended
record is limited to 1 MiB. `inspectQueue` returns metadata only. After restart
use `readAttended(directory, assignmentDigest)` to recover the private record
and its current revision, then compare it with the person's actual progress.
A host must authenticate the acting person and deliver offers, review requests,
stops and deadline changes. A stop or expiry blocks future queue transitions
and preserves the last record. An expiry takes effect when the next attended
transition is attempted. Notify any active person directly.

## Stop and restart

Call `stopQueue(directory)` for an operator stop, including a concern described
by a human stop condition. It durably cancels outstanding reservations that
have yet to start. A stop also blocks approval and rejection of any pending provider receipt. Its recorded state and evidence remain available for inspection. The supervisor sends SIGKILL to any remaining members of its job’s POSIX process group when the direct child exits, before returning a receipt or reporting failure. The live supervisor checks for a stop and deadline about
every 100 ms, subject to host scheduling. It terminates the active job's POSIX
process group. Already delivered requests or detached descendants may require
provider or OS-level intervention. Abrupt cancellation can leave private
scratch files, a consumed ledger entry, or an incomplete result. Reconcile and
handle them under the existing retention policy.

After restart, inspect the same directory. Keep its owner-only location marker with the database. Before opening for writes, the queue checks the database, directory and parent identities against their approved location. Copied, relocated and earlier unbound queues support inspection for reconciliation. Restore a moved directory to its original location to resume. For an older unbound queue, reconcile outstanding work and consumed reservations before selecting any remaining tasks for a new queue. For queued or review-pending work,
continue at the next normal API step. A `running` job blocks later jobs while its
supervisor status is uncertain. Verify independently that the old supervisor
has exited, preserve its evidence, then call:

```js
import { reconcileInterrupted } from './queue.mjs';
const recovery = reconcileInterrupted(directory, {
  packet: savedAcceptedPacket, owner: goal.owner,
  supervisorExited: true, evidenceHash: privateReconciliationRecordSHA256
});
```

An interrupted attempt closes the queue for manual reconciliation even if the
contract ledger shows completion. A ledger record identifies the offer and could
come from an independent direct invocation. Only a receipt observed by the
live queue supervisor can advance a job to human review. The queue never replays an attempted job. Reopening a private
database cannot authenticate identities or protect against deletion, rollback,
same-user tampering, filesystem failure, or restored copies on another machine.
Any further attempt requires a newly reviewed, accepted revision and a new
owner decision. The opaque goal stop conditions require operator interpretation.

A stale copy of an earlier accepted packet can still appear valid. Check the authoritative work and stop records before each dispatch.

The implementation adapts the prior queue's ordered admissions and provider
budgets and the prior goal dispatcher's explicit task selection. It uses
attended offers or accepted v5/v6 envelopes and an operator-managed queue rather than automatically
choosing a model, escalating model access or materializing further assignments.

## Optional transactional recording

New queues can opt into the [independent event outbox](outbox.md). Queue changes and
pending observations commit together; external delivery and its acknowledgement remain
separate from task authority, review, execution and Git persistence. Existing queues are
not migrated.
