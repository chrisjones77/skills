// Synthetic producers only. Writes a new owner-only ledger; never pushes or calls a model.
import {mkdirSync, realpathSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initializeLedger,makeEvent,appendEvent,commitLedger,inspectLedger} from '../recorder.mjs';
import {qvchProfileEvent,workerFailureEvent} from '../adapters.mjs';
import {exportMonitor} from '../monitor.mjs';

export function demo(output) {
  if(!path.isAbsolute(output)) throw Error('Choose an absolute, new output directory');
  mkdirSync(output,{mode:0o700});output=realpathSync(output);
  const ledger=path.join(output,'ledger');mkdirSync(ledger,{mode:0o700});initializeLedger(ledger);
  const q={name:'qvch',instance:randomUUID(),revision:'synthetic-v1'},u={name:'uwh',instance:randomUUID(),revision:'synthetic-v1'};
  const task={id:'R-042',assignment_digest:'a'.repeat(64),attempt:'attempt-1'};
  let time=0;const stamp=()=>new Date(Date.UTC(2026,10,5,12,0,0,time++*100)).toISOString();
  appendEvent(ledger,makeEvent({producer:q,sequence:1,task,purpose:'0x0',kind:'orientation_recorded',state:'recorded',observation:'synthetic',observed_at:stamp()}));
  appendEvent(ledger,qvchProfileEvent({status:'resolved_for_review',lenses:[{code:'0x7'}],sourceSha256:'b'.repeat(64)},{producer:q,sequence:2,task,observation:'synthetic',observed_at:stamp()}));
  ['offer_recorded','recipient_accepted','attempt_claimed','execution_started','result_received'].forEach((kind,i)=>appendEvent(ledger,makeEvent({producer:u,sequence:i+1,task,purpose:'0x7',kind,state:kind==='result_received'?'review_pending':'recorded',observation:'synthetic',observed_at:stamp()})));
  commitLedger(ledger);
  // Missing sequence 6 is intentionally unknown, not an invented success/failure.
  appendEvent(ledger,makeEvent({producer:u,sequence:7,task,purpose:'0xB',kind:'review_recorded',state:'review_pending',observation:'synthetic',observed_at:stamp()}));
  appendEvent(ledger,workerFailureEvent({code:'synthetic_worker_exit',phase:'execution'},{producer:{...u,instance:randomUUID()},sequence:1,task:{...task,id:'R-043',attempt:'attempt-2'},purpose:'0x4',observation:'synthetic',observed_at:stamp()}));
  const monitor=exportMonitor(ledger,path.join(output,'monitor.html'));
  return {ledger,monitor,event_count:inspectLedger(ledger).events.length,synthetic:true,execution_authorized:false};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3)throw Error('Usage: node examples/demo.mjs /absolute/new-output-directory');
  console.log(JSON.stringify(demo(process.argv[2]),null,2));
}
