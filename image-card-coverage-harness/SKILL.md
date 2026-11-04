---
name: image-card-coverage-harness
description: Review image-generation artifacts and iterative visual series for requirement coverage, regression, exact text, technical claims, and asset provenance. Use when a structured, human-led review record is useful.
metadata:
  short-description: Review image artifact coverage and lineage
---

# Image and Card Coverage Harness

Use this skill to structure review of a generated image or a series of revisions. It checks whether the manifest records required reviews and whether the reviewed file is bound to the recorded SHA-256. It does not inspect image pixels, validate the truth of human observations, establish rights, or replace a qualified reviewer.

## Workflow

1. Create or update a manifest from `schema/manifest.schema.json`; use `fixtures/` only as synthetic examples. Preserve historical manifests and portable kits unchanged; append release and preservation receipts separately so status is reconciled without rewriting source artifacts.
2. Identify the candidate asset and record its normalized slash-separated path relative to the manifest directory and its SHA-256 digest. Keep source images and sensitive metadata in access-controlled storage.
3. Compare the candidate with the brief, parent generation, approved references, and still-applicable resolved findings. Record concise evidence notes for each required visual check. Where action matters, require ordered before/after states to verify visual change. Report source-art count, edit segments and actual visual changes separately.
4. Reconcile all technical-claim IDs, exact text, preservation targets, forbidden drift, and intentional deviations. Keep associated evidence—including transcripts, listening reviews, and acceptance records—distinct from the manifest.
5. Run `python3 scripts/harness.py PATH/TO/manifest.json --json` and resolve blockers. To run the full developer checks, install `requirements-dev.txt`, then run `python3 -m unittest discover -s tests -v`.
6. Declare `review.reviewer_kind` as `human`, `assistant`, or `automated`. Keep assistant inspection and automated checks separate from actual human acceptance. Use `hold` until an actual human decision is available; `accept` requires `human` and a nonempty `acceptance_evidence` reference identifying the candidate and scope. Never fabricate that evidence. The harness checks declarations, not reviewer identity.
7. Report `validation_status`, `reviewer_decision`, and `release_outcome` separately. A verified asset binding confirms byte identity only. Never describe a clear result as automated visual verification or rights clearance.

For storyboard/video assets, read [delivery coverage](references/DELIVERY-COVERAGE.md). Review intended-use geometry, action coverage, rendered text and timing regressions in addition to image quality. Use existing canonical constraints and regression checks for these requirements; do not treat metadata alone as a completed check.

Read [the operating guide](references/OPERATING-GUIDE.md) for review-field definitions, [the coverage map](references/COVERAGE-MAP.md) for automated and human responsibilities, and [privacy guidance](references/PRIVACY-PUBLICATION.md) before sharing manifests or assets.

