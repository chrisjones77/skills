// Independent, local, single-writer event recorder. No harness or provider imports.
import {createHash, randomUUID} from 'node:crypto';
import {mkdirSync, readdirSync, readFileSync, writeFileSync, openSync, closeSync, fsyncSync, unlinkSync, linkSync, lstatSync, realpathSync, existsSync, rmdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

export const commands = Object.freeze(['orient','build','maintain','diagnose','investigate','record','communicate','design','represent','prioritize','teach','verify','inspect','sustain','coordinate','envision']);
export const kinds = Object.freeze(['orientation_recorded','purpose_selected','profile_resolved','offer_recorded','recipient_accepted','reservation_recorded','attempt_claimed','execution_started','execution_failed','result_received','review_recorded','stop_recorded','reconciliation_recorded','correction_recorded']);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => {throw Error(message);};
const exact = (x, keys) => x && !Array.isArray(x) && typeof x === 'object' && Object.keys(x).sort().join() === [...keys].sort().join();
const label = x => typeof x === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(x);
const digest = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const uuid = x => typeof x === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x);
const nullable = (x, check) => x === null || check(x);
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])) : x;
export const eventBytes = event => JSON.stringify(canonical(validateEvent(event)))+'\n';

export function validateEvent(e) {
  if (!exact(e,['schema','id','producer','sequence','observed_at','task','purpose','kind','observation','evidence','detail','corrects']) || e.schema !== 'work-recorder.event.v1' || !uuid(e.id)) fail('Invalid event envelope');
  if (!exact(e.producer,['name','instance','revision']) || !['qvch','uwh','synthetic'].includes(e.producer.name) || !uuid(e.producer.instance) || !label(e.producer.revision)) fail('Invalid producer identity');
  if (!Number.isSafeInteger(e.sequence) || e.sequence < 1 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(e.observed_at) || !Number.isFinite(Date.parse(e.observed_at)) || new Date(e.observed_at).toISOString() !== e.observed_at) fail('Invalid sequence or time');
  if (!exact(e.task,['id','assignment_digest','attempt']) || !label(e.task.id) || !nullable(e.task.assignment_digest,digest) || !nullable(e.task.attempt,label)) fail('Invalid correlation');
  if (!exact(e.purpose,['code','command']) || !/^0x[0-9A-F]$/.test(e.purpose.code) || commands[parseInt(e.purpose.code.slice(2),16)] !== e.purpose.command) fail('Invalid purpose mapping');
  if (!kinds.includes(e.kind) || !['synthetic','producer_declared','derived'].includes(e.observation)) fail('Invalid event kind or provenance');
  if (!Array.isArray(e.evidence) || e.evidence.length > 16 || !e.evidence.every(x=>exact(x,['ref','sha256']) && /^(fixture|artifact|record):[a-zA-Z0-9._:-]{1,128}$/.test(x.ref) && digest(x.sha256))) fail('Invalid evidence reference');
  if (!exact(e.detail,['state','reason','phase']) || !label(e.detail.state) || !nullable(e.detail.reason,label) || !nullable(e.detail.phase,label) || !nullable(e.corrects,uuid) || (e.corrects !== null && (e.kind !== 'correction_recorded' || e.corrects === e.id))) fail('Invalid event detail');
  if (Buffer.byteLength(JSON.stringify(e)) > 16384) fail('Event exceeds byte budget');
  return e;
}

export function makeEvent({producer, sequence, task, purpose='0xC', kind, state='unknown', reason=null, phase=null, evidence=[], observation='producer_declared', corrects=null, id=randomUUID(), observed_at=new Date().toISOString()}) {
  return validateEvent({schema:'work-recorder.event.v1',id,producer,sequence,observed_at,task,purpose:{code:purpose,command:commands[parseInt(purpose.slice(2),16)]},kind,observation,evidence,detail:{state,reason,phase},corrects});
}

