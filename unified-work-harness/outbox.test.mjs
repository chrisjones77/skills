import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createQueue,inspectQueue,readAttended,respondAttended,stopQueue,readPendingEvents,acknowledgeEvent} from './queue.mjs';
import {offerCoordination,inspectCoordination} from './coordination.mjs';
import {reviewIntake} from './intake.mjs';

function fixture(t,recording={mode:'transactional-outbox-v1'}) {
  const parent=realpathSync(mkdtempSync(path.join(tmpdir(),'uwh-outbox-test-')));
  t.after(()=>rmSync(parent,{recursive:true,force:true}));
  const root=path.join(parent,'source'),directory=path.join(parent,'queue');
  mkdirSync(root,{mode:0o700});mkdirSync(directory,{mode:0o700});
  const intake={outcome:'Inspect synthetic label status.',exclusions:['Publishing'],assignee:{kind:'human',id:'analyst'},accountableHuman:'owner',authority:{allowed:['inspect'],prohibited:['publish']},dataClass:'public',resources:{effortMinutes:10,deadline:'none',dependencies:[],reviewerAvailability:'available'},acceptance:{checks:['Compare status text'],reviewer:'reviewer'},escalation:{stopConditions:['Unknown meaning'],contact:'owner',mayPause:true},concerns:[]};
  const review=reviewIntake(JSON.stringify(intake),{by:'reviewer',disposition:'clear',authority:'confirmed',scope:'consistent',concerns:'clear',availableMinutes:20,reviewerAvailable:true,evidenceRef:'synthetic-private-review',reviewedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()});
  const record=offerCoordination({intake,review,workspace:{root,identity:root+'#synthetic',revision:'a'.repeat(40),status_digest:'b'.repeat(64)},id:'inspect-label',purpose:'0xB'});
  const digest=inspectCoordination(record).assignmentDigest;
  const config={goal:{objective:intake.outcome,owner:'owner',stopConditions:['Unknown meaning'],tasks:[{id:'inspect-label',outcome:intake.outcome}],selectedIds:['inspect-label']},packets:[record],deadline:new Date(Date.now()+60000).toISOString(),...(recording===null?{}:{recording})};
  return {parent,directory,digest,config};
}
const step=(f,action,by)=>respondAttended(f.directory,{assignmentDigest:f.digest,revision:readAttended(f.directory,f.digest).revision,action,by,note:'Synthetic response',evidence:'synthetic-private-evidence'});
const receipt=row=>({schema:'work-recorder.receipt.v1',event_id:row.event.id,sha256:row.sha256,state:'saved_locally',commit:null,remote_persistence:'unverified',duplicate:false});
function sql(f,command){const db=new DatabaseSync(path.join(f.directory,'queue.sqlite'));try{db.exec(command);}finally{db.close();}}

