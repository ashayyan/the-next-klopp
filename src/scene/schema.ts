// Scene/Frame format v1 (PITCH-04): hand-written Zod 4 mirror of schemas/scene.schema.json.
//
// JSON Schema is the language-neutral source of truth; schemas/schemas.test.ts proves both
// validators reach the same verdict on every fixture. Semantic rules JSON Schema cannot express
// (frame order, references, pitch-relative bounds, licence rules) live in ./validate.ts.
//
// Presence rule (frozen, decision A7): an entity's effective presence is
// `entity.presence ?? (scene.kind === "reconstruction" ? "sampled" : "always")`. See
// ./playback/sample.ts for what each value means when the scene is sampled at time t.
import { z } from "zod";

// kebabId and httpUrl mirror schemas/common.schema.json $defs. They are re-declared here, not
// imported from src/schemas/contracts.ts, because contracts.ts imports this module (a back-import
// would be a circular ESM import). The dual-validator harness keeps them aligned.
const kebabId = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const httpUrl = z.string().regex(/^https?:\/\/[^\s/$.?#][^\s]*$/);

const text = (max: number) => z.string().min(1).max(max);
const seconds = z.number().min(0);

export const sceneKinds = ["authored", "board", "quiz-answer", "reconstruction"] as const;

export const pointSchema = z.strictObject({
  x: z.number().min(-10).max(130),
  y: z.number().min(-10).max(100),
});

export const teamSchema = z.strictObject({
  id: kebabId,
  name: text(60),
  side: z.enum(["a", "b"]),
  venue: z.enum(["home", "away"]).optional(),
  attack: z
    .record(z.string().regex(/^[1-5]$/), z.enum(["ltr", "rtl"]))
    .refine((o) => Object.keys(o).length >= 1 && Object.keys(o).length <= 5, {
      message: "attack needs 1 to 5 periods",
    }),
});

export const entitySchema = z.strictObject({
  id: kebabId,
  type: z.enum(["player", "goalkeeper", "ball"]),
  team: kebabId.optional(),
  number: z.number().int().min(1).max(99).optional(),
  label: text(40).optional(),
  name: text(80).optional(),
  role: text(40).optional(),
  presence: z.enum(["always", "sampled"]).optional(),
});

export const frameSchema = z.strictObject({
  t: z.number().min(0).max(10800),
  positions: z.record(kebabId, pointSchema).refine((o) => Object.keys(o).length <= 64, {
    message: "at most 64 positions",
  }),
  ballOwner: kebabId.optional(),
});

const eventCommon = {
  id: kebabId,
  t: seconds,
  tEnd: seconds.optional(),
  team: kebabId,
  player: kebabId.optional(),
  start: pointSchema,
  end: pointSchema,
  ref: text(64).optional(),
};

export const eventSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...eventCommon, type: z.literal("pass"), receiver: kebabId.optional() }),
  z.strictObject({ ...eventCommon, type: z.literal("carry"), player: kebabId }),
  z.strictObject({ ...eventCommon, type: z.literal("run"), player: kebabId }),
  z.strictObject({
    ...eventCommon,
    type: z.literal("shot"),
    goal: z.boolean(),
    endApprox: z.boolean().optional(),
  }),
  z.strictObject({
    ...eventCommon,
    type: z.literal("pressure"),
    player: kebabId,
    target: kebabId.optional(),
  }),
]);

const timeRange = { from: seconds.optional(), to: seconds.optional() };

export const annotationSchema = z.discriminatedUnion("type", [
  z.strictObject({
    id: kebabId,
    type: z.literal("zone"),
    points: z.array(pointSchema).min(3).max(32),
    label: text(40).optional(),
    ...timeRange,
  }),
  z.strictObject({
    id: kebabId,
    type: z.literal("shape"),
    team: kebabId,
    members: z.array(kebabId).min(2).max(11),
    closed: z.boolean().optional(),
    ...timeRange,
  }),
  z.strictObject({
    id: kebabId,
    type: z.literal("highlight"),
    target: kebabId.optional(),
    at: pointSchema.optional(),
    ...timeRange,
  }),
  z.strictObject({
    id: kebabId,
    type: z.literal("note"),
    text: text(200),
    at: pointSchema,
    anchor: pointSchema.optional(),
    ...timeRange,
  }),
  z.strictObject({
    id: kebabId,
    type: z.literal("point"),
    at: pointSchema,
    label: text(12).optional(),
    ...timeRange,
  }),
  z.strictObject({
    id: kebabId,
    type: z.literal("sequence"),
    events: z.array(kebabId).min(1).max(100),
  }),
]);

export const sourceSchema = z.strictObject({
  type: z.enum(["authored", "open-data"]),
  provider: z
    .enum(["wyscout", "statsbomb", "dfl", "metrica", "skillcorner", "last-row"])
    .optional(),
  sourceIds: z
    .array(z.string().regex(/^src-[a-z0-9]+(?:-[a-z0-9]+)*(?:#[a-z0-9]+(?:-[a-z0-9]+)*)?$/))
    .max(20),
  licence: text(80),
  licenceUrl: httpUrl.optional(),
  attribution: text(400),
  shippable: z.boolean(),
  localOnly: z.boolean().optional(),
  logoRequired: z.boolean().optional(),
  matchId: text(40).optional(),
  clock: z
    .strictObject({
      period: z.number().int().min(1).max(5),
      offsetSec: z.number().min(0),
    })
    .optional(),
  recipe: kebabId.optional(),
});

export const sceneSchema = z.strictObject({
  id: kebabId,
  schemaVersion: z.literal(1),
  kind: z.enum(sceneKinds),
  label: text(120),
  pitch: z.strictObject({
    length: z.number().min(90).max(120),
    width: z.number().min(45).max(90),
  }),
  teams: z.array(teamSchema).max(2),
  entities: z.array(entitySchema).max(64),
  frames: z.array(frameSchema).min(1).max(5000),
  events: z.array(eventSchema).max(500),
  annotations: z.array(annotationSchema).max(100),
  source: sourceSchema,
});

export type Scene = z.infer<typeof sceneSchema>;
export type SceneKind = Scene["kind"];
export type ScenePoint = z.infer<typeof pointSchema>;
export type SceneTeam = z.infer<typeof teamSchema>;
export type SceneEntity = z.infer<typeof entitySchema>;
export type SceneFrame = z.infer<typeof frameSchema>;
export type SceneEvent = z.infer<typeof eventSchema>;
export type SceneAnnotation = z.infer<typeof annotationSchema>;
export type SceneSource = z.infer<typeof sourceSchema>;
