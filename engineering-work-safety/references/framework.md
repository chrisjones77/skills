# Engineering Work, Safety, and the 0xF Modes

## Inspiration and scope

This framework applies real-time systems engineering discipline to software engineering practice. Code 0x0 frames work before dispatch; codes 0x1–0xF identify task classes. Each dispatched work item pairs a class with a concrete task and command word that states the requested action. Scheduling then makes explicit what work is released, what takes precedence, what constraints apply, and how lateness, overload, interruption, and recovery are handled. The code and command provide a shared vocabulary; they do not, by themselves, define an executable scheduler or guarantee timing behavior.

## Purpose

**Every worker deserves a safe workplace.** Responsibility for providing safe work rests with those who design, deploy, manage, and organize it; workers should not have to earn safety by raising concerns or proving harm.

Consider safety across **silicon, flesh, and in between**: the technology and automation; the people affected by the work; and the interfaces, procedures, handoffs, monitoring, management decisions, and organizational conditions connecting them. Assess these parts together: technically acceptable operation does not by itself establish safe working conditions, and supportive working conditions do not remove risks created by unreliable technology or unsafe interfaces.

Psychosocial safety is a baseline engineering commitment, independent of whether this reflection harness is used; it is not an optional mode or add-on. Engineering work should be considered in light of its effects on workload and pace, role clarity and control, communication and change, support and resources, fairness and respect, and worker voice. These concerns apply throughout the work, whether or not a particular mode prompt makes them salient.

When delivery pressure conflicts with a credible safety concern, the organization must make space to assess and address the concern before proceeding as planned. Schedule, cost, or convenience alone do not justify leaving a material risk unexamined. If a material risk remains unresolved, it must have a named decision owner, documented rationale, affected-person and system impacts, interim protections, and a review point. The decision owner should have appropriate authority and access to the resources needed to act. If no owner can resolve the risk, escalate it through a defined route and keep it visible until it is addressed or an authorized decision is recorded with its rationale and safeguards. This is an aspirational commitment; actual decision criteria and authority must be defined by the organization.

These are aspirational commitments in this framework, not evidence that an organization has fulfilled them. The framework supports reflection; it does not by itself establish that a workplace is safe or that psychosocial hazards have been adequately controlled.

Within these commitments, **0x0** orients the work before dispatch; **0x1–0xE** identify operational and supporting task classes; **0xF** identifies future-facing work. A task instance uses a 0x1–0xF code to identify its class and a command word to state the requested action. This is a taxonomy and task interface, not a claim that the hexadecimal set is mathematically complete or that a code alone makes work schedulable.

A mode is a **task class**, not a job title, personality type, seniority level, team, phase gate, control, or measure of individual performance. Anyone with appropriate authority and support may carry out a task. Work can involve several classes, and the relevant class can change as the work changes. Scheduling must account for the actual task and its constraints rather than infer priority or duration from a code. The Asimov reference is a literary prompt to ask how human–technology relationships should be governed and whose safety and agency count. It does not supply the answer, define enforceable rules, or substitute for responsibilities, requirements, or evidence.

## Orientation, task classes, and command words

**0x0 — Orient** is the framing step before dispatch, not a dispatched task class. Use it to clarify what work is being considered, why now, the people and systems affected, relevant constraints, and the desired outcome. Once the work is ready to dispatch, select one primary task class from 0x1–0xF and pair it with a command word.

