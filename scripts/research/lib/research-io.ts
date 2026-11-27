// Loads and validates a research bundle (the real `research/` folder or a test fixture).
// Erasable TypeScript only so `node file.ts` can import it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { type CoverageMatrix, coverageMatrixSchema } from "./coverage-schema.ts";
import { type Part, THREADS, TRACKS } from "./domains.ts";
import { type ContractValidator, compileContract, type SourceEntry } from "./research-files.ts";

export interface Concept {
  id: string;
  title: string;
  track: string;
  part: Part;
  summary: string;
  prerequisites: string[];
  roles: string[];
  competencies: string[];
  sources: string[];
  status: "draft" | "approved" | "deprecated";
}

export interface Edge {
  from: string;
  to: string;
  kind: "prerequisite" | "related" | "contrasts";
}

export interface Role {
  id: string;
  title: string;
  summary: string;
  competencies: { id: string; target_level: number }[];
  sources: string[];
}

export interface Competency {
  id: string;
  title: string;
  domain: string;
  levels: { level: number; descriptor: string }[];
  concepts: string[];
}

const kebab = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const trackId = z.enum(TRACKS.map((t) => t.id) as [string, ...string[]]);
const nonEmpty = z.string().min(1);
const httpUrl = z.string().regex(/^https?:\/\/\S+$/);

const starterShape = Object.fromEntries(THREADS.map((t) => [t.track, kebab.optional()]));

/** `curriculum-config.json`: which concept starts each early thread and which tracks Milestone 1 builds. */
export const curriculumConfigSchema = z.strictObject({
  schema_version: z.literal(1),
  thread_starters: z.strictObject(starterShape as Record<string, z.ZodOptional<typeof kebab>>),
  milestone_1_tracks: z.array(trackId),
  max_starter_layer: z.number().int().min(0),
});

/** `gaps.json`: the one source of truth for GAPS.md. Sections other than deferred_domains may be empty. */
export const gapsSchema = z.strictObject({
  schema_version: z.literal(1),
  as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deferred_domains: z.array(
    z.strictObject({
      brief_domain: nonEmpty,
      name: nonEmpty,
      why_deferred: nonEmpty,
      must_precede: z.array(trackId).min(1),
      research_trigger: nonEmpty,
      starting_sources: z.array(z.union([kebab, httpUrl])).min(1),
    }),
  ),
  unknown_licence_sources: z
    .array(
      z.strictObject({
        source_id: kebab,
        needed_by: z.array(nonEmpty),
        note: z.string(),
      }),
    )
    .default([]),
  pl_coverage_gaps: z
    .array(
      z.strictObject({
        id: kebab,
        gap: nonEmpty,
        impact: nonEmpty,
        mitigation: nonEmpty,
        evidence: z.array(kebab).min(1),
      }),
    )
    .default([]),
  orphan_competencies: z
    .array(z.strictObject({ competency_id: kebab, note: z.string() }))
    .default([]),
});

export type CurriculumConfig = z.infer<typeof curriculumConfigSchema>;
export type Gaps = z.infer<typeof gapsSchema>;

export interface ResearchBundle {
  root: string;
  /** Bundle files that were not found, as paths relative to the root. */
  missing: string[];
  concepts: Concept[];
  edges: Edge[];
  roles: Role[];
  competencies: Competency[];
  sources: SourceEntry[];
  config: CurriculumConfig | null;
  gaps: Gaps | null;
  coverage: CoverageMatrix | null;
}

export const BUNDLE_FILES = {
  conceptMap: "concept-map.json",
  roles: "roles.json",
  competencies: "competencies.json",
  registry: "SOURCE_REGISTRY.json",
  config: "curriculum-config.json",
  gaps: "gaps.json",
  coverage: "pl-data-sources/coverage-matrix.json",
} as const;

function ajvViolations(file: string, validate: ContractValidator, prefix = ""): string[] {
  return (validate.errors ?? []).map(
    (e) => `${file}: ${prefix}${e.instancePath || "/"} ${e.message ?? "invalid"}`,
  );
}

