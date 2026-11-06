import test from "node:test";
import assert from "node:assert/strict";
import {offerCoordination,inspectCoordination,respond,handoff,reoffer} from "./coordination.mjs";
import {contractRoundtrip,hypervisor} from "./bundle.mjs";

const intake = {outcome:"Review a pump report",exclusions:["editing"],assignee:{kind:"human",id:"worker"},accountableHuman:"owner",authority:{allowed:["review"],prohibited:["publish"]},dataClass:"public",resources:{effortMinutes:20,deadline:"none",dependencies:[],reviewerAvailability:"available"},acceptance:{checks:["Inspect evidence"],reviewer:"reviewer"},escalation:{stopConditions:["unclear scope"],contact:"owner",mayPause:true},concerns:[]};
const workspace = {root:"/synthetic",identity:"/synthetic#main",revision:"a".repeat(40),status_digest:"b".repeat(64)};
import { reviewIntake } from "./intake.mjs";
const reviewed = intake => ({intake,review:reviewIntake(JSON.stringify(intake),{by:"reviewer",disposition:"clear",authority:"confirmed",scope:"consistent",concerns:"clear",availableMinutes:20,reviewerAvailable:true,evidenceRef:"decision#1",reviewedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()})});
const draft = kind => offerCoordination({...reviewed({...intake,assignee:{kind,id:"worker"}}),workspace,id:"review-1",purpose:"0xB"});
const step = (r,action,by,extra={}) => respond(r,action,{by,note:"Synthetic recorded response",assignmentDigest:inspectCoordination(r).assignmentDigest,...extra});
test("an accepted attended workspace cannot be substituted; changing it needs a new acceptance",async()=>{
  const accepted=step(draft("human"),"accept","worker");
  const pin=inspectCoordination(accepted).assignmentDigest;
  const other={root:"/other",identity:"/other#review",revision:"c".repeat(40),status_digest:"d".repeat(64)};
  for(const [field,value] of Object.entries(other)){
    const changed=structuredClone(accepted);
    changed.packet.workspace[field]=value;
    assert.throws(()=>respond(changed,"resume",{by:"worker",note:"resume",assignmentDigest:pin}),/workspace/i);
  }
  const {reoffer}=await import("./coordination.mjs");
  const next=reoffer(accepted,{by:"owner",assignmentDigest:pin,note:"Change the reviewed workspace",
    ...reviewed(intake),workspace:other});
  assert.deepEqual(next.packet.workspace,other);
  assert.equal(next.packet.work_contract.acceptance,null);
  assert.throws(()=>step(next,"resume","worker"));
  assert.throws(()=>step(next,"accept","worker",{assignmentDigest:pin}));
  const active=step(step(next,"accept","worker"),"resume","worker");
  assert.equal(active.packet.checkpoints.at(-1).workspace,other.identity);
  const damaged=structuredClone(next);
  damaged.revisions[0].workspace.revision=other.revision;
  assert.throws(()=>inspectCoordination(damaged),/workspace/i);
});
for(const kind of ["human","agent","hybrid"]) test(kind+" attended review lifecycle",async()=>{
  let r=draft(kind);
  assert.throws(()=>step(r,"resume","worker"));
  r=step(r,"accept","worker");
  r=step(r,"resume","worker");
  await assert.rejects(contractRoundtrip({packet:r.packet}),/binding/);
  r=step(r,"submit","worker",{evidence:"report#1"});
  assert.throws(()=>step(r,"approve","worker",{evidence:"report#1"}));
  r=step(r,"approve","reviewer",{evidence:"report#1"});
  assert.equal(step(r,"close","reviewer",{evidence:"decision#1"}).packet.status,"complete");
});
test("concern, alternate answer and transfer preserve attribution and require fresh acceptance",()=>{
  let r=step(draft("human"),"clarify","worker",{concernId:"units",question:"Which unit?",human:"lead"});
  const transfer = rec => handoff(rec,{assignmentDigest:inspectCoordination(rec).assignmentDigest,by:"owner",note:"Change assigned analyst",...reviewed({...intake,assignee:{kind:"hybrid",id:"team"}})});
  assert.throws(()=>transfer(r));
  r=step(r,"answer","owner",{concernId:"units",answer:"Check with lead"});
  r=step(r,"reassess","worker",{concernId:"units",decision:"ambiguous",responseDigest:r.packet.clarifications[0].responses.at(-1).digest});
  r=step(r,"reroute","owner",{concernId:"units",human:"alternate"});
  r=step(r,"answer","alternate",{concernId:"units",answer:"Use kPa"});
  r=step(r,"reassess","worker",{concernId:"units",decision:"clear",responseDigest:r.packet.clarifications[0].responses.at(-1).digest});
  const next=transfer(r);
  assert.equal(next.predecessors[0].packet.clarifications[0].responses[1].by,"alternate");
  assert.throws(()=>respond(next,"accept",{by:"team",assignmentDigest:inspectCoordination(r).assignmentDigest}));
  assert.equal(step(next,"accept","team").packet.work_contract.disposition,"accepted");
  next.predecessors[0].packet.next_action="changed";
  assert.throws(()=>inspectCoordination(next));
});

