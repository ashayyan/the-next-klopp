// Gap list gate (RSCH-05). research/gaps.json is the one source of truth for research/GAPS.md.
// "integrity" checks the file against its schema and the registry; "coverage" checks that no
// brief section 6.2 domain is dropped and that every licence, PL-coverage and competency gap is
// listed. File-based cases skip while gaps.json is absent, unless RESEARCH_GATE=1.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRIEF_DOMAINS, TRACKS } from "./lib/domains.ts";
import type { SourceEntry } from "./lib/research-files.ts";
import { type Gaps, gapsSchema } from "./lib/research-io.ts";

const root = join(import.meta.dirname, "..", "..");
const gate = process.env.RESEARCH_GATE === "1";
const gapsPath = join(root, "research", "gaps.json");
const registryPath = join(root, "research", "SOURCE_REGISTRY.json");
const aliasesPath = join(root, "research", "SOURCE_ALIASES.json");
const hasGaps = existsSync(gapsPath);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

const raw: unknown = hasGaps ? readJson(gapsPath) : null;
const parsed = hasGaps ? gapsSchema.safeParse(raw) : null;
const gaps: Gaps | null = parsed?.success ? parsed.data : null;
const registry = (existsSync(registryPath) ? readJson(registryPath) : []) as SourceEntry[];
const aliases = (
  existsSync(aliasesPath) ? (readJson(aliasesPath) as { aliases: Record<string, string> }) : {}
) as { aliases?: Record<string, string> };
const byId = new Map(registry.map((s) => [s.id, s]));
const resolveId = (id: string): string => aliases.aliases?.[id] ?? id;
const isUrl = (s: string): boolean => /^https?:\/\/\S+$/.test(s);

describe("gaps: integrity", () => {
  it.skipIf(hasGaps || !gate)("exists under npm run research:gate", () => {
    expect(hasGaps).toBe(true);
  });

  describe.skipIf(!hasGaps)("committed gaps.json", () => {
    it("is valid against gapsSchema", () => {
      expect(parsed?.success, JSON.stringify(parsed?.error?.issues ?? [])).toBe(true);
    });

    it("uses only brief section 6.2 domain numbers", () => {
      const known = new Set(BRIEF_DOMAINS.map((d) => d.number));
      for (const d of gaps?.deferred_domains ?? []) {
        expect(known.has(d.brief_domain), `unknown brief domain ${d.brief_domain}`).toBe(true);
      }
    });

    it("names tracks that exist, a trigger and a reason on every row", () => {
      const tracks = new Set(TRACKS.map((t) => t.id));
      for (const d of gaps?.deferred_domains ?? []) {
        for (const t of d.must_precede) expect(tracks.has(t), `${d.name}: ${t}`).toBe(true);
        expect(d.research_trigger.trim(), d.name).not.toBe("");
        expect(d.why_deferred.trim(), d.name).not.toBe("");
      }
    });

    it("cites starting sources that are registry ids (through aliases) or http(s) URLs", () => {
      for (const d of gaps?.deferred_domains ?? []) {
        for (const s of d.starting_sources) {
          expect(isUrl(s) || byId.has(resolveId(s)), `${d.name}: unresolved ${s}`).toBe(true);
        }
      }
    });

    it("cites registry ids for unknown-licence sources and PL gap evidence", () => {
      for (const s of gaps?.unknown_licence_sources ?? []) {
        expect(byId.has(resolveId(s.source_id)), s.source_id).toBe(true);
      }
      for (const g of gaps?.pl_coverage_gaps ?? []) {
        for (const e of g.evidence) expect(byId.has(resolveId(e)), `${g.id}: ${e}`).toBe(true);
      }
    });

    it("GAPS.md equals the render of gaps.json (render-views --check)", () => {
      const res = spawnSync(
        process.execPath,
        [join(import.meta.dirname, "render-views.ts"), "--root", "research", "--check"],
        { cwd: root, encoding: "utf8" },
      );
      expect(res.status, res.stderr).toBe(0);
      expect(readFileSync(join(root, "research", "GAPS.md"), "utf8")).toContain(
        "Do not edit by hand",
      );
    });
  });
});

const LICENCE_FIELDS = ["read", "automated_access", "redistribute", "derivative"] as const;
const PL_GAP_IDS = [
  "no-pl-360",
  "pl-tracking-last-row-only",
  "no-pl-physical",
  "statsbomb-redistribution",
  "data-credit-logo",
  "fbref-advanced-removed",
  "transfermarkt-datasets-paused",
  "understat-capology-terms-unknown",
];
const conceptMapPath = join(root, "research", "concept-map.json");
const competenciesPath = join(root, "research", "competencies.json");
const adrPath = join(root, "docs", "decisions", "0008-watch-gym-l1-clip-supply.md");

