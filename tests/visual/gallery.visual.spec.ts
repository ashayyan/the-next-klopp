// DSGN-04: Linux visual baselines of every gallery primitive, one screenshot per primitive x theme x
// width of `/dev/gallery/<id>?bare=1&theme=<t>`. The tests run only when CI is set (the Playwright
// Linux image); a local Windows run skips them and writes nothing. Baselines are written only by the
// manual update-snapshots workflow (CI=true and UPDATE_BASELINES=1; see playwright.config.ts) and are
// named `<id>-<theme>-<width>-linux.png` under tests/visual/__baselines__/.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

interface InventoryEntry {
  id: string;
  group: string;
  states: string[];
}

const INVENTORY: InventoryEntry[] = JSON.parse(
  readFileSync(new URL("../../src/routes/dev-gallery/inventory.json", import.meta.url), "utf8"),
);

const THEMES = ["light", "dark"] as const;
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;

for (const entry of INVENTORY) {
  for (const theme of THEMES) {
    for (const { width, height } of VIEWPORTS) {
      test(`${entry.id} ${theme} ${width} @visual`, async ({ page }) => {
        test.skip(!process.env.CI, "Visual baselines are generated on Linux CI only");
        await page.setViewportSize({ width, height });
        await page.goto(`/dev/gallery/${entry.id}?bare=1&theme=${theme}`);
        await page.waitForSelector('[data-ready="1"]', { state: "attached" });
        await page.evaluate(() => document.fonts.ready);
        const fonts = await page.evaluate(() => ({
          display: document.fonts.check('16px "Mona Sans"'),
          mono: document.fonts.check('16px "Geist Mono"'),
        }));
        expect(fonts, "the display and mono families must be loaded before a screenshot").toEqual({
          display: true,
          mono: true,
        });
        // A stable focus state: nothing focused, no pointer hover, charts measured and settled.
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
        await page.mouse.move(0, 0);
        await page.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
        );
        await expect(page).toHaveScreenshot(`${entry.id}-${theme}-${width}.png`, {
          fullPage: true,
        });
      });
    }
  }
}
