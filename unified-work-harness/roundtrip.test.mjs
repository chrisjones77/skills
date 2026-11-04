import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { contractRoundtrip, hypervisor, sha256, rejectExplicitlyUnsupportedTools, buildOpenCodeConfig, buildAgentPrompt, validateAssignment } from "./bundle.mjs";

test("explicit model capability metadata rejects non-tool models without guessing absent metadata", () => {
  assert.throws(() => rejectExplicitlyUnsupportedTools({capabilities:["decision"]}), /does not advertise tool calling/);
  assert.doesNotThrow(() => rejectExplicitlyUnsupportedTools({capabilities:["completion", "tools"]}));
  assert.doesNotThrow(() => rejectExplicitlyUnsupportedTools({}));
});

test("accepted Hypervisor contract reaches the bundled agent executor and returns evidence", async () => {
  const temp = mkdtempSync(path.join(tmpdir(), "unified-test-"));
  const previous = process.env.UNIFIED_HARNESS_SUBAGENT_OPENCODE_BIN;
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
    const fake = path.join(temp, "fake-worker.mjs");
    writeFileSync(fake, `#!/usr/bin/env node\nif (process.env.UNIFIED_TEST_SECRET) process.exit(9);\nfor (const e of ${JSON.stringify([{type:"step_start",timestamp:1,part:{type:"step-start"}},{type:"tool_use",timestamp:2,part:{tool:"read",state:{status:"completed",input:{filePath:"source.txt"},output:"synthetic public source"}}},{type:"text",timestamp:3,part:{text:"Synthetic source report."}},{type:"step_finish",timestamp:4,part:{reason:"stop",tokens:{total:10}}}])}) console.log(JSON.stringify(e));\n`);
    chmodSync(fake, 0o700);
    process.env.UNIFIED_HARNESS_SUBAGENT_OPENCODE_BIN = fake;
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
    if (previousMarker === undefined) delete process.env.UNIFIED_TEST_SECRET;
    else process.env.UNIFIED_TEST_SECRET = previousMarker;
    rmSync(temp, {recursive:true, force:true});
  }
});
