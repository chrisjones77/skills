// A required test must have run in its named file; a skipped or renamed control is not evidence.
import {run} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,rmSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {packageInventory} from '../unified-work-harness/package.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)), pkg=path.join(root,'unified-work-harness');
const mode=process.argv[2]??'suite';
assert.ok(['suite','worker'].includes(mode),'expected suite or worker');
const inventory=packageInventory(), rows=[];
function family(id,file,capabilities,control,...cases){rows.push({id,file:file+'.test.mjs',capabilities,control,cases});}
const codes=[301,302,303,307,308];
const prefix='OpenCode completion after a source read, upstream status ';
const windows=['v5 expires before launch','v5 expires after launch','v6 intake expires after launch'];
family('time.worker','integrated',[],prefix+200,...windows.map(s=>'OpenCode window: '+s));
family('transport.worker','integrated',['provider_facade'],prefix+200,...codes.map(n=>prefix+n),
  ...codes.map(n=>'OpenCode completion before a source read, upstream status '+n));
if (mode === 'worker') {
  family('worker.startup','integrated',[],prefix+200,
    ...['project configuration','project configuration directory','instructions','linked instructions','nested instructions','offered nested instructions','Unicode instruction alias','Unicode protected file alias','tracked Unicode protected alias','offered Unicode directory','colliding recursive Git directories'].map(s=>'OpenCode isolates '+s));
}
if(mode==='suite'){
  family('transport.discovery','roundtrip',[],'accepted Hypervisor contract reaches the bundled agent executor and returns evidence',
    ...['/v1/models','/api/version','/api/tags'].flatMap(route=>codes.map(n=>'discovery rejects '+n+' at '+route+' without contacting destination')));
  family('transport.direct','integrated',[],'IPv6 loopback with a path prefix completes the accepted v6 contract',
    ...codes.map(n=>'direct completion refuses redirect '+n),'relay admits only the scoped completion and closes after the worker exits',
    'ambiguous endpoints and non-loopback IPv6 fail before offer, provider contact or claim');
  family('identity.scope','roundtrip',['purpose_selection','embedded_source_binding','qvch_source_resolution','readonly_roundtrip'],
    'source-pinned profiles resolve only fixed dependencies and account for executor side effects',
    'CLI source receipt rejects an earlier pin after bundle bytes change','profile inspection preserves routing, unresolved capabilities and the effect ceiling without granting authority');
  family('identity.intake','intake',['assignment_intake'],'private review binds the exact intake and reviewer evidence before an offer',
    'a previously clear review expires at its exclusive UTC boundary','reject ambiguous intake bytes and malformed assessment records');
  family('queue.admission','queue',['bounded_dispatch','goal_pursuit'],'v6 queued dispatch rechecks the full package profile and reviewed intake',
    ...['v5','v6'].map(v=>v+' rejects substituted policies before reservation and accepts the original envelope'),
    ...['v5','v6'].map(v=>v+' matches the packet workspace and resume before charging'),
    ...['v5','v6'].flatMap(v=>['verifies the source before creating queue storage','refuses a relocated queue before reservation'].map(s=>v+' '+s)),
    'v5 self-review cannot enter a queue or advance an older queue',
    'provider refuses a queue copied into another selected workspace',
    'attended replies require the original queue location after restart',
    'explicit goal, accepted identity, ceiling, expiration and cancellation govern admission');
  family('storage.identity','integrated',[],'reviewed and accepted v6 produces a package-bound candidate receipt',
    'strict format checks the post-read answer with and without result capture',
    'direct v6 rejects FIFO and oversized assignments before effects and preserves the accepted attempt',
    ...[1,2,3,4,5,6].map(v=>'v'+v+' verifies each accepted scope field before effects'),
    'physical ancestry refuses an aliased private directory','v6 refuses a temporary parent inside the checkout before discovery or claim',
    'v6 refuses a replaced temp parent and leaves its contents alone during cleanup');
  family('attended.sequence','coordination',['human_hybrid_contracts','call_response'],'concern, alternate answer and transfer preserve attribution and require fresh acceptance',
    'attended lifecycle enforces the transition and actor table');
  family('time.lease','roundtrip',[],'equivalent endpoint URLs share a provider lease until release','concurrent stale lease recovery preserves the replacement owner');
  family('recovery.queue','queue',['sequential_queue'],'running work excludes a concurrent caller and review gates advancement after restart',
    'stop blocks both decisions on a pending provider receipt',
    ...['reserved','claimed','persisted','completed','write failure'].map(p=>'queue recovers worker loss at '+p),
    'a cleanup error preserves the reason the supervisor stopped work','mixed human, agent and hybrid work advances only on attended responses and review');
  family('candidate.integrity','candidate',['multiple_adapters','candidate_changes'],'both provider protocols produce a private candidate and preserve source; attempts cannot replay',
    ...['openai_chat','ollama_chat'].map(a=>a+' observes response limits, integrity and private evidence'),
    ...['openai_chat','ollama_chat'].map(a=>a+' admits only its canonical route and bounded token budget'),
    ...['openai_chat','ollama_chat'].map(a=>a+' checks serialized request size before claiming'),
    'defect reproduction safely returns a failing accepted data fixture','cancellation during a provider request blocks persistence and replay');
  family('package.methods','package-profile',['engineering_safety','fair_process','ai_lifecycle','professional_practice','coverage_review','issue_triage','advisory_workflow'],
    'manifest-only installation runs the documented offline walkthrough','all inventory entries resolve to inspected package bytes without conferring authority','changed guidance invalidates the accepted package pin');
  assert.deepEqual(rows.flatMap(r=>r.capabilities).sort(),inventory.capabilities.map(c=>c.name).sort(),'map each capability exactly once');
}
const capture=(file,args)=>execFileSync(file,args,{cwd:root,encoding:'utf8'}).trim();
const probe=mkdtempSync(path.join(tmpdir(),'uwh-case-'));
let filesystem;
try{writeFileSync(path.join(probe,'Probe'),'x',{flag:'wx'}); filesystem=existsSync(path.join(probe,'pROBE'))?'insensitive':'sensitive';}
finally{rmSync(probe,{recursive:true});}
const report={mode,commit:capture('git',['rev-parse','HEAD']),packageSha256:inventory.sourceSha256,node:process.version,git:capture('git',['--version']),platform:process.platform,filesystem,scenarios:rows,skipped:[],failures:[]};
if(process.env.UWH_EXPECT_FS && filesystem!==process.env.UWH_EXPECT_FS)report.failures.push('unexpected filesystem semantics');
if(mode==='worker'){
  process.env.UNIFIED_TEST_INSTALLED_OPENCODE='1';
  const binary=capture('which',['opencode']);
  report.worker={version:capture(binary,['--version']),sha256:createHash('sha256').update(readFileSync(binary)).digest('hex')};
  if(process.env.UWH_WORKER_VERSION && report.worker.version!==process.env.UWH_WORKER_VERSION)report.failures.push('wrong worker version');
}
const files=(mode==='worker'?['integrated.test.mjs']:readdirSync(pkg).filter(f=>f.endsWith('.test.mjs'))).map(f=>path.join(pkg,f));
const passed=new Set(), allowedSkips=['live local candidate edit through both accepted HTTP protocols','live local model processes an explicitly synthetic read-only assignment'];
for await(const {type,data} of run({files,concurrency:4,...(mode==='worker'?{testNamePatterns:[/^OpenCode (isolates |window: |completion (before|after) a source read,)/]}:{})})){
  if(!['test:pass','test:fail'].includes(type))continue;
  const key=path.basename(data.file??'')+':'+data.name;
  if(data.skip || data.todo){
    report.skipped.push(key);
    if(!allowedSkips.includes(data.name))report.failures.push('unexpected skip: '+key);
  }else if(type==='test:fail'){
    report.failures.push(key);
    console.error(key,data.details?.error?.cause??data.details?.error);
  }else passed.add(key);
}
for(const row of rows)for(const name of [row.control,...row.cases]){
  if(!passed.has(row.file+':'+name))report.failures.push('missing required pass: '+row.id+' / '+name);
}
report.passed=passed.size;
console.log(JSON.stringify(report,null,2));
if(report.failures.length){console.error(report.failures);process.exitCode=1;}
