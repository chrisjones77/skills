# Gentle Boss — Call-and-Response Workflow Protocol

## Purpose and status

This note consolidates Gentle Boss into a lightweight, multiparty workflow protocol. It is an aspirational design aid inspired by explicit request/response turns and real-time systems practice. It is not MIL-STD-1553, an executable scheduler, a safety case, a security mechanism, or a formal guarantee of consent, fairness, or safety.

The protocol makes a request interpretable, preserves the recipient's answer, assigns workflow ownership, and gives unresolved issues a named recovery and escalation route. Use only the parts that help; routine exchanges should not need extra fields unless a boundary, ambiguity, or risk calls for them.

## Protocol elements

1. **Request operation and context.** Use request-side `0x0 Orient` to frame or repair a call. The fifteen task command words describe requested activities. Give the plain-language purpose, outcome, scope, constraints, authority, affected people, intended recipient, and any relevant deadline. The command-word/code mapping must come from the applicable taxonomy; this note does not invent it.
2. **Recipient reply.** Preserve the recipient's actual words. Optional response markers support interpretation; they do not replace the reply or determine consent. The 16 × 16 coverage model pairs 16 request-side operations (Orient plus 15 task words) with 16 optional response markers. The guide composes each operation's evidence anchor with each marker's shared meaning; it does not define 256 mandatory outcomes.
3. **Disposition and work authority.** Record whether the recipient accepts, clarifies, defers, declines, withdraws, or hands off. Separately confirm authority to proceed and an accepted work owner. Receipt, `Clear`, `Aligned`, `Ready`, or any behavior-posture code alone is not acceptance or authorization.
4. **Workflow ownership.** Use activity-level RACI for who performs an activity, who is accountable and authorized, who is consulted, and who is informed. RACI does not assign a person's consent or compel a recipient to take work.
5. **Scoped view control.** `MASK` is an optional record/view modifier for audience-specific masking. Baseline privacy and need-to-know rules always apply. `MASK` does not enforce access control; implementation controls must. It is distinct from permanent redaction.
6. **Call episode and bus-turn record.** Keep recipient disposition, intake decision, task execution, review/closure, response marker, actual reply, RACI, escalation, and mask instructions distinct. Link events with a stable call/work ID and give each serialized bus turn its own turn ID. A no-response/timeout is an event, not acceptance, decline, understanding, or authorization.

## Interface with engineering-work-safety

Gentle Boss records the recipient's words, optional self-selected posture, consent/disposition, and caller-owned clarification or escalation. The companion `engineering-work-safety` framework adds scheduling and task execution detail for engineering work. Use separate fields for:

- **Recipient disposition:** acknowledged, accepted, clarification-needed, deferred, declined, withdrawn, handed-off, or no-response/timeout.
- **Intake decision:** queued, admitted, deferred, rejected, or cancelled by the authorized request owner/dispatcher. `Rejected` is not a label for a recipient's decline.
- **Task execution:** not-started, started, paused/interrupted, blocked, failed, completed, or cancelled.
- **Review/closure:** pending, accepted, rework/reopen, unresolved, or closed.
- **Bus turn:** one serialized call or status transmission, which can return to quiescence while the larger call episode remains open.

These are linked event dimensions, not one required linear sequence. Understanding is not acceptance; receipt is not authorization; completion is not review acceptance; quiescence is not closure. A decline, withdrawal, ambiguity, or timeout remains a valid disposition to be handled by the request owner without pressuring the recipient.

## Basic call episode

For a machine-recorded exchange, apply the [work contract interface](work-contract-interface.md). The runtime supplies only its demonstrated subset of this protocol. Resolve versions and capabilities before mapping replies or transferring state; retain the actual reply and any unrepresented fields in the authorized source record. A silent timeout remains caller-owned follow-up even if the runtime stores it alongside dispositions.

```text
orient/frame → issue call → receive reply → clarify if needed → record disposition
              → confirm authority and work owner → perform accepted work
              → report result → close or hand off
```

