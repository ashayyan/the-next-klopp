// Converter probe: provider text inputs to canonical metres with exact range errors, and the
// provider-landmarks overlay built from the parity fixture (PITCH-02 visible in the app).
import { describe, expect, it } from "vitest";
import { landmarkMarks, PROBE_PROVIDERS, probeConvert } from "./probe.ts";

const PITCH = { length: 105, width: 68 };

function point(provider: (typeof PROBE_PROVIDERS)[number]["id"], x: string, y: string) {
  const result = probeConvert(provider, x, y, PITCH);
  if (!result.ok) throw new Error(`expected ok, got ${result.message}`);
  return result.point;
}

describe("PROBE_PROVIDERS", () => {
  it("lists the four providers with their labels, in order", () => {
    expect(PROBE_PROVIDERS.map((p) => p.label)).toEqual([
      "StatsBomb (120 × 80)",
      "Opta (0–100)",
      "Wyscout (0–100)",
      "Tracking (metres, centre origin)",
    ]);
  });
});

describe("probeConvert range errors", () => {
  it("rejects StatsBomb x 130 with the exact copy and the field", () => {
    expect(probeConvert("statsbomb", "130", "40", PITCH)).toEqual({
      ok: false,
      field: "x",
      message: "x must be between 0 and 120 for StatsBomb (120 × 80).",
    });
  });

  it("rejects y outside the range with the same pattern", () => {
    expect(probeConvert("statsbomb", "60", "81", PITCH)).toEqual({
      ok: false,
      field: "y",
      message: "y must be between 0 and 80 for StatsBomb (120 × 80).",
    });
  });

  it("states negative tracking bounds in metres", () => {
    const result = probeConvert("tracking-metres", "-60", "0", PITCH);
    expect(result).toEqual({
      ok: false,
      field: "x",
      message: "x must be between -52.5 and 52.5 for Tracking (metres, centre origin).",
    });
  });

  it("accepts the exact edges", () => {
    expect(probeConvert("statsbomb", "0", "80", PITCH).ok).toBe(true);
    expect(probeConvert("opta", "100", "0", PITCH).ok).toBe(true);
  });
});

describe("probeConvert input handling", () => {
  it("rejects non-numeric text with a number message", () => {
    expect(probeConvert("opta", "abc", "50", PITCH)).toEqual({
      ok: false,
      field: "x",
      message: "x must be a number.",
    });
    expect(probeConvert("opta", "50", "1e2x", PITCH)).toEqual({
      ok: false,
      field: "y",
      message: "y must be a number.",
    });
  });

  it("rejects empty input without throwing", () => {
    expect(probeConvert("wyscout", "", "50", PITCH)).toMatchObject({ ok: false, field: "x" });
    expect(probeConvert("wyscout", "50", "   ", PITCH)).toMatchObject({ ok: false, field: "y" });
  });

  it("rejects Infinity and hex that Number() would accept", () => {
    expect(probeConvert("opta", "Infinity", "50", PITCH).ok).toBe(false);
    expect(probeConvert("opta", "0x10", "50", PITCH).ok).toBe(false);
  });

  it("accepts decimals, a leading dot and surrounding spaces", () => {
    expect(probeConvert("opta", " 11.5 ", ".5", PITCH).ok).toBe(true);
  });
});

describe("probeConvert conversions", () => {
  it("StatsBomb 60, 40 is the centre", () => {
    expect(point("statsbomb", "60", "40")).toEqual({ x: 52.5, y: 34 });
  });

  it("Opta 11.5, 50 lands on the left penalty spot", () => {
    const p = point("opta", "11.5", "50");
    expect(p.x).toBeCloseTo(11, 9);
    expect(p.y).toBeCloseTo(34, 9);
  });

  it("Wyscout 90, 50 lands on the right penalty spot", () => {
    const p = point("wyscout", "90", "50");
    expect(p.x).toBeCloseTo(94, 9);
    expect(p.y).toBeCloseTo(34, 9);
  });

  it("Tracking 0, 0 is the centre", () => {
    expect(point("tracking-metres", "0", "0")).toEqual({ x: 52.5, y: 34 });
  });
});

describe("landmarkMarks (provider landmarks overlay)", () => {
  const marks = landmarkMarks();

  it("draws the four providers with chips S, O, W and T", () => {
    const chips = new Set(marks.map((m) => m.chip));
    expect([...chips].sort()).toEqual(["O", "S", "T", "W"]);
  });

  it("skips run-off cases, other pitch sizes and source-pitch cases", () => {
    expect(marks.some((m) => m.name.startsWith("run-off"))).toBe(false);
    expect(marks.some((m) => m.name.startsWith("fulham"))).toBe(false);
    expect(marks.some((m) => m.name.includes("source"))).toBe(false);
  });

  it("follows the pitch size: Fulham 100 x 65 has its own cases, 101 x 68 has none", () => {
    const fulham = landmarkMarks({ length: 100, width: 65 });
    expect(fulham.length).toBeGreaterThan(0);
    expect(fulham.every((m) => m.name.startsWith("fulham"))).toBe(true);
    expect(landmarkMarks({ length: 101, width: 68 })).toEqual([]);
  });

  it("converts live: every shared landmark's four points coincide", () => {
    const byName = new Map<string, typeof marks>();
    for (const m of marks) byName.set(m.name, [...(byName.get(m.name) ?? []), m]);
    const shared = [...byName.values()].filter((group) => group.length === 4);
    expect(shared.length).toBeGreaterThanOrEqual(6);
    for (const group of shared) {
      const first = group[0];
      if (!first) continue;
      for (const m of group) {
        expect(Math.abs(m.point.x - first.point.x), m.name).toBeLessThan(0.01);
        expect(Math.abs(m.point.y - first.point.y), m.name).toBeLessThan(0.01);
      }
    }
  });

  it("the two penalty marks form two separate clusters", () => {
    const left = marks.filter((m) => m.name === "left penalty spot");
    const right = marks.filter((m) => m.name === "right penalty spot");
    expect(left).toHaveLength(4);
    expect(right).toHaveLength(4);
    expect(left[0]?.point.x).toBeCloseTo(11, 2);
    expect(right[0]?.point.x).toBeCloseTo(94, 2);
  });
});
