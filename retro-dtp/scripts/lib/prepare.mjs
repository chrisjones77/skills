import fs from "node:fs/promises";
import path from "node:path";
import { normalizeDocument } from "./document.mjs";
import { SKILL_ROOT, loadProfiles, selectProfile } from "./profiles.mjs";
import {
  json,
  writeJson,
  localPath,
  demand,
  copyTree,
  fileHash,
} from "./util.mjs";
export async function prepare(briefPath, dest, options = {}) {
  const brief = await json(briefPath);
  const d = normalizeDocument({
    schema_version: 1,
    ...brief,
    mode: brief.mode ?? brief.requested_mode,
    blocks: brief.blocks ?? brief.supplied_copy,
  });
  const p = selectProfile(
    await loadProfiles(options.profiles),
    d.mode,
    d.document_type,
    options.allowDraft,
  );
  d.mode = p.id;
  if (brief.paper?.safe_margin_mm === undefined)
    d.paper.safe_margin_mm = p.print_defaults.safe_margin_mm;
  if (brief.minimum_body_pt === undefined)
    d.minimum_body_pt = p.print_defaults.minimum_body_pt;
  Object.assign(d, normalizeDocument(d));
  const t = p.templates[d.document_type];
  d.layout = {
    html: "layout.html",
    css: "style.css",
    kind: t.kind ?? "sheets",
  };
  const fontManifest = await json(
    path.join(SKILL_ROOT, "assets/fonts/manifest.json"),
  );
  d.typography = { ...p.typography, ...t.typography };
  const needed = new Set(Object.values(d.typography).map((r) => r.file));
  const fonts = fontManifest.files.filter((f) => needed.has(f.path));
  d.fonts = fonts;
  let html = await fs.readFile(await localPath(p._root, t.html), "utf8");
  const groups = new Map();
  for (const b of d.blocks) {
    const slot = b.panel ?? b.slot ?? "main";
    groups.set(slot, [...(groups.get(slot) ?? []), b]);
  }
  for (const [slot, blocks] of groups) {
    const marker = `<!--DTP:${slot}-->`;
    demand(
      html.includes(marker),
      "UNKNOWN_SLOT",
      `Template has no ${slot} slot; available slots: ${[...html.matchAll(/<!--DTP:(.*?)-->/g)].map((x) => x[1]).join(", ")}`,
    );
    html = html.replace(
      marker,
      blocks
        .map(
          (b) => `<div data-dtp-block="${b.id}" data-role="${b.role}"></div>`,
        )
        .join("\n"),
    );
  }
  html = html.replace(/<!--DTP:[^>]+-->/g, "");
  await fs.mkdir(path.dirname(path.resolve(dest)), { recursive: true });
  try {
    await fs.mkdir(dest);
  } catch (e) {
    if (e.code === "EEXIST")
      throw Object.assign(new Error(`Output exists: ${dest}`), {
        code: "OUTPUT_EXISTS",
        exit: 2,
      });
    throw e;
  }
  try {
    await fs.writeFile(path.join(dest, "layout.html"), html);
    await fs.copyFile(
      await localPath(p._root, t.css),
      path.join(dest, "style.css"),
    );
    await fs.mkdir(path.join(dest, "assets/fonts"), { recursive: true });
    for (const rel of new Set(fonts.flatMap((f) => [f.path, f.notice]))) {
      await fs.copyFile(await localPath(SKILL_ROOT, rel), path.join(dest, rel));
    }
    await copyTree(
      path.join(p._root, "artwork"),
      path.join(dest, "assets/artwork"),
    );
    const art = await json(await localPath(p._root, p.asset_manifest));
    d.assets = [
      ...fonts,
      ...art.files.map((a) => ({
        ...a,
        path: `assets/artwork/${a.path}`,
        notice: a.notice ? `assets/artwork/${a.notice}` : undefined,
      })),
    ];
    for (const a of d.assets)
      demand(
        (await fileHash(await localPath(dest, a.path))) === a.sha256,
        "ASSET_HASH",
        `Asset differs: ${a.path}`,
        3,
      );
    const { _root, ...clean } = p;
    await writeJson(path.join(dest, "profile.json"), clean);
    await writeJson(path.join(dest, "document.json"), d);
    await writeJson(path.join(dest, "brief.json"), brief);
    return {
      status: "prepared",
      paths: { source: path.resolve(dest) },
      mode: p.id,
    };
  } catch (e) {
    await writeJson(path.join(dest, "prepare-failure.json"), {
      code: e.code ?? "PREPARE_FAILED",
      message: e.message,
    });
    throw e;
  }
}
