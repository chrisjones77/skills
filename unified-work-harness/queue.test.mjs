import assert from 'node:assert/strict';
import test from 'node:test';
import { syncBuiltinESMExports } from 'node:module';
import childProcess, { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, renameSync, mkdtempSync, mkdirSync, realpathSync, writeFileSync, rmSync, existsSync, symlinkSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { buildBoundScope, contractRoundtrip, hypervisor, inspectBundledSource, sha256 } from './bundle.mjs';
import { createQueue, dispatchNext, inspectQueue, proposeGoal, readAttended, respondAttended, reconcileInterrupted, reviewCandidate, stopQueue } from './queue.mjs';

function fixture(t, endpoint = 'http://127.0.0.1:11434/v1', packageSupport, dispatch = true, retainResults = false) {
  const temp = realpathSync(mkdtempSync(path.join(tmpdir(),'queue-test-')));
  t.after(() => rmSync(temp,{recursive:true,force:true}));
  const dir = name => { const p=path.join(temp,name); mkdirSync(p,{mode:0o700}); return p; };
  const root = dir('repo'), ledger = dir('ledger'), directory = dir('queue');
  const git = (...args) => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  git('init','-q');
  writeFileSync(path.join(root,'source.txt'),'reference');
  git('add','source.txt');
  git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture');
  const revision = git('rev-parse','HEAD');
  const workspace = {root,revision,identity:root+'#'+git('branch','--show-current'),status_digest:sha256('')};
  const until = offset => new Date(Date.now()+offset).toISOString();
  const invocationPolicy = {directory:ledger,mode:'single_attempt'};
  const resultPolicy = retainResults ? {directory:dir('results'),retention:'owner_managed'} : undefined;
  function candidate(id, reviewer = 'reviewer') {
    const outcome = 'Read source.txt and return its synthetic value for '+id+'.';
    const checks = ['Review source and executor evidence'];
    const assignment = {
      schema_version:'unified-harness.agent-assignment.v1', assignment_id:'assignment_'+id, outcome,
      exclusions:['Do not contact external systems.'],
      assignee:{type:'agent',provider:'mlx',model_id:'mlx-community/test-model',processing:'local',accountable_human:'owner'},
      authority:{mode:'read_only',allowed_read_paths:['source.txt'],allowed_paths:[],allow_test_changes:false},
      data:{classification:'public',contains_sensitive_personal_data:false,contains_secrets:false,external_processing_allowed:false},
      resources:{base_ref:revision,timeout_seconds:30,max_steps:4,max_output_bytes:65536},
      supervision:{priority:'normal',target_date:null,available_effort_minutes:10,dependencies:[],decision_owner:'owner',may_pause:true,feedback_route:'Report any concern to owner.'},
      acceptance:{checks:[{command:'node',args:['--version'],timeout_seconds:10,expected_result:'zero'}],reviewer,require_changes:false},
      escalation:{stop_conditions:['Stop if scope is unclear.'],contact:'owner'},
    };
    const intake = {outcome,exclusions:assignment.exclusions,assignee:{kind:'agent',id:'worker'},accountableHuman:'owner',authority:{allowed:['execute-read-only'],prohibited:['write-source','external-network']},dataClass:'public',resources:{effortMinutes:10,deadline:'none',dependencies:[],reviewerAvailability:'available'},acceptance:{checks,reviewer},escalation:{stopConditions:assignment.escalation.stop_conditions,contact:'owner',mayPause:true},concerns:[]};
    const profile = {primary:'0xB',requiredCapabilities:['readonly_roundtrip'],effectCeiling:['read','write','git','provider','network',...(dispatch?['dispatch']:[])],requestedEffects:dispatch?['dispatch']:[],sourceSha256:inspectBundledSource().sha256};
    const bindingInputs = {profileJson:JSON.stringify(profile),assignmentJson:JSON.stringify(assignment),workspaceJson:JSON.stringify(workspace),intakeJson:JSON.stringify(intake)};
    const assignmentPath = path.join(temp,id+'.json');
    writeFileSync(assignmentPath,bindingInputs.assignmentJson);
    const executionWindow = {not_before:until(-60000),expires_at:until(60000)};
    const packagePolicy = packageSupport && {
      profileRequest: {...profile, sourceSha256:packageSupport.packageInventory().sourceSha256,
        requiredCapabilities:['readonly_roundtrip','assignment_intake','sequential_queue']},
      intakeReview:packageSupport.reviewIntake(bindingInputs.intakeJson,{
        by:reviewer,disposition:'clear',authority:'confirmed',scope:'consistent',concerns:'clear',
        availableMinutes:10,reviewerAvailable:true,evidenceRef:'synthetic intake review',reviewedAt:until(-10000),expiresAt:until(60000),
      }),
    };
    const scope = packagePolicy
      ? packageSupport.buildPackageScope({bindingInputs,endpoint,resultPolicy,invocationPolicy,executionWindow,packagePolicy})
      : buildBoundScope(bindingInputs,endpoint,resultPolicy,invocationPolicy,executionWindow);
    let packet = hypervisor.createPacket({id,owner:'worker',objective:outcome,mode:'Review',workspace,authorization:['execute-read-only'],grantedBy:'owner'});
    packet.authorization.prohibited.push('write-source','external-network');
    packet = hypervisor.offerAssignment(packet,{scope,acceptanceEvidence:JSON.stringify(checks),engineeringPurpose:'0xB',assigner:'owner',reviewer});
    packet = hypervisor.acceptAssignment(packet,{by:'worker',assignmentDigest:hypervisor.currentAssignment(packet).digest,note:'Synthetic acceptance'});
    packet.status='active'; packet.handoff.current_writer='worker';
    packet.checkpoints.push({at:packet.work_contract.acceptance.at,kind:'resumed',note:'Synthetic resume',owner:'worker',workspace:workspace.identity,reconciled:false});
    return {packet, endpoint, assignmentPath, bindingInputs, invocationPolicy, executionWindow, ...(resultPolicy && {resultPolicy}), ...(packagePolicy && {packagePolicy})};
  }
  const first=candidate('first'), second=candidate('second');
  const packets=[first.packet,second.packet];
  const goal = {owner:'owner',objective:'Evaluate the selected synthetic reads.',stopConditions:['Missing evidence'],tasks:packets.map(p=>({id:p.task_id,outcome:p.objective})),selectedIds:['first','second']};
  const config = {goal,packets:[first,second],deadline:until(60000),providerBudgets:{mlx:{attempts:2,workerSeconds:60}}};
  return {directory, dir, temp, first, second, config, candidate};
}

test('a substituted endpoint preserves the queued job and its entire reservation', async t => {
  const f = fixture(t);
  createQueue(f.directory,f.config);
  const before = inspectQueue(f.directory);
  for (const endpoint of [f.first.endpoint+'?', f.first.endpoint.replace('127.0.0.1','localhost')]) {
    await assert.rejects(dispatchNext(f.directory,{...f.first,endpoint}), /endpoint/);
    assert.deepEqual(inspectQueue(f.directory),before);
  }
});

test('explicit goal, accepted identity, ceiling, expiration and cancellation govern admission', async t => {
  const f = fixture(t);
  assert.equal(proposeGoal(f.config.goal).execution_authorized,false);
  assert.throws(()=>proposeGoal({...f.config.goal,selectedIds:['unselected']}));
  assert.throws(()=>createQueue(f.directory,{...f.config,packets:[f.second,f.first]}));
  const config={...f.config,deadline:new Date(Date.now()+750).toISOString(),providerBudgets:{mlx:{attempts:2,workerSeconds:1}}};
  createQueue(f.directory,config);
  assert.throws(()=>createQueue(f.directory,config));
  await assert.rejects(dispatchNext(f.directory,f.second),/order/);
  await assert.rejects(dispatchNext(f.directory,f.first),/budget/);
  await assert.rejects(dispatchNext(f.directory,{...f.first,endpointCheck:()=>({})}),/documented/);
  await wait(775);
  await assert.rejects(dispatchNext(f.directory,f.first),/expired/);
  const snapshot=inspectQueue(f.directory);
  assert.equal(snapshot.stopped,1);
  assert.equal(snapshot.jobs[0].state,'expired');
  assert.equal(snapshot.remaining[0].attempts,2);
  const dir=f.dir('cancel');
  createQueue(dir,f.config);
  stopQueue(dir);
  await assert.rejects(dispatchNext(dir,f.first),/stopped/);
  assert.deepEqual(inspectQueue(dir).jobs.map(job=>job.state),['cancelled','cancelled']);
});

async function simulatedProvider(t, requests = []) {
  const server=createServer((req,res)=>{
    requests.push(req.url);
    res.end(JSON.stringify({data:[{id:'mlx-community/test-model'}]}));
  });
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return 'http://127.0.0.1:'+server.address().port+'/v1';
}
function installWorker(t,f,program) {
  const bin=f.dir('bin'), original=process.env.PATH;
  writeFileSync(path.join(bin,'opencode'),'#!/usr/bin/env node\n'+program,{mode:0o700});
  process.env.PATH=[bin,original].join(path.delimiter);
  t.after(()=>{process.env.PATH=original;});
}

test('running work excludes a concurrent caller and review gates advancement after restart', async t => {
  const f=fixture(t,await simulatedProvider(t));
  const events=[{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'reference'}}},{type:'text',part:{text:'reference'}}];
  installWorker(t,f,'for (const e of '+JSON.stringify(events)+') console.log(JSON.stringify(e));');
  createQueue(f.directory,f.config);
  const active=dispatchNext(f.directory,f.first);
  await assert.rejects(dispatchNext(f.directory,f.first),/unavailable/);
  const receipt=await active;
  const module=new URL('./queue.mjs',import.meta.url).href;
  const snapshot=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',
    'import {inspectQueue} from '+JSON.stringify(module)+'; console.log(JSON.stringify(inspectQueue(process.argv[1])))', f.directory],{encoding:'utf8'}));
  assert.equal(snapshot.jobs[0].receipt,receipt.receipt_sha256);
  await assert.rejects(dispatchNext(f.directory,f.second),/unavailable/);
  const review={assignmentDigest:receipt.assignment_digest,reviewer:'reviewer',receiptHash:receipt.receipt_sha256,evidenceHash:sha256('independent review'),accept:true};
  assert.throws(()=>reviewCandidate(f.directory,{...review,reviewer:'worker'}));
  reviewCandidate(f.directory,review);
  const another=await dispatchNext(f.directory,f.second);
  reviewCandidate(f.directory,{...review,assignmentDigest:another.assignment_digest,receiptHash:another.receipt_sha256,accept:false});
  assert.deepEqual(inspectQueue(f.directory).jobs.map(j=>j.state),['reviewed','rejected']);
  assert.equal(inspectQueue(f.directory).remaining[0].attempts,0);
  assert.ok(!readFileSync(path.join(f.directory,'queue.sqlite')).includes(Buffer.from('Evaluate the selected synthetic reads.')));
});

