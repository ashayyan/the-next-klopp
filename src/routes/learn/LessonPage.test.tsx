// @vitest-environment node
// Renders /learn/:lessonId through a memory data router with React's static prerender, which waits
// for the lazy route and the lazy lesson MDX (Suspense) before it returns the HTML.
// The repo has no DOM test environment, so "Continue" is checked through the step it targets
// (`data-next-step`) and the router navigation it performs (`?step=` with replace).
import { prerenderToNodeStream } from "react-dom/static";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { findLesson } from "../../content/lessons.ts";
import { buildRoutes } from "../../routes.ts";
import { nextStepId, resolveStepId } from "./LessonPage.tsx";

const LESSON_ID = "fx-a-goal-in-ten-actions";

type MemoryRouter = ReturnType<typeof createMemoryRouter>;

async function settled(router: MemoryRouter): Promise<void> {
  const end = Date.now() + 10_000;
  while (!router.state.initialized || router.state.navigation.state !== "idle") {
    if (Date.now() > end) throw new Error("router did not settle");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function render(router: MemoryRouter): Promise<string> {
  await settled(router);
  const { prelude } = await prerenderToNodeStream(<RouterProvider router={router} />);
  let html = "";
  for await (const chunk of prelude) html += chunk.toString();
  return html;
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("LessonPage", () => {
  const lesson = findLesson(LESSON_ID);

  it("finds the fixture lesson in the test build", () => {
    expect(lesson?.fixture).toBe(true);
    expect(lesson?.dir).toBe(`/content/_fixtures/${LESSON_ID}`);
  });

  it("renders the title as h1 and exactly one step screen", async () => {
    const router = createMemoryRouter(buildRoutes({ includeDev: false }), {
      initialEntries: [`/learn/${LESSON_ID}`],
    });
    const html = await render(router);
    expect(html).toMatch(/<h1[^>]*>A goal in ten actions<\/h1>/);
    expect(count(html, "data-lesson-step")).toBe(1);
    expect(html).toContain(`data-step-id="${lesson?.steps[0]?.id}"`);
    expect(html).toContain(">Continue<");
  });

  it("Continue targets the second step and moving there renders it alone", async () => {
    const first = lesson?.steps[0]?.id ?? "";
    const second = lesson?.steps[1]?.id ?? "";
    const router = createMemoryRouter(buildRoutes({ includeDev: false }), {
      initialEntries: [`/learn/${LESSON_ID}`],
    });
    const before = await render(router);
    expect(before).toContain(`data-next-step="${second}"`);

    // The same navigation the button's handler performs.
    await router.navigate(`/learn/${LESSON_ID}?step=${second}`, { replace: true });
    const after = await render(router);
    expect(count(after, "data-lesson-step")).toBe(1);
    expect(after).toContain(`data-step-id="${second}"`);
    expect(after).not.toContain(`data-step-id="${first}"`);
  });

  it("shows Finish lesson on the last screen", async () => {
    const last = lesson?.steps.at(-1)?.id ?? "";
    const router = createMemoryRouter(buildRoutes({ includeDev: false }), {
      initialEntries: [`/learn/${LESSON_ID}?step=${last}`],
    });
    const html = await render(router);
    expect(html).toContain(`data-step-id="${last}"`);
    expect(html).toContain(">Finish lesson<");
  });

  it("answers an unknown lesson id with a not-found heading", async () => {
    const router = createMemoryRouter(buildRoutes({ includeDev: false }), {
      initialEntries: ["/learn/no-such-lesson"],
    });
    const html = await render(router);
    expect(html).toContain("No lesson called “no-such-lesson”");
  });
});

describe("step helpers", () => {
  const steps = [
    { id: "a", stage: "hook" },
    { id: "b", stage: "see" },
  ];

  it("opens the requested step, or the first one when it is unknown or missing", () => {
    expect(resolveStepId(steps, "b")).toBe("b");
    expect(resolveStepId(steps, "zzz")).toBe("a");
    expect(resolveStepId(steps, null)).toBe("a");
  });

  it("returns the next step id and null on the last screen", () => {
    expect(nextStepId(steps, "a")).toBe("b");
    expect(nextStepId(steps, "b")).toBeNull();
  });
});
