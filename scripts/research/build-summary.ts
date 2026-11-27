// CLI: node scripts/research/build-summary.ts [--root research] [--adr <file>] [--out <file>] [--check]
// Builds the self-contained approval page from the research JSON. `--check` rebuilds in memory and
// exits 1 when the file on disk differs or is missing. Erasable TypeScript only.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { checkGraph } from "./lib/graph.ts";
import { layoutConcepts } from "./lib/layout.ts";
import { BUNDLE_FILES, loadResearchBundle } from "./lib/research-io.ts";
import { buildSummaryHtml, parseDecision } from "./lib/summary-html.ts";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const DEFAULT_ADR = "docs/decisions/0008-watch-gym-l1-clip-supply.md";

interface Args {
  root: string;
  adr: string;
  out: string;
  check: boolean;
}

function parseArgs(argv: string[]): Args | string {
  let root = "research";
  let adr = DEFAULT_ADR;
  let out: string | null = null;
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    const take = (name: string): string | null => {
      if (arg === name) return argv[++i] ?? null;
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
      return null;
    };
    if (arg === "--check") check = true;
    else if (arg === "--root" || arg.startsWith("--root=")) {
      const v = take("--root");
      if (!v) return "--root needs a directory";
      root = v;
    } else if (arg === "--adr" || arg.startsWith("--adr=")) {
      const v = take("--adr");
      if (!v) return "--adr needs a file";
      adr = v;
    } else if (arg === "--out" || arg.startsWith("--out=")) {
      const v = take("--out");
      if (!v) return "--out needs a file";
      out = v;
    } else return `unknown argument: ${arg}`;
  }
  const absRoot = resolve(REPO_ROOT, root);
  return {
    root: absRoot,
    adr: resolve(REPO_ROOT, adr),
    out: out ? resolve(REPO_ROOT, out) : join(absRoot, "summary", "index.html"),
    check,
  };
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args === "string") {
    console.error(
      `${args}\nusage: node scripts/research/build-summary.ts [--root <dir>] [--adr <file>] [--out <file>] [--check]`,
    );
    return 2;
  }
  if (!existsSync(join(args.root, BUNDLE_FILES.conceptMap))) {
    console.error(`no research inputs under ${args.root}`);
    return 1;
  }
  let bundle: ReturnType<typeof loadResearchBundle>;
  try {
    bundle = loadResearchBundle(args.root);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }
  const graph = checkGraph(bundle.concepts);
  if (graph.errors.length > 0) {
    console.error(`concept map has graph errors:\n- ${graph.errors.join("\n- ")}`);
    return 1;
  }

  const decision = existsSync(args.adr)
    ? parseDecision(readFileSync(args.adr, "utf8"))
    : { title: null, bullets: [] };
  const approvalPath = join(args.root, "APPROVAL.md");
  const approvalStatus = existsSync(approvalPath)
    ? (/^Status:\s*(.+)$/im.exec(readFileSync(approvalPath, "utf8"))?.[1]?.trim() ?? "pending")
    : "pending";

  const html = buildSummaryHtml(bundle, layoutConcepts(bundle.concepts), decision, {
    approvalStatus,
  });

  if (args.check) {
    if (!existsSync(args.out)) {
      console.error(`${args.out}: missing\nrun: npm run research:summary`);
      return 1;
    }
    if (!readFileSync(args.out).equals(Buffer.from(html, "utf8"))) {
      console.error(`${args.out}: stale\nrun: npm run research:summary`);
      return 1;
    }
    console.log(`summary up to date: ${args.out}`);
    return 0;
  }

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, html, "utf8");
  console.log(`wrote ${args.out} (${Buffer.byteLength(html, "utf8")} bytes)`);
  return 0;
}

process.exitCode = main();
