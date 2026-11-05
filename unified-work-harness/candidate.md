# Prepare a text change for independent review

Use the candidate API when an agent should propose specific UTF-8 file replacements or reproduce a defect described by a literal text assertion. The provider sees the approved source texts, outcome, exclusions, expected behavior and permitted edit paths. Verify that the chosen provider and model actually process this data locally. The packet owner prepares the offer and a different named reviewer inspects the private result.

## Prepare the request

Import `inspectCandidateRuntime`, `buildCandidateScope`, `candidateRoundtrip` and `readCandidateForReview` from `./candidate.mjs`. Pin the three independently reviewed SHA-256 values returned by runtime inspection and the reviewed full-package digest from `packageInventory()` in `package.mjs`. Select `candidate_changes` and `assignment_intake` explicitly. This lane requires the five effects shown below for local file inspection, private artifacts, Git reads and a loopback provider request. The source checkout must be a clean Git repository at the absolute canonical `root`, with the exact branch/commit and empty status digest. Copy the named workspace record into both request and packet. For contract preflight use a plain, complete local clone. The contract refuses submodules and unrecognized repository settings, including executable filters, and ignores system and user Git configuration.

Below is a request for a synthetic document correction. Supply real reviewed values for the variables. The two canonical private directories must already exist, belong to the current OS user, have mode 0700 and sit outside the source checkout. Use separate locations for ledger and result retention.

```js
const allowed = ["read", "prepare-candidate", "local-provider"];
const prohibited = ["commit", "push", "merge", "deploy", "external-account-actions",
  "third-party-contact", "write-source", "external-network", "execute-generated-code"];
const request = {
  mode: "candidate_edit", purpose: "0x3",
  packageProfile: {primary: "0x3", requiredCapabilities: ["candidate_changes", "assignment_intake"],
    effectCeiling: ["read", "write", "git", "provider", "network"], sourceSha256: reviewedPackageHash},
  runtime: { bundle: reviewedBundleHash, candidate: reviewedCandidateHash, intake: reviewedIntakeModuleHash },
  workspace: {root, identity: root+"#"+branch, revision, status_digest: sha256("")},
  intake: {
    outcome: "Correct the unit in the public synthetic label.", exclusions: ["applying edits"],
    assignee: {kind: "agent", id: "worker"}, accountableHuman: "owner",
    authority: {allowed, prohibited}, dataClass: "public",
    resources: {effortMinutes: 10, deadline: "none", dependencies: [], reviewerAvailability: "available"},
    acceptance: {checks: ["Inspect the unit and all other edits"], reviewer: "reviewer"},
    escalation: {contact: "owner", stopConditions: ["ambiguous units"], mayPause: true}, concerns: [],
  },
  reads: ["label.txt"], writes: ["label.txt"],
  assertions: [{path: "label.txt", contains: "Length (mm)", expected: true}],
  data: {containsSecrets: false, containsSensitivePersonalData: false, processing: "local"},
  provider: {adapter: "openai_chat", endpoint: "http://127.0.0.1:8000/v1/chat/completions", model: localModel},
  limits: {contextBytes: 32000, replyBytes: 64000, tokens: 1500, timeoutMs: 30000},
  invocationPolicy: {directory: ledgerDirectory, mode: "single_attempt"},
  resultPolicy: {directory: resultDirectory, retention: "owner_managed"},
  executionWindow: {not_before: approvedStartUTC, expires_at: approvedExpiryUTC},
};
request.intakeReview = reviewIntake(JSON.stringify(request.intake), recordedReviewerAssessment);
const scope = buildCandidateScope(request);
```

Use the human assessment workflow in `intake.mjs` to supply `recordedReviewerAssessment`. The contract pins this review and rechecks its expiry and clearance before provider launch.

