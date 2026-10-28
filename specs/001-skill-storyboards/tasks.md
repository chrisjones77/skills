# Tasks: Skill workflow storyboards

Dependencies: source verification precedes packaging; package precedes validation; validation and final diff inspection precede push and PR creation. One writer owns the isolated task checkout.

## Foundation

- [x] T001 Verify repository visibility, main revision and complete ten-skill inventory.
- [x] T002 Inspect repository rules and establish a clean isolated checkout on `codex/skill-storyboards-spec`.
- [x] T003 Write `spec.md` and `plan.md` with source and illustration boundaries.

## US1 — Understand the workflow

- [x] T004 Render one six-panel image per skill in `docs/skill-storyboards/assets/`.
- [x] T005 Inspect narratives and correct material pixel-level mistakes before choosing final assets.
- [x] T006 Add six-step text transcripts and limitations in `docs/skill-storyboards/README.md` and `manifest.json`.

## US2 — Inspect provenance

- [x] T007 Bind canonical source paths/blob SHAs and final image SHA-256 values in `manifest.json`.
- [x] T008 Save prompts and revision notes in `generation.json`; remove local paths from distributed records.
- [x] T009 Add `scripts/validate_storyboards.py` and a scoped GitHub Actions job.

## US3 — Browse locally

- [x] T010 Add the static HTML gallery with in-page navigation, native transcript controls and visible keyboard focus.
- [x] T011 Link the gallery from the repository `README.md`.

## Verification and delivery

- [x] T012 Run structural validation and meaningful mutation checks; record results in `verification.md`.
- [ ] T013 Inspect browser rendering at desktop and narrow widths (preview blocked by local-file policy; maintainer check remains pending).
- [x] T014 Inspect the full staged diff and run `git diff --check`.
- [x] T015 Commit and push the named task branch, create [PR #15](https://github.com/chrisjones77/skills/pull/15) and attach it to the chat. CI results are tracked on the PR.
- [ ] T016 Maintainer review and acceptance (outside author authority; remains pending).

## Follow-up — Document the work and safety

- [x] T017 Record authority, execution chronology, affected people/systems, task/scheduling boundaries, concern ownership and escalation in `work-and-safety.md`.
- [x] T018 Retain ten initial image hashes, five edit prompts and parent/final digest continuity in `docs/skill-storyboards/asset-lineage.json`.
- [x] T019 Cross-link the record from the feature packet and galleries; extend structural validation to the lineage record.
- [ ] T020 Deliver the documentation follow-up to PR #15 after review and verification; record the actual pushed revision and its CI result. Browser and human review remain pending.

## Current-gallery refresh — PR #15

The checked items above record the original ten-board work and its documentation follow-up; they do not establish verification of this refresh.

- [x] T021 Refresh selected gallery records for the current eleven-entrypoint inventory, including Build Music Video, preserving original generation and revision history.
- [x] T022 Enforce current skill source bindings and inventory-derived board coverage; keep directly referenced-document drift as a manual review concern.
- [ ] T023 Verify the refreshed package and record actual results separately from historical results; browser and human acceptance remain pending.
