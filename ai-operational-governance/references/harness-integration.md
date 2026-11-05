# Independent recording for QVCH and UWH

## Foundation, implementation and adoption

AI Operational Governance supplies the method: applicable obligation → observable promise →
owner → operating limit → effective control → evidence. An independent recorder can support
that evidence and learning; its existence alone does not establish operational regulation.
The method remains useful without a recorder, QVCH or UWH installed.

[PR #26](https://github.com/chrisjones77/skills/pull/26) establishes this guidance.
[PR #24](https://github.com/chrisjones77/skills/pull/24) supplies the UWH work-lifecycle
implementation under review. [Issue #27](https://github.com/chrisjones77/skills/issues/27)
tracks the independent recorder, shared event contract, Git adapter and read-only monitor.
It is follow-up scope, not an additional merge condition for #24. This document implements
none of those runtime components and does not activate or install a profile.

## Responsibilities and interfaces

Both harnesses mediate contacts between people, agents, tools and disciplines. Their
hypervisor analogy describes mediation; actual isolation depends on implemented mechanisms.

| Component | Owns | Interface boundary |
| --- | --- | --- |
| QVCH | Task orientation, purpose and method selection, guidance/source resolution. | Emits supported profile and boundary observations; mode selection grants no effects. |
| UWH | Reviewed intake, offers, responses, accepted work, execution coordination and review. | Emits supported lifecycle observations; authoritative contracts and attempt gates remain in UWH. |
| Independent recorder | Shared event contract, ingestion, provenance, correlation and visible gaps. | Accepts events from either producer; does not accept work or govern their state transitions. |
| Storage adapter | Persistence and readback under declared acknowledgement semantics. | Git first; another backend can preserve the interface later. |
| Bus monitor | Read-only merged views, exchange details and replay. | Presents evidence and uncertainty; cannot execute or advance work. |
| Operational control | Applicable decision and intervention at an actual enforcement point. | Acts under existing authority soon enough for the consequence, with effectiveness checked. |

One initial module may sit beside UWH and remain in one installable package. Its format,
responsibility and producer interface must remain independent of either harness. Reuse
existing authoritative task, contract and invocation records; a recording of their events
is a distinct evidence record, not a competing source of contract state. Do not insert
unsupported fields into a strict runtime packet.

## QVCH purpose vocabulary

Use existing 0x0 orientation before selecting a primary work purpose and at most two useful
companion lenses. These classical task codes are not MIL-STD-1553 mode commands or a
standards-conformance claim.

| Task | Existing purpose | Contribution of this skill |
| --- | --- | --- |
| Design governed operation | 0x7 design | Trace promise, owner, limit, enforcement point and evidence. |
| Preserve an exchange | 0x5 record | Determine necessary evidence, provenance, privacy and gaps. |
| Examine a deviation | 0xC inspect | Compare observed behavior with the stated commitment. |
| Test a control | 0xB verify | Exercise timing, boundaries, bypasses and degraded operation. |
| Coordinate response | 0xE coordinate | Preserve recipient choice, ownership, concerns and revisit action. |

Resolve this skill by exact source revision when it helps the task. Purpose/command,
dispatch mode, event kind, lifecycle state, persistence state and any BH posture are
separate concepts. No code, receipt or silence establishes consent or authority.

## Shared event contract: proposed semantics

Specify the interface before implementing adapters. Carry only facts the producer can
observe or explicitly attribute as declarations:

- Schema version, stable event ID, producer identity/revision and per-producer sequence.
- Observation time with uncertainty; monotonic elapsed time where latency is evaluated.
  Wall clocks and merged display order do not establish global causal order.
- Task/work ID, accepted assignment digest/revision, attempt and parent correlation where
  supported. Distinguish unknown from absent and preserve cross-process gaps.
- Canonical purpose/command separately from dispatch mode and observed lifecycle event.
- Evidence reference/digest, bounded outcome or reason code, and execution phase.
- Relevant obligation, commitment, control or policy identity where the source provides it.
- Direct observation, operator declaration, derivation or missing/unverified evidence.

Initial QVCH events can describe orientation, purpose selection, resolved sources and profile
review. Initial UWH events can describe offers, recipient responses, reservation, attempt
claim, execution start/outcome, results, review, stop and reconciliation. Reservation, claim
and start are different checkpoints. A recorder must not manufacture human acceptance or
infer an enforcement decision from a purpose code. A missing terminal event is unknown.

Identical repeated delivery is idempotent. Reuse of an event ID with different content is a
conflict. Preserve genuine repeated attempts; never deduplicate by purpose or timestamp.
Corrections are linked events. A gap in one producer's sequence differs from interleaved
observations from another producer.

## Git-first adapter and delivery boundary

For the first working demonstration, use an explicitly selected authorized ledger location,
one event file per stable event ID, and one writer committing batches at useful checkpoints.
Keep the format portable so an object-store or document-database adapter can be added when
actual read/write needs justify it. A separate hosted service is unnecessary initially.

Define exactly what an acknowledgement promises. Show observed, saved locally, committed
and pushed separately; do not label a local save as a commit or a local commit as remote
persistence. Define the intended durability of local saves. Git hashes establish byte
identity, not completeness, authenticated authorship or immunity to rewritten history.

A Git commit cannot atomically include a separate UWH SQLite transition. Where delivery
must survive interruptions, use a small transactional outbox or a documented reconciliation
mechanism. Record transition/event linkage at the source boundary, preserve pending delivery,
and exercise crash points. Do not claim loss-free or exactly-once delivery from Git alone.
The recorder acknowledgement is separate from a source task's lifecycle acknowledgement.

Preserve bounded failure codes and phases across worker boundaries; keep sensitive detail
in authorized private evidence. Define behavior when recording fails for each supported
operation: required pre-effect evidence may hold admission; optional telemetry may expose
a gap. Assess both consequences. Post-effect uncertainty must remain visible without an
automatic retry. Preserve authoritative attempt claims and recovery protections.

Keep secrets, raw prompts, private responses and unnecessary personal posture out of the
shared ledger. Minimize correlations and evidence references as well; they can be sensitive.
Assign ownership of access, retention, deletion, recovery and the ledger writer before use.

## First monitor and acceptance sequence

The concept is a passive 1553-inspired bus monitor: producer lanes feed an independent
recorder; the Git adapter stores events. A merged ledger shows producer, purpose, event and
recorded persistence state. A selected-exchange inspector shows task/assignment correlation,
evidence and pending decisions. A timeline exposes observation gaps; a persistence strip
shows local save, commit and push. Make detailed text accessible at phone and desktop widths.

1. Inspect the current #24 head and the actual QVCH source; resolve compatibility and effects.
2. Define the shared event contract, ownership, acknowledgement and failure semantics.
3. Build the independent recorder and Git adapter with synthetic producers.
4. Add thin producer adapters and record one existing synthetic UWH lifecycle through
   purpose selection, offer, acceptance, execution, result and separate human review.
5. Render and inspect the read-only monitor. Exercise duplicate/conflicting/out-of-order
   delivery, missing observations, recording failure, restart and reconciliation.

Replay reconstructs views only: it must never invoke tools, offer or accept work, resume,
retry, renew authority, emit control actions or advance contract state. Tests must assert
the absence of those side effects. Keep source/attempt records intact at rollback; an
optional monitor can be disabled without weakening a mandatory control.

The acceptance question is: can a reader open one recording and understand what was
requested, accepted, attempted, returned and reviewed, including what remains unknown?
Keep synthetic validation, human acceptance, adoption and release distinct. No new database,
scheduler, provider expansion or harness rewrite is needed for this first increment.

## Reviewed feedback into both harnesses

QVCH frames work; UWH exercises agreements and execution; the recorder preserves observations;
review can improve all three. This is reciprocal feedback, not automatic propagation.
Record the affected source revision, evidence, recommendation, decision owner, compatibility
impact and rollback reference. Adopt accepted changes at a task checkpoint; preserve the
last reviewed profile and never silently rewrite an active accepted dependency set.

Use the demonstration to evaluate clearer UWH entry paths, moving legacy detail out of the
main route, extracting small shared admission validators, and separating scheduling,
execution, recording and presentation where a demonstrated need justifies it. Preserve
necessary pre-effect rechecks. Record recommendations rather than cascade target edits.

For later operational-assurance views, connect each promise to an actual control and its
bounded evidence. A source pin hold, consumed-attempt gate or start-window check must be
verified on the supported path; a recorded gate event does not prove the gate was effective.
Post-read violation detection cannot undo disclosure. Stronger prevention needs its own
pre-access boundary, authority, design and evidence.

## Inspection provenance and currentness

The QVCH source was inspected in its owning repository at
`09672858ea5cbfd1dfa639e9487e0016b7f3acae`; entrypoint SHA-256
`743078ff2b4a44f7307da1ff8c37b7771cac654ec77fe60a0ed6fc3871f482c5`.
Its work-contract reference describes a separate Hypervisor checkpoint.
UWH was subsequently reviewed at PR #24 head
`a308a8930614272b49b249ae821cdc9c2f1405a6`, superseding the earlier local
`e8371b2` inspection for this integration discussion. The review examined the package,
queue and worker boundaries and ran 18 offline tests; hosted checks were observed green
at that head. No new execution-boundary failure was reproduced in that bounded review.

These are historical inspection identities, not deployment evidence or proof of current
compatibility. Recheck actual source and supported interfaces before implementing #27.
The independent recorder design is a project elaboration, not a design attributed to Laqua.
