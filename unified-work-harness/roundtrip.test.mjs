import { redirectStatuses } from './test-support.mjs';
import test from "node:test";
import { once } from "node:events";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, linkSync, renameSync, rmSync, realpathSync, statSync, readdirSync, symlinkSync, existsSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { acquireProviderLease, claimInvocation, contractRoundtrip, inspectInvocation, runHarness, summarizeOpenCodeEvent, buildBoundScope, hypervisor, sha256, rejectExplicitlyUnsupportedTools, buildOpenCodeConfig, buildAgentPrompt, validateAssignment, inspectWorkProfile, inspectWorkIntake, listWorkCapabilities, inspectBundledSource } from "./bundle.mjs";

test("untrusted event metadata cannot carry raw text into summaries", () => {
  const secret = "private-canary";
  for (const type of [secret, "tool_use", "step_finish", "error", "text"]) {
    const event = {type, sessionID:secret, timestamp:secret, part:{tool:secret,state:{status:secret,input:secret,output:secret},text:secret,reason:secret,tokens:{total:secret,output:2,extra:secret}},error:{name:secret,data:{statusCode:secret,message:secret}}};
    const summary = summarizeOpenCodeEvent(event);
    assert.ok(!JSON.stringify(summary).includes(secret));
    if (type === "step_finish") assert.deepEqual(summary.tokens, {output:2});
  }
});

test("intake supports human, agent and hybrid records without fabricating acceptance or authority", () => {
  const request = {
    outcome: "private-canary outcome", exclusions: ["No publication"], assignee: { kind: "human", id: "recipient" }, accountableHuman: "owner",
    authority: { allowed: ["read"], prohibited: ["publish"] }, dataClass: "internal",
    resources: { effortMinutes: 30, deadline: "none", dependencies: [], reviewerAvailability: "available" },
    acceptance: { checks: ["Inspect evidence"], reviewer: "reviewer" },
    escalation: { stopConditions: ["Unclear scope"], contact: "owner", mayPause: true }, concerns: [],
  };
  for (const kind of ["human", "agent", "hybrid"]) {
    const result = inspectWorkIntake({ ...request, assignee: { kind, id: "recipient" } });
    assert.equal(result.intake_status, "complete_for_review");
    assert.equal(result.assignee_kind, kind);
    assert.equal(result.recipient_acceptance, "not_recorded");
    assert.equal(result.authorization_status, "unverified");
    assert.equal(result.execution_authorized, false);
    assert.ok(!JSON.stringify(result).includes("private-canary"));
  }
  assert.equal(inspectWorkIntake({ ...request, concerns: ["scope uncertain"] }).intake_status, "hold");
  assert.equal(inspectWorkIntake({ ...request, dataClass: "restricted" }).intake_status, "hold");
  assert.equal(inspectWorkIntake({ ...request, authority: { allowed: ["read"], prohibited: ["read"] } }).conflicting_authority, true);
  assert.equal(inspectWorkIntake({ ...request, escalation: { ...request.escalation, mayPause: false } }).intake_status, "hold");
  assert.equal(inspectWorkIntake({ ...request, resources: { ...request.resources, reviewerAvailability: "unavailable" } }).intake_status, "hold");
  assert.equal(inspectWorkIntake({ ...request, resources: { ...request.resources, deadline: "2027-02-30" } }).intake_status, "hold");
  assert.ok(inspectWorkIntake({ ...request, concerns: undefined }).missing_fields.includes("concerns"));
  assert.throws(() => inspectWorkIntake({ ...request, grant: true }), /invalid intake request/);
});

test("profile inspection preserves routing, unresolved capabilities and the effect ceiling without granting authority", () => {
  assert.ok(listWorkCapabilities().some((item) => item.name === "sequential_queue" && item.status === "planned" && item.source === "not_implemented"));
  for (const name of ["coverage_review", "issue_triage", "professional_practice", "advisory_workflow"]) {
    assert.ok(listWorkCapabilities().some((item) => item.name === name && item.status === "partial"));
    assert.equal(inspectWorkProfile({ primary: "0xB", requiredCapabilities: [name], effectCeiling: [] }).profile_status, "hold");
  }
  for (const name of ["creative_seed", "video_workflow", "attention_support"]) assert.ok(!listWorkCapabilities().some((item) => item.name === name));
  const profile = inspectWorkProfile({ primary: "0x3", companions: ["0xB", "0x7"], requiredCapabilities: ["purpose_selection", "readonly_roundtrip"], sourceSha256: inspectBundledSource().sha256, requestedEffects: ["read"], effectCeiling: ["read", "write", "provider", "git", "network"] });
  assert.equal(profile.primary.command, "diagnose");
  assert.deepEqual(profile.companions.map((entry) => entry.command), ["verify", "design"]);
  assert.equal(profile.profile_status, "resolved_for_review");
  assert.equal(profile.execution_authorized, false);
  assert.equal(profile.authorization_status, "unverified");
  const missing = inspectWorkProfile({ primary: "0xB", requiredCapabilities: ["qvch_source_resolution", "call_response"], effectCeiling: [] });
  assert.equal(missing.profile_status, "hold");
  assert.deepEqual(missing.unresolved_capabilities.map((entry) => entry.status), ["partial", "partial"]);
  assert.equal(missing.required_capabilities[0].source, "embedded");
  assert.equal(inspectWorkProfile({ primary: "0x1", requestedEffects: ["write"], effectCeiling: ["read"] }).profile_status, "hold");
  assert.equal(inspectWorkProfile({ primary: "0x1" }).profile_status, "hold");
  assert.throws(() => inspectWorkProfile({ primary: "0x0" }), /orientation only/);
  assert.throws(() => inspectWorkProfile({ primary: "0x1", companions: ["0x2", "0x2"] }), /distinct/);
  assert.throws(() => inspectWorkProfile({ primary: "0x1", requiredCapabilities: ["invented"] }), /capability/);
  assert.throws(() => inspectWorkProfile({ primary: "0x1", effectCeiling: ["unbounded"] }), /effect/);
  assert.throws(() => inspectWorkProfile({ primary: "0x1", permission: "granted" }), /profile request/);
});

test("source-pinned profiles resolve only fixed dependencies and account for executor side effects", () => {
  const source = inspectBundledSource();
  assert.equal(source.sha256, sha256(readFileSync(new URL("./bundle.mjs", import.meta.url))));
  const request = { primary: "0xB", sourceSha256: source.sha256, requiredCapabilities: ["purpose_selection"], effectCeiling: [] };
  const result = inspectWorkProfile(request);
  assert.equal(result.schema_version, "unified-harness.profile-inspection.v2");
  assert.equal(result.profile_status, "resolved_for_review");
  assert.equal(result.source_pin_status, "matched");
  assert.equal(result.execution_authorized, false);
  for (const [pin, status] of [[undefined, "missing"], ["0".repeat(64), "mismatch"]]) {
    const held = inspectWorkProfile({ ...request, sourceSha256: pin });
    assert.equal(held.source_pin_status, status);
    assert.equal(held.profile_status, "hold");
  }
  for (const pin of [null, 42, "bad", "A".repeat(64)]) assert.throws(() => inspectWorkProfile({ ...request, sourceSha256: pin }), /invalid source pin/);
  for (const key of ["registry", "sourcePath", "dependencies", "execution_authorized"]) {
    assert.throws(() => inspectWorkProfile({ ...request, [key]: "private-canary" }), /invalid profile request/);
  }
  const dependencies = inspectWorkProfile({ ...request, requiredCapabilities: ["qvch_source_resolution"] });
  assert.equal(dependencies.profile_status, "hold");
  assert.deepEqual(dependencies.resolved_capabilities.map((entry) => entry.name), ["embedded_source_binding", "qvch_source_resolution"]);
  const underdeclared = inspectWorkProfile({ ...request, requiredCapabilities: ["readonly_roundtrip"], effectCeiling: ["read"] });
  assert.equal(underdeclared.profile_status, "hold");
  assert.deepEqual(underdeclared.outside_declared_ceiling, ["git", "network", "provider", "write"]);
  const inventory = listWorkCapabilities();
  inventory.find((entry) => entry.name === "qvch_source_resolution").dependencies.push("injected");
  assert.deepEqual(inspectWorkProfile({ ...request, requiredCapabilities: ["qvch_source_resolution"] }), dependencies);
});

