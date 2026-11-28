// `/learn/:lessonId`: the lesson title from the eager lesson list, then the lesson MDX (lazy, its
// own chunk) one `<Step>` screen at a time. `?step=<id>` deep-links a screen; moving on rewrites
// it with `replace`. The full frame, rail, nav and states arrive in 05-05 to 05-07.
import { MDXProvider } from "@mdx-js/react";
import type { MDXContent } from "mdx/types";
import { Suspense, use, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { findLesson, type LessonStepSpec, loaders } from "../../content/lessons.ts";
import { CurrentStepContext, lessonComponents } from "../../content/mdx/components.tsx";
import { Button } from "../../ui/Button.tsx";

const mdxCache = new Map<string, Promise<{ default: MDXContent }>>();

/** One promise per lesson id, so a re-render never starts a second fetch. */
function loadLessonMdx(id: string): Promise<{ default: MDXContent }> {
  let pending = mdxCache.get(id);
  if (!pending) {
    const loader = loaders[id];
    pending = loader ? loader() : Promise.reject(new Error(`No MDX loader for lesson ${id}`));
    mdxCache.set(id, pending);
  }
  return pending;
}

/** The screen to show: the `?step=` id when the lesson has it, otherwise the first screen. */
export function resolveStepId(steps: readonly LessonStepSpec[], requested: string | null): string {
  const match = requested === null ? undefined : steps.find((s) => s.id === requested);
  return match?.id ?? steps[0]?.id ?? "";
}

/** The screen after `current`, or null on the last screen. */
export function nextStepId(steps: readonly LessonStepSpec[], current: string): string | null {
  const index = steps.findIndex((s) => s.id === current);
  return index === -1 ? null : (steps[index + 1]?.id ?? null);
}

function LessonContent({ lessonId }: { lessonId: string }) {
  const { default: Content } = use(loadLessonMdx(lessonId));
  return <Content />;
}

export default function LessonPage() {
  const { lessonId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [finishedId, setFinishedId] = useState<string | null>(null);
  const lesson = findLesson(lessonId);

  if (!lesson) {
    return (
      <main id="content" className="p-8">
        <h1 className="text-display">{`No lesson called “${lessonId}”`}</h1>
        <p className="mt-4 text-body">
          This build has no lesson with that id. It may still be a draft, or the link has a typo.
        </p>
      </main>
    );
  }

  const current = resolveStepId(lesson.steps, searchParams.get("step"));
  const next = nextStepId(lesson.steps, current);
  const finished = finishedId === lesson.id;

  function moveOn() {
    if (next === null) {
      setFinishedId(lesson?.id ?? null);
      return;
    }
    setSearchParams({ step: next }, { replace: true });
  }

  return (
    <main id="content" className="flex flex-col gap-6 p-8">
      <h1 className="text-display">{lesson.title}</h1>
      {finished ? (
        <section data-lesson-complete>
          <h2 className="text-heading">Lesson finished</h2>
          <p className="mt-2 text-body">{`You finished “${lesson.title}”.`}</p>
        </section>
      ) : (
        <>
          <Suspense
            fallback={
              <p role="status" className="text-body">
                Loading the lesson…
              </p>
            }
          >
            <CurrentStepContext.Provider value={current}>
              <MDXProvider components={lessonComponents}>
                <LessonContent lessonId={lesson.id} />
              </MDXProvider>
            </CurrentStepContext.Provider>
          </Suspense>
          <div>
            <Button data-next-step={next ?? undefined} onClick={moveOn}>
              {next === null ? "Finish lesson" : "Continue"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
