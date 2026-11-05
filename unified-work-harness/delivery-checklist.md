# Unified harness delivery checklist

For the current public package, use the [capability crosswalk](capabilities.md), [package profile](package-guide.md), and [review handoff](review.md). The inventory table and milestone log below describe the original single-bundle contract and remain available for legacy consumers. Current package acceptance is tracked in the review handoff.

Reconciled 2026-11-04 against the current local bundle and the user's inclusion
decisions. This is a delivery plan, not an execution contract or release approval.
The owner decides scope and acceptance; the assistant prepares bounded changes.
Existing uncommitted work is retained. No commit, publication, external contact,
or agent dispatch follows from this checklist.

## Product boundary

One self-contained, domain-neutral package for professional engineering and
advisory work. Routing, work contracts, and execution remain separate layers.
Runtime code uses Node built-ins and does not import other skill repositories.
Core means packaged and available when relevant, not mandatory on every task.
Guidance can be complete without an automated adapter: assess behavioral use,
not just the presence of headings or schemas.

Retain general requirements/artifact coverage and work-item triage, including
their non-image applications. Preserve professional accountability, fair process,
recipient choice, bounded effort and evidence integrity. Contracts may describe
human, agent or hybrid recipients; automation executes only agent assignments.
Human acceptance and capacity cannot be inferred from an agent's response.

Excluded: creative-seed development, music-video production, specialist
attention-reset workflows, gardening and private gardening overlays, song
development, recording-identity and catalogue workflows, and a model/agent
benchmarking product. Ordinary regression, safety and live smoke tests remain
necessary. Generic concern handling remains included; it is not a therapeutic
workflow. Public packaging must exclude private practice configuration, client
material and identifying source context, with a source record for the packaged work.

## Legacy bundle capability coverage

Status matches `profile --inventory` at reconciliation. Implemented means the
narrow advertised component exists, not that integration, deployment or human
acceptance is complete. Partial means guidance or component code exists but the
selected capability is incomplete. Planned means not delivered as a supported
capability. Dependencies below are proposed delivery prerequisites, not a claim
that the runtime already resolves them. All acceptance checks below are pending
as full-capability gates; existing narrower evidence is recorded separately.

