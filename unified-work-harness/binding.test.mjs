import test from "node:test";
import assert from "node:assert/strict";
import { buildDraftBinding, verifyDraftBinding, inspectBundledSource, sha256, inspectExecutionWindow } from "./bundle.mjs";

test("execution windows use exact UTC instants with inclusive start and exclusive expiry", () => {
  const window = {not_before:"2026-01-01T00:00:00.000Z",expires_at:"2026-01-01T01:00:00.000Z"};
  assert.equal(inspectExecutionWindow(window,Date.parse(window.not_before)-1).state,"not_yet_valid");
  assert.equal(inspectExecutionWindow(window,Date.parse(window.not_before)).state,"within_window");
  assert.equal(inspectExecutionWindow(window,Date.parse(window.expires_at)-1).state,"within_window");
  assert.equal(inspectExecutionWindow(window,Date.parse(window.expires_at)).state,"expired");
  assert.equal(inspectExecutionWindow(window,Date.parse(window.not_before)).execution_authorized,false);
  for (const not_before of ["tomorrow", "2026-02-30T00:00:00.000Z", "2026-01-01T00:00:00Z",window.expires_at]) assert.throws(()=>inspectExecutionWindow({...window,not_before}),/Invalid execution window/);
});

function fixture() {
  const intake = {
    outcome: "Review private-canary source criteria.", exclusions: ["No edits"],
    assignee: { kind: "agent", id: "recipient-private-canary" }, accountableHuman: "owner",
    authority: { allowed: ["execute-read-only"], prohibited: ["write-source", "external-network"] }, dataClass: "public",
    resources: { effortMinutes: 10, deadline: "none", dependencies: [], reviewerAvailability: "available" },
    acceptance: { checks: ["Confirm the source criterion"], reviewer: "reviewer" },
    escalation: { stopConditions: ["Unclear scope"], contact: "owner", mayPause: true }, concerns: [],
  };
  const assignment = {
    schema_version: "unified-harness.agent-assignment.v1", assignment_id: "assignment_binding_test",
    outcome: intake.outcome, exclusions: intake.exclusions,
    assignee: { type: "agent", provider: "mlx", model_id: "synthetic/test", processing: "local", accountable_human: "owner" },
    authority: { mode: "read_only", allowed_read_paths: ["source.txt"], allowed_paths: [], allow_test_changes: false },
    data: { classification: "public", contains_sensitive_personal_data: false, contains_secrets: false, external_processing_allowed: false },
    resources: { base_ref: "a".repeat(40), timeout_seconds: 30, max_steps: 4, max_output_bytes: 4096 },
    supervision: { priority: "normal", target_date: null, available_effort_minutes: 10, dependencies: [], decision_owner: "owner", may_pause: true, feedback_route: "Ask owner" },
    acceptance: { checks: [{ command: "node", args: ["--version"], timeout_seconds: 10, expected_result: "zero" }], reviewer: "reviewer", require_changes: false },
    escalation: { stop_conditions: ["Unclear scope"], contact: "owner" },
  };
  return {
    profileJson: JSON.stringify({ primary: "0xB", companions: ["0xC"], requiredCapabilities: ["readonly_roundtrip"], effectCeiling: ["read", "write", "provider", "git", "network"], sourceSha256: inspectBundledSource().sha256 }),
    intakeJson: JSON.stringify(intake), assignmentJson: JSON.stringify(assignment),
    workspaceJson: JSON.stringify({ root: "/synthetic", identity: "/synthetic#main", revision: "a".repeat(40), status_digest: sha256("") }),
  };
}
function change(inputs, key, mutate) {
  const result = { ...inputs }, value = JSON.parse(result[key]);
  mutate(value);
  result[key] = JSON.stringify(value);
  return result;
}

test("draft binding is deterministic, non-mutating and contains no raw request content", () => {
  const inputs = fixture(), before = JSON.stringify(inputs);
  Object.freeze(inputs);
  const binding = buildDraftBinding(inputs);
  assert.deepEqual(buildDraftBinding(inputs), binding);
  assert.equal(verifyDraftBinding(binding, inputs), true);
  assert.equal(JSON.stringify(inputs), before);
  assert.equal(binding.execution_authorized, false);
  assert.equal(binding.recipient_acceptance, "not_recorded");
  assert.equal(binding.workspace_status, "declared_not_verified");
  assert.equal(binding.assignment_sha256, sha256(inputs.assignmentJson));
  for (const raw of ["private-canary", "/synthetic", "source.txt"]) assert.ok(!JSON.stringify(binding).includes(raw));
});

test("every record and bound identity change invalidates an earlier draft", () => {
  const inputs = fixture(), binding = buildDraftBinding(inputs);
  const mutations = [
    ["profileJson", p => { p.primary = "0xC"; p.companions = []; }],
    ["profileJson", p => { p.effectCeiling.push("dispatch"); }],
    ["intakeJson", i => { i.assignee.id = "new-recipient"; }],
    ["intakeJson", i => { i.acceptance.checks = ["New review criterion"]; }],
    ["assignmentJson", a => { a.authority.allowed_read_paths = ["other.txt"]; }],
    ["workspaceJson", w => { w.identity = "/synthetic#other"; }],
    ["workspaceJson", w => { w.revision = "b".repeat(40); }],
    ["assignmentJson", a => { a.acceptance.reviewer = "another"; }],
    ["profileJson", p => { p.sourceSha256 = "0".repeat(64); }],
  ];
  for (const [key, mutate] of mutations) assert.throws(() => verifyDraftBinding(binding, change(inputs, key, mutate)), /Draft binding rejected/);
  assert.throws(() => verifyDraftBinding({ ...binding, execution_authorized: true }, inputs), /record mismatch/);
});

test("held intake, ambiguous mappings and unsupported execution modes fail closed", () => {
  const inputs = fixture();
  const mutations = [
    ["intakeJson", i => { i.concerns = ["private-canary concern"]; }],
    ["intakeJson", i => { i.assignee.kind = "human"; }],
    ["intakeJson", i => { i.assignee.kind = "hybrid"; }],
    ["intakeJson", i => { i.resources.reviewerAvailability = "unknown"; }],
    ["intakeJson", i => { i.resources.effortMinutes = 20; }],
    ["intakeJson", i => { i.resources.deadline = "2027-02-30"; }],
    ["intakeJson", i => { i.authority.allowed = ["read"]; }],
    ["intakeJson", i => { i.outcome += " changed"; }],
    ["assignmentJson", a => { a.acceptance.require_changes = true; }],
    ["assignmentJson", a => { a.escalation.stop_conditions = ["Different stop"]; }],
    ["profileJson", p => { p.effectCeiling = ["read"]; }],
    ["profileJson", p => { p.requiredCapabilities = ["purpose_selection"]; }],
    ["workspaceJson", w => { w.status_digest = "0".repeat(64); }],
  ];
  for (const [key, mutate] of mutations) assert.throws(() => buildDraftBinding(change(inputs, key, mutate)), { message: "Draft binding rejected: invalid, held, or inconsistent inputs." });
  for (const value of [inputs.intakeJson + "\n", '{"secret":"private-canary","secret":2}', "invalid private-canary"]) {
    assert.throws(() => buildDraftBinding({ ...inputs, intakeJson: value }), { message: "Draft binding rejected: invalid, held, or inconsistent inputs." });
  }
  assert.throws(() => buildDraftBinding({ ...inputs, acceptance: true }), /Draft binding rejected/);
});
