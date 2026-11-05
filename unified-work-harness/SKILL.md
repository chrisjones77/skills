---
name: unified-work-harness
description: Coordinate bounded professional engineering and advisory work through purpose routing, accepted work contracts, and a local read-only agent executor. Use for an authorized contract-to-executor round trip or review of its evidence.
---

# Unified work harness

This self-contained package combines three layers: QVCH-style purpose routing, a Hypervisor v1 work contract, and a read-only agent executor. It coordinates bounded work. The bundled runtime uses Node.js built-ins only; it does not import another skill or repository. A real run additionally needs Git, OpenCode, and an explicitly approved local model endpoint. An endpoint on loopback is not proof that the model processes data locally; verify the model and deployment independently.

Orient first: identify the outcome, affected people, bounds and authority. Choose one primary purpose and at most two companion lenses where useful. 0x0 is orientation; 0x1 build, 0x2 maintain, 0x3 diagnose, 0x4 investigate, 0x5 record, 0x6 communicate, 0x7 design, 0x8 represent, 0x9 prioritize, 0xA teach, 0xB verify, 0xC inspect, 0xD sustain, 0xE coordinate, and 0xF envision. Purpose is task metadata, not permission. The adapter requires a primary purpose and accepts Review or Research only. Companion lenses and skill-resolution records remain in the original authorized record; they are not projected into the executor.

The bundle can list capability status with `node bundle.mjs profile --inventory`
and inspect a proposed profile without dispatching work: pass a JSON file to
`node bundle.mjs profile --request REQUEST.json`. For example,
`{"primary":"0xB","companions":["0xC"],"requiredCapabilities":["purpose_selection"],"requestedEffects":["read"],"effectCeiling":["read"],"sourceSha256":"<reviewed bundle SHA-256>"}`
records purpose and a *declared* effect ceiling. Unknown authority, a requested
effect outside that ceiling, or a required capability marked planned or partial
returns `hold`. Even `resolved_for_review` is metadata only: it does not verify
permissions, source provenance, identity or consent and never authorizes an
executor.

Profile and inventory receipts use schema v2. The inventory reports the SHA-256
of the bundle file on disk; independently review that artifact and pin its hash
as `sourceSha256`. Missing or mismatched pins hold; malformed pins are rejected.
Do not automatically copy a new hash into an already reviewed request to clear
a hold. Source changes require renewed review. The pin does not cover this
guidance, dependencies such as Node/Git/OpenCode, or a model, and is not a signed
release, loaded-code attestation, or protection against concurrent replacement.
Use a controlled immutable checkout for execution and verify its actual runtime
separately. Receipts contain fixed source labels and hashes, not local paths.

This slice resolves only fixed built-in dependency metadata; requests cannot
supply source paths, registries, imports, or dependencies. Full QVCH source
resolution remains partial, and partial/planned capabilities still hold even
when their dependencies resolve. The bundle never loads external skills or
private overlays. Required effects are added to requested effects before
checking the ceiling: `readonly_roundtrip` needs `read`, `write`, `provider`,
`git`, and `network` because it writes a temporary clone and contacts a local
provider. These broad labels are not permissions or substitutes for the exact
contract, path, endpoint and isolation checks. Effect metadata for partial or
planned capabilities is incomplete, not evidence that they have no effects.

The broader core—including intake and concern handling, specialist guidance,
human/hybrid contract descriptions, dispatch, queues, provider interfaces, and
candidate-change execution—is planned or partial unless the profile says
otherwise. Presence in the capability inventory is not implementation or
validation. Do not route dependent work to an unavailable capability or widen
the current executor's read-only authority.

`node bundle.mjs intake --request REQUEST.json` performs a preliminary,
non-executing completeness check for human, agent, or hybrid assignments. The
JSON fields are `outcome`, nonempty `exclusions`, `assignee` (`kind`, `id`),
`accountableHuman`, `authority` (`allowed`, `prohibited`), `dataClass`
(`public`, `internal`, or `restricted`), `resources` (`effortMinutes`,
`deadline`, `dependencies`, `reviewerAvailability`), `acceptance` (`checks`,
`reviewer`), `escalation` (`stopConditions`, `contact`, `mayPause: true`),
and `concerns` (an explicit array). Use `"none"` where a reviewed deadline
is absent, or a calendar-valid `YYYY-MM-DD`; this check does not establish
freshness or feasibility. Reviewer availability must be declared as
`available`, `unavailable`, or `unknown` and is not independently verified.
Missing facts, exactly overlapping authority labels, unavailable or unknown
reviewer availability, unresolved concerns, and restricted data hold the intake.
Other semantic authority conflicts require independent review. Output contains labels and broad flags, not
the request text. Do not put secrets in the request file or assume hashes or
labels remove sensitivity. `complete_for_review` is not recipient acceptance,
verified authority, sufficient capacity, or permission to act; it does not
create or update a contract. Assess workload and other impacts on affected
people without attributing wellbeing needs to an agent.

