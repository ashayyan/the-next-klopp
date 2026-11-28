// CLI: node scripts/research/derive-links.ts [--check] [--root <dir>]
// Reads research/concept-map.json, competencies.json and roles.json and fills the derived fields
// (concept.roles, prerequisite edges, competency.concepts) with lib/derive.ts.
//   (no flag)  write concept-map.json and competencies.json when their parsed value changes
//   --check    exit 1 and name every file whose parsed value differs from a fresh derive
//   --root     research folder to use (default: <repo>/research)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { deriveLinks, toJson } from "./lib/derive.ts";
import { isMainModule } from "./lib/is-main.ts";
import type { Competency, Concept, Edge, Role } from "./lib/research-io.ts";

export const CONCEPT_MAP_FILE = "concept-map.json";
export const COMPETENCIES_FILE = "competencies.json";
export const ROLES_FILE = "roles.json";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

interface Planned {
  file: string;
  current: unknown;
  derived: unknown;
}

/** Derives the links for the research folder `dir` and pairs each output with the file on disk. */
export function planDerive(dir: string): Planned[] {
  for (const f of [CONCEPT_MAP_FILE, COMPETENCIES_FILE, ROLES_FILE]) {
    if (!existsSync(join(dir, f))) throw new Error(`${join(dir, f)} is missing`);
  }
  const map = readJson(join(dir, CONCEPT_MAP_FILE)) as { concepts: Concept[]; edges: Edge[] };
  const competencies = readJson(join(dir, COMPETENCIES_FILE)) as Competency[];
  const roles = readJson(join(dir, ROLES_FILE)) as Role[];
  const out = deriveLinks(map, competencies, roles);
  return [
    { file: CONCEPT_MAP_FILE, current: map, derived: out.conceptMap },
    { file: COMPETENCIES_FILE, current: competencies, derived: out.competencies },
  ];
}

function main(argv: string[]): number {
  const rootFlag = argv.indexOf("--root");
  const dir =
    rootFlag >= 0 && argv[rootFlag + 1]
      ? (argv[rootFlag + 1] as string)
      : join(import.meta.dirname, "..", "..", "research");
  let plan: Planned[];
  try {
    plan = planDerive(dir);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }
  const stale = plan.filter((p) => !isDeepStrictEqual(p.current, p.derived));
  if (argv.includes("--check")) {
    if (stale.length > 0) {
      console.error(
        `derived links out of date: ${stale.map((p) => p.file).join(", ")} (run node scripts/research/derive-links.ts)`,
      );
      return 1;
    }
    console.log("derived links up to date");
    return 0;
  }
  for (const p of stale) writeFileSync(join(dir, p.file), toJson(p.derived));
  console.log(
    stale.length > 0
      ? `wrote ${stale.map((p) => p.file).join(", ")}`
      : "derived links already up to date",
  );
  return 0;
}

if (isMainModule(import.meta.filename, process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}