test('accepted read-only work without dispatch authority cannot enter the worker process', async t => {
  const f = fixture(t,undefined,undefined,false);
  createQueue(f.directory,f.config);
  await assert.rejects(dispatchNext(f.directory,f.first),/effect ceiling/);
  assert.equal(inspectQueue(f.directory).remaining[0].attempts,2);
});

for (const version of ['v5','v6']) {
  for (const misplaced of [false,true]) {
    const scenario = misplaced ? 'refuses a relocated queue before reservation' : 'verifies the source before creating queue storage';
    test(version+' '+scenario, async t => {
      const packageSupport = version === 'v6' && {
        ...await import('./integrated.mjs'), ...await import('./package.mjs'), ...await import('./intake.mjs')
      };
      const requests = [];
      const f = fixture(t,await simulatedProvider(t,requests),packageSupport || undefined);
      const root = f.first.packet.workspace.root;
      const inside = path.join(root,'.queue-state');
      mkdirSync(inside,{mode:0o700});
      writeFileSync(path.join(root,'.git/info/exclude'),'/.queue-state/\n');
      if (!misplaced) {
        const forged = structuredClone(f.config);
        const other = f.dir('other');
        for (const {packet} of forged.packets) packet.workspace.root = other;
        assert.throws(()=>createQueue(inside,forged),/identity|binding/);
        for (const {packet} of forged.packets) {
          packet.workspace.identity = other+'#main';
          packet.checkpoints.at(-1).workspace = packet.workspace.identity;
        }
        assert.throws(()=>createQueue(inside,forged),/identity|binding/);
        for (const item of forged.packets) item.bindingInputs.workspaceJson = JSON.stringify(item.packet.workspace);
        assert.throws(()=>createQueue(inside,forged),/binding/i);
        assert.throws(()=>createQueue(inside,{...f.config,packets:forged.packets.map(item=>item.packet)}),/bindingInputs/);
        assert.deepEqual(readdirSync(inside),[]);
      } else {
        createQueue(f.directory,f.config);
        copyFileSync(path.join(f.directory,'queue.sqlite'),path.join(inside,'queue.sqlite'));
        const before = inspectQueue(inside);
        await assert.rejects(dispatchNext(inside,f.first),/outside/);
        assert.deepEqual(inspectQueue(inside),before);
      }
      assert.deepEqual(readdirSync(f.first.invocationPolicy.directory),[]);
      assert.deepEqual(requests,[]);
    });
  }
  test(version+' rejects substituted policies before reservation and accepts the original envelope', async t => {
    const packageSupport = version === 'v6' && {
      ...await import('./integrated.mjs'), ...await import('./package.mjs'), ...await import('./intake.mjs')
    };
    const requests = [];
    const f = fixture(t,await simulatedProvider(t,requests),packageSupport || undefined);
    const events=[{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'reference'}}},
      {type:'text',part:{text:'reference'}}];
    installWorker(t,f,'for (const event of '+JSON.stringify(events)+') console.log(JSON.stringify(event));');
    createQueue(f.directory,f.config);
    const before = inspectQueue(f.directory);
    async function checkRejection(substitute) {
      const changed = structuredClone(f.first);
      substitute(changed);
      await assert.rejects(dispatchNext(f.directory,changed));
      assert.deepEqual(inspectQueue(f.directory),before,'rejection must preserve the queue reservation');
      assert.deepEqual(readdirSync(f.first.invocationPolicy.directory),[]);
      assert.deepEqual(requests,[]);
    }
    const packetSubstitutions = [
      envelope => { envelope.packet.workspace.revision = 'b'.repeat(40); },
      envelope => { envelope.packet.workspace.status_digest = '0'.repeat(64); },
      envelope => { envelope.packet.workspace.identity += '#other'; },
      envelope => { envelope.packet.workspace.root = f.temp; },
      envelope => { envelope.packet.checkpoints.at(-1).workspace += '#other'; },
    ];
    await t.test(version+' matches the packet workspace and resume before charging', async () => {
      for (const substitute of packetSubstitutions) await checkRejection(substitute);
    });
    const substitutions = [
      envelope => { envelope.invocationPolicy.directory = f.dir('other-ledger'); },
      envelope => { envelope.resultPolicy = {directory:f.dir('other-results'),retention:'owner_managed'}; },
      envelope => { envelope.executionWindow.expires_at = new Date(Date.now()+90000).toISOString(); },
      envelope => { envelope.assignmentPath = f.second.assignmentPath; },
      ...Object.keys(f.first.bindingInputs).map(key => envelope => { envelope.bindingInputs[key] += ' '; }),
      ...['?','#','/other','?view=local'].map(suffix => envelope => { envelope.endpoint += suffix; }),
      envelope => { envelope.endpoint = envelope.endpoint.replace('127.0.0.1','localhost'); },
      envelope => { envelope.endpoint = envelope.endpoint.replace(/:\d+\//,':10080/'); }
    ];
    if (packageSupport) substitutions.push(envelope => { envelope.packagePolicy.intakeReview.assessment.evidenceRef = 'other review'; });
    for (const substitute of substitutions) await checkRejection(substitute);
    assert.equal((await dispatchNext(f.directory,f.first)).review_status,'pending');
    assert.deepEqual(requests,['/v1/models']);
  });
}

