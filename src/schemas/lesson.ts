// Content contracts of Phase 5: hand-written Zod 4 mirrors of schemas/lesson.schema.json (lesson
// spec v1, CONT-01). JSON Schema is the language-neutral source of truth; schemas/schemas.test.ts
// proves both validators reach the same verdict on every fixture. Frozen: additive changes only.
//
// Cross-document and authoring rules (MDX step parity, stage order, duration 5-12, ids that exist,
// prerequisite cycles, citations, interaction props per registry id) live in the content
// validator (scripts/lib/content/), not here. ADR 0011.
import { z } from "zod";

// kebabId and isoDate mirror schemas/common.schema.json $defs. They are re-declared here, not
// imported from ./contracts.ts, because contracts.ts imports this module (a back-import would be a
// circular ESM import). The dual-validator harness keeps them aligned.
const kebabId = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const isoDate = z.iso.date();

// JSON Schema maxLength counts code points and Zod counts UTF-16 units; they differ only for
// characters outside the Basic Multilingual Plane, which lesson copy does not use.
const text = (max: number) => z.string().min(1).max(max);

/** Mirrors `uniqueItems: true`. */
function unique<T extends z.ZodType>(item: T) {
  return z.array(item).refine((a) => new Set(a).size === a.length, {
    message: "items must be unique",
  });
}

/** The Lesson Loop, exact and ordered (PROJECT.md, 05-CONTEXT). */
export const LESSON_STAGES = [
  "hook",
  "see",
  "touch",
  "predict",
  "reveal",
  "do",
  "lock-in",
  "connect",
] as const;

/** The seven lesson templates of DESIGN.md section 6. */
export const LESSON_TEMPLATES = [
  "concept",
  "simulation",
  "data-lab",
  "case-study",
  "regulation",
  "review",
  "capstone",
] as const;

export const LESSON_STATUSES = ["draft", "review", "shippable", "shipped"] as const;

export type LessonStage = (typeof LESSON_STAGES)[number];
export type LessonTemplate = (typeof LESSON_TEMPLATES)[number];
export type LessonStatus = (typeof LESSON_STATUSES)[number];

/** `<dataset>/<version>/<file>`, version pinned as `v<N>-<hash>` (e.g. `wyscout/v1-809b8aff1fda/x.json`). */
export const dataRef = z.string().regex(/^[a-z0-9-]+\/v\d+-[a-z0-9]+\/[A-Za-z0-9._-]+$/);

const idList = unique(kebabId);
const dataRefList = unique(dataRef);

export const lessonStepSchema = z.strictObject({
  id: kebabId,
  stage: z.enum(LESSON_STAGES),
  /** The MDX `<Step>` anchor; defaults to `id` when absent. */
  screen: kebabId.optional(),
  /** Registry id plus props; props are checked per id by the interaction registry (05-11). */
  interaction: z
    .strictObject({
      id: kebabId,
      props: z.record(z.string(), z.unknown()),
    })
    .optional(),
  dataRefs: dataRefList,
});

export const quizItemSchema = z.strictObject({
  id: kebabId,
  type: z.literal("choice"),
  question: text(200),
  options: z
    .array(z.strictObject({ id: kebabId, label: text(120) }))
    .min(2)
    .max(4),
  answer: kebabId,
  explanation: text(400),
});

export const lessonSchema = z.strictObject({
  id: kebabId,
  version: z.number().int().min(1),
  title: text(40),
  track: z.string().regex(/^t\d{2}-[a-z0-9-]+$/),
  chapter: z.string().regex(/^part-[a-g]$/),
  concepts: unique(kebabId).refine((a) => a.length >= 1, { message: "at least one concept" }),
  prerequisites: idList,
  durationMin: z.number().int().min(1).max(60),
  effort: z.enum(["low", "normal"]),
  status: z.enum(LESSON_STATUSES),
  author: text(120),
  roles: idList,
  competencies: idList,
  template: z.enum(LESSON_TEMPLATES),
  steps: z.array(lessonStepSchema).min(1).max(40),
  quiz: z.array(quizItemSchema).max(20),
  sources: idList,
  dataRefs: dataRefList,
  shippedAt: isoDate.optional(),
});

export type LessonStep = z.infer<typeof lessonStepSchema>;
export type QuizItem = z.infer<typeof quizItemSchema>;
export type LessonSpec = z.infer<typeof lessonSchema>;