function zodViolations(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file}: /${i.path.join("/")} ${i.message}`);
}

/**
 * Reads the bundle layout under `root`. A missing file goes into `missing`; a present file that
 * fails its contract adds to the violations. Throws one error listing every violation.
 */
export function loadResearchBundle(root: string): ResearchBundle {
  const violations: string[] = [];
  const missing: string[] = [];

  const read = (rel: string): unknown | undefined => {
    const path = join(root, rel);
    if (!existsSync(path)) {
      missing.push(rel);
      return undefined;
    }
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      violations.push(`${rel}: not valid JSON (${(e as Error).message})`);
      return undefined;
    }
  };

  const bundle: ResearchBundle = {
    root,
    missing,
    concepts: [],
    edges: [],
    roles: [],
    competencies: [],
    sources: [],
    config: null,
    gaps: null,
    coverage: null,
  };

  const mapDoc = read(BUNDLE_FILES.conceptMap);
  if (mapDoc !== undefined) {
    const validate = compileContract("concept");
    if (validate(mapDoc)) {
      const doc = mapDoc as { concepts: Concept[]; edges: Edge[] };
      bundle.concepts = doc.concepts;
      bundle.edges = doc.edges;
    } else {
      violations.push(...ajvViolations(BUNDLE_FILES.conceptMap, validate));
    }
  }

  const listOf = <T>(rel: string, contract: "role" | "competency" | "source", into: T[]): void => {
    const doc = read(rel);
    if (doc === undefined) return;
    if (!Array.isArray(doc)) {
      violations.push(`${rel}: expected a JSON array`);
      return;
    }
    const validate = compileContract(contract);
    let ok = true;
    doc.forEach((item, i) => {
      if (!validate(item)) {
        ok = false;
        violations.push(...ajvViolations(rel, validate, `[${i}]`));
      }
    });
    if (ok) into.push(...(doc as T[]));
  };
  listOf(BUNDLE_FILES.roles, "role", bundle.roles);
  listOf(BUNDLE_FILES.competencies, "competency", bundle.competencies);
  listOf(BUNDLE_FILES.registry, "source", bundle.sources);

  const configDoc = read(BUNDLE_FILES.config);
  if (configDoc !== undefined) {
    const parsed = curriculumConfigSchema.safeParse(configDoc);
    if (parsed.success) bundle.config = parsed.data;
    else violations.push(...zodViolations(BUNDLE_FILES.config, parsed.error));
  }

  const gapsDoc = read(BUNDLE_FILES.gaps);
  if (gapsDoc !== undefined) {
    const parsed = gapsSchema.safeParse(gapsDoc);
    if (parsed.success) bundle.gaps = parsed.data;
    else violations.push(...zodViolations(BUNDLE_FILES.gaps, parsed.error));
  }

  const coverageDoc = read(BUNDLE_FILES.coverage);
  if (coverageDoc !== undefined) {
    const parsed = coverageMatrixSchema.safeParse(coverageDoc);
    if (parsed.success) bundle.coverage = parsed.data;
    else violations.push(...zodViolations(BUNDLE_FILES.coverage, parsed.error));
  }

  if (violations.length > 0) {
    throw new Error(`research bundle under ${root} is invalid:\n- ${violations.join("\n- ")}`);
  }
  return bundle;
}

/**
 * Cross-document integrity that JSON Schema cannot express: every referenced id exists.
 * Returns one line per problem; empty means consistent. Documents that are absent are not checked.
 */
export function checkReferences(bundle: ResearchBundle): string[] {
  const problems: string[] = [];
  const conceptIds = new Set(bundle.concepts.map((c) => c.id));
  const sourceIds = new Set(bundle.sources.map((s) => s.id));
  const competencyIds = new Set(bundle.competencies.map((c) => c.id));
  const roleIds = new Set(bundle.roles.map((r) => r.id));
  const hasSources = bundle.sources.length > 0;
  const hasCompetencies = bundle.competencies.length > 0;
  const hasRoles = bundle.roles.length > 0;
  const trackIds = new Set(TRACKS.map((t) => t.id));

  for (const c of bundle.concepts) {
    if (!trackIds.has(c.track)) problems.push(`concept ${c.id}: unknown track ${c.track}`);
    if (hasSources) {
      for (const s of c.sources) {
        if (!sourceIds.has(s)) problems.push(`concept ${c.id}: unknown source ${s}`);
      }
    }
    if (hasCompetencies) {
      for (const k of c.competencies) {
        if (!competencyIds.has(k)) problems.push(`concept ${c.id}: unknown competency ${k}`);
      }
    }
    if (hasRoles) {
      for (const r of c.roles) {
        if (!roleIds.has(r)) problems.push(`concept ${c.id}: unknown role ${r}`);
      }
    }
  }
  for (const e of bundle.edges) {
    for (const end of [e.from, e.to]) {
      if (!conceptIds.has(end)) problems.push(`edge ${e.from} -> ${e.to}: unknown concept ${end}`);
    }
  }
  for (const r of bundle.roles) {
    for (const k of r.competencies) {
      if (!competencyIds.has(k.id)) problems.push(`role ${r.id}: unknown competency ${k.id}`);
    }
    if (hasSources) {
      for (const s of r.sources) {
        if (!sourceIds.has(s)) problems.push(`role ${r.id}: unknown source ${s}`);
      }
    }
  }
  for (const k of bundle.competencies) {
    for (const c of k.concepts) {
      if (!conceptIds.has(c)) problems.push(`competency ${k.id}: unknown concept ${c}`);
    }
  }
  if (bundle.config) {
    for (const [track, concept] of Object.entries(bundle.config.thread_starters)) {
      if (concept !== undefined && !conceptIds.has(concept)) {
        problems.push(`curriculum-config ${track}: unknown starter concept ${concept}`);
      }
    }
  }
  return problems;
}
