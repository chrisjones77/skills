# Bind a reviewed intake to a read-only agent contract

Use this path when an agent will inspect a clean Git revision through a local model. Protected paths are checked without regard to letter case. Select individual files or narrower directories when a recursive grant would include a protected path. Source preflight rejects tracked entries marked `assume-unchanged` or `skip-worktree`, even if Git reports a clean checkout. Use a plain full clone without submodules or custom local Git configuration. The accepted contract excludes repository filters, hooks, partial-clone settings and inherited Git configuration. Use trusted Git and worker binaries. Keep the review, packet, source, paths and captured response in the owner's private workspace. The reviewer first records actual authority, remaining concerns, capacity and expiry using [Intake review](intake.md).

1. Inspect the installed public package, including its manifest, and independently record its inventory digest. Record the embedded executor digest separately. On receipt, compare both against the digests the owner reviewed.
2. Prepare the existing four compact JSON inputs for the read-only executor. The embedded profile must require `readonly_roundtrip` and cover its effects. Prepare a full-package profile with the same primary, companions, requested effects and ceiling. Include `assignment_intake` and `readonly_roundtrip` in its required capabilities. Use the full-package digest as its source pin.
3. Use the exact private intake review and package profile to build the scope **before offering work**. Review its allowed source, endpoint, private results directory (if used), single-attempt ledger and execution window. Complete the ordinary offer, acceptance and resume with the named parties.
4. Invoke the accepted packet with the identical inputs. Before claiming the ledger, the executor checks the accepted scope, human review, package inventory, executor binding, workspace and clock. It rechecks the package, review and time before every model discovery request and again before launching the worker. A package or intake change requires a fresh review and offer. A failure after the ledger claim consumes the attempt.
5. Check the receipt digest, package binding, terminal ledger record and private result. The reviewer assesses the result against the accepted criteria and records a separate disposition. The receipt identifies the reviewed bytes. Identity and authority require evidence outside these records.

The read-only executor fetches the accepted commit into a disposable repository with its own Git directory. The harness initializes OpenCode’s project ID from that commit before the first snapshot. Before launch and after worker exit, it compares names, types, modes, file bytes and symlink targets across the entire checkout, including Git configuration, index, refs and objects. A change rejects the result. After the worker exits the verifier reads files directly, and cleanup removes the temporary directory. Each snapshot permits up to 1 GiB of regular-file content, 100,000 entries and depth 128. Hard-linked regular files and unsupported entries reject the run. This comparison covers final state. Preventing transient edits or concurrent interference requires host isolation.

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
