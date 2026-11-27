// Gate tests for research domain folders (RSCH-01).
//  (a) the shared rule set accepts a known-good sample domain;
//  (b) every domain folder that exists under research/ passes the same rules;
//  (c) the seed file parses (so the file never has zero tests);
//  (d) the completeness test (all ten folders) only runs under `npm run research:gate`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRIEF_DOMAINS,
  COMPETENCY_DOMAINS,
  DOMAIN_SLUGS,
  partForTrack,
  ROLE_IDS,
  ROLE_IDS_SENIOR,
  ROLE_IDS_SUPPORTING,
  THREADS,
  TRACKS,
} from "./lib/domains.ts";
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

describe("phase metadata", () => {
  const brief = readFileSync(join(root, "NEW_PROJECT_INPUT.md"), "utf8");

  it("has 29 kebab track ids t00 to t28 with a Part per brief section 7", () => {
    expect(TRACKS).toHaveLength(29);
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(29);
    TRACKS.forEach((t, i) => {
      expect(t.number).toBe(i);
      expect(t.id).toMatch(new RegExp(`^t${String(i).padStart(2, "0")}-[a-z0-9]+(?:-[a-z0-9]+)*$`));
      expect(t.id.length).toBeLessThanOrEqual(80);
      expect(brief).toContain(`Track ${i} —`);
    });
    const part = (n: number) => partForTrack(TRACKS[n]?.id as string);
    for (const n of [0, 1, 2, 3, 4]) expect(part(n)).toBe("A");
    for (const n of [5, 6, 7, 8, 9, 10, 11, 12]) expect(part(n)).toBe("B");
    for (const n of [13, 14]) expect(part(n)).toBe("C");
    for (const n of [15, 16, 17, 18, 19, 20]) expect(part(n)).toBe("D");
    for (const n of [21, 22, 23]) expect(part(n)).toBe("E");
    for (const n of [24, 25, 26, 27]) expect(part(n)).toBe("F");
    expect(part(28)).toBe("G");
    expect(TRACKS.map((t) => t.part)).toEqual(TRACKS.map((t) => partForTrack(t.id)));
    expect(() => partForTrack("t99-nope")).toThrow();
  });

  it("has the 15 canonical role ids (8 senior, 7 supporting) and 12 competency domains", () => {
    expect(ROLE_IDS).toHaveLength(15);
    expect(new Set(ROLE_IDS).size).toBe(15);
    expect(ROLE_IDS_SENIOR).toHaveLength(8);
    expect(ROLE_IDS_SUPPORTING).toHaveLength(7);
    expect(COMPETENCY_DOMAINS).toHaveLength(12);
  });

  it("covers every numbered brief section 6.2 domain once, in brief order", () => {
    const start = brief.indexOf("### 6.2 Research domains");
    const end = brief.indexOf("### 6.3");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const numbers = brief
      .slice(start, end)
      .split(/\r?\n/)
      .map((l) => /^(\d+[a-z]?)\.\s/.exec(l)?.[1])
      .filter((n): n is string => n !== undefined);
    expect(numbers.length).toBeGreaterThan(25);
    expect(BRIEF_DOMAINS.map((d) => d.number)).toEqual(numbers);
  });

  it("names a real track for every domain that is not fully Wave 1", () => {
    const trackIds = new Set(TRACKS.map((t) => t.id));
    for (const d of BRIEF_DOMAINS) {
      for (const t of d.proposedTracks) expect(trackIds.has(t), `${d.number} ${t}`).toBe(true);
      for (const s of d.wave1Slugs) expect(DOMAIN_SLUGS).toContain(s);
      if (d.coverage !== "wave1") expect(d.proposedTracks.length, d.number).toBeGreaterThan(0);
      if (d.coverage === "wave1") expect(d.wave1Slugs.length, d.number).toBeGreaterThan(0);
      if (d.coverage === "deferred") expect(d.wave1Slugs).toEqual([]);
    }
    const covered = new Set(BRIEF_DOMAINS.flatMap((d) => d.wave1Slugs));
    for (const slug of DOMAIN_SLUGS) expect(covered.has(slug), slug).toBe(true);
  });

  it("starts the four early threads on real tracks", () => {
    expect(THREADS.map((t) => t.label)).toEqual([
      "Role Map",
      "Watch Gym",
      "Write and Speak",
      "Scouting I",
    ]);
    const trackIds = new Set(TRACKS.map((t) => t.id));
    for (const t of THREADS) expect(trackIds.has(t.track)).toBe(true);
  });
});
