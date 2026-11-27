// Synthesis gate (RSCH-04). This file holds one section per synthesis output; 02-15 adds the
// source registry section, later plans add roles, competencies and concepts.
// File-based cases skip while the output is absent, unless RESEARCH_GATE=1 (then absence fails).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOMAIN_SLUGS } from "./lib/domains.ts";
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
