// Hand-written Zod 4 mirrors of the JSON Schema 2020-12 contracts in /schemas.
// JSON Schema is the language-neutral source of truth; schemas/schemas.test.ts proves that both
// validators reach the same verdict on every fixture. Cross-document integrity (referenced ids
// exist, prerequisite graph is acyclic) is checked by the Phase 2 and Phase 5 validators.
import { z } from "zod";

// Shared helpers, mirroring schemas/common.schema.json $defs.
// URLs and UTC date-times use the same patterns as the JSON Schema, never the built-in Zod URL check or the
// JSON Schema uri format: they disagree on spaces and empty hosts.
export const kebabId = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const isoDate = z.iso.date();
export const utcDateTime = z.iso
  .datetime()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z$/);
export const httpUrl = z.string().regex(/^https?:\/\/[^\s/$.?#][^\s]*$/);
export const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
export const permission = z.strictObject({
  value: z.enum(["yes", "no", "unknown", "conditional"]),
  note: z.string(),
});

const nonEmpty = z.string().min(1);

/** Mirrors `uniqueItems: true` on an id array. */
export function uniqueIds(schema: z.ZodString = kebabId) {
  return z.array(schema).refine((a) => new Set(a).size === a.length, {
    message: "items must be unique",
  });
}

export const sourceTypes = [
  "dataset",
  "regulation",
  "official-document",
  "paper",
  "book",
  "article",
  "news",
  "blog",
  "video",
  "podcast",
  "course",
  "website",
  "api",
  "tool",
  "report",
] as const;

export const excerptSchema = z.strictObject({
  id: kebabId,
  locator: nonEmpty,
  fetched_at: utcDateTime,
  sha256,
  paraphrase: z.string().max(300),
});

export const sourceSchema = z
  .strictObject({
    id: kebabId,
    title: nonEmpty,
    url: httpUrl,
    type: z.enum(sourceTypes),
    publisher: nonEmpty,
    free: z.boolean(),
    license: z.strictObject({
      name: nonEmpty.optional(),
      terms_url: httpUrl.optional(),
      read: permission,
      automated_access: permission,
      redistribute: permission,
      derivative: permission,
    }),
    quality: z.number().int().min(1).max(5),
    recency: isoDate,
    as_of: isoDate,
    best_for: z.array(nonEmpty).min(1),
    notes: z.string(),
    status: z.enum(["active", "removed", "unverified"]),
    removed_reason: nonEmpty.optional(),
    excerpts: z.array(excerptSchema).optional(),
  })
  .refine((s) => s.status !== "removed" || s.removed_reason !== undefined, {
    message: "removed_reason is required when status is removed",
    path: ["removed_reason"],
  });

export type Source = z.infer<typeof sourceSchema>;

export const conceptParts = ["A", "B", "C", "D", "E", "F", "G"] as const;

export const conceptSchema = z.strictObject({
  id: kebabId,
  title: nonEmpty,
  track: kebabId,
  part: z.enum(conceptParts),
  summary: nonEmpty,
  prerequisites: uniqueIds(),
  roles: uniqueIds(),
  competencies: uniqueIds(),
  sources: uniqueIds().refine((a) => a.length >= 1, { message: "at least one source" }),
  status: z.enum(["draft", "approved", "deprecated"]),
});

export const edgeSchema = z.strictObject({
  from: kebabId,
  to: kebabId,
  kind: z.enum(["prerequisite", "related", "contrasts"]),
});

export const conceptMapSchema = z.strictObject({
  schema_version: z.literal(1),
  concepts: z.array(conceptSchema).min(1),
  edges: z.array(edgeSchema),
});

export type Concept = z.infer<typeof conceptSchema>;
export type ConceptMap = z.infer<typeof conceptMapSchema>;

function levelDescriptor<L extends 1 | 2 | 3 | 4>(level: L) {
  return z.strictObject({ level: z.literal(level), descriptor: nonEmpty });
}

export const competencySchema = z.strictObject({
  id: kebabId,
  title: nonEmpty,
  domain: kebabId,
  levels: z.tuple([levelDescriptor(1), levelDescriptor(2), levelDescriptor(3), levelDescriptor(4)]),
  concepts: uniqueIds(),
});

export const roleSchema = z.strictObject({
  id: kebabId,
  title: nonEmpty,
  summary: nonEmpty,
  competencies: z
    .array(
      z.strictObject({
        id: kebabId,
        target_level: z.number().int().min(1).max(4),
      }),
    )
    .min(1),
  sources: uniqueIds().refine((a) => a.length >= 1, { message: "at least one source" }),
});

export type Competency = z.infer<typeof competencySchema>;
export type Role = z.infer<typeof roleSchema>;

/** One entry per schemas/<name>.schema.json (common excluded). The test checks the key set. */
export const contractSchemas = {
  source: sourceSchema,
  concept: conceptMapSchema,
  competency: competencySchema,
  role: roleSchema,
};