test('v6 queued dispatch rechecks the full package profile and reviewed intake', async t => {
  const [{buildPackageScope},{packageInventory},{reviewIntake}] = await Promise.all([
    import('./integrated.mjs'), import('./package.mjs'), import('./intake.mjs'),
  ]);
  const f = fixture(t,await simulatedProvider(t),{buildPackageScope,packageInventory,reviewIntake});
  const events=[{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'reference'}}},{type:'text',part:{text:'reference'}}];
  installWorker(t,f,'for (const e of '+JSON.stringify(events)+') console.log(JSON.stringify(e));');
  createQueue(f.directory,f.config);
  const changed = structuredClone(f.first);
  changed.packagePolicy.profileRequest.requiredCapabilities.pop();
  await assert.rejects(dispatchNext(f.directory,changed),/pinned sequential/);
  const receipt = await dispatchNext(f.directory,f.first);
  assert.equal(receipt.schema_version,'unified.contract-executor-receipt.v6');
  assert.equal(inspectQueue(f.directory).jobs[0].receipt,receipt.receipt_sha256);
});

test('a completed direct invocation cannot be promoted to a queue result on recovery', async t => {
  const f = fixture(t, await simulatedProvider(t));
  const events = [{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'reference'}}},{type:'text',part:{text:'reference'}}];
  installWorker(t,f,'for (const e of '+JSON.stringify(events)+') console.log(JSON.stringify(e));');
  const direct = await contractRoundtrip(f.first);
  createQueue(f.directory,f.config);
  // Crash after queue admission and before this queue's worker could claim the contract.
  const db = new DatabaseSync(path.join(f.directory,'queue.sqlite'));
  try { db.exec("UPDATE jobs SET state='running' WHERE seq=1"); } finally { db.close(); }
  const recovery = reconcileInterrupted(f.directory,{packet:f.first.packet,owner:'owner',
    supervisorExited:true,evidenceHash:sha256('verified exit; separate direct completion')});
  assert.deepEqual(recovery,{state:'reconciliation_required',invocation_state:'completed'});
  assert.equal(inspectQueue(f.directory).jobs[0].receipt,null);
  assert.throws(()=>reviewCandidate(f.directory,{assignmentDigest:direct.assignment_digest,reviewer:'reviewer',
    receiptHash:direct.receipt_sha256,evidenceHash:sha256('other invocation'),accept:true}),/pending candidate/);
  await assert.rejects(dispatchNext(f.directory,f.second),/stopped/);
});

