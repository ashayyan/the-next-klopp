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

test.describe("lesson chrome", () => {
  for (const id of DIRECTIONS) {
    test(`${id} has one current step and focus mode keeps only the step`, async ({ page }) => {
      await page.goto(`/dev/directions/${id}/tactics`);
      await expect(page.locator(`[data-direction="${id}"][data-ready="1"]`)).toBeVisible();
      await expect(page.locator('[aria-current="step"]')).toHaveCount(1);

      await page.goto(`/dev/directions/${id}/tactics?focus=1`);
      await expect(page.locator(`[data-direction="${id}"][data-ready="1"]`)).toBeVisible();
      await expect(page.locator("[data-step-rail]")).toHaveCount(0);
      await expect(page.getByText(/^Source: The Analyst/)).toHaveCount(0);
      await expect(page.locator("[data-legend]")).toBeVisible();
      await expect(page.getByRole("switch", { name: "Focus mode" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Continue to Predict" })).toBeVisible();
    });
  }

  test("the theme menu switches floodlit to light and the choice survives a reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/directions/floodlit/tactics");
    const root = page.locator('div[data-direction="floodlit"]');
    await expect(root).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Theme" }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await expect(root).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => localStorage.getItem("tnk:theme"))).toBe("light");
    await page.reload();
    await expect(page.locator('div[data-direction="floodlit"]')).toHaveAttribute(
      "data-theme",
      "light",
    );
  });

  test("a blocked localStorage falls back without a console error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("Failed to load resource"))
        errors.push(m.text());
    });
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("SecurityError: storage is blocked");
        },
      });
    });
    await page.goto("/dev/directions/programme/tactics");
    await expect(page.locator('[data-direction="programme"][data-ready="1"]')).toBeVisible();
    await expect(page.locator('div[data-direction="programme"]')).toHaveAttribute(
      "data-theme",
      "light",
    );
    expect(errors).toEqual([]);
  });

  test("Save note stores nothing and closes the popover", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/directions/notebook/tactics");
    await expect(page.locator('[data-direction="notebook"][data-ready="1"]')).toBeVisible();
    const keysBefore = await page.evaluate(() => Object.keys(localStorage).sort());
    await page.getByRole("button", { name: "I'm confused here" }).click();
    await expect(page.getByRole("heading", { name: "What's confusing here?" })).toBeVisible();
    await expect(
      page.getByText(
        "In this preview the note is not stored. Saving arrives with the progress system.",
      ),
    ).toBeVisible();
    await page.getByLabel("Note (optional)").fill("Why does Stones move and not the DM?");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByRole("heading", { name: "What's confusing here?" })).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(keysBefore);
  });

  test("the 4-4-2 term opens its glossary card", async ({ page }) => {
    await page.goto("/dev/directions/floodlit/tactics");
    await expect(page.locator('[data-direction="floodlit"][data-ready="1"]')).toBeVisible();
    await page.getByRole("button", { name: "4-4-2" }).click();
    const card = page.locator("[data-glossary-card]");
    await expect(card).toContainText(
      "Four defenders, four midfielders and two forwards, counted from the back. The goalkeeper is not counted.",
    );
    await expect(card.locator('[role="img"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);
    await expect(page.getByRole("button", { name: "4-4-2" })).toBeFocused();
  });
});

test.describe("data screen", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("opens paused at 0.0 s and links the table, the pitch and the clock", async ({ page }) => {
    await page.goto("/dev/directions/floodlit/data");
    await expect(page.locator('div[data-direction="floodlit"][data-ready="1"]')).toBeVisible();
    const readout = page.locator('[role="toolbar"][aria-label="Playback"] output');
    await expect(readout).toContainText("0.0 s");
    await expect(page.getByRole("button", { name: "Play sequence" })).toBeVisible();

    const row6 = page.locator('tr[data-row="ev-185704179"]');
    await row6.focus();
    const ring = page.locator('[data-pitch] [data-glyph="highlight"] circle');
    await expect(ring).toHaveCount(1);
    expect(Number(await ring.getAttribute("cx"))).toBeCloseTo(38.24, 2);
    expect(Number(await ring.getAttribute("cy"))).toBeCloseTo(20.56, 2);

    await page.keyboard.press("Enter");
    await expect(readout).toContainText("9.7 s");
    await expect(page.getByRole("button", { name: "Play sequence" })).toBeVisible();
    await expect(row6).toHaveAttribute("aria-selected", "true");
  });

  test("shows the pitch markings and the loading line while the scene loads", async ({ page }) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/scene-wyscout-*.json", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/dev/directions/notebook/data");
    const status = page.getByRole("status").filter({ hasText: "Loading the goal…" });
    await expect(status).toBeVisible();
    await expect(page.locator('[data-pitch] [data-marking="halfway-line"]')).toBeAttached();
    // Nothing covers the pitch: the element at its centre belongs to the pitch.
    const covered = await page.evaluate(() => {
      const pitch = document.querySelector("[data-pitch]");
      if (!pitch) return true;
      const r = pitch.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return hit === null || !pitch.contains(hit);
    });
    expect(covered).toBe(false);
    release();
    await expect(page.locator("table")).toBeVisible();
  });

  test("a missing scene file shows the error panel and no table", async ({ page }) => {
    await page.route("**/scene-wyscout-*.json", (route) =>
      route.fulfill({ status: 404, body: "not found" }),
    );
    await page.goto("/dev/directions/programme/data");
    const panel = page.locator("[data-error-panel]");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "The goal data didn't load" })).toBeVisible();
    await expect(panel).toContainText("Run npm run data, then reload this page.");
    await expect(page.locator("table")).toHaveCount(0);
    await expect(page.locator("[data-stat-card]")).toHaveCount(0);
    await expect(page.locator("[data-chart-figure]")).toHaveCount(0);
    await expect(page.locator('[data-pitch] [data-marking="halfway-line"]')).toBeAttached();
  });

  test("bar 6 carries the direct label and its tooltip", async ({ page }) => {
    await page.goto("/dev/directions/floodlit/data");
    await expect(page.locator('div[data-direction="floodlit"][data-ready="1"]')).toBeVisible();
    await expect(page.locator('[data-chart="direct-label"]')).toHaveText(
      "+31.5 m, Mangala to De Bruyne",
    );
    await page.locator('[data-bar-hit="6"]').focus();
    const tip = page.locator('[data-chart="tooltip"]');
    await expect(tip).toContainText("Action 6");
    await expect(tip).toContainText("Mangala to De Bruyne, pass");
    await expect(tip).toContainText("+31.5 m at 9.7 s");
  });
});

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
