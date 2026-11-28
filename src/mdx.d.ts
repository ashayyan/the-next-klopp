// tsconfig `types` lists only vite/client and node, which switches off automatic @types loading,
// so the MDX module types are referenced here explicitly (05-RESEARCH Pitfall 10).
/// <reference types="mdx" />

declare module "virtual:tnk-lessons" {
  import type { MDXContent } from "mdx/types";

  /** The frozen lesson spec v1, inferred from the Zod mirror of schemas/lesson.schema.json. */
  export type LessonSpec = import("./schemas/lesson.ts").LessonSpec;
  /** One screen of a lesson: a stable id (the `<Step id>` in lesson.mdx) and its Lesson Loop stage. */
  export type LessonStepSpec = import("./schemas/lesson.ts").LessonStep;
  /** content/whats-new.json, validated at build. */
  export type WhatsNew = import("./schemas/lesson.ts").WhatsNew;
  /** 29 tracks in number order, each with its concept-map parts as chapters. */
  export type Curriculum = import("../scripts/lib/content/curriculum.ts").Curriculum;
  export type CurriculumTrack = import("../scripts/lib/content/curriculum.ts").CurriculumTrack;
  export type CurriculumPart = import("../scripts/lib/content/curriculum.ts").CurriculumPart;
  /** The display fields of one registry entry a source chip shows. */
  export type SourceSummary = import("../scripts/lib/content/curriculum.ts").SourceSummary;

  /** A lesson this build includes. `dir` is root-relative with forward slashes. */
  export type LessonEntry = LessonSpec & { fixture: boolean; dir: string };

  /** Lessons chosen at build time (drafts and fixtures never reach the study build). */
  export const lessons: LessonEntry[];
  /** One lazy MDX loader per included lesson id. An excluded lesson has no loader and no chunk. */
  export const loaders: Record<string, () => Promise<{ default: MDXContent }>>;
  /** Track titles, numbers and per-part concept counts (never the concept map itself). */
  export const curriculum: Curriculum;
  /** Registry entries cited by included lessons only, keyed by the id as cited (aliases resolved). */
  export const sources: Record<string, SourceSummary>;
  /** Summary of the first concept of every included lesson, keyed by concept id. */
  export const conceptSummaries: Record<string, string>;
  /** Included lesson ids in study order: track, chapter, first-concept position, id. */
  export const order: string[];
  export const whatsNew: WhatsNew;
  /** YYYY-MM-DD, local date of the build. */
  export const buildDate: string;
}
