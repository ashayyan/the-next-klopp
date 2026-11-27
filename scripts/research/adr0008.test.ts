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

/**
 * Body of the section that starts at `heading` (exact line) and ends at the next heading of the
 * same or a higher level, so a "## Decision" section includes its "###" sub-sections.
 */
function section(heading: string): string {
  const lines = adr.split(/\r?\n/);
  const i = lines.findIndex((l) => l.trim() === heading);
  if (i < 0) return "";
  const level = (heading.match(/^#+/)?.[0] ?? "#").length;
  const rest = lines.slice(i + 1);
  const end = rest.findIndex((l) => {
    const m = l.match(/^(#{1,6}) /);
    return m !== null && (m[1] as string).length <= level;
  });
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

/** List items ("- ...") of a section body. */
function bullets(body: string): string[] {
  return body.split(/\r?\n/).filter((l) => /^\s*- /.test(l));
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

describe("ADR 0008: shipping policy, PL gaps, consumers and alternatives", () => {
  it("has a Deploy deny-manifest sub-section inside Decision or Consequences", () => {
    const deny = section("### Deploy deny-manifest");
    expect(deny, 'no "### Deploy deny-manifest" heading').not.toBe("");
    const inside = [section("## Decision"), section("## Consequences")].some((b) =>
      b.includes("### Deploy deny-manifest"),
    );
    expect(inside, "deny-manifest must sit inside Decision or Consequences").toBe(true);
    const globs = [...deny.matchAll(/`([^`]*\*[^`]*)`/g)].map((m) => m[1] as string);
    expect(globs.length, "at least two backticked glob patterns").toBeGreaterThanOrEqual(2);
    expect(globs.some((g) => /statsbomb/i.test(g))).toBe(true);
    expect(globs.some((g) => /last-row/i.test(g))).toBe(true);
    expect(deny).toMatch(/dist\//);
    expect(deny).toMatch(/fail/);
  });

  it("lists the PL gaps: no 360, tracking only from Last Row, no physical data", () => {
    const items = bullets(section("### PL gaps"));
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.some((l) => /360/.test(l))).toBe(true);
    expect(items.some((l) => /Last Row/.test(l) && /tracking|off-ball/i.test(l))).toBe(true);
    expect(items.some((l) => /physical/i.test(l))).toBe(true);
  });

  it("names the consumers in Phase 3, Phase 3/5 and Phase 8", () => {
    const lines = bullets(section("## Consequences"));
    const has = (...res: RegExp[]) => lines.some((l) => res.every((re) => re.test(l)));
    expect(has(/Phase 3/, /manifest/, /credit/), "Phase 3 manifests carry the data credit").toBe(
      true,
    );
    expect(has(/Phase 3\/5/, /bundle gate/, /deny-manifest/), "Phase 3/5 bundle gate").toBe(true);
    expect(has(/Phase 8/, /clip spec/, /fallback/), "Phase 8 clip specs carry a fallback").toBe(
      true,
    );
  });

  it("rejects the four alternatives, each with a reason and a citation", () => {
    const items = bullets(section("## Alternatives"));
    const wanted: Array<[string, RegExp]> = [
      ["YouTube embed with overlays", /embed/i],
      ["downloading broadcast clips", /download/i],
      ["shipping StatsBomb-derived data publicly", /StatsBomb/],
      ["waiting for PFF form access", /PFF/],
    ];
    for (const [name, re] of wanted) {
      const line = items.find((l) => re.test(l));
      expect(line, `Alternatives lack "${name}"`).toBeDefined();
      expect(line, `"${name}" is not rejected`).toMatch(/rejected/i);
      expect(parseCitations(line as string).length, `"${name}" has no citation`).toBeGreaterThan(0);
    }
  });
});
