import { DatabaseSync } from 'node:sqlite';
import { inspectCoordination, respond } from './coordination.mjs';
import { verifyIntakeForOffer } from './intake.mjs';
import { fork } from 'node:child_process';
import { closeSync, lstatSync, openSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertOutsideSource, buildDraftBinding, contractRoundtrip, isQueueWorkerProcess, hypervisor, inspectExecutionWindow, inspectInvocation, sha256 } from './bundle.mjs';

const record = value => value && typeof value === 'object' && !Array.isArray(value);
const bounded = value => typeof value === 'string' && value.trim() && value.length <= 4096;
const positive = (n, maximum) => Number.isSafeInteger(n) && n > 0 && n <= maximum;
const digest = value => sha256(JSON.stringify(value));

export function proposeGoal({ objective, owner, stopConditions, tasks, selectedIds }) {
  if (![objective, owner].every(bounded) || !Array.isArray(stopConditions) ||
      !positive(stopConditions.length, 32) || !stopConditions.every(bounded)) throw Error('Goal needs an owner, objective and stop conditions.');
  if (!Array.isArray(tasks) || !positive(tasks.length, 100) ||
      !Array.isArray(selectedIds) || !positive(selectedIds.length, 100) ||
      new Set(selectedIds).size !== selectedIds.length) throw Error('Select distinct tasks explicitly.');
  const candidates = new Map();
  for (const task of tasks) {
    if (!record(task) || typeof task.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(task.id) ||
        !bounded(task.outcome) || candidates.has(task.id)) throw Error('Invalid or duplicate task.');
    candidates.set(task.id, { id: task.id, outcome: task.outcome });
  }
  const selected = selectedIds.map(id => {
    if (!candidates.has(id)) throw Error('Selected task missing.');
    return candidates.get(id);
  });
  return {objective, owner, stopConditions: [...stopConditions], selected, execution_authorized: false};
}

function inspectContract(packet) {
  hypervisor.validatePacket(packet);
  const offer = hypervisor.currentAssignment(packet);
  const scope = JSON.parse(offer.scope);
  if (!['unified-harness-readonly-v5', 'unified-harness-readonly-v6'].includes(scope.kind) ||
      packet.work_contract.acceptance?.assignment_digest !== offer.digest ||
      packet.work_contract.disposition !== 'accepted' || packet.status !== 'active' ||
      packet.handoff.current_writer !== offer.recipient || packet.checkpoints.at(-1)?.kind !== 'resumed' ||
      packet.handoff.pending_transfer || packet.clarifications?.some(c => c.status !== 'resolved') ||
      !['pending', 'rework'].includes(packet.work_contract.review.status)) throw Error('Accepted, resumed v5 or v6 contract required.');
  return {offer, scope};
}

function databasePath(directory) {
  const dir = lstatSync(directory);
  if (!process.getuid || !dir.isDirectory() || dir.uid !== process.getuid() ||
      (dir.mode & 0o777) !== 0o700 || realpathSync.native(directory) !== directory) throw Error('Queue requires a canonical owner-only directory.');
  return path.join(directory, 'queue.sqlite');
}

function withDatabase(directory, fn, readOnly = false) {
  const file = databasePath(directory);
  const st = lstatSync(file);
  if (!st.isFile() || st.nlink !== 1 || st.uid !== process.getuid() || (st.mode & 0o777) !== 0o600) throw Error('Unsafe queue file.');
  const db = new DatabaseSync(file, {readOnly});
  try {
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA busy_timeout=3000;');
    db.exec(readOnly ? 'BEGIN' : 'PRAGMA synchronous=FULL; BEGIN IMMEDIATE');
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } finally { db.close(); } // Closing rolls back an incomplete transaction.
}

function validDate(date) {
  return typeof date === 'string' && Number.isFinite(Date.parse(date)) && new Date(date).toISOString() === date;
}

function privateRecordBytes(item) {
  const bytes = JSON.stringify(item);
  if (Buffer.byteLength(bytes) > 1048576) throw Error('Attended record exceeds the private storage budget.');
  return bytes;
}

