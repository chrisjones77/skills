import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listWorkCapabilities } from "./bundle.mjs";

test("delivery checklist covers every runtime capability with its actual status", () => {
  const text = readFileSync(new URL("./delivery-checklist.md",import.meta.url),"utf8");
  const documented = [...text.matchAll(/^\| `([^`]+)` \| (implemented|partial|planned) \|/gm)].map(match=>({name:match[1],status:match[2]}));
  const current = listWorkCapabilities().map(({name,status})=>({name,status}));
  const byName = (a,b) => a.name.localeCompare(b.name);
  assert.equal(new Set(documented.map(row=>row.name)).size,documented.length);
  assert.deepEqual(documented.sort(byName),current.sort(byName));
});
