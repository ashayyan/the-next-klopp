// DSGN-04: the dev component gallery. Width frames are real same-origin iframes at exact CSS widths,
// the theme switcher picks light, dark or both, and a deep link lands on one state
// (04-UI-SPEC "/dev/gallery contract").
import { readFileSync } from "node:fs";
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

test.describe("pitch and interactions", () => {
  test("playback shows three bars and the still scene without one", async ({ page }) => {
    await page.goto("/dev/gallery/playback?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    await expect(page.locator('[role="toolbar"][aria-label="Playback"]')).toHaveCount(3);
    await expect(page.getByText("Still scene — 1 frame")).toBeVisible();
    await expect(
      page.locator('[data-gallery-state="playback/still"] [role="toolbar"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-gallery-state="playback/at-end"]').getByRole("button", {
        name: "Replay sequence",
      }),
    ).toBeVisible();
    await expect(
      page.locator('[data-gallery-state="playback/playing"]').getByRole("button", {
        name: "Pause sequence",
      }),
    ).toBeVisible();
  });

  test("the empty legend explains itself", async ({ page }) => {
    await page.goto("/dev/gallery/legend?bare=1&theme=light");
    await expect(
      page.locator('[data-gallery-state="legend/empty"]').getByText("No marks to explain yet."),
    ).toBeVisible();
  });

  for (const theme of ["light", "dark"]) {
    test(`the glyph sheet draws team B discs, ring and hollow arrowheads in the ${theme} theme`, async ({
      page,
    }) => {
      await page.goto(`/dev/gallery/glyphs?bare=1&theme=${theme}`);
      await expect(page.locator('[data-ready="1"]')).toBeAttached();
      const sheet = page.locator('[data-gallery-state="glyphs/team-b"]');
      const pitch = sheet.locator("[data-pitch]");
      await expect(pitch.locator('[data-glyph="player-b"]').first()).toBeVisible();
      await expect(pitch.locator('[data-glyph="goalkeeper-b"]')).toHaveCount(1);
      // Team B's arrowheads are hollow with a 2 px stroke; team A's are filled.
      const heads = pitch.locator('[data-part="arrowhead"]');
      await expect(heads).not.toHaveCount(0);
      for (const head of await heads.all()) {
        await expect(head).toHaveAttribute("fill", "none");
      }
      const legend = sheet.locator("[data-legend]");
      await expect(legend.locator('[data-legend-entry="player-b"]')).toBeVisible();
      // Team A's sheet carries all the shared marks and the Canvas density layer.
      const a = page.locator('[data-gallery-state="glyphs/team-a"]');
      await expect(a.locator("canvas")).toHaveCount(1);
      await expect(a.locator('[data-legend-entry="density"]')).toBeVisible();
    });
  }

  test("the drag states force the focus ring and the ghost", async ({ page }) => {
    await page.goto("/dev/gallery/drag?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    const focused = page.locator('[data-gallery-state="drag/focused"]');
    await expect(focused.locator('[data-entity="home-8"]')).toHaveAttribute(
      "data-state",
      "focus-visible",
    );
    await expect(focused.locator('[data-entity="home-8"] [data-focus-ring]').first()).toBeVisible();
    await expect(
      page.locator('[data-gallery-state="drag/dragging"] [data-ghost="home-8"]'),
    ).toHaveCount(1);
  });

  test("the converter probe shows idle, a valid conversion and a range error", async ({ page }) => {
    await page.goto("/dev/gallery/converter-probe?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    await expect(
      page.locator('[data-gallery-state="converter-probe/idle"] [data-readout="probe"]'),
    ).toHaveText("Enter provider coordinates to convert");
    await expect(
      page.locator('[data-gallery-state="converter-probe/valid"] [data-readout="probe"]'),
    ).toContainText("Canonical x");
    const error = page.locator('[data-gallery-state="converter-probe/range-error"] .text-danger');
    await expect(error).toBeVisible();
  });
});

test.describe("controls: input", () => {
  const STATES = ["empty", "filled", "focus", "invalid", "disabled", "long-value"];

  for (const theme of ["light", "dark"] as const) {
    test(`input shows every state in the ${theme} theme, and the error is in the danger colour`, async ({
      page,
    }) => {
      await page.goto(`/dev/gallery/input?bare=1&theme=${theme}`);
      await expect(page.locator('[data-ready="1"]')).toBeAttached();
      for (const state of STATES) {
        await expect(page.locator(`[data-gallery-state="input/${state}"]`)).toHaveCount(1);
      }
      const invalid = page.locator('[data-gallery-state="input/invalid"]');
      const message = invalid.getByText("Enter a number from 0 to 100.");
      await expect(message).toBeVisible();
      const [messageColour, danger] = await Promise.all([
        message.evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).color),
        page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.color = "var(--danger)";
          document.body.append(probe);
          const c = getComputedStyle(probe).color;
          probe.remove();
          return c;
        }),
      ]);
      expect(messageColour).toBe(danger);
      const input = invalid.getByRole("textbox", { name: /Pressing intensity/ });
      await expect(input).toHaveAttribute("aria-invalid", "true");
      const describedBy = await input.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      await expect(page.locator(`[id="${describedBy}"]`).first()).toContainText(
        "Enter a number from 0 to 100.",
      );
      await expect(
        page.locator('[data-gallery-state="input/disabled"]').getByRole("textbox").first(),
      ).toBeDisabled();
    });
  }

  test("a very long value never makes the page wider at 375 px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/dev/gallery/input?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    const long = page.locator('[data-gallery-state="input/long-value"]');
    await expect(long.getByRole("textbox").first()).toHaveValue(/Pressing_trigger/);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await long.getByRole("textbox").first().boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(375);
  });
});

