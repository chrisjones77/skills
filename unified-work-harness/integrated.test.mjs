import { redirectStatuses, observeDestination, reworkFixture, erasedHoldFixture } from './test-support.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, rmSync, readFileSync, readdirSync, renameSync, symlinkSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runHarness, buildOpenCodeConfig, buildCodexCommand, validatePathAccess, contractRoundtrip, buildBoundScope, inspectInvocation, hypervisor, sha256, inspectBundledSource } from './bundle.mjs';
import { buildPackageScope } from './integrated.mjs';
import { packageInventory } from './package.mjs';
import { reviewIntake } from './intake.mjs';

function fixture(t, endpoint, trackedFile = 'source.txt', timeoutSeconds = 120, prepareCheckout, prepareIndex) {
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
  prepareIndex?.(root,git);
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
const windowCases = ['v5 expires before launch','v5 expires after launch','v6 intake expires after launch'];
for (const beforeRead of [false,true]) for (const scenario of (beforeRead ? redirectStatuses : [...redirectStatuses,200,...windowCases])) {
  const windowCase = typeof scenario === 'string';
  const status = windowCase ? 200 : scenario;
  const stage = beforeRead ? 'before a source read' : 'after a source read';
  test(windowCase ? 'OpenCode window: '+scenario : 'OpenCode completion '+stage+', upstream status '+status, async t => {
    let sourcePosts = 0, firstPosts = 0, completionPosts = 0;
    let expiry, advanced = false;
    const expire = () => { if (!advanced) { advanced=true; t.mock.method(Date,'now',()=>expiry); } };
    const destination = await observeDestination(t);
    const port = await listen(t,'127.0.0.1',async (req,res) => {
      if (req.url !== '/prefix/v1/chat/completions') {
        if (scenario === 'v5 expires before launch' && req.url.endsWith('/models')) expire();
        res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
        return;
      }
      completionPosts++;
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
      if (windowCase && askForRead) expire();
      streamReadCompletion(res, askForRead, hasSource);
    });
    const {inputs,temp,accept} = fixture(t,`http://127.0.0.1:${port}/prefix/v1`,'source.txt',20);
    if (windowCase) {
      expiry = Date.parse(scenario.startsWith('v5') ? inputs.executionWindow.expires_at : inputs.packagePolicy.intakeReview.assessment.expiresAt);
      if (scenario.startsWith('v5')) delete inputs.packagePolicy;
    }
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
  if (${windowCase}) {
    const first=await fetch(baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+apiKey},body:'{"tools":["read"]}'});
    if(!first.ok) throw Error('worker could not start');
    await first.text();
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
    const packet = accept(inputs.packagePolicy ? buildPackageScope(inputs) :
      buildBoundScope(inputs.bindingInputs,inputs.endpoint,inputs.resultPolicy,inputs.invocationPolicy,inputs.executionWindow));
    const run = contractRoundtrip({...inputs,packet});
    const success = status === 200 && (!windowCase || scenario === 'v5 expires after launch');
    if (success) assert.equal((await run).review_status,'pending');
    else await assert.rejects(run);
    if (windowCase) {
      assert.equal(advanced,true);
      assert.equal(completionPosts>0,scenario !== 'v5 expires before launch');
      assert.equal(sourcePosts>0,success);
      assert.equal(inspectInvocation(inputs.invocationPolicy,hypervisor.currentAssignment(packet).digest).state,success?'completed':'failed');
    } else if(beforeRead) assert.ok(firstPosts>0,'the accepted upstream must receive the initial completion');
    else assert.ok(sourcePosts > 0,'the accepted upstream must receive the file token');
    assert.deepEqual(destination.requests,[],'the second listener must receive no requests');
  });
}

