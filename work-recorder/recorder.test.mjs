import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,rmSync,writeFileSync,readFileSync,readdirSync,existsSync,symlinkSync,chmodSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {initializeLedger,makeEvent,validateEvent,eventBytes,appendEvent,readEvents,inspectLedger,commitLedger,persistence} from './recorder.mjs';
import {qvchProfileEvent,uwhReceiptEvent,workerFailureEvent,uwhCoordinationEvent} from './adapters.mjs';
import {exportMonitor,renderMonitor} from './monitor.mjs';
import {demo} from './examples/demo.mjs';
function fixture(t){const parent=realpathSync(mkdtempSync(path.join(tmpdir(),'work-recorder-test-')));t.after(()=>rmSync(parent,{recursive:true,force:true}));const root=path.join(parent,'ledger');mkdirSync(root,{mode:0o700});initializeLedger(root);return {parent,root};}
const producer=()=>({name:'uwh',instance:randomUUID(),revision:'synthetic-v1'});
const event=(p=producer(),sequence=1)=>makeEvent({producer:p,sequence,task:{id:'R-042',assignment_digest:null,attempt:null},kind:'execution_started',state:'active',observation:'synthetic'});
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const tree=root=>readdirSync(root,{recursive:true}).filter(x=>!x.startsWith('.git')).sort().map(x=>{try{return [x,readFileSync(path.join(root,x),'utf8')];}catch{return [x,'dir'];}});