| Code | Mode / task class | Command word | Work focus | Task framing question |
|---|---|---|---|---|
| 0x1 | **Builder** | `build` | Create a feature, system, or capability. | What are we making, for whom, and what observable result—including relevant timing behavior—would show it works? |
| 0x2 | **Gardener** | `maintain` | Maintain, refactor, and improve what already exists. | What needs care, simplification, or repair to remain useful and sustainable, including any timing assumptions that maintenance could change? |
| 0x3 | **Doctor** | `diagnose` | Diagnose and resolve a failure or urgent defect. | What is failing, what evidence do we have, what timing or deadline was affected, and what action restores safe operation or an acceptable degraded state? |
| 0x4 | **Explorer** | `investigate` | Investigate an unknown, technology, or method. | What uncertainty matters, and what bounded inquiry could reduce it? |
| 0x5 | **Librarian** | `record` | Record, organize, and make knowledge findable. | What should be recorded so another person can understand, operate, or continue this work? |
| 0x6 | **Ambassador** | `communicate` | Communicate and engage with stakeholders. | Who needs to know what, when, and in what form to make a sound decision or use the result? |
| 0x7 | **Architect** | `design` | Shape sustainable systems, interfaces, and processes. | How does this fit with surrounding systems, constraints, timing assumptions, failure modes, and future maintenance? |
| 0x8 | **Advocate** | `represent` | Represent user needs, ethical concerns, and sound practice. | Whose needs, rights, or risks might otherwise be missed? |
| 0x9 | **Strategist** | `prioritize` | Choose priorities in light of longer-term aims. | Why is this the right work now, and what are we choosing to defer? |
| 0xA | **Mentor** | `teach` | Help people learn and grow through the work. | What knowledge or capability can be shared or developed here? |
| 0xB | **Auditor** | `verify` | Check work against explicit requirements or criteria. | What criterion are we checking, what evidence is relevant, and what remains unverified? |
| 0xC | **Scout** | `inspect` | Find risks, gaps, dependencies, and weak signals. | What could go wrong or surprise us—including missed deadlines, overload, or loss of observability—and how might we notice early? |
| 0xD | **Steward** | `sustain` | Care for capacity, resources, continuity, and well-being. | Is this work sustainable for the people, time, and resources involved? |
| 0xE | **Facilitator** | `coordinate` | Help people coordinate, decide, and move through blockers. | Which dependency, decision, or handoff needs attention to let work proceed? |
| 0xF | **Visionary** | `envision` | Imagine and articulate future directions or capabilities. | What future possibility are we trying to make thinkable, and what present signal could test its value? |

## How to use the harness

1. **Orient (0x0).** State the outcome, context, affected people and systems, constraints, urgency, and desired result before dispatch.
2. **Classify the work.** Select one primary 0x1–0xF task class and its command word. Use related codes as descriptive tags only; they do not create additional work items or priority by themselves. 0x0 remains the pre-dispatch orientation step.
3. **Define a task instance.** Make the command concrete: name its trigger, expected output, completion condition, dependencies, owner or execution resource, and relevant safety constraints.
4. **Select a policy, then schedule and dispatch.** Apply relevant release, priority, deadline, budget, dependency, resource, admission, and overload rules. Choose a queue or dispatch policy that fits the stated objective, workload assumptions, constraints, and decision authority; a code does not set these values.
5. **Track execution and outcomes.** Record dispatch, start, completion, interruption or deferral, and missed constraints at a level proportionate to the work.
6. **Revisit when the work changes.** An investigation may become a repair; a prototype may become maintained capability. Reclassify or reschedule when the task model changes.
7. **Check psychosocial safety throughout.** Consider workload and pace, role clarity and control, communication, support, fairness, and worker voice. Do not make people’s safety depend on whether a mode was selected.
8. **Review usefulness and performance.** Ask whether the command, queue policy, and schedule improved outcomes safely, what was missed, and whether the method added clarity or ceremony.

### Task model and scheduling discipline

The real-time systems connection is an engineering method for planning and dispatching software work, not a metaphor. A task table and queue policy can make work visible and schedulable only when task semantics and constraints are explicit. Choose methods appropriate to the system. Distinguish hard deadlines from targets, measured execution bounds from estimates, and automated execution time from human effort estimates.

- **Release:** What event releases the task? Is it periodic, event-triggered, or sporadic? If sporadic, what minimum inter-arrival constraint is part of the model? A probability of selecting or assigning work does not by itself define a sporadic task.
- **Priority:** Which work has precedence, who sets that precedence, and can it change? How are aging, starvation, urgent work, and conflicting priorities handled?
- **Deadline:** What is the deadline, what starts the clock, and is it hard, firm, or a target? What is the safe response to a miss?
- **Budget:** What execution-time budget or human effort estimate is available, how was it derived, and what happens when it is exhausted? Do not treat an unvalidated estimate as a worst-case execution-time bound.
- **Dependencies and resources:** What must finish first? Which shared resources, skills, tools, or people can block progress, and how is contention handled?
- **Admission and overload:** Which capacity and safety checks happen before work is accepted? Under overload, what is deferred, rejected, cancelled, degraded, or escalated—and who has authority to decide?
- **Interruption and recovery:** Can a task be preempted, paused, retried, or resumed safely? What state must be preserved and what completion evidence is required?
- **Observation:** Which events and measurements show queue depth, lateness, budget use, overload, failure, and recovery?
- **Human impact:** How do priority, schedule, and overload response affect workload, autonomy, fairness, recovery time, and safe participation?

For human work, effort estimates and capacity constraints support planning but do not establish deterministic execution bounds. Do not apply processor schedulability conclusions to people. Scheduling objectives should balance timely delivery, quality, safety, fairness, and sustainable workload; utilization or throughput alone is not sufficient.

#### Select and evaluate a scheduling policy

There is no universally best policy for software-work queues. Select one for the actual work context, record why it fits, and revisit it when workload or constraints change:

