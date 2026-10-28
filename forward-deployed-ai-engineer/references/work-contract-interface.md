# Skills and work contract interface

Skills supply methods and judgment. A work contract records a bounded assignment,
the recipient's disposition, evidence and continuity. A runtime may check some of
those relationships; its capabilities and permissions must be established
separately. A skill can be used without a Hypervisor, and a Hypervisor can record
work without loading these skills.

Use this interface when a task uses a work contract or crosses a material handoff.
For routine collaboration, a clear brief and explicit response can be enough.
Reuse the authorized task record instead of creating a second tracker. Worker
safety responsibilities remain in force at either level of ceremony.

## Responsibilities

| Source | Supplies to the assignment | Retains responsibility for |
| --- | --- | --- |
| engineering-work-safety | Orientation, optional purpose code and command, outcome/evidence questions, material concerns | Engineering judgment, affected interests, capacity and scheduling assumptions |
| call-and-response-harness | Actual reply, disposition, clarification obligation and escalation route | Recipient choice, accessible participation and caller-owned follow-up |
| harnessed-dispatch | Dispatch kind, exact scope, permitted effects, workspace and writer evidence, return evidence | Selecting an available adapter, isolation, acknowledged transfer and primary verification |
| forward-deployed-ai-engineer | Risk-proportionate method, authoritative inputs, verification and revisit criteria | Adequacy of assurance and the actual authority needed for consequential action |
| Project or domain overlay | Source identities, local procedures and domain acceptance criteria | Canon, privacy, professional requirements and project-specific decisions |
| Contract runtime | Recorded revisions and responses, supported transition checks and diagnostics | Only the checks demonstrated for its declared implementation and operating envelope |

## Distinct namespaces

- **Engineering purpose:** 0x1–0xF classifies the work; 0x0 orients it. The concrete command still needs an outcome and boundaries.
- **Dispatch kind:** Review, Research or Implementation describes the working arrangement. It is not an engineering-purpose code.
- **Transfer kind:** clean-handoff, takeover or return describes an ownership-transfer procedure.
- **Recipient reply:** preserve actual words. Optional BH posture and response words do not establish acceptance or authority.
- **Workflow dimensions:** recipient disposition, intake decision, execution, review and communication turn remain distinct.

Do not infer that a runtime supports a field or transition because the skills
describe it. In particular, optional posture, scheduling and intake detail may
remain in an appropriately protected linked record rather than a minimized
runtime packet.

## Assignment handoff

Before offering work, establish the plain outcome, scope/exclusions, permitted
effects and authority source, recipient and assigner, acceptance evidence and
reviewer when review is required. Record a stable work identity and assignment
revision when continuity matters. Git revision and assignment revision describe
different things.

When an adapter uses a digest, bind acceptance to the exact assignment represented
by that digest. A meaningful change requires a revised offer and fresh recipient
disposition. A workspace check is separate from acceptance. Do not overwrite an
accepted record or silently infer acceptance from an existing active task.

A skill's completed artifact is a reported result with evidence pointers and
limitations. It is not automatically reviewer acceptance or closure. An artifact
digest identifies bytes; it does not establish their truth, rights or adequacy.

## Clarification and recipient choice

1. Pause only the consequential work that depends on unresolved meaning, preserve its checkpoint and name who owes the answer.
2. The assigner clarifies from available context or records a named owner for the required decision.
3. The worker reassesses the answer. If ambiguity remains, route the question to an appropriate human decision owner; use an alternate route if the ordinary one is unavailable or implicated.
4. A human answer returns for worker reassessment. Understanding remains separate from acceptance, and acceptance remains separate from resumption.
5. Decline, deferral and withdrawal remain valid. Preserve the concern and caller-owned next checkpoint; do not require a worker to mark it clear to leave the exchange.

If an implementation cannot revise or reassign a pending clarification, retain
the paused record and name the caller's next action. Do not edit the packet by
hand, invent a resolved concern, or create a fresh ID to bypass the missing path.
The implementation gap does not create an obligation for the worker to provide
more participation. Immediate protective action uses the applicable safety route
without waiting for this exchange.

## Runtime and adapter preflight

Record the selected runtime/source revision, packet and contract version, actual
workspace, effective permissions and supported operations at a proportionate
checkpoint. Confirm, rather than infer, support for offers, revision-bound
acceptance, clarification exits, alternate routes, review, transfer and recovery.
Unknown support is unknown. No installed watcher, resolver or adapter is implied
by this document.

The source record remains authoritative until a receiving adapter can preserve
its assignment identity, scope, acceptance, concerns, review and evidence
provenance. Verify write ownership separately. Report unsupported fields or
transitions rather than dropping them. A protocol can describe a clean handoff
even when the selected contract implementation cannot execute one; dependent
writes remain paused until an authorized compatible path is established.

Keep compatible writers on the record. An older reader that ignores an optional
contract extension may also ignore its gates. Read compatibility is not evidence
of enforcement compatibility. Do not install or activate a different writer as
an implicit workaround.

## Consistency checks and evidence

Record a named finding, its evidence, consequence and next owner/action when a
material mismatch is found. Use pass, mismatch or unknown for the stated check;
avoid a single overall "CRC passed" conclusion.

| Relationship | Appropriate check |
| --- | --- |
| Assignment and acceptance | Exact identity/revision comparison when the runtime supports it |
| Concern and response | Retained question, opening context, answer identity and worker reassessment |
| Role and transition | Declared actor and allowed state change; label comparison is not authentication |
| Scope and authority | Compare recorded bounds; verify actual authority separately |
| Outcome and evidence | Reviewer assesses adequacy; populated fields alone leave it unknown |
| Report and closure | Review decision and unresolved follow-up remain explicit |

Internal replay and digests can expose inconsistencies without providing an
authenticated, append-only history. Do not transfer a local test result to a
different runtime, merged base, installed skill revision or operating envelope.

## Worked compatibility checks

- **Revision:** a diagnostic brief becomes a repair request. Preserve the diagnostic evidence, establish actual authority for the changed scope/effects, and obtain a fresh disposition. If the runtime cannot represent those changes, report the gap instead of modifying the accepted record. A purpose change is not permission to edit.
- **Decline:** a worker declines while an answer awaits reassessment. Preserve the concern and caller checkpoint; a missing reoffer path is not a requirement to reassess.
- **Transfer:** an adapter lacks contract transfer. Retain current ownership/no-writer state as applicable and report the missing mapping. A legacy handoff command is not a substitute unless its use is verified to preserve the contract.
- **Review:** the artifact hashes correctly but does not answer the criterion. Record the byte match and the substantive gap separately; request rework rather than closing from the hash.
- **No runtime:** keep the same distinctions in a bounded plain-language brief and response. Do not claim automated checks occurred.

These are review scenarios, not a new executable schema or validated measure of
worker outcomes. Project overlays own exact commands, field mappings, pinned
implementation sources and remaining capability gaps.

## Packaging maintenance

The four participating skills bundle an identical copy of this interface in
`references/work-contract-interface.md` so directory-only installation works.
When this canonical guide changes, refresh those copies and verify byte equality;
repository documentation continues to link here. No installation is performed
by this guidance.
