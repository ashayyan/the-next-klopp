// ADR 0008 (RSCH-03): the Watch Gym Level 1 clip-supply decision. Checks the decision text, that
// every source citation resolves in the registry, and that its Premier League numbers equal the
// generated coverage matrix (research/pl-data-sources/coverage-matrix.json).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CoverageMatrix } from "./lib/coverage-schema.ts";
import { parseCitations, type SourceEntry } from "./lib/research-files.ts";

const root = join(import.meta.dirname, "..", "..");
const adrPath = join(root, "docs", "decisions", "0008-watch-gym-l1-clip-supply.md");
const registryPath = join(root, "research", "SOURCE_REGISTRY.json");
const aliasesPath = join(root, "research", "SOURCE_ALIASES.json");
const matrixPath = join(root, "research", "pl-data-sources", "coverage-matrix.json");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

const adr = existsSync(adrPath) ? readFileSync(adrPath, "utf8") : "";
const registry = readJson(registryPath) as SourceEntry[];
const aliasDoc = readJson(aliasesPath) as {
  aliases: Record<string, string>;
  excerpt_aliases: Record<string, string>;
};
const byId = new Map(registry.map((s) => [s.id, s]));
const citations = parseCitations(adr);

/** Registry id and excerpt id a citation points to, after alias resolution. */
function resolve(c: { id: string; excerpt: string | null }): {
  id: string;
  excerpt: string | null;
} {
  if (c.excerpt !== null) {
    const target = aliasDoc.excerpt_aliases[`${c.id}#${c.excerpt}`];
    if (target) {
      const [id, ex] = target.split("#");
      return { id: id as string, excerpt: ex ?? null };
    }
  }
  return { id: aliasDoc.aliases[c.id] ?? c.id, excerpt: c.excerpt };
}

const resolved = citations.map(resolve);

/** Lines of the section that starts at `heading` and ends at the next heading of any level. */
function section(heading: string): string {
  const lines = adr.split(/\r?\n/);
  const i = lines.findIndex((l) => l.trim() === heading);
  if (i < 0) return "";
  const rest = lines.slice(i + 1);
  const end = rest.findIndex((l) => /^#{1,6} /.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

describe("ADR 0008: Watch Gym Level 1 clip supply", () => {
  it("exists", () => {
    expect(existsSync(adrPath)).toBe(true);
  });

  it("names the route, the players and the licences", () => {
    for (const k of [
      "Watch Gym",
      "YouTube",
      "StatsBomb",
      "Wyscout",
      "Required Minimum Functionality",
      "link-out",
      "reconstruction fallback",
      "CC BY 4.0",
    ]) {
      expect(adr, `ADR 0008 lacks "${k}"`).toContain(k);
    }
  });

  it("resolves every [src-...] citation to a registry id and excerpt", () => {
    expect(citations.length).toBeGreaterThan(0);
    const bad: string[] = [];
    citations.forEach((c, i) => {
      const r = resolved[i] as { id: string; excerpt: string | null };
      const src = byId.get(r.id);
      const where = `line ${c.line} [${c.id}${c.excerpt ? `#${c.excerpt}` : ""}]`;
      if (!src) bad.push(where);
      else if (r.excerpt !== null && !src.excerpts?.some((e) => e.id === r.excerpt))
        bad.push(where);
    });
    expect(bad).toEqual([]);
  });

  it("cites the StatsBomb agreement with an excerpt and both YouTube documents", () => {
    expect(resolved.some((r) => r.id === "src-statsbomb-open-data" && r.excerpt !== null)).toBe(
      true,
    );
    expect(resolved.some((r) => r.id === "src-youtube-terms")).toBe(true);
    expect(resolved.some((r) => r.id === "src-youtube-api-rmf")).toBe(true);
  });

  it("uses the Premier League counts from coverage-matrix.json", () => {
    const matrix = readJson(matrixPath) as CoverageMatrix;
    const plEvents = (provider: string, competitionId?: string): number =>
      matrix.rows
        .filter(
          (r) =>
            r.provider === provider &&
            r.data_type === "event" &&
            r.status === "ok" &&
            (competitionId === undefined || r.competition_id === competitionId),
        )
        .reduce((n, r) => n + (r.pl_matches ?? 0), 0);
    const statsbomb = plEvents("StatsBomb", "2");
    const wyscout = plEvents("Wyscout");
    expect(statsbomb).toBeGreaterThan(0);
    expect(wyscout).toBeGreaterThan(0);
    const numbers = new Set((adr.match(/\b\d+\b/g) ?? []).map(Number));
    expect(numbers.has(statsbomb), `ADR lacks the StatsBomb PL event total ${statsbomb}`).toBe(
      true,
    );
    expect(numbers.has(wyscout), `ADR lacks the Wyscout PL event count ${wyscout}`).toBe(true);
  });

  it("keeps StatsBomb and Last Row local-only and lets only CC BY sources ship", () => {
    const decision = section("## Decision");
    expect(decision).toMatch(/local study build/);
    expect(decision).toMatch(/Vercel bundle/);
    expect(decision).toMatch(/Last Row/);
    expect(decision).toMatch(/Only CC BY sources/);
    expect(decision).toMatch(/logo/);
  });
});
