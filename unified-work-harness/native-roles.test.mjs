import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { packageInventory } from "./package.mjs";
import { checkReviewFinding } from "./examples/check-review-finding.mjs";

test("smoke diagnostic rejects a false hold, a missing reviewer field, trailing work and unsupported referrals", () => {
  const clean = { scope_boundaries: [], independent_reviewer: "reviewer-7", rejected_as_acceptance: [], other_blockers: [], verdict: "REFER TO HUMAN REVIEW" };
  assert.deepEqual(checkReviewFinding(JSON.stringify(clean)), clean);
  for (const delta of [{verdict:"HOLD"}, {independent_reviewer:undefined}, {independent_reviewer:null},
      {other_blockers:["capacity unknown"]}, {rejected_as_acceptance:["contact supplier"]}]) {
    assert.throws(() => checkReviewFinding(JSON.stringify({...clean, ...delta})));
  }
  assert.throws(() => checkReviewFinding(JSON.stringify(clean) + "\nThe answer is 42."));
  const block = "```json\n" + JSON.stringify(clean) + "\n```";
  assert.throws(() => checkReviewFinding(block), SyntaxError);
  assert.deepEqual(checkReviewFinding("\n" + JSON.stringify(clean, null, 2) + "\n"), clean);
  assert.throws(() => checkReviewFinding('{"independent_reviewer":null,' + JSON.stringify(clean).slice(1)));
  for (const extra of ["Explanation:\n" + block, block + "\nThe answer is 42.", block + "\n" + block])
    assert.throws(() => checkReviewFinding(extra));
  const blocked = {...clean, independent_reviewer:null, rejected_as_acceptance:["contact supplier"], verdict:"HOLD"};
  assert.deepEqual(checkReviewFinding(JSON.stringify(blocked)), blocked);
});

test("a compatible limit does not hold review, but an outcome that requires violating it does", () => {
  const base = {scope_boundaries:["Keep the original intact."], independent_reviewer:"R", rejected_as_acceptance:[], other_blockers:[], verdict:"REFER TO HUMAN REVIEW"};
  const check = delta => checkReviewFinding(JSON.stringify({...base, ...delta}));
  assert.deepEqual(check({}), base);
  assert.throws(() => check({verdict:"HOLD"}), /contradicts/);
  for (const key of ["other_blockers", "rejected_as_acceptance"])
    assert.throws(() => check({[key]:["keep the original intact"], verdict:"HOLD"}), /boundary alone/);
  assert.equal(check({other_blockers:["Replacing the original is required but the original must remain intact."], verdict:"HOLD"}).verdict, "HOLD");
  assert.throws(() => check({scope_boundaries:undefined}));
});

test("scope-conflict smoke requires the operative limit in the boundary field", () => {
  const cases = JSON.parse(readFileSync(new URL("./examples/native-review-cases.json", import.meta.url)));
  const fixture = cases.find(c => c.id === "scope-conflict");
  assert.ok(fixture.excerpt.includes(fixture.requiredScopeQuote));
  const check = scope_boundaries => checkReviewFinding(JSON.stringify({scope_boundaries,
    independent_reviewer:"Cy", rejected_as_acceptance:["email the vendor (outside the in chat only scope)"],
    other_blockers:[], verdict:"HOLD"}), fixture);
  for (const limits of [[], ["ten minutes available"], ["in chat"], ["in chat onlysometimes"]])
    assert.throws(() => check(limits), /required scope quotation/);
  assert.equal(check(["Compare the totals in chat only."]).verdict, "HOLD");
  assert.equal(check(["Chat-only comparison"]).verdict, "HOLD");
});

test("both native host templates are pinned and deliver the same excerpt-only review", () => {
  const { files } = packageInventory();
  const read = name => {
    const path = "native-roles/" + name;
    const bytes = readFileSync(new URL(path, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), files[path]);
    return bytes.toString("utf8");
  };
  const claude = read("uwh-reviewer.md");
  const codex = read("uwh_reviewer.toml");
  const [, frontmatter, instructions] = claude.split(/^---\n/gm);
  assert.deepEqual(frontmatter.trim().split("\n").map(line => line.split(": ")[0]), ["name","description","tools"]);
  assert.match(frontmatter, /^tools: \[\]$/m); // omission would inherit tools
  assert.match(frontmatter, /^name: uwh-reviewer$/m);
  assert.match(codex.split('"""')[0], /^name = "uwh_reviewer"\ndescription = "[^"\n]+"\ndeveloper_instructions = $/);
  assert.equal(codex.split('"""')[1].trim(), instructions.trim());
  // Do not let an added tool, hook, MCP server or other override silently expand the role.
  assert.deepEqual(codex.split('"""')[2].trim().split(/\n+/), [
    "[features]", "shell_tool = false", "apps = false", "plugins = false",
    "memories = false", "request_permissions_tool = false", "[skills]", "include_instructions = false",
  ]);
});