function admitJob(item) {
  if (item?.schema_version !== 'attended-coordination.v1') {
    const {offer,scope} = inspectContract(item);
    return {offer,packet:item,expires:scope.execution_window.expires_at,state:'queued'};
  }
  const {assigneeKind} = inspectCoordination(item);
  const {packet,intake,review} = item;
  const offer = hypervisor.currentAssignment(packet);
  if (!['human','hybrid'].includes(assigneeKind) || packet.work_contract.disposition !== 'offered' ||
      packet.status !== 'paused' || packet.handoff.current_writer ||
      packet.handoff.pending_transfer || packet.work_contract.review.status !== 'pending' ||
      offer.recipient === offer.reviewer) throw Error('An attended job requires a paused human or hybrid offer and a separate reviewer.');
  const checked = verifyIntakeForOffer(JSON.stringify(intake), review, {
    recipient:offer.recipient,assigner:offer.assigner,reviewer:offer.reviewer,outcome:offer.outcome,
  });
  return {offer,packet,expires:checked.expires_at,state:'attended_offered',privateRecord:privateRecordBytes(item)};
}

export function createQueue(directory, {goal, packets, deadline, providerBudgets = {}}) {
  const proposal = proposeGoal(goal);
  if (!validDate(deadline) || Date.parse(deadline) <= Date.now()) throw Error('Queue deadline must be a future UTC instant.');
  if (!Array.isArray(packets) || packets.length !== proposal.selected.length || !record(providerBudgets)) throw Error('One accepted packet per selected task and explicit provider budgets required.');
  const budgets = Object.entries(providerBudgets);
  if (budgets.some(([lane, budget]) =>
    !['mlx','ollama','llamacpp'].includes(lane) || !positive(budget?.attempts,100) || !positive(budget.workerSeconds,86400))) throw Error('Invalid local provider budgets.');
  const jobs = packets.map((item,i) => {
    const job = admitJob(item);
    const {offer,packet} = job;
    const selected = proposal.selected[i];
    if (selected.id !== offer.work_id || selected.outcome !== offer.outcome || offer.assigner !== proposal.owner) throw Error('Selected task and owner must match the accepted offer.');
    assertOutsideSource(directory, packet.workspace.root);
    return job;
  });
  if (!budgets.length && jobs.some(job => !job.privateRecord)) throw Error('Provider jobs require explicit provider budgets.');
  // Exclusive creation prevents reinitialization. If initialization is interrupted, preserve the database for review.
  const file = databasePath(directory);
  closeSync(openSync(file,'wx',0o600));
  return withDatabase(directory, db => {
    db.exec(`CREATE TABLE policy (goal TEXT, owner TEXT, deadline TEXT, stopped INTEGER);
      CREATE TABLE jobs (seq INTEGER PRIMARY KEY, digest TEXT UNIQUE, reviewer TEXT, expires TEXT, state TEXT, receipt TEXT, evidence TEXT, reconciliation TEXT);
      CREATE TABLE attended (digest TEXT PRIMARY KEY, revision TEXT, body TEXT);
      CREATE TABLE budgets (lane TEXT PRIMARY KEY, attempts INTEGER, seconds INTEGER);`);
    db.prepare('INSERT INTO policy VALUES (?,?,?,0)').run(digest(proposal),digest(proposal.owner),deadline);
    const add = db.prepare('INSERT INTO jobs (digest,reviewer,expires,state) VALUES (?,?,?,?)');
    const preserve = db.prepare('INSERT INTO attended VALUES (?,?,?)');
    for (const job of jobs) {
      add.run(job.offer.digest,digest(job.offer.reviewer),job.expires,job.state);
      if (job.privateRecord) preserve.run(job.offer.digest,sha256(job.privateRecord),job.privateRecord);
    }
    for (const [lane, budget] of budgets) db.prepare('INSERT INTO budgets VALUES (?,?,?)').run(lane,budget.attempts,budget.workerSeconds);
    return {goal_sha256:digest(proposal), queued:jobs.length};
  });
}

export function inspectQueue(directory) {
  return withDatabase(directory, db => ({
    ...db.prepare('SELECT goal,deadline,stopped FROM policy').get(),
    jobs:db.prepare('SELECT seq,digest,state,receipt,evidence,reconciliation FROM jobs ORDER BY seq').all(),
    remaining:db.prepare('SELECT * FROM budgets ORDER BY lane').all(),
  }), true);
}

