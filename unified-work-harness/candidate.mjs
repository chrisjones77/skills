// Bounded text candidates. Workers receive selected blobs and return data via one
// accepted local HTTP endpoint. No worker receives shell or repository access.
import { verifyIntakeForOffer } from "./intake.mjs";
import { resolvePackageProfile } from "./package.mjs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, realpathSync, mkdirSync, readdirSync, mkdtempSync, rmSync, lstatSync } from "node:fs";
import path from "node:path";
import {
  hypervisor, sha256, inspectBundledSource, inspectWorkIntake, inspectExecutionWindow, inspectInvocation,
  pinTempParent, claimInvocation, validateInvocationPolicy, checkResultDirectory, normalizeAllowedPath,
  isProtectedPath, isOllamaCloudModelId, assertSafeGitSource, contractGitEnvironment, contractGitArgs,
} from "./bundle.mjs";

const routes = Object.freeze({ openai_chat: "/v1/chat/completions", ollama_chat: "/api/chat" });
const forbidden = ["commit", "push", "merge", "deploy", "external-account-actions", "third-party-contact",
  "write-source", "external-network", "execute-generated-code"];
const required = ["read", "prepare-candidate", "local-provider"];
const candidateEffects = ["read", "write", "git", "provider", "network"];
const hash = value => sha256(JSON.stringify(value));
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => plain(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const sameSet = (left, right) => Array.isArray(left) && JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const bounded = (n, max) => Number.isSafeInteger(n) && n > 0 && n <= max;
function need(value, reason) { if (!value) throw new Error(reason); }

export function inspectCandidateRuntime() {
  return { bundle: inspectBundledSource().sha256, candidate: sha256(readFileSync(new URL(import.meta.url))), intake: sha256(readFileSync(new URL("./intake.mjs",import.meta.url))), adapters: Object.keys(routes) };
}

function safeFile(name) {
  return typeof name === "string" && name.length <= 240 && /^[a-zA-Z0-9_/-][a-zA-Z0-9_./-]*$/.test(name)
    && name.split("/").every(part => part && !part.startsWith(".") && !part.startsWith("-") && !part.endsWith("."))
    && normalizeAllowedPath(name) === name && !isProtectedPath(name.toLowerCase());
}

function checkedReview(request) {
  const {assignee,accountableHuman,acceptance,outcome}=request.intake;
  return verifyIntakeForOffer(JSON.stringify(request.intake),request.intakeReview,{
    recipient:assignee.id,assigner:accountableHuman,reviewer:acceptance.reviewer,outcome,
  });
}

function checkPackageProfile(request) {
  const profile=request.packageProfile;
  const resolved=resolvePackageProfile(profile);
  need(resolved.status==="resolved_for_review" && profile.primary===request.purpose
    && ["candidate_changes","assignment_intake"].every(name=>profile.requiredCapabilities?.includes(name))
    && sameSet(profile.effectCeiling,candidateEffects) && sameSet(resolved.effects,candidateEffects),
    "Candidate package profile held or outside the candidate effect ceiling");
}

function validate(request) {
  need(exact(request, ["mode","runtime","packageProfile","workspace","intake","intakeReview","provider","limits","data","reads","writes","assertions","purpose","invocationPolicy","resultPolicy","executionWindow"]), "Invalid candidate request fields");
  const { mode, runtime, workspace, intake, provider, limits, reads, writes, assertions, purpose } = request;
  need(["candidate_edit","defect_reproduction"].includes(mode), "Unsupported candidate mode");
  const actual = inspectCandidateRuntime();
  need(exact(runtime, ["bundle","candidate","intake"]) && actual.bundle === runtime.bundle && actual.candidate === runtime.candidate && actual.intake === runtime.intake, "Review the installed runtime hashes");
  need(/^0x[1-9A-F]$/.test(purpose), "Invalid engineering purpose");
  checkPackageProfile(request);
  need(exact(workspace, ["root","identity","revision","status_digest"]) && path.isAbsolute(workspace.root)
    && /^[a-f0-9]{40}$/.test(workspace.revision) && workspace.status_digest === sha256(""), "Invalid candidate workspace");
  need(inspectWorkIntake(intake).intake_status === "complete_for_review" && intake.assignee.kind === "agent"
    && sameSet(intake.authority.allowed, required) && sameSet(intake.authority.prohibited, forbidden)
    && ![intake.accountableHuman,intake.assignee.id].includes(intake.acceptance.reviewer), "Candidate intake or reviewer rejected");
  checkedReview(request);
  need(exact(request.data, ["containsSecrets","containsSensitivePersonalData","processing"])
    && request.data.containsSecrets === false && request.data.containsSensitivePersonalData === false && request.data.processing === "local", "Data declaration rejected");
  need(exact(provider, ["adapter","endpoint","model"]) && Object.hasOwn(routes,provider.adapter)
    && typeof provider.model === "string" && /^[\w][\w./:-]{0,127}$/.test(provider.model) && !isOllamaCloudModelId(provider.model), "Unsupported provider or model");
  const url = new URL(provider.endpoint);
  need(url.protocol === "http:" && ["127.0.0.1","[::1]"].includes(url.hostname)
    && provider.endpoint === url.origin + routes[provider.adapter], "Use the adapter's exact numeric loopback route");
  need(exact(limits, ["contextBytes","replyBytes","tokens","timeoutMs"])
    && bounded(limits.contextBytes,262144) && bounded(limits.replyBytes,524288)
    && bounded(limits.tokens,4096) && bounded(limits.timeoutMs,120000), "Invalid candidate resource budget");
  for (const paths of [reads,writes]) need(Array.isArray(paths) && bounded(paths.length,32) && paths.every(safeFile) && new Set(paths).size === paths.length, "Invalid exact path list");
  const paths = [...new Set([...reads,...writes])].sort();
  for (const file of paths) need(!paths.some(other => other !== file && (other.toLowerCase() === file.toLowerCase() || other.toLowerCase().startsWith(file.toLowerCase()+"/"))), "Conflicting file paths");
  if (mode === "defect_reproduction") need(writes.length === 1 && /^tests\/.+\.json$/.test(writes[0]) && !reads.includes(writes[0]), "Specify one new JSON test fixture");
  validateAssertions(assertions);
  need(assertions.every(a=>reads.includes(a.path)), "Assertion outside approved read scope");
  validateInvocationPolicy(request.invocationPolicy);
  inspectExecutionWindow(request.executionWindow);
  need(exact(request.resultPolicy,["directory","retention"]) && path.isAbsolute(request.resultPolicy.directory)
    && request.resultPolicy.retention === "owner_managed" && request.resultPolicy.directory !== request.invocationPolicy.directory, "Invalid result destination");
}

export function buildCandidateScope(request) {
  validate(request);
  return candidateIdentity(request);
}

function candidateIdentity(request) {
  const kind=Object.hasOwn(request,"packageProfile")?"unified.text-candidate.v2":"unified.text-candidate.v1";
  return JSON.stringify({kind, request_sha256:hash(request)});
}

function git(workspace,args, maxBuffer=1048576) {
  try {
    return execFileSync("git",["--literal-pathspecs",...contractGitArgs,...args],{
      cwd:workspace.root, env:contractGitEnvironment(),
      timeout:5000,maxBuffer,stdio:["ignore","pipe","pipe"],
    });
  } catch { throw new Error("Candidate Git preflight rejected"); }
}

function checkWorkspace(ws) {
  assertSafeGitSource(ws.root);
  need(realpathSync(ws.root) === ws.root && git(ws,["rev-parse","--show-toplevel"]).toString().trim() === ws.root
    && git(ws,["rev-parse","HEAD"]).toString().trim() === ws.revision
    && ws.identity === ws.root+"#"+(git(ws,["branch","--show-current"]).toString().trim() || "(detached HEAD)")
    && !git(ws,["status","--porcelain=v1","--untracked-files=normal","--ignore-submodules=all"]).length, "Candidate workspace drift");
}

// Git pathspecs are literal, but a checkout can resolve a different spelling
// to the same entry. Walk one real directory at a time, without following links.
function checkCheckoutPath(root, name, tracked) {
  const parts = name.split("/");
  let parent = root;
  for (const [index, part] of parts.entries()) {
    const current = path.join(parent, part);
    const stat = lstatSync(current, {throwIfNoEntry:false});
    if (!stat) {
      need(!tracked, "Tracked candidate path missing from checkout");
      return;
    }
    need(readdirSync(parent).includes(part), "Candidate path spelling differs from checkout");
    if (index === parts.length - 1) {
      need(tracked && stat.isFile(), "Candidate destination already exists or is not a regular file");
    } else {
      need(stat.isDirectory(), "A candidate parent is not a directory");
    }
    parent = current;
  }
}

function readSnapshot(request) {
  const {workspace,reads,writes,limits} = request;
  const files = new Map();
  let remaining = limits.contextBytes;
  for (const name of new Set([...reads,...writes])) {
    const entry = git(workspace,["ls-tree","-z",workspace.revision,"--",name]).toString("utf8");
    checkCheckoutPath(workspace.root, name, Boolean(entry));
    if (!entry) {
      need(!reads.includes(name),"An approved input file is missing");
      // A new file below a tracked symlink or file would change its meaning
      // when a human later reviews the proposed edit against the source tree.
      for (let dir=path.posix.dirname(name); dir !== "."; dir=path.posix.dirname(dir)) {
        const parent=git(workspace,["ls-tree","-z",workspace.revision,"--",dir]).toString("utf8");
        need(!parent || parent.startsWith("040000 tree "),"A candidate parent is not a directory");
      }
      continue;
    }
    need(reads.includes(name), "Editing an existing file requires explicit read scope");
    const match=/^100(?:644|755) blob ([0-9a-f]{40})\t/.exec(entry);
    need(match && entry.endsWith("\t"+name+"\0"),"Candidate input must be a regular tracked file");
    const size=Number(git(workspace,["cat-file","-s",match[1]]).toString().trim());
    need(Number.isSafeInteger(size) && size<=remaining,"Candidate context exceeds budget");
    const bytes=git(workspace,["cat-file","blob",match[1]],Math.max(size+1,1024));
    const content=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes);
    need(!content.includes("\0") && bytes.length===size,"Candidate requires UTF-8 text");
    files.set(name,content);
    remaining-=size;
  }
  return files;
}