1. **Set objectives and non-negotiable constraints.** Name the desired outcomes (for example, timely completion, quality, service continuity, or reduced waiting) and the constraints that cannot be traded away. Treat worker safety, fair and sustainable workload, legal or contractual obligations, and required review gates as constraints, not as weights that throughput can outweigh.
2. **Describe the workload and authority.** Record how work arrives, the range of task sizes, deadlines and dependencies, shared resources, interrupt frequency, and who may set or change precedence. Mark assumptions and uncertainty; do not invent precision where estimates are rough.
3. **Choose plausible policy candidates.** Examples include first-in-first-out for simple arrival-order queues; explicit fixed priorities where precedence is governed; earliest-deadline-first when deadlines and release assumptions are meaningful; or dependency-aware dispatch with aging when blocked work and starvation matter. These are candidates to assess, not recommendations independent of context. A policy may combine rules, but define tie-breaking and exception authority.
4. **Compare candidates against representative scenarios.** Use historical traces, a small simulation, or a bounded pilot when proportionate. Include normal load, bursts, urgent arrivals, long tasks, dependencies, absences, and overload. Check both intended outcomes and failure modes; do not infer guarantees from a short or unrepresentative sample.
5. **Make and review the decision.** Record the selected policy, rationale, evidence, known trade-offs, owner, review trigger, and how affected workers can raise concerns. Monitor lateness and missed constraints alongside quality, waiting time, starvation, rework, workload distribution, overtime or recovery time, and worker feedback. If evidence shows harm, unfairness, or unsafe overload, adjust admission or dispatch and protect affected workers while reviewing.

For a lightweight comparison, state which measures are acceptance constraints and which are optimization goals. Avoid a single aggregate score that can hide safety, quality, or fairness failures. Where no reliable data exist, state that the choice is provisional and set a review point rather than presenting it as optimized.

#### Lightweight scheduled-task record

- **Task ID / code / command:**
- **Outcome and completion condition:**
- **Release condition / cadence / minimum inter-arrival constraint, if applicable:**
- **Priority and authority for setting it:**
- **Deadline and miss response:**
- **Execution budget or human effort estimate, source, and confidence:**
- **Dependencies and constrained resources:**
- **Admission decision and rationale:**
- **Scheduling / dispatch policy, rationale, evidence, and review trigger:**
- **Queue / preemption / cancellation / retry policy:**
- **Overload behavior and escalation owner:**
- **Affected people and worker-safety constraints:**
- **Dispatch / start / completion / outcome evidence:**
- **Revisit trigger:**

This record is a planning aid. Formal scheduling guarantees require an appropriate task and resource model, explicit assumptions, suitable analysis, and target-system evidence. A task table, priority label, or queue policy alone does not establish schedulability or deadline compliance.

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

If this work relates to a formal compliance obligation, use this framework only to support task planning and discussion. Separately identify the applicable requirement, its scope, the responsible owner and decision-maker, the evidence needed, and how gaps will be recorded and followed up. Do not infer compliance from a selected code or completed record.

### Lightweight record

- **Work / decision:**
- **Affected people and systems (including interfaces and work conditions):**
- **Primary task class / command word:**
- **Related class tags (if useful):**
- **Standards lens record(s), if used:** Reference the records below or their existing project equivalents.
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

### Standards lens record

Use this short record only when a named standard informs the discussion. Reuse an existing project reference rather than copying it into every review.

- **Reference ID, identifier, and title:**
- **Edition and relevant amendments:** Mark unknown details as unverified.
- **Source, verification date, and access limits:** State whether the full text or only a summary was available.
- **Topic informing the discussion:**
- **Use:** Inspiration, or a separately established conformity obligation with a pointer to its assessment record.
- **Applicability:** Candidate, confirmed for the stated scope, or out of scope with rationale.

If a possible obligation has not been resolved, record it as a candidate and assign its applicability review through the concern-response path. Do not silently treat it as optional inspiration or as an established requirement. Missing editions or limited source access constrain what the discussion can support; do not invent details or infer conformity from a summary.

The lens record identifies what informs the discussion. Keep clause-level evidence, findings, and compliance decisions in the separate assessment process. Completing this record does not establish conformity.

### Separate compliance assessment

For work with a defined compliance obligation, track these separately from the task record:

- **Requirement / source, edition or effective date, and applicable clauses:**
- **Scope and applicability:**
- **Basis of obligation:** Such as law, contract, or an explicitly adopted requirement.
- **Accountable owner / decision authority:**
- **Reviewer and assessment method:**
- **Evidence required and evidence located:**
- **Gap, disposition, and follow-up:**
- **Decision, rationale, and permitted claim wording:**