function stopRemaining(db) {
  db.exec("UPDATE policy SET stopped=1; UPDATE jobs SET state='cancelled' WHERE state='queued' OR state GLOB 'attended_*'");
}

function currentAttended(db, assignmentDigest) {
  const row = db.prepare('SELECT body,revision FROM attended WHERE digest=?').get(assignmentDigest);
  if (!row || sha256(row.body) !== row.revision) throw Error('Missing or inconsistent attended record.');
  const record = JSON.parse(row.body);
  if (inspectCoordination(record).assignmentDigest !== assignmentDigest) throw Error('Attended assignment differs from queue.');
  return {record,revision:row.revision};
}

// Explicitly returns the private source and response history. inspectQueue returns metadata.
export function readAttended(directory, assignmentDigest) {
  return withDatabase(directory, db => currentAttended(db,assignmentDigest), true);
}

const attendedStates = {
  accept:'attended_accepted', resume:'attended_active', pause:'attended_paused',
  submit:'attended_submitted', rework:'attended_rework', approve:'attended_approved', close:'reviewed',
  clarify:'attended_clarification', answer:'attended_clarification', reroute:'attended_clarification',
  declined:'declined', withdrawn:'withdrawn', deferred:'deferred', timeout:'timed_out',
};
const stoppingResponses = new Set(['declined','withdrawn','deferred','timeout']);

// The host authenticates a real response. Never call this on a person's behalf automatically.
export function respondAttended(directory, {assignmentDigest,revision,action,by,...details}) {
  if (!Object.hasOwn(attendedStates,action) && action !== 'reassess') throw Error('Unknown attended response.');
  if (!bounded(by) || Object.keys(details).some(key => !['note','evidence','checkpoint','concernId','question','human','answer','responseDigest','decision'].includes(key)))
    throw Error('Invalid attended response fields.');
  const outcome = withDatabase(directory, db => {
    const policy = db.prepare('SELECT stopped,deadline FROM policy').get();
    if (policy.stopped) throw Error('Queue stopped.');
    const job = db.prepare("SELECT * FROM jobs WHERE state!='reviewed' ORDER BY seq LIMIT 1").get();
    if (job?.digest !== assignmentDigest || !job.state.startsWith('attended_')) throw Error('Attended job is unavailable or out of order.');
    const current = currentAttended(db,assignmentDigest);
    if (current.revision !== revision) throw Error('Stale attended response.');
    if (Date.now() >= Math.min(Date.parse(job.expires),Date.parse(policy.deadline))) {
      db.prepare("UPDATE jobs SET state='expired' WHERE digest=?").run(assignmentDigest);
      stopRemaining(db);
      return {hold:'Queue or attended review expired.'};
    }
    const next = respond(current.record,action,{...details,by,assignmentDigest});
    const bytes = privateRecordBytes(next);
    const nextRevision = sha256(bytes);
    const state = action === 'reassess'
      ? (next.packet.clarifications.some(c => c.status !== 'resolved') ? 'attended_clarification' : 'attended_paused')
      : attendedStates[action];
    db.prepare('UPDATE attended SET body=?,revision=? WHERE digest=?').run(bytes,nextRevision,assignmentDigest);
    db.prepare('UPDATE jobs SET state=?,evidence=? WHERE digest=?').run(state,nextRevision,assignmentDigest);
    if (stoppingResponses.has(action)) stopRemaining(db);
    return {state,revision:nextRevision};
  });
  if (outcome.hold) throw Error(outcome.hold);
  return outcome;
}

export function stopQueue(directory) {
  withDatabase(directory, db => {
    stopRemaining(db);
  });
}