test('events are immutable across persistence receipts and duplicate delivery',t=>{const {root}=fixture(t),e=event(),bytes=eventBytes(e);const saved=appendEvent(root,e);assert.equal(saved.state,'saved_locally');assert.equal(appendEvent(root,e).duplicate,true);const committed=commitLedger(root);assert.equal(committed[0].state,'committed');assert.equal(persistence(root,e.id).remote_persistence,'unverified');assert.equal(eventBytes(readEvents(root)[0]),bytes);const altered={...e,detail:{...e.detail,state:'failed'}};assert.throws(()=>appendEvent(root,altered),/content conflict/);assert.equal(readEvents(root).length,1);});
test('same producer sequence conflicts; restart gets a distinct instance',t=>{const {root}=fixture(t),p=producer();appendEvent(root,event(p));assert.throws(()=>appendEvent(root,event(p)),/sequence/);appendEvent(root,event({...p,instance:randomUUID()}));assert.equal(inspectLedger(root).gaps.length,0);assert.equal(readEvents(root).length,2);});
test('out-of-order delivery reconciles a gap without false cross-producer ordering',t=>{const {root}=fixture(t),p=producer();appendEvent(root,event(p,3));appendEvent(root,event(producer(),1));assert.deepEqual(inspectLedger(root).gaps.map(g=>[g.from,g.to]),[[1,2]]);appendEvent(root,event(p,1));appendEvent(root,event(p,2));assert.equal(inspectLedger(root).gaps.length,0);assert.equal(inspectLedger(root).ordering,'observation-time-display-only');});
test('producer revision change requires a new instance',t=>{const {root}=fixture(t),p=producer();appendEvent(root,event(p));assert.throws(()=>appendEvent(root,event({...p,revision:'changed'},2)),/revision conflict/);});
test('strict envelope rejects purpose mismatch, raw fields, invalid dates and paths',()=>{const e=event();for(const x of [{...e,raw_prompt:'secret'},{...e,purpose:{code:'0xC',command:'build'}},{...e,observed_at:'2026-02-30T00:00:00.000Z'},{...e,evidence:[{ref:'artifact:../../secret',sha256:'a'.repeat(64)}]},{...e,id:'../../escape'}])assert.throws(()=>validateEvent(x));});
test('corrections preserve the original and reference another event',t=>{const {root}=fixture(t),e=event();appendEvent(root,e);const c=makeEvent({producer:e.producer,sequence:2,task:e.task,kind:'correction_recorded',corrects:e.id,state:'unknown',observation:'synthetic'});appendEvent(root,c);assert.equal(readEvents(root).length,2);assert.ok(readEvents(root).some(x=>x.corrects===e.id));});
test('writer failure and lock preserve events for explicit retry/reconciliation',t=>{const {root}=fixture(t),e=event();mkdirSync(path.join(root,'.git','recorder.lock'));assert.throws(()=>appendEvent(root,e),/locked/);assert.equal(readEvents(root).length,0);rmdirSync(path.join(root,'.git','recorder.lock'));appendEvent(root,e);mkdirSync(path.join(root,'.git','recorder.lock'));assert.throws(()=>commitLedger(root),/locked/);rmdirSync(path.join(root,'.git','recorder.lock'));assert.equal(appendEvent(root,e).duplicate,true);assert.equal(commitLedger(root)[0].state,'committed');});
test('restart reads Git history and preserves the last saved local event',t=>{const {root}=fixture(t),p=producer();appendEvent(root,event(p));commitLedger(root);const later=event(p,2);appendEvent(root,later);const code=`import {inspectLedger} from ${JSON.stringify(new URL('./recorder.mjs',import.meta.url).href)};console.log(JSON.stringify(inspectLedger(process.argv[1])));`;const view=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code,root],{encoding:'utf8'}));assert.equal(view.events.length,2);assert.equal(view.events.find(x=>x.event.id===later.id).persistence.state,'saved_locally');});
test('committed event alteration is refused without overwriting history',t=>{const {root}=fixture(t),e=event();appendEvent(root,e);commitLedger(root);writeFileSync(path.join(root,'events',e.id+'.json'),eventBytes({...e,detail:{...e.detail,state:'changed'}}));assert.throws(()=>inspectLedger(root),/differs/);assert.throws(()=>commitLedger(root),/Unexpected ledger change/);});
test('pre-existing staged or unrelated files prevent committing',t=>{const {root}=fixture(t);appendEvent(root,event());writeFileSync(path.join(root,'unrelated'),'private');assert.throws(()=>commitLedger(root),/Unexpected ledger change/);git(root,'add','unrelated');assert.throws(()=>commitLedger(root),/staged/);});
test('symlink event and unsafe initialization are refused',t=>{const {root,parent}=fixture(t),e=event();const external=path.join(parent,'external');writeFileSync(external,eventBytes(e));symlinkSync(external,path.join(root,'events',e.id+'.json'));assert.throws(()=>readEvents(root),/Unsafe/);assert.throws(()=>initializeLedger(root),/empty/);const unsafe=path.join(parent,'unsafe');mkdirSync(unsafe,{mode:0o755});chmodSync(unsafe,0o755);assert.throws(()=>initializeLedger(unsafe),/owner-only/);});
test('adapters emit bounded observations without granting authority or leaking record text',()=>{const p=producer(),task={id:'R-042',assignment_digest:null,attempt:null},ctx={producer:p,sequence:1,task};const failure=workerFailureEvent({code:'worker_exit',phase:'execution'},ctx);assert.equal(failure.detail.reason,'worker_exit');assert.throws(()=>workerFailureEvent({code:'raw sensitive message with spaces',phase:'execution'},ctx));const receipt={schema_version:'unified.contract-executor-receipt.v6',work_id:'R-042',assignment_digest:'a'.repeat(64),review_status:'pending',private_response:'unoffered secret'};assert.ok(!eventBytes(uwhReceiptEvent(receipt,ctx)).includes('secret'));assert.equal(uwhReceiptEvent(receipt,ctx).detail.state,'review_pending');assert.throws(()=>qvchProfileEvent({status:'hold'},ctx));assert.throws(()=>uwhCoordinationEvent({},'recipient_accepted',ctx));});
test('monitor replay is read-only, offline, and exports with explicit non-overwrite',t=>{const {root,parent}=fixture(t);appendEvent(root,event());commitLedger(root);const before=tree(root),head=git(root,'rev-parse','HEAD'),view=inspectLedger(root);const output=path.join(parent,'monitor.html');exportMonitor(root,output);const html=readFileSync(output,'utf8');new vm.Script(html.match(/<script>(.*?)<\/script>/s)[1]);assert.ok(html.includes('connect-src \'none\''));assert.ok(html.includes('aria-live="polite"'));assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|eval\s*\(/.test(html));assert.throws(()=>exportMonitor(root,output),/EEXIST/);assert.deepEqual(tree(root),before);assert.equal(git(root,'rev-parse','HEAD'),head);assert.equal(view.execution_authorized,false);assert.deepEqual(JSON.parse(html.match(/<script id="recorded-view" type="application\/json">(.*?)<\/script>/s)[1]),view);});
test('synthetic end-to-end demo has two producers, gaps, pending review and uncommitted progress',t=>{const {parent}=fixture(t),result=demo(path.join(parent,'demo'));const view=inspectLedger(result.ledger);assert.ok(existsSync(result.monitor));assert.equal(view.events.length,9);assert.ok(view.gaps.length===1);assert.ok(view.events.some(x=>x.event.detail.state==='review_pending'));assert.ok(view.events.some(x=>x.persistence.state==='saved_locally'));assert.ok(view.events.every(x=>x.event.observation==='synthetic'));});

 test('deleted committed event remains an explicit reconciliation failure',t=>{const {root}=fixture(t),e=event();appendEvent(root,e);commitLedger(root);rmSync(path.join(root,'events',e.id+'.json'));assert.throws(()=>inspectLedger(root),/Committed event missing/);});