// Exercise project discovery in the real binary. A stand-in worker cannot prove
// that startup ignores local configuration or that the first prompt is in scope.
if (process.env.UNIFIED_TEST_INSTALLED_OPENCODE === '1') {
  test('OpenCode isolates colliding recursive Git directories',async t => {
    const canary = 'unoffered-sibling-29840';
    let collision, leaked = false, completed = false, requests = 0;
    const port = await listen(t,'127.0.0.1',async (req,res) => {
      requests++;
      if (req.url !== '/v1/chat/completions') {
        res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();
      leaked ||= body.includes(canary);
      completed ||= body.includes('cobalt-otter-47');
      streamReadCompletion(res,!completed && !leaked && JSON.parse(body).tools?.length,completed || leaked,
        collision ? 'strasse/hidden.txt' : 'strasse/allowed.txt');
    });
    const {inputs,accept} = fixture(t,'http://127.0.0.1:'+port+'/v1','source.txt',20,undefined,(root,git) => {
      mkdirSync(path.join(root,'strasse'));
      collision = existsSync(path.join(root,'straße'));
      if (process.env.UWH_EXPECT_FS) assert.equal(collision,process.env.UWH_EXPECT_FS === 'insensitive');
      if (!collision) mkdirSync(path.join(root,'straße'));
      writeFileSync(path.join(root,'strasse/allowed.txt'),'cobalt-otter-47');
      writeFileSync(path.join(root,'straße/hidden.txt'),canary);
      git('add','strasse/allowed.txt');
      const oid = git('hash-object','-w','straße/hidden.txt');
      git('update-index','--add','--cacheinfo','100644,'+oid+',straße/hidden.txt');
      writeFileSync(path.join(root,'.git/info/exclude'),'strasse/hidden.txt\n');
    });
    const assignment = JSON.parse(inputs.bindingInputs.assignmentJson);
    assignment.authority.allowed_read_paths = ['strasse'];
    inputs.bindingInputs.assignmentJson = JSON.stringify(assignment);
    writeFileSync(inputs.assignmentPath,inputs.bindingInputs.assignmentJson);
    const packet = accept(buildPackageScope(inputs));
    const run = contractRoundtrip({...inputs,packet});
    if (collision) {
      await assert.rejects(run,/Distinct Git paths/);
      assert.equal(requests,0);
      assert.deepEqual(readdirSync(inputs.invocationPolicy.directory),[]);
    } else {
      assert.equal((await run).review_status,'pending');
      assert.ok(completed);
    }
    assert.equal(leaked,false);
  });
  const protectedSchema = 'contracts/schemas/agent-assignment.schema.json';
  const schemaAlias = 'contracts/schemas/agent-aßignment.schema.json';
  for (const {scenario,actual,grant,instructions,exact} of [
    {scenario:'Unicode instruction alias',actual:'straße/source.txt',grant:'strasse/source.txt',instructions:true},
    {scenario:'Unicode protected file alias',actual:protectedSchema,grant:schemaAlias},
    {scenario:'tracked Unicode protected alias',actual:schemaAlias,grant:schemaAlias,exact:true},
    {scenario:'offered Unicode directory',actual:'straße/source.txt',grant:'straße',exact:true},
  ]) {
    test('OpenCode isolates '+scenario, async t => {
      const canary = 'unoffered-unicode-file-3187';
      let requests = 0, leaked = false, completedRead = false, protectedAlias = false;
      const port = await listen(t,'127.0.0.1',async (req,res) => {
        requests++;
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks).toString();
        leaked ||= body.includes(canary);
        if (req.url !== '/v1/chat/completions') {
          res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
          return;
        }
        const hasSource = body.includes('cobalt-otter-47');
        completedRead ||= hasSource;
        streamReadCompletion(res,!hasSource && JSON.parse(body).tools?.length,hasSource,exact ? actual : grant);
      });
      const {inputs,accept} = fixture(t,'http://127.0.0.1:'+port+'/v1','source.txt',20,root => {
        mkdirSync(path.dirname(path.join(root,actual)),{recursive:true});
        writeFileSync(path.join(root,actual),'cobalt-otter-47'+(actual === protectedSchema || actual === schemaAlias ? canary : ''));
        protectedAlias = actual === schemaAlias && existsSync(path.join(root,protectedSchema));
        if (instructions) writeFileSync(path.join(root,'straße','AGENTS.md'),canary);
        if (!exact && process.env.UWH_EXPECT_FS === 'insensitive') {
          assert.equal(readFileSync(path.join(root,grant),'utf8'),readFileSync(path.join(root,actual),'utf8'));
        }
      });
      const assignment = JSON.parse(inputs.bindingInputs.assignmentJson);
      assignment.authority.allowed_read_paths = [grant];
      inputs.bindingInputs.assignmentJson = JSON.stringify(assignment);
      writeFileSync(inputs.assignmentPath,inputs.bindingInputs.assignmentJson);
      const packet = accept(buildPackageScope(inputs));
      const [result] = await Promise.allSettled([contractRoundtrip({...inputs,packet})]);
      if (exact && !protectedAlias) {
        assert.equal(result.status,'fulfilled',String(result.reason));
        assert.equal(result.value.review_status,'pending');
        assert.equal(completedRead,true,'the exact authorized source reached the provider');
        return;
      }
      assert.equal(leaked,false,'provider received unoffered bytes via '+grant);
      assert.equal(result.status,'rejected');
      assert.match(result.reason.message,protectedAlias ? /protected path/ : /exact tracked path/);
      assert.equal(requests,0,'refuse before provider discovery');
      assert.deepEqual(readdirSync(inputs.invocationPolicy.directory),[]);
    });
  }
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
  [null, 'direct v6 rejects FIFO and oversized assignments before effects and preserves the accepted attempt'],
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
      if (title.startsWith('direct v6 rejects FIFO')) {
        const fifo = path.join(temp,'assignment.fifo'), large = path.join(temp,'large.json');
        execFileSync('mkfifo',[fifo]);
        writeFileSync(large,Buffer.alloc(262145,32));
        // A blocked synchronous open cannot be interrupted by an in-process test timer.
        const probe = `import {contractRoundtrip} from ${JSON.stringify(new URL('./bundle.mjs',import.meta.url).href)};
          const opts=JSON.parse(process.argv[1]);
          try {await contractRoundtrip(opts);process.exitCode=1;}
          catch(e){if(!/not a bounded regular file/.test(e.message))throw e;}`;
        execFileSync(process.execPath,['--input-type=module','-e',probe,JSON.stringify({...inputs,packet,assignmentPath:fifo})],
          {timeout:5000,killSignal:'SIGKILL'});
        await assert.rejects(contractRoundtrip({...inputs,packet,assignmentPath:large}),/not a bounded regular file/);
        assert.deepEqual(routes,[]);
        assert.deepEqual(readdirSync(inputs.invocationPolicy.directory),[]);
        assert.deepEqual(readdirSync(inputs.resultPolicy.directory),[]);
      }
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

test('strict format checks the post-read answer with and without result capture', async t => {
  const port = await listen(t,'127.0.0.1',(req,res)=>res.end(JSON.stringify({
    data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test',
  })));
  for (const capture of [true,false]) {
    for (const valid of [false,true]) {
      const {inputs,accept,temp} = fixture(t,'http://127.0.0.1:'+port+'/v1');
      const assignment = JSON.parse(inputs.bindingInputs.assignmentJson);
      assignment.acceptance.response_format = 'single_ascii_token';
      inputs.bindingInputs.assignmentJson = JSON.stringify(assignment);
      writeFileSync(inputs.assignmentPath,inputs.bindingInputs.assignmentJson);
      if (!capture) delete inputs.resultPolicy;
      const packet = accept(buildPackageScope(inputs));
      const events = [{type:'text',part:{text:valid?'Looking it up. ':'Checking'}},
        {type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'cobalt-otter-47'}}},
        {type:'text',part:{text:valid?'cobalt-':''}},{type:'text',part:{text:valid?'otter-47':'.'}}];
      const bin = path.join(temp,'bin');
      mkdirSync(bin);
      writeFileSync(path.join(bin,'opencode'),'#!/usr/bin/env node\nfor(const e of '+JSON.stringify(events)+')console.log(JSON.stringify(e));',{mode:0o700});
      const oldPath = process.env.PATH;
      process.env.PATH = bin + path.delimiter + oldPath;
      try {
        const run = contractRoundtrip({...inputs,packet});
        if (valid) {
          const receipt = await run;
          if (capture) {
            const bytes = readFileSync(path.join(inputs.resultPolicy.directory,receipt.private_result.name));
            assert.equal(JSON.parse(bytes).response,'cobalt-otter-47');
          }
        } else {
          await assert.rejects(run,/policy violation/);
          assert.equal(inspectInvocation(inputs.invocationPolicy,hypervisor.currentAssignment(packet).digest).state,'failed');
          if (capture) assert.deepEqual(readdirSync(inputs.resultPolicy.directory),[]);
        }
      } finally { process.env.PATH = oldPath; }
    }
  }
});

