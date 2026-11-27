// Node-side checks of the generated coverage matrix (RSCH-02). The file-based cases skip when the
// matrix is absent unless RESEARCH_GATE=1, so a fresh checkout stays green.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type CoverageMatrix,
  coverageMatrixSchema,
  coverageRowSchema,
  LICENCE_IDS,
} from "./lib/coverage-schema.ts";

const dir = join(import.meta.dirname, "..", "..", "research", "pl-data-sources");
const jsonPath = join(dir, "coverage-matrix.json");
const mdPath = join(dir, "coverage-matrix.md");
const present = existsSync(jsonPath);
const mustRun = present || process.env.RESEARCH_GATE === "1";

const sampleRow = {
  provider: "StatsBomb",
  dataset: "StatsBomb open data",
  competition: "Premier League",
  competition_id: "2",
  season: "2015/2016",
  data_type: "event",
  matches_total: 380,
  pl_matches: 380,
  status: "ok",
  method: "index",
  licence_id: "statsbomb-public-data-user-agreement",
  licence_url: "https://example.org/licence.pdf",
  source_url: "https://example.org/matches.json",
  fetched_at: "2026-11-27T12:00:00Z",
  notes: "",
};

describe("coverageRowSchema", () => {
  it("accepts a valid row", () => {
    expect(coverageRowSchema.safeParse(sampleRow).success).toBe(true);
  });

  it("rejects an unreachable row with a guessed pl_matches", () => {
    const bad = { ...sampleRow, status: "unreachable", matches_total: null, pl_matches: 0 };
    expect(coverageRowSchema.safeParse(bad).success).toBe(false);
    const good = { ...bad, pl_matches: null };
    expect(coverageRowSchema.safeParse(good).success).toBe(true);
  });

  it("rejects an ok row with a null pl_matches", () => {
    expect(coverageRowSchema.safeParse({ ...sampleRow, pl_matches: null }).success).toBe(false);
  });

  it("rejects a licence id outside LICENCE_IDS and a non-http source_url", () => {
    expect(LICENCE_IDS).toHaveLength(5);
    expect(coverageRowSchema.safeParse({ ...sampleRow, licence_id: "GPL-3.0" }).success).toBe(
      false,
    );
    expect(
      coverageRowSchema.safeParse({ ...sampleRow, source_url: "file:///etc/passwd" }).success,
    ).toBe(false);
  });
});

describe("research/pl-data-sources/coverage-matrix.json", () => {
  const load = (): CoverageMatrix =>
    coverageMatrixSchema.parse(JSON.parse(readFileSync(jsonPath, "utf8")));

  it.skipIf(!mustRun)("validates against the matrix schema", () => {
    expect(load().rows.length).toBeGreaterThan(0);
  });

  it.skipIf(!mustRun)("has StatsBomb Premier League event rows and zero PL 360 matches", () => {
    const rows = load().rows.filter(
      (r) => r.provider.toLowerCase().includes("statsbomb") && r.competition_id === "2",
    );
    const events = rows.filter((r) => r.data_type === "event" && r.status === "ok");
    expect(events.length).toBeGreaterThanOrEqual(2);
    const total = events.reduce((sum, r) => sum + (r.pl_matches ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(380);
    for (const r of rows.filter((x) => x.data_type === "360")) expect(r.pl_matches).toBe(0);
  });

  it.skipIf(!mustRun)("has a Wyscout England event row", () => {
    const england = load().rows.filter(
      (r) => r.provider === "Wyscout" && r.competition_id === "364" && r.data_type === "event",
    );
    expect(england).toHaveLength(1);
  });

  it.skipIf(!mustRun)("has a Markdown companion that names every provider", () => {
    expect(existsSync(mdPath)).toBe(true);
    const md = readFileSync(mdPath, "utf8");
    expect(md).toContain("As of");
    for (const provider of new Set(load().rows.map((r) => r.provider))) {
      expect(md, provider).toContain(provider);
    }
  });
});
