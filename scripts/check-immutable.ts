// Artifact immutability gate CLI (PIPE-03, T-03-23).
//   node scripts/check-immutable.ts --staged        checks the git index (pre-commit)
//   node scripts/check-immutable.ts --base <ref>    checks <ref>...HEAD (CI, `npm run guard:immutable`)
// A file inside a published version directory (data/<dataset>/<version>/ or
// public/data/<dataset>/<version>/) may only be added. Modify, delete and rename fail.
// catalog.json is the one mutable file. Exit 0 ok, 1 violations, 2 bad arguments or unknown ref.
// Dependency-free. Erasable TypeScript only. Git is spawned with argument arrays, never a shell.

import { spawnSync } from "node:child_process";

const USAGE = "usage: node scripts/check-immutable.ts --staged | --base <ref>";
const ZERO_SHA = /^0{40,64}$/;

export interface NameStatusEntry {
  /** First letter of the git status: A, M, D, R, C, T. */
  status: string;
  /** The path before the change (the only path for A, M, D). */
  path: string;
  /** The new path for renames and copies. */
  newPath: string | null;
}

export function parseNameStatus(output: string): NameStatusEntry[] {
  const entries: NameStatusEntry[] = [];
  for (const raw of output.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.trim() === "") continue;
    const [code, first, second] = line.split("\t");
    if (!code || !first) continue;
    entries.push({ status: code.charAt(0), path: first, newPath: second ?? null });
  }
  return entries;
}

function normalise(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

/** True for `data/<dataset>/<version>/<file>` and `public/data/<dataset>/<version>/<file>`. */
export function inVersionDir(path: string): boolean {
  const segments = normalise(path).toLowerCase().split("/");
  const start = segments[0] === "public" ? 1 : 0;
  if (segments[start] !== "data") return false;
  return segments.length >= start + 4;
}

export function findImmutableViolations(entries: readonly NameStatusEntry[]): NameStatusEntry[] {
  return entries.filter((e) => {
    if (e.status === "A") return false;
    if (e.status === "C") return false;
    return inVersionDir(e.path);
  });
}

function git(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("git", ["-c", "core.quotePath=false", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function report(entries: readonly NameStatusEntry[], label: string): number {
  const violations = findImmutableViolations(entries);
  if (violations.length > 0) {
    for (const v of violations) {
      const target = v.newPath ? ` -> ${v.newPath}` : "";
      console.error(
        `immutable: ${v.status}: ${v.path}${target} (version directories are add-only)`,
      );
    }
    return 1;
  }
  console.log(`immutable: ok (${label})`);
  return 0;
}

export function main(argv: string[]): number {
  const mode = argv[0];
  if (mode === "--staged" && argv.length === 1) {
    const r = git(["diff", "--cached", "--name-status"]);
    if (r.status !== 0) {
      console.error(r.stderr.trim());
      return 2;
    }
    return report(parseNameStatus(r.stdout), "staged");
  }
  if (mode === "--base" && argv.length === 2 && argv[1]) {
    const base = argv[1];
    if (ZERO_SHA.test(base)) {
      console.log("immutable: base is all zeros (first push of a branch), nothing to compare");
      return 0;
    }
    const known = git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
    if (known.status !== 0) {
      console.error(`immutable: unknown ref: ${base}`);
      return 2;
    }
    const r = git([
      "diff",
      "--name-status",
      "--diff-filter=MDRT",
      `${base}...HEAD`,
      "--",
      "data",
      "public/data",
    ]);
    if (r.status !== 0) {
      console.error(r.stderr.trim());
      return 2;
    }
    return report(parseNameStatus(r.stdout), `base ${base}`);
  }
  console.error(USAGE);
  return 2;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