test('producer crash before acknowledgement is reconciled by identical redelivery',t=>{const {root}=fixture(t),e=event();const code=`import {appendEvent} from ${JSON.stringify(new URL('./recorder.mjs',import.meta.url).href)};appendEvent(process.argv[1],JSON.parse(process.argv[2]));process.kill(process.pid,'SIGKILL');`;assert.throws(()=>execFileSync(process.execPath,['--input-type=module','-e',code,root,JSON.stringify(e)],{stdio:'pipe'}));assert.equal(readEvents(root).length,1);assert.equal(appendEvent(root,e).duplicate,true);assert.equal(commitLedger(root)[0].state,'committed');});

test('receipt rejects noncanonical bytes and mismatched identity before and after commit',t=>{
  const {root}=fixture(t),e=event();appendEvent(root,e);
  const file=path.join(root,'events',e.id+'.json'),bytes=eventBytes(e);
  assert.equal(persistence(root,e.id).state,'saved_locally');
  writeFileSync(file,bytes+'\n');assert.throws(()=>persistence(root,e.id),/canonical|identity|bytes/i);
  writeFileSync(file,eventBytes({...e,id:randomUUID()}));assert.throws(()=>persistence(root,e.id),/identity/i);
  writeFileSync(file,bytes);const committed=commitLedger(root)[0];
  writeFileSync(file,bytes+'\n');assert.throws(()=>persistence(root,e.id),/canonical|identity|bytes/i);
  writeFileSync(file,eventBytes({...e,id:randomUUID()}));assert.throws(()=>persistence(root,e.id),/identity/i);
  writeFileSync(file,bytes);assert.equal(persistence(root,e.id).commit,committed.commit);
  assert.equal(persistence(root,e.id).sha256,createHash('sha256').update(execFileSync('git',['show',committed.commit+':events/'+e.id+'.json'],{cwd:root})).digest('hex'));
});

