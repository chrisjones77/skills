# Monitor and RACI Examples

The following examples are fictional and use a **1553-inspired** turn-taking analogy only. They are not MIL-STD-1553 captures, protocol definitions, or claims of standards conformance. Use request-side codes only when a known task taxonomy supplies them; never invent mappings. Response-side `BH-*` posture codes are separate from exchange status.

## Compact monitor log

```text
TIME    DIR   TERMINAL  TYPE       DATA
00.000  ---   BUS       QUIET      No active exchange
00.100  BC→RT RT-01     CALL       0x4 / investigate: inspect proposed API change
00.108  RT→BC RT-01     ACK        Received; reviewing stated scope
00.130  ---   RT-01     POSTURE    Initial BH-8: contemplate / toward / simple / risk
00.240  RT→BC RT-01     RESPONSE   Dependency owner and review boundary are unclear
00.245  ---   RT-01     STATUS     clarification-needed; follow-up owner=BC; exchange open
00.650  ---   BC        ORIENT     0x0: restate purpose, affected people, outcome, scope, constraints
00.670  BC→RT RT-01     CALL       0x4 / investigate: read-only API and dependency review
00.678  RT→BC RT-01     ACK        Revised call received
00.688  RT→BC RT-01     RESPONSE   Revised request is understood
00.690  ---   RT-01     STATUS     clarified → reconsidered
00.700  RT→BC RT-01     RESPONSE   Accept bounded review; report assumptions
00.710  ---   RT-01     STATUS     accepted → started
00.850  RT→BC RT-01     RESPONSE   Review complete; dependency and assumptions recorded
00.855  ---   RT-01     STATUS     completed → closed
00.860  ---   BUS       QUIET      Exchange closed after follow-up

01.000  ---   BUS       QUIET      No active exchange
01.120  BC→RT RT-02     CALL       0x7 / design: reduce deployment steps
01.128  RT→BC RT-02     ACK        Received
01.150  ---   RT-02     POSTURE    Initial BH-F: contemplate / away / complex / pause
01.300  RT→BC RT-02     RESPONSE   Clarify: simplify operator steps or remove safeguards?
01.305  ---   RT-02     STATUS     clarification-needed
01.500  BC→RT RT-02     FOLLOWUP   CLARIFY: retain safeguards; simplify operator steps
01.520  RT→BC RT-02     RESPONSE   Clarification understood; safeguards remain in scope
01.530  ---   RT-02     STATUS     clarified → reconsidered
01.540  ---   RT-02     POSTURE    Reassessed BH-E: contemplate / away / complex / risk
01.700  RT→BC RT-02     RESPONSE   Accept bounded change; retain rollback and verification
01.710  ---   RT-02     STATUS     accepted → started
02.105  ---   RT-02     RESPONSE   Change complete; rollback and verification evidence recorded
02.110  ---   RT-02     STATUS     completed → closed
02.115  ---   BUS       QUIET      Exchange closed

03.000  ---   BUS       QUIET      No active exchange
03.140  BC→RT RT-03     CALL       0x1 / build: add requested telemetry
03.148  RT→BC RT-03     ACK        Received
03.170  ---   RT-03     POSTURE    Initial null: undecided
03.400  RT→BC RT-03     RESPONSE   Decline as scoped; capacity is unavailable
03.405  ---   RT-03     STATUS     declined → closed
03.410  ---   BUS       QUIET      Decline recorded as a valid response
```

`BC`, `RT`, and timestamps are analogy labels for a monitor view, not protocol fields specified by this harness. Acknowledgement records receipt only; it does not imply acceptance. A pause, decline, or uncoded response remains valid. Quiet intervals represent a useful handoff point, not a requirement to serialize all work.

## RACI view of the same interactions

RACI attaches to **activities and decisions**, not posture codes or people's willingness. Assign actual roles for a real workflow; this generic example does not confer authority.

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| RT-01 clarify or re-orient the call | Caller/request owner | Request sponsor accountable for the request | Recipient and dependency owner, as useful | Affected review team |
| RT-01 conduct the bounded review | Named reviewer | Review lead authorized for the review outcome | Dependency owner; affected team, as useful | Requester |
| RT-02 approve a deployment-step change | Procedure owner | Procedure owner, within delegated authority | Operators; reliability owner | Requester and affected operators |
| RT-02 implement the approved bounded change | Named implementer | Delivery owner | Operators; reliability owner | Requester |
| RT-03 record and disposition the declined request | Caller/request owner | Request sponsor accountable for the request | Resource owner on capacity and alternatives | Requester; recipient receives disposition |

A posture such as `BH-F` does not assign responsibility or accountability for resolving a concern. RACI should name authorized roles and handoffs separately. Confusion creates a caller-side follow-up duty; when the existing request cannot be clarified, the caller returns to request-side `0x0 Orient` and then issues a revised call. Neither step makes the recipient responsible for resolving ambiguity or accepting the request. If RT-01 remained blocked after its agreed checkpoint, for example, its route could be `dependency unavailable → named dependency/escalation owner → decide whether to wait, narrow, or withdraw the review → check again at the agreed time`; the route seeks a decision and does not compel the reviewer to proceed. For safety concerns, follow the organization's appropriate protective and reporting processes; do not let the analogy delay urgent action. See [Multiparty Responsibility and Escalation](multiparty-responsibility-and-escalation.md) for the RACI and route fields.