function checkContract(packet, request) {
  hypervisor.validatePacket(packet);
  const a=hypervisor.currentAssignment(packet);
  const w=packet.work_contract;
  const cp=packet.checkpoints.at(-1);
  const {intake,workspace}=request;
  need(a && a.scope===buildCandidateScope(request) && a.dispatch_kind==="Implementation" && a.engineering_purpose===request.purpose
    && sameSet(a.authority.allowed,required) && sameSet(a.authority.prohibited,forbidden)
    && a.recipient===intake.assignee.id && a.reviewer===intake.acceptance.reviewer && a.assigner===intake.accountableHuman
    && a.outcome===intake.outcome && a.acceptance_evidence===JSON.stringify(intake.acceptance.checks)
    && Object.keys(workspace).every(k=>packet.workspace[k]===workspace[k]),"Candidate differs from offered scope");
  need(w.disposition==="accepted" && w.acceptance?.assignment_digest===a.digest && ["pending","rework"].includes(w.review.status)
    && packet.status==="active" && packet.handoff.current_writer===a.recipient && !packet.handoff.pending_transfer
    && !(packet.clarifications??[]).some(c=>c.status!=="resolved") && cp?.kind==="resumed" && cp.owner===a.recipient
    && cp.workspace===workspace.identity && Date.parse(request.intakeReview.assessment.reviewedAt)<=Date.parse(a.created_at)
    && Date.parse(a.created_at)<=Date.parse(w.acceptance.at)
    && Date.parse(w.acceptance.at)<=Date.parse(cp.at) && Date.parse(cp.at)<=Date.now(), "Candidate needs current explicit acceptance and resume");
  return a;
}

