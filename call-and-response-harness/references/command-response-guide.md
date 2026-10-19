# Command–Response Interpretation Guide

This guide extends the response-posture harness with a **16 × 16 contextual interpretation matrix**: sixteen request-side operations crossed with sixteen optional response words. It is part of the same harness, not a new response state space. The request operations include `0x0 Orient` as a framing row and the fifteen task command words; Orient remains distinct from task dispatch. `MASK` is a separate optional record/view modifier described in [Multiparty Responsibility and Escalation](multiparty-responsibility-and-escalation.md); it is not a request operation, response word, or matrix state.

## Purpose

Each cell records a possible contextual reading of a command–response pairing in this form:

> **Possible meaning | What it does not imply | Follow-up, if needed**

Cells are interpretation notes, not allowed/invalid pairings, scores, deterministic protocol states, or evidence of consent, authorization, understanding, or completion. A marker is only a shorthand attached to the recipient's actual words. Context and the actual reply control interpretation. One reply may carry several markers, or none.

Use the matrix to examine what a pairing might mean and guard against over-reading it. Cells may share guidance, and the 256 combinations do not require 256 unique rules. When maintaining an enumerated coverage register, use these marks:

- **Not reviewed:** no cell-specific interpretation review has been completed. An empty cell does not mean “no special handling”; apply the compositional rule below unless a register records a specific review result.
- **Reviewed — no special handling:** the general marker definition is sufficient for this command; preserve the actual reply and ordinary exchange process.
- **Interpretation note:** record the contextual meaning, what it does not establish, and follow-up if needed.
- **Not applicable:** use only with a brief reason the pairing has no meaningful use in this harness.

Do not treat an empty or unreviewed cell as “no special handling.” Record the reviewer and review date in the coverage register when the matrix is maintained as a project artifact.

## Request-side operations

The command vocabulary supplied for this matrix is:

| Request-side operation |
|---|
| Orient (`0x0`, framing) |
| Build |
| Maintain |
| Diagnose |
| Investigate |
| Record |
| Communicate |
| Design |
| Represent |
| Prioritize |
| Teach |
| Verify |
| Inspect |
| Sustain |
| Coordinate |
| Envision |

Each task word identifies a broad requested activity, not sufficient task scope. `Orient` frames or repairs a call by establishing purpose, context, affected people, outcome, scope, and constraints; it does not dispatch task work. State the request, intended outcome, constraints, authority, and affected people in plain language. If the applicable request taxonomy assigns codes to the fifteen task words, use that defined mapping; this guide does not establish one.

### Operation-specific evidence anchors

For any command–response pairing, use the relevant anchor to identify what would count as progress or evidence. These anchors prevent a response marker from being mistaken for completion of the command.

| Command | Evidence or scope anchor |
|---|---|
| Orient (`0x0`) | Purpose, context, affected people, desired outcome, scope, and constraints are stated clearly enough for the recipient to interpret the call; this does not establish acceptance. |
| Build | The defined artifact or capability, its acceptance criteria, and whether it was produced. |
| Maintain | The named asset or service, its condition, the maintenance action, and the observation period. |
| Diagnose | The symptoms, hypotheses, supporting evidence, and whether a cause is confirmed or still tentative. |
| Investigate | The question, sources examined, findings, and unresolved questions. |
| Record | The information to capture, its source, the record location, and whether the record was actually made. |
| Communicate | The content, intended audience, channel, and whether the message was sent or received. |
| Design | The design artifact, constraints, alternatives, and required review or decision. |
| Represent | The subject represented, the chosen model or view, provenance, and fidelity or validation limits. |
| Prioritize | The options, criteria, ordering, rationale, and authority for setting that order. |
| Teach | The topic, audience, materials or activity, and evidence of learning; attendance alone is not comprehension. |
| Verify | The criterion, method or test, evidence, result, and any unresolved criteria. |
| Inspect | The object or condition, inspection criteria, observations, and any limits of the inspection. |
| Sustain | The service or capability, continuity measure, responsible owner, time period, and threshold for action. |
| Coordinate | The participants, dependencies, commitments, handoffs, and unresolved conflicts. |
| Envision | The options or future states, assumptions, affected parties, and who decides whether to act on them. |

For each of the 16 response words, combine its definition with the applicable operation anchor. For example, `Checked` reports a check; the `Verify` anchor asks which criterion and method were checked and with what evidence, while the `Build` anchor asks whether the artifact's acceptance criteria were checked. In both cases, a check report alone does not establish successful completion. Apply the same composition to all 256 pairings; add bespoke cell guidance only when context requires it.

## Response words

The supplied list had fourteen words. `Unclear` adds an explicit comprehension signal; `Declined` adds an explicit recipient disposition. Together they make sixteen optional response words. This count is for the coverage grid, not a claim that every exchange needs a marker.