// Complete the authorized read first: each extra event must invalidate an
// otherwise deliverable result, including when the child exits successfully.
for (const [label, trailer] of [
  ['excess steps', JSON.stringify({type:'step_start'})],
  ['excess stdout', JSON.stringify({type:'text',part:{text:'x'.repeat(1024)}})],
  ['malformed stdout', '{malformed}'],
  ['prohibited tool', JSON.stringify({type:'tool_use',part:{tool:'bash'}})],
  ['at the step limit', ''],
]) {
  test('v6 worker output: '+label, async t => {
    const port = await listen(t,'127.0.0.1',(req,res)=>res.end(JSON.stringify({
      data:[{id:'synthetic:local'}],version:'test',models:[{name:'synthetic:local'}],
    })));
    const {inputs,accept,temp} = fixture(t,'http://127.0.0.1:'+port+'/v1');
    const assignment = JSON.parse(inputs.bindingInputs.assignmentJson);
    assignment.resources.max_steps = 1;
    assignment.resources.max_output_bytes = 1024;
    inputs.bindingInputs.assignmentJson = JSON.stringify(assignment);
    writeFileSync(inputs.assignmentPath,inputs.bindingInputs.assignmentJson);
    const packet = accept(buildPackageScope(inputs));
    const events = [{type:'step_start'},{type:'tool_use',part:{tool:'read',state:{status:'completed',
      input:{filePath:'source.txt'},output:'cobalt-otter-47'}}},{type:'text',part:{text:'cobalt-otter-47'}}];
    const bin = path.join(temp,'bin');
    mkdirSync(bin);
    const stdout = events.map(event=>JSON.stringify(event)).concat(trailer).join('\n')+'\n';
    writeFileSync(path.join(bin,'opencode'),'#!/usr/bin/env node\nprocess.stdout.write('+JSON.stringify(stdout)+');',{mode:0o700});
    const previous = process.env.PATH;
    process.env.PATH = bin+path.delimiter+previous;
    t.after(()=>{process.env.PATH=previous;});
    const run = contractRoundtrip({...inputs,packet});
    const digest = hypervisor.currentAssignment(packet).digest;
    if (trailer) {
      await assert.rejects(run,/policy violation/);
      assert.deepEqual(readdirSync(inputs.resultPolicy.directory),[]);
      assert.equal(inspectInvocation(inputs.invocationPolicy,digest).state,'failed');
    } else {
      const receipt = await run;
      const result = JSON.parse(readFileSync(path.join(inputs.resultPolicy.directory,receipt.private_result.name)));
      assert.equal(result.response,'cobalt-otter-47');
      assert.equal(inspectInvocation(inputs.invocationPolicy,digest).state,'completed');
    }
  });
}

function lowLevelFixture(t, prepareCheckout, endpoint = 'http://127.0.0.1:11434/v1') {
  const {inputs,temp} = fixture(t,endpoint,'source.txt',30,prepareCheckout);
  const assignment = JSON.parse(inputs.bindingInputs.assignmentJson);
  assignment.authority.mode = 'structured_proposal';
  assignment.authority.allowed_paths = ['source.txt'];
  assignment.acceptance.require_changes = true;
  assignment.worker = {adapter:'direct_json',context_strategy:'source_files',max_context_bytes:8192};
  const cwd = path.join(temp,'repo');
  function run(completionRequest) {
    writeFileSync(inputs.assignmentPath,JSON.stringify(assignment));
    return runHarness({assignmentPath:inputs.assignmentPath,cwd,endpoint:inputs.endpoint,
      outputRoot:inputs.resultPolicy.directory,endpointCheck:async()=>({}),completionRequest});
  }
  return {assignment,cwd,temp,run};
}

const proposal = {summary:'Correct the synthetic source.',uncertainties:[],
  changes:[{path:'source.txt',operation:'create_or_replace',rationale:'Expected token',content:'replacement'}]};

for (const [label, options] of [
  ['authorized proposal', {}],
  ['outside grant', {path:'other.txt', violation:/outside the allowed proposal scope/}],
  ['protected path', {path:'.git/config', violation:/path is protected/}],
  ['traversal', {path:'../other.txt', violation:/without traversal/}],
  ['unauthorized test', {path:'sample.test.mjs', violation:/unauthorized test path/}],
  ['truncated completion', {finish:'length', violation:/exhausted its token budget/}],
  ['oversized response', {padding:1500, violation:/output budget exceeded/}],
  ['prompt budget', {promptLimit:256, violation:/estimated prompt tokens exceed/}],
]) {
  test('direct proposal: '+label, async t => {
    const {assignment,cwd,run} = lowLevelFixture(t);
    assignment.resources.max_output_bytes = 1024;
    if (options.promptLimit) assignment.resources.max_prompt_tokens = options.promptLimit;
    if (label === 'unauthorized test') assignment.authority.allowed_paths.push(options.path);
    let calls = 0;
    const {evidence,artifactDirectory} = await run(async (url,init)=>{
      calls++;
      assert.equal(init.redirect,'error');
      assert.ok(JSON.parse(init.body).messages.some(m=>m.content.includes('cobalt-otter-47')));
      const content = structuredClone(proposal);
      if (options.path) content.changes[0].path = options.path;
      return Response.json({choices:[{finish_reason:options.finish ?? 'stop',message:{role:'assistant',content:JSON.stringify(content)}}],
        padding:'x'.repeat(options.padding ?? 0)});
    });
    const file = path.join(artifactDirectory,'proposal.json');
    assert.equal(calls,options.promptLimit ? 0 : 1);
    if (options.violation) {
      assert.equal(evidence.disposition,'rejected');
      assert.match(evidence.violations.join('\n'),options.violation);
      assert.equal(existsSync(file),false);
    } else {
      assert.equal(evidence.disposition,'proposal_candidate');
      assert.deepEqual(JSON.parse(readFileSync(file)).changes,proposal.changes);
      assert.equal(evidence.proposal_hash,sha256(JSON.stringify(JSON.parse(readFileSync(file)))));
    }
    assert.equal(readFileSync(path.join(cwd,'source.txt'),'utf8'),'cobalt-otter-47');
  });
}

test('direct context rejects a grant below a symlink before sending source', async t => {
  const {assignment,run} = lowLevelFixture(t,(root,temp)=>{
    const outside = path.join(temp,'outside');
    mkdirSync(outside);
    writeFileSync(path.join(outside,'token.txt'),'unoffered-source-canary');
    symlinkSync(outside,path.join(root,'linked'));
  });
  assignment.authority.allowed_read_paths = ['linked/token.txt'];
  const requests = [];
  await assert.rejects(run(async (url,init)=>{
    requests.push(init.body);
    return Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(proposal)}}]});
  }),error=>/symbolic link/.test(error.cause?.message));
  assert.deepEqual(requests,[]);
});

