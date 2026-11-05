import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { listWorkCapabilities } from "./bundle.mjs";
import { packageInventory, resolvePackageProfile } from "./package.mjs";

test("all inventory entries resolve to inspected package bytes without conferring authority",()=>{
  const inventory=packageInventory();
  const names=inventory.capabilities.map(c=>c.name);
  assert.deepEqual(names.sort(),listWorkCapabilities().map(c=>c.name).sort());
  const all=["read","write","git","dispatch","provider","network"];
  const req={primary:"0xB",companions:["0x3"],sourceSha256:inventory.sourceSha256,requiredCapabilities:names,effectCeiling:all};
  const profile=resolvePackageProfile(req);
  assert.equal(profile.status,"resolved_for_review");
  assert.equal(profile.execution_authorized,false);
  for(const row of profile.capabilities) assert.equal(row.sha256,inventory.files[row.entry]);
  assert.equal(resolvePackageProfile({...req,requiredCapabilities:["sequential_queue"],effectCeiling:["read","write"]}).status,"hold");
  assert.equal(resolvePackageProfile({...req,requiredCapabilities:["missing"]}).status,"hold");
  assert.equal(resolvePackageProfile({...req,requiredCapabilities:["provider_facade"],effectCeiling:["read","network","provider"]}).status,"hold");
  assert.equal(resolvePackageProfile({...req,requiredCapabilities:["sequential_queue","human_hybrid_contracts"],effectCeiling:["read","write","dispatch"]}).status,"resolved_for_review");
  const conflict=resolvePackageProfile({...req,requiredCapabilities:["sequential_queue","readonly_roundtrip"],prohibitedEffects:["provider"]});
  assert.equal(conflict.status,"hold");
  assert.ok(conflict.holds.includes("required effect is prohibited"));
  assert.throws(()=>resolvePackageProfile({...req,primary:"0x0"}));
  assert.throws(()=>resolvePackageProfile({...req,companions:["0xB"]}));
});
test("changed guidance invalidates the accepted package pin", async()=>{
  const temp=mkdtempSync(path.join(tmpdir(),"unified-profile-"));
  try {
    const dir=path.join(temp,"pkg");
    cpSync(fileURLToPath(new URL(".",import.meta.url)),dir,{recursive:true});
    const snapshot=packageInventory();
    const guide=path.join(dir,"methods.md");
    writeFileSync(guide,readFileSync(guide,"utf8")+"\nReviewed change.\n");
    const copied=await import(pathToFileURL(path.join(dir,"package.mjs")));
    assert.equal(copied.resolvePackageProfile({primary:"0xB",effectCeiling:["read"],sourceSha256:snapshot.sourceSha256}).status,"hold");
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
