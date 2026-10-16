# Engineering Work, Safety, and the 0xF Modes

## Inspiration and scope

This framework draws on real-time systems work, where engineering attention spans constructing and maintaining systems, diagnosing faults, managing constraints, communicating operational state, and considering the consequences of delayed or missed behavior. The modes generalize that experience into prompts for discussion across engineering work. They do not encode a particular real-time architecture, timing model, safety case, or verification method.

## Purpose

**Every worker deserves a safe workplace.** Responsibility for providing safe work rests with those who design, deploy, manage, and organize it; workers should not have to earn safety by raising concerns or proving harm.

Consider safety across **silicon, flesh, and in between**: the technology and automation; the people affected by the work; and the interfaces, procedures, handoffs, monitoring, management decisions, and organizational conditions connecting them. Assess these parts together: technically acceptable operation does not by itself establish safe working conditions, and supportive working conditions do not remove risks created by unreliable technology or unsafe interfaces.

Psychosocial safety is a baseline engineering commitment, independent of whether this reflection harness is used; it is not an optional mode or add-on. Engineering work should be considered in light of its effects on workload and pace, role clarity and control, communication and change, support and resources, fairness and respect, and worker voice. These concerns apply throughout the work, whether or not a particular mode prompt makes them salient.

When delivery pressure conflicts with a credible safety concern, the organization must make space to assess and address the concern before proceeding as planned. Schedule, cost, or convenience alone do not justify leaving a material risk unexamined. If a material risk remains unresolved, it must have a named decision owner, documented rationale, affected-person and system impacts, interim protections, and a review point. The decision owner should have appropriate authority and access to the resources needed to act. If no owner can resolve the risk, escalate it through a defined route and keep it visible until it is addressed or an authorized decision is recorded with its rationale and safeguards. This is an aspirational commitment; actual decision criteria and authority must be defined by the organization.

These are aspirational commitments in this framework, not evidence that an organization has fulfilled them. The framework supports reflection; it does not by itself establish that a workplace is safe or that psychosocial hazards have been adequately controlled.

Within these commitments, the 0xF Modes name different kinds of attention that engineering work may need. They are a reflective tool for making the nature of work visible, noticing neglected concerns, and prompting useful questions during planning, review, incident learning, and retrospectives; the organizational commitments above apply whether or not the modes are used. The hexadecimal framing offers a simple sequence: **0x0** orients the work before selecting among the fifteen named modes, **0x1–0xE** cover the working lenses, and **0xF** holds the future-facing lens. This is a mnemonic structure, not a claim that the modes form a mathematically complete system.

A mode is a **lens on the work**, not a job title, personality type, seniority level, team, phase gate, control, or measure of individual performance. Anyone may use any mode. Work can involve several modes at once, and the relevant modes can change as the work changes. Completing a mode prompt does not, by itself, show that a risk was controlled or a requirement was met. The Asimov reference is a literary prompt to ask how human–technology relationships should be governed and whose safety and agency count. It does not supply the answer, define enforceable rules, or substitute for responsibilities, requirements, or evidence.

## The modes

