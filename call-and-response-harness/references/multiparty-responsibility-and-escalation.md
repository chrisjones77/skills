# Multiparty Responsibility and Escalation

This overlay answers **who owns each workflow activity, decision, and handoff** when a call involves several people or roles. It complements the command–response interpretation guide; it does not change a response marker, assign a posture, or determine what a person consents to do.

## Use RACI for activities and decisions

Apply RACI to named activities or decisions, not to people in the abstract:

- **R — Responsible:** performs or coordinates the activity. There may be more than one R.
- **A — Accountable:** owns the outcome or decision and has the authority to do so. Name exactly one A per activity or decision. If two distinct authorities are needed, split the work into separate rows. If no authorized A can be identified, mark the activity blocked and route it to the designated governance or supervisory authority; do not proceed by default.
- **C — Consulted:** provides input before the action or decision.
- **I — Informed:** receives an update or disposition.

Name roles and the actual person or channel filling each role for the exchange. Confirm assignments with the people who hold them; a RACI table does not grant authority. Do not make the recipient responsible for repairing an unclear call. The caller/request owner owns clarification and, if needed, re-orientation. Record an alternate route for an unavailable or conflicted A. Anyone may raise a concern through the relevant protective process; the RACI does not restrict access to escalation.

## Separate three decisions

Do not collapse these into a single “accept” or approval:

1. **Recipient disposition:** the recipient may accept, clarify, defer, decline, or withdraw. This is their answer; RACI cannot compel or delegate it.
2. **Authority to proceed:** the authorized decision owner confirms that the requested action is permitted and within delegated authority.
3. **Work assignment:** a named work owner accepts the defined scope and capacity. This can be the recipient or another person, but reassignment requires a new call and that person's own disposition.

Start consequential work only when the necessary recipient disposition, authority, and work ownership are all explicit. Receipt, understanding, `Aligned`, `Ready`, or a posture code alone establishes none of these.

## Activity-level RACI template

| Activity or decision | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Frame and issue a sufficiently scoped call | Caller/request owner | Request sponsor or owner with authority over the request | Affected parties and subject-matter owners, as needed | Intended recipient |
| Clarify the call or return to `0x0 Orient` | Caller/request owner | Request sponsor or owner | Recipient; relevant subject-matter owner | Parties whose work or decisions are affected |
| Decide whether the proposed work is authorized | Relevant analyst or delegated approver, as applicable | Decision owner with that authority | Recipient, work owner, and affected parties, as appropriate | Requester and affected parties, as appropriate |
| Accept and perform a defined work assignment | Named work owner, only after accepting | Delivery owner accountable for the work | Subject-matter experts and affected parties, as appropriate | Requester |
| Resolve a blocker or make an escalation decision | Named blocker owner supplies facts and coordinates follow-up | Escalation/decision owner authorized to resolve the specific issue | People with relevant evidence or impact | Parties who need the disposition |
| Record disposition and close or hand off the exchange | Caller/request owner | Request sponsor or owner | Recipient and work owner | Parties who need the outcome |

This is a template, not a default assignment of authority. Remove roles that do not apply; add rows where decision rights differ. The person accountable for the request is not automatically authorized to accept risk, approve work, or override a recipient's decline. If required authorities disagree, keep the affected decision blocked, preserve a safe interim state, and route the disagreement to the designated governance authority. Do not treat silence, elapsed time, or the most senior participant's preference as approval.

## Define escalation routes

An escalation route is a specific handoff, not a generic instruction to “escalate.” Record:

`trigger → receiving role and channel → decision/action requested → authority boundary → checkpoint owner and response target → interim protection`

Examples of triggers include an unresolved scope question after caller follow-up, a blocked dependency past its agreed checkpoint, a material capacity change, or a safety/consent/authority concern. Route each trigger to a role that can act on it. Name who sets and monitors the checkpoint. If no response target can be agreed, state that explicitly, identify the interim owner and protective condition, and keep consequential work blocked where the unresolved issue affects it. A person may raise a concern through an applicable protective channel even if they are not R or A in the delivery RACI.

Escalation seeks a decision or support; it does not increase the recipient's obligation to accept. Do not use a delivery escalation to bypass a decline, withdrawal, safety process, or authority limit. If the recipient declines or withdraws, record that disposition. Any reassignment is a new call to a new recipient, with the scope and authority checked again.

## Interaction with unclear replies

When the response is `Unclear` or otherwise signals confusion:

1. Set the exchange to `clarification-needed` and assign follow-up to the caller/request owner.
2. Use available context to clarify. If it is insufficient, the caller returns to request-side `0x0 Orient`, restates purpose, context, affected people, outcome, scope, and constraints, then issues a revised call linked to the original.
3. Keep the exchange open until the recipient indicates the revised call is understood or the request is explicitly deferred, withdrawn, or declined.
4. Understanding does not equal acceptance. If work had started, pause consequential steps affected by unresolved meaning and resume only if the recipient chooses to continue and the authority/work-owner conditions are met.

Keep the RACI assignment, actual reply, response posture, exchange status, and escalation record distinct. Link them by one exchange identifier, while sharing only the information each role needs for its assigned activity. Protect sensitive personal or task details; consultation and being informed do not imply unrestricted access.
