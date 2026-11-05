# Select a packaged method

Use Node 22.13 or later on POSIX for the complete package, including the SQLite queue. Start from the directory containing SKILL.md. Reading guidance requires no worker, account or endpoint.

From a reviewed repository checkout, copy the entire `unified-work-harness/` directory to your host’s skill directory, or use it in place. Keep its relative paths intact, including guides, fixtures, manifest and license. There is no dependency-install step for the JavaScript modules. Start in that directory with `node package.mjs inventory`. For a first human-led exercise, open [methods.md](methods.md) and run the two shelf-label examples; they use only the included files. To see the corresponding offer, recipient response and reviewer decision, run `node examples/attended-review.mjs`. This demonstration uses fictional responses and does not contact anyone. To verify the installation on a POSIX host with Git and Node, run `node --test *.test.mjs`; the synthetic tests need loopback access. Real provider tests are opt-in.

1. Run `node package.mjs inventory` in the checkout under review. Inspect the named files, methods and external runtime dependencies. Record the reviewed sourceSha256 separately; do not automatically accept a replacement pin.
2. Save a profile request as profile.json. For a human-led triage, select 0x9, require issue_triage and allow read. Add companions only where they change the review. The example below uses a placeholder for the independently reviewed pin.
3. Run `node package.mjs profile profile.json`. Use the named guide or module, its origin and dependency chain, and retain the pin beside the human decision. A missing source, unknown capability, dependency cycle, stale pin or insufficient effect ceiling stops dependent work. Set `prohibitedEffects` to carry forward explicit project restrictions; a required effect that overlaps one of them holds the profile. Purpose lenses suggest methods; only required capabilities enter the requested dependency closure. For an attended queue, require `sequential_queue` and `human_hybrid_contracts` with read, write and dispatch. A provider step separately requires `readonly_roundtrip` and its additional effects in its own bound profile.
4. Respect the actual runtime's filesystem, provider, data and role limits. Profile inspection reads the package. The effective labels describe the side effects to budget for when invoking the selected capabilities. A review decision or executable offer still has its own interface.

~~~json
{"primary":"0x9","companions":["0xB"],"requiredCapabilities":["issue_triage"],"requestedEffects":["read"],"effectCeiling":["read"],"sourceSha256":"REPLACE_WITH_REVIEWED_PACKAGE_DIGEST"}
~~~

The manifest names the distributed methods, programs, tests, examples and license. The package digest binds each listed relative path to its file bytes. Keep personal profiles and generated records outside the installation, verify the checkout and digest independently, and inspect tests before running them. The source revision, usable routes, outstanding limits and package license are in [sources.md](sources.md) and [capabilities.md](capabilities.md). Node, Git, worker binaries, model files, external endpoints and operator identity require separate verification. The compatibility command `node bundle.mjs profile --inventory` describes only the original embedded bundle and remains available for its existing clients.

**Skill evolution.** When a package method changes, identify its source pin and affected consumers, review the change, compare the scenarios for affected modes, and record who accepted that specific revision. Defer unrelated skill changes for separate review. Reopening an earlier accepted offer requires new inspection and acceptance. Private skill overlays stay in the operator's project.

## Optional native assignment reviewer

This is a pre-offer advisory role, not a contract recipient, approver or executor. Give it only a minimal excerpt approved for the host and its inference provider. Do not delegate a private packet or inherit a sensitive conversation. A host may also include workspace metadata; use an isolated project/session. No local-only processing claim is implied.

From the reviewed package, copy **one file per desired host** into a project you control. Create the destination directory if needed; inspect its path for links, stop if the destination already exists, and compare the installed bytes with the pin for the template. Do not overwrite an existing role or install globally by default.

| Packaged source | Project destination | Role to request |
| --- | --- | --- |
| `native-roles/uwh_reviewer.toml` | `.codex/agents/uwh_reviewer.toml` | `uwh_reviewer` |
| `native-roles/uwh-reviewer.md` | `.claude/agents/uwh-reviewer.md` | `uwh-reviewer` |

For example, from the package directory, after inspecting the destination directory, use `cp -n native-roles/uwh_reviewer.toml /path/to/project/.codex/agents/` followed by `cmp native-roles/uwh_reviewer.toml /path/to/project/.codex/agents/uwh_reviewer.toml`. Use the Claude row's paths for Claude Code. If a definition already exists, resolve its ownership separately; do not assume the host selected your copy.

Start a fresh session that trusts the reviewed project. For **Codex**, use a read-only parent sandbox, no approvals, no external MCP servers, no web search or other effectful tools, and limit delegation to one level. The role disables shell, apps, plugins, memories and permission requests. The parent supplies the sandbox and inherited tools; if you cannot enforce that boundary, do not use the role. For **Claude Code**, the role declares an empty tool allowlist. Use a clean parent with no hooks or MCP servers and only the named delegation enabled. These definitions describe the same review; neither host is a new UWH execution adapter.

The child reports a verdict, the actions rejected as acceptance criteria, and a question or clarification for the owner. Keep a hold in place if the finding is absent, malformed, internally inconsistent or treats any extra action as required, regardless of its headline. Check the child's actual finding, not just the parent paraphrase. An Ollama model tagged `:cloud` uses remote inference even when the client connects to loopback; do not substitute it on a local-only assignment.

**Smoke check:** use the [three fictional assignments and scoring notes](examples/native-review-cases.json) in a disposable project. Keep the cases and answer key outside that project. In a fresh session per case, delegate to the exact installed role with only the `excerpt`. Check the named child's finding against `verdict`, `rejected` and `check`. For the scope-conflict case, identifying the email without explicitly rejecting it does not pass. For the control, referring a bounded assignment is not approval. Verify no child tool invocation, worker launch or file edits, and an unchanged fixture including untracked files. A clean checkout alone does not prove isolation. Record host and model separately; a successful smoke is not qualification of the model for other assignments.
