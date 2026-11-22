import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";
import {
  json,
  writeJson,
  demand,
  files,
  fileHash,
  run,
  localPath,
  DtpError,
} from "./util.mjs";
import { normalizeDocument, paperSize } from "./document.mjs";
import { createRevision, failureRecord } from "./revisions.mjs";
import { validateAssets, validateGlyphs } from "./fonts.mjs";
import { printCss, bindAndMeasure } from "./layout.mjs";
import { inspectPdf, previewPdf } from "./pdf-checks.mjs";
import { cardGeometry, applyCard, cardAssembly } from "./card.mjs";
import { bannerGeometry, sizeMaster, makeTiles } from "./banner.mjs";
import { handoff } from "./handoff.mjs";
import { doctor } from "./doctor.mjs";
async function applyMonochrome(page) {
  await page.evaluate(() => {
    document.body.classList.add("monochrome");
    const gray = (value) =>
      value.replace(
        /rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)([^)]*)\)/g,
        (_, r, g, b, alpha) => {
          const y = Math.round(
            0.2126 * Number(r) + 0.7152 * Number(g) + 0.0722 * Number(b),
          );
          return `rgb${alpha.trim() ? "a" : ""}(${y},${y},${y}${alpha})`;
        },
      );
    for (const el of document.querySelectorAll("*")) {
      const css = getComputedStyle(el);
      for (const prop of [
        "color",
        "background-color",
        "background-image",
        "border-top-color",
        "border-bottom-color",
        "border-left-color",
        "border-right-color",
        "outline-color",
        "fill",
        "stroke",
      ]) {
        const value = css.getPropertyValue(prop),
          next = gray(value);
        if (next !== value) el.style.setProperty(prop, next, "important");
      }
    }
  });
}
async function serverFor(root, html) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/index.html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'self' data:; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'",
        );
        res.end(html);
        return;
      }
      const rel = decodeURIComponent(url.pathname.slice(1));
      const target = await localPath(root, rel);
      const ext = path.extname(target);
      res.setHeader(
        "Content-Type",
        {
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".ttf": "font/ttf",
          ".otf": "font/otf",
          ".png": "image/png",
          ".jpg": "image/jpeg",
        }[ext] ?? "application/octet-stream",
      );
      res.end(await fs.readFile(target));
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
const pdfOptions = {
  preferCSSPageSize: true,
  scale: 1,
  printBackground: true,
  displayHeaderFooter: false,
  margin: { top: "0", bottom: "0", left: "0", right: "0" },
};
export async function render(source, out, options = {}) {
  let rev, browser, server;
  const timeout = options.timeout ?? 30000;
  let interrupted = false;
  const onSignal = () => {
    interrupted = true;
    browser?.close().catch(() => {});
    server?.close();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    rev = await createRevision(source, out);
    const d = normalizeDocument(
      await json(path.join(rev.source, "document.json")),
    );
    const profile = await json(path.join(rev.source, "profile.json"));
    demand(
      profile.readiness === "supported" || options.allowDraft,
      "DRAFT_PROFILE",
      "Source has a draft profile; use --allow-draft-profile for development",
    );
    demand(
      profile.id === d.mode &&
        profile.supported_types.includes(d.document_type),
      "PROFILE_MISMATCH",
      "Source profile and document disagree",
    );
    await writeJson(path.join(rev.root, "profile.json"), profile);
    await validateAssets(rev.source, d);
    for (const rel of await files(rev.source)) {
      if (!/\.(?:html|css|svg)$/i.test(rel)) continue;
      const text = await fs.readFile(path.join(rev.source, rel), "utf8");
      demand(
        !/(?:\b(?:src|href)\s*=\s*["']?\s*|url\(\s*["']?\s*|@import\s+["'])(?:https?:|file:|ftp:|\/\/)/i.test(
          text,
        ),
        "EXTERNAL_RESOURCE",
        `Nonlocal resource reference in ${rel}`,
        4,
      );
    }
    const env = await doctor();
    demand(
      env.status === "ready",
      "PREREQUISITE",
      env.diagnostics.join("; "),
      3,
    );
    let html = await fs.readFile(
      await localPath(rev.source, d.layout.html),
      "utf8",
    );
    demand(
      !/<script\b|\son\w+\s*=|javascript:|<iframe\b|<object\b/i.test(html),
      "ACTIVE_CONTENT",
      "Source must contain passive HTML only",
    );
    html = html.replace("</head>", `<style>${printCss(d)}</style></head>`);
    demand(
      html.includes("</head>"),
      "HTML",
      "Source requires a complete HTML document",
    );
    const served = await serverFor(rev.source, html);
    server = served.server;
    browser = await chromium.launch({ headless: true, timeout });
    const context = await browser.newContext();
    context.setDefaultTimeout(timeout);
    const blocked = [];
    await context.route("**/*", async (route) => {
      const u = route.request().url();
      if (u.startsWith(served.url + "/") || u.startsWith("data:"))
        await route.continue();
      else {
        blocked.push(u);
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(timeout);
    await page.emulateMedia({ media: "print" });
    await page.goto(served.url + "/index.html", {
      waitUntil: "networkidle",
      timeout,
    });
    await page.evaluate(
      (color) => document.body.classList.toggle("accent", color === "accent"),
      d.color,
    );
    const [w, h] = paperSize(d.paper);
    let card, banner;
    if (d.layout.kind === "quarter-fold") {
      card = cardGeometry(w, h, d.paper.safe_margin_mm);
      await applyCard(page, card);
    }
    if (d.layout.kind === "banner") {
      banner = bannerGeometry(d.assembly, [w, h], d.paper.safe_margin_mm);
      await sizeMaster(page, banner);
    }
    if (d.color === "monochrome") await applyMonochrome(page);
    let measured = await bindAndMeasure(page, d);
    await validateGlyphs(rev.source, d, measured.records);
    demand(
      !blocked.length,
      "EXTERNAL_RESOURCE",
      `External resources blocked: ${blocked.join(", ")}`,
      4,
    );
    demand(
      ["sheets", "quarter-fold", "banner"].includes(d.layout.kind),
      "PRIMITIVE",
      "Unknown composition primitive",
    );
    if (!banner)
      for (const sheet of measured.sheets)
        demand(
          Math.abs((sheet.w * 25.4) / 96 - w) < 0.5 &&
            Math.abs((sheet.h * 25.4) / 96 - h) < 0.5,
          "SHEET_SIZE",
          "Source overrides physical sheet dimensions",
          4,
        );
    await fs.writeFile(
      path.join(rev.root, "rendered.html"),
      (await page.content()).replace("<head>", '<head><base href="source/">'),
    );
    let masterChecks = null;
    const logicalMeasured = structuredClone(measured);
    let masterHtml;
    if (banner) {
      masterHtml = await page.locator(".master").evaluate((el) => el.outerHTML);
      await page.pdf({
        ...pdfOptions,
        path: path.join(rev.root, "master.pdf"),
        timeout,
      });
      masterChecks = await inspectPdf(
        path.join(rev.root, "master.pdf"),
        d,
        measured,
        { dimensions: [banner.width, banner.height], stem: "master", timeout },
      );
      demand(
        !masterChecks.failures.length,
        "PDF_CHECK",
        masterChecks.failures.join("; "),
        4,
      );
      await makeTiles(page, banner);
      measured = { ...measured, page_count: banner.tiles.length };
      demand(
        measured.page_count <= d.page_limit,
        "PAGE_LIMIT",
        "Banner exceeds approved sheet limit",
        4,
      );
    }
    await page.pdf({
      ...pdfOptions,
      path: path.join(rev.root, "document.pdf"),
      timeout,
    });
    const checks = await inspectPdf(
      path.join(rev.root, "document.pdf"),
      d,
      measured,
      { dimensions: [w, h], content: !banner, timeout },
    );
    if (masterChecks) {
      checks.unavailable.push(...masterChecks.unavailable);
      checks.master = masterChecks;
      checks.geometry = banner;
    }
    demand(
      !checks.failures.length,
      "PDF_CHECK",
      checks.failures.join("; "),
      4,
      { checks },
    );
    const previews = await previewPdf(
      path.join(rev.root, "document.pdf"),
      path.join(rev.root, "previews/page"),
      { timeout },
    );
    const variants = [];
    if (d.color === "accent") {
      await applyMonochrome(page);
      await page.pdf({
        ...pdfOptions,
        path: path.join(rev.root, "monochrome.pdf"),
        timeout,
      });
      const mono = await inspectPdf(
        path.join(rev.root, "monochrome.pdf"),
        d,
        measured,
        { dimensions: [w, h], stem: "monochrome", content: !banner, timeout },
      );
      demand(!mono.failures.length, "PDF_CHECK", mono.failures.join("; "), 4);
      checks.unavailable.push(...mono.unavailable);
      checks.monochrome = mono;
      variants.push(
        ...(await previewPdf(
          path.join(rev.root, "monochrome.pdf"),
          path.join(rev.root, "previews/monochrome"),
          { timeout },
        )),
      );
    }
    if (card || banner) {
      const assembly = await context.newPage();
      await assembly.emulateMedia({ media: "print" });
      await assembly.goto(served.url + "/index.html");
      const content = card
        ? cardAssembly(card)
        : `<h1>Banner assembly — scaled overview</h1><p>Print document.pdf at 100%, not this overview. ${banner.tiles.length} sheets; ${banner.overlap} mm overlap.</p><div style="height:${banner.height * Math.min((w - 30) / banner.width, 1) + 8}mm;position:relative"><div style="transform:scale(${Math.min((w - 30) / banner.width, 1)});transform-origin:top left;width:${banner.width}mm">${masterHtml}</div></div><p>Left to right: ${banner.tiles.map((t) => "Tile " + t.index).join(" → ")}. Trim one copy of each overlap and align the repeated artwork.</p>`;
      await assembly.evaluate((content) => {
        document.body.innerHTML = `<section class="sheet"><main class="safe assembly-guide">${content}</main></section>`;
      }, content);
      await assembly.addStyleTag({
        content: `@page{size:${w}mm ${h}mm;margin:0}.sheet{width:${w}mm!important;height:${h}mm!important}.assembly-guide{font:12pt 'Liberation Sans';line-height:1.5}.assembly-guide h1{font-size:20pt}.assembly-guide h2{font-size:14pt}.fold-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #111;margin:8mm 0}.fold-grid>div{padding:8mm;border:1px dashed #777;height:45mm}.fold-grid p{font-size:10pt} .master-region{position:absolute;inset:10mm}`,
      });
      await assembly.evaluate(() => document.fonts.ready);
      await assembly.pdf({
        ...pdfOptions,
        path: path.join(rev.root, "assembly.pdf"),
        timeout,
      });
      variants.push(
        ...(await previewPdf(
          path.join(rev.root, "assembly.pdf"),
          path.join(rev.root, "previews/assembly"),
          { timeout },
        )),
      );
      await assembly.close();
    }
    if (profile.postscript_level === 1) {
      const input = d.color === "accent" ? "monochrome.pdf" : "document.pdf";
      await run("pdftops", ["-level1", input, "document.ps"], { cwd: rev.root, timeout });
    }
    checks.pass = !checks.failures.length && !checks.unavailable.length;
    await writeJson(path.join(rev.root, "checks.json"), checks);
    const manifest = {
      schema_version: 1,
      job_id: d.id,
      revision: path.basename(rev.root),
      parent_revision: d.parent_revision ?? null,
      created_at: new Date().toISOString(),
      ...(profile.postscript_level === 1 ? { postscript: "document.ps" } : {}),
      source_hash: rev.source_hash,
      source_files: rev.source_files,
      versions: { ...env.versions, chromium: browser.version() },
      page_count: checks.page_count,
      geometry: measured,
      logical_geometry: logicalMeasured,
      assembly: card ?? banner ?? null,
      required_visuals: [...previews, ...variants].map((p) =>
        path.relative(rev.root, p),
      ),
      files: {},
    };
    await handoff(rev.root, d, manifest);
    for (const rel of await files(rev.root))
      manifest.files[rel] = await fileHash(path.join(rev.root, rel));
    await writeJson(path.join(rev.root, "render-manifest.json"), manifest);
    await writeJson(path.join(rev.root, "review.json"), {
      ...(profile.postscript_level === 1 ? { postscript: "document.ps" } : {}),
      source_hash: rev.source_hash,
      source_to_brief: { outcome: "pending" },
      visual: [],
      resolved_checks: [],
      creative_acceptance: "not-requested",
      physical_print: "not-tested",
    });
    demand(!interrupted, "INTERRUPTED", "Render interrupted", 4);
    return {
      status: "rendered-review-pending",
      paths: { revision: rev.root, pdf: path.join(rev.root, "document.pdf") },
      versions: manifest.versions,
      diagnostics: checks.unavailable,
    };
  } catch (e) {
    if (rev) await failureRecord(rev.root, e);
    throw e;
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  }
}
