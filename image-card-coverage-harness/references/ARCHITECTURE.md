# Architecture

## Purpose and limits

The harness is a manifest-driven review aid for image-generation artifacts and iterative card/cover series. It represents requirements, lineage, attributed review declarations, and blockers in portable JSON. It does not generate images, perform computer vision, identify people, establish rights, or determine whether a reviewer’s declaration is true.

## Data flow

1. Author a brief with stable artifact ID, type, constraints, forbidden drift, exact text, technical claims, and deviation policy.
2. Record each generation with a unique ID, parent ID, requested delta, preservation targets, and regression checks.
3. Record the actual reviewer kind and inspection evidence. Only an explicitly attributed human decision with acceptance evidence may accept the candidate.
4. Run `harness.py` to catch missing review coverage and declared failures.
5. Bind each non-fixture manifest to a normalized relative asset path and SHA-256 digest; the command-line validator rehashes the file before acceptance and includes the verified binding in its report.

## Core invariants

- Canonical constraints have stable IDs and explicit mutability. Changes require an explicit brief revision, never silent replacement.
- A child generation names its parent. Prior resolved constraints remain in the regression set unless explicitly retired with a reason and owner.
- A correction lists its requested delta and preservation targets. Each preservation target receives a separate review.
- Artifact type and intended use are declared before generation and checked at review.
- Included technical assertions cite evidence. Unsourced values are omitted or labeled as fictional/non-technical.
- Required typography is exact-string checked by a person against the rendered image; text model output is not assumed accurate.
- Creative deviations are recorded with rationale, intentionality, and approval.
- Familiarity and reference checks are human visual review fields, not identity-recognition assertions.
- A release acceptance is tied to a relative asset path and SHA-256 digest; the validator resolves the file within the manifest directory and recomputes the digest. Synthetic fixtures are explicitly segregated and cannot be accepted for release.
- Each regression check names the requirement being checked and includes a human evidence note; the validator checks record completeness, not the truth of the comparison.

## Findings and decision semantics

`blocker` means the record is incomplete, failed, or internally inconsistent. It means do not accept this generation based on the manifest. Reports separate `validation_status` (`clear` or `blocked`), `reviewer_decision` (`accept`, `revise`, `reject`, or `hold`), and `release_outcome`. Only a clear validation with reviewer decision `accept` and a non-fixture asset binding yields `release_outcome: accepted` and exit status 0. A clear synthetic fixture yields `fixture_only`; a blocked fixture yields `not_accepted`. A clear validation does not mean the artifact is safe, correct, suitable, rights-cleared, or visually verified. The asset binding confirms byte identity only; review judgments remain declarations; role and evidence are recorded, not authenticated. JSON Schema provides structural validation; cross-field checks and asset verification require the executable harness. The current implementation emits blockers only.

## Extending the schema

Keep existing field semantics stable within a major schema version. Use additive optional fields for non-breaking improvements. Update the schema, fixture(s), focused unit tests, operating documentation, and changelog together. Add machine-readable validation only when its source data and limits can be stated accurately.

## Automated validation

The developer suite uses `jsonschema` for Draft 2020-12 schema checks; install `requirements-dev.txt` before running it. Unit tests also exercise CLI output and exit codes, asset hashing, malformed input, path traversal, and symlink containment. The repository workflow runs the suite on Python 3.11 and 3.12. These checks establish implementation behavior for the covered cases, not the truth of human visual-review declarations.

