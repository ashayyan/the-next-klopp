// Phase 3 open observations 1, 2 and 5 (04-UI-SPEC) and the 04-UI-REVIEW pitch fixes, checked in a
// real browser: on the Wyscout reconstruction scene no sequence badge sits on a player disc or on
// another badge; on the scenes that carry notes every note chip stays inside the pitch SVG; disc
// labels fit inside their discs; the ball leaves the disc label readable; and "Play sequence" reads
// in words from 768 px.
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

/** Checks the badges of the current frame against the discs and each other; returns the count. */
async function checkBadges(page: Page, label: string): Promise<number> {
  const badges = await boxes(page, '[data-glyph="sequence-badge"]');
  const discs = await boxes(page, DISCS);
  for (const [i, badge] of badges.entries()) {
    for (const disc of discs) {
      expect(overlaps(badge, disc), `${label}: badge ${i + 1} overlaps a player disc`).toBe(false);
    }
    for (const [j, other] of badges.entries()) {
      if (j <= i) continue;
      expect(overlaps(badge, other), `${label}: badge ${i + 1} overlaps badge ${j + 1}`).toBe(
        false,
      );
    }
  }
  return badges.length;
}

for (const [width, height] of [
  [375, 812],
  [1440, 900],
] as const) {
  test(`${width} px: no badge overlaps a player disc or another badge in any frame`, async ({
    page,
  }) => {
    await openScene(page, width, height);
    let badges = 0;
    let most = 0;
    let frames = 0;
    const next = page.getByRole("button", { name: "Next frame" });
    // Step through every keyframe; the loop ends when the clock stops moving.
    let previous = "";
    for (let i = 0; i < 40; i += 1) {
      const seen = await checkBadges(page, `${width}px frame ${i}`);
      badges += seen;
      most = Math.max(most, seen);
      frames += 1;
      const clock = await page.locator('input[type="range"]').first().inputValue();
      if (clock === previous) break;
      previous = clock;
      if (await next.isDisabled()) break;
      await next.click();
    }
    expect(frames, "the scene has several frames").toBeGreaterThan(3);
    expect(badges, "the scene draws sequence badges in at least one frame").toBeGreaterThan(0);
    expect(most, "some frame draws several badges, so badge pairs were compared").toBeGreaterThan(
      2,
    );
  });
}

/** Note chips (the rect and its text) of the current page, in CSS pixels. */
async function noteChips(page: Page): Promise<Box[]> {
  return page.locator('[data-pitch] [data-part="note-text"]').evaluateAll((els) =>
    els.flatMap((el) => {
      const rect = el.parentElement?.querySelector("rect");
      return [el, ...(rect ? [rect] : [])].map((part) => {
        const r = part.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
    }),
  );
}

// The Wyscout scene has no notes, so the chip rule is checked on the scenes that do: the glyph
// sheet, the authored scene and the quiz answer, plus the tactics screen with the ball.
for (const [width, height] of [
  [375, 812],
  [1440, 900],
] as const) {
  test(`${width} px: every note chip lies inside the pitch SVG`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const pages: [string, () => Promise<void>][] = [
      ["/dev/pitch?scene=glyph-sheet", async () => {}],
      ["/dev/pitch?scene=authored", async () => {}],
      ["/dev/pitch?scene=quiz-answer", async () => {}],
      [
        "/dev/directions/floodlit/tactics",
        async () => {
          await page.getByRole("button", { name: "With the ball" }).click();
          await expect(page.locator('[data-readout="shape"]')).toHaveText("Shape now: 3-2-4-1");
        },
      ],
    ];
    for (const [url, prepare] of pages) {
      await page.goto(url);
      await page.locator('[data-layer="scene"]').first().waitFor({ state: "attached" });
      await prepare();
      await page.evaluate(() => document.fonts.ready);
      const chips = await noteChips(page);
      expect(chips.length, `${url} draws at least one note chip`).toBeGreaterThan(0);
      const svg = await page
        .locator("[data-pitch] svg[role]")
        .first()
        .evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        });
      for (const [i, chip] of chips.entries()) {
        const label = `${width}px ${url}: chip part ${i + 1}`;
        expect(chip.x, `${label} left edge`).toBeGreaterThanOrEqual(svg.x - 0.5);
        expect(chip.y, `${label} top edge`).toBeGreaterThanOrEqual(svg.y - 0.5);
        expect(chip.x + chip.width, `${label} right edge`).toBeLessThanOrEqual(
          svg.x + svg.width + 0.5,
        );
        expect(chip.y + chip.height, `${label} bottom edge`).toBeLessThanOrEqual(
          svg.y + svg.height + 0.5,
        );
      }
    }
  });
}