test('outbox is explicit and invalid policies fail before queue storage',t=>{
  const f=fixture(t);assert.throws(()=>createQueue(f.directory,{...f.config,recording:{mode:'unknown'}}),/recording policy/);assert.deepEqual(readdirSync(f.directory),[]);
  const legacy=fixture(t,null);createQueue(legacy.directory,legacy.config);assert.throws(()=>readPendingEvents(legacy.directory),/no transactional outbox/);step(legacy,'accept','analyst');assert.equal(inspectQueue(legacy.directory).jobs[0].state,'attended_accepted');
});
test('attended transitions and source observations share one sequence and transaction',t=>{
  const f=fixture(t);createQueue(f.directory,f.config);
  for(const [action,by] of [['accept','analyst'],['resume','analyst'],['submit','analyst'],['approve','reviewer'],['close','reviewer']])step(f,action,by);
  const events=readPendingEvents(f.directory).map(r=>r.event);
  assert.deepEqual(events.map(e=>e.kind),['offer_recorded','recipient_accepted','execution_started','result_received','review_recorded','review_recorded']);
  assert.deepEqual(events.map(e=>e.sequence),[1,2,3,4,5,6]);
  assert.equal(new Set(events.map(e=>e.producer.instance)).size,1);
  assert.ok(events.every(e=>e.task.id==='inspect-label'&&e.task.assignment_digest===f.digest&&e.task.attempt===null));
  assert.equal(inspectQueue(f.directory).jobs[0].state,'reviewed');
  assert.ok(!JSON.stringify(events).includes('synthetic-private'));
});
test('failed event insertion rolls back the state transition and sequence',t=>{
  const f=fixture(t);createQueue(f.directory,f.config);const before=inspectQueue(f.directory),pending=readPendingEvents(f.directory);
  sql(f,"CREATE TRIGGER fail_event BEFORE INSERT ON recorder_outbox BEGIN SELECT RAISE(ABORT,'synthetic-outbox-failure'); END;");
  assert.throws(()=>step(f,'accept','analyst'),/synthetic-outbox-failure/);
  assert.deepEqual(inspectQueue(f.directory),before);assert.deepEqual(readPendingEvents(f.directory),pending);
  sql(f,'DROP TRIGGER fail_event');step(f,'accept','analyst');assert.equal(readPendingEvents(f.directory)[1].event.sequence,2);
});
test('process loss before SQLite commit preserves neither transition nor event',t=>{
  const f=fixture(t);createQueue(f.directory,f.config);const before=inspectQueue(f.directory),pending=readPendingEvents(f.directory);
  const code=`import {DatabaseSync} from 'node:sqlite';import {readAttended,respondAttended} from ${JSON.stringify(new URL('./queue.mjs',import.meta.url).href)};const original=DatabaseSync.prototype.exec;DatabaseSync.prototype.exec=function(sql){if(sql==='COMMIT')process.kill(process.pid,'SIGKILL');return original.call(this,sql);};const d=process.argv[1],digest=process.argv[2];respondAttended(d,{assignmentDigest:digest,revision:readAttended(d,digest).revision,action:'accept',by:'analyst',note:'synthetic'});`;
  // ReadAttended also commits a read transaction: do its read before installing the kill boundary.
  const fixed=code.replace("const original=DatabaseSync.prototype.exec;", "const revision=readAttended(process.argv[1],process.argv[2]).revision;const original=DatabaseSync.prototype.exec;").replace('revision:readAttended(d,digest).revision','revision');
  assert.throws(()=>execFileSync(process.execPath,['--input-type=module','-e',fixed,f.directory,f.digest],{stdio:'pipe'}));
  sql(f,'SELECT count(*) FROM jobs'); // Authorized owner opens the original database for hot-journal recovery.
  assert.deepEqual(inspectQueue(f.directory),before);assert.deepEqual(readPendingEvents(f.directory),pending);
  step(f,'accept','analyst');assert.equal(readPendingEvents(f.directory).length,2);
});
test('restart after state commit retains the exact pending event for redelivery',t=>{
  const f=fixture(t);createQueue(f.directory,f.config);
  const code=`import {readAttended,respondAttended} from ${JSON.stringify(new URL('./queue.mjs',import.meta.url).href)};const d=process.argv[1],digest=process.argv[2];respondAttended(d,{assignmentDigest:digest,revision:readAttended(d,digest).revision,action:'accept',by:'analyst',note:'synthetic'});process.kill(process.pid,'SIGKILL');`;
  assert.throws(()=>execFileSync(process.execPath,['--input-type=module','-e',code,f.directory,f.digest],{stdio:'pipe'}));
  assert.equal(inspectQueue(f.directory).jobs[0].state,'attended_accepted');
  const pending=readPendingEvents(f.directory);assert.equal(pending.length,2);assert.deepEqual(readPendingEvents(f.directory),pending);
});
test('acknowledgement is exact and idempotent and never advances work',t=>{
  const f=fixture(t);createQueue(f.directory,f.config);const row=readPendingEvents(f.directory)[0],before=inspectQueue(f.directory);
  const ack={eventId:row.event.id,eventSha256:row.sha256,receipt:receipt(row)};
  for(const changed of [{...ack,eventSha256:'0'.repeat(64)},{...ack,receipt:{...ack.receipt,event_id:'unrelated'}},{...ack,receipt:{...ack.receipt,state:'committed',commit:null}},{...ack,receipt:{...ack.receipt,state:'committed',commit:['a'.repeat(40)]}}])assert.throws(()=>acknowledgeEvent(f.directory,changed),/acknowledgement/);
  assert.equal(readPendingEvents(f.directory).length,1);
  assert.equal(acknowledgeEvent(f.directory,ack).already_acknowledged,false);
  assert.equal(acknowledgeEvent(f.directory,{...ack,receipt:{...ack.receipt,duplicate:true}}).already_acknowledged,true);
  assert.equal(readPendingEvents(f.directory).length,0);assert.deepEqual(inspectQueue(f.directory),before);
});
test('failed acknowledgement remains pending and corruption is visible',t=>{
  const f=fixture(t);createQueue(f.directory,f.config);const row=readPendingEvents(f.directory)[0];
  sql(f,"CREATE TRIGGER fail_ack BEFORE UPDATE ON recorder_outbox BEGIN SELECT RAISE(ABORT,'synthetic-ack-failure'); END;");
  assert.throws(()=>acknowledgeEvent(f.directory,{eventId:row.event.id,eventSha256:row.sha256,receipt:receipt(row)}),/synthetic-ack-failure/);assert.deepEqual(readPendingEvents(f.directory),[row]);
  sql(f,"DROP TRIGGER fail_ack; UPDATE recorder_outbox SET body='{}' WHERE sequence=1;");assert.throws(()=>readPendingEvents(f.directory),/identity|changed|schema/);
});
test('stopping and paging retain recording without dispatching work',t=>{
  const f=fixture(t);createQueue(f.directory,f.config);stopQueue(f.directory);const events=readPendingEvents(f.directory);
  assert.deepEqual(events.map(r=>r.event.kind),['offer_recorded','stop_recorded']);assert.equal(events[1].event.detail.state,'cancelled');assert.equal(readPendingEvents(f.directory,{limit:1}).length,1);assert.throws(()=>readPendingEvents(f.directory,{limit:0}));
  assert.equal(inspectQueue(f.directory).stopped,1);assert.equal(inspectQueue(f.directory).jobs[0].state,'cancelled');
});