| Code | Mode | Work focus | Review prompt |
|---|---|---|---|
| 0x0 | **Orient** | Clarify the work, context, desired outcome, and constraints before choosing a lens. | What are we looking at, why now, who is affected, what timing or response expectations matter, and what would a useful outcome look like? |
| 0x1 | **Builder** | Create a feature, system, or capability. | What are we making, for whom, and what observable result—including relevant timing behavior—would show it works? |
| 0x2 | **Gardener** | Maintain, refactor, and improve what already exists. | What needs care, simplification, or repair to remain useful and sustainable, including any timing assumptions that maintenance could change? |
| 0x3 | **Doctor** | Diagnose and resolve a failure or urgent defect. | What is failing, what evidence do we have, what timing or deadline was affected, and what action restores safe operation or an acceptable degraded state? |
| 0x4 | **Explorer** | Investigate an unknown, technology, or method. | What uncertainty matters, and what bounded inquiry could reduce it? |
| 0x5 | **Librarian** | Record, organize, and make knowledge findable. | What should be recorded so another person can understand, operate, or continue this work? |
| 0x6 | **Ambassador** | Communicate and engage with stakeholders. | Who needs to know what, when, and in what form to make a sound decision or use the result? |
| 0x7 | **Architect** | Shape sustainable systems, interfaces, and processes. | How does this fit with surrounding systems, constraints, timing assumptions, failure modes, and future maintenance? |
| 0x8 | **Advocate** | Represent user needs, ethical concerns, and sound practice. | Whose needs, rights, or risks might otherwise be missed? |
| 0x9 | **Strategist** | Choose priorities in light of longer-term aims. | Why is this the right work now, and what are we choosing to defer? |
| 0xA | **Mentor** | Help people learn and grow through the work. | What knowledge or capability can be shared or developed here? |
| 0xB | **Auditor** | Check work against explicit requirements or criteria. | What criterion are we checking, what evidence is relevant, and what remains unverified? |
| 0xC | **Scout** | Find risks, gaps, dependencies, and weak signals. | What could go wrong or surprise us—including missed deadlines, overload, or loss of observability—and how might we notice early? |
| 0xD | **Steward** | Care for capacity, resources, continuity, and well-being. | Is this work sustainable for the people, time, and resources involved? |
| 0xE | **Facilitator** | Help people coordinate, decide, and move through blockers. | Which dependency, decision, or handoff needs attention to let work proceed? |
| 0xF | **Visionary** | Imagine and articulate future directions or capabilities. | What future possibility are we trying to make thinkable, and what present signal could test its value? |

## How to use the harness

1. **Orient (0x0).** State the decision, deliverable, incident, or learning goal; note the context, affected people, constraints, and desired outcome.
2. **Choose one primary mode.** Pick the lens that best describes the work receiving attention now.
3. **Add up to two companion modes.** Choose these to expose important obligations or blind spots. Do not try to use every mode on every task.
4. **Answer the prompts concretely.** Record evidence, a decision, an owner, or a next action. A mode label by itself is not evidence that the work was done.
5. **Revisit when the work changes.** An investigation may become a repair; a prototype may become a maintained product. Update the selected modes accordingly.
6. **Apply the optional real-time lens when relevant.** Use the questions below where timing, ordering, failure, or recovery behavior matters; skip them when they do not fit the work.
7. **Check psychosocial safety throughout.** Consider how the work affects workload and pace, role clarity and control, communication, support, fairness, and worker voice. Respond to concerns proportionately; do not make people’s safety depend on whether a mode was selected.
8. **Review the usefulness.** Ask which lens helped, what was missed, and whether the set of prompts added clarity or just ceremony.

### Optional real-time lens

Use these prompts when the work involves timing, ordering, response, or recovery constraints. They are optional discussion prompts; answering them does not establish timing correctness, fault tolerance, or safety.

- **Timing:** What deadlines, response times, or ordering constraints matter?
- **Failure and human impact:** What happens when a deadline is missed or a component fails, and who may face harm or extra workload?
- **Degraded operation:** What reduced service is acceptable, and for how long?
- **Observability:** What signals would show the system is late, overloaded, or failing?
- **Recovery:** How does it return to normal operation, and what evidence confirms recovery?

### Psychosocial safety baseline

Use these questions throughout the work, not only when organizational change is formally underway. Invite input from affected workers in a safe and accessible way; explain how their input will be considered and what follow-up is possible. When a concern is raised:

