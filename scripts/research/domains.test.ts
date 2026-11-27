// Gate tests for research domain folders (RSCH-01).
//  (a) the shared rule set accepts a known-good sample domain;
//  (b) every domain folder that exists under research/ passes the same rules;
//  (c) the seed file parses (so the file never has zero tests);
//  (d) the completeness test (all ten folders) only runs under `npm run research:gate`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOMAIN_SLUGS } from "./lib/domains.ts";
import {
  canonicalUrl,
  compileContract,
  loadSeedSources,
  type SourceEntry,
  validateDomainFolder,
} from "./lib/research-files.ts";
import { makeTempRoot, sampleFiles, writeDomain } from "./lib/sample-domain.ts";

const root = join(import.meta.dirname, "..", "..");
const seed = loadSeedSources(root);

describe("research domain gate", () => {
  it("the seed file parses and is non-empty", () => {
    expect(Array.isArray(seed)).toBe(true);
    expect(seed.length).toBeGreaterThan(0);
  });

  it("accepts a sample domain that satisfies every rule", () => {
    const tmp = makeTempRoot(seed);
    writeDomain(tmp, "laws-of-the-game", sampleFiles());
    expect(validateDomainFolder(tmp, "laws-of-the-game", seed)).toEqual([]);
  });

  it("rejects a domain folder that does not exist", () => {
    const tmp = makeTempRoot(seed);
    const rules = validateDomainFolder(tmp, "pitch-geometry", seed).map((x) => x.rule);
    expect(rules).toContain("files-exist");
  });
});

describe("research/seed-sources.json", () => {
  it("has at least 20 entries, each valid against source.schema.json", () => {
    expect(seed.length).toBeGreaterThanOrEqual(20);
    const validate = compileContract("source");
    for (const s of seed) {
      expect(validate(s), `${s.id}: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  it("has unique ids and unique canonical URLs", () => {
    const ids = seed.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const urls = seed.map((s) => canonicalUrl(s.url));
    expect(new Set(urls).size).toBe(urls.length);
    for (const id of ids) expect(id.startsWith("src-")).toBe(true);
  });

  it("records FBref advanced stats as removed with a reason", () => {
    const fbref = seed.find((s) => s.id === "src-fbref-advanced-stats") as SourceEntry;
    expect(fbref.status).toBe("removed");
    expect(String(fbref.removed_reason).length).toBeGreaterThan(0);
  });

  it("keeps the two IFAB excerpts and gives every permission a note", () => {
    const ifab = seed.find((s) => s.id === "src-ifab-laws-2026-27") as SourceEntry;
    expect(ifab.excerpts?.map((e) => e.id)).toEqual(["effective-date", "law1-touchline-length"]);
    for (const s of seed) {
      for (const field of ["read", "automated_access", "redistribute", "derivative"]) {
        const perm = s.license[field] as { note: string };
        expect(perm.note.trim().length, `${s.id} ${field}`).toBeGreaterThan(0);
      }
    }
  });
});

const present = DOMAIN_SLUGS.filter((s) => existsSync(join(root, "research", s, "sources.json")));

describe.each(present)("research/%s", (slug) => {
  it("passes the shared rule set", () => {
    expect(validateDomainFolder(root, slug, seed)).toEqual([]);
  });
});

describe("research completeness (only under npm run research:gate)", () => {
  it.skipIf(process.env.RESEARCH_GATE !== "1")("all ten domain folders have three files", () => {
    const missing: string[] = [];
    for (const slug of DOMAIN_SLUGS) {
      for (const f of ["findings.md", "sources.json", "visual_ideas.md"]) {
        const p = join(root, "research", slug, f);
        if (!existsSync(p) || readFileSync(p, "utf8").trim() === "") missing.push(`${slug}/${f}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