// An operator may reconcile an interrupted supervision process after independently checking its state.
// Every recovery keeps the consumed queue reservation and v5 ledger claim.
export function reconcileInterrupted(directory, {packet, owner, evidenceHash, supervisorExited}) {
  if (supervisorExited !== true || !bounded(owner) || typeof evidenceHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(evidenceHash)) throw Error('Reconciliation requires an owner and evidence of supervisor exit.');
  const {offer,scope} = inspectContract(packet);
  return withDatabase(directory, db => {
    const policy = db.prepare('SELECT owner FROM policy').get();
    const job = db.prepare('SELECT state FROM jobs WHERE digest=?').get(offer.digest);
    if (policy.owner !== digest(owner) || job?.state !== 'running') throw Error('No matching interrupted attempt.');
    const observation = inspectInvocation(scope.invocation_policy,offer.digest);
    // Ledger records identify the accepted offer, but any dispatcher may have claimed it.
    // Without a receipt delivered by this supervisor, we cannot attribute that attempt.
    db.prepare("UPDATE jobs SET state='reconciliation_required',reconciliation=? WHERE digest=?").run(evidenceHash,offer.digest);
    stopRemaining(db);
    return {state:'reconciliation_required', invocation_state:observation.state};
  });
}

export function reviewCandidate(directory, {assignmentDigest, reviewer, receiptHash, evidenceHash, accept}) {
  if (!bounded(reviewer) || ![assignmentDigest,receiptHash,evidenceHash].every(v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)) || typeof accept !== 'boolean') throw Error('Review requires exact hashes, reviewer and decision.');
  withDatabase(directory, db => {
    const r = db.prepare("UPDATE jobs SET state=?,evidence=? WHERE digest=? AND reviewer=? AND state='pending_review' AND receipt=?")
      .run(accept ? 'reviewed' : 'rejected', evidenceHash, assignmentDigest, digest(reviewer),receiptHash);
    if (!r.changes) throw Error('Review does not match the pending candidate.');
    if (!accept) stopRemaining(db);
  });
}

function reserve(directory, options) {
  const {offer,scope} = inspectContract(options.packet);
  if ((options.packagePolicy !== undefined) !== (scope.kind === 'unified-harness-readonly-v6')) throw Error('Package policy differs from the selected contract version.');
  const binding = buildDraftBinding(options.bindingInputs);
  if (binding.binding_sha256 !== scope.binding_sha256) throw Error('Dispatch profile differs from the accepted binding.');
  const profile = JSON.parse(options.bindingInputs.profileJson);
  if (!profile.effectCeiling?.includes('dispatch') || !profile.requestedEffects?.includes('dispatch'))
    throw Error('Queue dispatch must be explicitly requested within the accepted effect ceiling.');
  if (options.packagePolicy && (!options.packagePolicy.profileRequest?.requiredCapabilities?.includes('sequential_queue')
      || digest(options.packagePolicy.profileRequest) !== scope.package_binding?.profile_sha256))
    throw Error('Package dispatch requires its pinned sequential queue capability.');
  const worker = JSON.parse(options.bindingInputs.assignmentJson);
  if (sha256(options.bindingInputs.assignmentJson) !== scope.assignment_sha256 ||
      !positive(worker.resources?.timeout_seconds,86400)) throw Error('Assignment differs from approved scope.');
  const reservation = worker.resources.timeout_seconds;
  return withDatabase(directory, db => {
    const policy = db.prepare('SELECT * FROM policy').get();
    if (policy.stopped) throw Error('Queue stopped.');
    const job = db.prepare("SELECT * FROM jobs WHERE state!='reviewed' ORDER BY seq LIMIT 1").get();
    if (!job || job.digest !== offer.digest || job.state !== 'queued') throw Error('Job is unavailable, out of order, running or awaiting review.');
    if (Date.now() >= Date.parse(policy.deadline) || Date.now() >= Date.parse(job.expires)) {
      db.prepare("UPDATE jobs SET state='expired' WHERE digest=?").run(job.digest);
      stopRemaining(db);
      return {hold:'Queue or assignment expired.'};
    }
    if (inspectExecutionWindow(scope.execution_window).state !== 'within_window') throw Error('Execution window has not opened.');
    const charge = db.prepare('UPDATE budgets SET attempts=attempts-1,seconds=seconds-? WHERE lane=? AND attempts>0 AND seconds>=?')
      .run(reservation,worker.assignee.provider,reservation);
    if (!charge.changes) throw Error('Insufficient provider budget.');
    db.prepare("UPDATE jobs SET state='running' WHERE digest=?").run(job.digest);
    const version = scope.kind.slice(-2);
    return {job:job.digest, receiptSchema:'unified.contract-executor-receipt.'+version, deadline:Math.min(Date.parse(policy.deadline),Date.now()+reservation*1000), reservation};
  });
}

