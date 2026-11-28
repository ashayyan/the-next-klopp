import { describe, expect, it } from "vitest";
import { type Arc, LAW1, pitchGeometry } from "./geometry.ts";

const DIGITS = 9;

/** SVG arc endpoint-to-centre conversion (SVG 1.1 F.6.5) for a circular arc, phi = 0. */
function arcCentre(d: string) {
  const n = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)?.map(Number) ?? [];
  const [x1, y1, r, , , largeArc, sweep, x2, y2] = n as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const xp = (x1 - x2) / 2;
  const yp = (y1 - y2) / 2;
  const num = r * r * r * r - r * r * yp * yp - r * r * xp * xp;
  const den = r * r * yp * yp + r * r * xp * xp;
  const sign = largeArc !== sweep ? 1 : -1;
  const k = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = k * yp;
  const cyp = -k * xp;
  const cx = cxp + (x1 + x2) / 2;
  const cy = cyp + (y1 + y2) / 2;
  const t1 = Math.atan2((yp - cyp) / r, (xp - cxp) / r);
  let dt = Math.atan2((-yp - cyp) / r, (-xp - cxp) / r) - t1;
  if (sweep === 1 && dt < 0) dt += 2 * Math.PI;
  if (sweep === 0 && dt > 0) dt -= 2 * Math.PI;
  const tm = t1 + dt / 2;
  return { cx, cy, r, mid: { x: cx + r * Math.cos(tm), y: cy + r * Math.sin(tm) } };
}

function expectArc(arc: Arc) {
  const c = arcCentre(arc.d);
  expect(c.cx).toBeCloseTo(arc.cx, DIGITS);
  expect(c.cy).toBeCloseTo(arc.cy, DIGITS);
  expect(c.mid.x).toBeCloseTo(arc.mid.x, DIGITS);
  expect(c.mid.y).toBeCloseTo(arc.mid.y, DIGITS);
}

describe("LAW1", () => {
  it("holds the IFAB 2026/27 Law 1 values", () => {
    expect(LAW1.goalWidth).toBe(7.32);
    expect(LAW1.goalAreaDepth).toBe(5.5);
    expect(LAW1.goalAreaWidth).toBeCloseTo(7.32 + 2 * 5.5, DIGITS);
    expect(LAW1.penaltyAreaDepth).toBe(16.5);
    expect(LAW1.penaltyAreaWidth).toBeCloseTo(7.32 + 2 * 16.5, DIGITS);
    expect(LAW1.penaltyMarkDistance).toBe(11);
    expect(LAW1.centreCircleRadius).toBe(9.15);
    expect(LAW1.penaltyArcRadius).toBe(9.15);
    expect(LAW1.cornerArcRadius).toBe(1);
  });
});

