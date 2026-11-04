import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, readdirSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { contractRoundtrip, hypervisor, sha256 } from "./bundle.mjs";

test("live local model processes an explicitly synthetic read-only assignment", {skip:process.env.UNIFIED_LIVE_TEST !== "1", timeout:240000}, async () => {
  const temp = mkdtempSync(path.join(tmpdir(), "unified-live-"));
  const previousWorker = process.env.DUTYWEAVE_SUBAGENT_OPENCODE_BIN;
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
      schema_version:"dutyweave.agent-assignment.v1", assignment_id:"assignment_live_synthetic",
      outcome:strictFormat ? "Read source.txt and output only its synthetic verification token, with no other words." : "Read source.txt and report its synthetic verification token.", exclusions:["Do not modify files or contact external systems."],
      assignee:{type:"agent",provider:"ollama",model_id:process.env.UNIFIED_LOCAL_MODEL ?? "qwen2.5:3b",processing:"local",accountable_human:"synthetic owner"},
      authority:{mode:"read_only",allowed_read_paths:["source.txt"],allowed_paths:[],allow_test_changes:false},
      data:{classification:"public",contains_phi:false,contains_secrets:false,external_processing_allowed:false},
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
    packet = hypervisor.offerAssignment(packet,{scope:JSON.stringify({kind:"dutyweave-readonly-v1",assignment_sha256:sha256(source)}),acceptanceEvidence:"Inspect source-read evidence and token output",engineeringPurpose:"0xB",assigner:"synthetic owner",reviewer:"synthetic reviewer"});
    packet = hypervisor.acceptAssignment(packet,{by:"synthetic worker",assignmentDigest:hypervisor.currentAssignment(packet).digest,note:"Synthetic acceptance for this test only"});
    packet.status="active"; packet.handoff.current_writer="synthetic worker";
    packet.checkpoints.push({at:packet.work_contract.acceptance.at,kind:"resumed",note:"Synthetic test resume",owner:packet.owner,workspace:packet.workspace.identity,reconciled:false});
    // Capture only synthetic test text in a private temporary file; forward
    // all events unchanged to the actual supervisor. Production remains hash-only.
    const realWorker = execFileSync("which", ["opencode"], {encoding:"utf8"}).trim();
    const rawOutput = path.join(temp, "synthetic-response.txt");
    const wrapper = path.join(temp, "capture-synthetic.mjs");
    writeFileSync(wrapper, `#!/usr/bin/env node\nimport {spawn} from 'node:child_process';\nimport {appendFileSync} from 'node:fs';\nconst c=spawn(${JSON.stringify(realWorker)},process.argv.slice(2),{env:process.env,stdio:['ignore','pipe','pipe']});\nlet b=''; c.stdout.on('data',chunk=>{process.stdout.write(chunk); b+=chunk; const lines=b.split('\\n'); b=lines.pop(); for(const l of lines){try{const e=JSON.parse(l); if(e.type==='text' && typeof e.part?.text==='string') appendFileSync(${JSON.stringify(rawOutput)},e.part.text,{mode:0o600});}catch{}}});\nc.stderr.pipe(process.stderr); c.on('close',code=>process.exit(code??1));\n`, {mode:0o700});
    chmodSync(wrapper, 0o700);
    process.env.DUTYWEAVE_SUBAGENT_OPENCODE_BIN = wrapper;
    const outputRoot = path.join(temp, "evidence");
    let receipt;
    try {
      receipt = await contractRoundtrip({packet,assignmentPath,endpoint:"http://127.0.0.1:11434/v1",outputRoot});
    } catch (error) {
      if (existsSync(outputRoot)) for (const run of readdirSync(outputRoot)) {
        const file = path.join(outputRoot, run, "evidence.json");
        if (existsSync(file)) console.log("Sanitized rejected evidence:", readFileSync(file, "utf8"));
        const events = path.join(outputRoot, run, "events.ndjson");
        if (existsSync(events)) console.log("Sanitized events:", readFileSync(events, "utf8"));
      }
      throw error;
    }
    console.log("Live receipt:", JSON.stringify(receipt));
    assert.equal(receipt.executor_evidence.disposition, "candidate");
    assert.ok(receipt.executor_evidence.agent.read_calls > 0, "a completed read must be observable");
    const runDirectory = path.join(outputRoot, receipt.executor_evidence.run_id);
    const events = readFileSync(path.join(runDirectory, "events.ndjson"), "utf8").trim().split("\n").map(line => JSON.parse(line));
    const captured = existsSync(rawOutput) ? readFileSync(rawOutput, "utf8") : "";
    assert.ok(events.some(event => event.type === "text" && event.text_hash === sha256(captured)), "the test capture must match the worker evidence");
    assert.ok(captured.includes("cobalt-otter-47"), "the worker must report the correct synthetic token");
    if (strictFormat) assert.equal(captured.trim(), "cobalt-otter-47", "the response must contain only the token");
    console.log(strictFormat ? "Synthetic answer met the token-only format." : "Synthetic answer correctly contained the expected token; exact-format compliance was not tested by this case.");
    assert.equal(receipt.review_status, "pending");
    assert.equal(git("status", "--porcelain"), "");
    assert.equal(git("rev-parse", "HEAD"), revision);
  } finally {
    if (previousWorker === undefined) delete process.env.DUTYWEAVE_SUBAGENT_OPENCODE_BIN;
    else process.env.DUTYWEAVE_SUBAGENT_OPENCODE_BIN = previousWorker;
    rmSync(temp, {recursive:true, force:true});
  }
});
