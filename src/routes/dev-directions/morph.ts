// RED stub: the behaviour tests run against these placeholders before the morph is written.
import type { SceneEntity, ScenePoint } from "../../scene/schema.ts";

export type Line = 0 | 1 | 2 | 3;

export function cubicBezier(
  _x1: number,
  _y1: number,
  _x2: number,
  _y2: number,
): (t: number) => number {
  return () => Number.NaN;
}

export function lineOf(_entity: Pick<SceneEntity, "id" | "type" | "label">): Line {
  return 0;
}

export interface MorphInput {
  from: Readonly<Record<string, ScenePoint>>;
  to: Readonly<Record<string, ScenePoint>>;
  lines: Readonly<Record<string, Line>>;
  elapsedMs: number;
  durationMs: number;
  staggerMs: number;
  ease: (t: number) => number;
}

export function morphPositions(_input: MorphInput): Map<string, ScenePoint> {
  return new Map();
}
