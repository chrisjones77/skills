# skills
Collection of skills for psychologically safe and risk-managed use of AI in professional engineering.

The [skills and work contract interface](docs/work-contract-interface.md) explains
how the core skills supply methods, boundaries and responses to an optional
coordination runtime, without treating its checks as authority or judgment.

The [unified work harness](unified-work-harness/SKILL.md) bundles a Hypervisor
contract validator and a narrowly gated, read-only agent executor.
It preserves the accepted contract and leaves review to a human.
The [delivery checklist](unified-work-harness/delivery-checklist.md) tracks the
selected capabilities, remaining acceptance gates and next integrated workflow.
Run its local deterministic suite with `node --test unified-work-harness/*.test.mjs`.
Live-model execution is opt-in and skipped by default; the CLI is the legacy v1
path, while the integrated v5 API adds bound context, a single-attempt ledger
and an execution start window. Neither path supplies authenticated consent.

## Workflow storyboards

[Browse twelve illustrated skill workflows](docs/skill-storyboards/README.md), with text transcripts, canonical source links and generation provenance. The images are concept illustrations; the skills remain authoritative.

[Work and safety record](specs/001-skill-storyboards/work-and-safety.md): scope and authority, execution evidence, image corrections, review responsibilities, concern response and remaining limitations.
