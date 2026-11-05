// Diagnostic for a synthetic smoke transcript, not an intake or execution gate.
// Never trim prose, extract a JSON substring, or repair a contradictory verdict.
export function checkReviewFinding(text) {
  const finding = JSON.parse(text);
  const keys = ["independent_reviewer", "other_blockers", "rejected_as_acceptance", "verdict"];
  if (!finding || typeof finding !== "object" || Array.isArray(finding) ||
      Object.keys(finding).length !== keys.length || !keys.every(k => Object.hasOwn(finding, k)))
    throw new Error("Expected the four review fields");
  const { independent_reviewer: reviewer, rejected_as_acceptance: rejected, other_blockers: blockers } = finding;
  const nonblank = s => typeof s === "string" && s.trim().length > 0;
  if (!(reviewer === null || nonblank(reviewer)) ||
      ![rejected, blockers].every(a => Array.isArray(a) && a.every(nonblank)))
    throw new Error("Malformed review evidence");
  const expected = reviewer !== null && !rejected.length && !blockers.length ? "REFER TO HUMAN REVIEW" : "HOLD";
  if (finding.verdict !== expected) throw new Error("Verdict contradicts the reported evidence");
  // A consistent record may still invent a reviewer or miss a prohibited effect.
  return finding;
}
