// Repo guard CLI.
//   node scripts/guard-files.ts --staged    checks what is in the git index (pre-commit)
//   node scripts/guard-files.ts --tracked   checks every tracked file (CI, `npm run guard`)
// Dependency-free. Erasable TypeScript only. Git is spawned with argument arrays, never a shell.

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { checkFile, type FileInput, type Violation } from "./lib/guard.ts";

const USAGE = "usage: node scripts/guard-files.ts --staged | --tracked";
const MAX_BUFFER = 256 * 1024 * 1024;

function git(args: string[]): Buffer {
  return execFileSync("git", args, { maxBuffer: MAX_BUFFER, stdio: ["ignore", "pipe", "pipe"] });
}

function splitNul(buf: Buffer): string[] {
  return buf
    .toString("utf8")
    .split("\0")
    .filter((s) => s.length > 0);
}

function isBinary(bytes: Buffer): boolean {
  return bytes.subarray(0, 8000).includes(0);
}

function toInput(path: string, bytes: Buffer): FileInput {
  return { path, size: bytes.length, content: isBinary(bytes) ? null : bytes.toString("utf8") };
}

function readIndexBlob(path: string): Buffer {
  return git(["cat-file", "blob", `:${path}`]);
}

function collect(mode: "--staged" | "--tracked"): FileInput[] {
  if (mode === "--staged") {
    const paths = splitNul(git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]));
    return paths.map((p) => toInput(p, readIndexBlob(p)));
  }
  const paths = splitNul(git(["ls-files", "-z"]));
  const inputs: FileInput[] = [];
  for (const p of paths) {
    let stat;
    try {
      stat = statSync(p);
    } catch {
      continue; // tracked but deleted in the working tree
    }
    if (!stat.isFile()) continue;
    inputs.push(toInput(p, readFileSync(p)));
  }
  return inputs;
}

function main(argv: string[]): number {
  const flag = argv[0];
  if (argv.length !== 1 || (flag !== "--staged" && flag !== "--tracked")) {
    console.error(USAGE);
    return 2;
  }
  const files = collect(flag);
  const violations: Violation[] = files.flatMap((f) => checkFile(f));
  if (violations.length > 0) {
    for (const v of violations) console.error(`guard: ${v.rule}: ${v.path}`);
    return 1;
  }
  console.log(`guard: ${files.length} file(s) ok (${flag.slice(2)})`);
  return 0;
}

process.exit(main(process.argv.slice(2)));
