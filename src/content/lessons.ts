// Typed access to the lessons this build includes. The list and the loaders come from the
// build-time virtual module (scripts/lib/content/vite-plugin.ts): a lesson missing here was left
// out of the build on purpose (draft, fixture) and has no chunk. The curriculum, cited sources,
// concept summaries, study order and What's new come from the same module, so the app never
// bundles the research files.
import {
  type Curriculum,
  type CurriculumPart,
  type CurriculumTrack,
  lessons as includedLessons,
  loaders as includedLoaders,
  type LessonEntry,
  type LessonStepSpec,
  buildDate as moduleBuildDate,
  conceptSummaries as moduleConceptSummaries,
  curriculum as moduleCurriculum,
  order as moduleOrder,
  sources as moduleSources,
  whatsNew as moduleWhatsNew,
  type SourceSummary,
  type WhatsNew,
} from "virtual:tnk-lessons";

export type {
  Curriculum,
  CurriculumPart,
  CurriculumTrack,
  LessonEntry,
  LessonStepSpec,
  SourceSummary,
  WhatsNew,
};

export const lessons: readonly LessonEntry[] = includedLessons;
export const loaders = includedLoaders;
export const curriculum: Curriculum = moduleCurriculum;
export const conceptSummaries: Readonly<Record<string, string>> = moduleConceptSummaries;
export const order: readonly string[] = moduleOrder;
export const whatsNew: WhatsNew = moduleWhatsNew;
export const buildDate: string = moduleBuildDate;

export function findLesson(id: string): LessonEntry | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

export function trackById(id: string): CurriculumTrack | undefined {
  return curriculum.tracks.find((track) => track.id === id);
}

/** Included lessons of one chapter, in study order. */
export function lessonsInChapter(trackId: string, chapter: string): LessonEntry[] {
  const position = new Map(order.map((id, i) => [id, i]));
  return lessons
    .filter((lesson) => lesson.track === trackId && lesson.chapter === chapter)
    .sort(
      (a, b) =>
        (position.get(a.id) ?? Number.POSITIVE_INFINITY) -
        (position.get(b.id) ?? Number.POSITIVE_INFINITY),
    );
}

/** The registry entry behind a cited source id (an alias resolves to its target entry). */
export function sourceById(id: string): SourceSummary | undefined {
  return Object.hasOwn(moduleSources, id) ? moduleSources[id] : undefined;
}