async function assertWorkerExited(marker) {
  const pid = Number(readFileSync(marker,'utf8'));
  assert.ok(Number.isSafeInteger(pid) && pid > 0);
  for (let i=0; i<100; i++) {
    try { process.kill(pid,0); }
    catch (error) { if (error.code==='ESRCH') return; throw error; }
    await wait(50);
  }
  assert.fail('Worker process still exists after cancellation.');
}

test('stopping a live queue terminates its worker and preserves the charged attempt', async t=>{
  const f=fixture(t,await simulatedProvider(t));
  const marker=path.join(f.temp,'started');
  installWorker(t,f,'require("node:fs").writeFileSync('+JSON.stringify(marker)+',String(process.pid)); setInterval(()=>{},1000);');
  createQueue(f.directory,f.config);
  const active=dispatchNext(f.directory,f.first);
  const rejection=assert.rejects(active,/stopped/);
  for(let i=0;i<100 && !existsSync(marker);i++) await wait(50);
  assert.ok(existsSync(marker));
  stopQueue(f.directory);
  await rejection;
  await assertWorkerExited(marker);
  assert.deepEqual(inspectQueue(f.directory).jobs.map(j=>j.state),['failed','cancelled']);
  assert.equal(inspectQueue(f.directory).remaining[0].attempts,1);
});

test('a cleanup error preserves the reason the supervisor stopped work', async t=>{
  const f=fixture(t,await simulatedProvider(t));
  const marker=path.join(f.temp,'started');
  installWorker(t,f,'require("node:fs").writeFileSync('+JSON.stringify(marker)+',String(process.pid)); setInterval(()=>{},1000);');
  createQueue(f.directory,f.config);
  const rejection=assert.rejects(dispatchNext(f.directory,f.first),/Queue stopped.*Could not terminate/);
  for(let i=0;i<100 && !existsSync(marker);i++) await wait(50);
  assert.ok(existsSync(marker));
  const kill=process.kill.bind(process);
  t.mock.method(process,'kill',(pid,signal)=>{
    const result=kill(pid,signal);
    // The real signal still reaches the disposable group. Make the supervisor
    // see a cleanup error as well as the operator's stop.
    if(pid<0 && signal==='SIGKILL') throw Object.assign(Error('synthetic cleanup error'),{code:'EPERM'});
    return result;
  });
  stopQueue(f.directory);
  await rejection;
  await assertWorkerExited(marker);
  assert.deepEqual(inspectQueue(f.directory).jobs.map(j=>j.state),['failed','cancelled']);
});