test("decline requires a new offer and preserves superseded review scope",async()=>{
  const { reoffer } = await import("./coordination.mjs");
  const declined = step(draft("human"),"declined","worker",{checkpoint:"Narrow the request"});
  assert.throws(()=>step(declined,"accept","worker"));
  const next = reoffer(declined,{by:"owner",assignmentDigest:inspectCoordination(declined).assignmentDigest,
    note:"Reduce scope",...reviewed({...intake,outcome:"Review only the pressure units"})});
  assert.equal(next.packet.work_contract.assignments.length,2);
  assert.deepEqual(next.revisions[0].intake,declined.intake);
  const altered=structuredClone(next); altered.revisions[0].intake.accountableHuman="stranger";
  assert.throws(()=>inspectCoordination(altered),/identity/);
  assert.equal(next.packet.work_contract.disposition,"offered");
  assert.equal(next.packet.work_contract.events[1].kind,"declined");
  assert.throws(()=>step(next,"accept","worker",{assignmentDigest:inspectCoordination(declined).assignmentDigest}));
});

test('attended lifecycle enforces the transition and actor table', () => {
  const options = {evidence:'synthetic review'};
  const actor = {accept:'worker',resume:'worker',pause:'worker',submit:'worker',rework:'reviewer',approve:'reviewer',close:'reviewer'};
  const offered = draft('human');
  const apply = (record, action) => step(record,action,actor[action],options);
  const accepted = apply(offered,'accept'), active = apply(accepted,'resume');
  const submitted = apply(active,'submit'), approved = apply(submitted,'approve');
  const states = [
    [offered,['accept']], [accepted,['resume']], [active,['pause','submit']],
    [apply(active,'pause'),['resume']], [submitted,['approve','rework']],
    [apply(submitted,'rework'),['resume']], [approved,['close']], [apply(approved,'close'),[]],
  ];
  for (const [record,legal] of states) {
    const before = JSON.stringify(record);
    for (const action of Object.keys(actor)) {
      if (legal.includes(action)) assert.doesNotThrow(()=>apply(record,action));
      else assert.throws(()=>apply(record,action),undefined,action);
      assert.throws(()=>step(record,action,'unassigned',options));
      assert.throws(()=>step(record,action,actor[action],{...options,assignmentDigest:'0'.repeat(64)}));
      assert.equal(JSON.stringify(record),before);
    }
  }
});

// Keep the timestamps deterministic. In particular several legitimate actions
// can all take place in the same millisecond.
function reviewHistory(t, spaced = true) {
  t.mock.timers.enable({apis:['Date'],now:Date.UTC(2026,0,1)});
  const tick = () => { if (spaced) t.mock.timers.tick(10); };
  const offered=draft('human'); tick();
  const accepted=step(offered,'accept','worker'); tick();
  const active=step(accepted,'resume','worker'); tick();
  const submitted=step(active,'submit','worker',{evidence:'initial review'}); tick();
  const rework=step(submitted,'rework','reviewer',{evidence:'correction requested'}); tick();
  return {offered,accepted,active,submitted,rework};
}

for (const [label,change] of [
  ['opening before offer',(w,a)=>{w.events[0].at=new Date(Date.parse(a.created_at)-1).toISOString();}],
  ['acceptance before offer',(w,a)=>{w.acceptance.at=w.events[1].at=new Date(Date.parse(a.created_at)-1).toISOString();}],
  ['review before acceptance',w=>{w.review.history[0].at=w.events[2].at=w.events[0].at;}],
  ['rework before submission',w=>{w.review.history[1].at=w.events[3].at=w.events[1].at;}],
  ['wrong opening actor',w=>{w.events[0].by='stranger';}],
  ['duplicate opening',w=>{w.events.splice(1,0,{...w.events[0]});}],
  ['missing opening',w=>{w.events.shift();}],
  ['unattributed acceptance',w=>{w.acceptance.by='stranger';}],
  ['reviewer impersonation',w=>{w.events[3].by=w.review.history[1].by='worker';}],
  ['missing review event',w=>{w.events.pop();}],
  ['wrong review digest',w=>{w.review.history[1].assignment_digest='0'.repeat(64);}],
  ['review state mismatch',w=>{w.review.status='pending';}],
]) {
  test('work event history: '+label,t=>{
    const {rework}=reviewHistory(t);
    const changed=structuredClone(rework);
    change(changed.packet.work_contract,hypervisor.currentAssignment(changed.packet));
    assert.throws(()=>inspectCoordination(changed),undefined,'invalid history admitted: '+label);
    assert.equal(inspectCoordination(rework).review,'rework');
  });
}

