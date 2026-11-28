import { describe, expect, it } from "vitest";
import {
  applyMatrix,
  autoOrientation,
  canonicalToScreen,
  canvasMatrix,
  invertMatrix,
  makeView,
  type Orientation,
  screenToCanonical,
  sizeInMetres,
} from "./view.ts";

/** Small seeded PRNG (mulberry32) so the random round-trip points are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const base = { length: 105, width: 68, runoff: 3, cssWidth: 960 } as const;

describe("makeView", () => {
  it("horizontal: run-off viewBox, no group transform, uniform scale", () => {
    const v = makeView({ ...base, orientation: "horizontal" });
    const s = 960 / 111;
    expect(v.viewBox).toBe("-3 -3 111 74");
    expect(v.vbWidth).toBe(111);
    expect(v.vbHeight).toBe(74);
    expect(v.groupTransform).toBeUndefined();
    expect(v.pxPerMetre).toBeCloseTo(s, 12);
    expect(v.cssHeight).toBeCloseTo(s * 74, 9);
    const [a, b, c, d, e, f] = v.cssMatrix;
    expect([b, c]).toEqual([0, 0]);
    expect(a).toBeCloseTo(s, 12);
    expect(d).toBeCloseTo(s, 12);
    expect(e).toBeCloseTo(s * 3, 12);
    expect(f).toBeCloseTo(s * 3, 12);
  });

  it("vertical: swapped viewBox and the rotate group matrix", () => {
    const v = makeView({ ...base, orientation: "vertical" });
    const s = 960 / 74;
    expect(v.viewBox).toBe("-3 -3 74 111");
    expect(v.groupTransform).toBe("matrix(0 -1 1 0 0 105)");
    expect(v.pxPerMetre).toBeCloseTo(s, 12);
    const [a, b, c, d, e, f] = v.cssMatrix;
    expect(a).toBe(0);
    expect(d).toBe(0);
    expect(b).toBeCloseTo(-s, 12);
    expect(c).toBeCloseTo(s, 12);
    expect(e).toBeCloseTo(s * 3, 12);
    expect(f).toBeCloseTo(s * 108, 12);
  });
});

describe("matrix helpers", () => {
  it("invertMatrix undoes applyMatrix", () => {
    const m = [2, 0.5, -1, 3, 7, -4] as const;
    const p = applyMatrix(invertMatrix(m), applyMatrix(m, { x: 1.25, y: -8 }));
    expect(p.x).toBeCloseTo(1.25, 12);
    expect(p.y).toBeCloseTo(-8, 12);
  });
});

describe("screen and canonical round trip", () => {
  for (const orientation of ["horizontal", "vertical"] as Orientation[]) {
    it(`returns 200 seeded random points within 1e-9 (${orientation})`, () => {
      const rand = mulberry32(20261128);
      const v = makeView({ ...base, orientation, cssWidth: 343 + rand() * 1000 });
      for (let i = 0; i < 200; i++) {
        const p = { x: -3 + rand() * 111, y: -3 + rand() * 74 };
        const s = canonicalToScreen(v, p);
        const back = screenToCanonical(v, s.x, s.y);
        expect(Math.abs(back.x - p.x)).toBeLessThan(1e-9);
        expect(Math.abs(back.y - p.y)).toBeLessThan(1e-9);
      }
    });

    it(`reads the left penalty mark as x 11.00, y 34.00 (${orientation})`, () => {
      const v = makeView({ ...base, orientation });
      const s = canonicalToScreen(v, { x: 11, y: 34 });
      const p = screenToCanonical(v, s.x, s.y);
      expect(p.x.toFixed(2)).toBe("11.00");
      expect(p.y.toFixed(2)).toBe("34.00");
    });
  }

  it("vertical: canonical x runs up the screen (attack ltr goes up)", () => {
    const v = makeView({ ...base, orientation: "vertical" });
    const ownGoal = canonicalToScreen(v, { x: 0, y: 34 });
    const otherGoal = canonicalToScreen(v, { x: 105, y: 34 });
    expect(ownGoal.y).toBeGreaterThan(otherGoal.y);
    expect(ownGoal.x).toBeCloseTo(otherGoal.x, 9);
  });

  it("horizontal: the field's top-left corner sits one run-off in from the container", () => {
    const v = makeView({ ...base, orientation: "horizontal" });
    const corner = canonicalToScreen(v, { x: 0, y: 0 });
    expect(corner.x).toBeCloseTo(3 * v.pxPerMetre, 9);
    expect(corner.y).toBeCloseTo(3 * v.pxPerMetre, 9);
  });
});

describe("canvasMatrix", () => {
  it("scales every entry of the CSS matrix by devicePixelRatio", () => {
    for (const orientation of ["horizontal", "vertical"] as Orientation[]) {
      const v = makeView({ ...base, orientation });
      expect(canvasMatrix(v, 2)).toEqual(v.cssMatrix.map((n) => n * 2));
      expect(canvasMatrix(v, 1)).toEqual([...v.cssMatrix]);
    }
  });
});

describe("sizeInMetres", () => {
  it("clamps a 2 m disc to 20 px on a small pitch", () => {
    const pxPerMetre = 3; // 2 m = 6 px, below the 20 px floor
    expect(sizeInMetres(20, 2.0, 28, pxPerMetre) * pxPerMetre).toBeCloseTo(20, 12);
  });

  it("clamps a 2 m disc to 28 px on a large pitch", () => {
    const pxPerMetre = 30; // 2 m = 60 px, above the 28 px ceiling
    expect(sizeInMetres(20, 2.0, 28, pxPerMetre) * pxPerMetre).toBeCloseTo(28, 12);
  });

  it("keeps the true size in between", () => {
    expect(sizeInMetres(20, 2.0, 28, 12)).toBeCloseTo(2, 12);
  });
});

describe("autoOrientation", () => {
  it("is vertical below 480 px and horizontal from 480 px", () => {
    expect(autoOrientation(479)).toBe("vertical");
    expect(autoOrientation(480)).toBe("horizontal");
    expect(autoOrientation(343)).toBe("vertical");
  });
});
