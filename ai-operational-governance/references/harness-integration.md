# QVCH bolt-on and UWH implementation sequence

## Current deliverable and adoption boundary

This is optional guidance carried by ai-operational-governance. It adds no watcher,
packet writer, runtime gate, automatic activation, or external skill dependency.
QVCH's source/evolution procedure and the selected runtime's supported contract remain
controlling. Preserve the last reviewed profile while a candidate adoption is pending.
A new skill pin must be reviewed at a checkpoint; never replace an active assignment's
accepted dependency set in place. Merge this guidance into a project profile only after
reviewing the target revision, existing overlay, source scope, and actual effects.

## First: QVCH profile and observable commitment

Use the existing 0x0 orientation, then select a primary purpose and at most two useful
companion lenses. These are classical task-purpose codes inspired by structured exchanges;
they are not MIL-STD-1553 mode commands or protocol-conformance claims.

| Task | Existing purpose | Optional use of this skill |
| --- | --- | --- |
| Design how a workflow stays within its obligations | 0x7 design | Trace promise, owner, operating limit, enforcement point and evidence. |
| Retain the history of an exchange | 0x5 record | Identify necessary records, privacy scope, gaps and retention responsibility. |
| Examine observed deviations | 0xC inspect | Compare observed events with the stated operating commitment. |
| Test whether a control keeps a promise | 0xB verify | Exercise boundaries, intervention timing, bypasses and degraded signals. |
| Coordinate response and review | 0xE coordinate | Preserve recipient choice, decision ownership, concerns and revisit action. |

Add the skill by exact source revision to the existing resolved skill list when useful,
not as a mandatory companion for every task. A record task does not automatically become
a control implementation task. Keep command words, dispatch mode, response status and any
BH posture code in their separate fields. Never infer consent, capability or authority
from any code, receipt, silence, or a completed record.

Use the existing task record to connect the selected skill to the commitment under review,
its owner and evidence. If the runtime cannot represent this connection, link an authorized
sidecar record; do not insert extra fields into a strict assignment or contract schema.

## Separate three cooperating roles

| Role | Responsibility | Limit |
| --- | --- | --- |
| Bus monitor / recorder | Observe supported events and preserve order, source and gaps. | Passive observation cannot stop an external side effect. |
| Ledger | Retain the authorized history and link acceptance, attempts, results and review. | Integrity and completeness need independent mechanisms; a JSON file or hash chain alone is not authenticated or tamper-proof. |
| Operational control | Check an applicable limit and perform an authorized hold, restriction or response at an actual enforcement point. | Must act soon enough for the consequence and verify the response; an alert alone is incomplete. |

One implementation may serve several roles, but label each claim separately. Reuse the
existing contract and invocation ledgers as authoritative for their supported facts. A
monitor projection is derived, read-only evidence, not a second source of contract state.
A replay may reconstruct a view; it must never invoke tools, accept work, resume, retry,
renew authority, or emit production control actions.

## Proposed event envelope, not a packet-schema extension

For a future adapter, review these minimum semantics before choosing storage:

- Schema and emitter identity/revision; event identifier and per-emitter sequence.
- Observed wall-clock time with clock uncertainty, plus monotonic elapsed time where
  response latency is measured; do not infer global ordering from wall clocks alone.
- Correlation to the existing task, accepted contract digest/revision, attempt and parent
  event where supported; distinguish absent from unknown and preserve cross-process gaps.
- Canonical purpose/command and dispatch mode as separate metadata; resolve their source.
- An event kind and observed transition, source evidence reference, and result or reason.
- The relevant commitment/control identifier and policy revision, when the source emits
  them; never reconstruct an acceptance or enforcement decision from a purpose code.
- Evidence quality: directly observed, operator-declared, derived, missing or unverified.
  Include loss/duplicate/reordering, stale observation and reconciliation status.

