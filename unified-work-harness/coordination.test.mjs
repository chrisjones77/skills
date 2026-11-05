import test from "node:test";
import assert from "node:assert/strict";
import {offerCoordination,inspectCoordination,respond,handoff} from "./coordination.mjs";
import {contractRoundtrip} from "./bundle.mjs";

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
