// DSGN-04: the dev component gallery. Width frames are real same-origin iframes at exact CSS widths,
// the theme switcher picks light, dark or both, and a deep link lands on one state
// (04-UI-SPEC "/dev/gallery contract").
import { expect, type Frame, type Page, test } from "@playwright/test";

const BUTTON_STATES = ["default", "hover", "focus-visible", "pressed", "disabled", "loading"];
const VARIANTS = ["primary", "quiet", "icon"];

async function frameOf(page: Page, index = 0): Promise<Frame> {
  const handle = await page.locator("iframe").nth(index).elementHandle();
  const frame = await handle?.contentFrame();
  if (!frame) throw new Error(`no frame at index ${index}`);
  await frame.waitForSelector('[data-ready="1"]');
  return frame;
}

test.describe("width and theme frames", () => {
  test("?w=375 shows one iframe exactly 375 px wide whose media queries use the 375 layout", async ({
    page,
  }) => {
    await page.goto("/dev/gallery/button?w=375&theme=light");
    await expect(page.locator("iframe")).toHaveCount(1);
    const width = await page
      .locator("iframe")
      .evaluate((el) => (el as HTMLIFrameElement).clientWidth);
    expect(width).toBe(375);
    const frame = await frameOf(page);
    expect(await frame.evaluate(() => matchMedia("(min-width: 768px)").matches)).toBe(false);
    expect(await frame.evaluate(() => innerWidth)).toBe(375);
  });

  test("?w=all shows frames 375, 768 and 1440 px wide, each with its label", async ({ page }) => {
    await page.goto("/dev/gallery/button?w=all&theme=light");
    await expect(page.locator("iframe")).toHaveCount(3);
    const widths = await page
      .locator("iframe")
      .evaluateAll((els) => els.map((el) => (el as HTMLIFrameElement).clientWidth));
    expect(widths).toEqual([375, 768, 1440]);
    for (const label of ["375 px", "768 px", "1440 px"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    const frame = await frameOf(page, 2);
    expect(await frame.evaluate(() => matchMedia("(min-width: 768px)").matches)).toBe(true);
  });

  test("the default shows all three widths in both themes", async ({ page }) => {
    await page.goto("/dev/gallery/button");
    await expect(page.locator("iframe")).toHaveCount(6);
  });

  test("a 1440 frame does not widen the page", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/dev/gallery/button?w=1440&theme=light");
    await expect(page.locator("iframe")).toHaveCount(1);
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(scrolls).toBe(false);
  });

  test("the Width and Theme switchers rewrite the query", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/gallery/button");
    await page.getByRole("group", { name: "Width" }).getByRole("button", { name: "768" }).click();
    await expect(page).toHaveURL(/w=768/);
    await expect(page.locator("iframe")).toHaveCount(2);
    await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" }).click();
    await expect(page).toHaveURL(/theme=dark/);
    await expect(page.locator("iframe")).toHaveCount(1);
  });

  test("a deep link opens the dark 375 frame scrolled to the disabled state", async ({ page }) => {
    await page.goto("/dev/gallery/button?w=375&theme=dark#state-disabled");
    await expect(page.locator("iframe")).toHaveCount(1);
    const src = await page.locator("iframe").getAttribute("src");
    expect(src).toContain("theme=dark");
    expect(src).toContain("bare=1");
    expect(src).toContain("#state-disabled");
    const frame = await frameOf(page);
    await expect(frame.locator('[data-theme="dark"]').first()).toBeAttached();
    expect(await frame.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    await expect(frame.locator("#state-disabled")).toBeInViewport();
  });
});

test.describe("bare state matrix", () => {
  test("lists every button state for each variant", async ({ page }) => {
    await page.goto("/dev/gallery/button?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    for (const state of BUTTON_STATES) {
      const cell = page.locator(`[data-gallery-state="button/${state}"]`);
      await expect(cell).toHaveCount(1);
      await expect(page.locator(`#state-${state}`)).toHaveCount(1);
      for (const variant of VARIANTS) {
        await expect(cell.locator(`[data-variant="${variant}"]`)).toHaveCount(1);
      }
    }
  });

  test("forced states reach the buttons and loading keeps the label", async ({ page }) => {
    await page.goto("/dev/gallery/button?bare=1&theme=light");
    const hover = page.locator('[data-gallery-state="button/hover"] [data-variant="primary"]');
    await expect(hover).toHaveAttribute("data-state", "hover");
    const loading = page.locator('[data-gallery-state="button/loading"] [data-variant="primary"]');
    await expect(loading).toHaveAttribute("aria-busy", "true");
    await expect(loading).toContainText("Continue");
    const disabled = page.locator(
      '[data-gallery-state="button/disabled"] [data-variant="primary"]',
    );
    await expect(disabled).toBeDisabled();
  });

  test("theme=both renders both themes in one page", async ({ page }) => {
    await page.goto("/dev/gallery/button?bare=1&theme=both");
    await expect(page.locator("[data-gallery-theme]")).toHaveCount(2);
    await expect(page.locator('[data-gallery-state="button/hover"]')).toHaveCount(2);
  });
});

test.describe("index, fallbacks and foundations", () => {
  test("/dev links the gallery and the index lists the primitives by group", async ({ page }) => {
    await page.goto("/dev");
    await page.getByRole("link", { name: "Component gallery" }).click();
    await expect(page).toHaveURL(/\/dev\/gallery$/);
    await expect(page.getByRole("heading", { level: 1, name: "Component gallery" })).toBeVisible();
    await expect(
      page.getByText(
        "Every primitive and interaction, with its states, at 375, 768 and 1440 px. Dev only.",
      ),
    ).toBeVisible();
    for (const group of ["Foundations", "Controls"]) {
      await expect(page.getByRole("heading", { name: group })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Colour" })).toBeVisible();
  });

  test("an unknown primitive and an unknown state explain themselves", async ({ page }) => {
    await page.goto("/dev/gallery/nope");
    await expect(
      page.getByRole("heading", { name: "No primitive called “nope”. Pick one from the list." }),
    ).toBeVisible();
    await page.goto("/dev/gallery/button?w=375&theme=light#state-nope");
    await expect(
      page.getByText("No state called “nope” for Button. Showing all states."),
    ).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(1);
  });

  test("the primitive picker is a native select below 1280 px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/dev/gallery/button?w=375&theme=light");
    const select = page.getByLabel("Primitive", { exact: true });
    await expect(select).toBeVisible();
    await select.selectOption("colour");
    await expect(page).toHaveURL(/\/dev\/gallery\/colour/);
  });

  test("the colour demo shows every token with its hex and a contrast ratio", async ({ page }) => {
    await page.goto("/dev/gallery/colour?bare=1&theme=dark");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    const row = page.locator('[data-gallery-state="colour/color"] tr[data-token="surface-page"]');
    await expect(row).toContainText("#");
    await expect(row).toContainText("1.0:1");
    await expect(page.locator('[data-gallery-state="colour/pitch"] tr[data-token]')).toHaveCount(
      17,
    );
    await expect(page.locator('[data-gallery-state="colour/data"] tr[data-token]')).toHaveCount(12);
  });

  test("the motion demo is paused at progress 0 and follows the scrubber", async ({ page }) => {
    await page.goto("/dev/gallery/motion?bare=1&theme=light");
    const ui = page.locator('[data-gallery-state="motion/ui"]');
    await expect(ui).toContainText("time 0.00, eased 0.00");
    await ui.getByLabel("Progress").fill("1");
    await expect(ui).toContainText("time 1.00, eased 1.00");
    await expect(page.locator('[data-gallery-state="motion/reduced-motion"]')).toContainText(
      "Reduced motion: 0 ms",
    );
  });
});