async function readReply(response, limit) {
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("Candidate provider refused the request");
  }
  const chunks=[];
  let bytes=0;
  for await (const chunk of response.body) {
    bytes+=chunk.byteLength;
    need(bytes<=limit,"Candidate response exceeds byte budget");
    chunks.push(chunk);
  }
  try { return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks))); }
  catch { throw new Error("Malformed candidate provider response"); }
}

async function propose(request,files,signal) {
  const {provider,limits}=request;
  const messages=[
    {role:"system",content:request.mode==="candidate_edit"
      ? 'Return one JSON object with an edits array. Each edit has exactly two string fields, path and text. Copy path verbatim from writes. Put the complete corrected file contents in text. Use no tools.'
      : 'Return JSON {"assertions":[...]} containing the supplied expected behavior to reproduce the observed text defect. Use no tools.'},
    {role:"user",content:JSON.stringify({outcome:request.intake.outcome,exclusions:request.intake.exclusions,files:Object.fromEntries(files),writes:request.writes,assertions:request.assertions})},
  ];
  need(Buffer.byteLength(JSON.stringify(messages))<=limits.contextBytes,"Prompt exceeds context budget");
  const ollama=provider.adapter==="ollama_chat";
  // Native structured output narrows the generated shape. Validate the actual
  // reply independently, including paths, text, changes and accepted assertions.
  const editFormat={type:"object",required:["edits"],additionalProperties:false,properties:{
    edits:{type:"array",minItems:1,maxItems:request.writes.length,items:{type:"object",required:["path","text"],
      additionalProperties:false,properties:{path:{type:"string",enum:request.writes},text:{type:"string"}}}},
  }};
  const format=request.mode==="candidate_edit"?editFormat:"json";
  const body=ollama ? {model:provider.model,messages,stream:false,format,options:{num_predict:limits.tokens,temperature:0}} :
    {model:provider.model,messages,stream:false,max_tokens:limits.tokens,temperature:0,response_format:{type:"json_object"}};
  need(Buffer.byteLength(JSON.stringify(body))<=limits.contextBytes,"Provider request exceeds context budget");
  const response=await fetch(provider.endpoint,{method:"POST",redirect:"error",headers:{"content-type":"application/json"},
    body:JSON.stringify(body),signal});
  const reply=await readReply(response,limits.replyBytes);
  const message=ollama?reply?.message:reply?.choices?.[0]?.message;
  need(ollama ? reply?.done===true && reply.done_reason==="stop" : reply?.choices?.length===1 && reply.choices[0].finish_reason==="stop","Provider completion was incomplete");
  need(message?.role==="assistant" && typeof message.content==="string" && !message.tool_calls?.length,"Invalid candidate message");
  try { return JSON.parse(message.content); } catch { throw new Error("Malformed candidate proposal"); }
}