| Capability | Current status | Delivery prerequisites | Observable acceptance check |
| --- | --- | --- | --- |
| `purpose_selection` | implemented | None | Primary and at most two distinct companion purposes survive the bound workflow; orientation never dispatches. |
| `embedded_source_binding` | implemented | Controlled source artifact | Missing, malformed or stale pins stop preparation; changed artifacts require renewed review rather than automatic repinning. |
| `qvch_source_resolution` | partial | Purpose and source binding | A built-in registry resolves all applicable packaged dependencies and effects; unknown, conflicting, unavailable or cyclic requirements hold without dynamic imports. |
| `assignment_intake` | partial | Routing and safety requirements | Missing facts, scope conflicts, unavailable review and unresolved concerns hold; an approved intake is bound to the offered scope without granting permission. |
| `human_hybrid_contracts` | planned | Intake and call/response | Human, agent and hybrid fixtures retain named roles and recipient choices; human/hybrid records cannot enter an agent-only executor. |
| `engineering_safety` | planned | Intake and call/response | Missing budget, unsafe conditions or unavailable support produce a bounded hold/escalation; pause does not silently become resume. |
| `call_response` | partial | Versioned contract | Accept, decline, clarify, defer, pause, escalate and handoff are tested against current revisions; stale replies and unresolved transfers cannot dispatch. |
| `ai_lifecycle` | partial | Safety, professional review and coverage | Low- and high-consequence scenarios produce proportionate discovery, assurance, operational ownership and handoff; test success never substitutes for release approval. |
| `professional_practice` | partial | Intake and qualified human review | Review records intended use, competence, jurisdiction and applicable requirements or their unresolved status; output never claims certification or substitutes for accountable review. |
| `fair_process` | planned | Concern history and evidence records | Disputed claims remain attributed; concerns, response opportunities and decisions persist across revision; reporting a concern cannot be bypassed by re-identifying work. |
| `coverage_review` | partial | Artifact identity and acceptance criteria | Code, document, data and visual scenarios report supported, missing and regressed criteria against exact revisions; metadata checks cannot count as content inspection. |
| `issue_triage` | partial | Coverage, owner and project vocabulary | Non-image work items distinguish duplication/reuse, priority, readiness, capacity and authority; recommendations do not mutate issues or assign work. |
| `advisory_workflow` | partial | Professional practice, evidence and triage | A generic intake-to-handoff case separates facts, reports, inference and advice, records decision ownership and revisit triggers, and makes no unauthorized contact or changes. |
| `readonly_roundtrip` | implemented | Accepted/resumed exact contract and controlled runtime | Existing gates plus bound profile/intake reject drift before provider invocation; source stays unchanged, receipt remains pending review, substantive evidence remains inspectable separately. |
| `bounded_dispatch` | planned | Contract lifecycle, provider facade and isolation | Only the named accepted agent assignment dispatches within scope and budget; cancellation, denial and unavailable prerequisites stop it; a primary reviewer verifies returned evidence. |
| `sequential_queue` | planned | Dispatch, durable state and provider budgets | Crash/restart, deadline and retry tests preserve stop states, prevent duplicate dispatch and respect budgets; resumption rechecks current authorization. |
| `goal_pursuit` | planned | Explicit goal selection, intake and queue | Only explicitly selected tasks become bounded proposals; new tasks cannot inherit authorization to apply or publish, and stop conditions terminate pursuit. |
| `provider_facade` | planned | Stable request/result and cancellation interfaces | Fake-provider conformance tests enforce budgets, privacy, endpoint restrictions and cancellation; provider failure cannot trigger an unauthorized fallback. |
| `multiple_adapters` | partial | Provider facade and bounded dispatch | Each enabled adapter passes the same authority, scope, cancellation and evidence checks; unsupported combinations fail before invocation. |
| `candidate_changes` | partial | Isolation, scoped write contract and review | Candidate edits and defect reproduction stay in disposable authorized workspaces, respect path/test scope, preserve originals and produce reviewable evidence; never auto-apply, commit or publish. |

## Existing evidence and limits

Current local verification command: `node --test unified-work-harness/*.test.mjs`.
The consolidated suite has thirteen deterministic tests and one opt-in live test.
CI uses the same discovery pattern, including binding/expiry and inventory tests.
One strict live v5 smoke test passed on 2026-11-04 with local `qwen2.5:3b`;
see [the test record](live-test-results.md) for artifact identities and limits.
Synthetic acceptance is test setup only, not real consent or release approval.

| Scope | Interface | Context binding | Retained answer | Single attempt | Start window |
| --- | --- | --- | --- | --- | --- |
| v1 | CLI/API, legacy | Assignment bytes only | No | No | No |
| v2 | API | Profile/intake/assignment/workspace and endpoint | No | No | No |
| v3 | API | v2 plus retention policy | Required | No | No |
| v4 | API | Bound context and ledger policy | Optional | Yes, intact local ledger | No |
| v5 | API | v4 plus exact UTC window | Optional | Yes, intact local ledger | Yes |

All scopes require explicit acceptance/resume and return pending human review.
For newly prepared integrated work, use v5. Legacy scopes are compatibility
paths, not equivalent substitutes. Scope upgrades require a new reviewed offer;
no accepted packet is rewritten. The single bundle remains self-contained.

- `roundtrip.test.mjs` covers metadata intake, purpose/effect inspection, source
  pin drift, sanitized metadata CLI failures, explicit tool-capability rejection,
  and an accepted synthetic contract through the bundled executor with a fake
  worker. Negative cases include stale acceptance, missing resume, workspace
  drift, unresolved concerns, changed assignment bytes, forbidden reads/tools,
  source changes, and exact-token response shape.
