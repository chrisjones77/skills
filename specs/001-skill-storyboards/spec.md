# Feature Specification: Skill workflow storyboards

**Feature branch**: `codex/skill-storyboards-spec`
**Created**: 2026-10-22
**Status**: Implemented proposal; awaiting PR review
**Source baseline**: `647e97ad215956b06edc6daa4b4c1c790ebe3b9b`

## Intent and scope

Make the ten confirmed skill entrypoints easier to understand through one six-panel storyboard per skill. The user requested a storyboard for each skill, confirmed the ten-file collection despite its current private visibility, and authorized packaging the result into a PR. This feature adds explanatory documentation and image assets. It does not implement the imagined interfaces or change skill behavior.

## User Scenarios & Testing

### US1 — Understand a skill workflow (P1)

A reader selects a skill and follows its six main steps without needing to interpret the whole source file first.

**Independent check**: Open the Markdown gallery and inspect one complete board and its transcript.

1. Given the pinned ten-skill inventory, when the reader browses the gallery, then every skill has exactly one board with a stable slug and six textual steps.
2. Given an image is unavailable or difficult to read, when the reader uses the transcript, then the main sequence and limitation remain available as selectable text.
3. Given an illustration depicts sample results or controls, when it is viewed in context, then it is identified as illustrative rather than evidence of an implemented tool.

### US2 — Inspect provenance and limits (P1)

A reviewer can trace each board to the exact skill snapshot and distinguish source workflow from invented UI examples.

**Independent check**: Compare one manifest record with its source blob and PNG digest.

1. Given a board record, when its source is checked, then its source path, Git blob SHA and repository revision identify the source snapshot.
2. Given an asset changes, when structural validation runs, then an incorrect recorded SHA-256 causes failure.
3. Given professional-practice material, when a reader follows it, then the source remains authoritative and the gallery does not assert regulator endorsement, current law, certification or legal clearance.
4. Given no human review decision has been recorded, when review status is shown, then human acceptance remains pending.

### US3 — Browse locally without a build (P2)

A reader opens the gallery from a checkout and navigates to individual images and skill sources offline.

**Independent check**: Open `docs/skill-storyboards/index.html` locally and use its navigation and transcript controls.

1. Given a local checkout, when the HTML file opens, then gallery assets and links resolve without external scripts, fonts, services or analytics.
2. Given keyboard navigation, when links and transcript summaries receive focus, then focus is visible and the controls work using native HTML.

## Requirements

- **FR-001**: Cover every skill entrypoint at the pinned revision, including `.agents/skills/*/SKILL.md` and `peo-guideline/skill.md`; no duplicate boards.
- **FR-002**: Supply one PNG and six-step text transcript per skill, with canonical source links and limitations.
- **FR-003**: Preserve important distinctions: receipt/acceptance/authority, completion/review/closure, evidence/interpretation, structural checks/visual judgment, guidance/obligation, and task class/command.
- **FR-004**: Record source revision, source blob SHA, final asset SHA-256, generation method, prompts, revision notes and review status.
- **FR-005**: Use only repository-relative file paths in distributed records. Exclude local filesystem paths, credentials, unrelated project context and private personal material.
- **FR-006**: Provide Markdown and offline HTML navigation. HTML needs a language, viewport, meaningful alt text, keyboard focus styling and selectable transcripts.
- **FR-007**: Keep the existing skill files unchanged. Treat generated screens as fictional examples and source references as authoritative.
- **FR-008**: Validate coverage, source/asset bindings, local link containment and offline resources. Do not label structural checks as automated visual verification.
- **FR-009**: Record unresolved limitations and human acceptance honestly. Creating a PR does not approve, merge or deploy the work.

## Edge cases

- Case-sensitive and hidden skill paths are part of the inventory.
- A later source change makes a board potentially stale; validation fails source binding until a reviewer refreshes the board or records the appropriate new source and review.
- Regenerated images can retain incorrect small print; inspect pixels separately from byte checks and preserve review notes.
- A broken/missing asset or escaped local link is an error, even when the page otherwise renders.
- Unsupported browser previews can use the Markdown gallery or full-size PNG directly.

## Key entities

- **Board**: stable slug, display title, source path/blob SHA, asset path/SHA-256, six-step transcript, limitation, prompt and review record.
- **Source snapshot**: repository name and revision identifying the ten-file collection.
- **Review record**: method, observed limits, status and human acceptance; no inferred approval.

## Success criteria

- **SC-001**: Ten unique boards cover all ten pinned entrypoints.
- **SC-002**: All ten PNG hashes and source blob bindings match their manifest records.
- **SC-003**: Every board has six text steps and reachable source/asset links; all gallery local links resolve inside the checkout.
- **SC-004**: The gallery contains no external executable or presentation dependency and no local absolute paths.
- **SC-005**: Visual inspection records meaningful corrections and does not claim human acceptance or current regulatory verification.

## Assumptions and exclusions

The ten-entrypoint collection is the agreed scope. Hosting, public release, changing repository visibility, installing Spec Kit into the repository, rewriting skills and merging the PR are outside this change. This is a manually authored Spec Kit-style feature packet, following its specification → plan → tasks → implementation → verification structure; no CLI run is claimed.
