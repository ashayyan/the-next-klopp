// CLI: node scripts/research/render-views.ts [--root <dir>] [--out <dir>] [--check]
// Renders the generated Markdown views from the research JSON. `--check` renders in memory and
// byte-compares with the files in --out, so a hand edit or a stale view fails the build.
// Erasable TypeScript only so it runs under native type stripping.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkGraph, layers } from "./lib/graph.ts";
import { BUNDLE_FILES, loadResearchBundle } from "./lib/research-io.ts";
import {
  prereqMap,
  renderConceptMap,
  renderCurriculumDraft,
  renderGaps,
  renderRoleCompetencies,
} from "./lib/views.ts";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

interface Args {
  root: string;
  out: string;
  check: boolean;
}

function parseArgs(argv: string[]): Args | string {
  let root = "research";
  let out: string | null = null;
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    const value = (name: string): string | null => {
      if (arg === name) return argv[++i] ?? null;
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
      return null;
    };
    if (arg === "--check") check = true;
    else if (arg === "--root" || arg.startsWith("--root=")) {
      const v = value("--root");
      if (!v) return "--root needs a directory";
      root = v;
    } else if (arg === "--out" || arg.startsWith("--out=")) {
      const v = value("--out");
      if (!v) return "--out needs a directory";
      out = v;
    } else return `unknown argument: ${arg}`;
  }
  const absRoot = resolve(REPO_ROOT, root);
  return { root: absRoot, out: out ? resolve(REPO_ROOT, out) : absRoot, check };
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args === "string") {
    console.error(
      `${args}\nusage: node scripts/research/render-views.ts [--root <dir>] [--out <dir>] [--check]`,
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

  const views = new Map<string, string>();
  const skipped: string[] = [];
  views.set("CONCEPT_MAP.md", renderConceptMap(bundle));
  views.set("CURRICULUM_DRAFT.md", renderCurriculumDraft(bundle));
  if (bundle.roles.length > 0 && bundle.competencies.length > 0) {
    views.set("ROLE_COMPETENCIES.md", renderRoleCompetencies(bundle));
  } else skipped.push("ROLE_COMPETENCIES.md (needs roles.json and competencies.json)");
  if (bundle.gaps) views.set("GAPS.md", renderGaps(bundle));
  else skipped.push("GAPS.md (needs gaps.json)");

  const { layer } = layers(prereqMap(bundle.concepts));
  const roots = bundle.concepts.filter((c) => c.prerequisites.length === 0).length;
  const maxPrereqs = Math.max(0, ...bundle.concepts.map((c) => c.prerequisites.length));
  const depth = layer.size > 0 ? Math.max(...layer.values()) + 1 : 0;
  console.log(
    `quality: ${bundle.concepts.length} concepts, ${roots} roots, ${depth} layers, max ${maxPrereqs} prerequisites`,
  );
  for (const w of graph.warnings) console.log(`warning: ${w}`);
  for (const s of skipped) console.log(`skipped: ${s}`);

  if (args.check) {
    const bad: string[] = [];
    for (const [name, content] of views) {
      const path = join(args.out, name);
      if (!existsSync(path)) bad.push(`${name}: missing`);
      else if (!readFileSync(path).equals(Buffer.from(content, "utf8"))) bad.push(`${name}: stale`);
    }
    if (bad.length > 0) {
      console.error(`views out of date under ${args.out}:\n- ${bad.join("\n- ")}`);
      console.error("run: npm run research:views");
      return 1;
    }
    console.log(`${views.size} view(s) up to date under ${args.out}`);
    return 0;
  }

  mkdirSync(args.out, { recursive: true });
  for (const [name, content] of views) {
    writeFileSync(join(args.out, name), content, "utf8");
    console.log(`wrote ${join(args.out, name)}`);
  }
  return 0;
}

process.exitCode = main();
