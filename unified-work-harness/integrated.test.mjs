import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { contractRoundtrip, buildBoundScope, inspectInvocation, hypervisor, sha256, inspectBundledSource } from './bundle.mjs';
import { buildPackageScope } from './integrated.mjs';
import { packageInventory } from './package.mjs';
import { reviewIntake } from './intake.mjs';

function fixture(t, endpoint) {
  const temp = realpathSync(mkdtempSync(path.join(tmpdir(), 'unified-package-test-')));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'repo');
  mkdirSync(root);
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Synthetic Test');
  git('config', 'user.email', 'synthetic@example.invalid');
  writeFileSync(path.join(root, 'source.txt'), 'cobalt-otter-47');
  git('add', 'source.txt');
  git('commit', '-qm', 'synthetic case');
  const revision = git('rev-parse', 'HEAD');
  const branch = git('branch', '--show-current');
  const assignment = {
    schema_version:"unified-harness.agent-assignment.v1", assignment_id:"assignment_live_synthetic",
    outcome:"Read source.txt and report its synthetic verification token.", exclusions:["Do not modify files or contact external systems."],
    assignee:{type:"agent",provider:"ollama",model_id:"synthetic:local",processing:"local",accountable_human:"synthetic owner"},
    authority:{mode:"read_only",allowed_read_paths:["source.txt"],allowed_paths:[],allow_test_changes:false},
    data:{classification:"public",contains_sensitive_personal_data:false,contains_secrets:false,external_processing_allowed:false},
    resources:{base_ref:revision,timeout_seconds:120,max_steps:4,max_output_bytes:1048576,max_completion_tokens:1024},
    supervision:{priority:"normal",target_date:null,available_effort_minutes:10,dependencies:[],decision_owner:"synthetic owner",may_pause:true,feedback_route:"Report failure to the synthetic reviewer."},
    acceptance:{checks:[{command:"node",args:["--version"],timeout_seconds:10,expected_result:"zero"}],reviewer:"synthetic reviewer",require_changes:false},
    escalation:{stop_conditions:["Stop if access is denied or the task is unclear."],contact:"synthetic owner"},
  };

  const packet = hypervisor.createPacket({
    id: 'synthetic-package', objective: assignment.outcome, owner: 'synthetic worker', mode: 'Review',
    workspace: { root, identity: `${root}#${branch}`, revision, status_digest: sha256('') },
    authorization: ['execute-read-only'], grantedBy: 'synthetic owner',
  });
  packet.authorization.prohibited.push('write-source', 'external-network');
  const intake = {
    outcome: assignment.outcome, exclusions: assignment.exclusions, assignee: { kind: 'agent', id: packet.owner },
    accountableHuman: 'synthetic owner', authority: {allowed:['execute-read-only'],prohibited:['write-source','external-network']},
    dataClass: 'public', resources: { effortMinutes: 10, deadline: 'none', dependencies: [], reviewerAvailability:'available' },
    acceptance: { checks: ['Compare response with fixture'], reviewer:'synthetic reviewer' },
    escalation: { stopConditions: assignment.escalation.stop_conditions, contact:'synthetic owner', mayPause: true }, concerns: [],
  };
  const date = offset => new Date(Date.now() + offset).toISOString();
  const assessment = {
    by: intake.acceptance.reviewer, disposition:'clear', authority:'confirmed', scope:'consistent', concerns:'clear',
    availableMinutes:10, reviewerAvailable:true, evidenceRef:'synthetic private review', reviewedAt:date(-2000), expiresAt:date(60000),
  };
  const profile = {primary:'0xB', requiredCapabilities:['readonly_roundtrip'], effectCeiling:['read','write','git','network','provider']};
  const bindingInputs = {
    profileJson: JSON.stringify({...profile, sourceSha256:inspectBundledSource().sha256}), intakeJson:JSON.stringify(intake),
    assignmentJson: JSON.stringify(assignment), workspaceJson:JSON.stringify(packet.workspace),
  };
  const packagePolicy = {
    profileRequest:{...profile, requiredCapabilities:['readonly_roundtrip','assignment_intake'], sourceSha256:packageInventory().sourceSha256},
    intakeReview:reviewIntake(bindingInputs.intakeJson, assessment),
  };
  const assignmentPath = path.join(temp, 'assignment.json');
  writeFileSync(assignmentPath, bindingInputs.assignmentJson, {mode:0o600});
  const inputs = { bindingInputs, endpoint, assignmentPath, packagePolicy,
    resultPolicy:{directory:mkdtempSync(path.join(temp,'results-')),retention:'owner_managed'},
    invocationPolicy:{directory:mkdtempSync(path.join(temp,'ledger-')),mode:'single_attempt'},
    executionWindow:{not_before:date(-10000),expires_at:date(120000)},
  };
  function accept(scope) {
    const offered = hypervisor.offerAssignment(packet, {scope, acceptanceEvidence:JSON.stringify(intake.acceptance.checks),
      engineeringPurpose:'0xB', assigner:intake.accountableHuman, reviewer:intake.acceptance.reviewer});
    const accepted = hypervisor.acceptAssignment(offered,{by:packet.owner, assignmentDigest:hypervisor.currentAssignment(offered).digest, note:'Synthetic exact offer accepted'});
    accepted.status='active';
    accepted.handoff.current_writer=packet.owner;
    accepted.checkpoints.push({at:accepted.work_contract.acceptance.at,kind:'resumed',note:'Synthetic resume',owner:packet.owner,workspace:packet.workspace.identity,reconciled:false});
    return accepted;
  }
  return {temp, inputs, accept};
}