- See the consolidated verification summary above for the current test scope.
  The separate installed skill-creator validator passed with PyYAML 6.0.3 in an
  isolated temporary Python 3.14.7 environment. This validates skill structure,
  not execution safety. Structural storyboard checks are not visual or human acceptance.
- Profile/intake binding is connected to contract execution through the v2 API
  described below; the legacy v1 CLI remains separate. Source hashes identify
  disk bytes, not loaded-code attestation or trusted provenance.
- Hash-only execution receipts cannot establish the correctness of a substantive
  answer. Source read auditing detects violations after exposure and is not an OS
  sandbox. Local endpoints do not prove local processing. Authentication,
  isolation and actual human acceptance remain separate responsibilities.

## First end-to-end workflow: bounded read-only review

Complete this before queues, new provider adapters or write execution. Use a
synthetic generic engineering-document review with an explicit source file and
verifiable criterion. The first implementation uses a fake provider; a live run
requires separate endpoint and data approval. Do not make a new model or publish
anything for this milestone.

1. **Prepare, without dispatch.** Resolve the reviewed package/profile, complete
   intake, and generate a draft binding record for the exact assignment, purpose,
   companion lenses, scope/effects, evidence criteria, workspace and reviewer.
   Preserve original records privately. Define versioned encoding and identity
   rules; ambiguous mapping holds instead of guessing or discarding fields.
2. **Offer and accept explicitly.** Bind that record into a versioned contract
   before acceptance. Retain named recipient acceptance of the exact revision and
   explicit resume. Preparation cannot fabricate either, clear concerns or
   rewrite existing accepted records. Legacy unbound packets must not silently
   qualify as this integrated workflow.
3. **Preflight before provider invocation.** Recheck binding, current source and
   workspace, concern/transfer state, allowed scope, model endpoint, budgets and
   required review. A stale or unavailable prerequisite holds without dispatch.
   Runtime validation is consistency checking, not identity authentication.
4. **Execute within the existing read-only boundary.** Exercise the current
   executor in an isolated synthetic workspace. Restrict source reads and fixed
   checks; distinguish permitted temporary writes/local provider access from
   forbidden source writes and external processing.
5. **Return reviewable evidence.** Keep ordinary logs free of raw content. Define
   an explicitly approved private result-artifact channel with byte binding and
   retention/access constraints so a reviewer can inspect the answer and sources.
   A receipt alone stays insufficient. No automatic approval or application.

Milestone acceptance:

- [ ] One deterministic happy-path test traverses profile, intake, draft binding,
  synthetic offer/accept/resume, preflight, fake executor and pending-review
  evidence without hidden manual substitutions.
- [ ] Changes to each bound record, source revision, effect ceiling, recipient or
  reviewer invalidate the integrated attempt before the provider is called.
- [ ] Missing acceptance, pause/decline, unresolved concern, pending transfer,
  unavailable review and human/hybrid executor attempts cause zero dispatches.
- [ ] Tests demonstrate unchanged source and preserved originals, restricted
  artifact access, sanitized errors/logs and no raw private-data leakage.
- [ ] A reviewer can inspect the substantive synthetic result and exact sources;
  generation, automated checking and human acceptance remain distinct states.

Step 1 has a non-dispatching `buildDraftBinding` / `verifyDraftBinding` API and
focused mutation tests in `binding.test.mjs`. Steps 2–4 now have a v2 API path
through the existing explicit contract lifecycle and executor. Tests use a fake
worker; no current live-model evidence or human acceptance is implied. Step 5
now has an opt-in v3 private result channel described below. A focused local
safety/correctness review corrected four issues recorded below; it was not an
independent audit. V4 now provides a local single-attempt ledger for cooperating
callers; qualified review, recovery assurance and live verification remain open
before broader orchestration.
Partial capability statuses remain unchanged: this is a narrow integration,
not the full recipient lifecycle, source resolver or review workflow.