for (const [label,program,violation] of [
  ['staged authorized edit',"fs.writeFileSync('source.txt','replacement\\n'); cp.execFileSync('git',['add','source.txt']);",null],
  ['new ignored file',"fs.writeFileSync('new.txt','replacement\\n');",null],
  ['staged rename from outside scope',"cp.execFileSync('git',['mv','source.txt','new.txt']);",/out-of-scope path changed: source.txt/],
  ['commit moved',"fs.writeFileSync('source.txt','replacement'); cp.execFileSync('git',['commit','-qam','unexpected']);",/changed the checkout commit/],
  ['unoffered file',"fs.writeFileSync('other.txt','unoffered');",/out-of-scope path changed: other.txt/],
  ['BOM-prefixed unoffered file',"fs.writeFileSync('\uFEFFsource.txt','unoffered');",/out-of-scope path changed: \uFEFFsource.txt/],
  ['unauthorized test',"fs.writeFileSync('sample.test.mjs','unoffered');",/test change was not authorized/],
  ['no changes','',/required a candidate change/],
]) {
  test('edit worker: '+label, async t => {
    const {assignment,run,temp,cwd} = lowLevelFixture(t,root=>writeFileSync(path.join(root,'.gitignore'),'new.txt\n'));
    const target = ['new ignored file','staged rename from outside scope'].includes(label) ? 'new.txt' : 'source.txt';
    assignment.authority.allowed_paths = [target];
    assignment.authority.allowed_read_paths = [...new Set(['source.txt',target])];
    assignment.authority.mode = 'candidate_edit';
    assignment.worker.adapter = 'aider';
    const bin = path.join(temp,'aider');
    writeFileSync(bin,"#!/usr/bin/env node\nconst fs=require('node:fs'), cp=require('node:child_process');\n"+program,{mode:0o700});
    const previous = process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN;
    process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN = bin;
    t.after(()=>{
      if (previous === undefined) delete process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN;
      else process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN = previous;
    });
    const {artifactDirectory,evidence} = await run();
    if (violation) {
      assert.equal(evidence.disposition,'rejected');
      assert.match(evidence.violations.join('\n'),violation);
      assert.deepEqual(evidence.acceptance,[]);
      assert.equal(existsSync(path.join(artifactDirectory,'candidate.patch')),false);
    } else {
      assert.equal(evidence.disposition,'candidate');
      const patch = readFileSync(path.join(artifactDirectory,'candidate.patch'),'utf8');
      assert.equal(sha256(patch),evidence.candidate_patch_hash);
      // Apply only to an isolated index, proving the delivered patch reconstructs the edit.
      const env = {...process.env,GIT_INDEX_FILE:path.join(temp,'review-index')};
      execFileSync('git',['read-tree','HEAD'],{cwd,env});
      execFileSync('git',['apply','--cached','-'],{cwd,env,input:patch});
      assert.equal(execFileSync('git',['show',':'+target],{cwd,env,encoding:'utf8'}),'replacement\n');
    }
    assert.equal(readFileSync(path.join(cwd,'source.txt'),'utf8'),'cobalt-otter-47');
  });
}

test('edit worker refuses a new destination below a symlink before launch', async t => {
  const {assignment,temp,run} = lowLevelFixture(t,(root,temp)=>{
    mkdirSync(path.join(temp,'outside'));
    symlinkSync(path.join(temp,'outside'),path.join(root,'linked'));
  });
  assignment.worker.adapter = 'aider';
  assignment.authority = {mode:'candidate_edit',allowed_read_paths:['linked/new.txt'],
    allowed_paths:['linked/new.txt'],allow_test_changes:false};
  const marker = path.join(temp,'started');
  const binary = path.join(temp,'fake-aider');
  writeFileSync(binary,"#!/usr/bin/env node\nrequire('node:fs').writeFileSync("+JSON.stringify(marker)+",'started');",{mode:0o700});
  const previous = process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN;
  process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN = binary;
  try {
    await assert.rejects(run(),error=>/symbolic link/.test(error.cause?.message));
    assert.equal(existsSync(marker),false);
    assert.deepEqual(readdirSync(path.join(temp,'outside')),[]);
  } finally {
    if (previous === undefined) delete process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN;
    else process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN = previous;
  }
});

for (const [label,trailer,violation] of [
  ['valid proposal','',null],
  ['malformed event','broken JSON',/malformed JSON event/],
  ['second turn',JSON.stringify({type:'turn.started'}),/step budget exceeded/],
  ['execution error',JSON.stringify({type:'error',message:'synthetic-error-canary'}),/execution error/],
  ['cloud processing denied','',null],
]) {
  test('synthetic Codex worker: '+label, async t => {
    const {assignment,temp,run} = lowLevelFixture(t);
    assignment.worker.adapter = 'codex';
    assignment.assignee = {...assignment.assignee,provider:'codex',processing:'external_cloud',model_id:'gpt-5.6-sol'};
    assignment.data.external_processing_allowed = label !== 'cloud processing denied';
    assignment.resources.max_steps = 1;
    const bin = path.join(temp,'fake-codex'), argsFile = path.join(temp,'worker-args');
    const output = [{type:'turn.started'},{type:'item.completed',item:{type:'agent_message',text:JSON.stringify(proposal)}},
      {type:'turn.completed',usage:{output_tokens:23}}].map(e=>JSON.stringify(e)).concat(trailer).join('\n');
    writeFileSync(bin,"#!/usr/bin/env node\nrequire('node:fs').writeFileSync("+JSON.stringify(argsFile)+
      ",JSON.stringify(process.argv.slice(2)));console.log("+JSON.stringify(output)+");",{mode:0o700});
    const previous = process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN;
    process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN = bin;
    t.after(()=>{
      if (previous === undefined) delete process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN;
      else process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN = previous;
    });
    if (!assignment.data.external_processing_allowed) {
      await assert.rejects(run(),/external_processing_allowed=true/);
      assert.equal(existsSync(argsFile),false);
      return;
    }
    const {artifactDirectory,evidence} = await run();
    const args = JSON.parse(readFileSync(argsFile));
    assert.equal(args[args.indexOf('--sandbox')+1],'read-only');
    assert.ok(args.includes('--ignore-user-config'));
    assert.equal(evidence.agent.read_calls,1);
    assert.equal(evidence.disposition,violation?'rejected':'proposal_candidate');
    assert.equal(existsSync(path.join(artifactDirectory,'proposal.json')),!violation);
    if (violation) assert.match(evidence.violations.join('\n'),violation);
    const log = readFileSync(path.join(artifactDirectory,'events.ndjson'),'utf8');
    assert.ok(!log.includes('synthetic-error-canary') && !log.includes(proposal.summary));
  });
}

// Both direct adapters consume the same OpenAI-compatible response envelope.
// Drive them through runHarness so a rejected reply cannot publish a proposal.
for (const [label,provider,adapter] of [
  ['schema-constrained','llamacpp','direct_json'],
  ['post-validated','mlx','direct_validated_json'],
]) {
  const choice = {message:{role:'assistant',content:JSON.stringify(proposal)},finish_reason:'stop'};
  for (const [scenario,reply,expectedViolation] of [
    ['complete', {choices:[choice]}, null],
    ['missing finish', {choices:[{message:choice.message}]}, /completion did not stop/],
    ['filtered finish', {choices:[{...choice,finish_reason:'content_filter'}]}, /completion did not stop/],
    ['second choice', {choices:[choice,choice]}, /exactly one choice/],
    ['wrong role', {choices:[{...choice,message:{...choice.message,role:'user'}}]}, /assistant/],
    ['tool request', {choices:[{...choice,message:{...choice.message,tool_calls:[{id:'synthetic'}]}}]}, /tool call/],
    ['legacy function request', {choices:[{...choice,message:{...choice.message,function_call:{name:'read'}}}]}, /tool call/],
  ]) {
    test('direct reply '+label+': '+scenario, async t=>{
      const {assignment,run} = lowLevelFixture(t);
      assignment.assignee.provider = provider;
      assignment.assignee.model_id = provider === 'mlx' ? 'mlx-community/test-model' : 'synthetic-local';
      assignment.worker.adapter = adapter;
      let requests = 0;
      const {artifactDirectory,evidence} = await run(async (_url,init)=>{
        requests++;
        const sent = JSON.parse(init.body);
        if (provider === 'mlx') assert.deepEqual(sent.chat_template_kwargs,{enable_thinking:false});
        else assert.deepEqual(sent.json_schema.properties.changes.items.properties.path.enum,['source.txt']);
        return Response.json(reply);
      });
      assert.equal(requests,1);
      assert.equal(existsSync(path.join(artifactDirectory,'proposal.json')),!expectedViolation);
      assert.equal(evidence.disposition,expectedViolation ? 'rejected' : 'proposal_candidate');
      assert.equal(evidence.agent.generation_constraint,provider === 'mlx' ? 'none' : 'json_schema');
      if (expectedViolation) assert.match(evidence.violations.join('\n'),expectedViolation);
    });
  }
}

