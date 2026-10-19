# Response State Matrix

The code is written as `BH-0` through `BH-F` so it cannot be confused with request-side `0x0`–`0xF`. Bit order is stance (bit 3), direction (bit 2), complexity (bit 1), commitment (bit 0). A code is a snapshot describing posture, not an instruction or outcome.

| Code | Stance | Direction | Request complexity | Commitment | Illustrative response posture |
|---|---|---|---|---|---|
| BH-0 | Act | Toward | Void / simple | Risk | Take a bounded step that deliberately expands a straightforward task toward a more capable result. |
| BH-1 | Act | Toward | Void / simple | Caution | State a possible expansion, then hold commitment until need, scope, or authority is clear. |
| BH-2 | Act | Toward | Abyss / complex | Risk | Enter the complex work with a bounded, authorized step and explicit assumptions or stop conditions. |
| BH-3 | Act | Toward | Abyss / complex | Caution | Announce a hold and identify what analysis, decision, or evidence is needed. |
| BH-4 | Act | Away | Void / simple | Risk | Preserve or restore simple scope; remove an unnecessary complication within authority. |
| BH-5 | Act | Away | Void / simple | Caution | Hold a proposed scope change while checking whether added complexity is necessary. |
| BH-6 | Act | Away | Abyss / complex | Risk | Take a bounded step to reduce exposure or simplify the complex situation; preserve safe state. |
| BH-7 | Act | Away | Abyss / complex | Caution | Announce a hold, preserve state, and define a safe simplification, exit, or handoff condition. |
| BH-8 | Contemplate | Toward | Void / simple | Risk | Consider what greater depth could achieve, then take a proportionate step toward it. |
| BH-9 | Contemplate | Toward | Void / simple | Caution | Examine whether added complexity is justified; set a review point before commitment. |
| BH-A | Contemplate | Toward | Abyss / complex | Risk | Study interdependencies, then take a bounded step if authority and safeguards permit. |
| BH-B | Contemplate | Toward | Abyss / complex | Caution | Map dependencies and failure paths; hold consequential action pending named review or evidence. |
| BH-C | Contemplate | Away | Void / simple | Risk | Examine the request and simplify or decline unnecessary scope; communicate the boundary. |
| BH-D | Contemplate | Away | Void / simple | Caution | Hold scope steady while considering whether expansion is needed; name when to revisit. |
| BH-E | Contemplate | Away | Abyss / complex | Risk | Assess the complex situation, then take a bounded simplification, withdrawal, or handoff step. |
| BH-F | Contemplate | Away | Abyss / complex | Caution | Hold consequential work, preserve state, and identify conditions for safe re-entry or exit. |

These are illustrative combinations, not prescribed or preferred behaviors. “Void = simplicity” is a chosen design interpretation, not an empirically established construct. Complexity is relative to the recipient and the stated context.

## One-bit contrast examples

Use otherwise matched situations to check whether the axes remain interpretable independently. These examples do not imply that one response is better.

| Axis varied | Shared situation | First posture | Contrast posture | Intended difference |
|---|---|---|---|---|
| Stance | A straightforward request could use a small improvement; recipient is ready to proceed. | BH-0: act toward the improvement. | BH-8: contemplate the same opportunity, poised to take a bounded step. | Stance only. |
| Direction | A complex request is safe to examine, but scope can be reduced. | BH-A: contemplate and engage interdependencies. | BH-E: contemplate and simplify, withdraw, or hand off. | Direction only. |
| Complexity | Recipient contemplates deepening the request and is ready for a bounded step. | BH-0: request is simple for this recipient in this context. | BH-2: request is complex for this recipient in this context. | Complexity only. |
| Commitment | Recipient contemplates moving toward a complex request. | BH-A: take a bounded, authorized step. | BH-B: pause pending named information or review. | Commitment only. |

If the contrast cannot be understood without changing another axis, revise the example or reconsider whether the axes are distinct enough for the intended use.