| Response word | Possible signal; context still governs |
|---|---|
| Ready | Readiness concerning the request; not acceptance by itself. |
| Steady | A report that conditions or work remain stable; specify what and when. |
| Found | A finding or located item is reported; include the finding and source. |
| Curious | A question or request for more information; capture what is being asked. |
| Noted | Receipt is acknowledged; this alone does not establish understanding. |
| Heard | The message was attended to; this alone does not establish understanding or agreement. |
| Bounded | A limit is being stated; record its scope, duration, or condition. |
| Present | Availability or participation now; not a promise of future capacity. |
| Chosen | A decision is reported; state what was chosen and by whom. |
| Learning | Inquiry or learning is underway; state the focus and next checkpoint. |
| Checked | A check is reported; state what was checked, how, and with what result. |
| Clear | The recipient reports understanding; this is not acceptance. |
| Aligned | Shared understanding or alignment is claimed; state the agreed goal or scope. This is not consent or authorization. |
| Imagined | A possibility or proposal is offered; this is not a commitment to implement. |
| Unclear | The recipient reports that the call or its meaning is unclear; caller follow-up is due. |
| Declined | The recipient declines the request as scoped; record that disposition without treating it as an error or pressure to recover. |

These are optional, mixed-kind descriptors, not mutually exclusive states. They concern receipt, understanding, capacity, decision, work report, or proposal. Preserve the actual response and do not force a marker when it does not fit.

The recipient may choose a marker for their own response. If another person annotates the reply, preserve the recipient's words and label the marker as an observer's provisional interpretation; do not use it to infer private feelings, intent, or consent. For software or AI, annotate only observable output or configured behavior.

### Distinguish similar markers

Use the narrowest claim supported by the person's actual words:

- **Noted** records receipt. **Heard** records that the message was attended to. Neither establishes comprehension; use **Clear** only when the recipient indicates the request is understood.
- **Present** reports current availability or participation. **Ready** reports readiness for a stated next step. Neither is acceptance; acceptance must be explicit and scoped.
- **Clear** reports comprehension. **Aligned** reports a stated shared understanding of a named goal or scope. Neither establishes consent, authorization, or acceptance.
- **Curious** marks a question or request for information. **Unclear** marks that the call cannot yet be interpreted. A question can be clear and specific; do not label it Unclear unless the recipient says the request is not understood.
- **Steady** must name what remains stable and over what period; if that cannot be stated, preserve the original words without the marker.
- **Declined** records a recipient disposition, not a work-quality judgment. It does not invite persuasion or reassignment without a new call and a new recipient's disposition.

## Matrix examples

| Request operation ↓ / response → | Ready | Noted | Bounded | Found | Unclear | Declined |
|---|---|---|---|---|---|
| **Orient** | Readiness to review the framed call; not task acceptance. | Receipt of the framing; not evidence it is understood. | A limit on the context or scope the recipient can address; caller narrows or re-frames as needed. | A relevant fact or context is offered; record source and update the call if material. | Caller follows up and, if existing context is insufficient, re-orients and issues a linked revision. | Decline the request as framed; record disposition. Orient does not compel acceptance. |
| **Build** | May signal readiness concerning the build; not acceptance. Confirm acceptance, scope, authority, and capacity before starting. | Receipt only; no commitment to build. | A limit applies to the requested build; clarify the boundary and revise or defer the call as needed. | A finding or artifact is reported; record it, but do not infer the requested build is complete. | Caller clarifies the request; use `0x0 Orient` if purpose, outcome, affected people, scope, or constraints cannot be recovered from context. | Record the decline as scoped; do not reassign without a new call and a new recipient's disposition. |
| **Teach** | May signal readiness to discuss teaching; not acceptance to teach. Confirm the specific ask and scope. | Receipt only; no commitment or demonstrated understanding. | A limit applies to teaching; clarify audience, topic, time, or other boundary. | A teaching-related finding or resource is reported; record it and whether the teaching request remains open. | Caller follows up. If the call itself remains unclear, return to `0x0 Orient` and issue a linked revised call. | Record the decline; do not treat it as a learning failure or pressure the recipient to teach. |
| **Verify** | Readiness to consider verification; not evidence that verification occurred. Confirm scope and acceptance separately. | Receipt only; no verification performed is implied. | Verification scope or capacity is limited; record what is in and out. | A finding is reported; record evidence and distinguish it from a pass/fail conclusion. | Caller clarifies the verification target and criteria; re-orient only if the request context is insufficient. | Record the decline; route any unresolved assurance need to an authorized owner rather than treating refusal as a failed verification. |

These examples illustrate 24 of the 256 pairings (four operations by six response markers). The remaining pairings are covered compositionally by applying each operation's evidence anchor above to the shared response-marker definitions; they do not each need a unique paragraph. This is a complete coverage method, not 256 individually authored cell notes. If a project needs a fully enumerated matrix, use the coverage marks above and write a cell note only where the combination adds context-specific meaning or follow-up. Avoid presenting illustrative content as a universal rule.

## Follow-up and `0x0 Orient`

When a recipient reports confusion, set the exchange to `clarification-needed` and assign follow-up to the caller/request owner. First clarify from the existing request context. If that context cannot resolve the ambiguity, return to request-side `0x0 Orient` to restate purpose, context, affected people, desired outcome, scope, and constraints; then issue a revised call linked to the original. Orient repairs the call; it does not compel acceptance. If an agreed response target passes without a reply, record a no-response/timeout event and have the caller/request owner set a new checkpoint, defer the request, or withdraw it with a recorded disposition. Silence is not the `Declined` marker and does not establish consent, refusal, or understanding. Do not send repeated calls without a stated purpose and review point.

Mark the request clarified only when the recipient indicates it is understood. Understanding is not acceptance. The recipient may accept, defer, decline, remain unsure, or withdraw consent. Keep the exchange and its response posture separate, as described in the main skill and [monitor examples](monitor-and-raci-examples.md).
