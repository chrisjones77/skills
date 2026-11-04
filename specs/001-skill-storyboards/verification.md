# Verification: Skill workflow storyboards

**Date**: 2026-10-22
**Author method**: AI source review, AI visual inspection and local structural checks.
**Human acceptance**: Pending PR review.
**Release**: Proposed documentation on a task branch; no merge or deployment of this proposal is recorded here.

[Full work and safety record](work-and-safety.md) · [Asset lineage and edit prompts](../../docs/skill-storyboards/asset-lineage.json)

## Current-gallery refresh status

The user selected a current-gallery refresh for PR #15. Its target inventory is eleven skill entrypoints: the original ten plus Build Music Video. The task branch incorporates `origin/main` at `a0fd638` through merge `74979a0`. Original generation and revision history is retained; selected records are to bind to current skill sources. The validator derives expected board coverage from the checkout inventory and retains dynamic lineage generation/revision counts. Directly referenced-document drift remains a manual review concern.

Refresh structural validation, refreshed-image review, browser checks, delivery and CI results are pending and are not established by the historical results below. Human acceptance remains pending.

## Historical source and scope — 2026-10-22

The repository reported private visibility at inspection. Its main revision was `647e97ad215956b06edc6daa4b4c1c790ebe3b9b`. The recursive tree was complete and contained ten skill entrypoints, including the two hidden `.agents/skills` entries and lowercase PEO file. The isolated checkout was clean before work. No repository constitution, Spec Kit scaffold, AGENTS.md or contribution guide was present. Existing skill files were not modified.

## Historical results — original ten-board package

| Check | Result | Evidence and limits |
|---|---|---|
| FR-001 / SC-001 inventory | Pass | Ten distinct records matched all ten entrypoints at the original inspection. |
| FR-004 / SC-002 bindings | Pass | Source Git blob SHAs and final PNG SHA-256 values match. This establishes byte identity only. |
| FR-002 / SC-003 transcripts and links | Pass | Six text steps per board; HTML and Markdown local links resolve within the checkout. |
| FR-005 portable records | Pass | Distributed text contains no local absolute-path markers or credential markers checked by the validator. This is a bounded check, not a secret-scanner certification. |
| FR-006 / SC-004 offline structure | Pass | HTML has no external resource, active script, iframe or event handler; language, viewport, alt text, transcript controls and focus styles are present. |
| FR-003 / SC-005 visual review | Reviewed with limits | Each rendered image was inspected for its main six-panel narrative. Material corrections are recorded below. This was AI inspection, not independent human acceptance. |
| Desktop/narrow browser rendering | Not verified | Local HTTP serving was denied by the execution sandbox; direct local-file preview was rejected by browser URL policy. No alternate preview was attempted after the browser rejection. Static checks do not prove rendered accessibility or responsive behavior. |
| Full staged diff / whitespace | Pass | Inspected the task-only staged change and corrected Markdown hard-break whitespace; `git diff --cached --check` passes. |
| Follow-up lineage record | Recorded | Ten initial image digests and five parent/child revisions were recomputed from retained candidates. Final digests match the selected package. The validator checks record continuity and final bindings, not omitted intermediate pixels. |

## Historical commands and negative checks

`python3 scripts/validate_storyboards.py` passed locally using Python 3.14. The committed CI workflow targets Python 3.11; its result is recorded by GitHub, not inferred from the local run.

An author-side scratch copy exercised five mutations. Each produced the expected validation error, after an unmodified baseline passed:

1. Appended bytes to one PNG → asset hash mismatch.
2. Modified one skill file → stale source binding.
3. Added an HTML link outside the checkout → escaping-link error.
4. Replaced an image URL with an external address → external-resource error.
5. Added an eleventh skill entrypoint → inventory mismatch.

The scratch harness is not part of the repository feature. It modified temporary copies only.

The follow-up reran the passing baseline and the five original mutations, and added a sixth mutation: corrupting a revision's parent digest produced the expected `Broken lineage parent` error. All six negative cases passed in temporary copies. CI evidence for the initial proposal and delivery checkpoint is linked in the work/safety record; current-head results remain on PR #15. A completed validation job and an aggregate run status can differ at observation time, and neither is substituted for human acceptance.

## Visual corrections

| Board | Correction and remaining limits |
|---|---|
| Harnessed Dispatch | Main sequence inspected: workspace, brief, mode, ownership, return evidence and primary verification. Counts and results are invented UI examples. |
| Project Vault Operator | Main sequence inspected: map → canonical source → current status → requested link repair. Example commit and PR controls do not confer publication authority. |
| Gentle Boss | Replaced a premature closed-call banner with an open call pending review/follow-up. Recorded acceptance after clarification separately from acknowledgement. |
| Creative Seed Development | Main sequence inspected: intended effect, premise review, independent choices, seed, adaptation, revision. Artwork and story snippets are generated examples, not rights clearance. |
| EGBC AI Professional Practice | Main sequence inspected: specific use, context, competence, risk, validation and revisit. Example checks and decisions are fictional; current jurisdictional applicability was not assessed. |
| Engineering Work and Safety | Replaced invented task codes with canonical examples from `engineering-work-safety/references/framework.md`; maintenance is `0x2 Gardener / maintain`. Changed interim protection to pausing affected work and following site procedure. Physical-work screens remain conceptual and must not be used as site instructions. |
| Forward-Deployed AI Engineer | Main sequence inspected, including REUSE / ADAPT / REDESIGN / BUILD and reassessment. Sample numeric results are fictional; no safety or compliance claim follows from them. |
| Image and Card Coverage Harness | Removed pixel-count/text/forbidden-element detection claims from the automated validation panel. Record checks and byte identity remain distinct from human visual attestations. |
| PEO Guideline | Removed invented section numbers, used illustrative topic labels and explicitly marked currentness not yet verified. November 2020 identifies the skill's reference date only. |
| Stickler Prime | Main sequence inspected: criteria, review lens, evidence separation, concern, repair, effectiveness. Agency means affected-person choice in this workflow; no regulator or organization endorsement is implied. |

