import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, rmSync, readFileSync, readdirSync, renameSync, symlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runHarness, buildOpenCodeConfig, validatePathAccess, contractRoundtrip, buildBoundScope, inspectInvocation, hypervisor, sha256, inspectBundledSource } from './bundle.mjs';
import { buildPackageScope } from './integrated.mjs';
import { packageInventory } from './package.mjs';
import { reviewIntake } from './intake.mjs';

function fixture(t, endpoint, trackedFile = 'source.txt', timeoutSeconds = 120) {
  const temp = realpathSync(mkdtempSync(path.join(tmpdir(), 'unified-package-test-')));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'repo');
  mkdirSync(root);
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Synthetic Test');
  git('config', 'user.email', 'synthetic@example.invalid');
  writeFileSync(path.join(root, trackedFile), 'cobalt-otter-47');
  git('add', '-f', trackedFile);
  git('commit', '-qm', 'synthetic case');
  const revision = git('rev-parse', 'HEAD');
  const branch = git('branch', '--show-current');
  const assignment = {
    schema_version:"unified-harness.agent-assignment.v1", assignment_id:"assignment_live_synthetic",
    outcome:"Read source.txt and report its synthetic verification token.", exclusions:["Do not modify files or contact external systems."],
    assignee:{type:"agent",provider:"ollama",model_id:"synthetic:local",processing:"local",accountable_human:"synthetic owner"},
    authority:{mode:"read_only",allowed_read_paths:["source.txt"],allowed_paths:[],allow_test_changes:false},
    data:{classification:"public",contains_sensitive_personal_data:false,contains_secrets:false,external_processing_allowed:false},
    resources:{base_ref:revision,timeout_seconds:timeoutSeconds,max_steps:4,max_output_bytes:1048576,max_completion_tokens:1024},
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

async function listen(t, host, handler) {
  const server = createServer(handler);
  await new Promise((resolve,reject) => server.once('error',reject).listen(0,host,resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return server.address().port;
}

test('ambiguous endpoints and non-loopback IPv6 fail before offer, provider contact or claim', async t => {
  const seen = [];
  const port = await listen(t, '127.0.0.1', (req,res) => {
    seen.push(req.url);
    res.writeHead(404).end();
  });
  const base = `http://127.0.0.1:${port}/v1`;
  const {inputs,accept} = fixture(t,base);
  const scope = JSON.parse(buildPackageScope(inputs));
  for (const endpoint of [
    base+'?view=local', base+'#local', base+'?', base+'#',
    base.replace('//','//user:pass@'), base.replace('//','//@'),
    base+' ', base.replace('/v1','\\v1'), base.replace('127.0.0.1','[2001:db8::1]'),
    'http://127.0.0.1:0/v1', 'http://127.0.0.1:10080/v1', 'http://[::1]:06000/v1',
  ]) {
    assert.throws(() => buildPackageScope({...inputs,endpoint}), /loopback/);
    assert.throws(() => buildBoundScope(inputs.bindingInputs,endpoint), /loopback/);
    const packet = accept(JSON.stringify({...scope,endpoint}));
    await assert.rejects(contractRoundtrip({...inputs,endpoint,packet}), /loopback/);
  }
  assert.deepEqual(seen,[]);
  assert.deepEqual(readdirSync(inputs.invocationPolicy.directory),[]);
});

// With UNIFIED_TEST_INSTALLED_OPENCODE=1 this same provider drives the installed
// worker through its read tool. CI uses a small HTTP client with redirect following enabled.
for (const status of [307,308,200]) {
  test('OpenCode completion after a source read, upstream status '+status, async t => {
    let forwarded = 0, sourcePosts = 0;
    const destination = await listen(t,'127.0.0.1',(req,res) => { forwarded++; res.writeHead(400).end(); });
    const port = await listen(t,'127.0.0.1',async (req,res) => {
      if (req.url !== '/prefix/v1/chat/completions') {
        res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();
      const hasSource = body.includes('cobalt-otter-47');
      if (hasSource) {
        sourcePosts++;
        if (status !== 200) {
          res.writeHead(status,{location:`http://127.0.0.1:${destination}/unoffered`}).end();
          return;
        }
      }
      // Title generation gets a short text reply. The initial task gets a tool call.
      const askForRead = !hasSource && JSON.parse(body).tools?.length;
      const tool = {index:0,id:'call_read',type:'function',function:{name:'read',arguments:'{"filePath":"source.txt"}'}};
      const delta = askForRead ? {role:'assistant',tool_calls:[tool]}
        : {role:'assistant',content:hasSource ? 'cobalt-otter-47' : 'Synthetic title'};
      res.writeHead(200,{'content-type':'text/event-stream'});
      for (const [part,reason] of [[delta,null],[{},askForRead ? 'tool_calls' : 'stop']]) {
        const chunk = {id:'chatcmpl-test',object:'chat.completion.chunk',created:1,model:'synthetic:local',
          choices:[{index:0,delta:part,finish_reason:reason}]};
        res.write('data: '+JSON.stringify(chunk)+'\n\n');
      }
      res.end('data: [DONE]\n\n');
    });
    const {inputs,temp,accept} = fixture(t,`http://127.0.0.1:${port}/prefix/v1`,'source.txt',20);
    if (process.env.UNIFIED_TEST_INSTALLED_OPENCODE !== '1') {
      const bin = path.join(temp,'bin');
      mkdirSync(bin);
      const script = `#!/usr/bin/env node
(async () => {
  const fs = require('node:fs');
  const {baseURL,apiKey} = JSON.parse(fs.readFileSync(process.env.OPENCODE_CONFIG)).provider.ollama.options;
  const token = fs.readFileSync('source.txt','utf8');
  console.log(JSON.stringify({type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:token}}}));
  const reply = await fetch(baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+apiKey},
    body:JSON.stringify({messages:[{role:'tool',content:token}]})});
  if (!reply.ok || !(await reply.text()).includes(token)) process.exitCode=1;
  else console.log(JSON.stringify({type:'text',part:{text:token}}));
})().catch(()=>{process.exitCode=1;});`;
      writeFileSync(path.join(bin,'opencode'),script,{mode:0o700});
      const previous = process.env.PATH;
      process.env.PATH = bin+path.delimiter+previous;
      t.after(() => { process.env.PATH = previous; });
    }
    const packet = accept(buildPackageScope(inputs));
    const run = contractRoundtrip({...inputs,packet});
    if (status === 200) assert.equal((await run).review_status,'pending');
    else await assert.rejects(run);
    assert.ok(sourcePosts > 0,'the accepted upstream must receive the file token');
    assert.equal(forwarded,0,'the second listener must receive no requests');
  });
}

test('direct completion refuses a 307 before forwarding synthetic source', async t => {
  const forwarded = [];
  const destination = await listen(t,'127.0.0.1',async (req,res) => {
    const body = [];
    for await (const chunk of req) body.push(chunk);
    forwarded.push({path:req.url,containsSource:Buffer.concat(body).includes('cobalt-otter-47')});
    res.end('{}');
  });
  const requests = [];
  const port = await listen(t,'127.0.0.1',async (req,res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({path:req.url,body:Buffer.concat(chunks).toString()});
    res.writeHead(307,{Location:`http://127.0.0.1:${destination}/other`}).end();
  });
  const {inputs,temp} = fixture(t,`http://127.0.0.1:${port}/prefix/v1`);
  const assignment = JSON.parse(inputs.bindingInputs.assignmentJson);
  assignment.authority.mode = 'structured_proposal';
  assignment.authority.allowed_paths = ['source.txt'];
  assignment.acceptance.require_changes = true;
  assignment.worker = {adapter:'direct_json',context_strategy:'source_files',max_context_bytes:8192};
  writeFileSync(inputs.assignmentPath,JSON.stringify(assignment));
  const [outcome] = await Promise.allSettled([runHarness({assignmentPath:inputs.assignmentPath,endpoint:inputs.endpoint,
    cwd:path.join(temp,'repo'),outputRoot:inputs.resultPolicy.directory,endpointCheck:async () => ({})})]);
  assert.deepEqual(requests.map(r => r.path),['/prefix/v1/chat/completions']);
  assert.match(requests[0].body,/cobalt-otter-47/);
  assert.deepEqual(forwarded,[]);
  assert.equal(outcome.status,'rejected');
  assert.match(outcome.reason.message,/Harness run rejected/);
});

for (const [expireAfter, title, host = '127.0.0.1', prefix = ''] of [
  [null, 'reviewed and accepted v6 produces a package-bound candidate receipt'],
  [null, 'IPv6 loopback with a path prefix completes the accepted v6 contract', '::1', '/prefix'],
  ['/v1/models', 'expiry during discovery stops additional metadata requests and consumes the attempt'],
  ['/api/tags', 'expiry after discovery stops the worker and consumes the attempt'],
]) {
  test(title, async t => {
    let discover;
    const routes = [];
    const port = await listen(t,host,(req,res) => {
      routes.push(req.url);
      discover?.(req.url);
      res.end(JSON.stringify({data:[{id:'synthetic:local'}],version:'synthetic',models:[{name:'synthetic:local'}]}));
    });
    const authority = host === '::1' ? '[::1]' : host;
    const {inputs,temp,accept} = fixture(t, `http://${authority}:${port}${prefix}/v1`);
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
      assert.deepEqual(routes.sort(), ['/api/tags','/api/version','/v1/models'].map(route => prefix + route));
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

test('a protected case alias cannot be offered to the v6 worker', t => {
  const {inputs} = fixture(t, 'http://127.0.0.1:11434/v1', '.env');
  const assignment = JSON.parse(inputs.bindingInputs.assignmentJson);
  assignment.authority.allowed_read_paths = ['.ENV'];
  inputs.bindingInputs.assignmentJson = JSON.stringify(assignment);
  assert.throws(() => buildPackageScope(inputs));
  assert.throws(() => buildOpenCodeConfig(assignment, inputs.endpoint), /protected/i);
  assert.equal(validatePathAccess(assignment, '.ENV', 'read').allowed, false);
  // A broad mixed-case directory grant would let the worker's recursive
  // wildcard reach protected children even with a case-sensitive literal deny.
  for (const scope of ['.EnV.local', '.GiT/config', 'Scripts', '.GitHub']) {
    assignment.authority.allowed_read_paths = [scope];
    assert.throws(() => buildOpenCodeConfig(assignment, inputs.endpoint), /protected/i);
  }
  assignment.authority.allowed_read_paths = ['scripts/report.mjs'];
  assert.doesNotThrow(() => buildOpenCodeConfig(assignment, inputs.endpoint));
  assert.deepEqual(readdirSync(inputs.invocationPolicy.directory), []);
});

for (const flag of ['--assume-unchanged','--skip-worktree']) {
  test('v6 rejects source drift hidden by ' + flag + ' before claiming an attempt', async t => {
    const {inputs,temp,accept} = fixture(t, 'http://127.0.0.1:11434/v1');
    const packet = accept(buildPackageScope(inputs));
    const cwd = path.join(temp, 'repo');
    execFileSync('git', ['update-index', flag, 'source.txt'], {cwd});
    writeFileSync(path.join(cwd, 'source.txt'), 'edited after acceptance');
    assert.equal(execFileSync('git', ['status','--porcelain'], {cwd,encoding:'utf8'}), '');
    await assert.rejects(contractRoundtrip({...inputs,packet}), /index flag/i);
    assert.deepEqual(readdirSync(inputs.invocationPolicy.directory), []);
    assert.deepEqual(readdirSync(inputs.resultPolicy.directory), []);
  });
}

for (const exitsEarly of [true, false]) {
  test('direct v6 releases inherited pipes and stops helpers on ' + (exitsEarly ? 'exit' : 'timeout'), async t => {
    const server = createServer((req, res) => res.end(JSON.stringify({
      data:[{id:'synthetic:local'}], version:'synthetic', models:[{name:'synthetic:local'}],
    })));
    await new Promise((resolve,reject) => server.once('error',reject).listen(0,'127.0.0.1',resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const {inputs,temp,accept} = fixture(t, 'http://127.0.0.1:' + server.address().port + '/v1', 'source.txt', 10);
    const packet = accept(buildPackageScope(inputs));
    const bin = path.join(temp,'bin');
    const marker = path.join(temp,'delayed-write');
    const release = path.join(temp,'release');
    mkdirSync(bin);
    const helper = `
      const fs = require('node:fs');
      const poll = setInterval(() => {
        if (fs.existsSync(${JSON.stringify(release)})) {
          fs.writeFileSync(${JSON.stringify(marker)}, 'survived');
          clearInterval(poll);
        }
      }, 10);
      setTimeout(() => clearInterval(poll), 18000).unref();`;
    const worker = `#!/usr/bin/env node
      const fs = require('node:fs');
      const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(helper)}],
        {stdio:['ignore','inherit','inherit']});
      fs.writeFileSync(${JSON.stringify(path.join(temp,'spawned'))}, String(child.pid));
      child.unref();
      ${exitsEarly ? 'process.exit(0);' : 'setInterval(() => {}, 1000);'}`;
    writeFileSync(path.join(bin,'opencode'), worker, {mode:0o700});
    const oldPath = process.env.PATH;
    process.env.PATH = bin + path.delimiter + oldPath;
    t.after(() => { process.env.PATH = oldPath; });
    const start = performance.now();
    await assert.rejects(contractRoundtrip({...inputs,packet}), /unchanged read-only candidate/);
    assert.ok(readFileSync(path.join(temp,'spawned'),'utf8').trim());
    assert.ok(performance.now() - start < 14500, 'settle within the worker budget plus cleanup grace');
    writeFileSync(release, 'check helper');
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(readdirSync(temp).includes('delayed-write'), false);
    assert.equal(inspectInvocation(inputs.invocationPolicy, hypervisor.currentAssignment(packet).digest).state, 'failed');
  });
}

test('v6 refuses a temporary parent inside the checkout before discovery or claim', async t => {
  const {inputs,temp,accept} = fixture(t,'http://127.0.0.1:11434/v1');
  const packet = accept(buildPackageScope(inputs));
  const inside = path.join(packet.workspace.root,'.tmp'), alias = path.join(temp,'temp-link');
  mkdirSync(inside);
  symlinkSync(inside,alias);
  const previous = process.env.TMPDIR;
  t.after(() => { if (previous === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = previous; });
  for (const parent of [inside,alias]) {
    process.env.TMPDIR = parent;
    await assert.rejects(contractRoundtrip({...inputs,packet}), /outside the source checkout/);
    assert.deepEqual(readdirSync(inside), []);
    assert.deepEqual(readdirSync(inputs.invocationPolicy.directory), []);
    assert.deepEqual(readdirSync(inputs.resultPolicy.directory), []);
  }
});

test('v6 refuses a replaced temp parent and leaves its contents alone during cleanup', async t => {
  let replaceParent;
  const server = createServer((req,res) => {
    if (req.url === '/v1/models') replaceParent();
    res.end(JSON.stringify({data:[]}));
  });
  await new Promise((resolve,reject) => server.once('error',reject).listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const {inputs,temp,accept} = fixture(t,'http://127.0.0.1:' + server.address().port + '/v1');
  const packet = accept(buildPackageScope(inputs));
  const outside = path.join(temp,'external-temp');
  mkdirSync(outside);
  const previous = process.env.TMPDIR;
  t.after(() => { if (previous === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = previous; });
  process.env.TMPDIR = outside;
  let marker;
  replaceParent = () => {
    const [run] = readdirSync(outside);
    renameSync(outside, outside + '-saved');
    mkdirSync(outside);
    mkdirSync(path.join(outside,run));
    marker = path.join(outside,run,'unrelated');
    writeFileSync(marker,'preserve');
  };
  await assert.rejects(contractRoundtrip({...inputs,packet}), /Temporary directory changed/);
  assert.equal(readFileSync(marker,'utf8'),'preserve');
  assert.equal(inspectInvocation(inputs.invocationPolicy,hypervisor.currentAssignment(packet).digest).state,'failed');
  assert.deepEqual(readdirSync(inputs.resultPolicy.directory), []);
});
