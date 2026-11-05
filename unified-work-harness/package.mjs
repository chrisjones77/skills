// The public package registry. The older profile command continues to describe
// the single embedded bundle so existing accepted work keeps its semantics.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const sha = value => createHash("sha256").update(value).digest("hex");
const catalog = {
  purpose_selection: ["QVCH purpose map", "bundle.mjs", [], []],
  embedded_source_binding: ["bundle identity", "bundle.mjs", [], []],
  qvch_source_resolution: ["QVCH packaged profiles", "package.mjs", ["embedded_source_binding"], ["read"]],
  assignment_intake: ["reviewed intake", "intake.mjs", [], []],
  human_hybrid_contracts: ["attended Hypervisor", "coordination.mjs", ["assignment_intake"], []],
  call_response: ["Hypervisor and recipient response", "coordination.mjs", ["assignment_intake"], []],
  engineering_safety: ["engineering work and safety", "methods.md", [], []],
  fair_process: ["concern handling and response", "methods.md", ["engineering_safety"], []],
  ai_lifecycle: ["forward-deployed AI engineering", "methods.md", ["engineering_safety"], []],
  professional_practice: ["professional review", "methods.md", ["engineering_safety"], []],
  coverage_review: ["artifact coverage", "methods.md", [], []],
  issue_triage: ["work-item triage", "methods.md", ["coverage_review"], []],
  advisory_workflow: ["advisory practice", "methods.md", ["professional_practice", "coverage_review"], []],
  readonly_roundtrip: ["Hypervisor and agent executor", "bundle.mjs", ["embedded_source_binding"], ["read","write","provider","git","network"]],
  bounded_dispatch: ["bounded scheduling", "queue.mjs", ["assignment_intake"], ["read","write","dispatch"]],
  sequential_queue: ["persistent sequential dispatch", "queue.mjs", ["bounded_dispatch"], []],
  goal_pursuit: ["explicit goal proposals", "queue.mjs", [], []],
  provider_facade: ["scoped provider interface", "candidate.mjs", ["assignment_intake"], ["read","git","write","provider","network"]],
  multiple_adapters: ["candidate provider adapters", "candidate.mjs", ["provider_facade"], []],
  candidate_changes: ["candidate and defect workflow", "candidate.mjs", ["multiple_adapters"], []]
};
const purposes = {
  "0x1":["build","candidate_changes"],"0x2":["maintain","engineering_safety"],
  "0x3":["diagnose","coverage_review"],"0x4":["investigate","ai_lifecycle"],
  "0x5":["record","coverage_review"],"0x6":["communicate","call_response"],
  "0x7":["design","ai_lifecycle"],"0x8":["represent","fair_process"],
  "0x9":["prioritize","issue_triage"],"0xA":["teach","engineering_safety"],
  "0xB":["verify","coverage_review"],"0xC":["inspect","coverage_review"],
  "0xD":["sustain","engineering_safety"],"0xE":["coordinate","call_response"],
  "0xF":["envision","advisory_workflow"]
};
const validEffects = new Set(["read","write","git","network","provider","dispatch"]);
const allowedFields = new Set(["primary","companions","requiredCapabilities","effectCeiling","requestedEffects","prohibitedEffects","sourceSha256"]);
const uniqueList = a => Array.isArray(a) && a.length <= 32 && a.every(x=>typeof x === "string") && new Set(a).size === a.length;

// Resolve only the package manifest shipped beside this module. Paths can
// never name a remote module or escape the package, even via a symlink.
export function packageInventory() {
  const files = JSON.parse(readFileSync(path.join(root,"package-files.json"),"utf8"));
  if (!uniqueFiles(files) || !["integrated.mjs","intake.mjs","coordination.mjs","methods.md","LICENSE"].every(file => files.includes(file)) || !Object.values(catalog).every(([,file]) => files.includes(file)) ||
      readdirSync(root).some(file => file.endsWith(".test.mjs") && !files.includes(file)))
    throw new Error("Invalid package file manifest");
  const identities = files.map(file => {
    const target = path.resolve(root,file);
    if (!target.startsWith(root+path.sep) || realpathSync(target) !== target) throw new Error("Invalid source path");
    return [file,sha(readFileSync(target))];
  });
  return {schema_version:"unified.package-inventory.v1",sourceSha256:sha(JSON.stringify(identities)),files:Object.fromEntries(identities),
    capabilities:Object.entries(catalog).map(([name,[origin,entry,dependencies,effects]])=>({name,origin,entry,dependencies:[...dependencies],effects:[...effects]})),
    execution_authorized:false};
}

