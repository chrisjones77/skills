import { redirectStatuses, observeDestination } from './test-support.mjs';
import {packageInventory} from "./package.mjs";
import {reviewIntake} from "./intake.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {execFileSync} from "node:child_process";
import {mkdtempSync,mkdirSync,readFileSync,realpathSync,readdirSync,rmSync,writeFileSync,utimesSync,existsSync,copyFileSync,symlinkSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {buildCandidateScope,candidateRoundtrip,inspectCandidateRuntime,readCandidateForReview,evaluateTextFixture} from "./candidate.mjs";
import {hypervisor,sha256,inspectInvocation} from "./bundle.mjs";

async function fixture(t) {
  const temp=realpathSync(mkdtempSync(path.join(tmpdir(),"candidate-test-")));
  t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const repo=path.join(temp,"repo"), ledger=path.join(temp,"ledger"),results=path.join(temp,"results");
  for (const p of [repo,ledger,results]) mkdirSync(p,{mode:0o700});
  const git=(...args)=>execFileSync("git",args,{cwd:repo,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
  git("init","-b","main");
  writeFileSync(path.join(repo,"sample.txt"),"old text\n");
  git("add","sample.txt");
  git("-c","user.name=Synthetic","-c","user.email=test@example.invalid","commit","-m","sample");
  const source={requests:[],respond:null};
  const server=createServer(async(req,res)=>{
    const chunks=[];
    for await(const c of req) chunks.push(c);
    source.requests.push({url:req.url,body:JSON.parse(Buffer.concat(chunks))});
    source.respond(req,res);
  });
  await new Promise((resolve,reject)=>server.once("error",reject).listen(0,"127.0.0.1",resolve));
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const {bundle,candidate,intake:intakeHash}=inspectCandidateRuntime();
  const roles={accountableHuman:"owner",assignee:{id:"worker",kind:"agent"},acceptance:{reviewer:"reviewer",checks:["Compare private candidate with pinned source."]}};
  const allowed=["read","prepare-candidate","local-provider"];
  const prohibited=["commit","push","merge","deploy","external-account-actions","third-party-contact","write-source","external-network","execute-generated-code"];
  const packageProfile={primary:"0x3",requiredCapabilities:["candidate_changes","assignment_intake"],
    effectCeiling:["read","write","git","provider","network"],sourceSha256:packageInventory().sourceSha256};
  const request={mode:"candidate_edit",purpose:"0x3",packageProfile,runtime:{bundle,candidate,intake:intakeHash},
    workspace:{root:repo,identity:repo+"#main",revision:git("rev-parse","HEAD"),status_digest:sha256("")},
    intake:{outcome:"Correct the public synthetic text",...roles,authority:{allowed,prohibited},dataClass:"public",exclusions:["applying changes"],
      resources:{effortMinutes:10,deadline:"none",dependencies:[],reviewerAvailability:"available"},
      concerns:[],escalation:{contact:"owner",stopConditions:["unresolved meaning"],mayPause:true}},
    reads:["sample.txt"],writes:["sample.txt"],assertions:[{path:"sample.txt",contains:"new text",expected:true}],
    limits:{contextBytes:8192,replyBytes:8192,tokens:1000,timeoutMs:5000},
    data:{containsSecrets:false,containsSensitivePersonalData:false,processing:"local"},
    provider:{adapter:"openai_chat",endpoint:"http://127.0.0.1:"+server.address().port+"/v1/chat/completions",model:"synthetic"},
    invocationPolicy:{directory:ledger,mode:"single_attempt"},resultPolicy:{directory:results,retention:"owner_managed"},
    executionWindow:{not_before:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+60000).toISOString()}};
  function accept(r=request) {
    r.intakeReview=reviewIntake(JSON.stringify(r.intake),{by:"reviewer",disposition:"clear",authority:"confirmed",scope:"consistent",
      concerns:"clear",availableMinutes:10,reviewerAvailable:true,evidenceRef:"synthetic reviewer record",
      reviewedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()});
    let p=hypervisor.createPacket({id:"candidate-test",mode:"Implementation",owner:"worker",objective:r.intake.outcome,
      workspace:r.workspace,authorization:allowed,grantedBy:"owner"});
    p.authorization.prohibited=[...prohibited];
    p=hypervisor.offerAssignment(p,{scope:buildCandidateScope(r),engineeringPurpose:r.purpose,acceptanceEvidence:JSON.stringify(r.intake.acceptance.checks),assigner:"owner",reviewer:"reviewer"});
    p=hypervisor.acceptAssignment(p,{by:"worker",assignmentDigest:hypervisor.currentAssignment(p).digest,note:"Synthetic acceptance"});
    p.status="active";p.handoff.current_writer="worker";
    p.checkpoints.push({kind:"resumed",owner:"worker",workspace:p.workspace.identity,at:new Date().toISOString()});
    return p;
  }
  const answer=(req,res,content)=>{
    const message={role:"assistant",content:JSON.stringify(content)};
    res.end(JSON.stringify(req.url==="/api/chat"?{done:true,done_reason:"stop",message}:{choices:[{finish_reason:"stop",message}]}));
  };
  source.respond=(req,res)=>answer(req,res,{edits:[{path:"sample.txt",text:"new text\n"}]});
  return {request,source,accept,results,git,answer};
}

test("candidate offers reject fetch-forbidden ports before contacting the provider",async t=>{
  const {request,source,accept}=await fixture(t);
  for (const port of [0,6000,10080]) {
    request.provider.endpoint=`http://127.0.0.1:${port}/v1/chat/completions`;
    assert.throws(()=>accept(),/provider port/);
  }
  assert.deepEqual(source.requests,[]);
  assert.deepEqual(readdirSync(request.invocationPolicy.directory),[]);
});

test("both provider protocols produce a private candidate and preserve source; attempts cannot replay",async t=>{
  const {request,source,accept,results,git}=await fixture(t);
  for(const adapter of ["openai_chat","ollama_chat"]){
    request.provider.adapter=adapter;
    if(adapter==="ollama_chat")request.provider.endpoint=request.provider.endpoint.replace("/v1/chat/completions","/api/chat");
    const packet=accept(),before=JSON.stringify(packet);
    const receipt=await candidateRoundtrip({packet,request});
    assert.equal(receipt.package_sha256,request.packageProfile.sourceSha256);
    assert.equal(receipt.profile_sha256,sha256(JSON.stringify(request.packageProfile)));
    assert.equal(receipt.review_status,"pending");
    assert.equal(receipt.reviewer,"reviewer");
    assert.equal(sha256(readFileSync(path.join(results,receipt.private_result.name))),receipt.private_result.sha256);
    const result=JSON.parse(readFileSync(path.join(results,receipt.private_result.name)));
    assert.equal(result.edits[0].base_sha256,sha256("old text\n"));
    assert.equal(result.edits[0].text,"new text\n");
    assert.deepEqual(result.outcomes,[true]);
    assert.deepEqual(readCandidateForReview({packet,request,receipt}),result);
    assert.throws(()=>readCandidateForReview({packet,request,receipt:{...receipt,reviewer:"other"}}));
    assert.equal(git("status","--porcelain"),"");
    assert.equal(JSON.stringify(packet),before);
    assert.equal(inspectInvocation(request.invocationPolicy,receipt.assignment_digest).evidence_sha256,receipt.receipt_sha256);
    await assert.rejects(candidateRoundtrip({packet,request}),/claim unavailable/);
  }
  assert.deepEqual(source.requests.map(r=>r.url),["/v1/chat/completions","/api/chat"]);
});

for (const adapter of ['openai_chat','ollama_chat']) {
  test(adapter+' observes response limits, integrity and private evidence', async t => {
    const {request,source,results,accept,git} = await fixture(t);
    request.provider.adapter = adapter;
    const native = adapter === 'ollama_chat';
    if (native) request.provider.endpoint = request.provider.endpoint.replace('/v1/chat/completions','/api/chat');
    const message = {role:'assistant',content:JSON.stringify({edits:[{path:'sample.txt',text:'new text'}]})};
    const payload = native ? {done:true,done_reason:'stop',message} : {choices:[{finish_reason:'stop',message}]};
    const json = JSON.stringify(payload);
    const destination = await observeDestination(t);
    const cases = [
      ...redirectStatuses.map(status => [String(status),res => res.writeHead(status,{location:destination.url}).end()]),
      ['stream disconnected',res => {res.writeHead(200);res.write(json.slice(0,10));setImmediate(()=>res.destroy());}],
      ['truncated',res => res.end(json.slice(0,-1))],
      ['tool call',res => res.end(json.replace('"role":"assistant"','"role":"assistant","tool_calls":[{}]'))],
      ['over limit',res => res.end(json+'  ')],
      ['at limit',res => res.end(json+' ')],
      ['under limit',res => res.end(json)],
    ];
    for (const [label,send] of cases) {
      const r = structuredClone(request);
      r.intake.outcome += ' '+label;
      r.limits.replyBytes = Buffer.byteLength(json)+1;
      const packet = accept(r);
      const digest = hypervisor.currentAssignment(packet).digest;
      source.respond = (req,res) => send(res);
      const before = readdirSync(results).sort();
      const previousCalls = source.requests.length;
      const run = candidateRoundtrip({packet,request:r});
      if (label==='at limit' || label==='under limit') {
        const receipt = await run;
        const file = path.join(results,receipt.private_result.name);
        const bytes = readFileSync(file);
        assert.equal(sha256(bytes),receipt.private_result.sha256);
        assert.ok(!JSON.stringify(receipt).includes('new text'));
        assert.equal(readCandidateForReview({packet,request:r,receipt}).edits[0].text,'new text');
        const damaged = Buffer.from(bytes);
        damaged[damaged.length-1] ^= 1;
        writeFileSync(file,damaged);
        assert.throws(()=>readCandidateForReview({packet,request:r,receipt}),/differs from receipt/);
        writeFileSync(file,bytes);
        for (const key of Object.keys(receipt)) {
          assert.throws(()=>readCandidateForReview({packet,request:r,receipt:{...receipt,[key]:null}}),undefined,key);
        }
      } else {
        await assert.rejects(run,/attempt failed/);
        assert.deepEqual(readdirSync(results).sort(),before,label);
        assert.equal(inspectInvocation(r.invocationPolicy,digest).state,'failed',label);
      }
      await assert.rejects(candidateRoundtrip({packet,request:r}),/claim unavailable/);
      assert.equal(source.requests.length,previousCalls+1,label);
      assert.deepEqual(destination.requests,[],label);
      assert.equal(git('status','--porcelain'),'');
    }
  });
}

test("defect reproduction safely returns a failing accepted data fixture",async t=>{
  const {request,source,accept,results,answer}=await fixture(t);
  request.mode="defect_reproduction";request.writes=["tests/reproduce.json"];
  source.respond=(req,res)=>answer(req,res,{assertions:request.assertions});
  const receipt=await candidateRoundtrip({packet:accept(),request});
  const artifact=JSON.parse(readFileSync(path.join(results,receipt.private_result.name)));
  assert.deepEqual(artifact.outcomes,[false]);
  assert.deepEqual(JSON.parse(artifact.edits[0].text),{assertions:request.assertions});
  assert.equal(artifact.edits[0].base_sha256,null);
  const saved=JSON.parse(artifact.edits[0].text);
  assert.deepEqual(evaluateTextFixture(saved,{"sample.txt":"old text\n"}),[false]);
  assert.deepEqual(evaluateTextFixture(saved,{"sample.txt":"new text\n"}),[true]);
  assert.throws(()=>evaluateTextFixture(saved,{}),/Missing/);
  assert.throws(()=>evaluateTextFixture({assertions:[{...saved.assertions[0],path:"../escape"}]},{}),/assertions/);
});

test("held scopes, time, substitutions and pre-cancellation issue no provider request",async t=>{
  const {request,source,accept,results}=await fixture(t);
  const packet=accept();
  await assert.rejects(candidateRoundtrip({packet,request:{...request,writes:["new.txt"]}}),/offered scope/);
  await assert.rejects(candidateRoundtrip({packet,request,signal:AbortSignal.abort()}));
  const expired={...request,executionWindow:{not_before:"2020-01-01T00:00:00.000Z",expires_at:"2020-01-01T00:00:01.000Z"}};
  await assert.rejects(candidateRoundtrip({request:expired,packet:accept(expired)}),/outside accepted window/);
  assert.throws(()=>buildCandidateScope({...request,writes:[".git/config"]}));
  assert.throws(()=>buildCandidateScope({...request,provider:{...request.provider,endpoint:"https://example.invalid"}}));
  assert.throws(()=>buildCandidateScope({...request,data:{...request.data,containsSecrets:true}}));
  await assert.rejects(candidateRoundtrip({packet,request:{...request,intakeReview:{...request.intakeReview,review_sha256:"0".repeat(64)}}}),/review held/);
  assert.deepEqual(source.requests,[]);
  assert.deepEqual(readdirSync(results),[]);
  assert.deepEqual(readdirSync(request.invocationPolicy.directory),[]);
});

test("out-of-scope output, failed oracle, redirect and oversize body consume attempts without artifacts",async t=>{
  const {request,source,results,accept,answer}=await fixture(t);
  for(const [index,respond] of [
    (req,res)=>answer(req,res,{edits:[{path:"../outside",text:"new text"}]}),
    (req,res)=>answer(req,res,{edits:[{path:"sample.txt",text:"wrong"}]}),
    (req,res)=>{res.writeHead(307,{Location:"/different"});res.end();},
    (req,res)=>res.end("x".repeat(8193)),
  ].entries()){
    source.respond=respond;
    const r={...request,intake:{...request.intake,outcome:"Synthetic failure "+index}};
    const packet=accept(r);
    await assert.rejects(candidateRoundtrip({packet,request:r}),/attempt failed/);
    assert.equal(inspectInvocation(r.invocationPolicy,hypervisor.currentAssignment(packet).digest).state,"failed");
    assert.deepEqual(readdirSync(results),[]);
  }
  assert.equal(source.requests.length,4);
});

test("cancellation during a provider request blocks persistence and replay",async t=>{
  const {request,source,accept,results}=await fixture(t);
  const cancel=new AbortController();
  source.respond=()=>cancel.abort();
  const packet=accept();
  await assert.rejects(candidateRoundtrip({packet,request,signal:cancel.signal}),/attempt failed/);
  assert.equal(inspectInvocation(request.invocationPolicy,hypervisor.currentAssignment(packet).digest).state,"failed");
  assert.deepEqual(readdirSync(results),[]);
});

test("source preflight refuses executable local Git filters before status, ledger or provider",async t=>{
  const {request,source,accept,git}=await fixture(t);
  const repo=request.workspace.root, marker=path.join(repo,".git","filter-ran");
  const packet=accept();
  writeFileSync(path.join(repo,".git","info","attributes"),"sample.txt filter=untrusted\n");
  git("config","filter.untrusted.clean","echo invoked >> .git/filter-ran; cat");
  const file=path.join(repo,"sample.txt");
  writeFileSync(file,"bad text\n"); // Same size forces Git to examine the contents.
  utimesSync(file,1500000000,1500000000);
  await assert.rejects(candidateRoundtrip({packet,request}),/Unsupported source Git configuration/);
  assert.equal(existsSync(marker),false);
  assert.deepEqual(readdirSync(request.invocationPolicy.directory),[]);
  assert.deepEqual(source.requests,[]);
  git("status","--porcelain=v1","--untracked-files=normal");
  assert.ok(existsSync(marker),"the unguarded Git status control exercised the clean filter");
});

test("a candidate requires the selected package capability, exact effect ceiling, purpose and reviewed source",async t=>{
  const {request,source,accept}=await fixture(t), packet=accept();
  for(const changes of [
    {primary:"0xB"},{requiredCapabilities:["provider_facade","assignment_intake"]},
    {requiredCapabilities:["candidate_changes"]},{sourceSha256:"0".repeat(64)},
    {effectCeiling:["read","git","provider","network"]},
    {effectCeiling:[...request.packageProfile.effectCeiling,"dispatch"]},
  ]){
    const altered={...request,packageProfile:{...request.packageProfile,...changes}};
    assert.throws(()=>buildCandidateScope(altered),/package profile/);
    await assert.rejects(candidateRoundtrip({packet,request:altered}),/package profile/);
  }
  const swapped={...request,packageProfile:{...request.packageProfile,companions:["0xC"]}};
  assert.doesNotThrow(()=>buildCandidateScope(swapped));
  await assert.rejects(candidateRoundtrip({packet,request:swapped}),/offered scope/);

  // Copy only the manifest and its declared sources, then change a method's bytes.
  // The candidate, bundle and intake module pins all still match.
  const root=path.join(path.dirname(request.workspace.root),"copied-package");
  for(const file of ["package-files.json",...Object.keys(packageInventory().files)]){
    const target=path.join(root,file);
    mkdirSync(path.dirname(target),{recursive:true});
    copyFileSync(new URL("./"+file,import.meta.url),target);
  }
  const entry=pathToFileURL(path.join(root,"candidate.mjs"));
  const copy=await import(entry.href);
  assert.equal(copy.buildCandidateScope(request),buildCandidateScope(request));
  writeFileSync(path.join(root,"methods.md"),"Synthetic changed procedure.");
  assert.throws(()=>copy.buildCandidateScope(request),/package profile/);
  await assert.rejects(copy.candidateRoundtrip({packet,request}),/package profile/);
  assert.deepEqual(source.requests,[]);
  assert.deepEqual(readdirSync(request.invocationPolicy.directory),[]);
});

test('candidate preflight rejects hidden source edits without contacting a provider', async t => {
  const {request,source,accept,git,results} = await fixture(t);
  const packet = accept();
  const file = request.reads[0];
  git('update-index', '--assume-unchanged', file);
  writeFileSync(path.join(request.workspace.root, file), 'locally changed synthetic input');
  assert.equal(git('status', '--porcelain'), '');
  await assert.rejects(candidateRoundtrip({packet,request}), /index flag/i);
  assert.deepEqual(source.requests, []);
  assert.deepEqual(readdirSync(request.invocationPolicy.directory), []);
  assert.deepEqual(readdirSync(results), []);
});

test('candidate checks actual path spelling, existing destinations and symlink ancestors before dispatch', async t => {
  const {request,source,accept,results,git} = await fixture(t);
  const root = request.workspace.root;
  writeFileSync(path.join(root,'Existing.txt'),'outside read scope');
  mkdirSync(path.join(root,'..','external'));
  symlinkSync('../external', path.join(root,'Links'));
  git('add','Existing.txt','Links');
  git('-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','-m','path targets');
  request.workspace.revision = git('rev-parse','HEAD');
  writeFileSync(path.join(root,'.git','info','exclude'),'ignored.txt\n');
  writeFileSync(path.join(root,'ignored.txt'),'owner file');
  const targets = ['Existing.txt','Links/new.txt','ignored.txt'];
  if (existsSync(path.join(root,'existing.txt'))) {
    assert.equal(realpathSync(path.join(root,'links')), realpathSync(path.join(root,'..','external')));
    targets.push('existing.txt','links/new.txt');
  }
  for (const target of targets) {
    request.writes = [target];
    const packet = accept();
    await assert.rejects(candidateRoundtrip({packet,request}), /read scope|not a directory|already exists|spelling/);
  }
  assert.deepEqual(source.requests, []);
  assert.deepEqual(readdirSync(request.invocationPolicy.directory), []);
  assert.deepEqual(readdirSync(results), []);
});

test('candidate rechecks a new destination if an ignored file appears during the provider call', async t => {
  const {request,source,accept,results,answer} = await fixture(t);
  const root = request.workspace.root;
  writeFileSync(path.join(root,'.git','info','exclude'),'new.txt\n');
  request.writes = ['new.txt'];
  request.assertions = [{path:'sample.txt',contains:'old text',expected:true}];
  source.respond = (req,res) => {
    writeFileSync(path.join(root,'new.txt'),'owner file');
    answer(req,res,{edits:[{path:'new.txt',text:'proposed contents'}]});
  };
  const packet = accept();
  await assert.rejects(candidateRoundtrip({packet,request}), error => /already exists/.test(error.cause?.message));
  assert.equal(source.requests.length, 1);
  assert.deepEqual(readdirSync(results), []);
  assert.equal(readFileSync(path.join(root,'new.txt'),'utf8'), 'owner file');
});

for (const policy of ['resultPolicy','invocationPolicy']) {
  test('refuse in-checkout private storage before provider or claim: ' + policy, async t => {
    const {request,source,accept} = await fixture(t);
    const root = request.workspace.root;
    const upperRoot = path.join(path.dirname(root),'REPO');
    // On case-sensitive volumes use a symlink alias for the same physical tree.
    if (!existsSync(upperRoot)) symlinkSync(root,upperRoot);
    const relative = policy === 'resultPolicy' ? 'private-results' : '.git/private-ledger';
    const inside = path.join(root,relative);
    mkdirSync(inside,{mode:0o700});
    const destinations = [inside, path.join(upperRoot,relative)];
    for (const directory of destinations) {
      request[policy].directory = directory;
      await assert.rejects(candidateRoundtrip({request, packet:accept()}), /directory rejected/);
      assert.deepEqual(readdirSync(inside), []);
      assert.deepEqual(readdirSync(request.resultPolicy.directory), []);
      assert.deepEqual(readdirSync(request.invocationPolicy.directory), []);
      assert.deepEqual(source.requests, []);
    }
  });
}

test('candidate preserves the attempt on invalid temp and pins the external parent on retry', async t => {
  const {request,source,accept,answer} = await fixture(t);
  const packet = accept();
  const inside = path.join(request.workspace.root,'.tmp');
  const outside = path.join(path.dirname(request.workspace.root),'external-temp');
  mkdirSync(inside); mkdirSync(outside);
  const previous = process.env.TMPDIR;
  t.after(() => { if (previous === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = previous; });
  process.env.TMPDIR = inside;
  await assert.rejects(candidateRoundtrip({request,packet}), /outside the source checkout/);
  assert.deepEqual(source.requests, []);
  assert.deepEqual(readdirSync(request.invocationPolicy.directory), []);
  assert.deepEqual(readdirSync(inside), []);
  source.respond = (req,res) => {
    process.env.TMPDIR = inside;
    answer(req,res,{edits:[{path:'sample.txt',text:'new text'}]});
  };
  process.env.TMPDIR = outside;
  const receipt = await candidateRoundtrip({request,packet});
  assert.equal(receipt.review_status,'pending');
  assert.equal(source.requests.length,1);
  assert.deepEqual(readdirSync(inside), []);
  assert.deepEqual(readdirSync(outside), []);
});

for (const adapter of ['openai_chat','ollama_chat']) test(adapter+' admits only its canonical route and bounded token budget',async t=>{
  const {request,source,accept,results}=await fixture(t);
  request.provider.adapter=adapter;
  const route=adapter==='ollama_chat'?'/api/chat':'/v1/chat/completions';
  const {origin,port}=new URL(request.provider.endpoint);
  const valid=origin+route;
  for(const endpoint of [valid+'?',valid+'#',valid+'?query',origin+'/prefix'+route,
    valid.replace('//','//u:p@'),valid.replace('127.0.0.1','localhost'),valid.replace('127.0.0.1','[2001:db8::1]'),
    valid.replace(':'+port,' :'+port),valid.replace(':'+port,':0'+port),valid.replace(':'+port,':80'),valid.replace(':'+port,':10080')]){
    assert.throws(()=>accept({...request,provider:{...request.provider,endpoint}}),undefined,endpoint);
  }
  for(const host of ['http://[::1]','http://127.0.0.1'])assert.doesNotThrow(()=>accept({...request,provider:{...request.provider,endpoint:host+route}}));
  request.provider.endpoint=valid;
  for(const tokens of [0,4097])assert.throws(()=>accept({...request,limits:{...request.limits,tokens}}),/budget/);
  assert.deepEqual(source.requests,[]);
  assert.deepEqual(readdirSync(request.invocationPolicy.directory),[]);
  assert.deepEqual(readdirSync(results),[]);
  for(const tokens of [1,4095,4096]){
    const r={...request,limits:{...request.limits,tokens}};
    const receipt=await candidateRoundtrip({packet:accept(r),request:r});
    assert.equal(receipt.review_status,'pending');
    const {url,body}=source.requests.at(-1);
    assert.equal(url,route);
    assert.equal(adapter==='ollama_chat'?body.options.num_predict:body.max_tokens,tokens);
  }
});

for (const adapter of ['openai_chat','ollama_chat']) {
  test(adapter+' checks serialized request size before claiming', async t => {
    const {request,source,accept,results} = await fixture(t);
    request.provider.adapter = adapter;
    if (adapter === 'ollama_chat') request.provider.endpoint = request.provider.endpoint.replace('/v1/chat/completions','/api/chat');
    // Measure the actual protocol body with the same accepted source and task.
    await candidateRoundtrip({packet:accept(),request});
    const size = Buffer.byteLength(JSON.stringify(source.requests[0].body));
    const ledger = readdirSync(request.invocationPolicy.directory).sort();
    const artifacts = readdirSync(results).sort();
    for (const contextBytes of [128,size-1]) {
      request.limits.contextBytes = contextBytes;
      const packet = accept();
      await assert.rejects(candidateRoundtrip({packet,request}),/context budget/);
      assert.deepEqual(readdirSync(request.invocationPolicy.directory).sort(),ledger);
      assert.deepEqual(readdirSync(results).sort(),artifacts);
      assert.equal(source.requests.length,1);
    }
    request.limits.contextBytes = size;
    await candidateRoundtrip({packet:accept(),request});
    assert.equal(source.requests.length,2);
    assert.deepEqual(source.requests[1].body,source.requests[0].body);
  });
}
