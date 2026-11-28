// Pure drag helpers for the layer-API spike (03-UI-SPEC "Drag Spike Contract"). No DOM, no React.
// Positions are canonical metres; a dragged or nudged player is clamped to the run-off and rounded
// to 0.1 m before it reaches state.
import type { Pt } from "./view.ts";

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
