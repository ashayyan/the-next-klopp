import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Scene, sceneSchema } from "../schema.ts";
import { handleTransportKey, type KeyTarget } from "./keys.ts";
import { createPlaybackStore } from "./store.ts";

const authored: Scene = sceneSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "src", "scene", "fixtures", "authored.json"), "utf8"),
  ),
); // keyframes at 0, 2 and 4 s

const stage: KeyTarget = { tagName: "SECTION" };

function press(
  store: ReturnType<typeof createPlaybackStore>,
  key: string,
  extra: { shiftKey?: boolean; target?: KeyTarget | null; ctrlKey?: boolean } = {},
): boolean {
  return handleTransportKey(
    {
      key,
      shiftKey: extra.shiftKey ?? false,
      ctrlKey: extra.ctrlKey,
      target: extra.target ?? stage,
    },
    store,
  );
}

describe("transport keys", () => {
  it("Space and K toggle play and pause", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    expect(press(store, " ")).toBe(true);
    expect(store.getState().playing).toBe(true);
    expect(press(store, "k")).toBe(true);
    expect(store.getState().playing).toBe(false);
    expect(press(store, "K")).toBe(true);
    expect(store.getState().playing).toBe(true);
  });

  it("arrows step one keyframe and Shift + arrows jump one second", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    press(store, "ArrowRight");
    expect(store.getState().t).toBe(2);
    press(store, "ArrowRight", { shiftKey: true });
    expect(store.getState().t).toBe(3);
    press(store, "ArrowLeft", { shiftKey: true });
    expect(store.getState().t).toBe(2);
    press(store, "ArrowLeft");
    expect(store.getState().t).toBe(0);
  });

  it("Home and End go to the first and last frame", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    press(store, "End");
    expect(store.getState().t).toBe(4);
    press(store, "Home");
    expect(store.getState().t).toBe(0);
  });

  it("leaves a focused button's own Space behaviour alone", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    expect(press(store, " ", { target: { tagName: "BUTTON" } })).toBe(false);
    expect(store.getState().playing).toBe(false);
  });

  it("ignores keys aimed at form controls and at draggable players", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    for (const tagName of ["INPUT", "SELECT", "TEXTAREA"]) {
      expect(press(store, "ArrowRight", { target: { tagName } })).toBe(false);
    }
    expect(press(store, "ArrowRight", { target: { isContentEditable: true } })).toBe(false);
    const draggable: KeyTarget = {
      tagName: "g",
      closest: (s) => (s === "[data-draggable]" ? {} : null),
    };
    expect(press(store, "ArrowRight", { target: draggable })).toBe(false);
    expect(store.getState().t).toBe(0);
  });

  it("ignores other keys and keys with a modifier", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    expect(press(store, "a")).toBe(false);
    expect(press(store, "ArrowRight", { ctrlKey: true })).toBe(false);
    expect(store.getState().t).toBe(0);
  });
});
