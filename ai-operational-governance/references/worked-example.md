# Worked example: an AI assistant drafting customer messages

This is a hypothetical design review, not a deployed or validated control.

Suppose the organization supplies an applicable policy: the assistant may draft messages,
but a designated employee must approve each message before it is sent externally.

| Element | Proposed interpretation |
| --- | --- |
| Governance | Drafting is permitted; external sending requires designated human approval. |
| Program | A proposed service owner maintains the approval path, qualifications, and response arrangements; ownership still needs acceptance. |
| System | A sending gateway checks an approval bound to the exact message, recipient, and current policy version; the draft agent has no independent sending credential. |
| Process | The employee reviews the proposed message and recipient; the gateway records the approved content identifier, decision, sending result, and exceptions. |
| Feedforward | A policy, model, recipient scope, or tool-permission change triggers review before the changed configuration can send. |
| Feedback | The gateway rejects absent, stale, or mismatched approval before sending; anomalous attempts trigger an authorized response. |
| Degraded state | If approval cannot be checked, hold the message and notify the responsible operator through an authorized channel. Assess the cost of delay for this workflow. |
| Timing | Approval enforcement must precede the external side effect. Incident-response targets remain to be justified and assigned. |
| Evidence | Exercise missing, replayed, changed-content, changed-recipient, and unavailable-approval cases; check alternate sending paths. None is claimed tested here. |
| Effectiveness | Measure unauthorized sends per attempted send, blocked attempts, approval bypasses, false holds, and delay over a defined window; preserve coverage limitations. |

A sending log alone could reveal an unauthorized message after disclosure. The control
proposal addresses the authorization boundary before sending and retains the log for
verification and learning. It still needs implementation evidence, owner acceptance,
and review of whether human approval is effective for the actual content and workload.