test("profile CLI reports holds without invoking an executor", () => {
  const temp = mkdtempSync(path.join(tmpdir(), "unified-profile-"));
  try {
    const file = path.join(temp, "request.json");
    writeFileSync(file, JSON.stringify({ primary: "0xB", requiredCapabilities: ["sequential_queue"], effectCeiling: [] }));
    const cli = spawnSync(process.execPath, [fileURLToPath(new URL("./bundle.mjs", import.meta.url)), "profile", "--request", file], { encoding: "utf8" });
    assert.equal(cli.status, 2);
    assert.equal(JSON.parse(cli.stdout).execution_authorized, false);
    assert.equal(JSON.parse(cli.stdout).profile_status, "hold");
    writeFileSync(file, JSON.stringify({ outcome: "Incomplete intake" }));
    const intake = spawnSync(process.execPath, [fileURLToPath(new URL("./bundle.mjs", import.meta.url)), "intake", "--request", file], { encoding: "utf8" });
    assert.equal(intake.status, 2);
    assert.equal(JSON.parse(intake.stdout).execution_authorized, false);
    assert.equal(JSON.parse(intake.stdout).intake_status, "hold");
    writeFileSync(file, '{"private-canary": invalid}');
    for (const command of ["intake", "profile"]) {
      const rejected = spawnSync(process.execPath, [fileURLToPath(new URL("./bundle.mjs", import.meta.url)), command, "--request", file], { encoding: "utf8" });
      assert.equal(rejected.status, 1);
      assert.ok(!`${rejected.stdout}${rejected.stderr}`.includes("private-canary"));
    }
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test("CLI source receipt rejects an earlier pin after bundle bytes change", () => {
  const temp = realpathSync(mkdtempSync(path.join(tmpdir(), "unified-source-")));
  try {
    const bundle = path.join(temp, "bundle.mjs");
    const requestFile = path.join(temp, "request.json");
    const original = readFileSync(new URL("./bundle.mjs", import.meta.url), "utf8");
    writeFileSync(bundle, original);
    const invoke = (...args) => spawnSync(process.execPath, [bundle, "profile", ...args], { encoding: "utf8" });
    const inventory = invoke("--inventory");
    assert.equal(inventory.status, 0);
    const source = JSON.parse(inventory.stdout).bundled_source;
    assert.equal(source.sha256, sha256(original));
    assert.ok(!inventory.stdout.includes(temp));
    writeFileSync(requestFile, JSON.stringify({ primary: "0xB", requiredCapabilities: ["purpose_selection"], effectCeiling: [], sourceSha256: source.sha256 }));
    assert.equal(invoke("--request", requestFile).status, 0);
    writeFileSync(bundle, original + "\n// changed synthetic artifact\n");
    const stale = invoke("--request", requestFile);
    assert.equal(stale.status, 2);
    assert.equal(JSON.parse(stale.stdout).source_pin_status, "mismatch");
    assert.equal(JSON.parse(stale.stdout).execution_authorized, false);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test("explicit model capability metadata rejects non-tool models without guessing absent metadata", () => {
  assert.throws(() => rejectExplicitlyUnsupportedTools({capabilities:["decision"]}), /does not advertise tool calling/);
  assert.doesNotThrow(() => rejectExplicitlyUnsupportedTools({capabilities:["completion", "tools"]}));
  assert.doesNotThrow(() => rejectExplicitlyUnsupportedTools({}));
});

test("accepted Hypervisor contract reaches the bundled agent executor and returns evidence", async t => {
  const temp = mkdtempSync(path.join(tmpdir(), "unified-test-"));
  const previous = process.env.UNIFIED_HARNESS_SUBAGENT_OPENCODE_BIN;
  const previousPath = process.env.PATH;
  const previousMarker = process.env.UNIFIED_TEST_SECRET;
  try {
    const repo = path.join(temp, "repo");
    mkdirSync(repo);
    const root = realpathSync(repo);
    const git = (...args) => execFileSync("git", args, {cwd:root, encoding:"utf8"}).trim();
    git("init", "-q");
    git("config", "user.name", "Synthetic Test");
    git("config", "user.email", "synthetic@example.invalid");
    writeFileSync(path.join(root, "source.txt"), "synthetic public source\n");
    writeFileSync(path.join(root, ".gitignore"), "*.scratch\n");
    git("add", "source.txt", ".gitignore");
    git("commit", "-qm", "synthetic source");
    const revision = git("rev-parse", "HEAD");
    const branch = git("branch", "--show-current") || "(detached HEAD)";
    const assignment = {
      schema_version:"unified-harness.agent-assignment.v1", assignment_id:"assignment_roundtrip_test",
      outcome:"Inspect the synthetic source file and report its content.", exclusions:["Do not edit or contact external systems."],
      assignee:{type:"agent",provider:"mlx",model_id:"mlx-community/test-model",processing:"local",accountable_human:"owner"},
      authority:{mode:"read_only",allowed_read_paths:["source.txt"],allowed_paths:[],allow_test_changes:false},
      data:{classification:"public",contains_sensitive_personal_data:false,contains_secrets:false,external_processing_allowed:false},
      resources:{base_ref:revision,timeout_seconds:30,max_steps:4,max_output_bytes:65536},
      supervision:{priority:"normal",target_date:null,available_effort_minutes:10,dependencies:[],decision_owner:"owner",may_pause:true,feedback_route:"Report any concern to the owner."},
      acceptance:{checks:[{command:"node",args:["--version"],timeout_seconds:10,expected_result:"zero"}],reviewer:"reviewer",require_changes:false},
      escalation:{stop_conditions:["Stop when scope is unclear."],contact:"owner"},
    };
    const assignmentPath = path.join(temp, "assignment.json");
    const sensitive = structuredClone(assignment);
    sensitive.data.contains_sensitive_personal_data = true;
    assert.throws(() => validateAssignment(sensitive), /contains_sensitive_personal_data must be false/);
    const incompatible = structuredClone(assignment);
    incompatible.schema_version = "another-system.agent-assignment.v1";
    assert.throws(() => validateAssignment(incompatible), /schema_version/);
    const prompt = buildAgentPrompt(assignment);
    assert.match(prompt, /output only that value/);
    assert.match(prompt, /stop and report it when required/);
    assert.match(prompt, /person's fitness or eligibility, operational feasibility, mandatory-constraint validity, or publication authority/);
    const source = JSON.stringify(assignment);
    const permission = buildOpenCodeConfig(assignment, "http://127.0.0.1:11434/v1").permission;
    assert.equal(permission.glob, "deny");
    assert.equal(permission.grep, "deny");
    assert.equal(permission.list, "deny");
    writeFileSync(assignmentPath, source);
    let packet = hypervisor.createPacket({id:"work-roundtrip",objective:assignment.outcome,owner:"worker",mode:"Review",workspace:{root,identity:`${root}#${branch}`,revision,status_digest:sha256("")},authorization:["execute-read-only"],grantedBy:"synthetic owner"});
    packet.authorization.prohibited.push("write-source", "external-network");
    packet = hypervisor.offerAssignment(packet,{scope:JSON.stringify({kind:"unified-harness-readonly-v1",assignment_sha256:sha256(source)}),acceptanceEvidence:"Review source and executor evidence",engineeringPurpose:"0xB",assigner:"owner",reviewer:"reviewer"});
    packet = hypervisor.acceptAssignment(packet,{by:"worker",assignmentDigest:hypervisor.currentAssignment(packet).digest,note:"Accept the exact synthetic assignment"});
    packet.status = "active";
    packet.handoff.current_writer = "worker";
    packet.checkpoints.push({at:packet.work_contract.acceptance.at,kind:"resumed",note:"Synthetic explicit resume",owner:"worker",workspace:packet.workspace.identity,reconciled:false});
    hypervisor.validatePacket(packet);
    const fakeBin = path.join(temp, "bin");
    mkdirSync(fakeBin);
    const fake = path.join(fakeBin, "opencode");
    writeFileSync(fake, `#!/usr/bin/env node\nif (process.env.UNIFIED_TEST_SECRET) process.exit(9);\nfor (const e of ${JSON.stringify([{type:"step_start",timestamp:1,part:{type:"step-start"}},{type:"tool_use",timestamp:2,part:{tool:"read",state:{status:"completed",input:{filePath:"source.txt"},output:"synthetic public source"}}},{type:"text",timestamp:3,part:{text:"Synthetic source report."}},{type:"step_finish",timestamp:4,part:{reason:"stop",tokens:{total:10}}}])}) console.log(JSON.stringify(e));\n`);
    chmodSync(fake, 0o700);
    process.env.PATH = [fakeBin, previousPath].filter(Boolean).join(path.delimiter);
    process.env.UNIFIED_HARNESS_SUBAGENT_OPENCODE_BIN = path.join(temp, "must-not-run");
    process.env.UNIFIED_TEST_SECRET = "must-not-be-inherited";
    const before = JSON.stringify(packet);
    const receipt = await contractRoundtrip({packet, assignmentPath, endpointCheck:async () => ({})});
    assert.equal(receipt.assignment_digest, hypervisor.currentAssignment(packet).digest);
    assert.equal(receipt.executor_evidence.disposition, "candidate");
    assert.equal(receipt.executor_evidence.agent.answer_after_read, true);
    assert.equal(receipt.review_status, "pending");
    assert.equal(JSON.stringify(packet), before);
    assert.equal(git("status", "--porcelain"), "");
    assert.equal(git("rev-parse", "HEAD"), revision);
    const endpoint = "http://127.0.0.1:8000/v1";
    const intake = {
      outcome: assignment.outcome, exclusions: assignment.exclusions, assignee: {kind:"agent", id:"worker"}, accountableHuman:"owner",
      authority: {allowed:["execute-read-only"], prohibited:["write-source", "external-network"]}, dataClass:"public",
      resources: {effortMinutes:10, deadline:"none", dependencies:[], reviewerAvailability:"available"},
      acceptance: {checks:["Review source and executor evidence"], reviewer:"reviewer"},
      escalation: {stopConditions:assignment.escalation.stop_conditions, contact:"owner", mayPause:true}, concerns:[],
    };
    const bindingInputs = {
      profileJson:JSON.stringify({primary:"0xB", companions:["0xC"], requiredCapabilities:["readonly_roundtrip"], effectCeiling:["read","write","provider","git","network"], sourceSha256:inspectBundledSource().sha256}),
      intakeJson:JSON.stringify(intake), assignmentJson:source, workspaceJson:JSON.stringify(packet.workspace),
    };
    const boundScope = buildBoundScope(bindingInputs, endpoint);
    const makeBoundPacket = (owner = "worker", purpose = "0xB", evidence = JSON.stringify(intake.acceptance.checks), scope = boundScope, extraProhibition) => {
      let p = hypervisor.createPacket({id:"bound-roundtrip",objective:assignment.outcome,owner,mode:"Review",workspace:packet.workspace,authorization:["execute-read-only"],grantedBy:"synthetic owner"});
      p.authorization.prohibited.push("write-source", "external-network");
      if (extraProhibition) p.authorization.prohibited.push(extraProhibition);
      p = hypervisor.offerAssignment(p,{scope,acceptanceEvidence:evidence,engineeringPurpose:purpose,assigner:"owner",reviewer:"reviewer"});
      p = hypervisor.acceptAssignment(p,{by:owner,assignmentDigest:hypervisor.currentAssignment(p).digest,note:"Synthetic explicit acceptance"});
      p.status = "active"; p.handoff.current_writer = owner;
      p.checkpoints.push({at:p.work_contract.acceptance.at,kind:"resumed",note:"Synthetic explicit resume",owner,workspace:p.workspace.identity,reconciled:false});
      return p;
    };
    const boundPacket = makeBoundPacket();
    const boundBefore = JSON.stringify(boundPacket);
    let endpointCalls = 0;
    const invokeBound = (overrides = {}) => contractRoundtrip({packet:boundPacket, assignmentPath, endpoint, bindingInputs, endpointCheck:async () => { endpointCalls++; return {}; }, ...overrides});
    const integratedReceipt = await invokeBound();
    assert.equal(integratedReceipt.schema_version, "unified.contract-executor-receipt.v2");
    assert.equal(integratedReceipt.binding_sha256, JSON.parse(boundScope).binding_sha256);
    assert.equal(integratedReceipt.review_status, "pending");
    assert.equal(endpointCalls, 1);
    assert.equal(JSON.stringify(boundPacket), boundBefore);
    const rejectedOverrides = [
      {bindingInputs:undefined}, {packet}, {endpoint:"http://127.0.0.1:8001/v1"},
      {packet:makeBoundPacket("other-recipient")}, {packet:makeBoundPacket("worker", "0xC")},
      {packet:makeBoundPacket("worker", "0xB", "Different evidence criteria")},
      {packet:makeBoundPacket("worker", "0xB", JSON.stringify(intake.acceptance.checks), boundScope, "execute-read-only")},
      {packet:makeBoundPacket("worker", "0xB", JSON.stringify(intake.acceptance.checks), boundScope, "no-provider")},
      {outputRoot:root}, {outputRoot:path.join(temp,"unbound-evidence")},
    ];
    for (const mutate of [p => {p.status="paused"; p.handoff.current_writer=null;}, p => p.checkpoints.pop(), p => {p.work_contract.acceptance=null;}, p => {p.clarifications=[{status:"awaiting_human"}];}, p => {p.handoff.pending_transfer={to:"other"};}]) {
      const p = structuredClone(boundPacket); mutate(p); rejectedOverrides.push({packet:p});
    }
    for (const [key, mutate] of [
      ["profileJson", p => {p.effectCeiling=["read"];}],
      ["profileJson", p => {p.sourceSha256="0".repeat(64);}],
      ["intakeJson", i => {i.assignee.kind="human";}],
      ["intakeJson", i => {i.resources.reviewerAvailability="unavailable";}],
      ["intakeJson", i => {i.acceptance.reviewer="other";}],
      ["workspaceJson", w => {w.revision="b".repeat(40);}],
      ["assignmentJson", a => {a.authority.allowed_read_paths=["other.txt"];}],
    ]) {
      const value=JSON.parse(bindingInputs[key]); mutate(value);
      rejectedOverrides.push({bindingInputs:{...bindingInputs,[key]:JSON.stringify(value)}});
    }
    for (const overrides of rejectedOverrides) await assert.rejects(invokeBound(overrides));
    assert.equal(endpointCalls, 1, "rejected integrated preflights must not reach provider checks");
    assert.equal(git("status", "--porcelain"), "");
    const ledgerDirectory = realpathSync(mkdtempSync(path.join(temp,"invocations-")));
    chmodSync(ledgerDirectory,0o700);
    const invocationPolicy = {directory:ledgerDirectory,mode:"single_attempt"};
    const onceScope = buildBoundScope(bindingInputs,endpoint,undefined,invocationPolicy);
    const oncePacket = makeBoundPacket("worker","0xB",JSON.stringify(intake.acceptance.checks),onceScope);
    const onceDigest = hypervisor.currentAssignment(oncePacket).digest;
    let onceCalls = 0;
    const onceArgs = {packet:oncePacket,invocationPolicy,endpointCheck:async()=>{onceCalls++; return {};}};
    const concurrent = await Promise.allSettled([invokeBound(onceArgs),invokeBound(onceArgs)]);
    assert.equal(concurrent.filter(r=>r.status==="fulfilled").length,1);
    assert.equal(concurrent.filter(r=>r.status==="rejected").length,1);
    assert.equal(onceCalls,1);
    const onceReceipt = concurrent.find(r=>r.status==="fulfilled").value;
    assert.equal(onceReceipt.schema_version,"unified.contract-executor-receipt.v4");
    const state = inspectInvocation(invocationPolicy,onceDigest);
    assert.equal(state.state,"completed");
    assert.equal(state.evidence_sha256,onceReceipt.receipt_sha256);
    assert.equal(state.retry_authorized,false);
    assert.equal(statSync(path.join(ledgerDirectory,`${onceDigest}.claim.json`)).mode & 0o777,0o600);
    await assert.rejects(invokeBound(onceArgs),/claim unavailable/);
    await assert.rejects(invokeBound({packet:oncePacket}),/binding/);
    await assert.rejects(invokeBound({invocationPolicy}),/binding/);
    assert.equal(onceCalls,1);
    // Re-open the same ledger from a fresh process; no in-memory lock is relied on.
    const restartArgs = path.join(temp,"restart.json");
    writeFileSync(restartArgs,JSON.stringify({packet:oncePacket,assignmentPath,endpoint,bindingInputs,invocationPolicy}));
    const restarted = spawnSync(process.execPath,["--input-type=module","-e",`import {readFileSync} from 'node:fs'; import {contractRoundtrip} from ${JSON.stringify(new URL("./bundle.mjs",import.meta.url).href)}; try { await contractRoundtrip({...JSON.parse(readFileSync(process.argv[1],'utf8')),endpointCheck:async()=>{throw new Error('PROVIDER_REACHED');}}); process.exit(9); } catch(e) { process.stdout.write(e.message); }`,restartArgs],{encoding:"utf8"});
    assert.equal(restarted.status,0);
    assert.match(restarted.stdout,/claim unavailable/);
    assert.ok(!restarted.stdout.includes("PROVIDER_REACHED"));
    const failedEndpoint = "http://127.0.0.1:8002/v1";
    const failedPacket = makeBoundPacket("worker","0xB",JSON.stringify(intake.acceptance.checks),buildBoundScope(bindingInputs,failedEndpoint,undefined,invocationPolicy));
    const failedArgs = {packet:failedPacket,endpoint:failedEndpoint,invocationPolicy,endpointCheck:async()=>{throw new Error("synthetic-private-failure");}};
    await assert.rejects(invokeBound(failedArgs));
    const failedDigest = hypervisor.currentAssignment(failedPacket).digest;
    assert.equal(inspectInvocation(invocationPolicy,failedDigest).state,"failed");
    assert.ok(!readFileSync(path.join(ledgerDirectory,`${failedDigest}.terminal.json`),"utf8").includes("synthetic-private-failure"));
    await assert.rejects(invokeBound(failedArgs),/claim unavailable/);
    const interruptedEndpoint = "http://127.0.0.1:8003/v1";
    const interruptedPacket = makeBoundPacket("worker","0xB",JSON.stringify(intake.acceptance.checks),buildBoundScope(bindingInputs,interruptedEndpoint,undefined,invocationPolicy));
    const interruptedDigest = hypervisor.currentAssignment(interruptedPacket).digest;
    writeFileSync(path.join(ledgerDirectory,`${interruptedDigest}.claim.json`),"",{mode:0o600,flag:"wx"});
    assert.equal(inspectInvocation(invocationPolicy,interruptedDigest).state,"unclaimed_or_uncertain");
    await assert.rejects(invokeBound({packet:interruptedPacket,endpoint:interruptedEndpoint,invocationPolicy}),/claim unavailable/);
    const orphanEndpoint = "http://127.0.0.1:8004/v1";
    const orphanPacket = makeBoundPacket("worker","0xB",JSON.stringify(intake.acceptance.checks),buildBoundScope(bindingInputs,orphanEndpoint,undefined,invocationPolicy));
    const orphanDigest = hypervisor.currentAssignment(orphanPacket).digest;
    writeFileSync(path.join(ledgerDirectory,`${orphanDigest}.terminal.json`),"{}",{mode:0o600,flag:"wx"});
    await assert.rejects(invokeBound({packet:orphanPacket,endpoint:orphanEndpoint,invocationPolicy}),/claim unavailable/);
    assert.equal(inspectInvocation(invocationPolicy,orphanDigest).retry_authorized,false);
    try {
      chmodSync(ledgerDirectory,0o755);
      await assert.rejects(invokeBound(onceArgs),/directory rejected/);
    } finally { chmodSync(ledgerDirectory,0o700); }
    await assert.rejects(invokeBound({...onceArgs,invocationPolicy:{directory:root,mode:"single_attempt"}}),/binding/);
    const now = Date.now();
    const activeWindow = {not_before:new Date(now-60000).toISOString(),expires_at:new Date(now+60000).toISOString()};
    const timedPacket = window => makeBoundPacket("worker","0xB",JSON.stringify(intake.acceptance.checks),buildBoundScope(bindingInputs,endpoint,undefined,invocationPolicy,window));
    const validTimedPacket = timedPacket(activeWindow);
    await t.test("read-only v5 refuses a local Git clean helper before claiming or dispatching", async () => {
      const sourceFile=path.join(root,"source.txt"), original=readFileSync(sourceFile);
      const attributes=path.join(root,".git","info","attributes"), marker=path.join(root,".git","filter-ran");
      writeFileSync(attributes,"source.txt filter=untrusted\n");
      git("config","filter.untrusted.clean","echo invoked >> .git/filter-ran; cat");
      const changed=Buffer.from(original); changed[0]=0x41;
      writeFileSync(sourceFile,changed);
      utimesSync(sourceFile,1500000000,1500000000);
      const previousCalls=endpointCalls, entries=readdirSync(ledgerDirectory);
      try {
        await assert.rejects(invokeBound({packet:validTimedPacket,invocationPolicy,executionWindow:activeWindow}),/Unsupported source Git configuration/);
        assert.equal(existsSync(marker),false);
        assert.deepEqual(readdirSync(ledgerDirectory),entries);
        assert.equal(endpointCalls,previousCalls);
      } finally {
        git("config","--unset","filter.untrusted.clean");
        rmSync(attributes);
        writeFileSync(sourceFile,original);
      }
    });
    const timedReceipt = await invokeBound({packet:validTimedPacket,invocationPolicy,executionWindow:activeWindow});
    assert.equal(timedReceipt.schema_version,"unified.contract-executor-receipt.v5");
    assert.deepEqual(timedReceipt.execution_window,activeWindow);
    const beforeTimeRejections = readdirSync(ledgerDirectory).length;
    const beforeTimeProviderCalls = endpointCalls;
    for (const window of [
      {not_before:new Date(now-120000).toISOString(),expires_at:new Date(now-60000).toISOString()},
      {not_before:new Date(now+120000).toISOString(),expires_at:new Date(now+180000).toISOString()},
    ]) await assert.rejects(invokeBound({packet:timedPacket(window),invocationPolicy,executionWindow:window}),/Execution window/);
    await assert.rejects(invokeBound({packet:validTimedPacket,invocationPolicy}),/binding/);
    await assert.rejects(invokeBound({packet:validTimedPacket,invocationPolicy,executionWindow:{...activeWindow,expires_at:new Date(now+120000).toISOString()}}),/binding/);
    assert.equal(readdirSync(ledgerDirectory).length,beforeTimeRejections);
    assert.equal(endpointCalls,beforeTimeProviderCalls);
    const waitingWindow = {...activeWindow,expires_at:new Date(now+90000).toISOString()};
    const waitingPacket = timedPacket(waitingWindow);
    const originalNow = Date.now;
    try {
      await assert.rejects(invokeBound({packet:waitingPacket,invocationPolicy,executionWindow:waitingWindow,endpointCheck:async()=>{
        Date.now = () => Date.parse(waitingWindow.expires_at); return {};
      }}));
    } finally { Date.now = originalNow; }
    assert.equal(inspectInvocation(invocationPolicy,hypervisor.currentAssignment(waitingPacket).digest).state,"failed");
    const privateDirectory = realpathSync(mkdtempSync(path.join(temp, "private-results-")));
    chmodSync(privateDirectory, 0o700);
    const resultPolicy = {directory:privateDirectory,retention:"owner_managed"};
    const privateScope = buildBoundScope(bindingInputs, endpoint, resultPolicy);
    const privatePacket = makeBoundPacket("worker", "0xB", JSON.stringify(intake.acceptance.checks), privateScope);
    const privateBefore = JSON.stringify(privatePacket);
    const logRoot = path.join(temp, "hash-only-logs");
    const savedFake = readFileSync(fake,"utf8");
    // Exercise the production discovery client (no endpointCheck injection).
    for (const route of ["/v1/models", "/api/version", "/api/tags"]) {
      for (const status of redirectStatuses) await t.test(`discovery rejects ${status} at ${route} without contacting destination`, async () => {
        let hits = 0;
        const seen = [];
        const model = "synthetic:local";
        const payload = JSON.stringify({data:[{id:model}],version:"synthetic",models:[{name:model}]});
        const destination = createServer((req,res) => { hits++; res.end(payload); });
        const origin = createServer((req,res) => {
          seen.push(req.url);
          if (req.url === route) res.writeHead(status,{location:`http://127.0.0.1:${destination.address().port}/other`});
          res.end(payload);
        });
        const listen = server => new Promise((resolve,reject) => server.once("error",reject).listen(0,"127.0.0.1",resolve));
        try {
          await listen(destination);
          await listen(origin);
          const ep = `http://127.0.0.1:${origin.address().port}/v1`;
          const a = structuredClone(assignment);
          Object.assign(a.assignee,{provider:"ollama",model_id:model});
          const inputs = {...bindingInputs,assignmentJson:JSON.stringify(a)};
          const file = path.join(temp,"discovery-assignment.json");
          writeFileSync(file,inputs.assignmentJson);
          const scope = buildBoundScope(inputs,ep,resultPolicy,invocationPolicy,activeWindow);
          const p = makeBoundPacket("worker","0xB",JSON.stringify(intake.acceptance.checks),scope);
          const attempt = invokeBound({packet:p,endpoint:ep,assignmentPath:file,bindingInputs:inputs,resultPolicy,invocationPolicy,executionWindow:activeWindow,endpointCheck:undefined});
          const [outcome] = await Promise.allSettled([attempt]);
          assert.ok(seen.includes(route));
          assert.equal(hits,0);
          assert.equal(outcome.status,"rejected");
          assert.match(outcome.reason.message,/discovery redirect/i);
          assert.deepEqual(readdirSync(privateDirectory),[]);
          assert.equal(inspectInvocation(invocationPolicy,hypervisor.currentAssignment(p).digest).state,"failed");
        } finally {
          for (const server of [origin,destination]) if (server.listening) await new Promise(resolve => server.close(resolve));
        }
      });
    }
    await t.test("read-only verifier and cleanup never launch a worker-installed Git filter", async () => {
      const configured = path.join(temp, "worker-configured-filter");
      const invoked = path.join(temp, "verifier-invoked-filter");
      const worker = `const fs = require("node:fs"), cp = require("node:child_process"), path = require("node:path");
        const common = cp.execFileSync("git", ["rev-parse", "--git-common-dir"], {encoding:"utf8"}).trim();
        cp.execFileSync("git", ["config", "--local", "filter.auditprobe.clean", ${JSON.stringify("echo invoked >> '" + invoked + "'; cat")}]);
        fs.mkdirSync(path.join(common,"info"), {recursive:true});
        fs.writeFileSync(path.join(common,"info","attributes"), "source.txt filter=auditprobe\\n");
        fs.utimesSync("source.txt", 1500000000, 1500000000);
        fs.writeFileSync(${JSON.stringify(configured)}, "ready");`;
      writeFileSync(fake, savedFake.replace("#!/usr/bin/env node\n", "#!/usr/bin/env node\n" + worker + "\n"));
      try {
        const scope = buildBoundScope(bindingInputs, endpoint, resultPolicy, invocationPolicy, activeWindow);
        const p = makeBoundPacket("worker", "0xB", JSON.stringify(intake.acceptance.checks), scope);
        await assert.rejects(invokeBound({packet:p,resultPolicy,invocationPolicy,executionWindow:activeWindow}), /read-only candidate/);
        assert.equal(readFileSync(configured, "utf8"), "ready");
        assert.equal(existsSync(invoked), false);
        assert.deepEqual(readdirSync(privateDirectory), []);
        assert.equal(inspectInvocation(invocationPolicy, hypervisor.currentAssignment(p).digest).state, "failed");
      } finally { writeFileSync(fake, savedFake); }
    });
    for (const empty of [false,true]) {
      await t.test(`read-only v5 rejects ${empty ? "empty" : "content-changing"} worker commit`, async () => {
        const marker = path.join(temp,"worker-commit-"+empty);
        const commit = `const fs=require("node:fs"), cp=require("node:child_process");
          ${empty ? "" : 'fs.writeFileSync("source.txt","changed");'}
          cp.execFileSync("git",["-c","user.name=Test","-c","user.email=test@example.invalid","commit","-qam","synthetic","--allow-empty"]);
          fs.writeFileSync(${JSON.stringify(marker)},cp.execFileSync("git",["rev-parse","HEAD"]));`;
        writeFileSync(fake,savedFake.replace("#!/usr/bin/env node\n","#!/usr/bin/env node\n"+commit+"\n"));
        try {
          const scope = buildBoundScope(bindingInputs,endpoint,resultPolicy,invocationPolicy,activeWindow);
          const p = makeBoundPacket("worker","0xB",JSON.stringify(intake.acceptance.checks),scope);
          await assert.rejects(invokeBound({packet:p,resultPolicy,invocationPolicy,executionWindow:activeWindow}),/read-only candidate/);
          assert.notEqual(readFileSync(marker,"utf8").trim(),revision);
          assert.deepEqual(readdirSync(privateDirectory),[]);
          assert.equal(inspectInvocation(invocationPolicy,hypervisor.currentAssignment(p).digest).state,"failed");
          assert.equal(git("rev-parse","HEAD"),revision);
        } finally { writeFileSync(fake,savedFake); }
      });
    }
    for (const flag of ["--assume-unchanged","--skip-worktree"]) {
      await t.test(`read-only v5 rejects a tracked edit hidden with ${flag}`,async()=>{
        const marker=path.join(temp,"hidden-edit"+flag);
        const action=`const fs=require("node:fs"),cp=require("node:child_process");
          cp.execFileSync("git",["update-index",${JSON.stringify(flag)},"source.txt"]);
          fs.writeFileSync("source.txt","hidden tracked edit");
          fs.writeFileSync(${JSON.stringify(marker)},cp.execFileSync("git",["diff","HEAD","--name-only"]));`;
        writeFileSync(fake,savedFake.replace("#!/usr/bin/env node\n","#!/usr/bin/env node\n"+action+"\n"));
        try {
          const scope=buildBoundScope(bindingInputs,endpoint,resultPolicy,invocationPolicy,activeWindow);
          const p=makeBoundPacket("worker","0xB",JSON.stringify(intake.acceptance.checks),scope);
          await assert.rejects(invokeBound({packet:p,resultPolicy,invocationPolicy,executionWindow:activeWindow}),/read-only candidate/);
          assert.equal(readFileSync(marker,"utf8"),"");
          assert.deepEqual(readdirSync(privateDirectory),[]);
          assert.equal(inspectInvocation(invocationPolicy,hypervisor.currentAssignment(p).digest).state,"failed");
          assert.equal(readFileSync(path.join(root,"source.txt"),"utf8"),"synthetic public source\n");
        } finally { writeFileSync(fake,savedFake); }
      });
    }
    const unicodeAnswer = "Synthetic café 🔧 report.";
    const unicodeEvents = [{type:"tool_use",part:{tool:"read",state:{status:"completed",input:{filePath:"source.txt"},output:"source"}}},{type:"text",part:{text:unicodeAnswer}},{type:"step_finish",part:{reason:"private-canary",tokens:{total:"private-canary",output:5}}}];
    writeFileSync(fake, `#!/usr/bin/env node\nconst b=Buffer.from(${JSON.stringify(unicodeEvents.map(e=>JSON.stringify(e)).join("\n")+"\n")}); const cut=b.indexOf(Buffer.from('é'))+1; process.stdout.write(b.subarray(0,cut)); setTimeout(()=>process.stdout.write(b.subarray(cut)),40);\n`);
    const privateReceipt = await invokeBound({packet:privatePacket,resultPolicy});
    // Low-level executor test only: inspect temporary logs without granting a
    // contract caller an unbound persistent evidence destination.
    await runHarness({assignmentPath,cwd:root,endpoint,outputRoot:logRoot,capturePrivateResult:true,endpointCheck:async()=>({})});
    writeFileSync(fake,savedFake);
    assert.equal(privateReceipt.schema_version, "unified.contract-executor-receipt.v3");
    const artifactPath = path.join(privateDirectory, privateReceipt.private_result.name);
    const rawArtifact = readFileSync(artifactPath);
    const artifact = JSON.parse(rawArtifact);
    assert.equal(statSync(artifactPath).mode & 0o777, 0o600);
    assert.equal(sha256(rawArtifact), privateReceipt.private_result.sha256);
    assert.equal(rawArtifact.length, privateReceipt.private_result.bytes);
    assert.equal(artifact.response, unicodeAnswer);
    assert.equal(artifact.response_sha256, sha256(artifact.response));
    assert.equal(artifact.binding_sha256, privateReceipt.binding_sha256);
    assert.equal(artifact.workspace_revision, revision);
    assert.deepEqual(artifact.allowed_read_paths, ["source.txt"]);
    assert.deepEqual(artifact.review_criteria, intake.acceptance.checks);
    assert.equal(artifact.review_status, "pending");
    assert.equal(JSON.stringify(privatePacket), privateBefore);
    assert.ok(!JSON.stringify(privateReceipt).includes(artifact.response));
    assert.ok(!JSON.stringify(privateReceipt).includes("private-canary"));
    for (const run of readdirSync(logRoot)) for (const name of ["events.ndjson", "evidence.json"]) {
      assert.ok(!readFileSync(path.join(logRoot,run,name),"utf8").includes(artifact.response));
      assert.ok(!readFileSync(path.join(logRoot,run,name),"utf8").includes("private-canary"));
    }
    try {
      await assert.rejects(invokeBound({packet:privatePacket,resultPolicy,endpointCheck:async () => {
        chmodSync(privateDirectory, 0o755); return {};
      }}), /directory rejected/);
      assert.equal(readdirSync(privateDirectory).length, 1, "directory permission drift must stop persistence");
    } finally { chmodSync(privateDirectory, 0o700); }
    const countBeforeRejections = endpointCalls;
    await assert.rejects(invokeBound({resultPolicy})); // Retention not in v2 acceptance.
    await assert.rejects(invokeBound({packet:privatePacket})); // Cannot silently drop retention.
    chmodSync(privateDirectory, 0o755);
    await assert.rejects(invokeBound({packet:privatePacket,resultPolicy}), /directory rejected/);
    chmodSync(privateDirectory, 0o700);
    const link = path.join(realpathSync(temp), "result-link");
    symlinkSync(privateDirectory, link);
    for (const directory of [link, root]) {
      const policy = {directory,retention:"owner_managed"};
      const p = makeBoundPacket("worker", "0xB", JSON.stringify(intake.acceptance.checks), buildBoundScope(bindingInputs,endpoint,policy));
      await assert.rejects(invokeBound({packet:p,resultPolicy:policy}), /directory rejected/);
    }
    assert.equal(endpointCalls, countBeforeRejections);
    assert.equal(readdirSync(privateDirectory).length, 1);
    const constrained = structuredClone(assignment);
    constrained.acceptance.response_format = "single_ascii_token";
    const constrainedSource = JSON.stringify(constrained);
    writeFileSync(assignmentPath, constrainedSource);
    let constrainedPacket = hypervisor.createPacket({id:"work-roundtrip",objective:constrained.outcome,owner:"worker",mode:"Review",workspace:{root,identity:`${root}#${branch}`,revision,status_digest:sha256("")},authorization:["execute-read-only"],grantedBy:"synthetic owner"});
    constrainedPacket.authorization.prohibited.push("write-source", "external-network");
    constrainedPacket = hypervisor.offerAssignment(constrainedPacket,{scope:JSON.stringify({kind:"unified-harness-readonly-v1",assignment_sha256:sha256(constrainedSource)}),acceptanceEvidence:"Review source and executor evidence",engineeringPurpose:"0xB",assigner:"owner",reviewer:"reviewer"});
    constrainedPacket = hypervisor.acceptAssignment(constrainedPacket,{by:"worker",assignmentDigest:hypervisor.currentAssignment(constrainedPacket).digest,note:"Accept constrained assignment"});
    constrainedPacket.status = "active"; constrainedPacket.handoff.current_writer = "worker";
    constrainedPacket.checkpoints.push({at:constrainedPacket.work_contract.acceptance.at,kind:"resumed",note:"Synthetic resume",owner:"worker",workspace:constrainedPacket.workspace.identity,reconciled:false});
    await assert.rejects(contractRoundtrip({packet:constrainedPacket, assignmentPath, endpointCheck:async () => ({})}), /read-only candidate/);
    writeFileSync(fake, `#!/usr/bin/env node\nfor (const e of ${JSON.stringify([{type:"tool_use",part:{tool:"read",state:{status:"completed",input:{filePath:"source.txt"},output:"synthetic"}}},{type:"text",part:{text:'"token-123"'}}])}) console.log(JSON.stringify(e));\n`);
    await assert.rejects(contractRoundtrip({packet:constrainedPacket, assignmentPath, endpointCheck:async () => ({})}), /read-only candidate/);
    writeFileSync(fake, `#!/usr/bin/env node\nfor (const e of ${JSON.stringify([{type:"tool_use",part:{tool:"read",state:{status:"completed",input:{filePath:"source.txt"},output:"synthetic"}}},{type:"text",part:{text:"token-123"}}])}) console.log(JSON.stringify(e));\n`);
    assert.equal((await contractRoundtrip({packet:constrainedPacket, assignmentPath, endpointCheck:async () => ({})})).executor_evidence.disposition, "candidate");
    writeFileSync(assignmentPath, source);
    writeFileSync(fake, `#!/usr/bin/env node\nconsole.log(JSON.stringify({type:'step_finish',timestamp:3,part:{reason:'stop',tokens:{total:10}}}));\n`);
    await assert.rejects(contractRoundtrip({packet, assignmentPath, endpointCheck:async () => ({})}), /read-only candidate/);
    await assert.rejects(invokeBound({packet:privatePacket,resultPolicy}), /read-only candidate/);
    assert.equal(readdirSync(privateDirectory).length, 1, "failed run must not retain a result");
    assert.equal(sha256(readFileSync(artifactPath)), privateReceipt.private_result.sha256, "prior result must not be overwritten");
    writeFileSync(fake, `#!/usr/bin/env node\nconsole.log(JSON.stringify({type:'tool_use',timestamp:2,part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'synthetic public source'}}}));\nconsole.log(JSON.stringify({type:'step_finish',timestamp:3,part:{reason:'stop',tokens:{total:10}}}));\n`);
    await assert.rejects(contractRoundtrip({packet, assignmentPath, endpointCheck:async () => ({})}), /read-only candidate/);
    writeFileSync(fake, `#!/usr/bin/env node\nfor (const e of ${JSON.stringify([{type:"tool_use",part:{tool:"read",state:{status:"completed",input:{filePath:"other.txt"},output:"outside"}}},{type:"text",part:{text:"Synthetic report."}}])}) console.log(JSON.stringify(e));\n`);
    await assert.rejects(contractRoundtrip({packet, assignmentPath, endpointCheck:async () => ({})}), /read-only candidate/);
    writeFileSync(fake, `#!/usr/bin/env node\nfor (const e of ${JSON.stringify([{type:"tool_use",part:{tool:"read",state:{status:"completed",input:{filePath:"source.txt"},output:"synthetic"}}},{type:"text",part:{text:"Synthetic source report."}},{type:"tool_use",part:{tool:"grep",state:{status:"completed",input:{pattern:"anything"},output:""}}}])}) console.log(JSON.stringify(e));\n`);
    await assert.rejects(contractRoundtrip({packet, assignmentPath, endpointCheck:async () => ({})}), /read-only candidate/);
    writeFileSync(fake, `#!/usr/bin/env node\nimport {writeFileSync} from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nconsole.log(JSON.stringify({type:'tool_use',timestamp:2,part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'synthetic public source'}}}));\nconsole.log(JSON.stringify({type:'text',timestamp:3,part:{text:'Synthetic source report.'}}));\nwriteFileSync('source.txt','changed');\nexecFileSync('git',['add','source.txt']);\nwriteFileSync('hidden.scratch','ignored');\nconsole.log(JSON.stringify({type:'step_finish',timestamp:4,part:{reason:'stop',tokens:{total:10}}}));\n`);
    await assert.rejects(contractRoundtrip({packet, assignmentPath, endpointCheck:async () => ({})}), /read-only candidate/);
    assert.equal(git("status", "--porcelain"), "");
    const stale = structuredClone(packet);
    stale.work_contract.acceptance.assignment_digest = "0".repeat(64);
    await assert.rejects(contractRoundtrip({packet:stale, assignmentPath, endpointCheck:async () => ({})}));
    const paused = structuredClone(packet);
    paused.status = "paused";
    paused.handoff.current_writer = null;
    await assert.rejects(contractRoundtrip({packet:paused, assignmentPath, endpointCheck:async () => ({})}), /resumed/);
    const missingResume = structuredClone(packet);
    missingResume.checkpoints.pop();
    await assert.rejects(contractRoundtrip({packet:missingResume, assignmentPath, endpointCheck:async () => ({})}), /resume checkpoint/);
    const drift = structuredClone(packet);
    drift.workspace.revision = "0".repeat(40);
    await assert.rejects(contractRoundtrip({packet:drift, assignmentPath, endpointCheck:async () => ({})}), /workspace/);
    const concern = structuredClone(packet);
    concern.clarifications = [{status:"awaiting_human"}];
    await assert.rejects(contractRoundtrip({packet:concern, assignmentPath, endpointCheck:async () => ({})}));
    writeFileSync(assignmentPath, source + " ");
    await assert.rejects(contractRoundtrip({packet, assignmentPath, endpointCheck:async () => ({})}), /differs/);
  } finally {
    if (previous === undefined) delete process.env.UNIFIED_HARNESS_SUBAGENT_OPENCODE_BIN;
    else process.env.UNIFIED_HARNESS_SUBAGENT_OPENCODE_BIN = previous;
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    if (previousMarker === undefined) delete process.env.UNIFIED_TEST_SECRET;
    else process.env.UNIFIED_TEST_SECRET = previousMarker;
    rmSync(temp, {recursive:true, force:true});
  }
});

test('concurrent stale lease recovery preserves the replacement owner', async t => {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(),'lease-race-')));
  const originalTemp = process.env.TMPDIR;
  process.env.TMPDIR = directory;
  t.after(() => {
    if (originalTemp === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = originalTemp;
    rmSync(directory,{recursive:true,force:true});
  });
  const endpoint = 'http://127.0.0.1:31771/v1';
  const prelude = `import {acquireProviderLease} from ${JSON.stringify(new URL('./bundle.mjs',import.meta.url).href)};
    const lease = await acquireProviderLease(${JSON.stringify(endpoint)},1000);`;
  // The first process actually exits while holding the lease.
  const old = spawnSync(process.execPath,['--input-type=module','-e',prelude],{encoding:'utf8'});
  assert.equal(old.status,0,old.stderr);
  const held = path.join(directory,'held');
  const release = path.join(directory,'release');
  const competitor = `${prelude}
    const fs = await import('node:fs');
    fs.writeFileSync(${JSON.stringify(held)},'held');
    const until = Date.now()+10000;
    while (!fs.existsSync(${JSON.stringify(release)}) && Date.now()<until)
      await new Promise(done=>setTimeout(done,10));
    lease.release();`;

  const kill = process.kill;
  let finished;
  t.mock.method(process,'kill', (pid,signal) => {
    try { return kill(pid,signal); }
    catch (error) {
      if (error.code === 'ESRCH' && signal === 0 && !finished) {
        // Pause this contender after observing death. A separate process
        // completes recovery and still holds the replacement when we resume.
        const child = spawn(process.execPath,['--input-type=module','-e',competitor]);
        finished = once(child,'close');
        const until = Date.now()+5000;
        const pause = new Int32Array(new SharedArrayBuffer(4));
        while (!existsSync(held) && Date.now()<until) Atomics.wait(pause,0,0,5);
        assert.ok(existsSync(held),'competing process acquired the replacement lease');
      }
      throw error;
    }
  });
  try {
    await assert.rejects(acquireProviderLease(endpoint,800), /lease wait exceeded/);
    assert.ok(finished);
  } finally {
    writeFileSync(release,'release');
    if (finished) assert.deepEqual(await finished,[0,null]);
  }
  const next = await acquireProviderLease(endpoint,500);
  next.release();
});

test('equivalent endpoint URLs share a provider lease until release', async t => {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(),'lease-alias-')));
  const previous = process.env.TMPDIR;
  t.after(() => {
    if (previous === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = previous;
    rmSync(directory,{recursive:true,force:true});
  });
  process.env.TMPDIR = directory;
  const canonical = 'http://127.0.0.1:31771/v1';
  const alternate = 'http://127.0.0.1:031771/v1';
  assert.equal(new URL(alternate).href, canonical);
  const held = await acquireProviderLease(canonical,100);
  try {
    for (const address of [alternate, 'http://localhost:31771/v1']) {
      await assert.rejects(acquireProviderLease(address,50), /lease wait exceeded/);
    }
    const otherPort = await acquireProviderLease('http://127.0.0.1:31772/v1',100);
    otherPort.release();
  } finally { held.release(); }
  const next = await acquireProviderLease(alternate,100);
  next.release();
});

function ledgerFixture(t) {
  const temp = realpathSync(mkdtempSync(path.join(tmpdir(),'uwh-ledger-')));
  t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const source = path.join(temp,'source'), directory = path.join(temp,'ledger');
  mkdirSync(source); mkdirSync(directory,{mode:0o700});
  const policy = {directory,mode:'single_attempt'}, digest = sha256('synthetic offer');
  const claim = path.join(directory,digest+'.claim.json'), terminal = path.join(directory,digest+'.terminal.json');
  const evidence = sha256('synthetic evidence');
  const start = () => claimInvocation(policy,digest,source);
  return {source,directory,policy,digest,claim,terminal,evidence,start};
}

for (const [label,id] of [['parent traversal','../source/escaped'],['short digest','abcd'],['array digest',[sha256('offer')]]]) {
  test('ledger identity: '+label,t=>{
    const f=ledgerFixture(t);
    assert.throws(()=>claimInvocation(f.policy,id,f.source),/invocation identity/i);
    assert.throws(()=>inspectInvocation(f.policy,id),/invocation identity/i);
    assert.deepEqual(readdirSync(f.source),[]);
    assert.deepEqual(readdirSync(f.directory),[]);
  });
}

for (const [label,kind,hash] of [['unknown terminal','approved',sha256('result')],
  ['short evidence','completed','ff'],['coerced evidence','failed',[sha256('result')]]]) {
  test('ledger finalization: '+label,t=>{
    const f=ledgerFixture(t), handle=f.start();
    assert.throws(()=>handle.finish(kind,hash));
    assert.equal(existsSync(f.terminal),false);
    assert.throws(f.start,/already exists/);
    handle.finish('failed',f.evidence);
    assert.equal(inspectInvocation(f.policy,f.digest).state,'failed');
  });
}

for (const label of ['completed pair','failed pair','policy redirected','claim removed','claim modified',
  'claim hard-linked','directory replaced','duplicate finish']) {
  test('ledger finalization: '+label,t=>{
    const f=ledgerFixture(t), handle=f.start();
    if (label==='policy redirected') {
      f.policy.directory=f.source;
      handle.finish('completed',f.evidence);
      assert.deepEqual(readdirSync(f.source),[],'finish must stay in the claimed directory');
      f.policy.directory=f.directory;
    } else if (label==='duplicate finish') {
      handle.finish('failed',f.evidence);
      const original=readFileSync(f.terminal);
      assert.throws(()=>handle.finish('completed',sha256('replacement')));
      assert.deepEqual(readFileSync(f.terminal),original);
      return;
    } else if (label.endsWith(' pair')) {
      handle.finish(label==='failed pair'?'failed':'completed',f.evidence);
    } else {
      if (label==='claim removed') rmSync(f.claim);
      if (label==='claim modified') writeFileSync(f.claim,'{}');
      if (label==='claim hard-linked') linkSync(f.claim,path.join(f.source,'alias'));
      if (label==='directory replaced') {
        const original=readFileSync(f.claim);
        renameSync(f.directory,f.directory+'-old');
        mkdirSync(f.directory,{mode:0o700});
        writeFileSync(f.claim,original,{mode:0o600});
      }
      assert.throws(()=>handle.finish('completed',f.evidence),/reconcile/);
      assert.equal(existsSync(f.terminal),false);
      assert.equal(inspectInvocation(f.policy,f.digest).requires_reconciliation,true);
      return;
    }
    const state=inspectInvocation(f.policy,f.digest);
    assert.equal(state.state,label==='failed pair'?'failed':'completed');
    assert.equal(state.evidence_sha256,f.evidence);
    assert.equal(state.claim_sha256,handle.receipt.claim_sha256);
    assert.equal(state.execution_authorized,false);
    assert.equal(state.retry_authorized,false);
    assert.throws(f.start,/already exists/);
  });
}

for (const label of ['missing timestamp','impossible timestamp','extra claim field','extra terminal field','wrong assignment',
  'wrong claim hash','terminal without claim','claim without terminal','non-string evidence','duplicate terminal state',
  'changed claim bytes','unsafe permissions','terminal symlink','claim hard link','terminal hard link','oversized record','terminal FIFO']) {
  test('ledger reconciliation: '+label,t=>{
    const f=ledgerFixture(t), handle=f.start();
    handle.finish('completed',f.evidence);
    const claim=JSON.parse(readFileSync(f.claim)), terminal=JSON.parse(readFileSync(f.terminal));
    if (['missing timestamp','impossible timestamp','extra claim field'].includes(label)) {
      if (label==='missing timestamp') delete claim.claimed_at;
      if (label==='impossible timestamp') claim.claimed_at='2025-02-30T00:00:00.000Z';
      if (label==='extra claim field') claim.extra='unbound';
      writeFileSync(f.claim,JSON.stringify(claim));
      terminal.claim_sha256=sha256(JSON.stringify(claim));
    }
    if (label==='extra terminal field') terminal.extra=true;
    if (label==='wrong assignment') terminal.assignment_digest=sha256('different offer');
    if (label==='wrong claim hash') terminal.claim_sha256=sha256('different claim');
    if (label==='non-string evidence') terminal.evidence_sha256=[f.evidence];
    writeFileSync(f.terminal,JSON.stringify(terminal));
    if (label==='duplicate terminal state') writeFileSync(f.terminal,JSON.stringify(terminal).replace('{"','{"state":"failed","'));
    if (label==='changed claim bytes') writeFileSync(f.claim,JSON.stringify(claim)+'\n');
    if (label==='claim without terminal') rmSync(f.terminal);
    if (label==='terminal without claim') rmSync(f.claim);
    if (label==='unsafe permissions') chmodSync(f.claim,0o644);
    if (label==='terminal symlink') { renameSync(f.terminal,f.terminal+'.saved'); symlinkSync(f.terminal+'.saved',f.terminal); }
    if (label==='claim hard link' || label==='terminal hard link') linkSync(label==='claim hard link'?f.claim:f.terminal,path.join(f.source,'alias'));
    if (label==='oversized record') writeFileSync(f.terminal,Buffer.alloc(65537,32));
    if (label==='terminal FIFO') {
      rmSync(f.terminal); execFileSync('mkfifo',[f.terminal]);
    }
    const before=readdirSync(f.directory);
    // A FIFO with no writer must not block recovery. Isolate it behind a hard timeout.
    const state=label==='terminal FIFO'
      ? JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',
        'import {inspectInvocation} from '+JSON.stringify(new URL('./bundle.mjs',import.meta.url).href)+
        ';console.log(JSON.stringify(inspectInvocation('+JSON.stringify(f.policy)+','+JSON.stringify(f.digest)+')))'],{timeout:5000}))
      : inspectInvocation(f.policy,f.digest);
    assert.equal(state.state,'unclaimed_or_uncertain','inconsistent ledger must require reconciliation: '+label);
    assert.equal(state.requires_reconciliation,true);
    assert.equal(state.execution_authorized,false);
    assert.equal(state.retry_authorized,false);
    assert.deepEqual(readdirSync(f.directory),before);
    assert.throws(f.start,/already exists/);
  });
}

