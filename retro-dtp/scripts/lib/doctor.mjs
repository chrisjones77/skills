import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { run, fileHash, json, demand } from "./util.mjs";
import { SKILL_ROOT } from "./profiles.mjs";
const require = createRequire(import.meta.url);
export async function doctor() {
  const versions = {
    node: process.version,
    playwright: require("playwright/package.json").version,
    fontkit: (
      await json(path.join(SKILL_ROOT, "node_modules/fontkit/package.json"))
    ).version,
  };
  const diagnostics = [];
  if (Number(process.versions.node.split(".")[0]) !== 24)
    diagnostics.push("Node 24 is the supported baseline");
  for (const cmd of ["pdfinfo", "pdffonts", "pdftotext", "pdftoppm"])
    try {
      const r = await run(cmd, ["-v"]);
      versions[cmd] = (r.stderr || r.stdout).split("\n")[0];
    } catch (e) {
      diagnostics.push(e.message);
    }
  try {
    await fs.access(chromium.executablePath());
    versions.chromium_executable = chromium.executablePath();
  } catch {
    diagnostics.push(
      "Matching Chromium missing; run npx playwright install chromium in the skill directory",
    );
  }
  try {
    const m = await json(path.join(SKILL_ROOT, "assets/fonts/manifest.json"));
    for (const f of m.files)
      if (
        (await fileHash(path.join(SKILL_ROOT, f.path)).catch(() => null)) !==
        f.sha256
      )
        diagnostics.push(`Font missing or changed: ${f.path}`);
  } catch (e) {
    diagnostics.push(e.message);
  }
  return {
    status: diagnostics.length ? "unavailable" : "ready",
    versions,
    diagnostics,
  };
}