function uniqueFiles(files) {
  return Array.isArray(files) && files.length > 0 && files.length <= 256 &&
    files.every(x => typeof x === "string" && x.split("/").every(part => /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(part))) &&
    new Set(files).size === files.length && files.includes("package.mjs") && files.includes("SKILL.md");
}

export function resolvePackageProfile(request) {
  if (!request || typeof request !== "object" || Object.keys(request).some(k=>!allowedFields.has(k))) throw new Error("Invalid package profile");
  const {primary, companions=[], requiredCapabilities=[], requestedEffects=[], prohibitedEffects=[], effectCeiling, sourceSha256} = request;
  if (!Object.hasOwn(purposes,primary) || !uniqueList(companions) || companions.length>2 || companions.includes(primary) ||
      companions.some(x=>!Object.hasOwn(purposes,x)) || !uniqueList(requiredCapabilities) || !uniqueList(requestedEffects) ||
      !uniqueList(prohibitedEffects) || prohibitedEffects.some(e=>!validEffects.has(e)) || requestedEffects.some(e=>!validEffects.has(e)) || (effectCeiling!==undefined && (!uniqueList(effectCeiling) || effectCeiling.some(e=>!validEffects.has(e)))))
    throw new Error("Invalid purpose, capabilities or effects");
  const inventory = packageInventory();
  const required = new Set(), visiting = new Set(), holds = new Set();
  function visit(name) {
    if (required.has(name)) return;
    if (!Object.hasOwn(catalog,name)) { holds.add("unknown capability"); return; }
    if (visiting.has(name)) { holds.add("dependency cycle"); return; }
    visiting.add(name);
    catalog[name][2].forEach(visit);
    visiting.delete(name);
    required.add(name);
  }
  ["qvch_source_resolution","purpose_selection",...requiredCapabilities].forEach(visit);
  // A lens recommends a method. Its effects are counted only if requested.
  const lenses=[primary,...companions].map(code=>({code,command:purposes[code][0],method:purposes[code][1],entry:catalog[purposes[code][1]][1]}));
  const effects = [...new Set([...requestedEffects,...[...required].flatMap(name=>catalog[name][3])])].sort();
  if (effects.some(e=>prohibitedEffects.includes(e))) holds.add("required effect is prohibited");
  if (sourceSha256!==inventory.sourceSha256) holds.add("missing or changed package pin");
  if (!effectCeiling || effects.some(e=>!effectCeiling.includes(e))) holds.add("missing or insufficient effect ceiling");
  return {schema_version:"unified.package-profile.v1",status:holds.size?"hold":"resolved_for_review",holds:[...holds],
    sourceSha256:inventory.sourceSha256,lenses,capabilities:[...required].map(name=>({name,entry:catalog[name][1],origin:catalog[name][0],requires:[...catalog[name][2]],sha256:inventory.files[catalog[name][1]]})),
    effects,prohibitedEffects:[...prohibitedEffects],scope:"installed-package",execution_authorized:false};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [op,file,...extra] = process.argv.slice(2);
    let result;
    if (op==="inventory" && !file && !extra.length) result=packageInventory();
    else if (op==="profile" && file && !extra.length) result=resolvePackageProfile(JSON.parse(readFileSync(file,"utf8")));
    else throw new Error("Usage: node package.mjs inventory | profile REQUEST.json");
    console.log(JSON.stringify(result));
    if(result.status==="hold") process.exitCode=2;
  } catch { console.error("Package inspection failed; check the request and package files."); process.exitCode=1; }
}
