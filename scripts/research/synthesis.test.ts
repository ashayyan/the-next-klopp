// Synthesis gate (RSCH-04). This file holds one section per synthesis output; 02-15 adds the
// source registry section, later plans add roles, competencies and concepts.
// File-based cases skip while the output is absent, unless RESEARCH_GATE=1 (then absence fails).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPETENCY_DOMAINS, DOMAIN_SLUGS, ROLE_IDS } from "./lib/domains.ts";
import {
  canonicalUrl,
  compileContract,
  parseCitations,
  type SourceEntry,
} from "./lib/research-files.ts";

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
