// Content validator CLI (CONT-02).
//   node scripts/validate-content.ts [--write] [--root <dir>]
// Checks every lesson under content/tracks/ and content/_fixtures/ (never _fixtures/invalid/)
// with the rules in scripts/lib/content/rules/, then compares content/lesson-manifest.json with a
// fresh build of it. `--write` rewrites the manifest instead. `--root` (default `.`) runs on
// another tree, for tests. One line per break, `<file>:<line> <rule-id>: <message>`, then the
// summary. Exit 0 clean, 1 breaks, 2 bad arguments. Erasable TypeScript only.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadContext } from "./lib/content/context.ts";
import {
  buildManifest,
  MANIFEST_PATH,
  manifestMatches,
  renderManifest,
} from "./lib/content/manifest.ts";
import { compareIssues, formatIssue, type Issue, runRules } from "./lib/content/rules/index.ts";

const USAGE = "usage: node scripts/validate-content.ts [--write] [--root <dir>]";

function parseArgs(argv: string[]): { write: boolean; root: string } | null {
  let write = false;
  let root = ".";
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--write") {
      write = true;
    } else if (flag === "--root") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) return null;
      root = value;
      i += 1;
    } else {
      return null;
    }
  }
  return { write, root };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function main(argv: string[]): number {
  const args = parseArgs(argv);
  if (args === null) {
    console.error(USAGE);
    return 2;
  }
  const root = resolve(args.root);
  if (!existsSync(root)) {
    console.error(`validate-content: folder not found: ${args.root}`);
    return 2;
  }

  const ctx = loadContext(root);
  const issues: Issue[] = runRules(ctx);

  const manifest = buildManifest(ctx);
  const manifestFile = join(root, ...MANIFEST_PATH.split("/"));
  if (args.write) {
    writeFileSync(manifestFile, renderManifest(manifest), "utf8");
  } else {
    const committed = existsSync(manifestFile) ? readFileSync(manifestFile, "utf8") : null;
    if (!manifestMatches(committed, manifest)) {
      issues.push({
        file: MANIFEST_PATH,
        line: 1,
        ruleId: "manifest-stale",
        message:
          "content/lesson-manifest.json is out of date. Run npm run validate -- --write, then commit it.",
      });
    }
  }
  issues.sort(compareIssues);

  if (issues.length === 0) {
    console.log(`validate-content: ${plural(ctx.lessons.length, "lesson")} checked, no problems.`);
    return 0;
  }
  for (const issue of issues) console.error(formatIssue(issue));
  const broken = new Set(
    issues
      .map((i) => ctx.lessons.find((l) => i.file.startsWith(`${l.dir}/`))?.dir)
      .filter((d) => d !== undefined),
  ).size;
  const where = broken > 0 ? ` in ${plural(broken, "lesson")}` : "";
  console.error(
    `validate-content: ${plural(issues.length, "problem")}${where}. Nothing ships until ${issues.length === 1 ? "it is" : "they are"} fixed.`,
  );
  return 1;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