for (const scenario of ['exact bytes','one byte over','invalid UTF-8','malformed JSON','HTTP failure']) {
  test('direct response stream: '+scenario, async t=>{
    const {assignment,run} = lowLevelFixture(t);
    const limit = 1024;
    assignment.resources.max_output_bytes = limit;
    const change = structuredClone(proposal);
    change.summary = 'Synthetic café';
    const json = Buffer.from(JSON.stringify({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(change)}}]}));
    const first = Buffer.concat([json,Buffer.alloc(limit-json.length,0x20)]);
    const split = first.indexOf(Buffer.from('é'))+1;
    if (scenario === 'invalid UTF-8') first[split] = 0xff;
    if (scenario === 'malformed JSON') first[0] = 0x21;
    const chunks = [first.subarray(0,split),first.subarray(split)];
    if (scenario === 'one byte over') chunks.push(Buffer.from(' '),Buffer.from('unneeded tail'));
    let delivered = 0, cancelled = false;
    const {artifactDirectory,evidence} = await run(async ()=>new Response(new ReadableStream({
      pull(controller) {
        if (delivered < chunks.length) controller.enqueue(chunks[delivered++]);
        else controller.close();
      },
      cancel() { cancelled = true; },
    },{highWaterMark:0}),{status:scenario==='HTTP failure' ? 503 : 200}));
    const ok = scenario === 'exact bytes';
    assert.equal(evidence.disposition,ok?'proposal_candidate':'rejected');
    assert.equal(existsSync(path.join(artifactDirectory,'proposal.json')),ok);
    const event = JSON.parse(readFileSync(path.join(artifactDirectory,'events.ndjson')));
    if (scenario === 'one byte over') {
      assert.equal(cancelled,true,'cancel the stream on the first over-budget byte');
      assert.equal(delivered,3);
      assert.equal(event.response_bytes,limit+1);
      assert.equal(event.response_hash,null);
    } else {
      assert.equal(event.response_hash,sha256(first));
      assert.equal(event.response_bytes,limit);
    }
    if (ok) assert.equal(JSON.parse(readFileSync(path.join(artifactDirectory,'proposal.json'))).summary,change.summary);
    else assert.match(evidence.violations.join('\n'),{
      'one byte over':/output budget exceeded/,'invalid UTF-8':/UTF-8/,'malformed JSON':/malformed JSON/,'HTTP failure':/HTTP 503/,
    }[scenario]);
    assert.equal(event.status,ok?'completed':'failed');
  });
}

for (const scenario of ['at the aggregate limit','over the aggregate limit','invalid source UTF-8','nested symlink','missing grant']) {
  test('direct directory context: '+scenario, async t=>{
    const limit = 4096;
    const header = Buffer.from('\uFEFFcafé');
    const tail = Buffer.alloc(limit-header.length,0x78);
    const {assignment,run} = lowLevelFixture(t,(root,temp)=>{
      if (scenario === 'missing grant') return;
      const dir = path.join(root,'inputs');
      mkdirSync(dir);
      writeFileSync(path.join(dir,'a.txt'),header);
      mkdirSync(path.join(dir,'nested'));
      const lastFile = path.join(dir,'nested','b.txt');
      if (scenario === 'nested symlink') symlinkSync(path.join(temp,'unoffered'),lastFile);
      else if (scenario === 'over the aggregate limit') writeFileSync(lastFile,Buffer.concat([tail,Buffer.from([0xff])]));
      else writeFileSync(lastFile,scenario==='invalid source UTF-8' ? Buffer.from([0xff]) : tail);
    });
    assignment.authority.allowed_read_paths = ['inputs','inputs/a.txt'];
    if (scenario === 'missing grant') assignment.authority.allowed_read_paths = ['inputs'];
    assignment.worker.max_context_bytes = limit;
    let requests = 0;
    const result = run(async (_url,init)=>{
      requests++;
      const text = JSON.parse(init.body).messages.at(-1).content;
      const sent = JSON.parse(text.split('Deterministic repository evidence (JSON):\n')[1]);
      assert.deepEqual(sent.files.map(f=>f.path),['inputs/a.txt','inputs/nested/b.txt']);
      assert.equal(sent.files[0].content,header.toString());
      assert.equal(sent.files[0].sha256,sha256(header));
      return Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(proposal)}}]});
    });
    if (scenario === 'at the aggregate limit') {
      const {evidence} = await result;
      assert.equal(evidence.disposition,'proposal_candidate');
      assert.equal(evidence.agent.context.total_bytes,limit);
      assert.equal(requests,1);
    } else {
      const reason = {'over the aggregate limit':/context.*(budget|exceeds)/i,'invalid source UTF-8':/not valid UTF-8/,
        'nested symlink':/symbolic link/,'missing grant':/path does not exist/}[scenario];
      await assert.rejects(result,error=>reason.test(error.cause?.message));
      assert.equal(requests,0);
    }
  });
}

test('direct reply overflow closes the loopback response before EOF', async t=>{
  let finishObservation;
  const closed = new Promise(resolve=>{finishObservation=resolve;});
  let requests = 0, sentTail = false;
  const port = await listen(t,'127.0.0.1',(req,res)=>{
    requests++;
    req.resume();
    res.writeHead(200,{'content-type':'application/json'});
    res.write(Buffer.alloc(1025,0x20));
    // A client waiting for EOF will consume the tail and fail the assertion.
    const fallback = setTimeout(()=>{sentTail=true;res.end('tail');},5000);
    res.once('close',()=>{clearTimeout(fallback);finishObservation();});
  });
  const {assignment,run} = lowLevelFixture(t,undefined,'http://127.0.0.1:'+port+'/v1');
  assignment.resources.max_output_bytes = 1024;
  const {artifactDirectory,evidence} = await run();
  assert.equal(requests,1);
  await closed;
  assert.equal(sentTail,false,'release the provider connection rather than waiting for EOF');
  assert.equal(evidence.disposition,'rejected');
  assert.match(evidence.violations.join('\n'),/output budget exceeded/);
  assert.equal(existsSync(path.join(artifactDirectory,'proposal.json')),false);
});

