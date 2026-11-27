// Synthesis gate (RSCH-04). This file holds one section per synthesis output; 02-15 adds the
// source registry section, later plans add roles, competencies and concepts.
// File-based cases skip while the output is absent, unless RESEARCH_GATE=1 (then absence fails).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPETENCY_DOMAINS,
  DOMAIN_SLUGS,
  partForTrack,
  ROLE_IDS,
  ROLE_IDS_SENIOR,
  ROLE_IDS_SUPPORTING,
  THREADS,
  TRACKS,
} from "./lib/domains.ts";
import { checkGraph, layers } from "./lib/graph.ts";
import {
  canonicalUrl,
  compileContract,
  parseCitations,
  type SourceEntry,
} from "./lib/research-files.ts";
import { curriculumConfigSchema } from "./lib/research-io.ts";

const root = join(import.meta.dirname, "..", "..");
const gate = process.env.RESEARCH_GATE === "1";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

const registryPath = join(root, "research", "SOURCE_REGISTRY.json");
const aliasesPath = join(root, "research", "SOURCE_ALIASES.json");
const jitPath = join(root, "research", "jit-seed-sources.json");
const hasRegistry = existsSync(registryPath) && existsSync(aliasesPath);

describe("source registry (SOURCE_REGISTRY.json, SOURCE_ALIASES.json)", () => {
  it.skipIf(hasRegistry || !gate)("exists under npm run research:gate", () => {
    expect(hasRegistry).toBe(true);
  });

  describe.skipIf(!hasRegistry)("committed registry", () => {
    const registry = (hasRegistry ? readJson(registryPath) : []) as SourceEntry[];
    const aliasDoc = (hasRegistry ? readJson(aliasesPath) : {}) as {
      schema_version: number;
      aliases: Record<string, string>;
      excerpt_aliases: Record<string, string>;
    };
    const byId = new Map(registry.map((s) => [s.id, s]));

    it("is an array of at least 60 entries, each valid against source.schema.json", () => {
      expect(Array.isArray(registry)).toBe(true);
      expect(registry.length).toBeGreaterThanOrEqual(60);
      const validate = compileContract("source");
      for (const s of registry) {
        expect(validate(s), `${s.id}: ${JSON.stringify(validate.errors)}`).toBe(true);
      }
    });

    it("has unique src- ids sorted ascending and unique canonical URLs", () => {
      const ids = registry.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
      for (const id of ids) expect(id.startsWith("src-")).toBe(true);
      const urls = registry.map((s) => canonicalUrl(s.url));
      expect(new Set(urls).size).toBe(urls.length);
    });

    it("matches a fresh merge (build-registry --check exits 0)", () => {
      const r = spawnSync(
        process.execPath,
        [join(root, "scripts", "research", "build-registry.ts"), "--check"],
        { cwd: root, encoding: "utf8" },
      );
      expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    });

    it("has alias maps whose targets are registry ids and whose keys are not", () => {
      expect(aliasDoc.schema_version).toBe(1);
      for (const [from, to] of Object.entries(aliasDoc.aliases)) {
        expect(byId.has(to), `alias ${from} -> ${to}`).toBe(true);
        expect(byId.has(from), `alias key ${from} is a registry id`).toBe(false);
      }
      for (const [from, to] of Object.entries(aliasDoc.excerpt_aliases)) {
        const [id, ex] = to.split("#");
        const src = byId.get(id as string);
        expect(
          src?.excerpts?.some((e) => e.id === ex),
          `excerpt alias ${from} -> ${to}`,
        ).toBe(true);
      }
    });

    it("resolves every citation in every domain findings.md and visual_ideas.md", () => {
      const unresolved: string[] = [];
      for (const slug of DOMAIN_SLUGS) {
        for (const file of ["findings.md", "visual_ideas.md"]) {
          const p = join(root, "research", slug, file);
          if (!existsSync(p)) continue;
          for (const c of parseCitations(readFileSync(p, "utf8"))) {
            const id = aliasDoc.aliases[c.id] ?? c.id;
            const src = byId.get(id);
            const where = `${slug}/${file}:${c.line} [${c.id}${c.excerpt ? `#${c.excerpt}` : ""}]`;
            if (!src) {
              unresolved.push(where);
              continue;
            }
            if (c.excerpt === null) continue;
            const target = aliasDoc.excerpt_aliases[`${c.id}#${c.excerpt}`] ?? `${id}#${c.excerpt}`;
            const [tid, tex] = target.split("#");
            const tsrc = byId.get(tid as string);
            if (!tsrc?.excerpts?.some((e) => e.id === tex)) unresolved.push(where);
          }
        }
      }
      expect(unresolved).toEqual([]);
    });

    it("records FBref advanced stats as removed with a reason", () => {
      const fbref = byId.get("src-fbref-advanced-stats");
      expect(fbref?.status).toBe("removed");
      expect(String(fbref?.removed_reason ?? "").length).toBeGreaterThan(0);
    });

    it("gives every regulation-type source at least one excerpt", () => {
      const bad = registry.filter((s) => s.type === "regulation" && !s.excerpts?.length);
      expect(bad.map((s) => s.id)).toEqual([]);
    });

    it.skipIf(!existsSync(jitPath))(
      "keeps just-in-time seeds unverified and apart from verified sources",
      () => {
        const jit = readJson(jitPath) as SourceEntry[];
        const verified = new Set<string>();
        for (const f of [
          join(root, "research", "seed-sources.json"),
          ...DOMAIN_SLUGS.map((s) => join(root, "research", s, "sources.json")),
        ]) {
          if (!existsSync(f)) continue;
          for (const s of readJson(f) as SourceEntry[]) verified.add(canonicalUrl(s.url));
        }
        for (const s of jit) {
          expect(s.status, s.id).toBe("unverified");
          expect(verified.has(canonicalUrl(s.url)), `${s.id} duplicates a domain source`).toBe(
            false,
          );
          expect(byId.get(s.id)?.status, s.id).toBe("unverified");
        }
      },
    );
  });
});

