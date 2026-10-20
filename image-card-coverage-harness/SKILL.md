---
name: image-card-coverage-harness
description: Review image-generation artifacts and iterative visual series for requirement coverage, regression, exact text, technical claims, and asset provenance. Use when a structured, human-led review record is useful.
metadata:
  short-description: Review image artifact coverage and lineage
---

# Image and Card Coverage Harness

Use this skill to structure review of a generated image or a series of revisions. It checks whether the manifest records required reviews and whether the reviewed file is bound to the recorded SHA-256. It does not inspect image pixels, validate the truth of human observations, establish rights, or replace a qualified reviewer.

## Workflow

1. Create or update a manifest from `schema/manifest.schema.json`; use `fixtures/` only as synthetic examples.
2. Identify the candidate asset and record its normalized slash-separated path relative to the manifest directory and its SHA-256 digest. Keep source images and sensitive metadata in access-controlled storage.
3. Compare the candidate with the brief, parent generation, approved references, and still-applicable resolved findings. Record concise evidence notes for each required visual check.
4. Reconcile all technical-claim IDs, exact text, preservation targets, forbidden drift, and intentional deviations.
5. Run `python3 scripts/harness.py PATH/TO/manifest.json --json` and resolve blockers. Run `python3 -m unittest discover -s tests -v` when modifying this skill or its validator.
6. Report `validation_status`, `reviewer_decision`, and `release_outcome` separately. A reported verified asset binding confirms byte identity only. A clear result with `accept` remains a human attestation; never describe it as automated visual verification or rights clearance.

Read [the operating guide](references/OPERATING-GUIDE.md) for review-field definitions, [the coverage map](references/COVERAGE-MAP.md) for automated and human responsibilities, and [privacy guidance](references/PRIVACY-PUBLICATION.md) before sharing manifests or assets.