test('v6 refuses stale evidence, inconsistent profiles and scope upgrades before claiming the attempt', async t => {
  const {inputs, accept} = fixture(t, 'http://127.0.0.1:11434/v1');
  const packet = accept(buildPackageScope(inputs));
  for (const mutate of [
    p => { p.profileRequest.sourceSha256 = '0'.repeat(64); },
    p => { p.profileRequest.primary = '0xC'; },
    p => { p.profileRequest.companions = ['0xD']; },
    p => { p.profileRequest.requiredCapabilities = ['readonly_roundtrip']; },
    p => { p.intakeReview.assessment.evidenceRef = 'replacement'; },
    p => { p.profileRequest.effectCeiling = ['read']; },
    p => { p.profileRequest.requestedEffects = ['read']; },
  ]) {
    const policy = structuredClone(inputs.packagePolicy);
    mutate(policy);
    await assert.rejects(contractRoundtrip({...inputs,packet,packagePolicy:policy}));
  }
  assert.throws(() => buildPackageScope({...inputs,executionWindow:undefined}));
  assert.throws(() => buildPackageScope({...inputs,invocationPolicy:undefined}));
  const legacyScope = buildBoundScope(inputs.bindingInputs,inputs.endpoint,inputs.resultPolicy,inputs.invocationPolicy,inputs.executionWindow);
  await assert.rejects(contractRoundtrip({...inputs,packet:accept(legacyScope)}), /scope version/);
  await assert.rejects(contractRoundtrip({...inputs,packet,packagePolicy:undefined}), /scope version/);
  await assert.rejects(contractRoundtrip({...inputs,packet,endpointCheck:async () => ({})}), /production/);
  const until = Date.parse(inputs.packagePolicy.intakeReview.assessment.expiresAt);
  t.mock.method(Date, 'now', () => until);
  await assert.rejects(contractRoundtrip({...inputs,packet}), /expired/);
  assert.deepEqual(readdirSync(inputs.invocationPolicy.directory),[]);
});

for (const [expireAfter, title] of [
  [null, 'reviewed and accepted v6 produces a package-bound candidate receipt'],
  ['/v1/models', 'expiry during discovery stops additional metadata requests and consumes the attempt'],
  ['/api/tags', 'expiry after discovery stops the worker and consumes the attempt'],
]) {
  test(title, async t => {
    let discover;
    const server = createServer((req,res) => {
      discover?.(req.url);
      res.end(JSON.stringify({data:[{id:'synthetic:local'}],version:'synthetic',models:[{name:'synthetic:local'}]}));
    });
    await new Promise((resolve,reject) => server.once('error',reject).listen(0,'127.0.0.1',resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const {inputs,temp,accept} = fixture(t, `http://127.0.0.1:${server.address().port}/v1`);
    const scope = buildPackageScope(inputs);
    const packet = accept(scope);
    const digest = hypervisor.currentAssignment(packet).digest;
    const bin = path.join(temp,'bin');
    mkdirSync(bin);
    const marker = path.join(temp,'executed');
    const script = `#!/usr/bin/env node
const fs = require('node:fs');
const value = fs.readFileSync('source.txt','utf8');
fs.writeFileSync(${JSON.stringify(marker)}, 'yes');
for (const event of [
 {type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:value}}},
 {type:'text',part:{text:value}}, {type:'step_finish',part:{reason:'stop',tokens:{total:3}}}
]) console.log(JSON.stringify(event));
`;
    writeFileSync(path.join(bin,'opencode'),script,{mode:0o700});
    const oldPath = process.env.PATH;
    process.env.PATH = bin + path.delimiter + oldPath;
    t.after(() => { process.env.PATH = oldPath; });
    if (expireAfter) {
      const until = Date.parse(inputs.packagePolicy.intakeReview.assessment.expiresAt);
      const seen = [];
      discover = url => {
        seen.push(url);
        if (url === expireAfter) t.mock.method(Date,'now',() => until);
      };
      await assert.rejects(contractRoundtrip({...inputs,packet}), error => /expired/.test(error.cause?.message ?? error.message));
      assert.ok(seen.includes(expireAfter));
      if (expireAfter === '/v1/models') assert.deepEqual(seen,['/v1/models']);
      assert.ok(!readdirSync(temp).includes('executed'));
      assert.equal(inspectInvocation(inputs.invocationPolicy,digest).state,'failed');
    } else {
      const receipt = await contractRoundtrip({...inputs,packet});
      assert.equal(receipt.schema_version,'unified.contract-executor-receipt.v6');
      assert.equal(receipt.assignment_digest,digest);
      assert.equal(receipt.review_status,'pending');
      assert.deepEqual(receipt.package_binding,JSON.parse(scope).package_binding);
      assert.ok(!JSON.stringify(receipt).includes('synthetic private review'));
      assert.equal(inspectInvocation(inputs.invocationPolicy,digest).state,'completed');
      const artifact = JSON.parse(readFileSync(path.join(inputs.resultPolicy.directory,receipt.private_result.name),'utf8'));
      assert.equal(artifact.response.trim(),'cobalt-otter-47');
      await assert.rejects(contractRoundtrip({...inputs,packet}), /already|claimed|exists/i);
    }
  });
}