A call episode may contain multiple serialized bus turns and may remain open while follow-up is pending. Not every episode follows every step. A recipient may decline or defer; record that disposition without treating it as a failure to recover. If the request changes materially, issue a revised call linked to the original and obtain a fresh disposition. If a request is declined, reassignment requires a new call to a new recipient.

When the recipient says the call is unclear, the exchange enters `clarification-needed`; the caller/request owner owns follow-up. Clarify from existing context first. If that is insufficient, return to `0x0 Orient`, restate purpose, context, affected people, outcome, scope, and constraints, then issue a linked revised call. Mark the request clarified only when the recipient indicates understanding; understanding is not acceptance. If an agreed response target passes without a reply, record a timeout and a caller-owned next checkpoint, deferral, or withdrawal. Silence is not consent or decline.

## Escalation path

Escalation is a defined handoff for a decision or support that the current call owner cannot provide. It does not increase the recipient's obligation to accept, and it must not be used to overturn a decline or bypass a safety, consent, privacy, or authority boundary.

### Who may raise an escalation

The caller, recipient, work owner, consulted specialist, or affected party may raise a concern. RACI roles help route and resolve it; they do not restrict access to applicable safety, privacy, or protective channels. A recipient may raise an issue without first persuading the caller that it qualifies.

### Escalation record

Record the minimum information needed to act:

`call/work ID | trigger and impact | affected work/decision | receiving role and channel | action or decision requested | authority boundary | interim protection | checkpoint owner and response target`

Use `MASK` for audience-specific views where appropriate. Preserve provenance and share sensitive detail only with roles that need it. If a decision-maker needs masked information to decide safely, use an authorized protected channel. If that is not available, record the information gap and hold the affected decision or consequential work.

### Routing and resolution

1. **Name the trigger.** Examples: unresolved meaning after caller follow-up; dependency blocked past its checkpoint; unavailable or conflicted accountable owner; authority disagreement; material capacity change; or a safety, consent, privacy, or authority concern.
2. **Route to an authorized role.** Name the receiving role and channel, and state the decision or support requested. The recipient must have authority over that issue. If that owner is unavailable or conflicted, use the named alternate or governance route. If no authorized route is available, keep the affected work blocked and record who owns finding a route; do not default to approval.
3. **Set interim protection and a checkpoint.** Identify who monitors the issue, when it will be revisited, and what work must pause or can continue safely. If no response target can be agreed, record that fact and an interim owner/condition. Urgent protective action follows the applicable process immediately; it does not wait for a serialized bus turn or routine checkpoint.
4. **Record the disposition.** The authorized decision owner records the action, rationale, evidence considered, scope of authority, dissent or limitations, owner for implementation, and next checkpoint. Inform affected parties on a need-to-know basis.
5. **Handle a missed target.** The checkpoint owner records timeout and uses the alternate route, sets a new checkpoint, or records deferral/withdrawal as authorized. Silence is not approval, recipient decline, or resolution. Do not repeatedly reissue the same call without a stated purpose and review point.
6. **Close the escalation explicitly.** Close when the decision/action owner, interim condition, and next step are recorded and affected workflow owners have the disposition. Closing the escalation does not itself mean the original task is accepted, authorized, or complete.

If authorities disagree, keep the affected decision blocked, preserve a safe interim state, and route the disagreement to the named governance authority. Seniority alone does not resolve authority or create consent.

## Minimal escalation example

```text
Trigger: dependency owner and read-only boundary remain unclear after follow-up
Receiving role: request sponsor via the named review channel
Decision requested: identify dependency owner and confirm read-only scope, or defer/withdraw review
Authority boundary: sponsor may clarify the request; cannot require reviewer acceptance
Interim protection: no dependency changes; read-only review remains paused
Checkpoint: request owner checks at the agreed time; if sponsor unavailable, use named alternate
Disposition: record decision, revised call, or deferral; reviewer then chooses whether to continue
```

The escalation route seeks a decision on the request or a safe interim disposition. It does not convert uncertainty into agreement or make refusal a defect.