const nativeStart = {type:'turn.started'};
const nativeMessage = {type:'item.completed',item:{type:'agent_message',text:JSON.stringify(proposal)}};
const nativeFinish = {type:'turn.completed',usage:{input_tokens:6,output_tokens:23}};
const nativeTool = type => ({type:'item.started',item:{type}});
for (const [label,events,violation] of [
  ['ordered turn',[{type:'thread.started',thread_id:'synthetic'},nativeStart,
    {type:'item.updated',item:{type:'reasoning',text:'private-canary'}},nativeMessage,nativeFinish],null],
  ['last completed turn',[nativeStart,{...nativeMessage,item:{...nativeMessage.item,text:'obsolete answer'}},nativeFinish,
    nativeStart,nativeMessage,nativeFinish],null],
  ['nonzero exit',[nativeStart,nativeMessage,nativeFinish],/exit code/],
  ['terminated by signal',[nativeStart,nativeMessage,nativeFinish],/terminated by signal/],
  ['timeout',[nativeStart,nativeMessage,nativeFinish],/wall-clock timeout/],
  ['missing completion',[nativeStart,nativeMessage],/incomplete turn/],
  ['failed turn',[nativeStart,nativeMessage,{type:'turn.failed',error:{message:'private-canary'}}],/failed turn/],
  ['missing start',[nativeMessage,nativeFinish],/outside an active turn/],
  ['message after completion',[nativeStart,nativeFinish,nativeMessage],/outside an active turn/],
  ['duplicate completion',[nativeStart,nativeMessage,nativeFinish,nativeFinish],/outside an active turn/],
  ['overlapping turns',[nativeStart,nativeStart,nativeMessage,nativeFinish],/already active/],
  ['stale proposal',[nativeStart,nativeMessage,nativeFinish,nativeStart,nativeFinish],/response was empty/],
  ...['command_execution','file_change','mcp_tool_call','web_search','unrecognized-private-canary'].map(type=>[
    'disallowed '+type,[nativeStart,nativeTool(type),nativeMessage,nativeFinish],/item outside proposal scope/]),
  ['unknown event',[nativeStart,{type:'unrecognized-private-canary'},nativeMessage,nativeFinish],/unknown event/],
  ['usage metadata',[nativeStart,nativeMessage,{type:'turn.completed',usage:{output_tokens:23,input_tokens:-1,secret:'private-canary'}}],null],
  ['exact output budget',[nativeStart,nativeMessage,nativeFinish],null],
  ['excess stdout',[nativeStart,nativeMessage,nativeFinish],/output budget/],
  ['excess stderr',[nativeStart,nativeMessage,nativeFinish],/output budget/],
  ['invalid event bytes',[nativeStart,nativeMessage,nativeFinish],/UTF-8/],
  ['prompt exceeds budget',[nativeStart,nativeMessage,nativeFinish],/estimated prompt tokens/],
]) {
  test('Codex proposal transcript: '+label, async t=>{
    const {assignment,temp,run} = lowLevelFixture(t);
    assignment.assignee = {...assignment.assignee,provider:'codex',processing:'external_cloud',model_id:'gpt-5.6-sol'};
    assignment.worker.adapter='codex';
    assignment.data.external_processing_allowed=true;
    assignment.resources.max_steps=2;
    if (label==='timeout') assignment.resources.timeout_seconds=10;
    assignment.resources.max_output_bytes=1024;
    if (label==='prompt exceeds budget') assignment.resources.max_prompt_tokens=256;
    let output = Buffer.from(events.map(event=>JSON.stringify(event)).join('\n')+'\n');
    if (label==='exact output budget' || label==='excess stdout') {
      const target = label==='excess stdout' ? 1025 : 1024;
      output=Buffer.concat([Buffer.alloc(target-output.length,0x20),output]);
    }
    if (label==='invalid event bytes') {
      const reasoning=Buffer.concat([Buffer.from('{"type":"item.updated","item":{"type":"reasoning","text":"'),Buffer.from([0xff]),Buffer.from('"}}\n')]);
      const split=output.indexOf(10)+1;
      output=Buffer.concat([output.subarray(0,split),reasoning,output.subarray(split)]);
    }
    const marker=path.join(temp,'invoked');
    const stub=path.join(temp,'synthetic-codex');
    writeFileSync(stub,"#!/usr/bin/env node\nrequire('node:fs').writeFileSync("+JSON.stringify(marker)+",'started');\n"+
      "process.stdout.write(Buffer.from("+JSON.stringify(output.toString('base64'))+",'base64'));\n"+
      (label==='excess stderr'?"process.stderr.write('x'.repeat(1025));":"")+
      (label==='nonzero exit'?"process.exitCode=7;":"")+
      (label==='terminated by signal'?"process.kill(process.pid,'SIGTERM');":"")+
      (label==='timeout'?"setInterval(()=>{},1000);":""),{mode:0o700});
    const previous=process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN;
    process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN=stub;
    t.after(()=>{
      if (previous===undefined) delete process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN;
      else process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN=previous;
    });
    const {artifactDirectory,evidence}=await run();
    assert.equal(existsSync(marker),label!=='prompt exceeds budget');
    assert.equal(evidence.disposition,violation?'rejected':'proposal_candidate','unexpected proposal disposition: '+label);
    assert.equal(existsSync(path.join(artifactDirectory,'proposal.json')),!violation);
    if (violation) assert.match(evidence.violations.join('\n'),violation);
    if (label==='usage metadata') assert.deepEqual(evidence.agent.usage,{output_tokens:23});
    for (const name of ['events.ndjson','evidence.json']) {
      assert.ok(!readFileSync(path.join(artifactDirectory,name),'utf8').includes('private-canary'),name);
    }
  });
}

test('Codex proposal launches outside the checkout with explicit read-only permissions', async t=>{
  const {assignment,temp,cwd,run}=lowLevelFixture(t,root=>writeFileSync(path.join(root,'AGENTS.md'),'unoffered-prompt-canary'));
  assignment.assignee={...assignment.assignee,provider:'codex',processing:'external_cloud',model_id:'gpt-5.6-sol'};
  assignment.data.external_processing_allowed=true;
  assignment.worker.adapter='codex';
  const stub=path.join(temp,'probe-codex'), observed=path.join(temp,'observation');
  const output=[nativeStart,nativeMessage,nativeFinish].map(e=>JSON.stringify(e)).join('\n');
  writeFileSync(stub,"#!/usr/bin/env node\nconst fs=require('node:fs');\n"+
    "fs.writeFileSync("+JSON.stringify(observed)+",JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),files:fs.readdirSync('.')}));\n"+
    "console.log("+JSON.stringify(output)+");",{mode:0o700});
  const previous=process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN;
  process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN=stub;
  t.after(()=>{
    if (previous===undefined) delete process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN;
    else process.env.UNIFIED_HARNESS_SUBAGENT_CODEX_BIN=previous;
  });
  const {evidence}=await run();
  assert.equal(evidence.disposition,'proposal_candidate');
  const obs=JSON.parse(readFileSync(observed));
  assert.notEqual(obs.cwd,cwd);
  assert.deepEqual(obs.files,[],'launch directory contains no repository files');
  assert.ok(!obs.args.includes('--approve-for-me'));
  assert.ok(obs.args.includes('approval_policy="never"'));
  assert.ok(obs.args.includes('--skip-git-repo-check'));
  assert.equal(obs.args[obs.args.indexOf('--sandbox')+1],'read-only');
  assert.ok(obs.args.at(-1).includes('cobalt-otter-47') && !obs.args.at(-1).includes('unoffered-prompt-canary'));
  for (const name of ['shell_tool','unified_exec','multi_agent','apps','plugins','hooks']) {
    assert.ok(obs.args.some((arg,i)=>arg==='--disable' && obs.args[i+1]===name));
  }
  // Preserve the existing edit-worker launch policy.
  const editArgs=buildCodexCommand({...assignment,authority:{...assignment.authority,mode:'candidate_edit'}},temp,'edit');
  assert.equal(editArgs[editArgs.indexOf('--sandbox')+1],'workspace-write');
  assert.ok(editArgs.includes('--approve-for-me'));
});