test('work event history: backdated review via public response',t=>{
  const {submitted}=reviewHistory(t);
  const past=submitted.packet.work_contract.acceptance.at;
  assert.throws(()=>step(submitted,'approve','reviewer',{at:past,evidence:'decision'}),/chronolog/i);
  const approved=step(submitted,'approve','reviewer',{evidence:'decision'});
  assert.equal(step(approved,'close','reviewer',{evidence:'close'}).packet.status,'complete');
});

test('work event history: backdated revision',t=>{
  const {rework}=reviewHistory(t);
  const revise=at=>hypervisor.reviseAssignment(rework.packet,{at,by:'owner',note:'new scope',outcome:'revised outcome',
    scope:'reviewed revised scope',acceptanceEvidence:'check revision'});
  assert.throws(()=>revise(rework.packet.work_contract.acceptance.at),/chronolog/i);
  assert.equal(revise(new Date().toISOString()).work_contract.disposition,'offered');
});

for (const [label,spaced,kind] of [
  ['prior checkpoint',true,'stale'], ['same millisecond prior checkpoint',false,'stale'],
  ['older unbound checkpoint',true,'old'], ['ambiguous unbound checkpoint',false,'old'],
  ['later legacy resume',true,'legacy'], ['explicit same millisecond resume',false,'fresh'],
  ['different revision',true,'wrong digest'], ['different event count',true,'wrong count'],
]) {
  test('attended resume history: '+label,t=>{
    const {rework,active}=reviewHistory(t,spaced);
    const resumed=step(rework,'resume','worker');
    const cp=resumed.packet.checkpoints.at(-1);
    if (kind==='stale' || kind==='old') {
      Object.assign(cp,active.packet.checkpoints.at(-1));
      if (kind==='old') {
        delete cp.assignment_digest;
        delete cp.work_event_count; delete cp.checkpoint_index;
      }
    } else if (kind==='legacy') {
      delete cp.assignment_digest;
      delete cp.work_event_count; delete cp.checkpoint_index;
    } else if (kind==='wrong digest') cp.assignment_digest='0'.repeat(64);
    else if (kind==='wrong count') cp.work_event_count=2;
    if (kind==='fresh' || kind==='legacy') {
      assert.equal(step(resumed,'submit','worker',{evidence:'corrected work'}).packet.work_contract.review.status,'submitted');
    } else {
      assert.throws(()=>inspectCoordination(resumed),/resume checkpoint/i,'stale checkpoint admitted: '+label);
      assert.throws(()=>respond(resumed,'submit',{assignmentDigest:hypervisor.currentAssignment(resumed.packet).digest,
        by:'worker',note:'submit',evidence:'old work'}),/resume checkpoint/i);
    }
  });
}

test('work event history: submit requires an active resumed writer',t=>{
  const {accepted,active}=reviewHistory(t);
  const submit=packet=>hypervisor.reviewWork(packet,{by:'worker',note:'submit',decision:'submit',evidence:'review'});
  assert.throws(()=>submit(accepted.packet),/resume/i);
  assert.equal(submit(active.packet).work_contract.review.status,'submitted');
});

test('work event history: submit cannot predate resume',t=>{
  const {active}=reviewHistory(t);
  assert.throws(()=>step(active,'submit','worker',{at:active.packet.work_contract.acceptance.at,evidence:'earlier evidence'}),/chronolog/i);
});

test('attended resume history: revised offer rejects the old checkpoint',t=>{
  const {active}=reviewHistory(t,false);
  const revised=reoffer(active,{assignmentDigest:inspectCoordination(active).assignmentDigest,by:'owner',note:'revised outcome',
    ...reviewed({...intake,outcome:'Inspect revised report'})});
  const resumed=step(step(revised,'accept','worker'),'resume','worker');
  assert.notEqual(inspectCoordination(resumed).assignmentDigest,inspectCoordination(active).assignmentDigest);
  resumed.packet.checkpoints[resumed.packet.checkpoints.length-1]=active.packet.checkpoints.at(-1);
  assert.throws(()=>inspectCoordination(resumed),/resume checkpoint/i);
});

