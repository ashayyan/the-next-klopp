// Pure formation morph (state = f(t), ADR 0009): no React, no timers. The tactics screen drives it
// from one requestAnimationFrame loop with the direction's own motion tokens.
import type { SceneEntity, ScenePoint } from "../../scene/schema.ts";

/** 0 goalkeeper, 1 back line, 2 midfield, 3 forwards. */
export type Line = 0 | 1 | 2 | 3;

const LINE_BY_ROLE: Readonly<Record<string, Line>> = {
  GK: 0,
  RB: 1,
  CB: 1,
  LB: 1,
  DM: 2,
  CM: 2,
  RW: 3,
  LW: 3,
  ST: 3,
};

/**
 * The line a player belongs to, from the frame-0 role code on the disc. A goalkeeper without a
 * code is line 0; any other unknown code is treated as midfield.
 */
export function lineOf(entity: Pick<SceneEntity, "id" | "type" | "label">): Line {
  const byRole = entity.label === undefined ? undefined : LINE_BY_ROLE[entity.label];
  if (byRole !== undefined) return byRole;
  return entity.type === "goalkeeper" ? 0 : 2;
}

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` timing function as a number function on [0, 1]. x is solved
 * for the curve parameter with Newton steps, falling back to bisection where the slope is flat.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const curveX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const curveY = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;

  const solve = (x: number): number => {
    let s = x;
    for (let i = 0; i < 8; i += 1) {
      const error = curveX(s) - x;
      if (Math.abs(error) < 1e-7) return s;
      const slope = slopeX(s);
      if (Math.abs(slope) < 1e-6) break;
      s -= error / slope;
    }
    let lo = 0;
    let hi = 1;
    s = x;
    for (let i = 0; i < 60; i += 1) {
      const value = curveX(s);
      if (Math.abs(value - x) < 1e-7) return s;
      if (value < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return s;
  };

  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return curveY(solve(t));
  };
}

export interface MorphInput {
  /** Positions at the start of the change, canonical metres, by entity id. */
  from: Readonly<Record<string, ScenePoint>>;
  /** Positions at the end of the change. */
  to: Readonly<Record<string, ScenePoint>>;
  /** Line of each entity (see lineOf). */
  lines: Readonly<Record<string, Line>>;
  elapsedMs: number;
  /** How long one line takes to move. */
  durationMs: number;
  /** Delay between lines, from the back. 0 moves the whole team at once. */
  staggerMs: number;
  ease: (t: number) => number;
}

/** When a line starts: the goalkeeper moves with the back line, each further line one stagger later. */
export function lineStartMs(line: Line, staggerMs: number): number {
  return Math.max(0, line - 1) * staggerMs;
}

/** Total length of a change: the forwards start last and run the full duration. */
export function morphLengthMs(durationMs: number, staggerMs: number): number {
  return lineStartMs(3, staggerMs) + durationMs;
}

/** Every entity's position at `elapsedMs` into a line-staggered change from `from` to `to`. */
export function morphPositions(input: MorphInput): Map<string, ScenePoint> {
  const { from, to, lines, elapsedMs, durationMs, staggerMs, ease } = input;
  const out = new Map<string, ScenePoint>();
  for (const id of new Set([...Object.keys(from), ...Object.keys(to)])) {
    const a = from[id] ?? to[id];
    const b = to[id] ?? from[id];
    if (!a || !b) continue;
    const start = lineStartMs(lines[id] ?? 2, staggerMs);
    const progress =
      durationMs <= 0 ? (elapsedMs >= start ? 1 : 0) : (elapsedMs - start) / durationMs;
    const k = ease(Math.min(1, Math.max(0, progress)));
    out.set(id, k === 0 ? a : k === 1 ? b : { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  }
  return out;
}

/** Reads a CSS duration token ("640ms" or "0.64s") as milliseconds. */
export function parseDurationMs(value: string, fallback: number): number {
  const v = value.trim();
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
}

/** Reads a CSS `cubic-bezier(...)` token; anything else gives a linear ease. */
export function parseEase(value: string): (t: number) => number {
  const m = /cubic-bezier\(([^)]*)\)/.exec(value);
  const parts = m?.[1]?.split(",").map((p) => Number.parseFloat(p));
  if (parts && parts.length === 4 && parts.every((p) => Number.isFinite(p))) {
    const [x1, y1, x2, y2] = parts as [number, number, number, number];
    return cubicBezier(x1, y1, x2, y2);
  }
  return (t) => Math.min(1, Math.max(0, t));
}