// Roles and competencies (02-17). Ids are frozen references for the Role Map, the readiness meter
// and the role exams. competency.concepts stays empty until the concept map exists (02-18).
const rolesPath = join(root, "research", "roles.json");
const competenciesPath = join(root, "research", "competencies.json");
const conceptMapPath = join(root, "research", "concept-map.json");
const hasRoles = existsSync(rolesPath) && existsSync(competenciesPath);

interface RoleDoc {
  id: string;
  title: string;
  summary: string;
  competencies: { id: string; target_level: number }[];
  sources: string[];
}

interface CompetencyDoc {
  id: string;
  title: string;
  domain: string;
  levels: { level: number; descriptor: string }[];
  concepts: string[];
}

const roles = (hasRoles ? readJson(rolesPath) : []) as RoleDoc[];
const competencies = (hasRoles ? readJson(competenciesPath) : []) as CompetencyDoc[];

describe("roles and competencies (roles.json, competencies.json)", () => {
  it.skipIf(hasRoles || !gate)("exist under npm run research:gate", () => {
    expect(hasRoles).toBe(true);
  });

  describe.skipIf(!hasRoles)("roles: integrity", () => {
    const competencyIds = new Set(competencies.map((c) => c.id));

    it("every role is valid against role.schema.json", () => {
      expect(Array.isArray(roles)).toBe(true);
      const validate = compileContract("role");
      for (const r of roles) {
        expect(validate(r), `${r.id}: ${JSON.stringify(validate.errors)}`).toBe(true);
      }
    });

    it("role ids are unique and canonical (ROLE_IDS)", () => {
      const ids = roles.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(ROLE_IDS, id).toContain(id);
    });

    it("no role repeats a competency, and every role competency exists", () => {
      for (const r of roles) {
        const ids = r.competencies.map((c) => c.id);
        expect(new Set(ids).size, `${r.id} repeats a competency`).toBe(ids.length);
        for (const id of ids) expect(competencyIds.has(id), `${r.id} -> ${id}`).toBe(true);
      }
    });

    it("every role source resolves to a registry id through the aliases", () => {
      const registry = (hasRegistry ? readJson(registryPath) : []) as SourceEntry[];
      const aliases = hasRegistry
        ? (readJson(aliasesPath) as { aliases: Record<string, string> }).aliases
        : {};
      const ids = new Set(registry.map((s) => s.id));
      const bad = roles.flatMap((r) =>
        r.sources.filter((s) => !ids.has(aliases[s] ?? s)).map((s) => `${r.id} -> ${s}`),
      );
      expect(bad).toEqual([]);
    });
  });

  describe.skipIf(!hasRoles)("competencies: integrity", () => {
    it("every competency is valid against competency.schema.json", () => {
      expect(Array.isArray(competencies)).toBe(true);
      const validate = compileContract("competency");
      for (const c of competencies) {
        expect(validate(c), `${c.id}: ${JSON.stringify(validate.errors)}`).toBe(true);
      }
    });

    it("competency ids are unique and domains are canonical (COMPETENCY_DOMAINS)", () => {
      const ids = competencies.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of competencies) expect(COMPETENCY_DOMAINS, c.id).toContain(c.domain);
    });

    it("every concepts entry exists in concept-map.json (empty until 02-18)", () => {
      const listed = competencies.flatMap((c) => c.concepts.map((k) => `${c.id} -> ${k}`));
      if (!existsSync(conceptMapPath)) {
        expect(listed).toEqual([]);
        return;
      }
      const doc = readJson(conceptMapPath) as { concepts: { id: string }[] };
      const conceptIds = new Set(doc.concepts.map((k) => k.id));
      const bad = competencies.flatMap((c) =>
        c.concepts.filter((k) => !conceptIds.has(k)).map((k) => `${c.id} -> ${k}`),
      );
      expect(bad).toEqual([]);
    });
  });
});