function canonicalDirectory(directory) {
  if (!path.isAbsolute(directory) || realpathSync.native(directory) !== directory) fail('Use a canonical absolute directory');
  const s=lstatSync(directory);
  if (!s.isDirectory() || s.isSymbolicLink() || s.uid !== process.getuid?.() || (s.mode & 0o777) !== 0o700) fail('Ledger requires an owner-only directory');
}
const gitEnv = () => Object.fromEntries([...Object.entries(process.env).filter(([k])=>!/^GIT_|^SSH_|^NODE_OPTIONS$/.test(k)),['GIT_CONFIG_NOSYSTEM','1'],['GIT_CONFIG_GLOBAL','/dev/null'],['GIT_TERMINAL_PROMPT','0']]);
function gitBytes(root,args) {
  try {
    return execFileSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',...args],{cwd:root,env:gitEnv(),maxBuffer:1048576,stdio:['ignore','pipe','pipe']});
  } catch { fail('Git history or operation unavailable; reconcile ledger integrity'); }
}
function git(root,args) {return gitBytes(root,args).toString('utf8').trim();}

// An empty new repository is valid. An unreadable existing history is not an
// empty repository. No failed Git query is treated as evidence of a local save.
function historyHead(root) {
  try { return git(root,['rev-parse','--verify','HEAD^{commit}']); }
  catch {
    try {
      const ref=git(root,['symbolic-ref','--quiet','HEAD']);
      const refs=git(root,['for-each-ref','--format=%(refname)']);
      if (!ref.startsWith('refs/heads/') || refs || existsSync(path.join(root,'.git','logs','HEAD'))) fail('Existing Git history unavailable');
      // Includes broken loose refs which for-each-ref may warn about and omit.
      const looseRefs=dir=>readdirSync(dir).some(name=>{const entry=path.join(dir,name);return lstatSync(entry).isDirectory()?looseRefs(entry):true;});
      if (looseRefs(path.join(root,'.git','refs')) || existsSync(path.join(root,'.git','packed-refs'))) fail('Existing Git references unavailable');
      return null;
    } catch { fail('Git history unavailable; reconcile ledger integrity'); }
  }
}
function syncDir(dir) {const fd=openSync(dir,'r');try{fsyncSync(fd);}finally{closeSync(fd);}}
function regular(file,max=16384) {
  const s=lstatSync(file);
  if (!s.isFile() || s.isSymbolicLink() || s.nlink !== 1 || s.uid !== process.getuid?.() || s.size>max) fail('Unsafe or oversized ledger file');
  return readFileSync(file,'utf8');
}
function checkLedger(root) {
  canonicalDirectory(root);
  if (!lstatSync(path.join(root,'.git')).isDirectory() || lstatSync(path.join(root,'.git')).isSymbolicLink() || realpathSync.native(path.join(root,'.git')) !== path.join(root,'.git')) fail('Dedicated Git directory required');
  if (regular(path.join(root,'recorder.json')) !== '{"schema":"work-recorder.ledger.v1"}\n') fail('Unknown ledger');
  const dir=path.join(root,'events');
  if (!lstatSync(dir).isDirectory() || realpathSync.native(dir)!==dir) fail('Unsafe event directory');
}
function locked(root,fn) {
  checkLedger(root);
  const lock=path.join(root,'.git','recorder.lock');
  try{mkdirSync(lock,{mode:0o700});}catch{fail('Recorder writer locked; reconcile the owner before retrying');}
  try{return fn();}finally{rmdirSync(lock);}
}

export function initializeLedger(root) {
  canonicalDirectory(root);
  if(readdirSync(root).length) fail('Initialize an empty dedicated ledger directory');
  git(root,['init','-q']);
  git(root,['config','user.name','Work Recorder']);git(root,['config','user.email','recorder@example.invalid']);
  mkdirSync(path.join(root,'events'),{mode:0o700});
  writeFileSync(path.join(root,'recorder.json'),'{"schema":"work-recorder.ledger.v1"}\n',{flag:'wx',mode:0o600});
  const fd=openSync(path.join(root,'recorder.json'),'r');try{fsyncSync(fd);}finally{closeSync(fd);}syncDir(root);
  return {schema:'work-recorder.initialized.v1',execution_authorized:false};
}

