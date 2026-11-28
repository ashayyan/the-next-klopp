// content/lesson-manifest.json: the generated list of lessons the walker (05-04), the bundle gate
// (05-19) and the role report (05-16) read instead of parsing lessons themselves. Written by
// `npm run validate -- --write`; a plain `npm run validate` fails when the committed file differs.
// Lessons sorted by id, fixed key order, LF endings. Erasable TypeScript only.
import type { RuleContext } from "./rules/index.ts";

export const MANIFEST_PATH = "content/lesson-manifest.json";

export interface ManifestStep {
  id: string;
  /** The MDX `<Step>` id (`screen ?? id`). */
  screen: string;
  stage: string;
  heading: string | null;
  /** Line of the `<Step>` in lesson.mdx, 0 when the step is missing there. */
  line: number;
  words: number;
  interaction: { id: string; props: Record<string, unknown> } | null;
  dataRefs: string[];
}

export interface ManifestLesson {
  id: string;
  title: string;
  status: string;
  fixture: boolean;
  /** Repo-relative folder, forward slashes. */
  dir: string;
  route: string;
  template: string;
  track: string;
  chapter: string;
  durationMin: number;
  steps: ManifestStep[];
  /** The answer key of each quiz item, for the walker's oracle. */
  quiz: { id: string; answer: string }[];
}

export interface LessonManifest {
  schemaVersion: 1;
  lessons: ManifestLesson[];
}

/** Every lesson whose lesson.json passes spec v1 (others are reported by the `schema` rule). */
export function buildManifest(ctx: RuleContext): LessonManifest {
  const lessons: ManifestLesson[] = [];
  for (const lesson of ctx.lessons) {
    const spec = lesson.spec;
    if (!spec) continue;
    lessons.push({
      id: spec.id,
      title: spec.title,
      status: spec.status,
      fixture: lesson.fixture,
      dir: lesson.dir,
      route: `/learn/${spec.id}`,
      template: spec.template,
      track: spec.track,
      chapter: spec.chapter,
      durationMin: spec.durationMin,
      steps: spec.steps.map((step) => {
        const screen = step.screen ?? step.id;
        const info = lesson.steps.find((s) => s.id === screen);
        return {
          id: step.id,
          screen,
          stage: step.stage,
          heading: info?.heading ?? null,
          line: info?.line ?? 0,
          words: info?.words ?? 0,
          interaction: step.interaction
            ? { id: step.interaction.id, props: step.interaction.props }
            : null,
          dataRefs: [...step.dataRefs],
        };
      }),
      quiz: spec.quiz.map((q) => ({ id: q.id, answer: q.answer })),
    });
  }
  lessons.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { schemaVersion: 1, lessons };
}

export function renderManifest(manifest: LessonManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * True when the committed text holds the same manifest. Compared as parsed JSON, so a formatter
 * that only changes whitespace (Biome in lint-staged) never makes the file stale.
 */
export function manifestMatches(committed: string | null, manifest: LessonManifest): boolean {
  if (committed === null) return false;
  try {
    return JSON.stringify(JSON.parse(committed)) === JSON.stringify(manifest);
  } catch {
    return false;
  }
}
