import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
export const execute = promisify(execFile);
export class DtpError extends Error {
  constructor(code, message, exit = 2, details = {}) {
    super(message);
    this.code = code;
    this.exit = exit;
    this.details = details;
  }
}
export function demand(ok, code, message, exit = 2, details = {}) {
  if (!ok) throw new DtpError(code, message, exit, details);
}
export const hash = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
export const fileHash = async (p) => hash(await fs.readFile(p));
export async function json(p) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch (e) {
    throw new DtpError("INVALID_JSON", `${p}: ${e.message}`);
  }
}
export async function writeJson(p, value) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2) + "\n");
}
export async function localPath(root, relative) {
  demand(
    typeof relative === "string" && !path.isAbsolute(relative),
    "UNSAFE_PATH",
    "Expected a relative local path",
  );
  const dest = path.resolve(root, relative);
  demand(
    dest.startsWith(path.resolve(root) + path.sep),
    "UNSAFE_PATH",
    `Path escapes source: ${relative}`,
  );
  let current = path.resolve(root);
  for (const part of path.relative(root, dest).split(path.sep)) {
    current = path.join(current, part);
    try {
      const s = await fs.lstat(current);
      demand(
        !s.isSymbolicLink(),
        "UNSAFE_PATH",
        `Links are not allowed: ${relative}`,
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  return dest;
}
export async function files(root, prefix = "") {
  const out = [];
  for (const entry of await fs.readdir(path.join(root, prefix), {
    withFileTypes: true,
  })) {
    demand(
      !entry.isSymbolicLink(),
      "UNSAFE_PATH",
      `Linked resource: ${prefix}/${entry.name}`,
    );
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) out.push(...(await files(root, rel)));
    else if (entry.isFile()) out.push(rel);
    else throw new DtpError("UNSAFE_PATH", `Nonregular resource: ${rel}`);
  }
  return out.sort();
}
export async function treeHashes(root) {
  return Object.fromEntries(
    await Promise.all(
      (await files(root)).map(async (p) => [
        p,
        await fileHash(path.join(root, p)),
      ]),
    ),
  );
}
export async function copyTree(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const rel of await files(src)) {
    const to = path.join(dest, rel);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(path.join(src, rel), to);
  }
}
export async function run(command, args, options = {}) {
  try {
    return await execute(command, args, {
      timeout: options.timeout ?? 30000,
      maxBuffer: 16 * 1024 * 1024,
      ...options,
    });
  } catch (e) {
    throw new DtpError(
      e.code === "ENOENT" ? "MISSING_TOOL" : "TOOL_FAILED",
      `${command}: ${e.message}`,
      e.code === "ENOENT" ? 3 : 4,
    );
  }
}
export const escapeHtml = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export const normalizeText = (s) => s.replace(/\s+/gu, " ").trim();