describe("pitchGeometry(105, 68)", () => {
  const g = pitchGeometry(105, 68);
  const [paL, paR] = g.penaltyAreas;
  const [gaL, gaR] = g.goalAreas;
  const [markL, markR] = g.penaltyMarks;
  const [arcL, arcR] = g.penaltyArcs;
  const [goalL, goalR] = g.goals;

  it("puts the penalty areas at x 0..16.5 and 88.5..105, y 13.84..54.16", () => {
    expect(paL?.x).toBe(0);
    expect(paL?.width).toBe(16.5);
    expect(paR?.x).toBeCloseTo(88.5, DIGITS);
    expect((paR?.x ?? 0) + (paR?.width ?? 0)).toBeCloseTo(105, DIGITS);
    for (const pa of [paL, paR]) {
      expect(pa?.y).toBeCloseTo(13.84, DIGITS);
      expect((pa?.y ?? 0) + (pa?.height ?? 0)).toBeCloseTo(54.16, DIGITS);
    }
  });

  it("puts the goal areas 5.5 m deep at y 24.84..43.16", () => {
    expect(gaL?.x).toBe(0);
    expect(gaL?.width).toBe(5.5);
    expect(gaR?.x).toBeCloseTo(99.5, DIGITS);
    for (const ga of [gaL, gaR]) {
      expect(ga?.y).toBeCloseTo(24.84, DIGITS);
      expect((ga?.y ?? 0) + (ga?.height ?? 0)).toBeCloseTo(43.16, DIGITS);
    }
  });

  it("puts the goalposts at y 30.34..37.66, drawn 2 m outside each goal line", () => {
    for (const goal of [goalL, goalR]) {
      expect(goal?.y).toBeCloseTo(30.34, DIGITS);
      expect((goal?.y ?? 0) + (goal?.height ?? 0)).toBeCloseTo(37.66, DIGITS);
      expect(goal?.width).toBe(2);
    }
    expect(goalL?.x).toBe(-2);
    expect(goalR?.x).toBe(105);
  });

  it("puts the penalty marks at (11, 34) and (94, 34)", () => {
    expect(markL).toEqual({ x: 11, y: 34 });
    expect(markR).toEqual({ x: 94, y: 34 });
  });

  it("draws the penalty arcs only outside the penalty area", () => {
    const halfChord = Math.sqrt(9.15 ** 2 - 5.5 ** 2);
    expect(halfChord).toBeCloseTo(7.3125, 4);
    expect(arcL?.from.x).toBe(16.5);
    expect(arcL?.from.y).toBeCloseTo(34 - halfChord, DIGITS);
    expect(arcL?.to.y).toBeCloseTo(34 + halfChord, DIGITS);
    expect(arcR?.from.x).toBeCloseTo(88.5, DIGITS);
    expect(arcL?.mid.x).toBeCloseTo(20.15, DIGITS);
    expect(arcL?.mid.y).toBe(34);
    expect(arcR?.mid.x).toBeCloseTo(84.85, DIGITS);
    expect(arcR?.mid.y).toBe(34);
    expect(arcL?.mid.x).toBeGreaterThan(16.5);
    expect(arcR?.mid.x).toBeLessThan(88.5);
    if (arcL) expectArc(arcL);
    if (arcR) expectArc(arcR);
  });

  it("draws four corner arcs of radius 1 inside the field", () => {
    const centres = [
      { x: 0, y: 0 },
      { x: 105, y: 0 },
      { x: 105, y: 68 },
      { x: 0, y: 68 },
    ];
    g.cornerArcs.forEach((d, i) => {
      const c = arcCentre(d);
      expect(c.r).toBe(1);
      expect(c.cx).toBeCloseTo(centres[i]?.x ?? Number.NaN, DIGITS);
      expect(c.cy).toBeCloseTo(centres[i]?.y ?? Number.NaN, DIGITS);
      expect(c.mid.x).toBeGreaterThan(0);
      expect(c.mid.x).toBeLessThan(105);
      expect(c.mid.y).toBeGreaterThan(0);
      expect(c.mid.y).toBeLessThan(68);
    });
  });

  it("centres the 9.15 m circle at (52.5, 34) on the halfway line", () => {
    expect(g.centreCircle).toEqual({ cx: 52.5, cy: 34, r: 9.15 });
    expect(g.centreMark).toEqual({ x: 52.5, y: 34 });
    expect(g.halfwayLine).toEqual({ x1: 52.5, y1: 0, x2: 52.5, y2: 68 });
  });
});

describe("registered non-standard pitches", () => {
  it("keeps Law 1 area sizes on Fulham's 100 x 65 m pitch", () => {
    const g = pitchGeometry(100, 65);
    const [paL, paR] = g.penaltyAreas;
    expect(paL?.width).toBe(16.5);
    expect(paL?.height).toBeCloseTo(40.32, DIGITS);
    expect(paL?.y).toBeCloseTo(12.34, DIGITS);
    expect((paL?.y ?? 0) + (paL?.height ?? 0)).toBeCloseTo(52.66, DIGITS);
    expect(paR?.x).toBeCloseTo(83.5, DIGITS);
    expect(g.penaltyMarks[1]).toEqual({ x: 89, y: 32.5 });
  });

  it("puts the right mark at (90, 34) on Liverpool's 101 x 68 m pitch", () => {
    expect(pitchGeometry(101, 68).penaltyMarks[1]).toEqual({ x: 90, y: 34 });
  });
});