## Professional and advisory guidance

When the work involves professional engineering or advice, establish the
responsible person's competence and authority, the governing jurisdiction,
applicable requirements, intended use, affected parties, and the consequences
of error. The responsible professional retains accountability; generated output
is not professional approval, certification, or a substitute for checking.
Scale verification and review to consequence and uncertainty. Preserve
independently checkable evidence and arrange qualified independent review when
the applicable regime requires it. Verify current obligations and seek qualified
advice where needed; this package does not determine legal compliance.

For advisory work, separate source facts, reported claims, inference and
recommendations. Define the decision and its owner, review existing controls
before proposing new ones, identify missing evidence and constraints, and state
the next action and revisit triggers. Consent to advice is not permission to
contact others, implement changes, publish, or accept risk on the owner's behalf.

## Coverage and issue review

Use coverage review for requirements, documents, data, code, or visual
artifacts as appropriate. Bind the reviewed item and revision, identify required
criteria, missing or conflicting evidence, regressions, and unresolved claims.
A hash establishes byte identity, not correctness; automated checks, assistant
observations, and human acceptance are distinct. Do not claim a file was
inspected or approved merely because its metadata passed a check.

For issue or work-item triage, compare intended outcomes and scope with existing
work before recommending a new item. Keep kind, affected area, priority,
readiness, authority and capacity distinct; use the project's own vocabulary
and identify stale or missing evidence. A recommendation is not permission to
change an issue, contact a person, assign work, or dispatch an executor.
These are guidance capabilities; their automated adapters remain partial.

## Contract and execution

Use an actual Hypervisor schema-v1 packet with work-contract v1, explicitly accepted for its current digest and explicitly resumed by the named recipient. Keep review pending or rework, with no unresolved clarification or pending transfer. A digest and role labels are consistency evidence, not authenticated consent or authority. Preserve the original packet and all concern and review history; this runtime never writes or closes it.

For the original CLI path, the accepted assignment's `scope` must be a JSON string with exactly `kind` set to `unified-harness-readonly-v1` and `assignment_sha256` set to the SHA-256 of the exact UTF-8 bytes of the separately reviewed Unified Harness assignment JSON. Obtain this hash **before offering and accepting the contract**. Do not revise the accepted scope or substitute a new identity to bypass a concern. The contract authority must declare exactly `execute-read-only` in `allowed`, and include `write-source` and `external-network` in `prohibited`. Verify actual permission separately.

For the integrated API path, first read the draft-binding and v2 contract sections
of [the delivery checklist](delivery-checklist.md). `buildBoundScope(inputs,
endpoint)` produces `unified-harness-readonly-v2` scope binding the exact draft
and local endpoint, without offering or accepting work. After separate explicit
offer, acceptance and resume, call `contractRoundtrip` with `bindingInputs` and
that exact endpoint. It checks recipient, purpose, review criteria and workspace
against the bound records before provider checks. Missing inputs and mixed v1/v2
attempts reject; no automatic migration or acceptance is provided. The v2 receipt
includes the binding digest, still leaves review pending, and is not replay
protection or an authenticated consent record. The CLI remains v1-only.

Private result retention is opt-in through v3 scope, not an option that may be
added after acceptance. Read the private-result section of the delivery checklist
before using `buildBoundScope(inputs, endpoint, resultPolicy)` and passing the
same `resultPolicy` to `contractRoundtrip`. It binds an existing owner-only
destination outside the source checkout and explicit owner-managed retention.
The resulting receipt contains only the artifact name, byte count and digest;
the raw post-read text is in a separate private file, still awaiting review.
Default v1/v2 runs retain no such result. Do not treat a matching artifact hash
as proof of answer correctness, confidentiality, or professional acceptance.

Contract round trips reject a caller-supplied `outputRoot`: persistent output
must not bypass the accepted destination policy. Internal logs are temporary;
v3 is the supported retained-result channel. Contract prohibition labels are
limited to the supported default prohibitions plus `write-source` and
`external-network`; conflicting or unknown labels hold rather than being ignored.

