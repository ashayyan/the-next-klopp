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