function validateAssertions(assertions) {
  need(Array.isArray(assertions) && bounded(assertions.length,32) && assertions.every(a =>
    exact(a,["path","contains","expected"]) && safeFile(a.path) && typeof a.contains === "string"
    && bounded(Buffer.byteLength(a.contains),1024) && typeof a.expected === "boolean"), "Invalid literal assertions");
}

// Pure oracle. The caller selects and supplies the file texts for the revision
// being tested. Fixture paths are labels and are never resolved on a filesystem.
export function evaluateTextFixture(fixture, texts) {
  need(exact(fixture,["assertions"]) && plain(texts),"Invalid text fixture input");
  validateAssertions(fixture.assertions);
  let bytes=0;
  for (const file of new Set(fixture.assertions.map(a=>a.path))) {
    need(Object.hasOwn(texts,file) && typeof texts[file] === "string" && !texts[file].includes("\0"),"Missing or invalid fixture text");
    bytes+=Buffer.byteLength(texts[file]);
  }
  // A reviewed result can include replacement text up to the provider reply cap.
  need(bytes<=786432,"Fixture text exceeds byte budget");
  return fixture.assertions.map(a=>texts[a.path].includes(a.contains)===a.expected);
}

function materialize(request, files, proposal, scratch) {
  let edits;
  if (request.mode === "defect_reproduction") {
    need(exact(proposal,["assertions"]) && hash(proposal.assertions)===hash(request.assertions),"Fixture changed accepted expectations");
    edits=[{path:request.writes[0],text:JSON.stringify(proposal,null,2)+"\n"}];
  } else {
    need(exact(proposal,["edits"]) && Array.isArray(proposal.edits) && bounded(proposal.edits.length,request.writes.length),"Invalid edit proposal");
    edits=proposal.edits;
  }
  const seen=new Set();
  for (const edit of edits) {
    need(exact(edit,["path","text"]) && request.writes.includes(edit.path) && !seen.has(edit.path)
      && typeof edit.text==="string" && !edit.text.includes("\0") && Buffer.from(edit.text).toString()===edit.text && files.get(edit.path)!==edit.text,"Edit outside scope or invalid text");
    seen.add(edit.path);
    const dest=path.join(scratch,edit.path);
    mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
    writeFileSync(dest,edit.text,{flag:"wx",mode:0o600});
  }
  const observed=Object.fromEntries(files);
  for (const file of seen) observed[file]=readFileSync(path.join(scratch,file),"utf8");
  const outcomes=evaluateTextFixture({assertions:request.assertions},observed);
  need(request.mode==="candidate_edit"?outcomes.every(Boolean):outcomes.some(ok=>!ok),"Accepted evidence criterion was not met");
  return {edits:edits.map(e=>({...e,base_sha256:files.has(e.path)?sha256(files.get(e.path)):null, result_sha256:sha256(e.text)})), outcomes};
}

