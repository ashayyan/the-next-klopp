// One spec for every lesson: reads content/lesson-manifest.json, so a lesson needs no test code.
// Pointer pass: open the route, and on each screen check the h2 against the manifest heading, run
// axe (zero violations), complete the step's interaction through its oracle, then press the primary
// button. Keyboard, reduced-motion and performance passes arrive in 05-14 and 05-15.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { ORACLES } from "../oracles/index.ts";
import { pointerDriver, type QuizKey } from "./drivers.ts";
import { walkedLessons } from "./manifest.ts";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const lessons = walkedLessons();

/**
 * Axe reads the resting screen: the pointer parks in the corner (the primary button's hover look is
 * not a screen state; see deferred-items.md) and running CSS transitions finish first.
 */
async function settle(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
}

test("the manifest has lessons to walk", () => {
  expect(
    lessons.length,
    "no fixture or shippable lesson in content/lesson-manifest.json",
  ).toBeGreaterThan(0);
});

for (const lesson of lessons) {
  test.describe(lesson.id, () => {
    test("pointer pass", async ({ page }) => {
      const quiz: QuizKey[] = lesson.quiz.map((q) => ({
        id: q.id,
        answer: q.answer,
        answerLabel: q.answerLabel ?? q.answer,
      }));
      await page.goto(lesson.route);

      for (const [index, step] of lesson.steps.entries()) {
        const where = `${lesson.id} step ${index + 1} (${step.id})`;
        const heading = page.locator("[data-lesson-step] h2").first();
        await expect(heading, `${where}: heading`).toBeVisible();
        if (step.heading !== null) {
          await expect(heading, `${where}: heading text`).toHaveText(step.heading);
        }

        await settle(page);
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        expect(
          violations.map(
            (v) =>
              `${v.id} (${v.nodes.length} nodes): ${v.nodes[0]?.target.join(" ")} ${JSON.stringify(v.nodes[0]?.any.map((a) => a.data))}`,
          ),
          `${where}: axe violations`,
        ).toEqual([]);

        if (step.interaction) {
          const oracle = ORACLES[step.interaction.id];
          if (!oracle) throw new Error(`no oracle for ${step.interaction.id}`);
          await oracle.complete(pointerDriver(page), step.interaction.props, { quiz });
          await oracle.assertDone(page, step.interaction.props);
        }

        await page.locator('main [data-variant="primary"]').first().click();
      }

      await expect(
        page.locator("[data-lesson-complete]"),
        `${lesson.id}: finished state`,
      ).toBeVisible();
    });
  });
}
