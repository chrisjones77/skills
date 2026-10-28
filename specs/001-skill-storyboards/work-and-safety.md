# Work and safety record: Skill workflow storyboards

Record date: 2026-10-22, America/Toronto. This record covers authoring and packaging the ten-board collection proposed in [PR #15](https://github.com/chrisjones77/skills/pull/15), including the follow-up request to document the work and safety. It is an evidence-bounded account of this change, not a formal hazard assessment, safety case, legal determination or certification.

## 1. Outcome and present state

The proposal contains ten PNG storyboards, six-step selectable text transcripts, Markdown and offline HTML galleries, source/asset bindings, generation records, a validator and a scoped CI workflow. A manually authored Spec Kit-style specification, plan, tasks and verification record describe the change. Spec Kit commands were not run and no repository-wide Spec Kit scaffold was installed.

The PR is open as a draft. The implementation and author checks are complete for the stated documentation scope. Desktop/narrow browser rendering and independent human visual acceptance remain pending. Completion of authoring, a successful validation job and positive conversational feedback do not establish review acceptance, release approval or closure.

| State | Evidence/status |
|---|---|
| Source baseline | `647e97ad215956b06edc6daa4b4c1c790ebe3b9b` |
| Feature commit | `c1c2cffbbbb32daf3301c37e8bb71621eba1a504` |
| Delivery checkpoint commit | `1b5d3d0c0a91b7fd6cf2b0ec37895721b2fbb5a6` |
| Branch | `codex/skill-storyboards-spec`, targeting `main` |
| Author workspace at follow-up start | Clean; local HEAD matched the PR head above |
| Repository visibility | Reported private during source inspection and PR preparation; no visibility change was requested or made |
| CI evidence at follow-up inspection | The `validate` job for the delivery checkpoint reported completed/success. The run-level response still reported in_progress; these distinct observations are preserved rather than silently reconciled. Current results belong to the PR checks UI. |
| Review/release | Draft PR, no human acceptance recorded, no merge or deployment performed |

The existing [verification record](verification.md) holds check results and the per-board visual review. The [manifest](../../docs/skill-storyboards/manifest.json) is the authoritative package inventory and checksum record. This document does not duplicate every digest.

## 2. Authority and scope

| User instruction | Interpretation and action boundary |
|---|---|
| Render a storyboard | Create a concept image following the discussed six-panel presentation form. |
| Do one for each public skill | Discover the intended repository and skill inventory rather than infer it from installed skills. |
| Confirmation to use those ten skills | Use the ten entrypoints in the confirmed repository despite its current private visibility. This did not authorize changing visibility. |
| Package the work into a PR using Spec Kit | Prepare a reviewable feature packet, commit/push a named task branch and open a PR in that repository. |
| Fully document the work and safety | Expand the same PR with the work record, safety boundaries, evidence limits and review responsibilities. |

The authorized change concerns explanatory artifacts. It does not authorize changing canonical skill behavior, installing integrations, merging the PR, public hosting, deployment, repository visibility changes, contacting external reviewers, or making professional-practice or rights determinations. The only external communication created by this work is the requested repository PR and its metadata. No subagents were dispatched.

## 3. Orientation and task record

The [engineering-work-safety framework](../../engineering-work-safety/references/framework.md) supplies the task vocabulary and concern-response prompts used here. Its source blob at the reviewed baseline is `bc1361282843cea142ffc475f829de7a6e8ddd9d`. Its use is a planning and reflection method; using it is not proof of safe conditions.

| Field | Record |
|---|---|
| 0x0 orientation | Make skill workflows understandable, traceable and reviewable without making generated imagery look like operating evidence. |
| Primary follow-up class/command | `0x5 Librarian / record`: document the work, controls, evidence, decisions and unresolved state. |
| Related task tags | `0xB Auditor / verify` for checks; `0xD Steward / sustain` for review capacity; `0xE Facilitator / coordinate` for the handoff. Tags do not create assignments or authority. |
| Concrete output | This record and cross-links in the specification, plan, tasks, galleries and verification record. |
| Release trigger | User's follow-up documentation request. |
| Priority | Complete the documentation before reporting this follow-up done; no priority over unrelated work is inferred. |
| Deadline | No external deadline or response-time promise was given. |
| Budget/capacity | No measured execution bound, fixed effort estimate or human review capacity was established. Do not infer one from tool timing. |
| Dependencies | Verified source/head identity, existing artifact inventory, source framework, validation evidence and authorized PR branch access. |
| Scheduling policy | Dependency-ordered single-writer work. Review source/state, author documents, check links and diffs, commit/push, inspect CI and report. This is task ordering, not a real-time guarantee. |
| Admission boundary | Documentation and task-branch updates are admitted by the user's request; merge and release decisions remain outside it. |
| Overload/interruption | Preserve the named branch and current files, report the checkpoint and pending action, and avoid irreversible action to meet an unstated deadline. No human reviewer is presumed available. |
| Resume condition | Recheck repository, branch, HEAD, dirty state and PR status; preserve unexpected changes and resolve ownership before writing. |
| Completion condition | Work and safety evidence is documented and pushed to PR #15 with unresolved checks visibly pending. |

## 4. Affected people, systems and interfaces

| Area | Possible effect and boundary |
|---|---|
| Skill readers and learners | A polished illustration can be easier to understand but can also make invented controls/results seem authoritative. Text transcripts and source links remain necessary. |
| Maintainers and reviewers | Ten detailed images impose review work. No demand for immediate review, inferred acceptance, person-scoring or deadline is attached to this record. |
| Professionals reading the EGBC/PEO boards | An illustration might be mistaken for current governing guidance. Applicability and current legal/regulatory requirements were not assessed here. |
| People represented in workflow examples | Examples are fictional; no feelings, competence, consent or safety of real people were inferred from codes or observed behavior. |
| Users with visual, reading or motor access needs | Image text alone is insufficient. Transcripts, source links and native HTML controls are provided; actual rendered accessibility remains unverified. |
| Repository and local authoring workspace | Changes are confined to the task branch and explanatory files. Existing skill files and unrelated checkouts were preserved. |
| Image-generation service | The built-in image tool received source-derived workflow summaries and generated/reference imagery. It did not receive the entire repository, credentials or unrelated personal records as prompts. Destination-specific provider retention/training terms were not assessed in this documentation task; no confidentiality guarantee is made. |
| GitHub | Receives the authorized task-branch files and PR metadata. The package omits author-machine paths and raw session logs. Private repository visibility does not establish confidential treatment by every participant or service. |

## 5. Execution and evidence chronology

The order below is source/session-derived. Exact durations and unrecorded intermediate timestamps are not reconstructed.

| Event | What happened | Evidence or limit |
|---|---|---|
| Inventory discovery | Read the complete recursive tree and repository metadata; found ten skill entrypoints, including hidden paths and the lowercase PEO file. | Source revision and manifest; tree was not truncated. |
| Scope clarification | Repository metadata contradicted the remembered public visibility. The author asked which collection to use, began preparation using the identified set, and the user explicitly confirmed those ten. | Preparation/generation began before the clarification reply; this is not represented as prior approval. The final PR work followed explicit confirmation. |
| Source reading | Read each entrypoint at the pinned revision and the engineering framework for the class map. | Workflow source, not proof that every source claim or reference is current. |
| Initial rendering | Generated ten boards using the built-in image tool and a shared six-panel visual brief. | Initial prompts in the generation record; interface details are invented. |
| Visual review | Inspected the rendered images and requested five targeted edits across four boards. | Asset lineage and material corrections below. No independent reviewer was used. |
| Result logging | One orchestration result printed embedded generated-image data along with metadata. Subsequent calls avoided raw result dumps. | Generated image content, not a credential dump; raw payload logs are excluded from the package. Tool-output exposure beyond the session was not assessed. |
| Local delivery | Packaged ten images, gallery, prompts and checksums for the user. | This was an earlier snapshot. PR assets supersede that local download bundle, particularly the final engineering taxonomy correction. |
| Isolated checkout | Initial network-restricted Git clone failed. An approved sandbox escalation cloned the confirmed repository into a fresh task workspace; a named branch was created from main. | No reset, clean, stash, force-push or changes to another checkout were used. |
| Spec packet and packaging | Added the spec, plan, tasks, verification, galleries, portable metadata and validator. | The feature did not install or run the Spec Kit CLI. |
| Structural checks | Validator passed. Five intentional mutations in temporary copies were rejected as expected. | Described in verification; byte/record checks do not inspect pixels. |
| Preview attempt | Local HTTP binding was denied by the execution sandbox. A direct local-file browser URL was rejected by browser policy. | No alternate preview was attempted after rejection. No desktop/mobile screenshot check is claimed. |
| Diff and commit | Inspected the task-only staged files; corrected trailing whitespace; committed and pushed the feature and delivery checkpoint. | Commit IDs above; source skills remained unchanged. |
| PR and CI | Opened draft PR #15, attached it to the chat and inspected GitHub validation evidence. | Links below; job and run state are distinguished. |
| Follow-up documentation | Added this work/safety record at the user's request and linked it from the feature packet. | This follow-up remains local and unpublished; its resulting commit and current-head CI have not been established. |

## 6. Generation, correction and artifact lineage

The series comprises ten initial images and five targeted revisions: one each for Gentle Boss, Image/Card Coverage and PEO; two for Engineering Work and Safety. The selected final package contains ten images, not every intermediate. The [generation record](../../docs/skill-storyboards/generation.json) retains initial prompts and revision notes; the [asset lineage](../../docs/skill-storyboards/asset-lineage.json) adds revision prompts and parent/final digests. No deterministic reproduction guarantee is made for the generator.

| Concern found by AI visual inspection | Correction | Evidence limit |
|---|---|---|
| Gentle Boss closed a call with required follow-up outstanding. | Changed to open/pending review and recorded acceptance after clarification separately from receipt. | AI inspected the revised board; human acceptance is pending. |
| Image/Card board depicted automatic checks of text and forbidden visual elements. | Restricted the automated panel to schema, required records, asset access, digest and claim-ID reconciliation; labelled visual findings human attestations. | This does not mean a human review has occurred on this collection. |
| PEO board invented section numbers and implied currentness. | Replaced numbered citations with illustrative topics and marked currentness not yet verified. | No current-law or guideline applicability conclusion was made. |
| Engineering board invented numeric class mappings. | First removed mappings; the PR pass then corrected remaining small print and supplied canonical examples, including `0x2 Gardener / maintain`. | Partial visual lists are examples, not a replacement for the full class map. |
| Engineering example suggested continuing operation under a vibration concern. | Changed interim protection to pause affected work and follow site procedure. | Remaining physical-work screens are conceptual and are not facility instructions or a validated operating procedure. |

## 7. Safety and evidence concern register

These are author-identified documentation concerns and response proposals, not established incidents or formal hazard ratings. Likelihood and residual risk are not quantified because adequate evidence is absent. A control being present does not establish its effectiveness in use.

| ID | Concern / possible consequence | Protection or action taken | Current status, owner and effectiveness check |
|---|---|---|---|
| S-01 | Polished fictional UI may be mistaken for implemented capability, passed tests or authorized decisions. | Concept labels, fictional-content notices, source links, transcripts and bounded review notes. | Open effectiveness question. Author controls documented; maintainer role must be accepted before release. Review complete images and ask whether sample results can be misread. |
| S-02 | Incorrect generated text can misstate workflow or authority. | Five targeted revisions, canonical source comparison and per-board correction notes. | AI-reviewed with limits. Human visual reviewer not appointed. Inspect full-size panels and compare critical distinctions before acceptance. |
| S-03 | Professional-practice imagery may imply current law, regulator endorsement, conformity or rights clearance. | Removed invented citations; currentness warning and explicit scope limits. | Current applicability unassessed. Maintainer must preserve bounded wording; qualified advice is needed only if a later use asks for such a determination. |
| S-04 | Image-only communication can exclude readers or create unreadable mobile text. | Six-step transcripts, source links, alt text, native controls and focus styling. | Browser/rendered accessibility unverified. Maintainer to appoint reviewer with time/tools; do not claim WCAG conformance from structural checks. |
| S-05 | Review pressure or ambiguous handoff may shift responsibility to a reader or person raising a concern. | Draft state, separate author/reviewer/decision roles, no review deadline and no automatic closure. | No workplace condition or harm was assessed. A maintainer must acknowledge any accepted review assignment; the reporter does not inherit the remedy. |
| S-06 | Private context or machine paths could enter shared documentation/prompts. | Workflow-only prompts, relative distributed paths, bounded text scan and no raw session logs. | Bounded checks passed. No full confidentiality, privacy, rights or secret-scan assurance; maintainer reviews intended audience before any broader publication. |
| S-07 | Editing or pushing the wrong checkout/branch could disturb other work. | Fresh clean checkout, verified baseline, one writer, explicit task branch and normal push. | Control execution observed for this change. Recheck identity/dirty state on every resumed turn; stop consequential writes on mismatch. |
| S-08 | Source drift may make an illustration misleading after acceptance. | Pinned source revision and direct-entrypoint blob binding; CI runs on skill-entrypoint changes. | Direct entrypoint drift is detected. Referenced-document drift is NOT automatically bound or triggered; reviewers must check relevant references when changing them. The full baseline remains recoverable by revision. |
| S-09 | A successful validator may be mistaken for visual, safety, legal or rights verification. | Separate byte checks, AI review method and pending human acceptance in records and tool output. | Structural behavior demonstrated by positive/negative checks only. Reviewer must retain these distinctions. |
| S-10 | A copied earlier local bundle may be mistaken for the latest corrected PR collection. | Declare the PR manifest/assets authoritative for this proposal; retain history rather than overwrite provenance. | Distribution/version concern remains until consumers use the PR snapshot. Confirm final revision when sharing; do not assume earlier exports were refreshed. |
| S-11 | Generated content and source-derived prompts cross a service boundary. | Used the authorized built-in image workflow with minimized summaries; recorded generator and lineage. | Provider terms and downstream rights not assessed. No unrestricted reuse or confidential-processing claim; destination review is needed for a new use involving protected data. |

For every open concern, the next action is a review task or documented disposition, not an assertion that risk is controlled. The maintainer/release decision role is a required role, not an assignment silently accepted by the user. If no person accepts authority and capacity, leave the PR draft and retain the unresolved record.

## 8. People, participation and handoff

The psychosocial safety baseline applies throughout: workload and pace, clear roles, meaningful choice, support, fair treatment, accessible participation and follow-through. This task did not collect worker testimony, assess staffing or inspect workplace conditions. It cannot establish psychological safety, accommodation effectiveness or absence of harm.

- **Workload:** Review can be split by board and performed at the reviewer's chosen pace. No tool timing or throughput target is used as a human performance expectation.
- **Clarity and control:** A reviewer may accept a bounded review, ask questions, limit scope, pause, defer or decline. Receipt of a request is not consent to undertake it.
- **Support:** The package provides full images, transcripts, sources and evidence limits. Where these are insufficient, keep the review open rather than require guessing.
- **Fairness:** Critique the artifacts and process. Do not score people by codes, willingness to proceed, presumed mental state or number of concerns raised.
- **Participation:** Offer a format and timing the affected reader can use. An alternate sensitive reporting route has not been configured or verified by this PR.
- **Follow-through:** An accepted review needs a named owner, next action and agreed revisit point. The author can repair documentation within scope; only an authorized human can accept release consequences.

| Role | Actual or proposed responsibility | State |
|---|---|---|
| User/requester | Defines scope and authorizes repository PR work. | Requests recorded; no final merge decision inferred. |
| Codex author | Creates artifacts, checks stated claims, preserves boundaries and reports limits. | Author actions performed; no professional safety authority claimed. |
| Visual/browser reviewer | Examines full images, transcripts and browser behavior. | Human not appointed or acknowledged; pending. |
| Repository maintainer | Chooses reviewers and makes repository acceptance/release decisions under actual repository authority. | Decision role required; no acceptance recorded. |
| Concern reporter | Supplies whatever evidence or feedback they choose. | Reporting does not assign them the remedy. |

No handoff is complete merely because this document names a role. Keep coordination with the current author/request owner until a recipient acknowledges the scope and accepts the task. No third party was contacted or assigned by this work.

## 9. Concern-response and escalation path

1. If an actual immediate danger is reported, use the applicable emergency, incident or stop-work channels and appropriate interim protection; this PR review must not delay it. This record reports no assessment of an actual emergency.
2. For ordinary artifact defects, record a concise evidence pointer on the PR. For sensitive personal or workplace concerns, use an authorized access-limited route instead of copying details into the gallery or broadly visible discussion. Access and confidentiality limits must be explained; no route is presumed safe just because it exists.
3. The request/decision owner confirms who has authority, capacity and resources for the next action, with an agreed revisit point. A person raising the concern is not made responsible for resolving it.
4. If the usual route is implicated, seek an appropriate alternate or independent route. If none exists or no authorized owner can act, record that process gap and escalate to an appropriate higher-level or independent function. Do not send the concern back through the implicated person.
5. While material interpretation or review remains unresolved, keep the PR draft and avoid representing the affected artifact as accepted operating guidance. Preserve the source, candidate and correction evidence.
6. Check the response against the concern before closure, including affected-person input where relevant and freely offered. Report what changed, what remains open and any limits. Uncertain effectiveness means keep open, revise or escalate.

This is a proposed response path for the artifact review. It is not evidence that an organization has implemented or validated a reporting system.

## 10. Verification boundaries and traceability

| Evidence class | What it establishes | What it does not establish |
|---|---|---|
| Source tree / Git revision | Which source files were in the scoped snapshot. | Truth, current regulatory applicability or completeness of every cited reference. |
| Git blob SHA and asset SHA-256 | Identity of the entrypoint bytes and selected image bytes. | Correctness of semantics, image text, rights or safety. |
| Validator and five mutation cases | The stated record, inventory, link and byte checks work for the exercised cases. | General software security or pixel verification. |
| AI visual inspection | The author inspected rendered boards and requested stated repairs. | Independent human acceptance or exhaustive accurate OCR. |
| HTML structure checks | Native controls, transcripts, links and offline resource constraints are present. | Actual layout, usable keyboard behavior, screen-reader quality or accessibility conformance. |
| CI job success | The committed job's configured checks completed successfully at its recorded revision. | Checks that were not configured, approval or deployment. |
| Draft PR and positive feedback | A proposal and conversational feedback exist. | Merge authorization, final review acceptance, consent of other people or risk acceptance. |

The structural validator binds skill entrypoints, not all transitive references. The engineering framework's reviewed blob is recorded above; its specific use in the final class-map correction is documented. Other reference claims have not been promoted into independently verified professional requirements.

The Python version locally used was 3.14; CI selected 3.11. No numerical reliability, schedulability, deadline, fault-tolerance, safety-integrity or risk-reduction claim is made. No named external standard was adopted as a conformity criterion for this documentation task. EGBC and PEO names identify the subjects of skill workflows; they do not establish obligations or endorsement for this package. A future standards-based assessment needs its own applicability, edition/source, authority, evidence and decision record.

## 11. Release, recovery and maintenance

Before merging, an authorized maintainer should resolve or explicitly disposition the following:

1. Review each final full-size image and transcript against the pinned source and relevant references.
2. Open the HTML gallery in a permitted browser at desktop and narrow widths; check navigation, transcript controls, focus visibility, image access and any overflow. Record actual observations without inferring formal conformance.
3. Confirm the current audience and intended use; preserve concept/currentness/rights boundaries.
4. Confirm the latest head's CI result and inspect the final diff, including this follow-up record.
5. Record acceptance, requested rework or deferral with the authorized person and any remaining conditions. Human acceptance remains pending until that happens.

If a misleading board is found before merge, keep the PR draft and repair or remove the candidate through a normal task-branch commit. After merge, an authorized maintainer can propose a normal revert or replacement with provenance and hashes updated. This record does not authorize a revert, deletion, force-push or deployment action. Preserve prior evidence rather than falsify history.

Revisit on a skill or referenced-document change, regenerated image, audience/publication change, missing/broken asset, report of misleading wording, browser/accessibility defect, unexpected generated content, data-classification change, or new professional reliance. Check the actual source snapshot before reusing exported copies.

## 12. Evidence links and closure status

- [PR #15](https://github.com/chrisjones77/skills/pull/15): proposal, branch history, reviews and live checks.
- [Initial feature validation run](https://github.com/chrisjones77/skills/actions/runs/39831849423).
- [Delivery checkpoint validation run](https://github.com/chrisjones77/skills/actions/runs/39831947091).
- [Feature specification](spec.md), [plan](plan.md), [tasks](tasks.md) and [verification](verification.md).
- [Markdown gallery](../../docs/skill-storyboards/README.md), [local HTML gallery](../../docs/skill-storyboards/index.html), [manifest](../../docs/skill-storyboards/manifest.json), [generation record](../../docs/skill-storyboards/generation.json) and [asset lineage](../../docs/skill-storyboards/asset-lineage.json).

Author documentation completion is separate from human acceptance and release. The remaining browser check and human review stay open in the task record; the PR remains draft. The practical safety commitment is to make limitations, review capacity and decision authority visible, and to preserve agency and evidence when the work needs to pause or change.
