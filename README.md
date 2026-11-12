# skills
Collection of skills for psychologically safe and risk-managed use of AI in professional engineering.

The [skills and work contract interface](docs/work-contract-interface.md) explains
how the core skills supply methods, boundaries and responses to an optional
coordination runtime, without treating its checks as authority or judgment.

The [unified work harness](unified-work-harness/SKILL.md) packages QVCH routing, human-led engineering and advisory methods, work contracts and local execution. The [capability crosswalk](unified-work-harness/capabilities.md) links each capability to its supported entry point, including the durable queue and candidate review workflow. [PR #24](https://github.com/chrisjones77/skills/pull/24) landed on `main` at [`f8195f6`](https://github.com/chrisjones77/skills/commit/f8195f6d7606edce9ccebaa334a10b8a5132c3d2).

**Install the reviewed release.** Copy the complete `unified-work-harness/` directory from that commit into the host’s skill directory. From the installed directory, run `node package.mjs inventory` and compare `sourceSha256` with the [acceptance record](docs/unified-work-harness-tests.md#accepted-release). Then run `node examples/attended-review.mjs` for an offline walkthrough. The package needs Node 22.13 or later on POSIX. Optional Codex and Claude reviewer roles are enabled separately in each project. Follow the [installation and role guide](unified-work-harness/package-guide.md).

## Workflow storyboards

[Browse fourteen illustrated skill workflows](docs/skill-storyboards/README.md), with text transcripts, canonical source links and generation provenance. The images are concept illustrations; the skills remain authoritative.

[Work and safety record](specs/001-skill-storyboards/work-and-safety.md): scope and authority, execution evidence, image corrections, review responsibilities, concern response and remaining limitations.

## Independent work recorder

[Git-first recorder and read-only bus monitor](work-recorder/README.md): a standalone
event contract, QVCH/UWH observation adapters, synthetic examples and replay.
