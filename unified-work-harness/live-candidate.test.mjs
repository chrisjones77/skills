import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,mkdirSync,writeFileSync,realpathSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {buildCandidateScope,candidateRoundtrip,inspectCandidateRuntime,readCandidateForReview} from "./candidate.mjs";
import {hypervisor,sha256} from "./bundle.mjs";
import {reviewIntake} from "./intake.mjs";
import {packageInventory} from "./package.mjs";

// Explicitly opt in. The host must already have this local model provisioned.
// The two protocols share one Ollama server and receive only synthetic text.
test("live local candidate edit through both accepted HTTP protocols", {
  skip:process.env.UNIFIED_LIVE_CANDIDATE !== "1", timeout:250000,
}, async t=>{
  const temp=realpathSync(mkdtempSync(path.join(tmpdir(),"live-candidate-")));
  t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,"repo"),ledger=path.join(temp,"ledger"),result=path.join(temp,"result");
  for(const dir of [root,ledger,result]) mkdirSync(dir,{mode:0o700});
  const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
  git("init","-q","-b","main");
  writeFileSync(path.join(root,"color.txt"),"blue\n");
  git("add","color.txt");
  git("-c","user.name=Synthetic","-c","user.email=test@example.invalid","commit","-qm","synthetic color");
  const revision=git("rev-parse","HEAD");
  const workspace={root,revision,identity:root+"#main",status_digest:sha256("")};
  const allowed=["read","prepare-candidate","local-provider"];
  const prohibited=["commit","push","merge","deploy","external-account-actions","third-party-contact","write-source","external-network","execute-generated-code"];
  const checks=["Verify that the only proposed change is replacing blue with green."];
  const intake={outcome:'Replace the contents of color.txt with the single word green. Return only the edits JSON object.',
    exclusions:["applying changes"],assignee:{kind:"agent",id:"synthetic-worker"},accountableHuman:"synthetic-owner",
    authority:{allowed,prohibited},dataClass:"public",
    resources:{effortMinutes:10,deadline:"none",dependencies:[],reviewerAvailability:"available"},
    acceptance:{checks,reviewer:"synthetic-reviewer"},escalation:{contact:"synthetic-owner",stopConditions:["unclear scope"],mayPause:true},concerns:[]};
  const {bundle,candidate,intake:intakeHash}=inspectCandidateRuntime();
  const sourceSha256=packageInventory().sourceSha256;
  for(const [adapter,route] of [["openai_chat","/v1/chat/completions"],["ollama_chat","/api/chat"]]){
    await t.test(adapter,async()=>{
      const now=Date.now(), reviewedAt=new Date(now-1000).toISOString(),expiresAt=new Date(now+180000).toISOString();
      const request={mode:"candidate_edit",purpose:"0x1",workspace,intake,
        runtime:{bundle,candidate,intake:intakeHash},packageProfile:{primary:"0x1",requiredCapabilities:["candidate_changes","assignment_intake"],
          effectCeiling:["read","write","git","provider","network"],sourceSha256},
        reads:["color.txt"],writes:["color.txt"],assertions:[{path:"color.txt",contains:"green",expected:true}],
        limits:{contextBytes:8192,replyBytes:8192,tokens:256,timeoutMs:110000},
        data:{containsSecrets:false,containsSensitivePersonalData:false,processing:"local"},
        provider:{adapter,endpoint:"http://127.0.0.1:11434"+route,model:"qwen2.5:3b"},
        invocationPolicy:{directory:ledger,mode:"single_attempt"},resultPolicy:{directory:result,retention:"owner_managed"},
        executionWindow:{not_before:reviewedAt,expires_at:expiresAt},
        intakeReview:reviewIntake(JSON.stringify(intake),{by:"synthetic-reviewer",disposition:"clear",authority:"confirmed",
          scope:"consistent",concerns:"clear",availableMinutes:10,reviewerAvailable:true,evidenceRef:"synthetic live fixture",reviewedAt,expiresAt})};
      let packet=hypervisor.createPacket({id:"live-"+adapter,mode:"Implementation",owner:intake.assignee.id,
        objective:intake.outcome,workspace,authorization:allowed,grantedBy:intake.accountableHuman});
      packet.authorization.prohibited=[...prohibited];
      packet=hypervisor.offerAssignment(packet,{scope:buildCandidateScope(request),engineeringPurpose:request.purpose,
        acceptanceEvidence:JSON.stringify(checks),assigner:intake.accountableHuman,reviewer:intake.acceptance.reviewer});
      packet=hypervisor.acceptAssignment(packet,{by:intake.assignee.id,assignmentDigest:hypervisor.currentAssignment(packet).digest,note:"Explicit synthetic acceptance"});
      packet.status="active"; packet.handoff.current_writer=intake.assignee.id;
      packet.checkpoints.push({at:packet.work_contract.acceptance.at,kind:"resumed",note:"Synthetic explicit resume",owner:intake.assignee.id,workspace:workspace.identity,reconciled:false});
      const receipt=await candidateRoundtrip({packet,request});
      const artifact=readCandidateForReview({packet,request,receipt});
      assert.equal(receipt.package_sha256,sourceSha256);
      assert.equal(artifact.review_status,"pending");
      assert.deepEqual(artifact.outcomes,[true]);
      assert.equal(artifact.edits[0].text.trim(),"green");
      assert.equal(artifact.edits[0].base_sha256,sha256("blue\n"));
      assert.equal(git("status","--porcelain"),"");
      assert.equal(git("rev-parse","HEAD"),revision);
      t.diagnostic(adapter+" completed a synthetic candidate edit; receipt SHA-256 "+receipt.receipt_sha256);
    });
  }
});
