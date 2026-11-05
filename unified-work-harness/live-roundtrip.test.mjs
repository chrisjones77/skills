import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, readFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { contractRoundtrip, hypervisor, sha256, buildBoundScope, inspectBundledSource } from "./bundle.mjs";

test("live local model processes an explicitly synthetic read-only assignment", {skip:process.env.UNIFIED_LIVE_TEST !== "1", timeout:240000}, async () => {
  const temp = mkdtempSync(path.join(tmpdir(), "unified-live-"));
  const strictFormat = process.env.UNIFIED_LIVE_STRICT === "1";
  try {
    mkdirSync(path.join(temp, "repo"));
    const root = realpathSync(path.join(temp, "repo"));
    const git = (...args) => execFileSync("git", args, {cwd:root, encoding:"utf8"}).trim();
    git("init", "-q");
    git("config", "user.name", "Synthetic Test");
    git("config", "user.email", "synthetic@example.invalid");
    writeFileSync(path.join(root, "source.txt"), "The synthetic verification token is cobalt-otter-47.\n");
    git("add", "source.txt");
    git("commit", "-qm", "synthetic fixture");
    const revision = git("rev-parse", "HEAD");
    const branch = git("branch", "--show-current") || "(detached HEAD)";
    const assignment = {
      schema_version:"unified-harness.agent-assignment.v1", assignment_id:"assignment_live_synthetic",
      outcome:strictFormat ? "Read source.txt and output only its synthetic verification token, with no other words." : "Read source.txt and report its synthetic verification token.", exclusions:["Do not modify files or contact external systems."],
      assignee:{type:"agent",provider:"ollama",model_id:process.env.UNIFIED_LOCAL_MODEL ?? "qwen2.5:3b",processing:"local",accountable_human:"synthetic owner"},
      authority:{mode:"read_only",allowed_read_paths:["source.txt"],allowed_paths:[],allow_test_changes:false},
      data:{classification:"public",contains_sensitive_personal_data:false,contains_secrets:false,external_processing_allowed:false},
      resources:{base_ref:revision,timeout_seconds:120,max_steps:4,max_output_bytes:1048576,max_completion_tokens:1024},
      supervision:{priority:"normal",target_date:null,available_effort_minutes:10,dependencies:[],decision_owner:"synthetic owner",may_pause:true,feedback_route:"Report failure to the synthetic reviewer."},
      acceptance:{checks:[{command:"node",args:["--version"],timeout_seconds:10,expected_result:"zero"}],reviewer:"synthetic reviewer",require_changes:false,...(strictFormat ? {response_format:"single_ascii_token"} : {})},
      escalation:{stop_conditions:["Stop if access is denied or the task is unclear."],contact:"synthetic owner"},
    };
    const source = JSON.stringify(assignment);
    const assignmentPath = path.join(temp, "assignment.json");
    writeFileSync(assignmentPath, source, {mode:0o600});
    let packet = hypervisor.createPacket({id:"work-live-synthetic",objective:assignment.outcome,owner:"synthetic worker",mode:"Review",workspace:{root,identity:`${root}#${branch}`,revision,status_digest:sha256("")},authorization:["execute-read-only"],grantedBy:"synthetic test fixture"});
    packet.authorization.prohibited.push("write-source", "external-network");
    const directory = realpathSync(mkdtempSync(path.join(temp,"private-results-")));
    chmodSync(directory,0o700);
    const resultPolicy = {directory,retention:"owner_managed"};
    const ledgerDirectory = realpathSync(mkdtempSync(path.join(temp,"invocations-")));
    chmodSync(ledgerDirectory,0o700);
    const invocationPolicy = {directory:ledgerDirectory,mode:"single_attempt"};
    const executionWindow = {not_before:new Date(Date.now()-60000).toISOString(),expires_at:new Date(Date.now()+600000).toISOString()};
    const endpoint = "http://127.0.0.1:11434/v1";
    const intake = {outcome:assignment.outcome,exclusions:assignment.exclusions,assignee:{kind:"agent",id:packet.owner},accountableHuman:"synthetic owner",authority:{allowed:["execute-read-only"],prohibited:["write-source","external-network"]},dataClass:"public",resources:{effortMinutes:10,deadline:"none",dependencies:[],reviewerAvailability:"available"},acceptance:{checks:["Inspect source-read evidence and token output"],reviewer:"synthetic reviewer"},escalation:{stopConditions:assignment.escalation.stop_conditions,contact:"synthetic owner",mayPause:true},concerns:[]};
    const bindingInputs = {profileJson:JSON.stringify({primary:"0xB",requiredCapabilities:["readonly_roundtrip"],effectCeiling:["read","write","provider","git","network"],sourceSha256:inspectBundledSource().sha256}),intakeJson:JSON.stringify(intake),assignmentJson:source,workspaceJson:JSON.stringify(packet.workspace)};
    packet = hypervisor.offerAssignment(packet,{scope:buildBoundScope(bindingInputs,endpoint,resultPolicy,invocationPolicy,executionWindow),acceptanceEvidence:JSON.stringify(intake.acceptance.checks),engineeringPurpose:"0xB",assigner:"synthetic owner",reviewer:"synthetic reviewer"});
    packet = hypervisor.acceptAssignment(packet,{by:"synthetic worker",assignmentDigest:hypervisor.currentAssignment(packet).digest,note:"Synthetic acceptance for this test only"});
    packet.status="active"; packet.handoff.current_writer="synthetic worker";
    packet.checkpoints.push({at:packet.work_contract.acceptance.at,kind:"resumed",note:"Synthetic test resume",owner:packet.owner,workspace:packet.workspace.identity,reconciled:false});
    const receipt = await contractRoundtrip({packet,assignmentPath,endpoint,bindingInputs,resultPolicy,invocationPolicy,executionWindow});
    assert.equal(receipt.schema_version,"unified.contract-executor-receipt.v5");
    console.log("Live receipt:", JSON.stringify(receipt));
    assert.equal(receipt.executor_evidence.disposition, "candidate");
    assert.ok(receipt.executor_evidence.agent.read_calls > 0, "a completed read must be observable");
    const raw = readFileSync(path.join(directory,receipt.private_result.name));
    assert.equal(sha256(raw),receipt.private_result.sha256);
    const artifact = JSON.parse(raw);
    const captured = artifact.response;
    assert.equal(sha256(captured),artifact.response_sha256);
    assert.ok(captured.includes("cobalt-otter-47"), "the worker must report the correct synthetic token");
    if (strictFormat) assert.equal(captured.trim(), "cobalt-otter-47", "the response must contain only the token");
    console.log(strictFormat ? "Synthetic answer met the token-only format." : "Synthetic answer correctly contained the expected token; exact-format compliance was not tested by this case.");
    assert.equal(receipt.review_status, "pending");
    assert.equal(git("status", "--porcelain"), "");
    assert.equal(git("rev-parse", "HEAD"), revision);
  } finally {
    rmSync(temp, {recursive:true, force:true});
  }
});
