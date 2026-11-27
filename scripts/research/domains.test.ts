// Gate tests for research domain folders (RSCH-01).
//  (a) the shared rule set accepts a known-good sample domain;
//  (b) every domain folder that exists under research/ passes the same rules;
//  (c) the seed file parses (so the file never has zero tests);
//  (d) the completeness test (all ten folders) only runs under `npm run research:gate`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOMAIN_SLUGS } from "./lib/domains.ts";
import { loadSeedSources, validateDomainFolder } from "./lib/research-files.ts";
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
