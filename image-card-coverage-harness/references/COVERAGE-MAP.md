# Coverage map

| Requirement | Manifest location | Validator coverage | Human evidence still required |
|---|---|---|---|
| Canonical artifact constraints | `brief.canonical_constraints`; `review.canonical_constraints` | Every brief ID must have one passing review with an evidence note | Truth of the visual assertion; constraint source quality |
| Forbidden drift | `brief.forbidden_drift`; `review.forbidden_drift` | Exactly one passing disposition with evidence note per forbidden item; unknown and duplicate items block | Human inspection for each excluded feature |
| Cross-generation regression | `generation.parent_generation_id`, `regression_checks`; `review.regression_review` | Each check needs a unique ID, requirement, evidence note, and passing status | Actual comparison to parent and earlier accepted/resolved items |
| Minimal-delta preservation | `requested_delta`, `preservation_targets`; `review.minimal_delta` | Every target must be marked preserved | Whether the intended visual details actually survived |
| Artifact type and fitness | `artifact_type`; `review.artifact_type_fit` | Known type plus pass required | Suitability for audience, medium, and use |
| Synthetic familiarity | `review.synthetic_familiarity` | Status must be resolved | Human detection across image set; no identity inference |
| Character reference fidelity | `review.reference_fidelity` | Pass or not applicable | Compare approved reference, permissions, de-identification |
| Technical evidence boundary | `brief.technical_claims`; `review.technical_evidence` | Claim evidence references are required for included claims; included/excluded/fictional IDs must match the brief | Source validity and whether image makes implied claims |
| Exact typography | `brief.required_text`; `review.typography.items` | Exact text IDs must report pass | Rendered spelling, punctuation, legibility at size |
| Series consistency | `review.collection_consistency` | Pass required | Human comparison against the correct series baseline |
| Controlled creative deviation | `brief.creative_deviations_policy`; `review.creative_deviations` | Each deviation needs a unique non-empty ID, non-empty rationale, boolean intentionality, and non-empty approver | Whether deviation is appropriate and authorization is valid |
| Provenance and lineage | `generation`, top-level `provenance` | Asset must resolve inside the manifest directory and its recomputed SHA-256 must match; the report records the verified ref and digest; fixtures cannot be accepted | Permission trail and the meaning of external references |

The JSON Schema checks structure and normalized relative-path syntax. The executable validator additionally checks completeness, cross-field consistency, resolved path containment, local asset identity, evidence-note presence, and declared outcomes; it does not independently validate external evidence references or inspect image contents. A verified asset binding identifies bytes only. A clear validation result is distinct from the reviewer decision; only a clear `accept` with a non-fixture asset binding yields an `accepted` release outcome.