test('a killed supervisor leaves an uncertain attempt blocked on restart', async t => {
  const f = fixture(t, await simulatedProvider(t));
  const marker = path.join(f.temp, 'active-worker');
  installWorker(t, f, 'require("node:fs").writeFileSync('+JSON.stringify(marker)+',String(process.pid)); setInterval(()=>{},1000);');
  createQueue(f.directory, f.config);
  const source = 'import {dispatchNext} from '+JSON.stringify(new URL('./queue.mjs',import.meta.url).href)+
    '; let text=""; for await (const chunk of process.stdin) text+=chunk; await dispatchNext(process.argv[1],JSON.parse(text));';
  const supervisor = spawn(process.execPath,['--input-type=module','-e', source, f.directory], {stdio:['pipe','ignore','ignore']});
  supervisor.stdin.end(JSON.stringify(f.first));
  const closed = new Promise((resolve, reject) => supervisor.once('close', resolve).once('error', reject));
  try {
    for(let i=0;i<160 && !existsSync(marker);i++) await wait(50);
    assert.ok(existsSync(marker));
    supervisor.kill('SIGKILL');
    await closed;
    await assertWorkerExited(marker);
    await assert.rejects(dispatchNext(f.directory,f.first),/unavailable/);
    await assert.rejects(dispatchNext(f.directory,f.second),/unavailable/);
    const state = inspectQueue(f.directory);
    assert.equal(state.jobs[0].state,'running');
    assert.equal(state.remaining[0].attempts,1);
    const reconciliation = {packet:f.first.packet,owner:'owner',supervisorExited:true,evidenceHash:sha256('supervisor exit record')};
    assert.throws(()=>reconcileInterrupted(f.directory,{...reconciliation,owner:'worker'}));
    assert.equal(reconcileInterrupted(f.directory,reconciliation).state,'reconciliation_required');
    assert.equal(inspectQueue(f.directory).jobs[1].state,'cancelled');
  } finally {
    supervisor.kill('SIGKILL');
  }
});


async function attendedOffer(f, id, kind) {
  const [{offerCoordination},{reviewIntake}] = await Promise.all([import('./coordination.mjs'),import('./intake.mjs')]);
  const intake = {
    outcome:'Review the synthetic note for '+id+'.', exclusions:['External contact'],
    assignee:{kind,id:'worker-'+id}, accountableHuman:'owner', authority:{allowed:['review'],prohibited:['publish']},
    dataClass:'public', resources:{effortMinutes:5,deadline:'none',dependencies:[],reviewerAvailability:'available'},
    acceptance:{checks:['Check private evidence'],reviewer:'reviewer'},escalation:{stopConditions:['Missing inputs'],contact:'owner',mayPause:true},concerns:[],
  };
  const review = reviewIntake(JSON.stringify(intake),{by:'reviewer',disposition:'clear',authority:'confirmed',scope:'consistent',
    concerns:'clear',availableMinutes:10,reviewerAvailable:true,evidenceRef:'synthetic intake record',
    reviewedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()});
  return offerCoordination({id,workspace:f.first.packet.workspace,purpose:'0xB',intake,review});
}
function mixedConfig(f, items) {
  const tasks = items.map(item => {
    const p=item.packet??item;
    return {id:p.task_id,outcome:p.objective};
  });
  return {...f.config,packets:items,goal:{...f.config.goal,tasks,selectedIds:tasks.map(t=>t.id)}};
}
function reply(directory, digest, action, by, details={}) {
  return respondAttended(directory,{assignmentDigest:digest,revision:readAttended(directory,digest).revision,
    action,by,note:'Synthetic attended reply',...details});
}

test('provider refuses a queue copied into another selected workspace', async t => {
  const requests = [];
  const endpoint = await simulatedProvider(t,requests);
  const a = fixture(t,endpoint), b = fixture(t,endpoint);
  const config = {...a.config,packets:[a.first,b.second]};
  const inside = path.join(b.second.packet.workspace.root,'.private-queue');
  mkdirSync(inside,{mode:0o700});
  assert.throws(()=>createQueue(inside,config),/outside/);
  createQueue(a.directory,config);
  for (const name of readdirSync(a.directory)) copyFileSync(path.join(a.directory,name),path.join(inside,name));
  const before = inspectQueue(inside);
  await assert.rejects(dispatchNext(inside,a.first),/location/);
  assert.throws(()=>stopQueue(inside),/location/);
  assert.deepEqual(inspectQueue(inside),before);
  assert.deepEqual(requests,[]);
  assert.deepEqual(readdirSync(a.first.invocationPolicy.directory),[]);
});

test('attended replies require the original queue location after restart',async t => {
  const f = fixture(t);
  const human = await attendedOffer(f,'analyst','human');
  const config = {...mixedConfig(f,[human]),providerBudgets:{}};
  const digest = hypervisor.currentAssignment(human.packet).digest;
  createQueue(f.directory,config);
  const initial = readAttended(f.directory,digest);
  const inside = path.join(human.packet.workspace.root,'.private-queue');
  mkdirSync(inside,{mode:0o700});
  // A database without its location binding remains readable for reconciliation.
  copyFileSync(path.join(f.directory,'queue.sqlite'),path.join(inside,'queue.sqlite'));
  const accept = directory => respondAttended(directory,{assignmentDigest:digest,revision:initial.revision,
    action:'accept',by:human.intake.assignee.id,note:'private-attended-response-3819'});
  assert.throws(()=>accept(inside),/location/);
  assert.deepEqual(readAttended(inside,digest),initial);
  const moved = path.join(inside,'moved');
  renameSync(f.directory,moved);
  assert.throws(()=>accept(moved),/location/);
  assert.deepEqual(readAttended(moved,digest),initial);
  renameSync(moved,f.directory);
  assert.equal(accept(f.directory).state,'attended_accepted');
});

