# Natural interruption evidence protocol

Issue: [#200]. Status: proposed evidence protocol; no rehearsal or interruption observed by writing it. Use the existing private task packet for populated evidence, never this shared document.

## Purpose and established baseline

Merged #218 defines visible/heuristic/unknown capacity signals, bounded checkpoints and successor state verification (`docs/agent-hypervisor.md`). The issue records a deliberately initiated read-only successor reconstruction; that supports checkpoint usability and stale-state detection only. It does not prove advance warning, actual abrupt-stop recovery, write transfer or root cause.

Observe the next naturally occurring interruption or warning during authorized work. Do not exhaust tokens/quota, buy credits, launch paid work, alter runtime settings or force a shutdown to generate evidence. A separately requested exercise needs its own scope. Primary lens: 0x3 diagnose; companions 0xD continuity and 0xB evidence.

## Minimal private evidence record

| Field | Record rule |
|---|---|
| `event_id`, `task_reference` | Stable reference to this occurrence and existing authorized task |
| `signal_class` | `visible`, `heuristic`, `unknown`; exact non-secret signal text or durable pointer |
| `warning_observed_at` | Actual observed timestamp, otherwise unknown; do not backfill estimated time as measured |
| `checkpoint_at`, `checkpoint_ref` | Timestamp and existing private packet reference/digest |
| `last_verified_action` | Completed action and evidence; keep uncertain actions separate |
| `uncertain_action` | Requested/started/acknowledged/observed state and relevant operation/reference |
| `stop_observed_at` | Actual interruption evidence/time if available, otherwise unknown |
| `recovery_started_at` | Successor's actual first recovery observation |
| `state_verification` | Actual repository/revision/status and relevant external readbacks; record discrepancies rather than overwrite them |
| `ownership` | Prior writer, paused/unknown status, pending acknowledgement and state verification; obey existing transfer rules |
| `resume_action` | Concrete next action permitted by current authority; label still-blocked actions |
| `review` | Reviewer, review time, evidence limits, operator feedback and follow-up owner |

Store minimum necessary evidence in an already approved private task-local destination. No secrets, raw credentials, unrelated transcripts or personal records. If storage durability is uncertain, record that limitation rather than describe the checkpoint as durable.

## Observation procedure

1. On an actual visible warning, stop admitting new scope. Finish only an already-started atomic step safe within known authority/capacity; preserve the checkpoint and uncertain state. With no warning, use existing event-driven checkpoints and make no promise of advance notice.
2. If interrupted, successor begins read-only. Compare the last checkpoint with actual workspace and relevant authoritative external state. No blind retries, resets or branch switching. Mark unknown cause and unobserved intervals explicitly.
3. Resolve writer ownership under the existing acknowledgement and verification procedure before any write. A read-only recovery does not count as an exercised write transfer.
4. Record the first usable authorized next action and whether recovery required guessing, duplicate work, or operator reconstruction. Ask for brief feedback only when appropriate; absence of feedback is unknown, not satisfaction.
5. Reviewer assesses the narrow claims below and records pass/fail/inconclusive with evidence. Update the issue using a sanitized summary, excluding private workspace/crew identifiers. Do not close root-cause analysis on symptom alone.

## Claim-specific evaluation

| Claim | Evidence needed | Inconclusive / failure |
|---|---|---|
| Advance warning was usable in this event | Actual warning, checkpoint and stop observations demonstrate checkpoint preceded interruption and captured relevant state | Missing timing/signal is inconclusive; checkpoint after stop cannot pass |
| Checkpoint supported recovery | Successor independently verifies state and names a permitted next action without reconstructing missing critical facts by guess | Necessary state absent or wrong is a gap even if eventual recovery succeeds |
| Uncertain mutation handled safely | Readback reconciles state before retry; no duplicate unauthorized effect | Missing readback or retry from stale note fails this claim |
| Ownership transfer worked | Sender pause or resolved takeover, receiver acknowledgement and workspace verification precede writer activation | Read-only exercise alone cannot establish this |
| Operator burden was acceptable | Attributed brief feedback and observable checkpoint frequency | No feedback is unknown; frequent redundant checkpoints suggest procedure adjustment |
| Cause established | Specific runtime/tool evidence causally supports the classification | Abrupt stop or a low-budget estimate alone leaves cause unknown |

No single occurrence proves universal warning or recovery reliability. Review both successful and failed cases. Keep a follow-up owner, interim checkpoint protection, next action and revisit point for any material gap. The next natural event is the default revisit; no recurring automation is created by this protocol.
