---
name: call-and-response-harness
description: Soft command-and-control for task handoffs, replies, RACI ownership, and escalation. Preserves recipient choice; does not compel acceptance or guarantee safety.
---

# Gentle Boss

Gentle Boss is a **soft command-and-control protocol** for multiparty work: it structures calls, replies, ownership, and escalation while leaving each recipient's disposition theirs to choose. It does not turn a request into automatic obedience. The engineering 0xF modes classify and dispatch requested work with a task code and command word; the response-posture harness describes a recipient's optional posture and actual answer. Keep those namespaces separate: request-side operations and task commands; response posture `BH-0`–`BH-F`. For engineering task scheduling and the distinct queue, execution, and review states, use the companion `engineering-work-safety` framework.

The response matrix has four binary axes and sixteen possible complete states. “Four-bit” describes the code width; it is not a 16-bit error-correcting code. The 1553 bus analogy may help structure turns, acknowledgements, status, and quiet intervals, but this harness is not a bus protocol or standards-conformance claim.

## Use the harness

1. **Frame the call.** State the request in plain language, including scope, constraints, requester, intended recipient, and any request-side task code and command word. Check that the request is understood before interpreting a response.
2. **Record an initial posture only when useful.** For a human recipient, the recipient owns and selects their own description. A code is optional; null means undecided for an existing request. Preserve unknown axes as `?` and do not force a complete code.
3. **Allow contemplation and change.** The recipient may reflect, ask questions, gather context, or consult; this step is optional. The initial posture may stay the same or change. A transition describes this request episode, not a change in the person's character or performance.
4. **Record the answer separately.** Capture the response posture, if the recipient chooses one, and what they actually communicated or did: accept, clarify, proceed within scope, limit scope, pause, defer, decline, hand off, or another answer.
5. **Treat every answer as valid.** Refusal, silence, uncertainty, a boundary, a mixed answer, and an answer outside the matrix are valid responses. If the recipient signals confusion or a response appears inconsistent, first check for ambiguity, missing context, a changed or withdrawn consent, or recording error. Move the call episode to `clarification-needed` and assign follow-up to the caller/request owner (or a designated request owner). That owner must clarify the request's intent, scope, constraints, or authority and record a follow-up checkpoint; do not make the recipient responsible for guessing what was meant. If the existing request context is insufficient, fall back to request-side `0x0 Orient`: re-establish purpose, context, affected people, desired outcome, scope, and constraints, then issue a clarified call linked to the original call. `0x0 Orient` is framing, not a response code or a demand for acceptance. If confusion affects work already underway, pause consequential steps that depend on the unresolved meaning. Clarification does not require the recipient to accept, continue, or disclose more. They may remain unsure, decline, or withdraw consent. Do not turn a code into agreement, authorization, or obligation.
6. **Keep workflow status distinct.** The call episode, recipient disposition, task execution, review/closure, and bus turn are separate. Acknowledged, accepted, started, paused, blocked, completed, declined, and closed describe workflow state, not posture codes. See the companion `engineering-work-safety` framework when you need queue/admission, task execution, or review-state detail. `clarification-needed` remains open with an assigned follow-up owner until the caller follows up or explicitly withdraws or defers the request with a recorded disposition. Mark it `clarified` only when the recipient indicates the request is now understood; understanding is not acceptance. If confusion remains, keep the call episode `clarification-needed` and repeat caller-side follow-up or record an explicit disposition. If an agreed response target passes without a reply, record a no-response/timeout event and a caller-owned next checkpoint, deferral, or withdrawal; silence is neither acceptance nor decline. If affected work had started, resume it only after the recipient indicates understanding and chooses to continue. A quiet bus interval ends the current bus turn, not the call episode; it does not close a request with follow-up outstanding. Record the reason, responsible role, next action, and revisit condition when relevant.
7. **Stop when the vocabulary adds no value.** Leave the response uncoded or in the recipient's own words when the model does not fit.

Read [references/state-matrix.md](references/state-matrix.md) for the bit map, all sixteen combinations, and one-bit contrast examples. Read [references/command-response-guide.md](references/command-response-guide.md) for the 16 × 16 contextual interpretation guide. Read [references/multiparty-responsibility-and-escalation.md](references/multiparty-responsibility-and-escalation.md) for RACI details. Read [references/call-and-response-workflow-protocol.md](references/call-and-response-workflow-protocol.md) for the consolidated workflow and escalation path. Read [references/monitor-and-raci-examples.md](references/monitor-and-raci-examples.md) for worked monitor and responsibility examples.

## When work uses a contract runtime

Use the [skills and work contract interface](../docs/work-contract-interface.md)
for exact-assignment acceptance and the assigner → worker → human → worker
clarification loop. Preserve actual replies; keep optional BH posture outside a
packet that cannot represent it. Check the runtime's supported exits and routes.
If reoffering or transfer is unsupported, retain the concern and caller-owned
checkpoint rather than treating the worker's refusal as a protocol fault. The
runtime records the exchange; it does not create consent or authenticate a label.

## Axis definitions

| Bit | 0 | 1 | Meaning |
|---|---|---|---|
| 3 | Scream — Act | Stare — Contemplate | Current outward-action or reflective stance. Acting may mean communicating a pause or clarification. |
| 2 | Toward — Embrace/deepen complexity | Away — Recoil/create distance | Direction the response is inclined to move. |
| 1 | Void — Simplicity | Abyss — Complexity | Relative complexity of the request for this recipient, given the stated context, available information, expertise, and constraints. |
| 0 | Risk — Take a proportionate, bounded step | Caution — Take a pause | Whether to take the next consequential step within authority or hold pending a stated condition, information, or review. |

`BH-0` is valid: Act / Toward / Void (simple) / Risk. It does not mean neutral, empty, unknown, uninitialized, or request-side Orient. Null is outside the sixteen states. No request instance is not applicable. Partial vectors are incomplete records, not additional states.

## Safeguards and limits

- Never infer a human's feelings, motives, consent, or posture from observed behavior. Do not require disclosure of felt experience. If a person offers a self-report, keep it separate from the code and response action.
- For software or AI, describe observable input/output or configured policy state as an analyst's interpretation; do not attribute subjective feelings or human-like contemplation.
- Do not score people, diagnose them, rank codes, or use a code for employment or performance decisions. The sixteen combinations are categorical, not a scale.
- “Orthogonal” means the bits ask distinct design questions; it does not claim psychological or statistical independence.
- Risk does not mean permission or risk tolerance. It never overrides authority, safety, capacity, law, policy, or freely given consent where consent applies. A pause should have a reason and a revisit condition when feasible, not pressure to proceed.
- This is an aspirational reflection and communication aid, not a validated psychological instrument, scheduler, formal risk assessment, safety case, compliance method, or proof of psychological safety. It does not establish that a workplace or requested action is safe.