### Draft binding API v1

Import the functions from this package's `bundle.mjs`; no other skill package is
needed. Pass exactly `profileJson`, `intakeJson`, `assignmentJson`, and
`workspaceJson`, each a compact JSON object encoded by `JSON.stringify`. Preserve
those exact strings privately. Key/array ordering is significant: this is an
explicit byte encoding, not order-independent JSON canonicalization. Duplicate
keys, alternate whitespace and other non-round-tripping encodings are rejected.
Each string is limited to 256 KiB. No draft CLI or persistence is added yet.

The builder independently reruns profile/intake/assignment validation. The
profile must resolve and explicitly require `readonly_roundtrip`. Intake must
describe an agent, have no outstanding concern and declare available review.
Its authority labels must be exactly `allowed: ["execute-read-only"]` and
`prohibited: ["write-source", "external-network"]` in that order. These are
declarations, not permission checks. Human/hybrid descriptions remain possible
in intake alone but are rejected by this agent-only draft builder.

The assignment must fit the existing local read-only OpenCode path and fixed
Node version check. Outcome, exclusions, accountable owner, reviewer, data
classification, effort, date, dependencies, pause permission, escalation contact
and stop conditions must agree across intake and assignment. No semantic guessing
is performed. `"none"` maps only to a null target date. Intake review criteria are
preserved in its hash separately from the executor's fixed runtime check; that
check does not satisfy substantive review. The named intake recipient is bound
through the intake digest, not inferred from a provider/model identifier.

`workspaceJson` contains exactly `root`, `identity`, `revision`, `status_digest`:
an absolute root, root-plus-`#`-branch identity, full 40-character lowercase Git
revision matching the assignment base, and SHA-256 of the empty string declaring
a clean status. These are checked for consistency only; no Git command or path
read verifies the workspace in this slice.

Output is a `unified-harness.draft-binding.v1` record with exact input SHA-256
digests, the observed bundle-file digest, and its own digest over the fixed-order
JSON body excluding `binding_sha256`. It contains no raw outcome, recipient,
paths or review criteria. Hashes still require appropriate handling and are not
anonymization. The builder reads its own bundle for source inspection but does
not read request paths, write files, call a provider, or modify inputs. Errors
use fixed messages without caller-supplied content.

`verifyDraftBinding(record, inputs)` rebuilds and compares the entire record;
changes or held inputs reject. Its `true` result establishes consistency only.
Records remain `draft_for_review`, with unverified declared workspace state,
no recorded acceptance and `execution_authorized: false`. They are unsigned,
provide no replay protection, and must not be substituted for accepted contract
scope. Model endpoints/runtime identity, authenticated recipient consent,
freshness, isolation and actual review require later integration and external
controls. Do not rebuild a draft silently to bypass a stale binding.

### Integrated contract scope v2

Call `buildBoundScope(inputs, endpoint)` before offering work. It returns a compact
JSON scope containing `kind: "unified-harness-readonly-v2"`, `assignment_sha256`,
`binding_sha256`, and the exact loopback `endpoint`. This prepares scope only;
it does not create a packet or record consent. The scope is covered by the
existing Hypervisor assignment digest when explicitly offered and accepted.

Construct the packet with the bound workspace and intake recipient as owner.
Offer with that scope, the profile's primary purpose, intake accountable human
as assigner, intake reviewer, and `JSON.stringify(intake.acceptance.checks)` as
`acceptanceEvidence`. Retain the required read-only authority declarations. The
recipient must separately accept the exact offered revision and explicitly
resume it. Do not synthesize those actions outside a clearly labelled test.

