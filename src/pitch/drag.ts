// Pure drag helpers for the layer-API spike (03-UI-SPEC "Drag Spike Contract"). No DOM, no React.
// Positions are canonical metres; a dragged or nudged player is clamped to the run-off and rounded
// to 0.1 m before it reaches state.
import { invertMatrix, type Pt, type View } from "./view.ts";

export interface PitchSize {
  length: number;
  width: number;
}

/** Clamp to [-runoff, length + runoff] x [-runoff, width + runoff] (edges inclusive). */
export function clampToRunoff(p: Pt, pitch: PitchSize, runoff = 3): Pt {
  return {
    x: Math.min(pitch.length + runoff, Math.max(-runoff, p.x)),
    y: Math.min(pitch.width + runoff, Math.max(-runoff, p.y)),
  };
}

function tenth(n: number): number {
  // `+ 0` turns -0 into 0 so state and announcements never carry a negative zero.
  return Math.round(n * 10) / 10 + 0;
}

/** Round both coordinates to 0.1 m. */
export function roundTenth(p: Pt): Pt {
  return { x: tenth(p.x), y: tenth(p.y) };
}

/** Where a dragged player goes: pointer plus the grab offset, clamped, then rounded. */
export function dragPosition(pointer: Pt, offset: Pt, pitch: PitchSize, runoff = 3): Pt {
  return roundTenth(
    clampToRunoff({ x: pointer.x + offset.x, y: pointer.y + offset.y }, pitch, runoff),
  );
}

export type NudgeKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const SCREEN_DIRECTION: Record<NudgeKey, Pt> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

/** Removes float dust and negative zero so a nudge of exactly 1 m reads `1`, not `0.9999999999`. */
function clean(n: number): number {
  return Math.round(n * 1e9) / 1e9 + 0;
}

/**
 * One arrow-key step as a canonical delta. The step is 1 m (5 m with Shift) in the direction the
 * arrow points on screen: the screen unit vector goes through the inverse of the linear part of the
 * view matrix, so ArrowUp moves up the screen in both orientations.
 */
export function nudge(view: View, key: NudgeKey, shift: boolean): { dx: number; dy: number } {
  const [a, b, c, d] = invertMatrix(view.cssMatrix);
  const s = SCREEN_DIRECTION[key];
  const dx = a * s.x + c * s.y;
  const dy = b * s.x + d * s.y;
  const length = Math.hypot(dx, dy);
  const step = shift ? 5 : 1;
  return { dx: clean((dx / length) * step), dy: clean((dy / length) * step) };
}

/** A nudged position: moved, clamped to the run-off and rounded like a drag. */
export function nudgePosition(
  p: Pt,
  view: View,
  key: NudgeKey,
  shift: boolean,
  options: { pitch: PitchSize; runoff?: number },
): Pt {
  const { dx, dy } = nudge(view, key, shift);
  return roundTenth(
    clampToRunoff({ x: p.x + dx, y: p.y + dy }, options.pitch, options.runoff ?? 3),
  );
}
