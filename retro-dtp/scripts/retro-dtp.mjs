#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs/promises";
import { designPrompt, designCard } from "./lib/design.mjs";
import { fileURLToPath } from "node:url";
import { doctor } from "./lib/doctor.mjs";
import { loadProfiles, DEFAULTS } from "./lib/profiles.mjs";
import { prepare } from "./lib/prepare.mjs";
import { render } from "./lib/render.mjs";
import { verifyRevision } from "./lib/review.mjs";
import { demand, run } from "./lib/util.mjs";
const args = process.argv.slice(2),
  command = args.shift();
const opts = {};
try {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    demand(
      [
        "--json",
        "--mode",
        "--strength",
        "--dither",
        "--include-drafts",
        "--allow-draft-profile",
        "--source",
        "--out",
        "--brief",
        "--revision",
        "--profiles",
        "--timeout-ms",
      ].includes(arg),
      "ARGUMENT",
      `Unknown option ${arg}`,
    );
    if (["--json", "--include-drafts", "--allow-draft-profile"].includes(arg))
      opts[arg] = true;
    else {
      demand(
        args[i + 1] && !args[i + 1].startsWith("--"),
        "ARGUMENT",
        `Missing value for ${arg}`,
      );
      opts[arg] = args[++i];
    }
  }
  const options = {
    allowDraft: !!opts["--allow-draft-profile"],
    profiles: opts["--profiles"] ? path.resolve(opts["--profiles"]) : undefined,
    timeout: opts["--timeout-ms"] ? Number(opts["--timeout-ms"]) : 30000,
  };
  demand(
    Number.isFinite(options.timeout) && options.timeout >= 1,
    "ARGUMENT",
    "Timeout must be positive",
  );
  let result;
  if (command === "design" || command === "design-card") {
    const mode = opts["--mode"] ?? "print-shop";
    const strength = opts["--strength"] === undefined ? 4 : Number(opts["--strength"]);
    const brief = opts["--brief"] ? await fs.readFile(opts["--brief"], "utf8") : "";
    const instructions = command === "design-card" ? designCard() : designPrompt(mode, strength, brief);
    if (opts["--out"]) {
      const output = path.resolve(opts["--out"]);
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, instructions, { flag: "wx" });
      result = { status: "instructions-ready", paths: { output } };
    } else {
      result = { status: "instructions-ready", instructions };
    }
  } else if (command === "filter") {
    demand(opts["--source"] && opts["--out"], "ARGUMENT", "filter needs --source and --out");
    const script = fileURLToPath(new URL("./retro_filter.py", import.meta.url));
    const args = [script, path.resolve(opts["--source"]), "--out", path.resolve(opts["--out"])];
    for (const flag of ["--mode", "--strength", "--dither"]) {
      if (opts[flag] !== undefined) args.push(flag, opts[flag]);
    }
    await run("python3", args, { timeout: options.timeout ?? 180000 });
    result = { status: "filtered", paths: { output: path.resolve(opts["--out"]) } };
  } else if (command === "doctor") {
    result = await doctor();
    if (result.status !== "ready") process.exitCode = 3;
  } else if (command === "modes") {
    const ps = await loadProfiles(options.profiles);
    result = {
      status: "ok",
      defaults: DEFAULTS,
      modes: ps
        .filter((p) => p.readiness === "supported" || opts["--include-drafts"])
        .map(({ _root, ...p }) => p),
    };
  } else if (command === "prepare") {
    demand(
      opts["--brief"] && opts["--out"],
      "ARGUMENT",
      "prepare needs --brief and --out",
    );
    result = await prepare(
      path.resolve(opts["--brief"]),
      path.resolve(opts["--out"]),
      options,
    );
  } else if (command === "render") {
    demand(
      opts["--source"] && opts["--out"],
      "ARGUMENT",
      "render needs --source and --out",
    );
    result = await render(
      path.resolve(opts["--source"]),
      path.resolve(opts["--out"]),
      options,
    );
  } else if (command === "verify") {
    demand(opts["--revision"], "ARGUMENT", "verify needs --revision");
    const r = await verifyRevision(path.resolve(opts["--revision"]));
    result = {
      status: r.status,
      diagnostics: r.diagnostics,
      paths: { revision: path.resolve(opts["--revision"]) },
    };
    if (r.status !== "verified") process.exitCode = 5;
  } else
    demand(false, "COMMAND", "Use design, design-card, filter, doctor, modes, prepare, render, or verify");
  console.log(
    JSON.stringify({
      command,
      paths: {},
      versions: {},
      diagnostics: [],
      ...result,
    }),
  );
} catch (e) {
  console.log(
    JSON.stringify({
      command,
      status: "incomplete",
      paths: {},
      versions: {},
      diagnostics: [
        { code: e.code ?? "ERROR", message: e.message, ...e.details },
      ],
    }),
  );
  process.exitCode = e.exit ?? 4;
}
