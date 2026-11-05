import { redirectStatuses, observeDestination } from './test-support.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, rmSync, readFileSync, readdirSync, renameSync, symlinkSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runHarness, buildOpenCodeConfig, validatePathAccess, contractRoundtrip, buildBoundScope, inspectInvocation, hypervisor, sha256, inspectBundledSource } from './bundle.mjs';
import { buildPackageScope } from './integrated.mjs';
import { packageInventory } from './package.mjs';
import { reviewIntake } from './intake.mjs';

function fixture(t, endpoint, trackedFile = 'source.txt', timeoutSeconds = 120, prepareCheckout) {
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
  if (prepareCheckout) {
    prepareCheckout(root,temp);
    git('add','-f','.');
  }
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

function streamReadCompletion(res, askForRead, hasSource, filename = 'source.txt') {
  const tool = {index:0,id:'call_read',type:'function',function:{name:'read',arguments:JSON.stringify({filePath:filename})}};
  const delta = askForRead ? {role:'assistant',tool_calls:[tool]}
    : {role:'assistant',content:hasSource ? 'cobalt-otter-47' : 'Synthetic title'};
  res.writeHead(200,{'content-type':'text/event-stream'});
  for (const [part,reason] of [[delta,null],[{},askForRead ? 'tool_calls' : 'stop']]) {
    const chunk = {id:'chatcmpl-test',object:'chat.completion.chunk',created:1,model:'synthetic:local',
      choices:[{index:0,delta:part,finish_reason:reason}]};
    res.write('data: '+JSON.stringify(chunk)+'\n\n');
  }
  res.end('data: [DONE]\n\n');
}

// With UNIFIED_TEST_INSTALLED_OPENCODE=1 this same provider drives the installed
// worker through its read tool. The deterministic lane uses an HTTP client that follows redirects.
for (const beforeRead of [false,true]) for (const status of (beforeRead ? redirectStatuses : [...redirectStatuses,200])) {
  const stage = beforeRead ? 'before a source read' : 'after a source read';
  test('OpenCode completion '+stage+', upstream status '+status, async t => {
    let sourcePosts = 0, firstPosts = 0;
    const destination = await observeDestination(t);
    const port = await listen(t,'127.0.0.1',async (req,res) => {
      if (req.url !== '/prefix/v1/chat/completions') {
        res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();
      const hasSource = body.includes('cobalt-otter-47');
      if (beforeRead) {
        firstPosts++;
        res.writeHead(status,{location:destination.url}).end();
        return;
      }
      if (hasSource) {
        sourcePosts++;
        if (status !== 200) {
          res.writeHead(status,{location:destination.url}).end();
          return;
        }
      }
      // Title generation gets a short text reply. The initial task gets a tool call.
      const askForRead = !hasSource && JSON.parse(body).tools?.length;
      streamReadCompletion(res, askForRead, hasSource);
    });
    const {inputs,temp,accept} = fixture(t,`http://127.0.0.1:${port}/prefix/v1`,'source.txt',20);
    if (process.env.UNIFIED_TEST_INSTALLED_OPENCODE !== '1') {
      const bin = path.join(temp,'bin');
      mkdirSync(bin);
      const script = `#!/usr/bin/env node
(async () => {
  const fs = require('node:fs');
  const {baseURL,apiKey} = JSON.parse(fs.readFileSync(process.env.OPENCODE_CONFIG)).provider.ollama.options;
  if (${beforeRead}) {
    const first=await fetch(baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+apiKey},body:'{"messages":[]}'});
    if(!first.ok) {process.exitCode=1;return;}
    throw Error('unexpected first completion');
  }
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
    if(beforeRead) assert.ok(firstPosts>0,'the accepted upstream must receive the initial completion');
    else assert.ok(sourcePosts > 0,'the accepted upstream must receive the file token');
    assert.deepEqual(destination.requests,[],'the second listener must receive no requests');
  });
}

// Exercise project discovery in the real binary. A stand-in worker cannot prove
// that startup ignores local configuration or that the first prompt is in scope.
if (process.env.UNIFIED_TEST_INSTALLED_OPENCODE === '1') {
  for (const scenario of ['project configuration','project configuration directory','instructions','linked instructions','nested instructions','offered nested instructions']) {
    test('OpenCode isolates '+scenario, async t => {
      const canary = 'unoffered-instruction-81bd6';
      const nested = scenario.endsWith('nested instructions');
      const offeredInstructions = scenario === 'offered nested instructions';
      const filename = nested ? 'docs/source.txt' : 'source.txt';
      let leaked = false, completedRead = false, completions = 0;
      const port = await listen(t,'127.0.0.1',async (req,res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks).toString();
        leaked ||= body.includes(canary);
        if (req.url !== '/v1/chat/completions') {
          res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
          return;
        }
        completions++;
        const hasSource = body.includes('cobalt-otter-47');
        completedRead ||= hasSource;
        streamReadCompletion(res,!hasSource && JSON.parse(body).tools?.length,hasSource,filename);
      });
      const {inputs,temp,accept} = fixture(t,'http://127.0.0.1:'+port+'/v1','source.txt',20,(root,temp) => {
        if (scenario.startsWith('project configuration')) {
          const marker = path.join(temp,'mcp-started');
          const command = [process.execPath,'-e',"require('node:fs').writeFileSync("+JSON.stringify(marker)+",'started')"];
          const configFile = scenario === 'project configuration' ? 'opencode.json' : '.opencode/opencode.jsonc';
          mkdirSync(path.dirname(path.join(root,configFile)),{recursive:true});
          writeFileSync(path.join(root,configFile),JSON.stringify({mcp:{probe:{type:'local',enabled:true,command}}}));
        } else if (scenario === 'linked instructions') {
          const outside = path.join(temp,'private-instructions');
          writeFileSync(outside,canary);
          symlinkSync(outside,path.join(root,'AGENTS.md'));
        } else if (nested) {
          mkdirSync(path.join(root,'docs'));
          renameSync(path.join(root,'source.txt'),path.join(root,filename));
          writeFileSync(path.join(root,'docs','AGENTS.md'),canary);
        } else writeFileSync(path.join(root,'AGENTS.md'),canary);
      });
      if (nested) {
        const assignment = JSON.parse(inputs.bindingInputs.assignmentJson);
        assignment.authority.allowed_read_paths = offeredInstructions ? [filename,'docs/AGENTS.md'] : [filename];
        inputs.bindingInputs.assignmentJson = JSON.stringify(assignment);
        writeFileSync(inputs.assignmentPath,inputs.bindingInputs.assignmentJson);
      }
      const packet = accept(buildPackageScope(inputs));
      const [run] = await Promise.allSettled([contractRoundtrip({...inputs,packet})]);
      assert.equal(existsSync(path.join(temp,'mcp-started')),false,'checkout command executed');
      if (!offeredInstructions) assert.equal(leaked,false,'provider received unoffered instruction bytes');
      if (nested && !offeredInstructions) {
        assert.equal(run.status,'rejected');
        assert.match(run.reason.message,/Nested worker instructions/);
        assert.deepEqual(readdirSync(inputs.invocationPolicy.directory),[]);
        assert.equal(completions,0,'nested instructions must be refused before launch');
      } else {
        assert.equal(run.status,'fulfilled',String(run.reason));
        assert.equal(run.value.review_status,'pending');
        assert.equal(completedRead,true,'the authorized source reached the provider');
      }
    });
  }
}

for (const status of redirectStatuses) test('direct completion refuses redirect '+status, async t => {
  const destination = await observeDestination(t);
  const requests = [];
  const port = await listen(t,'127.0.0.1',async (req,res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({path:req.url,body:Buffer.concat(chunks).toString()});
    res.writeHead(status,{Location:destination.url}).end();
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
  assert.deepEqual(destination.requests,[]);
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

test('physical ancestry refuses an aliased private directory', async t => {
  const {assertOutsideSource} = await import('./bundle.mjs');
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(),'uwh-alias-')));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const repo = path.join(dir,'repo'), alias = path.join(dir,'alias');
  mkdirSync(path.join(repo,'private'),{recursive:true});
  symlinkSync(repo,alias,'dir');
  assert.throws(()=>assertOutsideSource(path.join(alias,'private'),repo),/outside the source checkout/);
});

test('relay admits only the scoped completion and closes after the worker exits', async t => {
  const posts = [];
  const port = await listen(t,'127.0.0.1',async (req,res) => {
    if (req.method === 'POST') {
      posts.push([req.url,req.headers.authorization]);
      for await (const _ of req) {}
      res.end('cobalt-otter-47');
    } else res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
  });
  const {inputs,temp,accept} = fixture(t,'http://127.0.0.1:'+port+'/prefix/v1');
  const marker = path.join(temp,'relay-url'), bin = path.join(temp,'bin');
  mkdirSync(bin);
  const script = async function(marker) {
    const fs = require('node:fs');
    const {baseURL,apiKey} = JSON.parse(fs.readFileSync(process.env.OPENCODE_CONFIG)).provider.ollama.options;
    fs.writeFileSync(marker,baseURL);
    const route = '/chat/completions';
    for (const [method,key,suffix] of [['POST',null,route],['POST','wrong',route],['GET',apiKey,route],['POST',apiKey,route+'?m=1']]) {
      const r = await fetch(baseURL+suffix,{method,headers:key?{authorization:'Bearer '+key}:{}});
      if (r.status!==403) throw Error('unexpected relay admission '+r.status);
    }
    const token=fs.readFileSync('source.txt','utf8');
    console.log(JSON.stringify({type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:token}}}));
    const reply=await fetch(baseURL+route,{method:'POST',headers:{authorization:'Bearer '+apiKey},body:token});
    if ((await reply.text())!==token) throw Error('control failed');
    console.log(JSON.stringify({type:'text',part:{text:token}}));
  };
  writeFileSync(path.join(bin,'opencode'),'#!/usr/bin/env node\n('+script+')('+JSON.stringify(marker)+').catch(()=>process.exitCode=1)',{mode:0o700});
  const previous = process.env.PATH;
  process.env.PATH = bin+path.delimiter+previous;
  t.after(()=>{process.env.PATH=previous;});
  const receipt=await contractRoundtrip({...inputs,packet:accept(buildPackageScope(inputs))});
  assert.equal(receipt.review_status,'pending');
  assert.deepEqual(posts,[['/prefix/v1/chat/completions','Bearer local']]);
  await assert.rejects(fetch(readFileSync(marker,'utf8'),{signal:AbortSignal.timeout(2000)}),
    err=>err.cause?.code==='ECONNREFUSED');
});

for (const version of [1,2,3,4,5,6]) test('v'+version+' verifies each accepted scope field before effects',async t=>{
  const calls=[];
  const port=await listen(t,'127.0.0.1',(req,res)=>{
    calls.push(req.url);
    res.end(JSON.stringify({data:[{id:'synthetic:local'}],version:'synthetic',models:[{name:'synthetic:local'}]}));
  });
  const {temp,inputs,accept}=fixture(t,'http://127.0.0.1:'+port+'/v1');
  const {resultPolicy,invocationPolicy,executionWindow,packagePolicy,...base}=inputs;
  const options={...base,...(version>=3 && {resultPolicy}),...(version>=4 && {invocationPolicy}),
    ...(version>=5 && {executionWindow}),...(version===6 && {packagePolicy})};
  if(version===1)delete options.bindingInputs;
  const scope=version===1?{kind:'unified-harness-readonly-v1',assignment_sha256:sha256(base.bindingInputs.assignmentJson)}
    :JSON.parse(version===6?buildPackageScope(options):buildBoundScope(options.bindingInputs,options.endpoint,options.resultPolicy,options.invocationPolicy,options.executionWindow));
  function* fields(object,prefix=[]){
    for(const [k,v] of Object.entries(object)){
      if(v && typeof v==='object')yield* fields(v,[...prefix,k]);else yield [...prefix,k];
    }
  }
  for(const keys of fields(scope)){
    const changed=structuredClone(scope), k=keys.at(-1);
    const section=keys.slice(0,-1).reduce((o,key)=>o[key],changed);
    section[k]=k==='assignment_sha256'?'0'.repeat(64):section[k]+'-changed';
    await assert.rejects(contractRoundtrip({...options,packet:accept(JSON.stringify(changed))}),undefined,keys.join('.'));
  }
  assert.deepEqual(calls,[]);
  assert.deepEqual(readdirSync(invocationPolicy.directory),[]);
  assert.deepEqual(readdirSync(resultPolicy.directory),[]);
  const bin=path.join(temp,'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin,'opencode'),`#!/usr/bin/env node
const token=require('node:fs').readFileSync('source.txt','utf8');
for(const e of [{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:token}}},{type:'text',part:{text:token}}])console.log(JSON.stringify(e));
`,{mode:0o700});
  const previous=process.env.PATH;
  process.env.PATH=bin+path.delimiter+previous;
  t.after(()=>{process.env.PATH=previous;});
  const receipt=await contractRoundtrip({...options,packet:accept(JSON.stringify(scope))});
  assert.equal(receipt.review_status,'pending');
  assert.ok(calls.length>0);
});