## Remaining review

A maintainer should inspect full-size images and transcripts, verify the HTML in a browser at desktop and narrow widths, and decide whether the documentation is ready to merge. Small generated UI text can contain imperfections. Canonical source documents take precedence. Approval, rights determinations and professional reliance are not established by this packet.

## Current-gallery refresh observed — 2026-10-28

Current source snapshot: a0fd63828396401bc28998069bf31664bc4090de. Eleven boards now cover eleven current entrypoints. Added Build Music Video; refreshed Coverage Harness for declared assistant review, delivery geometry/action/text/timing, and explicit HOLD without human acceptance. Original records and prior coverage PNG remain byte-identical in revisions/20261022.

- `python3 scripts/validate_storyboards.py`: passed current inventory, source/asset hashes, lineage, transcript/link/offline checks.
- Coverage records for both new assets: verified SHA-256, validation clear, assistant decision hold, release hold, zero manifest blockers. Harness exit status 1 reflects the intended non-accepted hold, not a clear validation failure. These checks do not inspect pixels or authenticate acceptance.
- Primary and independent assistant inspected both images. Video UI sample numbers are fictional and inconsistent as real calculations; prominent gallery text excludes technical reliance.
- Independent source review found two stale ten-board scope strings; corrected to eleven. No other substantive findings.
- `git diff --check`: passed. No automated test suite or new mutation tests run for this refresh.
- Actual desktop/narrow browser and human visual acceptance remain pending; no prior browser restriction was bypassed. No merge, installation or publication acceptance is claimed.

## Gardening admission — 2026-10-28

Twelve-entrypoint inventory and Farmer Jones Victory Garden illustration integrated; existing selected assets preserved. Assistant inspected evidence labels, measured/estimated distinction and preservation HOLD boundary. No actual recipe, site-specific physical-work procedure or private configuration is included. Current validation/review and CI results recorded on PR #17; desktop/narrow human acceptance of this new board remains unreported.

Current twelve-board validator and whitespace checks passed. The gardening coverage manifest reports verified asset binding, clear validation, assistant HOLD, release HOLD and zero manifest blockers. Independent read-only review found no blockers; it confirmed all twelve source/asset bindings and preservation of the prior eleven records/assets. These are source and declaration checks, not actual recipe or human browser acceptance.

## PR18 source reconciliation — 2026-10-28

The four entrypoints below gained an optional work-contract interface and portable
local reference links. Their existing six-step text transcripts still describe
the general workflows; they do not depict assignment-revision acceptance, contract
clarification exits, or adapter capabilities. No image was regenerated or newly
visually accepted. Updated byte bindings identify the reviewed entrypoints only,
not full visual coverage of the new interface. Existing image provenance and
human-acceptance limitations remain unchanged. Git retains the previous manifest.

| Board | Previous source blob | Reconciled source blob |
| --- | --- | --- |
| harnessed-dispatch | `5d04d4a54407bc623b8cceaafc42ec049ab8a9ce` | `d45c0fb3359b0e1f9e8cf557e18cb5e8d4c2f8f8` |
| call-and-response-harness | `c88d6ce38d64de4ff582f21bd202681e64e81f98` | `a4cf24e8336bea73392b740aa527ae935e24835b` |
| engineering-work-safety | `5b79188121dce989d9603fd7004c77c8315ff3a9` | `7647350a84f484fa0ad32c460b7eeb256b83a898` |
| forward-deployed-ai-engineer | `7d1b05464142c7fe02e00c1dffcfb94a9ac1b9fd` | `a0f80cf6c2678afa340da93f0b72c09965cff474` |

## Unified harness admission and music-video source reconciliation — 2026-11-04

Added the unified harness concept board and retained its initial image and the
revised candidate with linked hashes and prompts. Assistant inspection found six
panels, a temporary-clone step and pending human review. The pictured UI, archive
names, progress and hashes are fictional; the image does not establish operating
system isolation, authority, model locality or a review decision. Human visual
acceptance and browser rendering checks remain pending.

Rebound the music-video source from `1b75bbe1b01b3d0f38298107c7e2bb9990c18a43`
to `a881187680439bc1655d8ea8a9290bc074a12965` after comparing the source changes
with the retained six-panel image and transcript. The new optional one-shot
review method and additional deliverable guidance are not depicted; the gallery
now states that limitation. The image was not regenerated or newly human accepted.

The subsequent live-smoke-test instructions, scoped-read restriction, and
source-read/response gates do not change the six-step visual workflow; its source
binding was updated without regenerating the image or implying a new human review.