test('mixed human, agent and hybrid work advances only on attended responses and review', async t => {
  const f = fixture(t,await simulatedProvider(t));
  const human = await attendedOffer(f,'analyst','human'), hybrid = await attendedOffer(f,'team','hybrid');
  const h = hypervisor.currentAssignment(human.packet).digest, team = hypervisor.currentAssignment(hybrid.packet).digest;
  const events=[{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'reference'}}},{type:'text',part:{text:'reference'}}];
  installWorker(t,f,'for (const e of '+JSON.stringify(events)+') console.log(JSON.stringify(e));');
  createQueue(f.directory,mixedConfig(f,[human,f.first,hybrid]));
  const initial = readAttended(f.directory,h);
  assert.deepEqual(initial.record,human);
  assert.throws(()=>reply(f.directory,team,'accept','worker-team'),/order/);
  await assert.rejects(dispatchNext(f.directory,{packet:human.packet}));
  await assert.rejects(dispatchNext(f.directory,f.first),/unavailable/);
  assert.throws(()=>reply(f.directory,h,'resume','worker-analyst'));
  assert.throws(()=>reply(f.directory,h,'accept','worker-team'));
  reply(f.directory,h,'accept','worker-analyst');
  assert.throws(()=>reply(f.directory,h,'resume','worker-analyst',{revision:initial.revision}),/Stale/);
  reply(f.directory,h,'resume','worker-analyst');
  reply(f.directory,h,'pause','worker-analyst',{note:'Preserve calculation reference in record.'});
  const recover = 'import {readAttended} from '+JSON.stringify(new URL('./queue.mjs',import.meta.url).href)+
    '; console.log(JSON.stringify(readAttended(process.argv[1],process.argv[2]).record.packet.checkpoints.at(-1)))';
  const checkpoint = JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',recover,f.directory,h],{encoding:'utf8'}));
  assert.equal(checkpoint.note,'Preserve calculation reference in record.');
  const evidence={evidence:'private report reference'};
  assert.throws(()=>reply(f.directory,h,'submit','worker-analyst',evidence));
  reply(f.directory,h,'resume','worker-analyst');
  reply(f.directory,h,'submit','worker-analyst',evidence);
  assert.throws(()=>reply(f.directory,h,'approve','worker-analyst',evidence));
  assert.throws(()=>reviewCandidate(f.directory,{assignmentDigest:h,reviewer:'reviewer',receiptHash:sha256('forged'),evidenceHash:sha256('forged'),accept:true}));
  reply(f.directory,h,'rework','reviewer',evidence);
  reply(f.directory,h,'resume','worker-analyst');
  reply(f.directory,h,'submit','worker-analyst',evidence);
  reply(f.directory,h,'approve','reviewer',evidence);
  await assert.rejects(dispatchNext(f.directory,f.first),/unavailable/);
  reply(f.directory,h,'close','reviewer',evidence);
  const receipt = await dispatchNext(f.directory,f.first);
  assert.throws(()=>reply(f.directory,team,'accept','worker-team'),/order/);
  reviewCandidate(f.directory,{assignmentDigest:receipt.assignment_digest,reviewer:'reviewer',receiptHash:receipt.receipt_sha256,evidenceHash:sha256('private review'),accept:true});
  reply(f.directory,team,'accept','worker-team');
  reply(f.directory,team,'resume','worker-team');
  reply(f.directory,team,'submit','worker-team',evidence);
  reply(f.directory,team,'approve','reviewer',evidence);
  reply(f.directory,team,'close','reviewer',evidence);
  const status=inspectQueue(f.directory);
  assert.deepEqual(status.jobs.map(j=>j.state),['reviewed','reviewed','reviewed']);
  assert.equal(status.remaining[0].attempts,1);
  assert.ok(!JSON.stringify(status).includes('private report reference'));
});

test('attended refusal, stop and expiry retain a recoverable response record without provider budgets',async t=>{
  const f = fixture(t);
  const human = await attendedOffer(f,'analyst','human'), hybrid = await attendedOffer(f,'team','hybrid');
  const config={...mixedConfig(f,[hybrid,human]),providerBudgets:{}};
  const digest = hypervisor.currentAssignment(hybrid.packet).digest;
  createQueue(f.directory,config);
  assert.throws(()=>reply(f.directory,digest,'declined','owner',{checkpoint:'owner to revise the offer'}));
  reply(f.directory,digest,'declined','worker-team',{checkpoint:'owner to revise the offer'});
  assert.equal(readAttended(f.directory,digest).record.packet.work_contract.disposition,'declined');
  assert.deepEqual(inspectQueue(f.directory).jobs.map(j=>j.state),['declined','cancelled']);
  for(const terminal of ['cancelled','expired']){
    const directory=f.dir(terminal);
    createQueue(directory,{...config,deadline:new Date(Date.now()+(terminal==='expired'?800:60000)).toISOString()});
    reply(directory,digest,'accept','worker-team');
    reply(directory,digest,'resume','worker-team');
    const previous=readAttended(directory,digest);
    if(terminal==='expired') await wait(825); else stopQueue(directory);
    assert.throws(()=>reply(directory,digest,'submit','worker-team',{evidence:'late report'}),/expired|stopped/);
    assert.deepEqual(readAttended(directory,digest),previous);
    assert.deepEqual(inspectQueue(directory).jobs.map(j=>j.state),[terminal,'cancelled']);
  }
});