1. **Respond to immediate danger first.** If someone may face imminent harm, use applicable emergency, incident, or stop-work channels and take appropriate interim protective action. Do not wait for this reflection process to finish.
2. **Receive the concern respectfully.** Listen without blame or pressure, clarify what response the person is seeking, and avoid promising confidentiality beyond what can be maintained. Do not tolerate retaliation. If the concern involves the usual manager, owner, or reporting route, use an appropriate alternate or independent route where available. If no safe alternate route exists, record that as a process gap and escalate it to an appropriate higher-level or independent function; do not route the concern back through the implicated person.
3. **Record only what is needed.** Use an appropriate, access-limited channel; avoid unnecessary personal or sensitive details. Explain who may access the record, for what purpose, and any limits on confidentiality.
4. **Clarify and assign follow-up.** Hear the affected person’s perspective and any requested response. The appropriate owner determines and records the next step and timeframe. If no owner can resolve the risk, assign it to an appropriate decision-maker and escalate through a defined route. Keep it visible and identify interim protections while a material risk remains open.
5. **Check effectiveness before closure.** At an agreed review point, examine whether the response reduced the risk in practice and whether affected people’s concerns remain. Keep the risk open, revise the response, or escalate if effectiveness is uncertain or inadequate. Record the evidence and rationale for closure.
6. **Report back.** Tell affected people what action was taken, what remains open, what interim protections apply, how effectiveness will be checked, and any limits or reasons action cannot be taken.

These prompts support reflection and do not replace a systematic, context-specific psychosocial hazard assessment, incident or reporting procedures, or any required consultation process.

- **Workload and pace:** Is the amount, urgency, or predictability of work manageable, including during peaks and recovery periods?
- **Role clarity and control:** Do people understand responsibilities, decision authority, and the choices they can make?
- **Communication and change:** Are reasons, impacts, uncertainties, and decisions communicated in time for people to respond?
- **Support and resources:** Do people have the staffing, tools, training, time, and help needed to do the work safely?
- **Fairness and respect:** Are decisions and feedback handled consistently, respectfully, and without retaliation?
- **Worker input and follow-through:** Who is affected across the system lifecycle and operational boundary—including contractors, maintainers, operators, users, customers, and the public where relevant? How can they contribute, how will input inform decisions, and how will actions or limits be reported back?
- **Accessible and safe participation:** Who may be excluded by the default language, format, schedule, location, reporting route, or power relationship? What accessible or alternate channel is available?

If this work relates to a formal compliance obligation, use this harness only to support discussion. Separately identify the applicable requirement, its scope, the responsible owner and decision-maker, the evidence needed, and how gaps will be recorded and followed up. Do not infer compliance from a selected mode or completed record.

### Lightweight record

- **Work / decision:**
- **Affected people and systems (including interfaces and work conditions):**
- **Primary mode:**
- **Companion mode(s):**
- **Evidence or answer:**
- **Open question / risk:**
- **Interim protection while risk remains open:**
- **Escalation route if no owner can resolve the risk, the owner lacks authority or resources, or no safe reporting route exists:**
- **Next action:**
- **Next action owner (also the risk response owner unless different):**
- **Separate risk response owner, if responsibility differs:**
- **Effectiveness check and evidence:**
- **Risk status / closure rationale:**
- **Revisit when:**

For work with a defined compliance obligation, track these separately from the mode record:

- **Requirement / source:**
- **Scope and applicability:**
- **Accountable owner / decision authority:**
- **Evidence required and evidence located:**
- **Gap, disposition, and follow-up:**

## Interpreting overlaps

Some modes naturally touch the same work. Treat overlap as a prompt to clarify the question being asked, not as a defect to eliminate:

- **Architect / Strategist:** system shape and constraints versus priority and timing.
- **Advocate / Steward:** whose needs and risks count versus whether the work is sustainable for the people and resources involved.
- **Scout / Auditor:** what might be wrong or missing versus whether stated criteria are met by available evidence.
- **Builder / Gardener:** adding capability versus improving or sustaining existing capability. A change can do both.
- **Ambassador / Facilitator:** sharing information with stakeholders versus helping participants coordinate and reach decisions.
- **Visionary / Explorer:** imagining a possible direction versus gathering evidence about an uncertainty within it.

## Boundaries and cautions