Invoke `contractRoundtrip({ packet, assignmentPath, endpoint, bindingInputs })`.
It snapshots the binding inputs, rebuilds the binding against the current bundle,
compares exact scope and endpoint, and checks recipient, purpose, review criteria
and workspace identity. Existing acceptance/resume, concern/transfer, role,
assignment-byte and actual clean-workspace checks still apply before provider
checks. The assignment file must contain the exact bound assignment bytes.
No scope rewriting, fallback to v1, auto-resume or auto-accept occurs.

The v2 receipt includes `binding_sha256` with pending review. Legacy v1 packets
remain supported only without `bindingInputs` and produce v1 receipts; they
cannot be represented as integrated runs. There is no v2 CLI yet. Repeated
invocation of an accepted packet is not prevented: this slice provides no durable
single-use ledger, authenticated identity or deployment attestation. Endpoint
identity is pinned as a URL, not proof of the server/model behind it. External
isolation, actual authorization and substantive human review remain required.

The synthetic round-trip test now exercises v2 preparation through an explicitly
accepted/resumed packet and fake worker. Negative cases cover missing binding
inputs, legacy mixing, substituted endpoint/recipient/purpose/review criteria,
missing acceptance/resume, pause, concerns/transfers, and changed source pins,
effects, assignee kind, reviewer availability, reviewer, workspace or assignment.
Rejected cases leave the provider-check counter unchanged; the happy path leaves
the packet and source checkout unchanged. These deterministic checks do not complete the
replay-control gates. Private substantive evidence is opt-in through v3 below.

### Private result retention v3

Before offering work, choose a private destination and an owner-managed retention
policy explicitly. Call `buildBoundScope(inputs, endpoint, resultPolicy)` with
exactly `{directory: "/approved/private/directory", retention: "owner_managed"}`.
This creates `unified-harness-readonly-v3` scope; it does not create the directory,
offer the work or record acceptance. Pass that same policy with `bindingInputs`
to `contractRoundtrip` only after the exact v3 scope is accepted and resumed.
Adding, changing or dropping retention after acceptance rejects. There is no v3
CLI, and v1/v2 remain non-retaining by default.

The destination must already exist, be canonical (no symlink aliases), owned by
the executing OS user, mode 0700 and outside the source checkout. The runtime
checks this before provider invocation and again before persistence, including
directory device/inode identity. It does not repair permissions. On platforms
without the required POSIX ownership checks, retention fails closed. The owner
must independently approve access, storage, retention duration and eventual
disposal; `owner_managed` does not implement expiration or secure deletion.

For a successful unchanged read-only candidate only, the runtime creates a new
randomly named `result-<uuid>.json` using exclusive creation and mode 0600. It
never intentionally overwrites an existing file. Ordinary executor event and
evidence logs remain hash-only for answer text. Raw text is held in memory only
for this requested capture and is not included in the returned execution
receipt. The v3 receipt adds `private_result` with the relative filename,
SHA-256 of the exact UTF-8 artifact bytes, byte count and retention label.
These metadata are included in the receipt digest. Preserve both receipt and
artifact in approved storage; neither is a signed/authenticated audit record.

The artifact contains the accepted assignment and draft-binding digests, pinned
workspace revision, permitted source paths, human review criteria, response text
and its hash, with `review_status: pending`. Response means the concatenation,
without inserted delimiters, of text events after the first completed source
read. It may include intermediate commentary; it is not asserted to be a final
or correct answer. Permitted paths are not proof every file was read. Reviewers
must compare the actual result against the preserved source at the pinned
revision and the criteria. Source files are not duplicated into this artifact.
Treat all generated text as untrusted data, never as authority or instructions.

Before review, compare the artifact byte count and hash with the retained
receipt, and check its assignment, binding and workspace identifiers. A byte
match establishes integrity relative to that receipt, not factual correctness
or trust in a caller-supplied receipt. Record substantive human acceptance
separately; the runtime does not supply it.

