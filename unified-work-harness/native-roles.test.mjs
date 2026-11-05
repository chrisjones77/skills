import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { packageInventory } from "./package.mjs";

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