const leaseCases = ['ordinary release','dead owner','live owner','missing owner','malformed owner','invalid pid','invalid token',
  'receipt FIFO','receipt symlink','receipt hard link','oversized receipt','unsafe receipt mode','unsafe directory mode',
  'symbolic directory','unexpected contents','busy recovery guard','frozen wall clock','release FIFO','release with unexpected contents'];
for (const label of leaseCases) {
  test('provider lease storage: '+label,t=>{
    const root=realpathSync(mkdtempSync(path.join(tmpdir(),'lease-storage-')));
    t.after(()=>rmSync(root,{recursive:true,force:true}));
    const endpoint='http://127.0.0.1:31771/v1';
    const dir=path.join(root,'unified-harness-agent-provider-'+sha256(endpoint).slice(0,20)+'.lock');
    const owner=path.join(dir,'owner.json'), extra=path.join(dir,'retain.txt');
    const releaseCase=label.startsWith('release ') || label==='ordinary release';
    if (!releaseCase) {
      if (label==='symbolic directory') {
        const other=path.join(root,'other'); mkdirSync(other,{mode:0o700}); symlinkSync(other,dir);
      } else mkdirSync(dir,{mode:0o700});
      const exited=spawnSync(process.execPath,['-e',''],{timeout:1500});
      assert.equal(exited.status,0);
      const record={pid:['live owner','frozen wall clock'].includes(label)?process.pid:exited.pid,token:'prior'};
      if (label==='invalid pid') record.pid=-1;
      if (label==='invalid token') record.token='';
      const bytes=label==='malformed owner'?'[]broken':JSON.stringify(record)+(label==='oversized receipt'?' '.repeat(65536):'');
      if (label==='receipt FIFO') execFileSync('mkfifo',[owner]);
      else if (label==='receipt symlink' || label==='receipt hard link') {
        const external=path.join(root,'external.json'); writeFileSync(external,bytes,{mode:0o600});
        if (label==='receipt symlink') symlinkSync(external,owner); else linkSync(external,owner);
      } else if (label!=='missing owner') writeFileSync(owner,bytes,{mode:0o600});
      if (label==='unsafe directory mode') chmodSync(dir,0o755);
      if (label==='unsafe receipt mode') chmodSync(owner,0o644);
      if (label==='unexpected contents') writeFileSync(extra,'keep');
      if (label==='busy recovery guard') mkdirSync(dir+'.recovery',{mode:0o700});
    }
    // A blocked synchronous read or deadline based on a frozen wall clock
    // would also block an in-process test timer. Supervise it independently.
    const program=`
      import {acquireProviderLease} from ${JSON.stringify(new URL('./bundle.mjs',import.meta.url).href)};
      import fs from 'node:fs';
      import {execFileSync} from 'node:child_process';
      const [root,endpoint,label,owner,extra]=process.argv.slice(1);
      if(label==='frozen wall clock') Date.now=()=>1000;
      try {
        const lease=await acquireProviderLease(endpoint,50,{pollMs:5,getTempParent:()=>root});
        if(label==='release FIFO'){fs.unlinkSync(owner);execFileSync('mkfifo',[owner]);}
        if(label==='release with unexpected contents')fs.writeFileSync(extra,'keep');
        lease.release();lease.release();
        console.log('acquired');
      } catch(e){if(!/lease wait exceeded/.test(e.message))throw e;console.log('held');}`;
    const probe=spawnSync(process.execPath,['--input-type=module','-e',program,root,endpoint,label,owner,extra],
      {encoding:'utf8',timeout:2000,killSignal:'SIGKILL'});
    assert.equal(probe.status,0,'lease operation must finish within its deadline: '+label+' '+(probe.error??probe.stderr));
    assert.equal(probe.stdout.trim(),releaseCase || label==='dead owner'?'acquired':'held','unsafe lease reclaimed: '+label);
    if (['ordinary release','dead owner'].includes(label)) assert.equal(existsSync(dir),false);
    else assert.ok(existsSync(dir),'preserve ambiguous lease: '+label);
    if (label.includes('unexpected contents')) assert.equal(readFileSync(extra,'utf8'),'keep');
  });
}
