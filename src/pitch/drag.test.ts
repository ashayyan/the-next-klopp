// Pure drag helpers: run-off clamp, 0.1 m rounding and the pointer-to-position rule.
import { describe, expect, it } from "vitest";
import { clampToRunoff, dragPosition, nudge, nudgePosition, roundTenth } from "./drag.ts";
import { makeView } from "./view.ts";

const PITCH = { length: 105, width: 68 };

describe("clampToRunoff", () => {
  it("leaves a point inside the field alone", () => {
    expect(clampToRunoff({ x: 52.5, y: 34 }, PITCH)).toEqual({ x: 52.5, y: 34 });
  });

  it("allows the exact run-off edge on every side (inclusive)", () => {
    expect(clampToRunoff({ x: -3, y: -3 }, PITCH)).toEqual({ x: -3, y: -3 });
    expect(clampToRunoff({ x: 108, y: 71 }, PITCH)).toEqual({ x: 108, y: 71 });
  });

  it("clamps each corner beyond the run-off", () => {
    expect(clampToRunoff({ x: -50, y: -50 }, PITCH)).toEqual({ x: -3, y: -3 });
    expect(clampToRunoff({ x: 500, y: -50 }, PITCH)).toEqual({ x: 108, y: -3 });
    expect(clampToRunoff({ x: 500, y: 500 }, PITCH)).toEqual({ x: 108, y: 71 });
    expect(clampToRunoff({ x: -50, y: 500 }, PITCH)).toEqual({ x: -3, y: 71 });
  });

  it("clamps one axis at a time", () => {
    expect(clampToRunoff({ x: 109, y: 34 }, PITCH)).toEqual({ x: 108, y: 34 });
    expect(clampToRunoff({ x: 50, y: -4 }, PITCH)).toEqual({ x: 50, y: -3 });
  });

  it("uses a custom run-off and the real pitch size", () => {
    expect(clampToRunoff({ x: 200, y: 200 }, { length: 100, width: 65 }, 2)).toEqual({
      x: 102,
      y: 67,
    });
  });
});

describe("roundTenth", () => {
  it("rounds to one decimal", () => {
    expect(roundTenth({ x: 11.04, y: 34.06 })).toEqual({ x: 11.0, y: 34.1 });
  });

  it("rounds a half up", () => {
    expect(roundTenth({ x: 11.05, y: 0 })).toEqual({ x: 11.1, y: 0 });
  });

  it("never returns negative zero", () => {
    const out = roundTenth({ x: -0.04, y: -0.01 });
    expect(Object.is(out.x, 0)).toBe(true);
    expect(Object.is(out.y, 0)).toBe(true);
  });

  it("keeps negative run-off positions", () => {
    expect(roundTenth({ x: -2.96, y: -3 })).toEqual({ x: -3.0, y: -3 });
  });
});

describe("dragPosition", () => {
  it("keeps the grab offset, then clamps and rounds", () => {
    expect(dragPosition({ x: 30.04, y: 20 }, { x: 1.5, y: -0.5 }, PITCH)).toEqual({
      x: 31.5,
      y: 19.5,
    });
  });

  it("clamps to the run-off", () => {
    expect(dragPosition({ x: 200, y: -20 }, { x: 0, y: 0 }, PITCH)).toEqual({ x: 108, y: -3 });
  });
});

const horizontal = makeView({
  length: 105,
  width: 68,
  runoff: 3,
  orientation: "horizontal",
  cssWidth: 960,
});
const vertical = makeView({
  length: 105,
  width: 68,
  runoff: 3,
  orientation: "vertical",
  cssWidth: 343,
});

describe("nudge in screen directions", () => {
  it("horizontal: right and down are +x and +y", () => {
    expect(nudge(horizontal, "ArrowRight", false)).toEqual({ dx: 1, dy: 0 });
    expect(nudge(horizontal, "ArrowDown", false)).toEqual({ dx: 0, dy: 1 });
    expect(nudge(horizontal, "ArrowLeft", false)).toEqual({ dx: -1, dy: 0 });
    expect(nudge(horizontal, "ArrowUp", false)).toEqual({ dx: 0, dy: -1 });
  });

  it("horizontal: Shift makes the step 5 m", () => {
    expect(nudge(horizontal, "ArrowLeft", true)).toEqual({ dx: -5, dy: 0 });
    expect(nudge(horizontal, "ArrowDown", true)).toEqual({ dx: 0, dy: 5 });
  });

  it("vertical: canonical x runs up the screen, so ArrowUp is +x", () => {
    expect(nudge(vertical, "ArrowUp", false)).toEqual({ dx: 1, dy: 0 });
    expect(nudge(vertical, "ArrowDown", false)).toEqual({ dx: -1, dy: 0 });
  });

  it("vertical: ArrowRight is +y and ArrowLeft is -y", () => {
    expect(nudge(vertical, "ArrowRight", false)).toEqual({ dx: 0, dy: 1 });
    expect(nudge(vertical, "ArrowLeft", true)).toEqual({ dx: 0, dy: -5 });
  });

  it("the step is in metres whatever the zoom", () => {
    const small = makeView({
      length: 105,
      width: 68,
      runoff: 3,
      orientation: "vertical",
      cssWidth: 200,
    });
    expect(nudge(small, "ArrowUp", true)).toEqual({ dx: 5, dy: 0 });
  });
});

describe("nudgePosition", () => {
  const args = { pitch: PITCH, runoff: 3 } as const;

  it("moves, clamps and rounds like a drag", () => {
    expect(nudgePosition({ x: 10.04, y: 20 }, horizontal, "ArrowRight", false, args)).toEqual({
      x: 11,
      y: 20,
    });
    expect(nudgePosition({ x: 107.5, y: 20 }, horizontal, "ArrowRight", false, args)).toEqual({
      x: 108,
      y: 20,
    });
    expect(nudgePosition({ x: 108, y: 20 }, horizontal, "ArrowRight", true, args)).toEqual({
      x: 108,
      y: 20,
    });
  });

  it("clamps in the vertical orientation too", () => {
    expect(nudgePosition({ x: 50, y: 70.5 }, vertical, "ArrowRight", false, args)).toEqual({
      x: 50,
      y: 71,
    });
  });
});