## Interpreting overlaps

Some task classes naturally touch the same work. Treat overlap as a reason to name one primary dispatch class and any related tags, not as a reason to create duplicate tasks or priorities:

- **Architect / Strategist:** system shape and constraints versus priority and timing.
- **Advocate / Steward:** whose needs and risks count versus whether the work is sustainable for the people and resources involved.
- **Scout / Auditor:** what might be wrong or missing versus whether stated criteria are met by available evidence.
- **Builder / Gardener:** adding capability versus improving or sustaining existing capability. A change can do both.
- **Ambassador / Facilitator:** sharing information with stakeholders versus helping participants coordinate and reach decisions.
- **Visionary / Explorer:** imagining a possible direction versus gathering evidence about an uncertainty within it.

## Boundaries and cautions

- Task classes and command words structure classification and dispatch; they do not assign authority or accountability. Explicit owners and decision rights still need to be established separately.
- “Doctor” is a metaphor for diagnosis and response. It does not imply that every defect is an incident or that urgency removes normal safety, privacy, or change controls. For real-time systems, this prompt does not determine acceptable deadlines, failure responses, or degraded modes; those need system-specific requirements and analysis.
- Applying real-time systems discipline to task planning does not itself establish schedulability, bounded response, deadline compliance, fault tolerance, or safety. Those claims require a defined system and task model, assumptions, suitable analysis, and evidence. Do not present human effort estimates as worst-case execution-time bounds.
- “Auditor” is a review lens, not an audit method. It does not establish compliance. A formal compliance assessment needs a defined requirement and scope, appropriate reviewer and method, relevant evidence, documented findings, and follow-up. A mode label or completed harness record is not a control, audit, certification, or proof of conformity.
- The harness does not assign independence, authority, or decision rights. Define these in the surrounding governance or review process when they matter.
- If applying the harness during organizational change, use a separate, context-specific psychosocial hazard assessment. The responsible change process should determine and document when worker consultation is required or appropriate, who needs to be involved, how they can contribute safely and accessibly, how their input will inform decisions, and how outcomes will be communicated. The modes can surface questions about workload, autonomy, communication, role clarity, support, and fairness; they do not replace a systematic assessment or consultation process.
- The original document associates some modes with SW1, SW2, and Apprentice roles. This harness does not preserve those as restrictions: learning, communication, review, maintenance, and risk awareness can be shared across experience levels, with appropriate support and authority.
- Do not score people by mode use or infer personality from which modes they choose. Use the prompts to examine the work and the conditions around it.
- Use of this reflection harness is voluntary and should be proportionate. If it does not improve clarity or decisions, simplify or set it aside. The safety responsibilities and baseline principles described here are not optional. Delivery pressure does not remove the responsibility to examine credible safety concerns or to keep unresolved material risks visible and assigned.

## Assessment

The framework applies real-time systems discipline to software engineering work. Codes identify task classes, command words state requested actions, and the task model supplies the release, priority, deadline, budget, dependencies, resources, admission, and overload behavior needed to schedule work deliberately. Creating and maintaining systems are only part of the work; diagnosis, knowledge, communication, risk, learning, coordination, and care also matter. It holds safety across silicon, flesh, and the interfaces and conditions between them, with every worker’s right to a safe workplace as a baseline responsibility.

The original list combines work at different levels—hands-on activity, system design, coordination, organizational planning, and future direction. This refactor keeps the fifteen 0x1–0xF identities as task classes and pairs them with command words; 0x0 remains the orientation step. The overlap notes help teams select a primary dispatch class without implying that the classes are equivalent process stages or roles.

Use the task classes and commands to make software work actionable and schedulable. Judge the method by whether it improves safe, timely, high-quality delivery and exposes overload or unfair workload. Do not turn codes into a checklist quota, performance rubric, or org chart. A completed task record is not proof that a real-time system meets its timing requirements. When timing guarantees or a compliance obligation apply, use the system-specific requirements, analysis, tests, and separate evidence-based process; codes and prompts alone do not establish the claim.


## Provenance

Modes 0x1–0xF and their initial focus statements are derived from *Engineering Super Soft Reboot 2025*, dated 2025-01-25, pages 26–28. Mode 0x0, command words, task model and scheduling guidance, timing-sensitive wording, optional 0xF future-work class, psychosocial safety baseline and concern-response path, affected people and systems and next action and conditional separate risk response owner fields, purpose, prompts, usage steps, overlap distinctions, boundaries, and assessment above are editorial interpretation for this draft. The source document presents an aspirational proposal; this draft does not claim that the proposed roles, teams, or practices were implemented.
