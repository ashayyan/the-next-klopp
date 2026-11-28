// tsconfig `types` lists only vite/client and node, which switches off automatic @types loading,
// so the MDX module types are referenced here explicitly (05-RESEARCH Pitfall 10).
/// <reference types="mdx" />

declare module "virtual:tnk-lessons" {
  import type { MDXContent } from "mdx/types";

  /** The frozen lesson spec v1, inferred from the Zod mirror of schemas/lesson.schema.json. */
  export type LessonSpec = import("./schemas/lesson.ts").LessonSpec;
  /** One screen of a lesson: a stable id (the `<Step id>` in lesson.mdx) and its Lesson Loop stage. */
  export type LessonStepSpec = import("./schemas/lesson.ts").LessonStep;

  /** A lesson this build includes. `dir` is root-relative with forward slashes. */
  export type LessonEntry = LessonSpec & { fixture: boolean; dir: string };

  /** Lessons chosen at build time (drafts and fixtures never reach the study build). */
  export const lessons: LessonEntry[];
  /** One lazy MDX loader per included lesson id. An excluded lesson has no loader and no chunk. */
  export const loaders: Record<string, () => Promise<{ default: MDXContent }>>;
}
