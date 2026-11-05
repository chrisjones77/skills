// Attended coordination. All calls return new records. Persist the result only
// after the responsible person verifies the latest revision and actual actor.
import { hypervisor as h, inspectWorkIntake, sha256 } from "./bundle.mjs";

import { verifyIntakeForOffer } from "./intake.mjs";

function checkedReview(intake, review) {
  return verifyIntakeForOffer(JSON.stringify(intake), review, {recipient:intake.assignee.id,
    assigner:intake.accountableHuman, reviewer:intake.acceptance.reviewer, outcome:intake.outcome});
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048)
    throw new Error("Missing or oversized " + label);
}

function workspaceDigest(workspace) {
  const fields = ["root","identity","revision","status_digest"];
  if (!workspace || Object.keys(workspace).length !== fields.length ||
      !fields.every(key => Object.hasOwn(workspace,key))) throw new Error("Invalid attended workspace");
  const values = fields.map(key => {
    requireText(workspace[key],"workspace " + key);
    return workspace[key];
  });
  return sha256(JSON.stringify(values));
}

function offer(intake, review, id, workspace, purpose, previous) {
  const reviewed = checkedReview(intake,review);
  if (inspectWorkIntake(intake).intake_status !== "complete_for_review")
    throw new Error("Intake requires review before offer");
  if (!/^0x[1-9A-F]$/.test(purpose)) throw new Error("Invalid work purpose");
  const packet = h.createPacket({ id, objective: intake.outcome, owner: intake.assignee.id,
    mode: "Review", workspace, authorization: [...intake.authority.allowed], grantedBy: intake.accountableHuman });
  packet.authorization.prohibited = [...new Set([...packet.authorization.prohibited, ...intake.authority.prohibited])];
  if (packet.authorization.allowed.some(x => packet.authorization.prohibited.includes(x)))
    throw new Error("Conflicting authority");
  const scope = JSON.stringify({kind: "attended-coordination-v2", workspace_sha256:workspaceDigest(workspace), assignee_kind: intake.assignee.kind,
    intake_sha256: sha256(JSON.stringify(intake)), review_sha256: reviewed.review_sha256, predecessor_sha256: previous});
  return h.offerAssignment(packet, {scope, acceptanceEvidence: JSON.stringify(intake.acceptance.checks),
    engineeringPurpose: purpose, assigner: intake.accountableHuman, reviewer: intake.acceptance.reviewer});
}

export function offerCoordination({intake, review, id, workspace, purpose}) {
  const packet = offer(intake, review, id, workspace, purpose, null);
  return {schema_version: "attended-coordination.v1", predecessors: [], revisions: [], review:structuredClone(review), intake: structuredClone(intake), packet};
}

export function inspectCoordination(record) {
  if (record?.schema_version !== "attended-coordination.v1" || !Array.isArray(record.predecessors) || record.predecessors.length > 32)
    throw new Error("Invalid coordination record");
  let previous = null;
  const seen = new Set();
  for (const item of [...record.predecessors, record]) {
    h.validatePacket(item.packet);
    const a = h.currentAssignment(item.packet);
    if (!Array.isArray(item.revisions) || item.revisions.length !== item.packet.work_contract.assignments.length - 1 ||
        item.revisions.length > 64 || seen.has(a.digest)) throw new Error("Invalid coordination revision history");
    [...item.revisions, item].forEach(({intake,review,workspace}, index) => {
      const assignment = item.packet.work_contract.assignments[index];
      const bound = JSON.parse(assignment.scope);
      const offeredWorkspace = index === item.revisions.length ? item.packet.workspace : workspace;
      if (bound.kind !== "attended-coordination-v2" || bound.workspace_sha256 !== workspaceDigest(offeredWorkspace))
        throw new Error("Attended workspace is unbound or changed; a fresh offer and acceptance are required");
      const {review_sha256, ...body} = review;
      if (review_sha256 !== sha256(JSON.stringify(body)) || bound.review_sha256 !== review_sha256 ||
          review.disposition !== "clear" || review.holds?.length !== 0 || review.assessment.by !== intake.acceptance.reviewer ||
          body.intake_sha256 !== sha256(JSON.stringify(intake)) || bound.intake_sha256 !== body.intake_sha256 ||
          bound.predecessor_sha256 !== previous ||
          bound.assignee_kind !== intake.assignee.kind || assignment.recipient !== intake.assignee.id ||
          assignment.outcome !== intake.outcome || assignment.assigner !== intake.accountableHuman ||
          assignment.reviewer !== intake.acceptance.reviewer || assignment.acceptance_evidence !== JSON.stringify(intake.acceptance.checks) ||
          assignment.authority.granted_by !== intake.accountableHuman ||
          JSON.stringify(assignment.authority.allowed) !== JSON.stringify(intake.authority.allowed) ||
          !intake.authority.prohibited.every(effect => assignment.authority.prohibited.includes(effect)))
        throw new Error("Coordination identity mismatch");
    });
    if (item !== record && (item.packet.work_contract.disposition !== "withdrawn" ||
        item.packet.handoff.current_writer || item.packet.clarifications?.some(c => c.status !== "resolved")))
      throw new Error("Transferred work must retain its stopped predecessor");
    seen.add(a.digest);
    previous = sha256(JSON.stringify({intake:item.intake,review:item.review,revisions:item.revisions,packet:item.packet}));
  }
  return {assignmentDigest:h.currentAssignment(record.packet).digest, assigneeKind:record.intake.assignee.kind,
    review:record.packet.work_contract.review.status, execution_authorized:false};
}