interface MapConcept {
  id: string;
  track: string;
  sources: string[];
}

function unknownFields(s: SourceEntry): string[] {
  const licence = s.license as unknown as Record<string, { value: string } | undefined>;
  return LICENCE_FIELDS.filter((f) => licence[f]?.value === "unknown");
}

describe.skipIf(!hasGaps)("gaps: coverage", () => {
  const concepts =
    (existsSync(conceptMapPath) ? (readJson(conceptMapPath) as { concepts: MapConcept[] }) : null)
      ?.concepts ?? [];
  const deferredTracks = new Set((gaps?.deferred_domains ?? []).flatMap((d) => d.must_precede));

  it("has a row for every brief domain that is deferred or partial, covering its tracks", () => {
    const missing: string[] = [];
    for (const bd of BRIEF_DOMAINS.filter((d) => d.coverage !== "wave1")) {
      const rows = (gaps?.deferred_domains ?? []).filter((r) => r.brief_domain === bd.number);
      if (rows.length === 0) {
        missing.push(`${bd.number} (no row)`);
        continue;
      }
      const covered = new Set(rows.flatMap((r) => r.must_precede));
      for (const t of bd.proposedTracks) if (!covered.has(t)) missing.push(`${bd.number} (${t})`);
    }
    expect(missing).toEqual([]);
  });

  it("splits brief domain 14 into a-c for Scouting I and d-f for Scouting II", () => {
    const rows = (gaps?.deferred_domains ?? []).filter((r) => r.brief_domain === "14");
    expect(rows.some((r) => r.must_precede.includes("t21-scouting-1"))).toBe(true);
    expect(rows.some((r) => r.must_precede.includes("t22-scouting-2"))).toBe(true);
  });

  it("lists every unknown-licence source that Tracks 0-4 or ADR 0008 cite", () => {
    expect(concepts.length).toBeGreaterThan(0);
    const needed = new Set<string>();
    for (const c of concepts.filter((x) => /^t0[0-4]-/.test(x.track))) {
      for (const s of c.sources) needed.add(resolveId(s));
    }
    const adr = existsSync(adrPath) ? readFileSync(adrPath, "utf8") : "";
    for (const m of adr.matchAll(/\[(src-[a-z0-9]+(?:-[a-z0-9]+)*)(?:#[a-z0-9-]+)?\]/g)) {
      needed.add(resolveId(m[1] as string));
    }
    const listed = new Set(
      (gaps?.unknown_licence_sources ?? []).map((s) => resolveId(s.source_id)),
    );
    const unlisted = [...needed]
      .filter((id) => {
        const s = byId.get(id);
        return s !== undefined && unknownFields(s).length > 0;
      })
      .filter((id) => !listed.has(id))
      .sort();
    expect(unlisted).toEqual([]);
  });

  it("lists only sources that really have an unknown licence field", () => {
    for (const s of gaps?.unknown_licence_sources ?? []) {
      const entry = byId.get(resolveId(s.source_id));
      expect(entry && unknownFields(entry).length > 0, s.source_id).toBe(true);
    }
  });

  it("names every Premier League coverage gap from the matrix and ADR 0008", () => {
    const ids = (gaps?.pl_coverage_gaps ?? []).map((g) => g.id);
    for (const id of PL_GAP_IDS) expect(ids, id).toContain(id);
    for (const g of gaps?.pl_coverage_gaps ?? [])
      expect(g.evidence.length, g.id).toBeGreaterThan(0);
  });

  it("lists every competency that no concept covers", () => {
    const comps = (existsSync(competenciesPath) ? readJson(competenciesPath) : []) as {
      id: string;
      concepts: string[];
    }[];
    const orphans = comps.filter((k) => k.concepts.length === 0).map((k) => k.id);
    const listed = new Set((gaps?.orphan_competencies ?? []).map((o) => o.competency_id));
    expect(orphans.filter((id) => !listed.has(id))).toEqual([]);
  });

  it("puts every concept that cites only unverified sources on a deferred track", () => {
    const stray = concepts
      .filter((c) => c.sources.length > 0)
      .filter((c) => c.sources.every((s) => byId.get(resolveId(s))?.status === "unverified"))
      .filter((c) => !deferredTracks.has(c.track))
      .map((c) => `${c.id} (${c.track})`);
    expect(stray).toEqual([]);
  });
});
