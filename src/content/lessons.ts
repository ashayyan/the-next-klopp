// Typed access to the lessons this build includes. The list and the loaders come from the
// build-time virtual module (scripts/lib/content/vite-plugin.ts): a lesson missing here was left
// out of the build on purpose (draft, fixture) and has no chunk.
import {
  lessons as includedLessons,
  loaders as includedLoaders,
  type LessonEntry,
  type LessonStepSpec,
} from "virtual:tnk-lessons";

export type { LessonEntry, LessonStepSpec };

export const lessons: readonly LessonEntry[] = includedLessons;
export const loaders = includedLoaders;

export function findLesson(id: string): LessonEntry | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