const fields = new Set(['packet','assignmentPath','endpoint','bindingInputs','resultPolicy','invocationPolicy','executionWindow','packagePolicy']);
const workerArg = '--accepted-queue-job';
const self = fileURLToPath(import.meta.url);
function terminateGroup(pid) {
  try { process.kill(-pid,'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') throw e; }
}

function runSupervised(directory, options, claim) {
  return new Promise((resolve,reject) => {
    // No caller-supplied code hooks/Node options cross this boundary. The executable PATH is an operator prerequisite.
    const child = fork(self,[workerArg],{detached:true, execArgv:[], stdio:['ignore','ignore','ignore','ipc'],
      env:{PATH:process.env.PATH, HOME:process.env.HOME, LANG:'C', TMPDIR:process.env.TMPDIR}});
    let receipt, failure;
    const started = performance.now();
    function cancel(reason) {
      failure = reason;
      if (child.pid) {
        try { terminateGroup(child.pid); }
        catch { failure = 'Could not terminate the queue worker process group.'; }
      }
    }
    function check() {
      try {
        if (Date.now() >= claim.deadline || performance.now()-started >= claim.reservation*1000) cancel('Queue time budget ended.');
        else if (withDatabase(directory, db => db.prepare('SELECT stopped FROM policy').get().stopped, true)) cancel('Queue stopped during dispatch.');
      } catch { cancel('Queue no longer available.'); }
    }
    const monitor = setInterval(check,100);
    child.on('message', msg => {
      if (msg?.ok && msg.receipt?.assignment_digest === claim.job && msg.receipt?.schema_version === claim.receiptSchema) receipt = msg.receipt;
    });
    child.on('error', () => { cancel('Could not start queue worker.'); });
    // The supervisor owns this POSIX group. A worker can return a valid reply
    // while a non-detached helper is still running. End the group on every
    // exit, before the close handler can publish the receipt or report failure.
    child.once('exit', () => {
      clearInterval(monitor);
      try { terminateGroup(child.pid); }
      catch { failure = 'Could not terminate the queue worker process group.'; }
    });
    child.once('close', code => {
      clearInterval(monitor);
      if (code !== 0 || !receipt || failure) reject(Error(failure || 'Contract dispatch failed; inspect the accepted ledger.'));
      else resolve(receipt);
    });
    check();
    if (!failure) child.send(options, err => { if (err) cancel('Queue worker channel failed.'); });
  });
}

export async function dispatchNext(directory, envelope) {
  if (!record(envelope) || Object.keys(envelope).some(key => !fields.has(key))) throw Error('Queue accepts only the documented contract fields.');
  const options = structuredClone(envelope);
  const claim = reserve(directory,options);
  if (claim.hold) throw Error(claim.hold);
  try {
    const receipt = await runSupervised(directory,options,claim);
    const recorded = withDatabase(directory, db => {
      const policy = db.prepare('SELECT stopped,deadline FROM policy').get();
      if (policy.stopped || Date.now() >= claim.deadline) return false;
      db.prepare("UPDATE jobs SET state='pending_review',receipt=? WHERE digest=? AND state='running'").run(receipt.receipt_sha256,claim.job);
      return true;
    });
    if (!recorded) throw Error('Candidate returned after cancellation or deadline; reconcile ledger.');
    return receipt;
  } catch (error) {
    withDatabase(directory, db => {
      db.prepare("UPDATE jobs SET state='failed' WHERE digest=? AND state='running'").run(claim.job);
      stopRemaining(db);
    });
    throw error;
  }
}

if (isQueueWorkerProcess()) {
  process.once('disconnect', () => terminateGroup(process.pid));
  process.once('message', async options => {
    try {
      if (!record(options) || Object.keys(options).some(key => !fields.has(key))) throw Error('Unexpected contract fields.');
      inspectContract(options.packet);
      const receipt = await contractRoundtrip(options);
      process.send({ok:true, receipt}, err => process.exit(err ? 1 : 0));
    } catch { process.exit(1); }
  });
}
