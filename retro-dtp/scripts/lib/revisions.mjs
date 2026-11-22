import fs from "node:fs/promises";
import path from "node:path";
import { copyTree, treeHashes, hash, demand, writeJson } from "./util.mjs";
export async function createRevision(source, out) {
  const src = path.resolve(source),
    dst = path.resolve(out);
  demand(
    src !== dst &&
      !dst.startsWith(src + path.sep) &&
      !src.startsWith(dst + path.sep),
    "OUTPUT_PATH",
    "Source and revision must be separate, nonnested directories",
  );
  await fs.mkdir(path.dirname(dst), { recursive: true });
  try {
    await fs.mkdir(dst);
  } catch (e) {
    if (e.code === "EEXIST")
      throw Object.assign(new Error(`Revision already exists: ${dst}`), {
        code: "OUTPUT_EXISTS",
        exit: 2,
      });
    throw e;
  }
  let hashes;
  try {
    await copyTree(src, path.join(dst, "source"));
    hashes = await treeHashes(path.join(dst, "source"));
  } catch (e) {
    await failureRecord(dst, e);
    throw e;
  }
  return {
    root: dst,
    source: path.join(dst, "source"),
    source_hash: hash(JSON.stringify(hashes)),
    source_files: hashes,
  };
}
export async function failureRecord(root, e) {
  await writeJson(path.join(root, "failure.json"), {
    status: "incomplete",
    code: e.code ?? "RENDER_FAILED",
    message: e.message,
    details: e.details ?? {},
    time: new Date().toISOString(),
  });
}
