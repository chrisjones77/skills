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
- [ ] T015 Commit and push the named task branch, create a PR and attach it to the chat.
- [ ] T016 Maintainer review and acceptance (outside author authority; remains pending).