Candidate event names include profile resolved, offer recorded, recipient response,
attempt claimed, gate evaluated, execution started, result observed, review recorded,
and observation gap. These are descriptive names, not new numeric mode codes or claims
that every runtime currently emits them. Only map events the source actually exposes.
Bind event IDs to an idempotent projection; retain both genuine repeated attempts and
conflicting observations for reconciliation. Do not deduplicate by purpose or timestamp.

Keep secrets, raw prompts, private responses and personal posture out of general telemetry.
Use approved evidence references and access-controlled retention. Digests and correlations
can still reveal sensitive relationships; minimize them for the intended audience. Define
who owns storage, access, retention, deletion and recovery before persistence.

## Second: UWH adapter and enforcement proof

UWH is the better location for executable hooks because it already binds sources,
effects, contracts, attempt claims, execution windows and review. Its fixed package
manifest and digest must include any new distributed guidance, module, fixture or tests.
Register a new capability and effects honestly; do not mark a proposal as implemented,
automatically refresh a reviewed source pin, or dynamically import this external skill.
A packaged adaptation requires separate source review and any necessary license notice.

Start with a passive projection of documented transitions and reconcile it against the
existing authoritative state. In particular, the v4 invocation ledger is an attempt-reuse
control, not a complete flight recorder. Keep claims-before-provider behavior, consumed
failed attempts, and owner reconciliation intact. The v5 start window gates launch;
it does not establish a deadline for all effects. The queue's persisted decisions and
review gate must not be bypassed by a monitor or new event sink.

Then connect each material promise to the actual pre-effect gate and its evidence.
For example, a stale source pin holds profile resolution; an existing attempt claim
prevents reuse; expired admission prevents launch. Verify the current path rather than
assuming all adapters implement these gates. Post-read violation detection cannot undo
exposure. Stronger prevention needs a separately designed boundary before access.

Decide how recording failures affect each operation: a required pre-effect durable record
may need to hold admission; optional telemetry failure may instead expose a monitoring gap.
Do not universally stop or continue without considering both consequences. Recording a
post-effect failure must preserve the uncertain outcome for reconciliation; do not hide it
or automatically retry. An absent terminal event is unknown, not success or permission.

## Acceptance sequence and rollback

1. Review one synthetic obligation end to end using the QVCH guidance. Confirm code and
   source mappings, ownership, observation limits, and the point where action is controlled.
2. Specify the UWH capability, event contract, supported adapters, storage/failure policy,
   timing basis and privacy boundary against the exact target revision.
3. Implement and test the passive projection with synthetic fixtures: duplicate/lost events,
   restart, concurrent claims, missing terminal state, out-of-order observations and privacy.
   Replaying captured events must perform no external action or contract transition.
4. Test each supported control before its side effect: stale pin, changed accepted digest,
   expired start window, consumed attempt, ledger failure and review hold. Verify negative
   side-effect assertions, not just a reassuring event. Report unsupported paths explicitly.
5. Record owner acceptance of that revision and adopt at a new-task checkpoint. Keep the prior
   reviewed profile available. Disable an optional monitor at rollback without clearing
   authoritative contract/attempt records or weakening existing mandatory gates.

This order stabilizes meaning before runtime coupling. It also lets the operational-control
method remain usable without QVCH or UWH installed. Runtime implementation and installation
are subsequent work; no live harness is modified by this guide.

## Inspection provenance

QVCH owning repository inspected at commit `09672858ea5cbfd1dfa639e9487e0016b7f3acae`;
entrypoint SHA-256 `743078ff2b4a44f7307da1ff8c37b7771cac654ec77fe60a0ed6fc3871f482c5`. Its work-contract reference
maps a separate Hypervisor checkpoint and is not proof of the latest runtime behavior.
UWH inspected from its clean `codex/unified-neutral-harness` checkout at commit
`e8371b2e83f5da8c5762a8f6e8ba9e23e3170274`; entrypoint SHA-256
`45a8219cd8aef8db250e2427435f28b85b4237104b9d4baab29c6405328c64ba`. These are inspection identities, not release
approval, current deployment evidence, or automatic compatibility with a future revision.
