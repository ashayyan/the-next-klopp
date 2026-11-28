// tsconfig `types` lists only vite/client and node, which switches off automatic @types loading,
// so the MDX module types are referenced here explicitly (05-RESEARCH Pitfall 10).
/// <reference types="mdx" />

declare module "virtual:tnk-lessons" {
  import type { MDXContent } from "mdx/types";

  /** One screen of a lesson: a stable id (the `<Step id>` in lesson.mdx) and its Lesson Loop stage. */
  export interface LessonStepSpec {
    id: string;
    stage: string;
    [key: string]: unknown;
  }

  /**
   * The parsed `lesson.json`. Provisional shape until the frozen v1 schema and its Zod mirror land
   * (05-02 replaces this with `LessonSpec` from src/schemas/lesson.ts).
   */
  export interface LessonSpec {
    id: string;
    version: number;
    title: string;
    track: string;
    chapter: string;
    concepts: string[];
    prerequisites: string[];
    durationMin: number;
    effort: string;
    status: string;
    author: string;
    roles: string[];
    competencies: string[];
    template: string;
    steps: LessonStepSpec[];
    quiz: unknown[];
    sources: string[];
    dataRefs: string[];
    [key: string]: unknown;
  }

  /** A lesson this build includes. `dir` is root-relative with forward slashes. */
  export type LessonEntry = LessonSpec & { fixture: boolean; dir: string };

  /** Lessons chosen at build time (drafts and fixtures never reach the study build). */
  export const lessons: LessonEntry[];
  /** One lazy MDX loader per included lesson id. An excluded lesson has no loader and no chunk. */
  export const loaders: Record<string, () => Promise<{ default: MDXContent }>>;
}
