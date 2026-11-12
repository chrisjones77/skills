// An explicit, source-pinned, offline handoff between independent packages.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,realpathSync,rmSync,rmdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createQueue,inspectQueue,readPendingEvents,acknowledgeEvent,respondAttended,readAttended} from '../unified-work-harness/queue.mjs';
import {offerCoordination,inspectCoordination} from '../unified-work-harness/coordination.mjs';
import {reviewIntake} from '../unified-work-harness/intake.mjs';

if(process.argv.length!==3)throw Error('Supply the canonical reviewed work-recorder directory');
const source=process.argv[2],pin=JSON.parse(readFileSync(new URL('./outbox-recorder-pin.json',import.meta.url)));
assert.equal(realpathSync(source),source);
for(const [file,digest] of Object.entries(pin.files))assert.equal(createHash('sha256').update(readFileSync(path.join(source,file))).digest('hex'),digest,'Recorder source pin changed; review before updating');
const recorder=await import(pathToFileURL(path.join(source,'recorder.mjs')));
const parent=realpathSync(mkdtempSync(path.join(tmpdir(),'uwh-outbox-recorder-')));
try{
  const dir=name=>{const d=path.join(parent,name);mkdirSync(d,{mode:0o700});return d;};
  const root=dir('source'),queue=dir('queue'),ledger=dir('ledger');recorder.initializeLedger(ledger);
  const intake={outcome:'Inspect synthetic label meaning.',exclusions:['Publication'],assignee:{kind:'human',id:'synthetic-analyst'},accountableHuman:'synthetic-owner',authority:{allowed:['inspect'],prohibited:['publish']},dataClass:'public',resources:{effortMinutes:10,deadline:'none',dependencies:[],reviewerAvailability:'available'},acceptance:{checks:['Compare status text'],reviewer:'synthetic-reviewer'},escalation:{stopConditions:['Unknown meaning'],contact:'synthetic-owner',mayPause:true},concerns:[]};
  const review=reviewIntake(JSON.stringify(intake),{by:'synthetic-reviewer',disposition:'clear',authority:'confirmed',scope:'consistent',concerns:'clear',availableMinutes:20,reviewerAvailable:true,evidenceRef:'synthetic-private-review',reviewedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()});
  const record=offerCoordination({intake,review,workspace:{root,identity:root+'#fixture',revision:'a'.repeat(40),status_digest:'b'.repeat(64)},id:'synthetic-label-review',purpose:'0xB'});
  const digest=inspectCoordination(record).assignmentDigest;
  createQueue(queue,{goal:{owner:intake.accountableHuman,objective:intake.outcome,stopConditions:['Unknown meaning'],tasks:[{id:record.packet.task_id,outcome:intake.outcome}],selectedIds:[record.packet.task_id]},packets:[record],deadline:new Date(Date.now()+60000).toISOString(),recording:{mode:'transactional-outbox-v1'}});
  const act=(action,by)=>respondAttended(queue,{assignmentDigest:digest,revision:readAttended(queue,digest).revision,action,by,note:'Synthetic fixture response',evidence:'synthetic-private-result'});
  act('accept','synthetic-analyst');act('resume','synthetic-analyst');
  const snapshot=inspectQueue(queue),first=readPendingEvents(queue)[0];
  const saved=recorder.appendEvent(ledger,first.event);assert.equal(saved.sha256,first.sha256);
  // Interruption after record save and before source acknowledgement: same pending UUID.
  assert.equal(readPendingEvents(queue)[0].event.id,first.event.id);
  const duplicate=recorder.appendEvent(ledger,readPendingEvents(queue)[0].event);assert.equal(duplicate.duplicate,true);
  acknowledgeEvent(queue,{eventId:first.event.id,eventSha256:first.sha256,receipt:duplicate});
  function deliver(){for(const row of readPendingEvents(queue)){const receipt=recorder.appendEvent(ledger,row.event);acknowledgeEvent(queue,{eventId:row.event.id,eventSha256:row.sha256,receipt});}}
  deliver();recorder.commitLedger(ledger);
  assert.equal(readPendingEvents(queue).length,0);assert.deepEqual(inspectQueue(queue),snapshot);
  act('submit','synthetic-analyst');act('approve','synthetic-reviewer');
  const pending=readPendingEvents(queue),reviewed=inspectQueue(queue);mkdirSync(path.join(ledger,'.git','recorder.lock'),{mode:0o700});
  assert.throws(()=>deliver(),/locked/);assert.deepEqual(readPendingEvents(queue),pending);assert.deepEqual(inspectQueue(queue),reviewed);
  rmdirSync(path.join(ledger,'.git','recorder.lock'));deliver();recorder.commitLedger(ledger);
  const events=recorder.readEvents(ledger);assert.equal(events.length,5);assert.equal(recorder.inspectLedger(ledger).gaps.length,0);assert.equal(readPendingEvents(queue).length,0);
  assert.deepEqual(events.map(e=>e.kind),['offer_recorded','recipient_accepted','execution_started','result_received','review_recorded']);
  assert.ok(!JSON.stringify(events).includes('synthetic-private'));
  console.log(JSON.stringify({result:'pass',recorder_revision:pin.revision,events:events.length,duplicate_redelivery:'pass',recorder_failure:'pending-preserved',source_state_unchanged_by_delivery:true,synthetic:true,execution_authorized:false},null,2));
}finally{rmSync(parent,{recursive:true,force:true});}