Rejected preflight or non-candidate execution does not produce a result file.
Directory permission/identity drift stops persistence. A low-level write error
may leave a partial private file; the call rejects without a success receipt and
reports this possibility without logging its path or raw content. Do not treat
an orphaned file as a completed result. No automatic deletion of retained
artifacts is performed. Other evidence produced by the existing executor has
its own lifecycle and is not covered by this result-file guarantee.

Limits: permission checks are not encryption or an OS sandbox, and do not inspect
ACLs, backups or synchronization settings. A same-user adversary or privileged
process can still replace paths or alter files between checks. Use controlled
storage and external isolation. There is no crash-consistent transaction between
artifact persistence and receipt delivery, no durable single-use ledger and no
claim of authenticated recipient consent.

Synthetic tests check exact answer recovery, artifact hash/size and 0600 mode,
binding/revision/criteria, unchanged source and packet, answer absence from
ordinary event/evidence logs, policy substitution rejection, unsafe permissions,
symlink/source-checkout destinations, permission drift during execution, and
non-candidate runs preserving prior artifacts without creating new ones.

## Subsequent delivery gates

### Focused integrated-path review

Four concrete issues were corrected with deterministic regression coverage:

- **Unbound writes:** `outputRoot` let contract callers select persistent log
  destinations outside the accepted scope, including the source checkout. All
  contract versions now reject that option before I/O. Internal execution logs
  stay temporary; v3 is the supported contract-bound retained-result channel.
  The low-level executor remains a trusted API, not an authorization boundary.
- **Raw metadata in evidence:** arbitrary session IDs, finish reasons, token
  payloads, tool/status/type labels and error names could carry text into logs or
  receipts. Event summaries now use fixed labels, nonnegative integer counts and
  hashes. Agent finish metadata uses the same sanitizer; prohibited tool errors
  no longer echo supplied names. Metadata-canary tests cover both summaries and
  actual executor logs/receipts. This is not a general data-loss-prevention system.
- **UTF-8 chunk corruption:** independently decoding pipe chunks could alter
  a multibyte answer while still returning a candidate. Stateful decoding now
  preserves characters split across chunks; a fake-worker regression verifies
  the exact retained Unicode answer and its artifact hash.
- **Ignored prohibitions:** a valid accepted packet could prohibit the very
  execution it allowed, or carry an unsupported prohibition that the adapter
  ignored. The round trip now rejects labels outside its supported set before
  provider checks. Supported prohibitions are `commit`, `push`, `merge`, `deploy`,
  `external-account-actions`, `third-party-contact`, `write-source` and
  `external-network`; the last two remain mandatory. This restricted vocabulary
  does not interpret arbitrary natural-language constraints.

The opt-in live fixture uses the accepted retention channel, not unbound logs or
a response-capturing wrapper. Its bounded v5 live result is recorded above.
The separate skill validator's PyYAML dependency is now resolved for the local
validation environment, and that check passed. No commit or remote
publication is implied by this review.

Remaining material limits for v1–v3: no replay/single-use control, no authenticated
consent store, no OS sandbox or guaranteed model locality, source-read violations
detected after exposure, same-user path races, and no atomic artifact/receipt
transaction. Human review is still pending. The next bounded design/implementation
priority was replay-safe invocation state, now implemented as the opt-in v4
slice below. Do not infer retry authorization or silently reuse an accepted packet.

### Invocation ledger v4

Use `buildBoundScope(inputs, endpoint, resultPolicy, invocationPolicy)` with
exactly `{directory: "/approved/private/ledger", mode: "single_attempt"}` for the
invocation policy. `resultPolicy` may be undefined if no answer retention is
authorized. The scope becomes `unified-harness-readonly-v4`; offer it, obtain
explicit acceptance and resume, then pass the same `invocationPolicy` to
`contractRoundtrip`. Missing, changed or added-after-acceptance policies reject.
Older scopes remain supported but have no single-attempt guarantee; migration
requires a new offer, not rewriting accepted scope.