- The modes support discussion; they do not assign authority or accountability. Explicit owners and decision rights still need to be established separately.
- “Doctor” is a metaphor for diagnosis and response. It does not imply that every defect is an incident or that urgency removes normal safety, privacy, or change controls. For real-time systems, this prompt does not determine acceptable deadlines, failure responses, or degraded modes; those need system-specific requirements and analysis.
- The real-time systems inspiration does not make this harness a timing analysis or verification technique. It does not establish schedulability, bounded response, deadline compliance, fault tolerance, or safety. Use the system’s defined requirements, models, measurements, and verification methods for those claims.
- “Auditor” is a review lens, not an audit method. It does not establish compliance. A formal compliance assessment needs a defined requirement and scope, appropriate reviewer and method, relevant evidence, documented findings, and follow-up. A mode label or completed harness record is not a control, audit, certification, or proof of conformity.
- The harness does not assign independence, authority, or decision rights. Define these in the surrounding governance or review process when they matter.
- If applying the harness during organizational change, use a separate, context-specific psychosocial hazard assessment. The responsible change process should determine and document when worker consultation is required or appropriate, who needs to be involved, how they can contribute safely and accessibly, how their input will inform decisions, and how outcomes will be communicated. The modes can surface questions about workload, autonomy, communication, role clarity, support, and fairness; they do not replace a systematic assessment or consultation process.
- The original document associates some modes with SW1, SW2, and Apprentice roles. This harness does not preserve those as restrictions: learning, communication, review, maintenance, and risk awareness can be shared across experience levels, with appropriate support and authority.
- Do not score people by mode use or infer personality from which modes they choose. Use the prompts to examine the work and the conditions around it.
- Use of this reflection harness is voluntary and should be proportionate. If it does not improve clarity or decisions, simplify or set it aside. The safety responsibilities and baseline principles described here are not optional. Delivery pressure does not remove the responsibility to examine credible safety concerns or to keep unresolved material risks visible and assigned.

## Assessment

Inspired by real-time systems work, the framework’s useful contribution is its broad picture of engineering: creating and maintaining systems is only part of the work; diagnosis, knowledge, communication, risk, learning, coordination, and care also matter. It holds safety across silicon, flesh, and the interfaces and conditions between them, with every worker’s right to a safe workplace as a baseline responsibility. The modes can prompt attention to timing expectations, deadline effects, degraded operation, observability, and recovery where those concerns apply, without forcing every project into one workflow.

The original list combines modes at different levels—hands-on activity, system design, coordination, organizational planning, and future direction. This refactor keeps all sixteen identities while treating them as complementary lenses, not equivalent process stages. The overlap notes make several close pairs easier to distinguish, and the prompts turn abstract labels into questions that can elicit evidence or action.

The 0xF modes are best used lightly in planning, reviews, incident learning, and retrospectives as one tool within the broader safety commitments. Their value should be judged by whether they improve shared understanding, reveal a consequential omission, or lead to a clearer decision. The commitments remain relevant even when no mode or harness record is used. The modes should not become a checklist quota, a performance rubric, an org chart, or evidence of standards conformity. It also does not verify real-time behavior or replace system-specific requirements, timing analysis, testing, or other engineering assurance. When a real compliance obligation applies, connect discussion to the named requirement and a separate evidence-based process; mode selection and completed prompts are not proof that a risk was assessed or managed.


## Provenance

Modes 0x1–0xF and their initial focus statements are derived from *Engineering Super Soft Reboot 2025*, dated 2025-01-25, pages 26–28. Mode 0x0, the inspiration and scope note, timing-sensitive wording, optional 0xF reflection harness, optional real-time lens, psychosocial safety baseline and concern-response path, affected people and systems and next action and conditional separate risk response owner fields, purpose, prompts, usage steps, overlap distinctions, boundaries, and assessment above are editorial interpretation for this draft. The source document presents an aspirational proposal; this draft does not claim that the proposed roles, teams, or practices were implemented.
