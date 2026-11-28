// Dist bundle gate CLI.
//   node scripts/check-bundle.ts [--dist dist] [--manifest deploy/deny-manifest.json]
// Exit 0 clean, 1 violations, 2 bad arguments or missing dist.
// Dependency-free apart from zod (via the shared libs). Erasable TypeScript only.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { checkBundle, type DistFile } from "./lib/bundle.ts";
import { loadDenyManifest } from "./lib/globs.ts";

const USAGE = "usage: node scripts/check-bundle.ts [--dist dist] [--manifest <file>]";
// Everything that can carry a path marker as text. Binary assets (wasm, images, fonts) are only
// hashed, sized and checked by name.
const TEXT_EXTENSIONS = [
  ".js",
  ".mjs",
  ".html",
  ".css",
  ".json",
  ".map",
  ".svg",
  ".txt",
  ".csv",
  ".tsv",
  ".xml",
  ".webmanifest",
  ".ndjson",
  ".jsonl",
];

function parseArgs(argv: string[]): { dist: string; manifest: string } | null {
  let dist = "dist";
  let manifest = "deploy/deny-manifest.json";
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined) return null;
    if (flag === "--dist") dist = value;
    else if (flag === "--manifest") manifest = value;
    else return null;
  }
  return { dist, manifest };
}

/** Regular files go to `files`; symlinks are never followed or hashed, so they are reported. */
function walk(
  dir: string,
  files: string[] = [],
  links: string[] = [],
): { files: string[]; links: string[] } {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) links.push(full);
    else if (entry.isDirectory()) walk(full, files, links);
    else if (entry.isFile()) files.push(full);
  }
  return { files, links };
}

function toDistFile(root: string, full: string): DistFile {
  const bytes = readFileSync(full);
  const lower = full.toLowerCase();
  const isText = TEXT_EXTENSIONS.some((e) => lower.endsWith(e));
  return {
    path: relative(root, full).replace(/\\/g, "/"),
    bytes: statSync(full).size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    text: isText ? bytes.toString("utf8") : null,
  };
}

function main(argv: string[]): number {
  const args = parseArgs(argv);
  if (args === null) {
    console.error(USAGE);
    return 2;
  }
  if (!existsSync(args.dist) || !statSync(args.dist).isDirectory()) {
    console.error(`check-bundle: dist folder not found: ${args.dist}`);
    return 2;
  }
  const manifest = loadDenyManifest(args.manifest);
  const walked = walk(args.dist);
  const files = walked.files.map((f) => toDistFile(args.dist, f));
  const catalogFile = files.find((f) => f.path === "data/catalog.json");
  let catalog: unknown = null;
  if (catalogFile?.text) {
    try {
      catalog = JSON.parse(catalogFile.text);
    } catch {
      catalog = {};
    }
  }
  const violations = checkBundle(files, manifest, catalog);
  for (const link of walked.links) {
    violations.push({
      rule: "symlink",
      path: relative(args.dist, link).replace(/\\/g, "/"),
      detail: "symbolic links are never shipped",
    });
  }
  if (violations.length > 0) {
    for (const v of violations) console.error(`bundle: ${v.rule}: ${v.path} (${v.detail})`);
    return 1;
  }
  console.log(`bundle ok: ${files.length} files`);
  return 0;
}

process.exit(main(process.argv.slice(2)));
