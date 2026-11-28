// Interaction drivers and the oracle contract (RESEARCH Pattern 6). An oracle completes one
// interaction twice: once with the pointer and once with the keyboard only. The keyboard driver has
// no click, so a keyboard pass cannot cheat; `tabTo` proves the target is reachable with Tab.
import type { Locator, Page } from "@playwright/test";

export interface PointerDriver {
  kind: "pointer";
  page: Page;
}

type Key = "Enter" | "Space" | "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Shift+Tab";

export interface KeyboardDriver {
  kind: "keyboard";
  /** Presses Tab until `target` is `document.activeElement`; fails after `max` presses (default 60). */
  tabTo(target: Locator, max?: number): Promise<void>;
  press(key: Key): Promise<void>;
  type(text: string): Promise<void>;
  /** Read-only queries; there is deliberately no `click`. */
  read: Pick<Page, "getByRole" | "getByText" | "locator">;
}

/** The answer key of one quiz item, from the manifest. */
export type QuizKey = { id: string; answer: string; answerLabel: string };

export interface Oracle<P> {
  complete(d: PointerDriver | KeyboardDriver, props: P, ctx: { quiz: QuizKey[] }): Promise<void>;
  assertDone(page: Page, props: P): Promise<void>;
}

export function pointerDriver(page: Page): PointerDriver {
  return { kind: "pointer", page };
}

export function keyboardDriver(page: Page): KeyboardDriver {
  const isFocused = (target: Locator) =>
    target.evaluate((el) => el === document.activeElement).catch(() => false);
  return {
    kind: "keyboard",
    async tabTo(target, max = 60) {
      for (let i = 0; i < max; i += 1) {
        if (await isFocused(target)) return;
        await page.keyboard.press("Tab");
      }
      if (!(await isFocused(target))) {
        throw new Error(`keyboard: target not reached with Tab after ${max} presses`);
      }
    },
    async press(key) {
      await page.keyboard.press(key);
    },
    async type(text) {
      await page.keyboard.type(text);
    },
    read: {
      getByRole: page.getByRole.bind(page),
      getByText: page.getByText.bind(page),
      locator: page.locator.bind(page),
    },
  };
}
