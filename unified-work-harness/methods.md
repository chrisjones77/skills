# Using the harness for human-led reviews

Start with the decision someone actually owns. Ask who will rely on it, what harm an error could cause, which evidence is available, and whether the recipient has time and authority to review it. Write the answer where the decision will be made. A small reversible change can fit in a work item. Keep sensitive concerns in a restricted record and put only a permitted reference in wider circulation.

Use the case below to practise the methods independently of any model or network service. All organizations, roles, measurements and decisions in the case are fictional. The sample files use original synthetic material. The examples use the engineering-work-safety, call-and-response and AI lifecycle methods identified in the repository's work contract interface. The issue, coverage, fair-process, professional and advisory examples demonstrate their corresponding package methods.

## Begin with a decision and an offer

A stock coordinator must decide whether to try an AI-drafted shelf display in a training room. Revision 1 is the comparison point. Revision 2 is the candidate. A wrong label in the room is easy to reverse. The coordinator permits a 30-minute review of the supplied fixtures. The scope excludes changing a live display or contacting staff.

In a **human assignment**, the coordinator offers the review to an analyst who can accept, question the evidence, defer to a staffed shift or decline. Record the analyst's actual answer and the revision they saw. In a **hybrid assignment**, a person can authorize a separate agent task to inspect the synthetic files and return a candidate finding. The analyst still needs time to reproduce that finding, inspect the visual, and explain what it means. Record a separate recipient and scope for each part. Open the review only after the recipient accepts and explicitly starts it.

Use one working record with the following fields. Reopen the same record for rework so that its history follows the decision.

| Field | What to enter |
| --- | --- |
| Decision and scope | Intended use, decision owner, allowed actions, exclusions, people affected, version and due date. |
| Evidence and review | Each criterion, its source, a repeatable observation, finding, limitations and reviewer. |
| Conditions to pause | Missing authority, unsafe or unstaffed work, disputed evidence, exhausted time and changed scope. |
| Ownership and follow-up | Who owns the decision and remedy, what happens meanwhile, next response time, recheck trigger and actual disposition. |

## Coverage review across code, data, documents and visuals

The coordinator sets four criteria **before** inspecting the candidate. A zero count must say “Empty.” A missing count must say “Unobserved.” Readers need a correction owner in the guide and a written status on the card. A separate proposed freshness claim requires a timestamp.

Use both revisions from the same checkout. Record its commit, verify the working files match it, and record the revision names and result for each check. From the package directory, inspect the input, then run the two classifier revisions:

```sh
cat examples/methods/samples.csv
node examples/methods/labels.mjs r1
node examples/methods/labels.mjs r2
```

Open each guide and render both cards at their native size. Compare the observed results with the acceptance criteria and record any missing evidence separately. The code prints A, B and C in input order.

| Item and criterion | Evidence at r1 | Evidence at r2 | Finding and consequence |
| --- | --- | --- | --- |
| Data distinguishes measured zero from absence | Input row A contains 0, B contains an empty field, C contains 2 | Both classifier revisions use these same three rows | Supported for this fixture. The file has no observation time. Freshness is unknown at both revisions. |
| Classifier preserves absence | Output reads A Empty, B Unobserved, C Available | Output reads A Empty, B Empty, C Available | B regressed. The new conversion treats an empty string as numeric zero. Hold the candidate. |
| Guide explains how to correct a disputed count | Guide names the stock coordinator | Guide explains only Empty and Available | Correction route and explanation of missing data regressed. Restore both and check that the named role can receive a report. |
| Visual conveys status in words | Bin B displays “Unobserved” | Bin B displays a grey circle beneath its name | The written status disappeared. Require the status text and inspect the revised rendering. Assistive technology and comprehension require their own checks. |

Source fixtures: [data](examples/methods/samples.csv), [classifier](examples/methods/labels.mjs), [first guide](examples/methods/guide-r1.txt), [second guide](examples/methods/guide-r2.txt), [first card](examples/methods/card-r1.svg), [second card](examples/methods/card-r2.svg).

## Triage an issue and deliver advice

In the fictional backlog, **W-12** covers the conversion of a blank count to zero, with the analyst already listed as reviewer. **W-18** covers delayed feed delivery. A proposed new item, **W-21**, reports bin B falsely marked empty. Compare intended outcomes and reproduction conditions. Recommend attaching the three-row reproduction to W-12 and classifying W-21 as a duplicate. W-18 cannot resolve the classifier defect. If freshness is later required, define its source and timing criterion separately. The removed status text and correction route have separate owners and acceptance criteria; link them as related work.

Use the team's vocabulary. W-12 is a correctness defect in the display, a blocker **for this trial**, ready for reproduction from the fixture. The repair has no assigned capacity until someone accepts it. The reviewer can recommend that disposition. The backlog owner records any issue changes under their own authority.

An advisor can now hand the coordinator a short decision record:

