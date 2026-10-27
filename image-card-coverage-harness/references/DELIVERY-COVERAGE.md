# Delivery coverage

## Intended use

Declare the destination canvas and display size, then add distinct canonical constraints for aspect ratio, subject visibility/safe area and text readability in that destination. Inspect the actual rendered crop. Exact typography text alone does not establish that it remains readable in a video frame. A portrait contact sheet and a landscape production image are different artifacts with different fitness requirements.

## State and action

For each visual requirement, record a `coverage_mode` alongside its canonical constraint: `state`, `sequence`, or `animation`. State requirements can pass from one image. Sequence requirements need ordered asset/frame evidence. Animation requirements need observed motion evidence. Record the relevant asset IDs or video intervals in `evidence_note`; do not pass an action merely because a still suggests it. These additional metadata fields are advisory; the harness checks constraint coverage and evidence presence, not pixel semantics.

## Approved timing

Bind a timing-preserving revision to its approved baseline ID and SHA-256. Record protected boundaries/intervals with FPS and time basis in preservation targets and explicit regression requirements. Record audio identity, total runtime, boundary inclusion and protected footage comparisons independently. Attach tool results or frame/stream hashes in evidence notes; identify the comparison method. A general 'timing unchanged' note is insufficient for a claim of identical audio or pixels.

## Counts and review sources

Keep three separate counts in review notes: unique source assets (deduplicate identical bytes), timeline segments, and meaningful visual changes (declare a human-inspectable counting rule). Repeated crops and short segments can increase cuts without increasing coverage.

Schema 1.5 requires `reviewer_kind`. Migrate 1.4 records by identifying who actually made the recorded decision; never assume every nonempty reviewer string names a human. Historical assistant/automated `accept` records become `hold` pending human acceptance. Human acceptance requires `acceptance_evidence` pointing to the actual decision, candidate and accepted scope. Synthetic examples remain fixture-only, even with simulated human acceptance. Keep independent assistant, automated and human records rather than overwriting one reviewer with another. Partial approval (for example timing only) must not become whole-artifact acceptance.
