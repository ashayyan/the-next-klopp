// App theme in a real browser (04-UI-SPEC UI Considerations "Theme"): with no stored choice the
// page follows prefers-color-scheme; a stored light or dark wins and is applied by the inline
// script in index.html before any app script runs; a blocked localStorage falls back to the system
// scheme without an error. Expected colours come from the DESIGN.md tokens block.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { extractTokensBlock, parseTokens, SYSTEM_INPUT } from "../../scripts/design/tokens.ts";

const doc = parseTokens(
  JSON.parse(extractTokensBlock(readFileSync(resolve(process.cwd(), SYSTEM_INPUT), "utf8"))),
  SYSTEM_INPUT,
);

/** "#0E151D" to the computed-style form "rgb(14, 21, 29)". */
function rgb(hex: string): string {
  const n = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
  return `rgb(${n(1)}, ${n(3)}, ${n(5)})`;
}

const PAGE = {
  light: rgb(doc.resolved.light.color["surface-page"] as string),
  dark: rgb(doc.resolved.dark.color["surface-page"] as string),
};
const FIELD = {
  light: rgb(doc.resolved.light.pitch["pitch-surface"] as string),
  dark: rgb(doc.resolved.dark.pitch["pitch-surface"] as string),
};

const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const htmlTheme = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute("data-theme"));

function storeTheme(page: Page, value: string) {
  return page.addInitScript((v) => {
    window.localStorage.setItem("tnk:theme", v);
  }, value);
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

test.describe("system scheme dark", () => {
  test.use({ colorScheme: "dark" });

  test("no stored choice: no data-theme and the dark page colour", async ({ page }) => {
    await page.goto("/");
    await page.locator("h1").waitFor();
    expect(await htmlTheme(page)).toBeNull();
    expect(await bodyBackground(page)).toBe(PAGE.dark);
  });

  test("stored light: data-theme is set before any app script runs", async ({ page }) => {
    await storeTheme(page, "light");
    // Block the app entry: only the inline script in index.html can set the attribute.
    await page.route("**/src/main.tsx", (route) => route.abort());
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(await htmlTheme(page)).toBe("light");
  });

  test("stored light: the light page colour wins over the dark system scheme", async ({ page }) => {
    await storeTheme(page, "light");
    await page.goto("/");
    await page.locator("h1").waitFor();
    expect(await htmlTheme(page)).toBe("light");
    expect(await bodyBackground(page)).toBe(PAGE.light);
  });

  test("an unknown stored value is ignored", async ({ page }) => {
    await storeTheme(page, "sepia");
    await page.goto("/");
    await page.locator("h1").waitFor();
    expect(await htmlTheme(page)).toBeNull();
    expect(await bodyBackground(page)).toBe(PAGE.dark);
  });

  // CR-01 (04-REVIEW): the direction screen marks only its own subtree and <body> light; <html>
  // stays dark from the OS scheme, so the light set must come from [data-theme="light"] itself.
  test("a light subtree wins under a dark root: ?theme=light on a direction screen", async ({
    page,
  }) => {
    await page.goto("/dev/directions/floodlit/tactics?theme=light");
    const scope = page.locator('[data-direction="floodlit"][data-ready="1"]');
    await expect(scope).toBeVisible();
    expect(await scope.getAttribute("data-theme")).toBe("light");
    const surface = await scope.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--surface-page").trim(),
    );
    expect(surface.toUpperCase()).toBe(
      (doc.resolved.light.color["surface-page"] as string).toUpperCase(),
    );
    expect(await bodyBackground(page)).toBe(PAGE.light);
  });

  // IN-01 (04-REVIEW): leaving a single-theme gallery page restores the stored choice on <html>.
  test("leaving a gallery page in-app restores the stored theme on html", async ({ page }) => {
    await storeTheme(page, "light");
    await page.goto("/dev/gallery/button?bare=1&theme=dark");
    await expect(page.locator('main[data-ready="1"]')).toBeAttached();
    expect(await htmlTheme(page)).toBe("dark");
    await page.evaluate(() => {
      window.history.pushState({}, "", "/dev");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect(page.getByRole("heading", { name: "Dev", exact: true })).toBeVisible();
    expect(await htmlTheme(page)).toBe("light");
    expect(await bodyBackground(page)).toBe(PAGE.light);
  });

  test("a throwing localStorage loads with no error and follows the system", async ({ page }) => {
    const errors = collectErrors(page);
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      };
    });
    await page.goto("/");
    await page.locator("h1").waitFor();
    expect(await htmlTheme(page)).toBeNull();
    expect(await bodyBackground(page)).toBe(PAGE.dark);
    expect(errors).toEqual([]);
  });
});

test.describe("system scheme light", () => {
  test.use({ colorScheme: "light" });

  test("the pitch follows a stored dark choice on /dev/pitch", async ({ page }) => {
    await storeTheme(page, "dark");
    await page.goto("/dev/pitch");
    const field = page.locator('[data-layer="field"]').first();
    await field.waitFor({ state: "attached" });
    expect(await htmlTheme(page)).toBe("dark");
    expect(await field.evaluate((el) => getComputedStyle(el).fill)).toBe(FIELD.dark);
    expect(await bodyBackground(page)).toBe(PAGE.dark);
  });

  test("the pitch follows the light system scheme with no stored choice", async ({ page }) => {
    await page.goto("/dev/pitch");
    const field = page.locator('[data-layer="field"]').first();
    await field.waitFor({ state: "attached" });
    expect(await field.evaluate((el) => getComputedStyle(el).fill)).toBe(FIELD.light);
  });
});
