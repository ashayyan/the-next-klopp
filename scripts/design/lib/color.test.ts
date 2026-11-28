import { describe, expect, it } from "vitest";
import {
  composite,
  contrast,
  deltaE,
  hexToLin,
  hueDistance,
  luminance,
  MACHADO,
  oklab,
  oklch,
  parseCssColor,
  toHex,
} from "./color.ts";

describe("WCAG contrast", () => {
  it("is 21 for black on white", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("is 4.54 for #767676 on white, the AA boundary grey", () => {
    expect(contrast("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });

  it("is symmetric and 1 for equal colours", () => {
    expect(contrast("#3A97DA", "#182431")).toBeCloseTo(contrast("#182431", "#3A97DA"), 9);
    expect(contrast("#3A97DA", "#3A97DA")).toBe(1);
  });

  it("reads luminance of white as 1 and ignores a trailing alpha pair", () => {
    expect(luminance("#FFFFFF")).toBeCloseTo(1, 9);
    expect(hexToLin("#E8EDF159")).toEqual(hexToLin("#E8EDF1"));
    expect(() => hexToLin("#12345")).toThrow(/not a hex colour/);
  });
});

describe("OKLab and colour-vision simulation", () => {
  it("has zero distance between equal colours, plain or simulated", () => {
    for (const kind of [undefined, "protan", "deutan", "tritan"] as const) {
      expect(deltaE("#0072B2", "#0072B2", kind)).toBe(0);
    }
  });

  it("keeps the Machado matrices at the published values (rows sum to about 1)", () => {
    for (const rows of Object.values(MACHADO)) {
      for (const row of rows) expect(row.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 1);
    }
  });

  it("measures hue distance around the circle", () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(90, 270)).toBe(180);
  });

  it("gives white OKLCH lightness 1 and zero chroma", () => {
    const { L, C } = oklch("#FFFFFF");
    expect(L).toBeCloseTo(1, 3);
    expect(C).toBeLessThan(0.001);
  });

  it("gives a sensible normal-vision distance for the floodlit light teams", () => {
    expect(deltaE("#0072B2", "#D55E00")).toBeCloseTo(31.2, 0);
  });
});

describe("parseCssColor", () => {
  const near = (c: { r: number; g: number; b: number } | null, r: number, g: number, b: number) => {
    expect(c).not.toBeNull();
    expect(Math.abs((c?.r ?? 0) - r)).toBeLessThanOrEqual(1);
    expect(Math.abs((c?.g ?? 0) - g)).toBeLessThanOrEqual(1);
    expect(Math.abs((c?.b ?? 0) - b)).toBeLessThanOrEqual(1);
  };

  it("reads comma and space rgb syntax", () => {
    near(parseCssColor("rgb(14, 21, 29)"), 14, 21, 29);
    near(parseCssColor("rgb(14 21 29)"), 14, 21, 29);
    expect(parseCssColor("rgb(14 21 29 / 0.5)")?.a).toBe(0.5);
    expect(parseCssColor("rgba(14, 21, 29, 0.25)")?.a).toBe(0.25);
    expect(parseCssColor("rgb(14 21 29 / 50%)")?.a).toBe(0.5);
  });

  it("reads color(srgb ...) and hex with alpha", () => {
    near(parseCssColor("color(srgb 0.0549 0.0824 0.1137)"), 14, 21, 29);
    const c = parseCssColor("#0E151DCC");
    near(c, 14, 21, 29);
    expect(c?.a).toBeCloseTo(0.8, 2);
    near(parseCssColor("#0E1"), 0, 238, 17);
  });

  it("reads oklab() and oklch() to the same channels", () => {
    const base = parseCssColor("#0E151D");
    const [L, a, b] = oklab(hexToLin("#0E151D"));
    const viaLab = parseCssColor(`oklab(${L} ${a} ${b})`);
    near(viaLab, base?.r ?? 0, base?.g ?? 0, base?.b ?? 0);
    const C = Math.hypot(a, b);
    const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
    const viaLch = parseCssColor(`oklch(${L} ${C} ${h})`);
    near(viaLch, base?.r ?? 0, base?.g ?? 0, base?.b ?? 0);
  });

  it("returns null for names, empty and unknown functions", () => {
    expect(parseCssColor("transparent")).toBeNull();
    expect(parseCssColor("color-mix(in oklab, red, blue)")).toBeNull();
    expect(parseCssColor("")).toBeNull();
    expect(parseCssColor("rgb(1 2)")).toBeNull();
  });
});

describe("composite and toHex", () => {
  it("lays a half-transparent white over black as mid grey", () => {
    const c = composite({ r: 255, g: 255, b: 255, a: 0.5 }, { r: 0, g: 0, b: 0, a: 1 });
    expect(c.a).toBe(1);
    expect(toHex(c)).toBe("#808080");
  });

  it("returns the top colour when it is opaque", () => {
    expect(toHex(composite({ r: 10, g: 20, b: 30, a: 1 }, { r: 200, g: 200, b: 200, a: 1 }))).toBe(
      "#0A141E",
    );
  });
});
