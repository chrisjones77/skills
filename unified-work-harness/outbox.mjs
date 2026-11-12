// Queue-transaction event contract. No recorder import, I/O delivery or lifecycle authority.
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const bytes=e=>JSON.stringify(canonical(e))+'\n';
const commands=['orient','build','maintain','diagnose','investigate','record','communicate','design','represent','prioritize','teach','verify','inspect','sustain','coordinate','envision'];
const label=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(x);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x);
export const outboxRevision=()=>sha(Buffer.concat([readFileSync(new URL('./queue.mjs',import.meta.url)),readFileSync(new URL(import.meta.url))]));
const has=db=>Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recorder_identity'").get());

export function validateRecording(recording) {
  if(recording===undefined)return;
  if(!recording||Object.keys(recording).join()!=='mode'||recording.mode!=='transactional-outbox-v1')throw Error('Explicit transactional-outbox-v1 recording policy required');
}
export function initializeOutbox(db,recording,jobs) {
  validateRecording(recording);
  if(recording===undefined)return;
  db.exec(`CREATE TABLE recorder_identity (instance TEXT NOT NULL, revision TEXT NOT NULL, sequence INTEGER NOT NULL);
    CREATE TABLE recorder_sources (digest TEXT PRIMARY KEY, work_id TEXT NOT NULL, purpose TEXT NOT NULL);
    CREATE TABLE recorder_outbox (sequence INTEGER PRIMARY KEY, event_id TEXT UNIQUE NOT NULL, body TEXT NOT NULL, sha256 TEXT NOT NULL, acknowledgement TEXT);`);
  db.prepare('INSERT INTO recorder_identity VALUES (?,?,0)').run(randomUUID(),outboxRevision());
  for(const {offer} of jobs){
    if(!hex(offer.digest)||!label(offer.work_id)||!/^0x[1-9A-F]$/.test(offer.engineering_purpose))throw Error('Queue source cannot map to the recorder event contract');
    db.prepare('INSERT INTO recorder_sources VALUES (?,?,?)').run(offer.digest,offer.work_id,offer.engineering_purpose);
  }
}

export function recordTransition(db,assignmentDigest,kind,state,{reason=null,evidence=null,phase='queue'}={}) {
  if(!has(db))return;
  const identity=db.prepare('SELECT * FROM recorder_identity').get();
  if(identity.revision!==outboxRevision())throw Error('Outbox producer source changed; review a new queue before further transitions');
  const source=db.prepare('SELECT * FROM recorder_sources WHERE digest=?').get(assignmentDigest);
  const allowed=['offer_recorded','recipient_accepted','reservation_recorded','execution_started','execution_failed','result_received','review_recorded','stop_recorded','reconciliation_recorded'];
  if(!source||!allowed.includes(kind)||!label(state)||!label(phase)||(reason!==null&&!label(reason))||(evidence!==null&&!hex(evidence))||!Number.isSafeInteger(identity.sequence+1))throw Error('Unrepresentable queue observation');
  const e={schema:'work-recorder.event.v1',id:randomUUID(),producer:{name:'uwh',instance:identity.instance,revision:identity.revision},sequence:identity.sequence+1,observed_at:new Date().toISOString(),task:{id:source.work_id,assignment_digest:assignmentDigest,attempt:null},purpose:{code:source.purpose,command:commands[parseInt(source.purpose.slice(2),16)]},kind,observation:'producer_declared',evidence:evidence?[{ref:'record:queue-evidence',sha256:evidence}]:[],detail:{state,reason,phase},corrects:null};
  const body=bytes(e);
  db.prepare('INSERT INTO recorder_outbox VALUES (?,?,?,?,NULL)').run(e.sequence,e.id,body,sha(body));
  db.prepare('UPDATE recorder_identity SET sequence=?').run(e.sequence);
}

function checkedRows(db) {
  if(!has(db))throw Error('Queue has no transactional outbox; no automatic migration');
  const identity=db.prepare('SELECT * FROM recorder_identity').get();
  const rows=db.prepare('SELECT * FROM recorder_outbox ORDER BY sequence').all();
  if(!uuid(identity.instance)||!hex(identity.revision)||!Number.isSafeInteger(identity.sequence)||identity.sequence<0||rows.length!==identity.sequence)throw Error('Outbox sequence history unavailable');
  rows.forEach((r,i)=>{
    const e=JSON.parse(r.body);
    if(r.sequence!==i+1||e.sequence!==r.sequence||!uuid(r.event_id)||e.id!==r.event_id||e.schema!=='work-recorder.event.v1'||e.producer?.instance!==identity.instance||e.producer?.revision!==identity.revision||bytes(e)!==r.body||sha(r.body)!==r.sha256)throw Error('Outbox event identity or bytes changed');
  });
  return rows;
}
export function pendingOutbox(db,limit) {
  if(!Number.isSafeInteger(limit)||limit<1||limit>1000)throw Error('Outbox page limit must be 1..1000');
  return checkedRows(db).filter(r=>r.acknowledgement===null).slice(0,limit).map(r=>({event:JSON.parse(r.body),sha256:r.sha256}));
}
export function acknowledgeOutbox(db,{eventId,eventSha256,receipt}) {
  const row=checkedRows(db).find(r=>r.event_id===eventId);
  if(!row||!hex(eventSha256)||row.sha256!==eventSha256||!receipt||Object.keys(receipt).sort().join()!=='commit,duplicate,event_id,remote_persistence,schema,sha256,state'||receipt.schema!=='work-recorder.receipt.v1'||receipt.event_id!==eventId||receipt.sha256!==eventSha256||receipt.remote_persistence!=='unverified'||typeof receipt.duplicate!=='boolean'||!['saved_locally','committed'].includes(receipt.state)||(receipt.state==='saved_locally'?receipt.commit!==null:(typeof receipt.commit!=='string'||!/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(receipt.commit))))throw Error('Recorder acknowledgement differs from the exact outbox event');
  const already=row.acknowledgement!==null;
  if(!already)db.prepare('UPDATE recorder_outbox SET acknowledgement=? WHERE event_id=?').run(JSON.stringify(receipt),eventId);
  return {event_id:eventId,already_acknowledged:already,execution_authorized:false};
}
