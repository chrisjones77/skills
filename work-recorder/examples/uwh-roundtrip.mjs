// Explicit, pinned, offline compatibility demonstration. No model or provider calls.
import {readFileSync,mkdirSync,realpathSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {initializeLedger,appendEvent,commitLedger,inspectLedger} from '../recorder.mjs';
import {qvchProfileEvent,uwhCoordinationEvent} from '../adapters.mjs';
import {exportMonitor} from '../monitor.mjs';

export async function uwhDemo(source,output) {
  const pin=JSON.parse(readFileSync(new URL('./uwh-source-pin.json',import.meta.url),'utf8'));
  if(!path.isAbsolute(source) || realpathSync(source)!==source)throw Error('Choose a canonical, reviewed UWH package path');
  for(const [name,digest] of Object.entries(pin.files)){
    if(createHash('sha256').update(readFileSync(path.join(source,name))).digest('hex')!==digest)throw Error('UWH source differs from the compatibility pin; review before updating');
  }
  // Only these pinned, explicit modules are loaded. No supplied path enters an event.
  const {reviewIntake}=await import(pathToFileURL(path.join(source,'intake.mjs')));
  const {offerCoordination,inspectCoordination,respond}=await import(pathToFileURL(path.join(source,'coordination.mjs')));
  const {packageInventory,resolvePackageProfile}=await import(pathToFileURL(path.join(source,'package.mjs')));
  if(!path.isAbsolute(output))throw Error('Choose a new absolute output directory');
  mkdirSync(output,{mode:0o700});output=realpathSync(output);
  const ledger=path.join(output,'ledger');mkdirSync(ledger,{mode:0o700});initializeLedger(ledger);
  const profile=resolvePackageProfile({primary:'0xB',requiredCapabilities:['coverage_review'],requestedEffects:['read'],effectCeiling:['read'],sourceSha256:packageInventory().sourceSha256});
  const q={name:'qvch',instance:randomUUID(),revision:pin.revision},u={name:'uwh',instance:randomUUID(),revision:pin.revision};
  const task={id:'label-review',assignment_digest:null,attempt:null};
  appendEvent(ledger,qvchProfileEvent(profile,{producer:q,sequence:1,task,observation:'synthetic'}));
  const now=Date.now();
  const intake={outcome:'Compare synthetic shelf labels and report lost status text.',exclusions:['Changing the live display'],assignee:{kind:'human',id:'synthetic-analyst'},accountableHuman:'synthetic-coordinator',authority:{allowed:['inspect-labels'],prohibited:['publish']},dataClass:'public',resources:{effortMinutes:15,deadline:'none',dependencies:[],reviewerAvailability:'available'},acceptance:{checks:['Record the status text at each revision'],reviewer:'synthetic-checker'},escalation:{stopConditions:['Meaning is disputed'],contact:'synthetic-coordinator',mayPause:true},concerns:[]};
  const review=reviewIntake(JSON.stringify(intake),{by:'synthetic-checker',disposition:'clear',authority:'confirmed',scope:'consistent',concerns:'clear',availableMinutes:20,reviewerAvailable:true,evidenceRef:'fixture:review',reviewedAt:new Date(now).toISOString(),expiresAt:new Date(now+3600000).toISOString()});
  const workspace={root:'/synthetic/labels',identity:'/synthetic/labels#fixture',revision:'0'.repeat(40),status_digest:'0'.repeat(64)};
  let record=offerCoordination({intake,review,workspace,id:task.id,purpose:'0xB'}),seq=1;
  const observe=kind=>{inspectCoordination(record);appendEvent(ledger,uwhCoordinationEvent(record,kind,{producer:u,sequence:seq++,task,observation:'synthetic'}));};
  observe('offer_recorded');
  function act(action,by,kind){record=respond(record,action,{by,note:'Synthetic demonstration; no real participant response.',evidence:'fixture:synthetic-labels',assignmentDigest:inspectCoordination(record).assignmentDigest});observe(kind);}
  act('accept','synthetic-analyst','recipient_accepted');
  act('resume','synthetic-analyst','execution_started');
  // The synthetic human performs the deterministic comparison; no agent is launched.
  const before='Status: Unobserved',after='Status:';
  if(!before.includes('Unobserved') || after.includes('Unobserved'))throw Error('Fixture changed');
  act('submit','synthetic-analyst','result_received');
  commitLedger(ledger);
  act('approve','synthetic-checker','review_recorded');
  const view=inspectLedger(ledger);const monitor=exportMonitor(ledger,path.join(output,'monitor.html'));
  if(view.events.length!==6 || view.gaps.length || record.packet.work_contract.review.status!=='accepted')throw Error('Incomplete synthetic lifecycle');
  return {source_revision:pin.revision,ledger,monitor,events:view.events.length,synthetic:true,review:'synthetic-accepted-not-human-acceptance',execution_authorized:false};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==4)throw Error('Usage: node examples/uwh-roundtrip.mjs /reviewed/uwh/package /absolute/new-output');
  console.log(JSON.stringify(await uwhDemo(process.argv[2],process.argv[3]),null,2));
}