Create a Hypervisor `Implementation` packet with the identical workspace, owner, outcome, allowed and prohibited effects. Offer `scope` under the request purpose, with the same assigner and reviewer and `acceptanceEvidence: JSON.stringify(request.intake.acceptance.checks)`. The recipient explicitly accepts that exact digest and resumes in the bound workspace. The `unified.text-candidate.v2` offer hashes the package profile and serialized request, including the paths, budgets, data declarations, stopping conditions, reviewer, endpoint, private result destination and ledger. Keep the exact request bytes and reviewed source revisions available to the operator and reviewer.

## Run and inspect

```js
const receipt = await candidateRoundtrip({packet: resumedPacket, request, signal: controller.signal});
const candidate = readCandidateForReview({packet: resumedPacket, request, receipt});
```

The signal is optional. Preflight rejects source index flags that hide tracked edits (`assume-unchanged` or `skip-worktree`), checks scope and workspace, reads only pinned regular Git blobs, checks the start window, and claims one attempt before the first provider request. The provider proposes data. The harness validates paths and materializes only exact approved replacements in an owner-private temporary directory. Existing edit targets require read permission. Newly created files must have a valid directory parent chain. An edit candidate must change at least one file and satisfy all accepted literal assertions. Submitted candidates may still contain inappropriate changes. The designated reviewer inspects every replacement and base digest before deciding on further action.

For a defect fixture, set `mode: "defect_reproduction"`, use the same asserted expected behavior, and permit exactly one new fixture path such as `writes: ["tests/unit-label.json"]`. At least one accepted assertion must fail against the pinned source. The result stores the declarative fixture plus one boolean outcome per assertion. To repeat the same check against a proposed fix, pass the saved fixture and independently obtained file texts to the pure oracle:

```js
import {evaluateTextFixture} from "./candidate.mjs";
const fixture = JSON.parse(candidate.edits[0].text);
const outcomes = evaluateTextFixture(fixture, {"label.txt": correctedLabelText});
```

Each boolean compares the supplied text with its literal expectation. The oracle reads no files and executes no submitted code. This workflow reproduces defects observable in text. Runtime crashes, performance regressions and arbitrary executable tests need separately authorized tooling. Applying an accepted candidate to a source checkout is a separately authorized action.

## Provider and storage limits

| Adapter | Accepted loopback route | Protocol |
| --- | --- | --- |
| `openai_chat` | `/v1/chat/completions` | One assistant JSON object, one completed choice, explicit completion-token cap |
| `ollama_chat` | `/api/chat` | One nonstreamed assistant JSON object, schema-constrained edits, completed stop reason, explicit prediction-token cap |

Both adapters take the same contract, budgets and cancellation signal. Each issues at most one POST with redirects disabled, accepts no tool calls, and bounds the actual reply bytes before parsing. The timeout and cancellation abort the local request and prevent successful persistence when observed. An already running remote inference engine may continue. Neither adapter invokes a shell, runs generated source, downloads a model or falls back to another endpoint. Failures after the claim consume the attempt. Work with content requiring a different model or endpoint requires a new reviewed offer.

Keep receipts separate from the private result. The receipt identifies the package and profile hashes, assignment, claim, pending reviewer, artifact name, size and hashes. Reading for review checks the receipt against the completed ledger and verifies artifact bytes and permissions. Preserve the ledger and artifacts through handoff. Trusted local filesystems and same-user controls remain operational prerequisites. A failure persisting the terminal record or delivering the receipt may leave an orphaned artifact; the owner must reconcile before any new offer.

`candidate.test.mjs` uses ephemeral synthetic listeners for both protocols and exercises substitutions, replay, cancellation, redirects, scope escape, byte budgets and a failing defect oracle. Compatibility with a particular live server/model pair requires a separately approved run.

For an opt-in live synthetic check with an already provisioned local `qwen2.5:3b` model, run `UNIFIED_LIVE_CANDIDATE=1 node --test live-candidate.test.mjs`. Both adapters address the same numeric loopback service on port 11434. The test verifies the returned replacement text against a synthetic Git fixture and opens the private candidate with its receipt.