function syntheticEditor(t, {prepare, program, target='source.txt', defect=false}) {
  const {assignment,cwd,temp,run} = lowLevelFixture(t,prepare);
  assignment.authority = {mode:defect?'defect_reproduction':'candidate_edit',
    allowed_paths:[target],allowed_read_paths:[target],allow_test_changes:defect};
  assignment.worker.adapter = 'aider';
  const stub = path.join(temp,'fake-editor'), marker=path.join(temp,'launch.json');
  writeFileSync(stub,'#!/usr/bin/env node\n'+"const fs=require('node:fs');\n"+
    'fs.writeFileSync('+JSON.stringify(marker)+',JSON.stringify(process.argv.slice(2)));\n'+program,{mode:0o700});
  const previous = process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN;
  process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN=stub;
  t.after(()=>{
    if (previous===undefined) delete process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN;
    else process.env.UNIFIED_HARNESS_SUBAGENT_AIDER_BIN=previous;
  });
  return {assignment,cwd,marker,run};
}

for (const label of ['at source budget','over source budget','nested link','new target','forbidden test edit']) {
  test('edit worker grants: '+label, async t=>{
    const {assignment,marker,run}=syntheticEditor(t,{prepare(root){
      mkdirSync(path.join(root,'docs'));
      const n=4096-Buffer.byteLength('test input')+(label==='over source budget'?1:0);
      writeFileSync(path.join(root,'docs','edit.txt'),Buffer.alloc(n,0x78));
      writeFileSync(path.join(root,'docs','unit.test.mjs'),'test input');
      if (label==='nested link') symlinkSync('../source.txt',path.join(root,'docs','shortcut'));
    },program:"fs.writeFileSync('docs/"+(label==='new target'?'new':'edit')+".txt','revised');"});
    assignment.authority.allowed_read_paths=['docs','docs/edit.txt'];
    assignment.authority.allowed_paths=label==='new target'?['docs/new.txt']:label==='forbidden test edit'?['docs/unit.test.mjs']:['docs'];
    assignment.worker.max_context_bytes=4096;
    const result=run();
    if (['over source budget','nested link','forbidden test edit'].includes(label)) {
      const expected={'over source budget':/byte budget/,'nested link':/symbolic link/,'forbidden test edit':/test path/}[label];
      await assert.rejects(result,e=>expected.test(e.cause?.message));
      assert.equal(existsSync(marker),false);
    } else {
      const {evidence}=await result;
      assert.equal(evidence.disposition,'candidate');
      const args=JSON.parse(readFileSync(marker));
      const values=flag=>args.flatMap((a,i)=>a===flag?[args[i+1]]:[]);
      assert.deepEqual(values('--file'),[label==='new target'?'docs/new.txt':'docs/edit.txt']);
      assert.deepEqual(values('--read'),label==='new target'?['docs/edit.txt','docs/unit.test.mjs']:['docs/unit.test.mjs']);
    }
  });
}

for (const label of ['exact stdout','excess stdout','excess stderr','binary output','nonzero exit','signal','timeout']) {
  test('edit worker termination: '+label,async t=>{
    const prefix="fs.writeFileSync('source.txt','revised');\n";
    const actions={
      'exact stdout':"process.stdout.write(Buffer.alloc(1024,0x61));",
      'excess stdout':"process.stdout.write(Buffer.alloc(1025,0x61));",
      'excess stderr':"process.stderr.write(Buffer.alloc(1025,0x61));",
      'binary output':"process.stdout.write(Buffer.from([0xff,0x00,0xc3]));process.stderr.write(Buffer.from([0x80]));",
      'nonzero exit':"process.exitCode=7;",signal:"process.kill(process.pid,'SIGTERM');",timeout:"setInterval(()=>{},1000);",
    };
    const {assignment,run}=syntheticEditor(t,{program:prefix+actions[label]});
    assignment.resources.max_output_bytes=1024;
    assignment.resources.timeout_seconds=10;
    const {artifactDirectory,evidence}=await run();
    const event=JSON.parse(readFileSync(path.join(artifactDirectory,'events.ndjson')));
    const ok=['exact stdout','binary output'].includes(label);
    assert.equal(evidence.disposition,ok?'candidate':'rejected','unexpected worker result: '+label);
    assert.equal(evidence.acceptance.length,ok?1:0);
    assert.equal(event.status,ok?'completed':'failed');
    if (label.startsWith('excess')) {
      assert.match(evidence.violations.join('\n'),/output budget/);
      assert.equal(event.output_hash,null);
    } else if (label==='binary output') {
      const stdout=Buffer.from([0xff,0x00,0xc3]), stderr=Buffer.from([0x80]);
      assert.equal(event.output_hash,sha256(Buffer.concat([stdout,Buffer.from('\n'),stderr])));
      assert.equal(evidence.agent.stderr_hash,sha256(stderr));
    } else if (label==='timeout') {
      assert.equal(evidence.agent.timed_out,true);
      assert.equal(event.output_hash,null);
    }
  });
}

for (const [label,defect,script,passed] of [
  ['expected zero',false,"process.stdout.write(Buffer.from([0xff]));",true],
  ['unexpected nonzero',false,"process.exitCode=9;",false],
  ['expected nonzero',true,"process.exitCode=9;",true],
  ['unexpected zero',true,"process.exitCode=0;",false],
  ['signal is not a reproduced defect',true,"process.kill(process.pid,'SIGTERM');",false],
  ['timeout is not a reproduced defect',true,"setInterval(()=>{},1000);",false],
  ['excess output is not a reproduced defect',true,"process.stdout.write(Buffer.alloc(5242881));process.exitCode=9;",false],
]) {
  test('edit acceptance: '+label, async t=>{
    const target=defect?'probe.test.mjs':'source.txt';
    const {assignment,run}=syntheticEditor(t,{target,defect,program:`fs.writeFileSync('${target}','revised');`});
    const check={command:'node',args:['-e',script],expected_result:defect?'nonzero':'zero',timeout_seconds:label.startsWith('timeout')?1:10};
    assignment.acceptance.checks=[check,{...check,args:['-e',defect?'process.exitCode=1;':'process.exitCode=0;']}];
    const {evidence}=await run();
    assert.equal(evidence.disposition,passed?(defect?'reproduction_candidate':'candidate'):'rejected');
    assert.equal(evidence.acceptance.length,passed?2:1);
    const first=evidence.acceptance[0];
    assert.equal(first.passed,passed);
    if (label==='expected zero') assert.equal(first.stdout_hash,sha256(Buffer.from([0xff])));
    if (label.startsWith('excess')) {
      assert.equal(first.output_exceeded,true);
      assert.equal(first.stdout_hash,null);
    }
    if (label.startsWith('timeout')) assert.equal(first.timed_out,true);
    if (label.startsWith('signal')) assert.equal(first.signal,'SIGTERM');
  });
}

