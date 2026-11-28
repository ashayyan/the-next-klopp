// DSGN-03: change a token, regenerate with the real generator, and both the app background and a
// pitch disc change in a real browser. Nothing is written to the repo: the generated CSS is read
// into memory and injected after the page loads, where it wins the cascade (same specificity, later).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  extractTokensBlock,
  generateSystemCss,
  parseTokens,
  SYSTEM_INPUT,
} from "../../scripts/design/tokens.ts";

const NEW_TEAM_A = "#9E2A2B";
const NEW_PAGE = "#FBF3E4";

function modifiedSystemCss(): string {
  const file = resolve(process.cwd(), SYSTEM_INPUT);
  const text = readFileSync(file, "utf8");
  const json = JSON.parse(SYSTEM_INPUT.endsWith(".md") ? extractTokensBlock(text) : text);
  json.pitch.light["team-a"].$value = NEW_TEAM_A;
  json.color.light["surface-page"].$value = NEW_PAGE;
  return generateSystemCss(parseTokens(json, SYSTEM_INPUT), SYSTEM_INPUT);
}

test.use({ colorScheme: "light" });

test("a regenerated token changes the app background and a pitch disc", async ({ page }) => {
  await page.goto("/dev/pitch?scene=glyph-sheet");
  const disc = page.locator('[data-glyph="player-a"] circle').first();
  await disc.waitFor({ state: "attached" });

  const read = () =>
    page.evaluate(() => {
      const circle = document.querySelector('[data-glyph="player-a"] circle');
      return {
        fill: circle ? getComputedStyle(circle).fill : null,
        background: getComputedStyle(document.body).backgroundColor,
      };
    });

  const before = await read();
  expect(before.fill).not.toBeNull();

  await page.addStyleTag({ content: modifiedSystemCss() });

  const after = await read();
  expect(after.fill).toBe("rgb(158, 42, 43)");
  expect(after.background).toBe("rgb(251, 243, 228)");
  expect(after.fill).not.toBe(before.fill);
  expect(after.background).not.toBe(before.background);
});