export function respond(record, action, options) {
  const { assignmentDigest } = inspectCoordination(record);
  if (options.assignmentDigest !== assignmentDigest) throw new Error("Stale assignment");
  const p = record.packet;
  const a = h.currentAssignment(p);
  const by = options.by;
  if (p.status === "complete") throw new Error("Work is closed");
  if (["accept","resume"].includes(action)) checkedReview(record.intake,record.review);
  let packet;
  if (action === "accept") packet = h.acceptAssignment(p, options);
  else if (["declined","deferred","withdrawn","timeout"].includes(action))
    packet = h.recordDisposition(p, {...options,decision:action});
  else if (action === "clarify") {
    if (by !== a.recipient) throw new Error("Only the recipient raises this clarification");
    packet = h.requestClarification(p,{...options,assigner:a.assigner});
  } else if (action === "answer") packet = h.answerClarification(p,options);
  else if (action === "reassess") packet = h.reassessClarification(p,options);
  else if (action === "reroute") packet = h.routeClarification(p,options);
  else if (["submit","rework","approve","close"].includes(action)) {
    if (action === "submit" && p.status !== "active") throw new Error("Resume before submitting");
    packet = h.reviewWork(p,{...options,decision: action === "approve" ? "accept" : action});
  } else if (["pause","resume"].includes(action)) {
    if (by !== a.recipient || p.work_contract.disposition !== "accepted" ||
        !["pending","rework"].includes(p.work_contract.review.status) ||
        (action === "resume" && (p.status !== "paused" || p.clarifications?.some(c => c.status !== "resolved"))) ||
        (action === "pause" && p.status !== "active")) throw new Error("Unavailable transition");
    requireText(options.note,"checkpoint note");
    packet = structuredClone(p);
    packet.status = action === "pause" ? "paused" : "active";
    packet.handoff.current_writer = action === "pause" ? null : by;
    packet.checkpoints.push({kind:action === "pause" ? "paused" : "resumed",owner:by,
      workspace:p.workspace.identity,note:options.note,at:new Date().toISOString(),reconciled:false});
  } else throw new Error("Unknown coordination action");
  const next = {...structuredClone(record),packet};
  inspectCoordination(next);
  return next;
}

export function handoff(record, {assignmentDigest, by, note, intake, review}) {
  const a = h.currentAssignment(record.packet);
  if (inspectCoordination(record).assignmentDigest !== assignmentDigest || by !== a.assigner ||
      record.packet.status !== "paused" || record.packet.clarifications?.some(c => c.status !== "resolved") ||
      record.packet.work_contract.review.status !== "pending" || a.recipient === intake.assignee.id ||
      intake.accountableHuman !== a.assigner || record.predecessors.length >= 32)
    throw new Error("Handoff requires paused, undisputed work and a new named recipient");
  const stopped = respond(record,"withdrawn",{assignmentDigest,by,note,checkpoint:"Obtain explicit successor acceptance."});
  const prior = {intake:stopped.intake,review:stopped.review,revisions:stopped.revisions,packet:stopped.packet};
  const packet = offer(intake, review, prior.packet.task_id, prior.packet.workspace, a.engineering_purpose, sha256(JSON.stringify(prior)));
  const next = {schema_version:record.schema_version,predecessors:[...stopped.predecessors,prior],revisions:[],review:structuredClone(review),intake:structuredClone(intake),packet};
  inspectCoordination(next);
  return next;
}

// A revised offer preserves the worker's concern and review history. Role or
// authority changes go through an explicit handoff or a separate owner decision.
export function reoffer(record, {by, assignmentDigest, note, intake, review, workspace = record.packet.workspace}) {
  if (inspectCoordination(record).assignmentDigest !== assignmentDigest ||
      inspectWorkIntake(intake).intake_status !== "complete_for_review") throw new Error("Stale or held reoffer");
  for (const key of ["assignee","accountableHuman","authority"]) {
    if (JSON.stringify(intake[key]) !== JSON.stringify(record.intake[key])) throw new Error("Role or authority changed");
  }
  if (intake.acceptance.reviewer !== record.intake.acceptance.reviewer) throw new Error("Reviewer changed");
  const a = h.currentAssignment(record.packet);
  const scope = JSON.stringify({...JSON.parse(a.scope),workspace_sha256:workspaceDigest(workspace),review_sha256:checkedReview(intake,review).review_sha256,intake_sha256:sha256(JSON.stringify(intake))});
  const packet = h.reviseAssignment(record.packet,{by,note,outcome:intake.outcome,scope,
    acceptanceEvidence:JSON.stringify(intake.acceptance.checks)});
  packet.workspace = structuredClone(workspace);
  const next = {...structuredClone(record),packet,revisions:[...structuredClone(record.revisions),{intake:structuredClone(record.intake),review:structuredClone(record.review),workspace:structuredClone(record.packet.workspace)}],review:structuredClone(review),intake:structuredClone(intake)};
  inspectCoordination(next);
  return next;
}