describe.skipIf(!hasRoles)("roles: completeness", () => {
  it("role ids equal the 15 canonical ROLE_IDS", () => {
    expect([...roles.map((r) => r.id)].sort()).toEqual([...ROLE_IDS].sort());
  });

  it("senior roles have 5-12 competencies, supporting roles 3-6", () => {
    for (const r of roles) {
      const n = r.competencies.length;
      if (ROLE_IDS_SENIOR.includes(r.id)) {
        expect(n, `${r.id} has ${n}`).toBeGreaterThanOrEqual(5);
        expect(n, `${r.id} has ${n}`).toBeLessThanOrEqual(12);
      } else {
        expect(ROLE_IDS_SUPPORTING, r.id).toContain(r.id);
        expect(n, `${r.id} has ${n}`).toBeGreaterThanOrEqual(3);
        expect(n, `${r.id} has ${n}`).toBeLessThanOrEqual(6);
      }
    }
  });

  it("competencies.json has 35-50 entries and every competency is used by a role", () => {
    expect(competencies.length).toBeGreaterThanOrEqual(35);
    expect(competencies.length).toBeLessThanOrEqual(50);
    const used = new Set(roles.flatMap((r) => r.competencies.map((c) => c.id)));
    expect(competencies.filter((c) => !used.has(c.id)).map((c) => c.id)).toEqual([]);
  });

  it("every competency domain is used by at least one competency", () => {
    const domains = new Set(competencies.map((c) => c.domain));
    expect(COMPETENCY_DOMAINS.filter((d) => !domains.has(d))).toEqual([]);
  });

  it("level descriptors are at least 20 characters and distinct within a competency", () => {
    for (const c of competencies) {
      const texts = c.levels.map((l) => l.descriptor.trim());
      for (const t of texts) expect(t.length, `${c.id}: "${t}"`).toBeGreaterThanOrEqual(20);
      expect(new Set(texts).size, `${c.id} repeats a descriptor`).toBe(texts.length);
    }
  });
});

// Concept map (02-18, 02-19). Ids are frozen references for placement, mastery, lessons and the
// Role Map. prerequisites[] is the source of truth; prerequisite edges, concept.roles and
// competency.concepts are derived by derive-links.ts and checked here.
const approvalPath = join(root, "research", "APPROVAL.md");
const curriculumConfigPath = join(root, "research", "curriculum-config.json");
const hasConceptMap = existsSync(conceptMapPath);

