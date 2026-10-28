# Verification: Skill workflow storyboards

**Date**: 2026-10-22
**Author method**: AI source review, AI visual inspection and local structural checks.
**Human acceptance**: Pending PR review.
**Release**: Proposed documentation on a task branch; no merge or deployment.

[Full work and safety record](work-and-safety.md) · [Asset lineage and edit prompts](../../docs/skill-storyboards/asset-lineage.json)

## Source and scope

The repository reported private visibility at inspection. Its main revision was `647e97ad215956b06edc6daa4b4c1c790ebe3b9b`. The recursive tree was complete and contained ten skill entrypoints, including the two hidden `.agents/skills` entries and lowercase PEO file. The isolated checkout was clean before work. No repository constitution, Spec Kit scaffold, AGENTS.md or contribution guide was present. Existing skill files were not modified.

## Results

| Check | Result | Evidence and limits |
|---|---|---|
| FR-001 / SC-001 inventory | Pass | Ten distinct records match all ten current entrypoints. |
| FR-004 / SC-002 bindings | Pass | Source Git blob SHAs and final PNG SHA-256 values match. This establishes byte identity only. |
| FR-002 / SC-003 transcripts and links | Pass | Six text steps per board; HTML and Markdown local links resolve within the checkout. |
| FR-005 portable records | Pass | Distributed text contains no local absolute-path markers or credential markers checked by the validator. This is a bounded check, not a secret-scanner certification. |
| FR-006 / SC-004 offline structure | Pass | HTML has no external resource, active script, iframe or event handler; language, viewport, alt text, transcript controls and focus styles are present. |
| FR-003 / SC-005 visual review | Reviewed with limits | Each rendered image was inspected for its main six-panel narrative. Material corrections are recorded below. This was AI inspection, not independent human acceptance. |
| Desktop/narrow browser rendering | Not verified | Local HTTP serving was denied by the execution sandbox; direct local-file preview was rejected by browser URL policy. No alternate preview was attempted after the browser rejection. Static checks do not prove rendered accessibility or responsive behavior. |
| Full staged diff / whitespace | Pass | Inspected the task-only staged change and corrected Markdown hard-break whitespace; `git diff --cached --check` passes. |
| Follow-up lineage record | Recorded | Ten initial image digests and five parent/child revisions were recomputed from retained candidates. Final digests match the selected package. The validator checks record continuity and final bindings, not omitted intermediate pixels. |

## Commands and negative checks

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
