// Diagnostic for a synthetic smoke transcript, not an intake or execution gate.
// Accept one whole JSON record, optionally displayed as a standalone JSON block.
// Never trim prose, extract a record from a narrative, or repair its verdict.
export function checkReviewFinding(text) {
  if (typeof text !== "string") throw new TypeError("Expected the complete child response");
  const fenced = /^```json\r?\n([\s\S]*)\r?\n```$/u.exec(text.trim());
  const body = fenced ? fenced[1] : text;
  const finding = JSON.parse(body);
  const keys = ["independent_reviewer", "other_blockers", "rejected_as_acceptance", "verdict"];
  // This record has no nested objects. Count member names before accepting
  // JSON.parse's last-value-wins interpretation of duplicate evidence fields.
  const memberCount = [...body.matchAll(/"(?:\\.|[^"\\])*"(\s*:)?/gu)].filter(m => m[1]).length;
  if (!finding || typeof finding !== "object" || Array.isArray(finding) ||
      memberCount !== keys.length || !keys.every(k => Object.hasOwn(finding, k)))
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