interface ConceptDoc {
  id: string;
  title: string;
  track: string;
  part: string;
  summary: string;
  prerequisites: string[];
  roles: string[];
  competencies: string[];
  sources: string[];
  status: string;
}

interface ConceptMapDoc {
  schema_version: number;
  concepts: ConceptDoc[];
  edges: { from: string; to: string; kind: string }[];
}

const conceptMap = (
  hasConceptMap ? readJson(conceptMapPath) : { schema_version: 1, concepts: [], edges: [] }
) as ConceptMapDoc;
const concepts = conceptMap.concepts;

describe("concept map (concept-map.json)", () => {
  it.skipIf(hasConceptMap || !gate)("exists under npm run research:gate", () => {
    expect(hasConceptMap).toBe(true);
  });

  describe.skipIf(!hasConceptMap)("concepts: integrity", () => {
    const trackIds = new Set(TRACKS.map((t) => t.id));
    const conceptIds = new Set(concepts.map((c) => c.id));

    it("is valid against concept.schema.json", () => {
      const validate = compileContract("concept");
      expect(validate(conceptMap), JSON.stringify(validate.errors)).toBe(true);
    });

    it("has unique ids, none equal to a track id", () => {
      const ids = concepts.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.filter((id) => trackIds.has(id))).toEqual([]);
    });

    it("puts every concept on a known track with the Part derived from it", () => {
      for (const c of concepts) {
        expect(trackIds.has(c.track), `${c.id}: ${c.track}`).toBe(true);
        expect(c.part, c.id).toBe(partForTrack(c.track));
      }
    });

    it("has an acyclic prerequisite graph with no structural errors", () => {
      const { errors } = checkGraph(concepts);
      expect(errors).toEqual([]);
    });

    it("keeps prerequisites at 4 or fewer, titles at 4 words or fewer, summaries at 140 characters or fewer", () => {
      const bad: string[] = [];
      for (const c of concepts) {
        if (c.prerequisites.length > 4)
          bad.push(`${c.id}: ${c.prerequisites.length} prerequisites`);
        const words = c.title.trim().split(/\s+/).length;
        if (words > 4) bad.push(`${c.id}: title has ${words} words`);
        if (c.summary.length > 140) bad.push(`${c.id}: summary has ${c.summary.length} characters`);
      }
      expect(bad).toEqual([]);
    });

    it("cites sources that resolve to registry ids through the aliases", () => {
      const registry = (hasRegistry ? readJson(registryPath) : []) as SourceEntry[];
      const aliases = hasRegistry
        ? (readJson(aliasesPath) as { aliases: Record<string, string> }).aliases
        : {};
      const ids = new Set(registry.map((s) => s.id));
      const bad = concepts.flatMap((c) =>
        c.sources.filter((s) => !ids.has(aliases[s] ?? s)).map((s) => `${c.id} -> ${s}`),
      );
      expect(bad).toEqual([]);
    });

    it("lists only competencies and roles that exist", () => {
      const competencyIds = new Set(competencies.map((k) => k.id));
      const roleIds = new Set(roles.map((r) => r.id));
      const bad = concepts.flatMap((c) => [
        ...c.competencies.filter((k) => !competencyIds.has(k)).map((k) => `${c.id} -> ${k}`),
        ...c.roles.filter((r) => !roleIds.has(r)).map((r) => `${c.id} -> role ${r}`),
      ]);
      expect(bad).toEqual([]);
    });

    it("joins two concept ids with every related or contrasts edge", () => {
      const bad = conceptMap.edges
        .filter((e) => e.kind !== "prerequisite")
        .filter((e) => !conceptIds.has(e.from) || !conceptIds.has(e.to) || e.from === e.to)
        .map((e) => `${e.from} -${e.kind}-> ${e.to}`);
      expect(bad).toEqual([]);
    });

    it("matches a fresh derive (derive-links --check exits 0)", () => {
      const r = spawnSync(
        process.execPath,
        [join(root, "scripts", "research", "derive-links.ts"), "--check"],
        { cwd: root, encoding: "utf8" },
      );
      expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    });

    it("has no approved concept unless research/APPROVAL.md records the approval", () => {
      const approved = existsSync(approvalPath)
        ? /^Status: approved/m.test(readFileSync(approvalPath, "utf8"))
        : false;
      if (!approved) {
        expect(concepts.filter((c) => c.status === "approved").map((c) => c.id)).toEqual([]);
      }
    });
  });

  describe.skipIf(!hasConceptMap)("concepts: band 1", () => {
    const band1 = concepts.filter((c) => /^t0[0-4]-/.test(c.track));
    const byId = new Map(concepts.map((c) => [c.id, c]));
    const config = existsSync(curriculumConfigPath)
      ? curriculumConfigSchema.safeParse(readJson(curriculumConfigPath))
      : null;

    it("has 45-70 concepts in Tracks t00-t04", () => {
      expect(band1.length).toBeGreaterThanOrEqual(45);
      expect(band1.length).toBeLessThanOrEqual(70);
    });

    it("has a valid curriculum-config.json with Band 1 starters and Milestone 1 tracks", () => {
      expect(config?.success, JSON.stringify(config?.error?.issues ?? "missing")).toBe(true);
      const c = config?.data;
      expect(c?.max_starter_layer).toBe(5);
      expect(c?.milestone_1_tracks).toEqual(
        expect.arrayContaining(["t00-start-here", "t01-the-game", "t04-watch-gym"]),
      );
      for (const track of ["t00-start-here", "t04-watch-gym"]) {
        const id = c?.thread_starters[track];
        expect(id, `starter for ${track}`).toBeTruthy();
        expect(byId.get(id as string)?.track, `${id} sits on ${track}`).toBe(track);
      }
    });

    it("keeps every named thread starter at or below max_starter_layer", () => {
      const c = config?.data;
      expect(c).toBeTruthy();
      const layer = layers(new Map(concepts.map((k) => [k.id, k.prerequisites]))).layer;
      for (const [track, id] of Object.entries(c?.thread_starters ?? {})) {
        if (id === undefined) continue;
        const l = layer.get(id);
        expect(l, `${track} starter ${id} has no layer`).toBeDefined();
        expect(l as number, `${track} starter ${id}`).toBeLessThanOrEqual(
          c?.max_starter_layer ?? 5,
        );
      }
    });

    it("keeps Watch Gym Level 1 consistent with ADR 0008 (reconstructions answered on a pitch panel)", () => {
      const t04 = concepts.filter((c) => c.track === "t04-watch-gym");
      expect(t04.length).toBeGreaterThan(0);
      expect(t04.some((c) => /reconstruct|pitch panel/i.test(`${c.title} ${c.summary}`))).toBe(
        true,
      );
    });
  });

  describe.skipIf(!hasConceptMap)("concepts: threads", () => {
    const byId = new Map(concepts.map((c) => [c.id, c]));
    const parsed = existsSync(curriculumConfigPath)
      ? curriculumConfigSchema.safeParse(readJson(curriculumConfigPath))
      : null;
    const config = parsed?.success ? parsed.data : null;
    const layer = layers(new Map(concepts.map((k) => [k.id, k.prerequisites]))).layer;

    for (const thread of THREADS) {
      it(`starts the ${thread.label} thread (${thread.track}) early with a starter on its track`, () => {
        expect(config, "curriculum-config.json is missing or invalid").toBeTruthy();
        const id = config?.thread_starters[thread.track];
        expect(id, `no starter for ${thread.track}`).toBeTruthy();
        expect(byId.get(id as string)?.track, `${id} sits on ${thread.track}`).toBe(thread.track);
        const l = layer.get(id as string);
        expect(l, `${id} has no layer`).toBeDefined();
        expect(l as number, `${id} layer`).toBeLessThanOrEqual(config?.max_starter_layer ?? 5);
      });
    }
  });
});
