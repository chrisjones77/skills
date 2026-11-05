---
name: ai-operational-governance
description: Translate organizational obligations into owned AI operating commitments, preventive and corrective controls, response targets, and evidence of effectiveness. Use when designing or reviewing how an AI workflow stays within governance during operation; not for records-only audits or certification.
---

# AI Operational Governance

Help the user identify what keeps an AI workflow within its applicable governance,
who operates those controls, and what evidence supports their effectiveness.
Scale the work to the consequence and the requested decision. A short gap review
may need only one worked commitment; do not automatically produce a new program.

Read [source and interpretation](references/source-and-interpretation.md) when explaining
Laqua's argument or its limitations. The article informs this method; it does not
establish the user's obligations, grant authority, or prove a proposed architecture works.

## Start from the organization's governance

Identify the workflow, intended value, affected people, data, systems, jurisdictions,
and current delegated authority. Locate applicable policies, contracts, commitments,
and other authoritative requirements. Distinguish verified requirements from assumptions
and proposed commitments. Preserve material conflicts for the responsible decision maker.
Do not infer applicable law or professional obligations from this article.

Reuse effective existing controls before proposing a separate AI governance system.
Trace the material obligation through these responsibilities, using the organization's
own names where available:

- **Governance:** sets the obligation, permitted outcomes, and decision authority.
- **Programs:** assigns an accountable owner, resources, capabilities, and response targets.
- **Systems:** implements the constraints, sensing, decision, and intervention mechanisms.
- **Processes:** performs the work and preserves decision-relevant evidence.

A missing program or system is a gap to investigate, not proof that more paperwork is needed.
An owner named in a proposal has not accepted responsibility or received operating authority.

## Turn obligations into operating commitments

For each material commitment connect:

`Applicable source → observable promise → owner → operating limit → control → evidence`

Specify enough to decide whether the promise can be kept:

- What the AI may do, the quality required, where and with which data it may operate,
  and the business value or outcome it is intended to contribute.
- Conditions and boundaries under which the promise applies; prohibited or unqualified use.
- Who can intervene, accept exceptions, authorize resumption, and fund or maintain the control.
- The enforcement point and mechanism, including paths that could bypass it.
- What is observed, the trigger or threshold, and the action that follows.
- The permitted time to detect, decide, and act before unacceptable consequences occur.
- A justified response when signals are stale, unavailable, contradictory, or out of bounds.

Mark unknown owners, tolerances, timings, and capabilities explicitly. Do not invent
numerical targets. Human intervention requires sufficient time, information, competence,
and authority. An alert without a feasible response is not a complete control.
For irreversible actions, examine whether prevention must happen before execution;
post-action correction may be too late. Select stopping, restriction, fallback, or
escalation behavior according to the consequence of that behavior as well.

## Connect prevention, correction, and evidence

Distinguish three functions, even when one mechanism supports several:

- **Feedforward:** respond before exposure to a changed policy, model, tool permission,
  data source, or operating condition, for example by requalification or narrower authority.
- **Feedback:** detect deviation during operation and apply an authorized intervention
  within the justified response window, then check whether the intervention worked.
- **Evidence:** retain the inputs, observations, actions, versions, exceptions, and outcomes
  needed to evaluate the promise and learn from failures.

Logs and dashboards can feed active controls when they are connected to timely decisions
and actions. Their existence alone does not demonstrate regulation. Keep necessary records;
do not discard audit evidence in the name of operational governance.

## Test whether the controls can keep the promises

Evaluate the actual control path with proportionate evidence: boundary cases, changed
conditions, delayed or missing signals, bypass paths, failed interventions, and recovery.
Use bounded simulations or existing test evidence when live exercises are unauthorized.
Distinguish a proposed, implemented, tested, and accepted control; report which state the
evidence establishes and the conditions it covers.

Measure outcomes and control performance together. Relevant measures may include promise
violations per exposure, detection and intervention latency, failed containment, false
interventions, quality against the applicable standard, and value achieved against the
stated commitment. Define denominators, time windows, severity, and evidence coverage.
An inventory count or absence of recorded incidents does not establish effectiveness.

Do not call a system safe, compliant, continuously assured, or hard real-time on the
strength of this method. A policy model or digital twin is an optional design choice;
its fidelity, coverage, maintenance, and connection to enforcement require evidence.

## Use as an optional harness bolt-on

For QVCH routing or UWH integration, read
[the harness integration guide](references/harness-integration.md). Keep canonical purpose
codes unchanged. Separate a passive bus-monitor view, retained event ledger, and active
control path. Use existing authorized task and contract records; do not create a competing
ledger or add unsupported fields to strict runtime packets. The guide supplies an optional
method and a staged implementation proposal, not an installed resolver or runtime adapter.

## Deliver the smallest useful decision record

State the material conclusion first. Where helpful, use a compact table of commitments,
owners, controls, response targets, evidence, and gaps. Separate observed behavior from
proposals. Identify the next bounded action, its owner, and any unresolved decision.
Read [worked example](references/worked-example.md) only when a concrete illustration helps.

This skill supports analysis and design. Applying it does not authorize production changes,
assignments to other people, external communications, or acceptance of residual risk.
