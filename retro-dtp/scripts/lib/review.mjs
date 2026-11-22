import os from "node:os";
import { normalizeDocument, paperSize } from "./document.mjs";
import { inspectPdf } from "./pdf-checks.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  json,
  fileHash,
  demand,
  hash,
  treeHashes,
  localPath,
} from "./util.mjs";
export function reviewStatus(manifest, checks, review) {
  const problems = [];
  if (checks.failures?.length || (!checks.pass && !checks.unavailable?.length))
    problems.push("Technical checks did not pass");
  for (const c of checks.unavailable ?? []) {
    const r = review.resolved_checks?.find(
      (r) =>
        r.id === c.id &&
        r.outcome === "pass" &&
        r.reviewer?.trim() &&
        r.findings?.trim(),
    );
    if (!r) problems.push(`Unresolved check: ${c.id}`);
  }
  if (
    review.source_to_brief?.outcome !== "pass" ||
    !review.source_to_brief?.reviewer ||
    !review.source_to_brief?.findings
  )
    problems.push("Source-to-brief review is missing");
  if (review.source_hash !== manifest.source_hash)
    problems.push("Source review is missing or stale");
  for (const rel of manifest.required_visuals) {
    const v = review.visual?.find((v) => v.path === rel);
    const pdf = rel.includes("assembly")
      ? "assembly.pdf"
      : rel.includes("monochrome")
        ? "monochrome.pdf"
        : "document.pdf";
    if (
      !v ||
      v.outcome !== "pass" ||
      v.sha256 !== manifest.files[rel] ||
      v.pdf_sha256 !== manifest.files[pdf] ||
      !v.reviewer?.trim() ||
      !v.findings?.trim() ||
      !v.reviewed_at
    )
      problems.push(`Missing, stale or nonpassing visual review: ${rel}`);
  }
  return {
    status: problems.length ? "review-pending" : "verified",
    diagnostics: problems,
  };
}
export async function verifyRevision(root) {
  const manifest = await json(path.join(root, "render-manifest.json"));
  const checks = await json(path.join(root, "checks.json"));
  const review = await json(path.join(root, "review.json"));
  const stale = [];
  for (const [rel, expected] of Object.entries(manifest.files)) {
    if (
      (await fileHash(await localPath(root, rel)).catch(() => null)) !==
      expected
    )
      stale.push(rel);
  }
  demand(
    !stale.length,
    "STALE_ARTIFACT",
    `Changed or missing artifacts: ${stale.join(", ")}`,
    5,
  );
  const actual = hash(
    JSON.stringify(await treeHashes(path.join(root, "source"))),
  );
  demand(
    actual === manifest.source_hash,
    "STALE_SOURCE",
    "Source files changed after rendering",
    5,
  );
  const d = normalizeDocument(
    await json(path.join(root, "source/document.json")),
  );
  const evidenceDir = await fs.mkdtemp(path.join(os.tmpdir(), "retro-verify-"));
  let fresh;
  try {
    fresh = await inspectPdf(
      path.join(root, "document.pdf"),
      d,
      manifest.geometry,
      {
        dimensions: paperSize(d.paper),
        content: d.layout.kind !== "banner",
        evidenceDir,
      },
    );
    if (d.layout.kind === "banner") {
      const master = await inspectPdf(
        path.join(root, "master.pdf"),
        d,
        manifest.logical_geometry,
        {
          dimensions: [manifest.assembly.width, manifest.assembly.height],
          stem: "master",
          evidenceDir,
        },
      );
      fresh.failures.push(...master.failures);
      fresh.unavailable.push(...master.unavailable);
    }
    if (manifest.files["monochrome.pdf"]) {
      const mono = await inspectPdf(
        path.join(root, "monochrome.pdf"),
        d,
        manifest.geometry,
        {
          dimensions: paperSize(d.paper),
          content: d.layout.kind !== "banner",
          stem: "monochrome",
          evidenceDir,
        },
      );
      fresh.failures.push(...mono.failures);
      fresh.unavailable.push(...mono.unavailable);
    }
    fresh.pass = !fresh.failures.length && !fresh.unavailable.length;
  } finally {
    await fs.rm(evidenceDir, { recursive: true, force: true });
  }
  demand(!fresh.failures.length, "PDF_CHECK", fresh.failures.join("; "), 5);
  const result = reviewStatus(manifest, fresh, review);
  return { ...result, manifest, review };
}
