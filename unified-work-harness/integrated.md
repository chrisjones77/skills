# Bind a reviewed intake to a read-only agent contract

Use this path when an agent will inspect a clean Git revision through a local model. Protected paths are checked without regard to letter case. Select individual files or narrower directories when a recursive grant would include a protected path. Source preflight rejects tracked entries marked `assume-unchanged` or `skip-worktree`, even if Git reports a clean checkout. Use a plain full clone without submodules or custom local Git configuration. The accepted contract excludes repository filters, hooks, partial-clone settings and inherited Git configuration. Use trusted Git and worker binaries. Keep the review, packet, source, paths and captured response in the owner's private workspace. The reviewer first records actual authority, remaining concerns, capacity and expiry using [Intake review](intake.md).

1. Inspect the installed public package, including its manifest, and independently record its inventory digest. Record the embedded executor digest separately. On receipt, compare both against the digests the owner reviewed.
2. Prepare the existing four compact JSON inputs for the read-only executor. The embedded profile must require `readonly_roundtrip` and cover its effects. Prepare a full-package profile with the same primary, companions, requested effects and ceiling. Include `assignment_intake` and `readonly_roundtrip` in its required capabilities. Use the full-package digest as its source pin.
3. Use the exact private intake review and package profile to build the scope **before offering work**. Review its allowed source, endpoint, private results directory (if used), single-attempt ledger and execution window. Complete the ordinary offer, acceptance and resume with the named parties.
4. Invoke the accepted packet with the identical inputs. Before claiming the ledger, the executor checks the accepted scope, human review, package inventory, executor binding, workspace and clock. It rechecks the package, review and time before every model discovery request and again before launching the worker. A package or intake change requires a fresh review and offer. A failure after the ledger claim consumes the attempt.
5. Check the receipt digest, package binding, terminal ledger record and private result. The reviewer assesses the result against the accepted criteria and records a separate disposition. The receipt identifies the reviewed bytes. Identity and authority require evidence outside these records.

The read-only OpenCode worker uses the generated configuration and an isolated home. Project configuration, external skills and automatic project prompts are disabled. OpenCode 1.18.25 can still attach instructions beside a nested read. Before claiming an attempt, the harness refuses a grant that reaches a symlink or would expose an unoffered nested `AGENTS.md`, `CLAUDE.md` or `CONTEXT.md`. Source preflight and the disposable checkout must each represent distinct pinned Git paths as distinct directory entries. Every physical entry inside a recursive grant in the disposable checkout must belong to the pinned tree. A regular instruction file may be included explicitly in the reviewed read scope.

The read-only executor fetches the accepted commit into a disposable repository with its own Git directory. The harness initializes OpenCode’s project ID from that commit before the first snapshot. Before launch and after worker exit, it compares names, types, modes, file bytes and symlink targets across the entire checkout, including Git configuration, index, refs and objects. A change rejects the result. After the worker exits the verifier reads files directly, and cleanup removes the temporary directory. Each snapshot permits up to 1 GiB of regular-file content, 100,000 entries and depth 128. Hard-linked regular files and unsupported entries reject the run. For direct POSIX calls the executor starts OpenCode in a dedicated process group. It terminates that group on worker exit, timeout or a policy violation. It allows up to two seconds to drain output after exit and rejects a run whose pipes stay open. Queued calls remain in the group owned by the queue supervisor. The host is responsible for processes that deliberately detach from supervision. This comparison covers final state. Preventing transient edits or concurrent interference requires host isolation.

```js
import { buildPackageScope } from './integrated.mjs';
import { contractRoundtrip } from './bundle.mjs';

const packagePolicy = { profileRequest, intakeReview };
const policies = { bindingInputs, endpoint, resultPolicy, invocationPolicy, executionWindow, packagePolicy };
const scope = buildPackageScope(policies);
// Offer this exact scope and obtain acceptance and resume for its digest.
const receipt = await contractRoundtrip({ ...policies, packet: acceptedResumedPacket, assignmentPath });
```

The scope kind is `unified-harness-readonly-v6`. Its receipt is `unified.contract-executor-receipt.v6`. Both carry `package_binding` with the inventory, full-profile request, exact intake and review digests plus the intake expiry. Older accepted packets retain their original scope version and checks, including the embedded-source pin. A change to the installed bundle invalidates that pin. Use a fresh offer for v6. The executable synthetic example is [integrated.test.mjs](integrated.test.mjs).


## Private storage and provider recovery

Place the result directory, invocation ledger and queue database outside every source checkout used by that operation. The harness checks each storage directory’s physical ancestry before writing.

Use an HTTP base URL ending in `/v1` on localhost, 127.0.0.1 or [::1]. Credentials, query strings and fragments (including a bare `?` or `#`) are rejected before offer. When the provider is mounted under a path prefix, model discovery, Ollama metadata and completions use that prefix. Discovery, direct completions and harness-launched OpenCode calls reject redirects. OpenCode receives a per-run authenticated loopback relay that streams only completion requests to the accepted route. The relay closes with the worker. The standalone configuration preview describes the provider and permissions; launching that file by hand bypasses the relay. Admission also rejects ports forbidden by the Fetch transport. Queue dispatch rebuilds the complete accepted scope and verifies the assignment bytes, packet workspace and resume checkpoint before reserving provider time.

Set the host temporary directory outside the source checkout. Both contracts resolve the physical directory before claiming the attempt and reuse it for scratch even if the environment changes. Queued dispatch checks it before charging a reservation. Cooperating read-only workers sharing this temporary directory use one lease per local HTTP port, including alternate URL spellings and API paths on that port. The accepted contract retains the endpoint string that was offered.

A waiter may reclaim a provider lease after its owner exits. Reclaimers take an exclusive sibling directory ending in `.lock.recovery` and recheck the owner token before removing the stale lease. If a reclaimer crashes while holding this guard, subsequent stale-lease recovery can time out. Stop the dispatchers sharing that endpoint, verify the owner and reclaimers have exited, and inspect the lease record before retiring an abandoned guard. Resume with one dispatcher first. Quiesce older harness versions before switching a shared lease namespace to this version.

To replay the redirect regression with the installed OpenCode binary and synthetic loopback servers, run `UNIFIED_TEST_INSTALLED_OPENCODE=1 node --test --test-name-pattern="OpenCode completion after a source read" integrated.test.mjs` from the package directory. The ordinary suite exercises the same listeners with a synthetic worker.

Model discovery accepts at most 1 MiB of decoded data per response, including compressed and chunked responses. The model list must be valid UTF-8 JSON and advertise the requested model. Ollama version and tag metadata can be unavailable. An oversized response or an explicit tool-capability declaration that cannot support the worker stops launch. Both v5 and v6 recheck the start window before requesting metadata following the model list.

Provider lease waits use elapsed time. Automatic recovery requires a dead owner and a private lease directory containing only its bounded regular owner receipt. If the receipt or directory is ambiguous, the lease stays in place for operator inspection.

A completed OpenCode read counts toward the receipt when its event names an in-scope regular file present under that spelling at worker launch. A directory listing may precede the read. The post-read answer must be text. Inspection checks the worker’s report against the checkout; the reviewer still assesses what the answer establishes.
