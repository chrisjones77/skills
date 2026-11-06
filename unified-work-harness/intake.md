# Human review before offering work

Use `intake.mjs` after completing the intake described in the [package guide](SKILL.md). A reviewer distinct from the proposed recipient reads the exact request and records a clear or hold disposition. The function checks the intake, records the review digest and gives the offer builder a fresh way to check both records before dispatch. The existing v1–v5 read-only interfaces retain their documented preflight. To require this review on a new path, include its digests in the accepted offer and verify them again at dispatch.

For the [training display review](methods.md), the coordinator requests 30 minutes to verify the public shelf count sample. The analyst receives the offer; a separate checker reviews the intake and evidence. Record the outcome, requests and exclusions in compact `JSON.stringify` form. Keep both inputs and the returned review in access-controlled storage. A complete example using all the inputs is in the [intake fixtures](intake.test.mjs).

```js
import { reviewIntake, verifyIntakeForOffer } from './intake.mjs';

const assessment = {
  by: 'checker',
  disposition: 'clear',
  authority: 'confirmed',
  scope: 'consistent',
  concerns: 'clear',
  availableMinutes: 30,
  reviewerAvailable: true,
  evidenceRef: 'training-review-01',
  reviewedAt: '2026-11-05T08:00:00.000Z',
  expiresAt: '2026-11-05T09:00:00.000Z'
};
const review = reviewIntake(intakeJson, assessment);
const binding = verifyIntakeForOffer(intakeJson, review, {
  recipient: 'analyst', assigner: 'coordinator', reviewer: 'checker',
  outcome: 'Verify the public shelf count sample'
});
```

The times above represent one illustrative hour. Record the actual review time and a justified expiry. Compare the return values `intake_sha256` and `review_sha256` with the values in the accepted scope each time the verification function runs. Store and transmit only the evidence references that the receiver is authorized to see.

**Before marking clear**, the checker examines the source of authority and limitations, including the proposed recipient's role and workspace, the meaning of requested and prohibited actions, restricted data handling, open concerns, dependency availability, the reviewer's availability and sufficient effort for the person doing the work. Record the basis and capacity confirmation in the review record identified by `evidenceRef`. An assignee who subsequently declines or loses capacity needs a fresh disposition. This check establishes consistency of declarations; verifying the person's identity, continuing authority and truth of their statements belongs to the surrounding process.

A held preliminary intake, restricted data, overlapping effect labels, a wildcard, an open concern, or an unavailable reviewer blocks the offer. The checker must explicitly hold unknown authority, an unresolved semantic conflict or an inadequate budget. Record the reason and interim protection, name the decision owner and agree a checkpoint. Preserve the hold and any concern history when obtaining a revised intake and fresh review. An expired review or a change to bound bytes also requires renewed review. A cleared intake still needs the recipient's explicit acceptance and resume under the applicable contract.
