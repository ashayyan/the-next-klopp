// Phase 3 open observations 1, 2 and 5 (04-UI-SPEC), checked in a real browser on the Wyscout
// reconstruction scene: no sequence badge sits on a player disc, every note chip stays inside the
// pitch SVG, and "Play sequence" reads in words from 768 px.
import { expect, type Page, test } from "@playwright/test";

type Box = { x: number; y: number; width: number; height: number };

const SCENE = "/dev/pitch?scene=reconstruction";
const DISCS = '[data-glyph^="player-"], [data-glyph^="goalkeeper-"]';

async function openScene(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto(SCENE);
  await page.locator('[data-layer="scene"]').first().waitFor({ state: "attached" });
  await page.locator('[aria-label="Play sequence"]').waitFor({ state: "attached" });
  await page.evaluate(() => document.fonts.ready);
}

function overlaps(a: Box, b: Box): boolean {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0.5 && h > 0.5;
}

async function boxes(page: Page, selector: string): Promise<Box[]> {
  return page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
}

/** Checks the current frame; returns how many badges and notes it looked at. */
async function checkFrame(page: Page, label: string): Promise<{ badges: number; notes: number }> {
  const badges = await boxes(page, '[data-glyph="sequence-badge"]');
  const discs = await boxes(page, DISCS);
  for (const [i, badge] of badges.entries()) {
    for (const disc of discs) {
      expect(overlaps(badge, disc), `${label}: badge ${i + 1} overlaps a player disc`).toBe(false);
    }
  }
  const svg = await page
    .locator("[data-pitch] svg[role]")
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
  const notes = await boxes(page, '[data-part="note-text"]');
  for (const [i, note] of notes.entries()) {
    expect(note.x, `${label}: note ${i + 1} left edge`).toBeGreaterThanOrEqual(svg.x - 0.5);
    expect(note.y, `${label}: note ${i + 1} top edge`).toBeGreaterThanOrEqual(svg.y - 0.5);
    expect(note.x + note.width, `${label}: note ${i + 1} right edge`).toBeLessThanOrEqual(
      svg.x + svg.width + 0.5,
    );
    expect(note.y + note.height, `${label}: note ${i + 1} bottom edge`).toBeLessThanOrEqual(
      svg.y + svg.height + 0.5,
    );
  }
  return { badges: badges.length, notes: notes.length };
}

for (const [width, height] of [
  [375, 812],
  [1440, 900],
] as const) {
  test(`${width} px: no badge overlaps a player disc and every note chip lies inside the pitch`, async ({
    page,
  }) => {
    await openScene(page, width, height);
    let badges = 0;
    let frames = 0;
    const next = page.getByRole("button", { name: "Next frame" });
    // Step through every keyframe; the loop ends when the clock stops moving.
    let previous = "";
    for (let i = 0; i < 40; i += 1) {
      const seen = await checkFrame(page, `${width}px frame ${i}`);
      badges += seen.badges;
      frames += 1;
      const clock = await page.locator('input[type="range"]').first().inputValue();
      if (clock === previous) break;
      previous = clock;
      if (await next.isDisabled()) break;
      await next.click();
    }
    expect(frames, "the scene has several frames").toBeGreaterThan(3);
    expect(badges, "the scene draws sequence badges in at least one frame").toBeGreaterThan(0);
  });
}

for (const width of [768, 1440]) {
  test(`${width} px: the play button reads "Play sequence"`, async ({ page }) => {
    await openScene(page, width, 900);
    await expect(page.getByText("Play sequence", { exact: true })).toBeVisible();
  });
}

test("375 px: the play button keeps its accessible name without the visible words", async ({
  page,
}) => {
  await openScene(page, 375, 812);
  await expect(page.getByRole("button", { name: "Play sequence" })).toBeVisible();
  await expect(page.getByText("Play sequence", { exact: true })).toBeHidden();
});