export async function candidateRoundtrip({packet,request,signal}) {
  packet=structuredClone(packet);
  request=structuredClone(request);
  const assignment=checkContract(packet,request);
  const root=request.workspace.root;
  const getTempParent=pinTempParent(root);
  const resultDir=checkResultDirectory(request.resultPolicy,root);
  const deadline=AbortSignal.timeout(request.limits.timeoutMs);
  const stop=signal ? AbortSignal.any([signal,deadline]) : deadline;
  const started=performance.now();
  const checkBudget=()=>{
    stop.throwIfAborted();
    need(performance.now()-started < request.limits.timeoutMs,"Candidate time budget exhausted");
  };
  let lastTime=Date.now();
  const beforeLaunch=()=>{
    checkBudget();
    checkedReview(request);
    checkPackageProfile(request);
    const now=Date.now();
    need(now>=lastTime && inspectExecutionWindow(request.executionWindow,now).state==="within_window","Candidate launch outside accepted window");
    lastTime=now;
  };
  beforeLaunch();
  checkWorkspace(request.workspace);
  const files=readSnapshot(request);
  // A cancelled or expired request consumes no attempt until this claim.
  beforeLaunch();
  const invocation=claimInvocation(request.invocationPolicy,assignment.digest,root);
  let scratch;
  try {
    beforeLaunch();
    const proposal=await propose(request,files,stop);
    checkBudget();
    scratch=mkdtempSync(path.join(getTempParent(),"unified-text-candidate-"));
    const candidate=materialize(request,files,proposal,scratch);
    checkPackageProfile(request);
    checkWorkspace(request.workspace);
    for (const edit of candidate.edits) checkCheckoutPath(root, edit.path, files.has(edit.path));
    need(hash(resultDir)===hash(checkResultDirectory(request.resultPolicy,root)),"Result directory changed");
    checkBudget();
    const artifact=JSON.stringify({schema:"unified.text-candidate.artifact.v1",assignment_digest:assignment.digest,
      workspace_revision:request.workspace.revision,mode:request.mode,reviewer:assignment.reviewer,review_status:"pending",...candidate});
    const name="candidate-"+randomUUID()+".json";
    writeFileSync(path.join(request.resultPolicy.directory,name),artifact,{flag:"wx",mode:0o600});
    const receipt={schema:"unified.text-candidate.receipt.v1",assignment_digest:assignment.digest,workspace_revision:request.workspace.revision,
      adapter:request.provider.adapter,mode:request.mode,reviewer:assignment.reviewer,review_status:"pending",
      package_sha256:request.packageProfile.sourceSha256,profile_sha256:hash(request.packageProfile),
      private_result:{name,sha256:sha256(artifact),bytes:Buffer.byteLength(artifact)},claim_sha256:invocation.receipt.claim_sha256};
    const receipt_sha256=hash(receipt);
    invocation.finish("completed",receipt_sha256);
    return {...receipt,receipt_sha256};
  } catch (error) {
    invocation.finish("failed",sha256(error instanceof Error?error.message:"failed"));
    throw new Error("Candidate attempt failed; inspect the ledger before considering a new offer", {cause:error});
  } finally {
    if (scratch) {
      getTempParent();
      rmSync(scratch,{recursive:true,force:true});
    }
  }
}

// Opens a completed private artifact for the person responsible for review.
// It has no code application, execution or contract closure effects.
export function readCandidateForReview({packet,request,receipt}) {
  hypervisor.validatePacket(packet);
  const assignment=hypervisor.currentAssignment(packet);
  need(assignment?.scope===candidateIdentity(request) && receipt?.assignment_digest===assignment.digest
    && receipt.reviewer===assignment.reviewer && receipt.workspace_revision===request.workspace.revision,
    "Receipt differs from candidate assignment");
  const {receipt_sha256,...body}=receipt;
  const ledger=inspectInvocation(request.invocationPolicy,assignment.digest);
  need(hash(body)===receipt_sha256 && ledger.state==="completed" && ledger.evidence_sha256===receipt_sha256,
    "Candidate receipt differs from completed attempt");
  checkResultDirectory(request.resultPolicy,request.workspace.root);
  const result=receipt.private_result;
  need(typeof result?.name==="string" && /^candidate-[0-9a-f-]{36}\.json$/.test(result.name),"Invalid candidate artifact name");
  const file=path.join(request.resultPolicy.directory,result.name);
  const stat=lstatSync(file);
  need(stat.isFile() && stat.uid===process.getuid() && (stat.mode & 0o777)===0o600
    && stat.size===result.bytes && stat.size<=request.limits.replyBytes*6+131072,"Private artifact identity or access changed");
  const bytes=readFileSync(file);
  need(sha256(bytes)===result.sha256,"Private artifact differs from receipt");
  return JSON.parse(bytes.toString("utf8"));
}
