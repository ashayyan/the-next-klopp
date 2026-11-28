// DSGN-01: the three visual directions render the same tactics screen and the shape toggle works
// in each one (04-UI-SPEC "Screen 1 — Tactics lesson").
import { expect, type Page, test } from "@playwright/test";

const DIRECTIONS = ["floodlit", "programme", "notebook"] as const;

/** Canonical centre (metres) of the disc whose <title> names John Stones. */
async function stonesCentre(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const glyph = [...document.querySelectorAll('[data-glyph="player-a"]')].find((g) =>
      g.querySelector("title")?.textContent?.includes("John Stones"),
    );
    const circle = glyph?.querySelector("circle");
    if (!circle) return null;
    return { x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")) };
  });
}

for (const id of DIRECTIONS) {
  test.describe(`${id} tactics`, () => {
    test("opens without the ball and flips to the 3-2-4-1 with an announcement", async ({
      page,
    }) => {
      await page.goto(`/dev/directions/${id}/tactics`);
      await expect(page.locator(`[data-direction="${id}"][data-ready="1"]`)).toBeVisible();
      const group = page.getByRole("group", { name: "Possession" });
      await expect(group.getByRole("button", { name: "Without the ball" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      const readout = page.locator('[data-readout="shape"]');
      await expect(readout).toHaveText("Shape now: 4-4-2");

      await group.getByRole("button", { name: "With the ball" }).click();
      await expect(readout).toHaveText("Shape now: 3-2-4-1");
      await expect(page.locator("[data-announcer]")).toHaveText(
        "Shape now 3-2-4-1. Stones moved into midfield.",
      );
      await expect(
        page.locator('[data-pitch] [data-part="note-text"]', {
          hasText: "Stones steps into midfield",
        }),
      ).toBeVisible();
      expect(await stonesCentre(page)).toEqual({ x: 50, y: 41 });

      await group.getByRole("button", { name: "Without the ball" }).click();
      await expect(readout).toHaveText("Shape now: 4-4-2");
      await expect(page.locator("[data-announcer]")).toHaveText("Shape now 4-4-2.");
    });

    test.describe("with reduced motion", () => {
      test.use({ reducedMotion: "reduce" });

      test("swaps the frame within one animation frame", async ({ page }) => {
        await page.goto(`/dev/directions/${id}/tactics`);
        await expect(page.locator(`[data-direction="${id}"][data-ready="1"]`)).toBeVisible();
        expect(await stonesCentre(page)).toEqual({ x: 27, y: 41 });
        await page.getByRole("button", { name: "With the ball" }).click();
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
        expect(await stonesCentre(page)).toEqual({ x: 50, y: 41 });
        await expect(page.locator('[data-readout="shape"]')).toHaveText("Shape now: 3-2-4-1");
      });
    });
  });
}

test("an unknown direction shows the fallback with links to the three directions", async ({
  page,
}) => {
  await page.goto("/dev/directions/nope/tactics");
  await expect(
    page.getByRole("heading", {
      name: "No direction called “nope”. Pick floodlit, programme or notebook.",
    }),
  ).toBeVisible();
  for (const name of ["Floodlit", "Matchday Programme", "Analyst’s Notebook"]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
});
