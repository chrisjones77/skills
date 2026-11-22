import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { json, demand, localPath, fileHash } from "./util.mjs";
import { TYPES, ROLES } from "./document.mjs";
export const SKILL_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const DEFAULTS = {
  flyer: "print-shop",
  notice: "print-shop",
  card: "print-shop",
  banner: "print-shop",
  newsletter: "geoworks",
  letterhead: "geoworks",
  letter: "deskmate",
  memo: "deskmate",
  form: "deskmate",
};
export async function validateProfile(p, root, { resources = true } = {}) {
  demand(
    p.schema_version === 1,
    "PROFILE_SCHEMA",
    "Profile schema_version must be 1",
  );
  demand(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id ?? ""),
    "PROFILE_ID",
    "Invalid profile id",
  );
  for (const k of [
    "display_name",
    "reference_baseline",
    "fidelity",
    "reference_path",
    "asset_manifest",
  ])
    demand(
      typeof p[k] === "string" && p[k].trim(),
      "PROFILE_FIELD",
      `Missing ${k} in ${p.id}`,
    );
  demand(
    p.fidelity === "period-inspired",
    "PROFILE_FIDELITY",
    "Only period-inspired fidelity is implemented",
  );
  demand(
    Array.isArray(p.aliases) &&
      p.aliases.every((x) => typeof x === "string" && x.trim()),
    "PROFILE_ALIASES",
    "Invalid aliases",
  );
  demand(
    Array.isArray(p.supported_types) &&
      p.supported_types.length &&
      p.supported_types.every((t) => TYPES.includes(t)),
    "PROFILE_TYPES",
    "Invalid supported types",
  );
  demand(
    Array.isArray(p.primitives) &&
      p.primitives.length &&
      p.primitives.every((x) =>
        ["sheets", "quarter-fold", "banner"].includes(x),
      ),
    "PROFILE_PRIMITIVES",
    "Unknown composition primitive",
  );
  for (const key of [
    "typography",
    "palette",
    "print_defaults",
    "signatures",
    "artwork_rules",
    "overflow_policy",
    "fallbacks",
    "example_ids",
  ])
    demand(p[key] !== undefined, "PROFILE_FIELD", `Missing ${key}`);
  demand(
    p.print_defaults.safe_margin_mm >= 0 &&
      p.print_defaults.minimum_body_pt >= 10,
    "PROFILE_PRINT",
    "Profile needs valid print rules",
  );
  demand(
    Array.isArray(p.signatures) && p.signatures.length >= 3,
    "PROFILE_SIGNATURES",
    "Three visible signatures required",
  );
  demand(
    Array.isArray(p.example_ids) && p.example_ids.length,
    "PROFILE_EXAMPLE",
    "Representative example ID required",
  );
  demand(
    ["draft", "supported"].includes(p.readiness),
    "PROFILE_STATE",
    "Unknown readiness",
  );
  for (const r of ROLES)
    demand(
      p.typography[r]?.file && p.typography[r]?.family,
      "PROFILE_FONT",
      `Missing typography role ${r}`,
    );
  if (resources) {
    const rels = [p.reference_path, p.asset_manifest];
    for (const type of p.supported_types) {
      const t = p.templates?.[type];
      demand(t?.html && t?.css, "PROFILE_TEMPLATE", `Missing template ${type}`);
      demand(
        p.primitives.includes(t.kind),
        "PROFILE_PRIMITIVES",
        `Template ${type} uses undeclared primitive ${t.kind}`,
      );
      for (const [role, face] of Object.entries(t.typography ?? {}))
        demand(
          ROLES.includes(role) && face?.file && face?.family,
          "PROFILE_FONT",
          `Invalid template typography for ${type} role ${role}`,
        );
      rels.push(t.html, t.css);
    }
    if (p.readiness === "supported") {
      demand(
        p.representative_preview && p.release_evidence,
        "PROFILE_EVIDENCE",
        "Supported profile needs preview and release evidence",
      );
      rels.push(p.representative_preview, p.release_evidence);
    }
    for (const rel of rels) {
      const target = await localPath(root, rel);
      demand(
        (await fs.stat(target).catch(() => null))?.isFile(),
        "PROFILE_RESOURCE",
        `Missing profile resource ${rel}`,
        3,
      );
    }
  }
  if (resources) {
    const ledger = await json(await localPath(root, p.asset_manifest));
    demand(
      Array.isArray(ledger.files) && (p.text_only === true ? ledger.files.length === 0 : ledger.files.length > 0),
      "PROFILE_RESOURCE",
      "Artwork manifest must match the declared artwork treatment",
    );
    for (const a of ledger.files) {
      const target = await localPath(root, `artwork/${a.path}`);
      demand(
        (await fileHash(target).catch(() => null)) === a.sha256,
        "PROFILE_RESOURCE",
        `Artwork missing or changed: ${a.path}`,
        3,
      );
      if (a.notice)
        demand(
          (
            await fs
              .stat(await localPath(root, `artwork/${a.notice}`))
              .catch(() => null)
          )?.isFile(),
          "PROFILE_RESOURCE",
          `Missing artwork notice ${a.notice}`,
          3,
        );
    }
    const fonts = await json(
      path.join(SKILL_ROOT, "assets/fonts/manifest.json"),
    );
    const typographySets = [
      p.typography,
      ...p.supported_types.map((type) => p.templates[type].typography ?? {}),
    ];
    for (const [role, face] of typographySets.flatMap(Object.entries))
      demand(
        fonts.files.some(
          (f) =>
            f.path === face.file && f.family === face.family,
        ),
        "PROFILE_FONT",
        `Unknown bundled font for ${role}`,
      );
    if (p.readiness === "supported") {
      const receipt = await json(await localPath(root, p.release_evidence));
      demand(
        receipt.status === "verified" &&
          receipt.preview_sha256 ===
            (await fileHash(await localPath(root, p.representative_preview))) &&
          p.example_ids.every((id) =>
            receipt.examples?.some(
              (e) => e.id === id && e.status === "verified" && e.pdf_sha256,
            ),
          ),
        "PROFILE_EVIDENCE",
        "Supported profile needs matching preview hash and verified example receipts",
      );
    }
  }
  return p;
}
export async function loadProfiles(
  root = path.join(SKILL_ROOT, "assets/modes"),
) {
  const profiles = [];
  for (const entry of (await fs.readdir(root, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    if (!entry.isDirectory()) continue;
    const dir = await localPath(root, entry.name);
    const p = await validateProfile(
      await json(path.join(dir, "profile.json")),
      dir,
    );
    profiles.push({ ...p, _root: dir });
  }
  const aliases = new Map();
  for (const p of profiles)
    for (const name of new Set(
      [p.id, p.display_name, ...p.aliases].map((x) => x.trim().toLowerCase()),
    )) {
      demand(
        !aliases.has(name),
        "ALIAS_COLLISION",
        `Duplicate mode alias ${name}`,
      );
      aliases.set(name, p.id);
    }
  return profiles;
}
export function selectProfile(profiles, mode, type, allowDraft = false) {
  const key = (mode ?? DEFAULTS[type] ?? "").trim().toLowerCase();
  const p = profiles.find((p) =>
    [p.id, p.display_name, ...p.aliases].some(
      (x) => x.trim().toLowerCase() === key,
    ),
  );
  demand(
    p,
    "UNKNOWN_MODE",
    `Unknown mode ${mode ?? key}. Choices: ${profiles.map((p) => p.id).join(", ")}`,
  );
  demand(
    p.readiness === "supported" || allowDraft,
    "DRAFT_PROFILE",
    `${p.id} is draft; development requires --allow-draft-profile`,
  );
  demand(
    p.supported_types.includes(type),
    "UNSUPPORTED_TYPE",
    `${p.display_name} supports: ${p.supported_types.join(", ")}; requested ${type}`,
  );
  return p;
}