for (const workerSucceeds of [true, false]) {
  test('queue terminates same-group descendants on ' + (workerSucceeds ? 'success' : 'failure'), async t => {
    const f = fixture(t, await simulatedProvider(t));
    const pidFile = path.join(f.temp, 'descendant-pid');
    const release = path.join(f.temp, 'release');
    const observed = path.join(f.temp, 'after-dispatch');
    const descendant = `
      const fs = require('node:fs');
      const poll = setInterval(() => {
        if (fs.existsSync(${JSON.stringify(release)})) {
          fs.writeFileSync(${JSON.stringify(observed)}, 'still working');
          clearInterval(poll);
        }
      }, 10);
      setTimeout(() => clearInterval(poll), 5000).unref();`;
    const events = [
      {type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'reference'}}},
      {type:'text',part:{text:'reference'}}
    ];
    installWorker(t, f, `
      const cp = require('node:child_process'), fs = require('node:fs');
      const helper = cp.spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {stdio:'ignore',detached:false});
      fs.writeFileSync(${JSON.stringify(pidFile)}, String(helper.pid));
      helper.unref();
      for (const event of ${JSON.stringify(events)}) console.log(JSON.stringify(event));
      process.exitCode = ${workerSucceeds ? 0 : 1};`);
    createQueue(f.directory, f.config);
    if (workerSucceeds) {
      await dispatchNext(f.directory, f.first);
      assert.equal(inspectQueue(f.directory).jobs[0].state, 'pending_review');
    } else {
      await assert.rejects(dispatchNext(f.directory, f.first));
      assert.equal(inspectQueue(f.directory).jobs[0].state, 'failed');
    }
    stopQueue(f.directory);
    writeFileSync(release, 'after dispatch and stop');
    await assertWorkerExited(pidFile);
    assert.equal(existsSync(observed), false);
  });
}

test('refuse a queue physically inside a selected checkout under another spelling', t => {
  const f = fixture(t);
  const root = f.first.packet.workspace.root;
  const alias = path.join(f.temp,'REPO');
  if (!existsSync(alias)) symlinkSync(root,alias);
  const directory = path.join(root,'private-queue');
  mkdirSync(directory,{mode:0o700});
  for (const target of [directory,path.join(alias,'private-queue')]) {
    assert.throws(() => createQueue(target,f.config), /outside the source checkout/);
    assert.equal(existsSync(path.join(directory,'queue.sqlite')), false);
  }
});

test('queue rejects source-local temp before reserving an attempt or worker seconds', async t => {
  const f = fixture(t);
  createQueue(f.directory,f.config);
  const before = inspectQueue(f.directory);
  const inside = path.join(f.first.packet.workspace.root,'.tmp');
  mkdirSync(inside);
  const previous = process.env.TMPDIR;
  t.after(() => { if (previous === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = previous; });
  process.env.TMPDIR = inside;
  await assert.rejects(dispatchNext(f.directory,f.first), /outside the source checkout/);
  assert.deepEqual(inspectQueue(f.directory), before);
});

// Inject only in the disposable fork. The public dispatch envelope carries no fault hooks.
for (const [phase,claims,terminals,artifacts,providerCalls] of [
  ['reserved',0,0,0,0], ['claimed',1,0,0,0], ['persisted',1,0,1,1],
  ['completed',1,1,1,1], ['write failure',1,1,0,1],
]) {
  test('queue recovers worker loss at '+phase, async t => {
    const requests=[];
    const f=fixture(t,await simulatedProvider(t,requests),undefined,true,true);
    const events=[{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'reference'}}},
      {type:'text',part:{text:'reference'}}];
    installWorker(t,f,'for (const e of '+JSON.stringify(events)+') console.log(JSON.stringify(e));');
    const observed=path.join(f.temp,'injected');
    const preload=path.join(f.temp,'fault.cjs');
    writeFileSync(preload,`
      const fs=require('node:fs'), phase=${JSON.stringify(phase)};
      function fault() {
        fs.appendFileSync(${JSON.stringify(observed)},phase);
        if (phase==='write failure') throw Error('synthetic ENOSPC');
        process.kill(process.pid,'SIGKILL');
      }
      if (phase==='reserved') fault();
      if (phase==='claimed') globalThis.fetch=fault;
      if (phase==='completed') process.send=fault;
      const write=fs.writeFileSync;
      fs.writeFileSync=function(file,...args) {
        const resultFile=typeof file==='string' && file.startsWith(${JSON.stringify(f.first.resultPolicy.directory+path.sep)});
        if (resultFile && phase==='write failure') fault();
        const written=write.call(this,file,...args);
        if (resultFile && phase==='persisted') fault();
        return written;
      };
      require('node:module').syncBuiltinESMExports();`);
    const original=childProcess.fork;
    const replace=t.mock.method(childProcess,'fork',(file,args,options)=>original(file,args,{
      ...options,execArgv:['--require',preload],env:{...options.env,TMPDIR:f.temp},
    }));
    syncBuiltinESMExports();
    try {
      createQueue(f.directory,f.config);
      await assert.rejects(dispatchNext(f.directory,f.first));
    } finally { replace.mock.restore(); syncBuiltinESMExports(); }
    assert.equal(readFileSync(observed,'utf8'),phase);
    assert.equal(requests.length,providerCalls);
    const files=readdirSync(f.first.invocationPolicy.directory);
    assert.equal(files.filter(name=>name.endsWith('.claim.json')).length,claims);
    const terminal=files.filter(name=>name.endsWith('.terminal.json'));
    assert.equal(terminal.length,terminals);
    if (terminals) assert.equal(JSON.parse(readFileSync(path.join(f.first.invocationPolicy.directory,terminal[0]))).state,
      phase==='completed'?'completed':'failed');
    assert.equal(readdirSync(f.first.resultPolicy.directory).length,artifacts);
    const reopen='import {inspectQueue} from '+JSON.stringify(new URL('./queue.mjs',import.meta.url).href)+
      ';console.log(JSON.stringify(inspectQueue(process.argv[1])))';
    const state=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',reopen,f.directory],{encoding:'utf8'}));
    assert.equal(state.remaining[0].attempts,1);
    assert.equal(state.remaining[0].seconds,30);
    assert.deepEqual(state.jobs.map(job=>job.state),['failed','cancelled']);
    assert.equal(state.jobs[0].receipt,null);
    await assert.rejects(dispatchNext(f.directory,f.second),/stopped/);
  });
}