test('corrupt Git history is an integrity failure across read and write entry points',t=>{
  const {root}=fixture(t),e=event();appendEvent(root,e);const receipt=commitLedger(root)[0];
  const object=path.join(root,'.git','objects',receipt.commit.slice(0,2),receipt.commit.slice(2)),bytes=readFileSync(object);
  rmSync(object);
  assert.throws(()=>persistence(root,e.id),/history|Git|integrity/i);
  assert.throws(()=>readEvents(root),/history|Git|integrity/i);
  assert.throws(()=>inspectLedger(root),/history|Git|integrity/i);
  assert.throws(()=>appendEvent(root,event(e.producer,2)),/history|Git|integrity/i);
  assert.throws(()=>commitLedger(root),/history|Git|integrity/i);
  assert.equal(readdirSync(path.join(root,'events')).length,1);
  writeFileSync(object,bytes);assert.equal(persistence(root,e.id).state,'committed');
  appendEvent(root,event(e.producer,2));assert.equal(commitLedger(root).length,2);
});

test('unavailable committed blob is not downgraded to a local save',t=>{
  const {root}=fixture(t),e=event();appendEvent(root,e);const receipt=commitLedger(root)[0];
  const blob=git(root,'rev-parse',receipt.commit+':events/'+e.id+'.json');
  const object=path.join(root,'.git','objects',blob.slice(0,2),blob.slice(2)),bytes=readFileSync(object);
  rmSync(object);assert.throws(()=>persistence(root,e.id),/Git|history|integrity/i);
  writeFileSync(object,bytes);assert.equal(persistence(root,e.id).state,'committed');
});

test('UWH receipt and coordination projections require matching task correlation',()=>{
  const task={id:'task-a',assignment_digest:null,attempt:null},ctx={producer:producer(),sequence:1,task};
  const receipt={schema_version:'unified.contract-executor-receipt.v6',work_id:'task-a',assignment_digest:'a'.repeat(64),review_status:'pending'};
  assert.equal(uwhReceiptEvent(receipt,ctx).task.id,receipt.work_id);
  assert.throws(()=>uwhReceiptEvent(receipt,{...ctx,task:{...task,id:'task-b'}}),/task|correlation/i);
  assert.throws(()=>uwhReceiptEvent({...receipt,work_id:undefined},ctx),/task|correlation/i);
  const record={schema_version:'attended-coordination.v1',packet:{status:'paused',work_contract:{disposition:'offered',review:{status:'pending'},assignments:[{work_id:'task-a',digest:'b'.repeat(64),engineering_purpose:'0xB'}]}}};
  assert.equal(uwhCoordinationEvent(record,'offer_recorded',ctx).task.id,'task-a');
  assert.throws(()=>uwhCoordinationEvent(record,'offer_recorded',{...ctx,task:{...task,id:'task-b'}}),/task|correlation/i);
  const wrongDigest={...ctx,task:{...task,assignment_digest:'c'.repeat(64)}};
  assert.throws(()=>uwhReceiptEvent(receipt,wrongDigest),/digest|correlation/i);
  assert.throws(()=>uwhCoordinationEvent(record,'offer_recorded',wrongDigest),/digest|correlation/i);
});

test('damaged existing references cannot masquerade as an unborn ledger',t=>{
  for(const mode of ['missing-reference','broken-reference','missing-tree']){
    const {root}=fixture(t),e=event();appendEvent(root,e);const receipt=commitLedger(root)[0];
    let file,bytes;
    if(mode==='missing-tree'){
      const object=git(root,'rev-parse',receipt.commit+'^{tree}');
      file=path.join(root,'.git','objects',object.slice(0,2),object.slice(2));bytes=readFileSync(file);rmSync(file);
    }else{
      const ref=git(root,'symbolic-ref','HEAD');file=path.join(root,'.git',ref);bytes=readFileSync(file);
      if(mode==='missing-reference')rmSync(file);else writeFileSync(file,'not-an-object-id\n');
    }
    assert.throws(()=>inspectLedger(root),/history|Git|integrity/i,mode);
    assert.throws(()=>appendEvent(root,event(e.producer,2)),/history|Git|integrity/i,mode);
    assert.equal(readdirSync(path.join(root,'events')).length,1);
    writeFileSync(file,bytes);assert.equal(persistence(root,e.id).state,'committed');
  }
});