The ledger must already exist, be canonical, owner-only mode 0700, owned by the
executing OS user and outside the source checkout. Preserve it independently of
ephemeral execution files and result-retention cleanup. After contract and
workspace preflight, but before cloning or provider access, exclusive creation
claims `<accepted-assignment-digest>.claim.json` at mode 0600. The file and its
directory are fsynced before execution proceeds. A pre-existing claim or terminal
file blocks execution regardless of its contents. Storage errors fail closed;
partial records are never automatically removed. Competing callers sharing this
intact ledger cannot both claim the same accepted assignment.

A successful candidate writes a separate exclusive terminal record with state
`completed` and the receipt digest; ordinary execution failure attempts a terminal
record with `failed` and a hash of the error, not its raw content. File/directory
sync and identity checks also apply to terminal persistence. The v4 receipt binds
the assignment identity and claim hash. `completed` means the executor produced a
candidate receipt, never human approval. A failure during terminal persistence
can leave uncertainty even if an artifact was already written or work performed.
No automatic compensation, retry, claim expiry or ledger reset is supplied.

`inspectInvocation(invocationPolicy, assignmentDigest)` reads bounded private
records without dispatch or mutation. A consistent terminal pair reports
`completed` or `failed`; absent, partial, unreadable or inconsistent records
report `unclaimed_or_uncertain` with reconciliation required. Every result states
`execution_authorized: false` and `retry_authorized: false`. Invalid policy or
unsafe directory rejects. Inspection is not authenticated evidence, nor a way
to distinguish a crashed worker from one still running.

Recovery procedure:

1. Stop dispatch for the affected work and preserve the ledger, packet, receipt
   and any private result; do not clear a claim or move to another ledger.
2. The owner verifies whether the worker is still active and reconciles side
   effects and candidate artifacts. A missing receipt does not prove no execution.
3. Review the outcome and concerns. If another attempt is genuinely needed,
   record the reason and prior attempt identity in the reviewable work history,
   obtain a newly reviewed offer revision, explicit acceptance and resume, and
   retain the previous attempt. The runtime does not perform these actions.
4. Do not invent a new work identity, regenerate an equivalent offer, or delete
   state simply to evade the consumed claim. Authorization for retry is an
   external owner/recipient decision, not inferred from failure or elapsed time.

Tests cover concurrent same-process requests, a fresh-process replay against the
same ledger, successful/failed terminal inspection, incomplete claims, orphaned
terminal records, directory permissions and policy substitution. The interrupted
case is simulated with an incomplete claim, not a power-loss fault injection.
The opt-in live fixture uses v5, including this ledger; its one passing live run
does not independently test replay or interrupted-run recovery.

Guarantee limits: this is at-most-one **attempt** per accepted digest for
cooperating processes with an intact trusted local ledger, not exactly-once
execution or a distributed transaction. It relies on filesystem exclusive-create
and fsync semantics; unsupported storage fails closed where detectable, but
network filesystems, hardware/power-loss durability and rollback are not proven.
Deleting/replacing the ledger or its files, changing the accepted digest, or
using a different machine/storage copy defeats its scope. Same-user tampering,
path races and unauthenticated identities remain external-control requirements.
Artifact, terminal and receipt delivery are not one atomic transaction. A stale
accepted packet does not become safe merely because a claim is available.

The recovery review confirmed the conservative boundary: failures preserve the
claim, missing/partial terminal records require reconciliation, and no automatic
retry is supplied. V5 adds the start-window gate below. This is a local review,
not independent crash/power-loss assurance. Planned queue/dispatch capabilities
remain unchanged.

### Execution start window v5

Pass `executionWindow` as a fifth argument to `buildBoundScope` and the same
named option to `contractRoundtrip`. It contains exactly `not_before` and
`expires_at`, both calendar-valid canonical UTC strings such as
`2026-11-04T15:00:00.000Z`. Start must precede expiry. Natural-language dates,
offset timestamps, missing milliseconds, impossible dates and extra fields
reject; the runtime does not guess timezone or duration. V5 requires an explicit
invocation policy. The complete window is part of accepted scope, so changing,
omitting or adding it requires a new reviewed offer and acceptance.

