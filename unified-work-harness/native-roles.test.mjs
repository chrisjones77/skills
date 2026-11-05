import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { packageInventory } from "./package.mjs";
import { checkReviewFinding } from "./examples/check-review-finding.mjs";

test("smoke diagnostic rejects a false hold, a missing reviewer field, trailing work and unsupported referrals", () => {
  const clean = { independent_reviewer: "reviewer-7", rejected_as_acceptance: [], other_blockers: [], verdict: "REFER TO HUMAN REVIEW" };
  assert.deepEqual(checkReviewFinding(JSON.stringify(clean)), clean);
  for (const delta of [{verdict:"HOLD"}, {independent_reviewer:undefined}, {independent_reviewer:null},
      {other_blockers:["capacity unknown"]}, {rejected_as_acceptance:["contact supplier"]}]) {
    assert.throws(() => checkReviewFinding(JSON.stringify({...clean, ...delta})));
  }
  assert.throws(() => checkReviewFinding(JSON.stringify(clean) + "\nThe answer is 42."));
  const blocked = {...clean, independent_reviewer:null, rejected_as_acceptance:["contact supplier"], verdict:"HOLD"};
  assert.deepEqual(checkReviewFinding(JSON.stringify(blocked)), blocked);
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
