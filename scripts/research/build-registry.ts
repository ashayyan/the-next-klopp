// CLI: node scripts/research/build-registry.ts [--check] [--report] [--list]
// Merges research/seed-sources.json, research/<slug>/sources.json (DOMAIN_SLUGS order) and
// research/jit-seed-sources.json into research/SOURCE_REGISTRY.json and SOURCE_ALIASES.json.
//   (no flag)  write both files
//   --check    merge in memory; exit 1 if either committed file differs by parsed value
//   --report   print merges, conflicts, excerpt renames, unverified and unknown-licence ids
//   --list     print one line per registry entry: id | type | status | title
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { DOMAIN_SLUGS } from "./lib/domains.ts";
import {
  type MergeInput,
  type MergeReport,
  type MergeResult,
  mergeSources,
  type RegistryOverrides,
} from "./lib/registry.ts";
import type { SourceEntry } from "./lib/research-files.ts";

export const REGISTRY_FILE = "SOURCE_REGISTRY.json";
export const ALIASES_FILE = "SOURCE_ALIASES.json";
export const OVERRIDES_FILE = "registry-overrides.json";
export const JIT_FILE = "jit-seed-sources.json";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readSourceList(path: string): SourceEntry[] {
  const data = readJson(path);
  if (!Array.isArray(data)) throw new Error(`${path} is not a JSON array`);
  return data as SourceEntry[];
}

/** The merge inputs in their fixed order, read from `<root>/research`. */
export function loadInputs(root: string): MergeInput[] {
  const dir = join(root, "research");
  const inputs: MergeInput[] = [
    { origin: "seed", sources: readSourceList(join(dir, "seed-sources.json")) },
  ];
  for (const slug of DOMAIN_SLUGS) {
    const p = join(dir, slug, "sources.json");
    if (existsSync(p)) inputs.push({ origin: slug, sources: readSourceList(p) });
  }
  const jit = join(dir, JIT_FILE);
  if (existsSync(jit)) inputs.push({ origin: "jit-seed", sources: readSourceList(jit) });
  return inputs;
}

export function loadOverrides(root: string): RegistryOverrides {
  const p = join(root, "research", OVERRIDES_FILE);
  if (!existsSync(p)) return { schema_version: 1, same_as: [] };
  const data = readJson(p) as RegistryOverrides;
  if (data.schema_version !== 1 || !Array.isArray(data.same_as)) {
    throw new Error(`${p} must be { "schema_version": 1, "same_as": [[...], ...] }`);
  }
  return data;
}

export function buildRegistry(root: string): MergeResult {
  return mergeSources(loadInputs(root), loadOverrides(root));
}

export function aliasDocument(result: MergeResult): {
  schema_version: 1;
  aliases: Record<string, string>;
  excerpt_aliases: Record<string, string>;
} {
  return { schema_version: 1, aliases: result.aliases, excerpt_aliases: result.excerptAliases };
}

function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Names of the committed files that are missing or differ from a fresh merge (parsed value). */
export function staleFiles(root: string, result: MergeResult): string[] {
  const stale: string[] = [];
  const expected: [string, unknown][] = [
    [REGISTRY_FILE, result.registry],
    [ALIASES_FILE, aliasDocument(result)],
  ];
  for (const [file, value] of expected) {
    const p = join(root, "research", file);
    if (!existsSync(p) || !isDeepStrictEqual(readJson(p), JSON.parse(toJson(value)))) {
      stale.push(file);
    }
  }
  return stale;
}

export function formatReport(report: MergeReport): string {
  const out: string[] = [];
  out.push(`inputs: ${report.inputs.map((i) => `${i.origin}=${i.count}`).join(", ")}`);
  out.push(`registry entries: ${report.entries}`);
  out.push("", `merges (${report.merges.length}):`);
  for (const m of report.merges) {
    out.push(`  ${m.id}`);
    for (const x of m.members) out.push(`    ${x.origin}: ${x.id} ${x.url}`);
  }
  out.push("", `conflicts (${report.conflicts.length}):`);
  for (const c of report.conflicts) {
    out.push(`  ${c.id} ${c.field}: ${c.values.map((v) => `${v.origin}=${v.value}`).join(" ; ")}`);
  }
  out.push("", `excerpt renames (${report.excerptRenames.length}):`);
  for (const r of report.excerptRenames) {
    out.push(`  ${r.id}#${r.from} -> ${r.id}#${r.to} (${r.origin})`);
  }
  out.push("", `unverified (${report.unverified.length}): ${report.unverified.join(", ")}`);
  out.push("", `unknown licence fields (${report.unknownLicence.length}):`);
  for (const u of report.unknownLicence) out.push(`  ${u.id}: ${u.fields.join(", ")}`);
  return out.join("\n");
}

function main(argv: string[]): number {
  const root = join(import.meta.dirname, "..", "..");
  const result = buildRegistry(root);
  const flags = new Set(argv);
  if (flags.has("--report")) console.log(formatReport(result.report));
  if (flags.has("--list")) {
    for (const s of result.registry) console.log(`${s.id} | ${s.type} | ${s.status} | ${s.title}`);
  }
  if (flags.has("--check")) {
    const stale = staleFiles(root, result);
    if (stale.length > 0) {
      console.error(
        `registry out of date: ${stale.join(", ")} (run node scripts/research/build-registry.ts)`,
      );
      return 1;
    }
    console.log(`registry up to date (${result.registry.length} entries)`);
    return 0;
  }
  if (flags.has("--report") || flags.has("--list")) return 0;
  writeFileSync(join(root, "research", REGISTRY_FILE), toJson(result.registry));
  writeFileSync(join(root, "research", ALIASES_FILE), toJson(aliasDocument(result)));
  console.log(
    `wrote research/${REGISTRY_FILE} (${result.registry.length} entries) and research/${ALIASES_FILE} (${Object.keys(result.aliases).length} aliases)`,
  );
  return 0;
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
