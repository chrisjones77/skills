import * as fontkit from "fontkit";
import { demand, localPath, fileHash } from "./util.mjs";
export async function validateAssets(source, d) {
  for (const a of d.assets) {
    const p = await localPath(source, a.path);
    demand(
      (await fileHash(p).catch(() => null)) === a.sha256,
      "ASSET_HASH",
      `Missing or changed asset: ${a.path}`,
      3,
    );
    if (a.notice) await localPath(source, a.notice);
  }
  for (const f of d.fonts ?? [])
    demand(
      d.assets.some((a) => a.path === f.path && a.sha256 === f.sha256),
      "FONT_MANIFEST",
      `Font not in asset ledger: ${f.path}`,
      3,
    );
}
export async function validateGlyphs(source, d, measurements) {
  const cache = new Map();
  for (const b of d.blocks) {
    if (!b.text.trim()) continue;
    const m = measurements.find((m) => m.id === b.id);
    demand(m, "BINDING", `No measured block ${b.id}`);
    const font = d.fonts.find(
      (f) =>
        f.family === m.family &&
        f.face.toLowerCase().includes("bold") === Number(m.weight) >= 600 &&
        f.face.toLowerCase().includes("italic") === (m.style === "italic"),
    );
    demand(
      font,
      "FONT_SUBSTITUTION",
      `Unrecorded font face ${m.family} ${m.weight} ${m.style} in ${b.id}`,
      3,
    );
    let f = cache.get(font.path);
    if (!f) {
      f = fontkit.openSync(await localPath(source, font.path));
      cache.set(font.path, f);
    }
    const text = b.text.replace(/[\r\n\t]/g, " ");
    const missing = [
      ...new Set(
        [...text].filter((ch) => !f.hasGlyphForCodePoint(ch.codePointAt(0))),
      ),
    ];
    demand(
      !missing.length,
      "MISSING_GLYPH",
      `Missing glyphs in ${b.id}: ${missing.map((ch) => "U+" + ch.codePointAt(0).toString(16).toUpperCase()).join(", ")}`,
      3,
      { block: b.id },
    );
    demand(
      !f.layout(text).glyphs.some((g) => g.id === 0),
      "MISSING_GLYPH",
      `Shaping produced missing glyph in ${b.id}`,
      3,
    );
  }
}
export function fontCss(d) {
  return (
    d.fonts
      .map(
        (f) =>
          `@font-face{font-family:"${f.family}";src:url("${f.path}");font-style:${f.face.toLowerCase().includes("italic") ? "italic" : "normal"};font-weight:${f.face.toLowerCase().includes("bold") ? 700 : 400};}`,
      )
      .join("\n") +
    Object.entries(d.typography)
      .map(
        ([role, f]) =>
          `[data-role="${role}"]{font-family:"${f.family}";font-weight:${f.weight ?? 400};font-style:${f.style ?? "normal"};}`,
      )
      .join("\n")
  );
}
