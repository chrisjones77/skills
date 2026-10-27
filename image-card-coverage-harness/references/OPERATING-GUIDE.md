# Operating guide

## Before the first generation

Create one manifest per artifact or tightly controlled series member. Give it a stable artifact ID and a new generation ID for each candidate. Declare the intended output (for example album cover versus infrastructure collectible card), audience, aspect ratio/medium as relevant, canonical facts, forbidden substitutions, exact visible text, technical claims, and whether reference images are used.

Constraints should be concrete and reviewable. Separate immutable identity facts from preferences. For each technical claim, state `included`, `excluded`, or `fictional_labelled`; included claims need a provenance reference. Record where the reference came from and any permission/de-identification requirement without embedding sensitive source images in broadly shared manifests.

## For each iteration

Set `parent_generation_id` to the immediately preceding candidate. Describe the requested delta narrowly. List details to preserve. Recheck all immutable constraints and every still-applicable resolved defect, not only the feature named in the latest prompt. For every non-fixture candidate, set `provenance.asset_ref` to a normalized, slash-separated relative file path inside the manifest directory, with no `..` path segments, and record its `provenance.asset_sha256`. The command-line harness resolves the path within that directory and recomputes SHA-256; a missing file, path escape, or mismatch blocks acceptance. Its report records the verified relative reference and digest. JSON Schema checks the path's lexical form, while the harness enforces resolved containment, file existence, and hash equality. Mark synthetic examples `source_kind: synthetic_fixture` and `created_for_archive: true`; these can validate the workflow but can never yield a release acceptance.

Human review fields:

- `artifact_type_fit`: Does the image work as the requested artifact and for its stated use?
- `canonical_constraints`: One result per constraint ID, with concise visual evidence note.
- `forbidden_drift`: One result per forbidden item and evidence note; mark `pass` only after checking that the item is absent. An observed forbidden item must block acceptance.
- `regression_review`: Compare against parent and unresolved/resolved issue list; each check needs a non-empty requirement, passing status, and evidence note.
- `minimal_delta`: Confirm requested change and each preservation target.
- `synthetic_familiarity`: Inspect for repeated generic people, animals, props, or compositions that were not requested. Note recurrence across the set, not inferred identity.
- `reference_fidelity`: Compare approved references; record de-identification, consent/permission, and intentional departures as applicable.
- `technical_evidence`: Ensure technical-looking labels and specifications are sourced or clearly fictionalized; reconcile all claim IDs in the included, excluded, and fictional-labelled lists.
- `typography`: Compare every exact string, punctuation, capitalization, symbols, and legibility at intended display size.
- `collection_consistency`: Compare against an approved baseline for frame, palette, hierarchy, rendering, and series-specific rules.
- `creative_deviations`: Give each addition or omission a unique ID, a concise rationale, a boolean `intentional` value, and a named `approved_by` person or role. The validator checks these fields are present and well-formed; a human still determines whether the deviation is appropriate and authorized.

## Decision

Set `reviewer_kind` to `human`, `assistant` or `automated`. Use `accept` only for an actual human decision after reviewing the candidate and resolving all blockers; cite that decision and its candidate/scope in `acceptance_evidence`. Assistant and automated records may be clear but must not claim human acceptance. See [delivery coverage](DELIVERY-COVERAGE.md) for migration from 1.4 and video-specific evidence. Use `revise` for actionable corrections, `reject` when unsuitable, and `hold` when evidence or rights/approval is unresolved. The report shows validation status, reviewer decision, and release outcome separately; only a clear validation with `accept` produces `accepted` and exit status 0. The asset binding confirms byte identity only; the validator cannot know whether a human actually inspected a pixel or whether a review judgment is true. Record honest evidence and retain the reviewed asset.

## Reproducibility

Run the sample command and unit suite from this directory. Keep the Python version, archive version, manifest, output asset hash, and report together. An identical manifest should produce identical JSON findings under the same harness version.