The window controls starting execution, not the validity of an answer. The start
instant is inclusive; the expiry instant is exclusive. Checks occur at contract
preflight, immediately before claiming, before model-endpoint checks and after
provider-lease acquisition immediately before launching the worker. Observed
backward wall-clock movement within that invocation rejects. The accepted offer,
acceptance and resume timestamps must be ordered and not future-dated. No
caller-supplied clock is used by the contract path. The separately exported
`inspectExecutionWindow(window, now)` supports deterministic metadata inspection
and always reports `execution_authorized: false`.

If the first checks fail, no claim or provider request occurs. Expiry or clock
regression detected after claiming fails that attempt without automatic retry;
normal v4 reconciliation applies. Endpoint discovery may already have happened
if expiry occurs during provider preflight. A worker already launched is governed
by its existing timeout, not forcibly stopped at window expiry. The v5 receipt
records the accepted window and retains pending human review. There is no implicit
relationship between this UTC window and the intake's calendar target date.

This is a declared start-window consistency gate, not verification of continuing
consent, source freshness, capacity or real-world authority. The owner chooses
the window and must still revalidate those facts. There is no prescribed maximum
duration. System-clock trust, cross-process rollback detection, distributed clock
synchronization and instantaneous revocation are not implemented. Legacy v1–v4
scopes remain supported without this gate and must not be described as expiring.

Tests cover exact start/expiry boundaries, malformed dates, valid v5 execution,
future/expired rejection without new ledger files or provider calls, substituted
or missing windows, and simulated expiry during endpoint preflight leaving a
failed claim. Simulation changes the clock only inside a deterministic test and
restores it afterward; it is not a production clock-control mechanism. The
opt-in live fixture uses v5 and has one recorded strict pass. See the consolidated
verification summary for the current suite; expiry edge cases remain synthetic.

Consolidation review: CI now discovers all harness tests; a regression check binds
the documented capability inventory to the runtime statuses. The live fixture
targets v5, and legacy limits are explicit in the version table above. No new
execution capability or authority is introduced by this packaging pass.

Handoff remains local and uncommitted. The skill-validator dependency was
installed in a temporary isolated environment and validation passed; it was not
added to the Node runtime or system Python. Recreate that validation environment
with PyYAML 6.0.3 if it is removed. The authorized strict live v5 smoke test passed;
remaining verification includes independent/human review appropriate to intended
use. Do not substitute
these synthetic results for authenticated consent, external isolation, power-loss
recovery assurance or release approval. Commit/push/PR updates remain separate.

### Gates at the original v5 checkpoint

- [ ] Complete scenario-based professional/advisory, fair-process, safety,
  coverage and triage behavior. Preserve human judgment rather than forcing every
  guidance capability into an automated approval adapter.
- [ ] Complete recipient lifecycle and human/hybrid descriptive contracts.
- [ ] Add provider facade and bounded dispatch, then durable sequential queues
  and explicitly selected goal pursuit. Verify recovery before more adapters.
- [ ] Add isolated candidate-change and defect-reproduction paths under separate
  scoped write authorization and independent review.
- [x] Record the owner’s confirmation of sole authorship and document the included components in [the source record](sources.md).
- [x] Run the bounded strict live v5 smoke test; deterministic regression and
  isolated skill validation also pass. This is not production acceptance.
- [ ] Complete broader behavioral assurance appropriate to the intended use.
- [ ] Review documentation/illustration claims and accessibility separately from
  structural checks. Record human acceptance only when actually supplied.
- [ ] Review the complete diff and prepare a release/PR scope that accurately
  separates delivered capabilities from future work. Commit, push, merge and
  public release remain separately authorized actions.