test.describe("controls: choices", () => {
  test("clicking a checkbox or radio label changes it, and the radio keeps one checked", async ({
    page,
  }) => {
    await page.goto("/dev/gallery/checkbox-radio-switch?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    const off = page.locator('[data-gallery-state="checkbox-radio-switch/off"]');
    const box = off.getByRole("checkbox", { name: "Show xG on the map" });
    await expect(box).toHaveAttribute("aria-checked", "false");
    await off.getByText("Show xG on the map").click();
    await expect(box).toHaveAttribute("aria-checked", "true");
    await off.getByText("Without the ball").click();
    await expect(off.getByRole("radio", { name: "Without the ball" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(off.getByRole("radio", { name: "With the ball" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("the open select shows its popup inside its own cell with the selected option checked", async ({
    page,
  }) => {
    await page.goto("/dev/gallery/select?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    const cell = page.locator('[data-gallery-state="select/open"]');
    await expect(cell.getByRole("listbox")).toBeVisible();
    await expect(cell.getByRole("option", { name: "4-4-2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("overlays", () => {
  test("the alert dialog opens with Keep board focused, Escape closes it and focus returns to the trigger", async ({
    page,
  }) => {
    await page.goto("/dev/gallery/alert-dialog?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    // The static open state shows the real copy and both buttons in its own cell.
    const open = page.locator('[data-gallery-state="alert-dialog/open"]');
    await expect(open.getByText("Clear this board?")).toBeVisible();
    await expect(open.getByRole("button", { name: "Clear board" })).toBeVisible();
    await expect(open.getByRole("button", { name: "Keep board" })).toBeVisible();

    const trigger = page
      .locator('[data-gallery-state="alert-dialog/interactive"]')
      .getByRole("button", { name: "Clear board" });
    await trigger.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Keep board" })).toBeFocused();
    await page.keyboard.press("Escape");
    // Only the static copy in the "open" cell is left; it is reachable again once the modal is gone.
    await expect(dialog).toHaveCount(1);
    await expect(page.locator(".fixed").getByRole("alertdialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("the dialog traps focus while open and returns it to the trigger on close", async ({
    page,
  }) => {
    await page.goto("/dev/gallery/dialog?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    const trigger = page
      .locator('[data-gallery-state="dialog/interactive"]')
      .getByRole("button", { name: "Open dialog" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Save to your notes?" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      // The focus guards at the popup's edges hand focus back a moment after Tab lands on them.
      await expect
        .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
        .toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(1);
    await expect(trigger).toBeFocused();
  });

  test("the long popover scrolls inside a 60vh box and never widens a 375 px page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/dev/gallery/popover?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    const popup = page.locator('[data-gallery-state="popover/long-text"]').getByRole("dialog");
    await expect(popup).toBeVisible();
    const style = await popup.evaluate((el) => {
      const s = getComputedStyle(el);
      return { overflowY: s.overflowY, maxHeight: Number.parseFloat(s.maxHeight) };
    });
    expect(style.overflowY).toBe("auto");
    expect(Math.round(style.maxHeight)).toBe(Math.round(0.6 * 800));
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBe(widths.client);
    expect(widths.client).toBe(375);
  });

  test("the tooltip and the toast show their text in their own cells", async ({ page }) => {
    await page.goto("/dev/gallery/tooltip?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    await expect(
      page.locator('[data-gallery-state="tooltip/open"]').getByText("Close", { exact: true }),
    ).toBeVisible();
    await page.goto("/dev/gallery/toast?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    const toast = page.locator('[data-gallery-state="toast/saved"]');
    await expect(toast.getByText("Note saved")).toBeVisible();
    // Base UI hides the Dismiss button from the accessibility tree until the toast has focus.
    await expect(toast.getByText("Dismiss", { exact: true })).toBeVisible();
  });
});

// 04-16: the Lesson and Data groups and the full inventory of the 04-UI-SPEC table.
interface InventoryEntry {
  id: string;
  group: string;
  states: string[];
}
const INVENTORY: InventoryEntry[] = JSON.parse(
  readFileSync(new URL("../../src/routes/dev-gallery/inventory.json", import.meta.url), "utf8"),
);

test.describe("lesson and data groups", () => {
  test("the chart legend shows for 2 and 3 series and not for a single series", async ({
    page,
  }) => {
    await page.goto("/dev/gallery/chart-primitives?bare=1&theme=light");
    await expect(page.locator('[data-ready="1"]')).toBeAttached();
    for (const state of ["legend-2-series", "legend-3-series"]) {
      const cell = page.locator(`[data-gallery-state="chart-primitives/${state}"]`);
      await expect(cell.locator('[data-chart="legend"]')).toBeVisible();
      await expect(cell.locator('[data-chart="direct-label"]').first()).toBeVisible();
    }
    await expect(
      page.locator('[data-gallery-state="chart-primitives/legend-3-series"] [data-legend-item]'),
    ).toHaveCount(3);
    for (const state of ["axis-gridlines", "bars", "line-marker", "label-tooltip"]) {
      await expect(
        page.locator(`[data-gallery-state="chart-primitives/${state}"] [data-chart="legend"]`),
      ).toHaveCount(0);
    }
    // Every marker is at least 8 px across.
    for (const marker of await page
      .locator('[data-gallery-state="chart-primitives/line-marker"] [data-chart="marker"]')
      .all()) {
      const box = await marker.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(8);
    }
  });

  test("the table view swaps the chart for a table of the same numbers", async ({ page }) => {
    await page.goto("/dev/gallery/chart-primitives?bare=1&theme=light");
    const cell = page.locator('[data-gallery-state="chart-primitives/table-view"]');
    await expect(cell.getByRole("table")).toBeVisible();
    await cell.getByRole("button", { name: "Chart" }).click();
    await expect(cell.getByRole("table")).toHaveCount(0);
    await expect(cell.locator("svg[role='img']")).toBeVisible();
  });

  test("the empty data table shows the Copywriting Contract copy", async ({ page }) => {
    await page.goto("/dev/gallery/data-table?bare=1&theme=light");
    const cell = page.locator('[data-gallery-state="data-table/empty"]');
    await expect(cell.getByText("No events in this window")).toBeVisible();
    await expect(
      cell.getByText("Widen the time window or pick another match to see events here."),
    ).toBeVisible();
  });

  test("stat card loading and missing states", async ({ page }) => {
    await page.goto("/dev/gallery/stat-card?bare=1&theme=light");
    await expect(
      page.locator('[data-gallery-state="stat-card/loading"] [data-stat-figure]'),
    ).toHaveText(/…/);
    const missing = page.locator('[data-gallery-state="stat-card/missing"]');
    await expect(missing.locator("[data-stat-figure]")).toHaveText(/—/);
    await expect(missing.locator("[data-stat-reason]")).toBeVisible();
  });

  test("quiz feedback carries an icon and words, and the ring is a meter", async ({ page }) => {
    await page.goto("/dev/gallery/quiz-option?bare=1&theme=light");
    const correct = page.locator('[data-gallery-state="quiz-option/correct"] [data-answer]');
    await expect(correct).toContainText("Correct");
    await expect(correct.locator("svg")).toHaveCount(1);
    const wrong = page.locator('[data-gallery-state="quiz-option/incorrect"] [data-answer]');
    await expect(wrong).toContainText("Not quite — here is the answer");
    await expect(wrong.locator("svg")).toHaveCount(1);
    const disabled = page
      .locator('[data-gallery-state="quiz-option/disabled"] [data-quiz-option]')
      .first();
    await expect(disabled).toBeDisabled();
    // WR-07 (04-REVIEW): muted once by colour, not again by the control base's 50 % opacity.
    await expect(disabled).toHaveCSS("opacity", "1");
    await page.goto("/dev/gallery/progress-ring?bare=1&theme=light");
    const ring = page.locator('[data-gallery-state="progress-ring/40-percent"] [role="meter"]');
    await expect(ring).toHaveAttribute("aria-valuenow", "4");
    await expect(ring).toHaveAttribute("aria-valuemax", "10");
    await expect(ring).toContainText("4 of 10 concepts");
  });

  test("the badge has neutral, done and new and no lost-streak state", async ({ page }) => {
    await page.goto("/dev/gallery/badge?bare=1&theme=light");
    for (const kind of ["neutral", "done", "new"]) {
      await expect(page.locator(`[data-badge="${kind}"]`)).toHaveCount(1);
    }
    await expect(page.getByText(/streak|lost|missed/i)).toHaveCount(0);
  });

  for (const entry of INVENTORY) {
    test(`every state of ${entry.id} is on its bare page`, async ({ page }) => {
      await page.goto(`/dev/gallery/${entry.id}?bare=1&theme=light`);
      await expect(page.locator('[data-ready="1"]')).toBeAttached();
      for (const state of entry.states) {
        await expect(page.locator(`[data-gallery-state="${entry.id}/${state}"]`)).toHaveCount(1);
      }
    });
  }
});
