import fs from "node:fs/promises";
import path from "node:path";
import { run, demand, normalizeText } from "./util.mjs";
const decode = (s) =>
  s
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, v) =>
      String.fromCodePoint(
        v[0].toLowerCase() === "x" ? parseInt(v.slice(1), 16) : Number(v),
      ),
    )
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
const attrs = (s) =>
  Object.fromEntries(
    [...s.matchAll(/([\w]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );
export function parseBbox(xml) {
  return [...xml.matchAll(/<page\b([^>]*)>([\s\S]*?)<\/page>/g)].map((m) => ({
    ...attrs(m[1]),
    words: [...m[2].matchAll(/<word\b([^>]*)>([\s\S]*?)<\/word>/g)].map(
      (w) => ({
        ...Object.fromEntries(
          Object.entries(attrs(w[1])).map(([k, v]) => [k, Number(v)]),
        ),
        text: decode(w[2]),
      }),
    ),
  }));
}
export async function inspectPdf(
  pdf,
  d,
  measurements,
  {
    dimensions,
    content = true,
    stem = "document",
    timeout = 30000,
    evidenceDir,
  } = {},
) {
  const evidence = evidenceDir ?? path.join(path.dirname(pdf), "evidence");
  await fs.mkdir(evidence, { recursive: true });
  const xmlPath = path.join(evidence, `${stem}-text.xml`);
  const [info, fonts] = await Promise.all([
    run("pdfinfo", ["-box", pdf], { timeout }),
    run("pdffonts", [pdf], { timeout }),
    run("pdftotext", ["-bbox-layout", pdf, xmlPath], { timeout }),
  ]);
  await fs.writeFile(path.join(evidence, `${stem}-pdfinfo.txt`), info.stdout);
  await fs.writeFile(path.join(evidence, `${stem}-pdffonts.txt`), fonts.stdout);
  const pages = parseBbox(await fs.readFile(xmlPath, "utf8"));
  const failures = [],
    unavailable = [];
  if (pages.length !== measurements.page_count)
    failures.push(
      `Page count ${pages.length}, expected ${measurements.page_count}`,
    );
  if (dimensions)
    for (const [i, p] of pages.entries())
      if (
        Math.abs((Number(p.width) * 25.4) / 72 - dimensions[0]) > 0.5 ||
        Math.abs((Number(p.height) * 25.4) / 72 - dimensions[1]) > 0.5
      )
        failures.push(`Physical dimensions differ on page ${i + 1}`);
  const fontRows = fonts.stdout
    .split("\n")
    .slice(2)
    .filter((x) => x.trim());
  if (d.blocks.some((b) => b.text.trim()) && !fontRows.length)
    failures.push("PDF contains no embedded text fonts");
  for (const row of fontRows)
    if (!/\byes\s+(?:yes|no)\s+yes\s+\d+\s+\d+\s*$/.test(row))
      failures.push(`Unembedded or unmapped font: ${row}`);
  const textChecks = [];
  if (content)
    for (const b of d.blocks) {
      if (!b.text.trim()) continue;
      const m = measurements.records.find((x) => x.id === b.id);
      const r = m.rect;
      const p = pages[m.page - 1];
      const words =
        p?.words.filter((w) => {
          const cx = (w.xMin + w.xMax) / 2,
            cy = (w.yMin + w.yMax) / 2;
          return (
            cx >= r.x * 0.75 - 2 &&
            cx <= (r.x + r.w) * 0.75 + 2 &&
            cy >= r.y * 0.75 - 2 &&
            cy <= (r.y + r.h) * 0.75 + 2
          );
        }) ?? [];
      const actual = normalizeText(words.map((w) => w.text).join(" ")),
        expected = normalizeText(b.text);
      const pass = actual === expected;
      textChecks.push({ id: b.id, expected, actual, pass });
      if (!pass) {
        const issue = {
          id: `text:${stem}:${b.id}`,
          block: b.id,
          expected,
          actual,
        };
        if (b.panel) unavailable.push(issue);
        else
          failures.push(
            `PDF text differs for ${b.id}: ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`,
          );
      }
    }
  return {
    pass: !failures.length && !unavailable.length,
    failures,
    unavailable,
    page_count: pages.length,
    text_checks: textChecks,
  };
}
export async function previewPdf(
  pdf,
  prefix,
  { dpi = 150, timeout = 30000 } = {},
) {
  await fs.mkdir(path.dirname(prefix), { recursive: true });
  await run("pdftoppm", ["-png", "-r", String(dpi), pdf, prefix], { timeout });
  return (await fs.readdir(path.dirname(prefix)))
    .filter(
      (n) => n.startsWith(path.basename(prefix) + "-") && n.endsWith(".png"),
    )
    .sort(
      (a, b) =>
        Number(a.match(/-(\d+)\.png$/)[1]) - Number(b.match(/-(\d+)\.png$/)[1]),
    )
    .map((n) => path.join(path.dirname(prefix), n));
}