Use v4 for single-attempt execution: read the invocation-ledger section of the
delivery checklist before passing `invocationPolicy` as the fourth argument to
`buildBoundScope` and to `contractRoundtrip`. The accepted policy binds an
owner-only ledger outside the source checkout. Claim creation precedes provider
access; an existing claim or terminal record blocks reuse, including failed and
interrupted attempts. `inspectInvocation` is read-only and never authorizes retry.
Do not delete state or change work identity to bypass it. Reconcile uncertainty
and obtain a newly reviewed, accepted and resumed revision for any authorized
retry. Legacy v1–v3 paths have no single-attempt guarantee. Ledger preservation
and a trustworthy local filesystem remain operational requirements.

V5 adds an explicit execution start window and requires the v4 ledger. Read the
v5 section of the delivery checklist before passing `executionWindow` as the
fifth argument to `buildBoundScope` and to `contractRoundtrip`. UTC start is
inclusive; expiry is exclusive. Expiry before claiming causes no invocation;
expiry after claiming prevents worker launch but consumes that attempt. Do not
renew dates or clear claims automatically. Older scopes have no expiry gate.

The bound Unified Harness assignment must name the same outcome, assigner/decision owner, and reviewer; use `read_only` with explicit allowed read paths, no editable paths or test edits; declare local processing with `contains_secrets: false` and `contains_sensitive_personal_data: false`; and pin `resources.base_ref` to the full workspace commit. It must have only the fixed acceptance check `{ "command":"node", "args":["--version"], "timeout_seconds":10, "expected_result":"zero" }` and require no changes. The source Git workspace must be clean and match the packet's root, branch identity, revision and clean status digest. This executor accepts agent assignees and retains an accountable human and separate human review.

Run from an authorized environment:

```sh
node /path/to/unified-work-harness/bundle.mjs roundtrip --packet /private/packet.json --assignment /private/assignment.json --endpoint http://127.0.0.1:8000/v1
```

The adapter verifies the packet using the bundled Hypervisor implementation, checks the exact scope binding, creates an isolated temporary clone, and runs the bundled agent executor there. OpenCode may use the explicitly permitted read tool; glob, grep and list are denied because their scope is not bound to the permitted paths. Read event paths are checked after the event, which detects a violation but cannot undo exposure. The executor may launch Git, OpenCode and the fixed Node version check and create temporary files; it must not modify the source checkout. The result is a JSON receipt with source assignment digest, executor assignment hash, workspace commit, executor evidence and `review_status: pending`. Human review remains separate. Capture the receipt only in an approved private location: paths and hashes can still be sensitive. This is not an OS sandbox, an authenticated audit log, proof of model locality, or proof that declared permissions are real. Apply external sandbox and network controls independently. The function's injectable test hooks are for synthetic test fixtures, not production trust decisions.

The Hypervisor and executor implementations are embedded in `bundle.mjs`; the copyright/permission notice is in `LICENSE`. The executor's assignment and scope identifiers are specific to this bundle; do not assume compatibility with other implementations, mix packet writers, or infer support for transfer or other unimplemented transitions. Provider leases coordinate only cooperating processes using this bundle's lease namespace; other executors need independent coordination. The bundled executor returns hash-only event evidence; the receipt does not contain a readable agent report, so it cannot by itself establish substantive completion.

Run `node --test unified-work-harness/*.test.mjs` to run all deterministic checks and exercise a synthetic accepted contract through the real bundled executor with a simulated agent. The test does not demonstrate a live model, an authenticated identity, or deployment readiness.

For an explicitly authorized local-only smoke test, start a verified tool-capable local chat model and run `UNIFIED_LIVE_TEST=1 UNIFIED_LOCAL_MODEL=<model-id> node --test unified-work-harness/live-roundtrip.test.mjs`. The test creates a disposable synthetic repository, accepts a synthetic v5 contract, asks for a source token, and checks the private artifact's hash and token content. It rejects a worker-binary test override and removes its synthetic artifacts on completion. Add `UNIFIED_LIVE_STRICT=1` for the opt-in `acceptance.response_format: "single_ascii_token"` contract, supported only for read-only OpenCode: the executor rejects responses that are not one unquoted ASCII token (surrounding whitespace is ignored). It validates shape, not factual correctness; the test separately compares the synthetic value. Uncertainty must still be reported, even when doing so causes rejection. The hash-only receipt cannot establish answer correctness. The test does not evaluate professional competence or verify production authorization. A candidate requires a completed source read and a nonempty subsequent response. If provider metadata explicitly says the model lacks tool calling, the adapter rejects it before invoking OpenCode; absent metadata is not proof of capability.
