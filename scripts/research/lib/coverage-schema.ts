// Zod mirror of the pydantic CoverageMatrix written by `klopp-pipeline coverage` (RSCH-02).
// Erasable TypeScript only so `node file.ts` can import it.
import { z } from "zod";

export const LICENCE_IDS = [
  "statsbomb-public-data-user-agreement",
  "CC-BY-4.0",
  "MIT",
  "none-stated-informal-credit",
  "request-form-no-terms-stated",
] as const;

export const DATA_TYPES = ["event", "360", "tracking", "broadcast-tracking", "physical"] as const;

const utcZ = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
const count = z.number().int().min(0).nullable();

export const coverageRowSchema = z
  .strictObject({
    provider: z.string().min(1),
    dataset: z.string().min(1),
    competition: z.string().min(1),
    competition_id: z.string().nullable(),
    season: z.string().min(1),
    data_type: z.enum(DATA_TYPES),
    matches_total: count,
    pl_matches: count,
    status: z.enum(["ok", "unreachable", "request-only"]),
    method: z.enum(["index", "documented", "manual"]),
    licence_id: z.enum(LICENCE_IDS),
    licence_url: z
      .string()
      .regex(/^https?:\/\/\S+$/)
      .nullable(),
    source_url: z.string().regex(/^https?:\/\/\S+$/),
    fetched_at: utcZ,
    notes: z.string(),
  })
  .superRefine((row, ctx) => {
    const unreachable = row.status === "unreachable";
    for (const key of ["matches_total", "pl_matches"] as const) {
      const isNull = row[key] === null;
      if (unreachable && !isNull) {
        ctx.addIssue({ code: "custom", path: [key], message: "must be null when unreachable" });
      }
      if (!unreachable && isNull) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "must be an integer unless unreachable",
        });
      }
    }
  });

export const coverageMatrixSchema = z.strictObject({
  schema_version: z.literal(1),
  generated_at: utcZ,
  script_version: z.string().min(1),
  rows: z.array(coverageRowSchema),
});

export type CoverageRow = z.infer<typeof coverageRowSchema>;
export type CoverageMatrix = z.infer<typeof coverageMatrixSchema>;
