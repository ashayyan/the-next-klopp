// Pure Law 1 pitch geometry in canonical metres.
//
// Canonical frame (locked in 03-CONTEXT): origin at the top-left corner of the field as drawn,
// x runs along the touchline 0..length, y runs down 0..width. Every value below is in metres.

/**
 * Law 1 marking values, IFAB Laws of the Game 2026/27 (research/pitch-geometry/findings.md).
 *
 * - goalWidth 7.32: src-ifab-laws-2026-27#law1-goal-size
 * - goalAreaDepth 5.5 and goalAreaWidth 18.32 (7.32 + 2 x 5.5): src-ifab-laws-2026-27#law1-goal-area
 * - penaltyAreaDepth 16.5 and penaltyAreaWidth 40.32 (7.32 + 2 x 16.5): src-ifab-laws-2026-27#law1-penalty-area
 * - penaltyMarkDistance 11: src-ifab-laws-2026-27#law1-penalty-mark
 * - centreCircleRadius 9.15: src-ifab-laws-2026-27#law1-centre-circle
 * - penaltyArcRadius 9.15: src-ifab-laws-2026-27#law1-penalty-arc
 * - cornerArcRadius 1: src-ifab-laws-2026-27#law1-corner-area
 *
 * goalDrawDepth is NOT a Law value. It is a drawing convention: goals are drawn as a schematic
 * 2 m deep outside the goal line so they fit in the 3 m run-off (03-UI-SPEC "Geometry").
 */
export const LAW1 = {
  goalWidth: 7.32,
  goalAreaDepth: 5.5,
  goalAreaWidth: 18.32,
  penaltyAreaDepth: 16.5,
  penaltyAreaWidth: 40.32,
  penaltyMarkDistance: 11,
  centreCircleRadius: 9.15,
  penaltyArcRadius: 9.15,
  cornerArcRadius: 1,
  goalDrawDepth: 2,
} as const;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

/** A circular arc: centre, radius, endpoints, the point halfway along the arc and its SVG path. */
export interface Arc {
  cx: number;
  cy: number;
  r: number;
  from: Point;
  to: Point;
  mid: Point;
  d: string;
}

/** A goal drawn outside the goal line: its box in metres and an open three-sided path. */
export interface Goal extends Rect {
  d: string;
}

export interface PitchGeometry {
  length: number;
  width: number;
  field: Rect;
  halfwayLine: Line;
  centreCircle: Circle;
  centreMark: Point;
  goalAreas: readonly [Rect, Rect];
  penaltyAreas: readonly [Rect, Rect];
  penaltyMarks: readonly [Point, Point];
  penaltyArcs: readonly [Arc, Arc];
  /** Top-left, top-right, bottom-right, bottom-left. */
  cornerArcs: readonly [string, string, string, string];
  goals: readonly [Goal, Goal];
}

function arcPath(from: Point, r: number, to: Point): string {
  // Sweep flag 1 = positive-angle direction in SVG's y-down space; large-arc flag 0.
  return `M ${from.x} ${from.y} A ${r} ${r} 0 0 1 ${to.x} ${to.y}`;
}

/** Law 1 markings for a field of the given size, in canonical metres. Pure. */
export function pitchGeometry(length: number, width: number): PitchGeometry {
  const cy = width / 2;
  const goalHalf = LAW1.goalWidth / 2;
  const goalAreaHalf = LAW1.goalAreaWidth / 2;
  const penaltyAreaHalf = LAW1.penaltyAreaWidth / 2;
  const pad = LAW1.penaltyAreaDepth;
  const r = LAW1.penaltyArcRadius;

  // The arc is the part of the 9.15 m circle around the mark that lies outside the penalty area.
  // Half-chord where it meets the penalty-area line: sqrt(r^2 - (16.5 - 11)^2), about 7.3125.
  const dx = pad - LAW1.penaltyMarkDistance;
  const halfChord = Math.sqrt(r * r - dx * dx);

  const leftMark: Point = { x: LAW1.penaltyMarkDistance, y: cy };
  const rightMark: Point = { x: length - LAW1.penaltyMarkDistance, y: cy };

  const leftArcFrom: Point = { x: pad, y: cy - halfChord };
  const leftArcTo: Point = { x: pad, y: cy + halfChord };
  const rightArcFrom: Point = { x: length - pad, y: cy + halfChord };
  const rightArcTo: Point = { x: length - pad, y: cy - halfChord };

  const leftArc: Arc = {
    cx: leftMark.x,
    cy,
    r,
    from: leftArcFrom,
    to: leftArcTo,
    mid: { x: leftMark.x + r, y: cy },
    d: arcPath(leftArcFrom, r, leftArcTo),
  };
  const rightArc: Arc = {
    cx: rightMark.x,
    cy,
    r,
    from: rightArcFrom,
    to: rightArcTo,
    mid: { x: rightMark.x - r, y: cy },
    d: arcPath(rightArcFrom, r, rightArcTo),
  };

  const c = LAW1.cornerArcRadius;
  const cornerArcs = [
    arcPath({ x: c, y: 0 }, c, { x: 0, y: c }),
    arcPath({ x: length, y: c }, c, { x: length - c, y: 0 }),
    arcPath({ x: length - c, y: width }, c, { x: length, y: width - c }),
    arcPath({ x: 0, y: width - c }, c, { x: c, y: width }),
  ] as const;

  const goalTop = cy - goalHalf;
  const goalBottom = cy + goalHalf;
  const depth = LAW1.goalDrawDepth;
  const leftGoal: Goal = {
    x: -depth,
    y: goalTop,
    width: depth,
    height: LAW1.goalWidth,
    d: `M 0 ${goalTop} L ${-depth} ${goalTop} L ${-depth} ${goalBottom} L 0 ${goalBottom}`,
  };
  const rightGoal: Goal = {
    x: length,
    y: goalTop,
    width: depth,
    height: LAW1.goalWidth,
    d: `M ${length} ${goalTop} L ${length + depth} ${goalTop} L ${length + depth} ${goalBottom} L ${length} ${goalBottom}`,
  };

  return {
    length,
    width,
    field: { x: 0, y: 0, width: length, height: width },
    halfwayLine: { x1: length / 2, y1: 0, x2: length / 2, y2: width },
    centreCircle: { cx: length / 2, cy, r: LAW1.centreCircleRadius },
    centreMark: { x: length / 2, y: cy },
    goalAreas: [
      { x: 0, y: cy - goalAreaHalf, width: LAW1.goalAreaDepth, height: LAW1.goalAreaWidth },
      {
        x: length - LAW1.goalAreaDepth,
        y: cy - goalAreaHalf,
        width: LAW1.goalAreaDepth,
        height: LAW1.goalAreaWidth,
      },
    ],
    penaltyAreas: [
      { x: 0, y: cy - penaltyAreaHalf, width: pad, height: LAW1.penaltyAreaWidth },
      { x: length - pad, y: cy - penaltyAreaHalf, width: pad, height: LAW1.penaltyAreaWidth },
    ],
    penaltyMarks: [leftMark, rightMark],
    penaltyArcs: [leftArc, rightArc],
    cornerArcs,
    goals: [leftGoal, rightGoal],
  };
}