export function readEvents(root) {
  checkLedger(root);
  const entries=readdirSync(path.join(root,'events'));
  if(entries.length>10000) fail('Prototype event limit exceeded');
  const head=historyHead(root);
  const tracked=head?git(root,['ls-tree','-r','--name-only',head,'--','events']).split('\n').filter(Boolean):[];
  if(tracked.some(file=>!entries.includes(file.slice('events/'.length)))) fail('Committed event missing; reconcile without rewriting history');
  const events=entries.map(name=>{
    if(!/^[a-f0-9-]{36}\.json$/.test(name)) fail('Unexpected event entry');
    const bytes=regular(path.join(root,'events',name));
    const e=validateEvent(JSON.parse(bytes));
    if(name!==e.id+'.json' || bytes!==eventBytes(e)) fail('Event identity or canonical bytes differ');
    return e;
  });
  const positions=new Set(),revisions=new Map();
  for(const e of events){
    const stream=e.producer.name+':'+e.producer.instance;
    const pos=stream+':'+e.sequence;
    if(positions.has(pos) || (revisions.has(stream) && revisions.get(stream)!==e.producer.revision)) fail('Producer sequence or revision conflict');
    positions.add(pos);revisions.set(stream,e.producer.revision);
  }
  return events.sort((a,b)=>a.observed_at.localeCompare(b.observed_at)||a.producer.name.localeCompare(b.producer.name)||a.producer.instance.localeCompare(b.producer.instance)||a.sequence-b.sequence);
}

export function appendEvent(root,event) {
  const e=structuredClone(validateEvent(event)),bytes=eventBytes(e);
  return locked(root,()=>{
    const existing=readEvents(root),same=existing.find(x=>x.id===e.id);
    if(same){if(eventBytes(same)!==bytes) fail('Event ID content conflict');return persistence(root,e.id,true);}
    if(existing.length>=10000) fail('Prototype event limit exceeded');
    for(const old of existing) if(old.producer.name===e.producer.name && old.producer.instance===e.producer.instance && (old.sequence===e.sequence || old.producer.revision!==e.producer.revision)) fail('Producer sequence or revision conflict');
    const temp=path.join(root,'.git','event-'+randomUUID()+'.tmp');
    const fd=openSync(temp,'wx',0o600);
    try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
    try{linkSync(temp,path.join(root,'events',e.id+'.json'));syncDir(path.join(root,'events'));}finally{unlinkSync(temp);}
    return persistence(root,e.id,false);
  });
}

// A derived receipt. Persistence progress never rewrites event content.
export function persistence(root,id,duplicate=false) {
  checkLedger(root);
  if(!uuid(id)) fail('Invalid event ID');
  const file='events/'+id+'.json',bytes=regular(path.join(root,file));
  const event=validateEvent(JSON.parse(bytes));
  if(event.id!==id) fail('Event identity differs from the requested receipt');
  if(eventBytes(event)!==bytes) fail('Event bytes are not canonical');
  const head=historyHead(root);
  const commit=head?(git(root,['log','-1','--format=%H',head,'--',file])||null):null;
  if(commit && !gitBytes(root,['show',commit+':'+file]).equals(Buffer.from(bytes,'utf8'))) fail('Committed event differs from working bytes');
  return {schema:'work-recorder.receipt.v1',event_id:id,sha256:sha(bytes),state:commit?'committed':'saved_locally',commit,remote_persistence:'unverified',duplicate};
}

export function commitLedger(root) {
  return locked(root,()=>{
    const events=readEvents(root);
    if(git(root,['diff','--cached','--name-only'])) fail('Pre-existing staged changes require owner review');
    const status=git(root,['status','--porcelain=v1','--untracked-files=all']);
    for(const line of status.split('\n').filter(Boolean)) if(!/^(\?\? recorder\.json|\?\? events\/[a-f0-9-]{36}\.json)$/.test(line)) fail('Unexpected ledger change; reconcile before committing');
    if(!status)return events.map(e=>persistence(root,e.id));
    git(root,['add','--','recorder.json',...(events.length?['events']:[])]);
    git(root,['commit','-q','-m','Record work exchange checkpoints']);
    return events.map(e=>persistence(root,e.id));
  });
}

export function inspectLedger(root) {
  const events=readEvents(root),streams=new Map();
  for(const e of events){const key=e.producer.name+':'+e.producer.instance;const s=streams.get(key)??{producer:e.producer,missing:[],seen:[]};s.seen.push(e.sequence);streams.set(key,s);}
  const gaps=[];
  for(const s of streams.values()){
    const sorted=s.seen.sort((a,b)=>a-b);let expected=1;
    for(const n of sorted){if(n>expected)gaps.push({producer:s.producer,from:expected,to:n-1,outcome:'unknown'});expected=n+1;}
  }
  return {schema:'work-recorder.view.v1',events:events.map(e=>({event:e,persistence:persistence(root,e.id)})),gaps,ordering:'observation-time-display-only',execution_authorized:false};
}
