# AI professional-practice assessment framework

Use this framework to turn the advisory into a proportionate, documented decision.

## 1. Triage

Answer these questions before selecting controls:

| Question | Lower-risk indication | Higher-risk indication |
|---|---|---|
| Role of AI | Drafting, organizing, or assisting work that is fully checked | Producing calculations, classifications, designs, recommendations, or decisions |
| Consequence of error | Readily detected; negligible external effect | Safety, health, environment, property, economic, legal, or public-welfare effect |
| Verification | Complete independent verification is practical | Output cannot be fully verified before reliance |
| Competence | User understands the domain, tool, limitations, and validation | User cannot explain failure modes or independently substantiate results |
| Repeatability | Locked version and reproducible result | Dynamic service, unknown updates, stochastic output, or weak audit trail |
| Data | Public/non-sensitive and authorized | Confidential, personal, privileged, proprietary, security-sensitive, or restricted |
| Transparency | Method and evidence can be examined | Black-box result with weak explanation or provenance |
| Governance | Approved tool, defined owner, controls, and records | Unapproved tool, unclear ownership, weak provider terms, or no monitoring |

Do not calculate a universal numeric score unless the user's governing risk process defines one. Use the organization's approved severity/likelihood matrix.

## 2. Hazard library

Consider at least:

| Hazard | Example failure | Typical controls |
|---|---|---|
| Incorrect output | Hallucinated source, wrong calculation, false classification | Independent calculation, authoritative-source check, acceptance tests |
| Bias | Training data underrepresents a population or condition | Representative tests, subgroup analysis, qualified review, use limitation |
| Automation bias | Reviewer accepts fluent output without challenge | Blind/independent check, reviewer checklist, competence requirement |
| Non-repeatability | Same task produces materially different answers | Locked settings, repeated trials, saved inputs/outputs, per-use validation |
| Model drift/change | Provider silently changes model behaviour | Version recording, change monitoring, revalidation trigger |
| Poor explainability | Professional cannot defend the result | Restrict use, require interpretable evidence, independent method |
| Confidentiality/privacy | Sensitive data reaches provider or other users | Approved environment, minimization, redaction, contract review, no-upload rule |
| IP/ownership | Output reproduces protected material or use rights are unclear | Provenance checks, license review, original-source verification, legal review |
| Security/resilience | Prompt injection, malicious content, service outage | Input isolation, access controls, fallback process, incident response |
| Overdependence | Staff lose conventional checking capability | Training, manual exercises, periodic independent work, rotation |
| Environmental/equity effect | Disproportionate resource or stakeholder impact | Proportionality review, alternative method, stakeholder analysis |

## 3. Control design

Use layered controls:

1. **Avoid:** Do not use AI for the activity when competence, verification, information protection, or residual risk is unacceptable.
2. **Constrain:** Limit AI to bounded subtasks, non-sensitive data, advisory output, or predefined operating conditions.
3. **Validate:** Test against known truth, independent methods, edge cases, and realistic adverse cases.
4. **Review:** Require competent human checking, supervision, and independent review when applicable.
5. **Record:** Preserve the tool/version, material inputs and outputs, tests, decisions, approvals, and changes.
6. **Monitor:** Define performance indicators, incidents, revalidation triggers, and a responsible owner.

## 4. Minimum acceptance criteria

Do not recommend professional reliance until:

- the responsible professional accepts accountability;
- competence is established or qualified support is engaged;
- risks and consequences are documented;
- validation evidence is specific to the intended application;
- acceptance criteria are defined and met;
- confidentiality, privacy, security, and rights are resolved;
- human checking and supervision are assigned;
- records and retention are defined;
- independent review and disclosure requirements are resolved;
- changes in the model, data, configuration, use, or consequence trigger reassessment.

## 5. Decision language

Use one of these determinations:

- **Acceptable:** Controls and evidence are sufficient for the stated use and conditions.
- **Acceptable with conditions:** Reliance is permitted only after listed controls are implemented and verified.
- **Unsuitable pending controls:** Material gaps prevent reliance, but may be remediable.
- **Unsuitable for the proposed use:** The use conflicts with competence, verification, information-protection, or risk requirements.

Always state assumptions and the specific scope of the determination.