| Evidence class | Example entry |
| --- | --- |
| Observed | The supplied r2 classifier prints “B Empty” for a blank observation. The r2 card shows a circle without a written status. |
| Reported | The facilitator says trainees found the display confusing. A session count and participants' accounts are unavailable. |
| Inferred | Displaying a measured zero and an unknown count alike could lead a trainee to skip checking the shelf. Frequency and real-world effect remain unknown. |
| Advice and alternatives | Keep the existing training display. Compare a repaired r2 with r1 on the three rows, then ask an available participant to interpret both a zero and a missing count. |
| Handoff | Coordinator owns trial admission. Analyst supplies the reproduction. Content owner restores the guide and visible status. Coordinator revisits after those checks and a reviewer is available. A freshness claim requires additional evidence. |

A qualified person decides whether the observation is sufficient for its intended use. In this low-consequence case, the coordinator can approve a reversible **training** trial within the stated authority. Establish the prior display as the rollback point, name a facilitator to observe misread statuses, and stop the trial on any repeated confusion. Hand off the exact version, findings, owner, rollback and next review time before starting.

## Workload, concern handling and fair process

If the reviewer has no time budget, the condition is unsafe, or the named reviewer is unavailable, hold dependent work. Give the decision owner a concrete choice such as postponing, reducing scope, or arranging trained relief. Record interim protection and the next staffed checkpoint. A deadline or a response from an agent cannot establish a person's capacity or consent. For an immediate hazard, use the site's established protective and escalation procedure first.

The following exercise continues the same work identity through two revisions:

| Event | Protected record and next action |
| --- | --- |
| W-12, r2, concern C-4 | Facilitator reports that a counting shift missed the entry. Analyst observes that the fixture contains a blank. The cause is disputed. Record the report as attributed, preserve the raw row and withhold any finding about an individual. Coordinator pauses trial admission. |
| Response opportunity | Offer the counting team the evidence and an accessible private route to respond on their next staffed shift. If the coordinator is implicated, route to a different responsible reviewer. Silence leaves the cause unresolved. Record only the evidence needed for the display decision. |
| Response and decision | Team reports the training feed deliberately omitted a count. The fixture establishes the blank but cannot distinguish its origin. Independent reviewer records “cause unresolved; display regression reproduced.” The team can append a correction or ask for independent reconsideration. Coordinator continues the hold because the defect can be fixed regardless of cause. |
| W-12, r3 proposal | Attach C-4, the reply, outstanding accessibility check, and last decision to r3 before reoffering. If a replacement item is necessary, cross-reference both identities and carry the hold forward. Return the proposed remedy to the affected team and allow the reviewer to defer. |
| Reassessment | A new fixture result, a restored label and guide, and an available reviewer let the owner reconsider trial admission. Record the worker's fresh acceptance of the changed scope and explicit resume before restarting. A cause investigation may remain open after a display remedy. |

The reporter owns their account. The coordinator owns interim protection and follow-up. Protect access to personal accounts, invite corrections, and check whether people can raise concerns without penalty. Escalate unaddressed concerns to the next responsible decision owner and retain the unresolved disposition through handoff.

## Professional review and a higher-consequence AI use

A facilities manager proposes adapting the same display to guide responses to equipment alarms. That new intended use affects operators and changes the consequences of a missed reading. Open a separate assessment linked to the training defect and its unresolved finding. The earlier permission covered the training room.

1. **Discovery.** Record the affected site and jurisdiction, owner, proposed operator action, actual sensor units and failure states, and existing operating procedure. In this fixture the site, jurisdiction, source timing and equipment limits are unknown. Ask the responsible organization to identify applicable requirements, editions and basis of obligation. Keep each candidate requirement open until someone with authority establishes applicability.
2. **Professional responsibility.** A software reviewer can reproduce the classifier error. The facilities manager must identify a competent professional for the equipment and jurisdiction, confirm their authority for this intended use, and arrange independent checking appropriate to the consequences. Record competence, decision authority, reviewer availability and unresolved requirements. Until these are established the decision is “hold operational use.”
3. **Assurance.** In an authorized isolated simulation, derive expected outcomes from the approved site requirements. Challenge missing, stale, conflicting, late and plausible-but-incorrect readings. Include operator interpretation under workload, alarm recovery and a handoff between shifts. Have a qualified reviewer examine discrepancies and affected staff challenge assumptions. The training fixture demonstrates one software failure mode only.
4. **Operation and transfer.** Continue the established operational procedure while the assessment is held. Before any future pilot, the operations owner records who monitors missed or misleading signals, who may stop the pilot, the fallback procedure, rollback owner and how to reach the responsible reviewer. A receiving shift confirms the procedure, capacity and scope. Escalate if coverage is unavailable.
5. **Decision.** The illustrative review records a production hold, the facilities manager as follow-up owner, and qualified review as a prerequisite for revisiting. New sensor semantics, site, jurisdiction, model, display revision, or intended use trigger reassessment. Record the responsible person's actual decision and its limits in the operational record.

These examples end at a specific human decision. Retain the evidence revision, unresolved items and decision owner so another reviewer can challenge or repeat the assessment.