/**
 * Every player and goalkeeper label whose ink box (advance width by the label's own cap height and
 * descent, from the font metrics) pokes out of the inside of its disc or square outline. The inside
 * is the shape's radius (or half side) minus half its outline, so a label never sits on the ring.
 */
async function labelSpills(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return ["no canvas"];
    const out: string[] = [];
    const glyphs = document.querySelectorAll(
      '[data-layer="players"] [data-glyph^="player-"], [data-layer="players"] [data-glyph^="goalkeeper-"]',
    );
    for (const g of glyphs) {
      const text = g.querySelector("text");
      const shape = g.querySelector("circle, rect");
      if (!text || !shape) continue;
      const label = text.textContent ?? "";
      const style = getComputedStyle(text);
      ctx.font = `${style.fontWeight} 100px ${style.fontFamily}`;
      const m = ctx.measureText(label);
      const em = (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent) / 100;
      const t = text.getBoundingClientRect();
      const fs = t.height / em; // font size in screen pixels
      const baseline = t.y + (m.fontBoundingBoxAscent / 100) * fs;
      const ink = {
        x0: t.x,
        x1: t.x + t.width,
        y0: baseline - (m.actualBoundingBoxAscent / 100) * fs,
        y1: baseline + (m.actualBoundingBoxDescent / 100) * fs,
      };
      const s = shape.getBoundingClientRect();
      const half = Number(shape.getAttribute("stroke-width") ?? 0) / 2;
      const cx = s.x + s.width / 2;
      const cy = s.y + s.height / 2;
      const corners = [
        [ink.x0, ink.y0],
        [ink.x1, ink.y0],
        [ink.x0, ink.y1],
        [ink.x1, ink.y1],
      ] as const;
      const inside =
        shape.tagName === "circle"
          ? corners.every(([x, y]) => Math.hypot(x - cx, y - cy) <= s.width / 2 - half + 0.25)
          : corners.every(
              ([x, y]) =>
                x >= s.x + half - 0.25 &&
                x <= s.x + s.width - half + 0.25 &&
                y >= s.y + half - 0.25 &&
                y <= s.y + s.height - half + 0.25,
            );
      if (!inside) {
        out.push(
          `${label}: ink ${(ink.x1 - ink.x0).toFixed(1)} x ${(ink.y1 - ink.y0).toFixed(1)} px in a ${s.width.toFixed(1)} px ${shape.tagName}`,
        );
      }
    }
    return out;
  });
}

async function labelCount(page: Page): Promise<number> {
  return page.locator('[data-layer="players"] text').count();
}

for (const [width, height] of [
  [375, 812],
  [1440, 900],
] as const) {
  test(`${width} px: every position code and initial sits inside its disc`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/dev/directions/floodlit/tactics");
    await expect(page.locator('[data-direction="floodlit"][data-ready="1"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await labelCount(page), "the tactics screen labels 11 discs").toBe(11);
    expect(await labelSpills(page), "tactics, without the ball").toEqual([]);
    await page.getByRole("button", { name: "With the ball" }).click();
    await expect(page.locator('[data-readout="shape"]')).toHaveText("Shape now: 3-2-4-1");
    expect(await labelSpills(page), "tactics, with the ball").toEqual([]);

    await page.goto("/dev/directions/floodlit/data");
    await expect(page.locator('div[data-direction="floodlit"][data-ready="1"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await labelCount(page), "the data screen labels a disc at 0.0 s").toBeGreaterThan(0);
    expect(await labelSpills(page), "data screen at 0.0 s").toEqual([]);

    await page.goto("/dev/pitch?scene=glyph-sheet");
    await page.locator('[data-layer="scene"]').first().waitFor({ state: "attached" });
    await page.evaluate(() => document.fonts.ready);
    expect(await labelCount(page), "the glyph sheet numbers its discs").toBeGreaterThan(0);
    expect(await labelSpills(page), "glyph sheet shirt numbers").toEqual([]);
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