for (const [label,action,unchanged] of [
  ['unchanged edit',"fs.readFileSync('source.txt');",true],
  ['mutated edit',"fs.writeFileSync('source.txt','independently rewritten');",false],
  ['modified tracked input',"fs.writeFileSync('other.txt','changed by the check');",false],
  ['moved revision',"cp.execFileSync('git',['commit','--allow-empty','-qm','moved by check']);",false],
  ['untracked build output',"fs.writeFileSync('build.tmp','scratch');",true],
]) {
  test('acceptance patch binding: '+label,async t=>{
    const {assignment,run}=syntheticEditor(t,{prepare(root){writeFileSync(path.join(root,'other.txt'),'original');},
      program:"fs.writeFileSync('source.txt','worker candidate');"});
    const check=code=>({command:'node',args:['-e',code],expected_result:'zero',timeout_seconds:10});
    assignment.acceptance.checks=[check("const fs=require('node:fs'),cp=require('node:child_process');"+action),
      check("process.exit(0);")];
    const {evidence,artifactDirectory}=await run();
    assert.equal(evidence.disposition,unchanged?'candidate':'rejected','check result must match the delivered patch');
    assert.equal(evidence.acceptance.length,unchanged?2:1,'stop checking a different candidate');
    assert.equal(evidence.acceptance[0].passed,unchanged);
    assert.equal(evidence.acceptance[0].candidate_unchanged,unchanged);
    const patch=readFileSync(path.join(artifactDirectory,'candidate.patch'),'utf8');
    assert.equal(sha256(patch),evidence.candidate_patch_hash);
    assert.ok(patch.includes('+worker candidate'));
  });
}

for (const [label,mutate,reason] of [
  ['missing test authority',a=>{a.authority.allow_test_changes=false;},/test-change authority/],
  ['non-test target',a=>{a.authority.allowed_read_paths=a.authority.allowed_paths=['source.txt'];},/must identify test files/],
  ['changes optional',a=>{a.acceptance.require_changes=false;},/must require changes/],
  ['expects success',a=>{a.acceptance.checks[0].expected_result='zero';},/must expect nonzero/],
  ['outside read grant',a=>{a.authority.allowed_read_paths=['source.txt'];},/inside an allowed read path/],
  ['unapproved command',a=>{a.acceptance.checks[0].command='sh';},/command is not permitted/],
  ['wrong adapter mode',a=>{a.authority.mode='read_only';},/aider adapter requires/],
]) {
  test('defect edit admission: '+label,async t=>{
    const {assignment,run,marker}=syntheticEditor(t,{defect:true,target:'probe.test.mjs',program:"process.exit(0);"});
    assignment.acceptance.checks[0].expected_result='nonzero';
    mutate(assignment);
    await assert.rejects(run(),reason);
    assert.equal(existsSync(marker),false);
  });
}

test('edit worker passes option-shaped files as literal arguments', async t=>{
  const {assignment,run,marker}=syntheticEditor(t,{target:'--model',prepare(root){writeFileSync(path.join(root,'--config'),'context');},
    program:"fs.writeFileSync('--model','revised');"});
  assignment.authority.allowed_read_paths=['--config','--model'];
  const {evidence}=await run();
  assert.equal(evidence.disposition,'candidate');
  const args=JSON.parse(readFileSync(marker));
  assert.ok(args.some((a,i)=>a==='--file' && args[i+1]==='./--model'));
  assert.ok(args.some((a,i)=>a==='--read' && args[i+1]==='./--config'));
});

test('v6 refuses a terminal receipt when its in-flight claim changes', async t=>{
  let claim;
  const routes=[];
  const port=await listen(t,'127.0.0.1',(req,res)=>{
    routes.push(req.url);
    if(req.url==='/v1/models') writeFileSync(claim,'{}');
    res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
  });
  const {inputs,temp,accept}=fixture(t,'http://127.0.0.1:'+port+'/v1');
  const packet=accept(buildPackageScope(inputs));
  const digest=hypervisor.currentAssignment(packet).digest, ledger=inputs.invocationPolicy.directory;
  claim=path.join(ledger,digest+'.claim.json');
  const events=[{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'cobalt-otter-47'}}},
    {type:'text',part:{text:'cobalt-otter-47'}}];
  const bin=path.join(temp,'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin,'opencode'),'#!/usr/bin/env node\nfor(const e of '+JSON.stringify(events)+')console.log(JSON.stringify(e));',{mode:0o700});
  const previous=process.env.PATH;
  process.env.PATH=bin+path.delimiter+previous;
  t.after(()=>{process.env.PATH=previous;});
  await assert.rejects(contractRoundtrip({...inputs,packet}),/reconcile without retrying/);
  assert.deepEqual(readdirSync(ledger),[digest+'.claim.json']);
  assert.equal(inspectInvocation(inputs.invocationPolicy,digest).requires_reconciliation,true);
  // A result written before terminal persistence is an orphan, not a receipt.
  assert.equal(readdirSync(inputs.resultPolicy.directory).length,1);
  const first=[...routes];
  await assert.rejects(contractRoundtrip({...inputs,packet}),/claim unavailable or already exists/);
  assert.deepEqual(routes,first);
});

for (const [name,makeHold,expectedError] of [
  ['direct v6 rework rejects the prior resume before discovery or claim',reworkFixture,/resume checkpoint/i],
  ['direct v6 rejects erased clarification before discovery or claim',erasedHoldFixture,/clarification/i],
]) {
  test(name,async t=>{
    const requests=[];
    const port=await listen(t,'127.0.0.1',(req,res)=>{
      requests.push(req.url);
      res.end(JSON.stringify({data:[{id:'synthetic:local'}],models:[{name:'synthetic:local'}],version:'test'}));
    });
    const {inputs,accept,temp}=fixture(t,'http://127.0.0.1:'+port+'/v1');
    const bin=path.join(temp,'bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin,'opencode'),'#!/usr/bin/env node\nprocess.exit(1);',{mode:0o700});
    const previous=process.env.PATH;
    process.env.PATH=bin+path.delimiter+previous;
    t.after(()=>{process.env.PATH=previous;});
    const {stale}=makeHold(hypervisor,accept(buildPackageScope(inputs)));
    await assert.rejects(contractRoundtrip({...inputs,packet:stale}),expectedError);
    assert.deepEqual(requests,[]);
    assert.deepEqual(readdirSync(inputs.invocationPolicy.directory),[]);
    assert.deepEqual(readdirSync(inputs.resultPolicy.directory),[]);
  });
}