for (const [label,change] of [
  ['no resume',p=>{p.checkpoints=p.checkpoints.filter(cp=>cp.kind!=='resumed');}],
  ['wrong writer',p=>{p.checkpoints.at(-1).owner='stranger';}],
  ['wrong workspace',p=>{p.checkpoints.at(-1).workspace='unrelated';}],
  ['resume after submission',p=>{p.checkpoints.at(-1).at=new Date(Date.parse(p.work_contract.events.at(-1).at)+1).toISOString();}],
  ['checkpoint bound to another event',p=>{p.checkpoints.at(-1).work_event_count=1;}],
]) {
  test('submitted checkpoint history: '+label,t=>{
    const {submitted}=reviewHistory(t);
    const changed=structuredClone(submitted);
    change(changed.packet);
    assert.throws(()=>inspectCoordination(changed),/resume checkpoint/i,'submission has no matching resume: '+label);
    assert.equal(inspectCoordination(submitted).review,'submitted');
  });
}

test('submitted checkpoint history: rework consumes a distinct resume',t=>{
  const {rework}=reviewHistory(t);
  const resumed=step(rework,'resume','worker');
  const submitted=step(resumed,'submit','worker',{evidence:'corrected report'});
  assert.equal(inspectCoordination(submitted).review,'submitted');
  submitted.packet.checkpoints.pop();
  assert.throws(()=>inspectCoordination(submitted),/resume checkpoint/i);
});

for (const label of ['stale digest','wrong recipient','not accepted','already active','unresolved concern','before checkpoint','future resume','no note']) {
  test('resume admission: '+label,t=>{
    const {accepted,offered,active}=reviewHistory(t);
    let packet=accepted.packet;
    if (label==='not accepted') packet=offered.packet;
    if (label==='already active') packet=active.packet;
    if (label==='unresolved concern') packet=step(accepted,'clarify','worker',{concernId:'units',question:'Which unit?',human:'lead'}).packet;
    const args={by:'worker',assignmentDigest:hypervisor.currentAssignment(packet).digest,note:'restart'};
    if (label==='stale digest') args.assignmentDigest='0'.repeat(64);
    if (label==='wrong recipient') args.by='stranger';
    if (label==='before checkpoint') args.at=new Date(Date.parse(packet.checkpoints.at(-1).at)-1).toISOString();
    if (label==='future resume') args.at=new Date(Date.now()+10000).toISOString();
    if (label==='no note') args.note='';
    const before=structuredClone(packet);
    assert.throws(()=>hypervisor.resumeAssignment(packet,args),/resume/i);
    assert.deepEqual(packet,before);
  });
}

test('work event history: reviewed revision retains its earlier workspace',t=>{
  const {rework}=reviewHistory(t);
  const other={...workspace,root:'/other',identity:'/other#review'};
  const next=reoffer(rework,{assignmentDigest:inspectCoordination(rework).assignmentDigest,by:'owner',note:'review updated files',
    ...reviewed(intake),workspace:other});
  const active=step(step(next,'accept','worker'),'resume','worker');
  const submitted=step(active,'submit','worker',{evidence:'report in new workspace'});
  assert.equal(inspectCoordination(submitted).review,'submitted');
  assert.deepEqual(submitted.packet.checkpoints.filter(cp=>cp.kind==='resumed').map(cp=>cp.workspace),[workspace.identity,other.identity]);
});

for (const label of ['pause','resolved clarification']) {
  test('resume after hold: '+label,t=>{
    const {active}=reviewHistory(t,false);
    let held;
    if (label==='pause') held=step(active,'pause','worker');
    else {
      const question=step(active,'clarify','worker',{concernId:'units',question:'Which units?',human:'lead'});
      const answer=step(question,'answer','owner',{concernId:'units',answer:'Use kPa.'});
      held=step(answer,'reassess','worker',{concernId:'units',responseDigest:answer.packet.clarifications[0].responses[0].digest,decision:'clear'});
    }
    const resumed=step(held,'resume','worker');
    assert.equal(inspectCoordination(resumed).review,'pending');
    const stale=structuredClone(resumed);
    stale.packet.checkpoints[stale.packet.checkpoints.length-1]=active.packet.checkpoints.at(-1);
    assert.throws(()=>inspectCoordination(stale),/resume checkpoint/i,'prior checkpoint reused after '+label);
    const legacy=structuredClone(stale);
    const cp=legacy.packet.checkpoints.at(-1);
    delete cp.assignment_digest; delete cp.work_event_count; delete cp.checkpoint_index;
    assert.throws(()=>inspectCoordination(legacy),/resume checkpoint/i);
  });
}

test('submitted checkpoint history: superseded workspace substitution',t=>{
  const {rework}=reviewHistory(t);
  const revised=reoffer(rework,{assignmentDigest:inspectCoordination(rework).assignmentDigest,by:'owner',note:'new workspace',
    ...reviewed(intake),workspace:{...workspace,identity:'/other#review',root:'/other'}});
  revised.packet.checkpoints.find(cp=>cp.kind==='resumed').workspace='/other#review';
  assert.throws(()=>inspectCoordination(revised),/resume checkpoint/i);
});