test('v5 self-review cannot enter a queue or advance an older queue', async t => {
  const requests = [];
  const f = fixture(t,await simulatedProvider(t,requests));
  const self = f.candidate('first','worker');
  const assignmentDigest = hypervisor.currentAssignment(self.packet).digest;
  const config = {...f.config,packets:[self,f.second]};
  assert.throws(() => createQueue(f.directory,config), /separate reviewer/);
  assert.deepEqual(readdirSync(f.directory),[]);
  createQueue(f.directory,f.config);
  // Reconstruct the rows an earlier release persisted for this accepted offer.
  const db = new DatabaseSync(path.join(f.directory,'queue.sqlite'));
  try {
    db.prepare('UPDATE jobs SET digest=?,reviewer=? WHERE seq=1').run(assignmentDigest,sha256(JSON.stringify('worker')));
    const before = inspectQueue(f.directory);
    await assert.rejects(dispatchNext(f.directory,self), /separate reviewer/);
    assert.deepEqual(inspectQueue(f.directory),before);
    assert.deepEqual(requests,[]);
    assert.deepEqual(readdirSync(self.invocationPolicy.directory),[]);
    const receiptHash = sha256('legacy receipt');
    db.prepare("UPDATE jobs SET receipt=?,state='pending_review' WHERE seq=1").run(receiptHash);
    const review = {assignmentDigest,reviewer:'worker',receiptHash,evidenceHash:sha256('self-assessment'),accept:true};
    const pending = inspectQueue(f.directory);
    assert.throws(() => reviewCandidate(f.directory,review));
    assert.throws(() => reviewCandidate(f.directory,{...review,packet:self.packet}), /separate reviewer/);
    assert.throws(() => reviewCandidate(f.directory,{...review,packet:f.first.packet}));
    await assert.rejects(dispatchNext(f.directory,f.second), /order/);
    assert.deepEqual(inspectQueue(f.directory),pending);
    // A genuinely separate reviewer can finish an older pending reservation.
    const originalDigest = hypervisor.currentAssignment(f.first.packet).digest;
    db.prepare('UPDATE jobs SET digest=?,reviewer=? WHERE seq=1').run(originalDigest,sha256(JSON.stringify('reviewer')));
    reviewCandidate(f.directory,{...review,assignmentDigest:originalDigest,reviewer:'reviewer',packet:f.first.packet});
    assert.equal(inspectQueue(f.directory).jobs[0].state,'reviewed');
  } finally { db.close(); }
});

test('stop blocks both decisions on a pending provider receipt', async t => {
  const f = fixture(t,await simulatedProvider(t));
  const events = [{type:'tool_use',part:{tool:'read',state:{status:'completed',input:{filePath:'source.txt'},output:'reference'}}},
    {type:'text',part:{text:'reference'}}];
  installWorker(t,f,'for (const event of '+JSON.stringify(events)+') console.log(JSON.stringify(event));');
  createQueue(f.directory,f.config);
  const receipt = await dispatchNext(f.directory,f.first);
  stopQueue(f.directory);
  const stopped = inspectQueue(f.directory);
  assert.deepEqual(stopped.jobs.map(job=>job.state),['pending_review','cancelled']);
  for (const accept of [true,false]) {
    assert.throws(() => reviewCandidate(f.directory,{assignmentDigest:receipt.assignment_digest,reviewer:'reviewer',
      receiptHash:receipt.receipt_sha256,evidenceHash:sha256('review'),accept}), /stopped/);
    assert.deepEqual(inspectQueue(f.directory),stopped);
  }
});
