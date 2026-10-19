# Command–Response Interpretation Guide

This guide extends the response-posture harness with a **15 × 15 contextual interpretation matrix**: each request-side command word crossed with each optional response word. It is part of the same harness, not a new response state space. Request-side `0x0 Orient` remains outside the matrix because it frames or repairs the call; it is not a dispatched command or a recipient response.

## Purpose

Each cell records a possible contextual reading of a command–response pairing in this form:

> **Possible meaning | What it does not imply | Follow-up, if needed**

Cells are interpretation notes, not allowed/invalid pairings, scores, deterministic protocol states, or evidence of consent, authorization, understanding, or completion. A marker is only a shorthand attached to the recipient's actual words. Context and the actual reply control interpretation. One reply may carry several markers, or none.

Use the matrix to examine what a pairing might mean and guard against over-reading it. If no useful contextual interpretation is available, leave the cell unfilled or mark it not applicable; do not invent certainty. Cells may share guidance, and the 225 combinations do not require 225 unique rules.

## Command words

The command vocabulary supplied for this matrix is:

| Command word |
|---|
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

Each word identifies a broad requested activity, not sufficient task scope. State the request, intended outcome, constraints, authority, and affected people in plain language. If the applicable request taxonomy assigns codes to these words, use that defined mapping; this guide does not establish one.

## Response words

The supplied list had fourteen words. `Unclear` is added as the fifteenth because it names an explicit comprehension problem and connects to caller-owned clarification.

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

These are optional, mixed-kind descriptors, not mutually exclusive states. They concern receipt, understanding, capacity, decision, work report, or proposal. Preserve the actual response and do not force a marker when it does not fit.

## Matrix examples

| Command ↓ / response → | Ready | Noted | Bounded | Found | Unclear |
|---|---|---|---|---|---|
| **Build** | May signal readiness concerning the build; not acceptance. Confirm acceptance, scope, authority, and capacity before starting. | Receipt only; no commitment to build. | A limit applies to the requested build; clarify the boundary and revise or defer the call as needed. | A finding or artifact is reported; record it, but do not infer the requested build is complete. | Caller clarifies the request; use `0x0 Orient` if purpose, outcome, affected people, scope, or constraints cannot be recovered from context. |
| **Teach** | May signal readiness to discuss teaching; not acceptance to teach. Confirm the specific ask and scope. | Receipt only; no commitment or demonstrated understanding. | A limit applies to teaching; clarify audience, topic, time, or other boundary. | A teaching-related finding or resource is reported; record it and whether the teaching request remains open. | Caller follows up. If the call itself remains unclear, return to `0x0 Orient` and issue a linked revised call. |
| **Verify** | Readiness to consider verification; not evidence that verification occurred. Confirm scope and acceptance separately. | Receipt only; no verification performed is implied. | Verification scope or capacity is limited; record what is in and out. | A finding is reported; record evidence and distinguish it from a pass/fail conclusion. | Caller clarifies the verification target and criteria; re-orient only if the request context is insufficient. |

These examples illustrate a few cells, not a complete filled matrix or canonical meanings. A full matrix may be authored incrementally using the same three-part cell form. Avoid presenting illustrative content as a universal rule.

## Follow-up and `0x0 Orient`

When a recipient reports confusion, set the exchange to `clarification-needed` and assign follow-up to the caller/request owner. First clarify from the existing request context. If that context cannot resolve the ambiguity, return to request-side `0x0 Orient` to restate purpose, context, affected people, desired outcome, scope, and constraints; then issue a revised call linked to the original. Orient repairs the call; it does not compel acceptance.

Mark the request clarified only when the recipient indicates it is understood. Understanding is not acceptance. The recipient may accept, defer, decline, remain unsure, or withdraw consent. Keep the exchange and its response posture separate, as described in the main skill and [monitor examples](monitor-and-raci-examples.md).
