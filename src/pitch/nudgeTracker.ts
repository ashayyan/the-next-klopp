// The pending arrow-key nudge of one draggable entity (review fix WR-06), kept free of React so the
// order-sensitive rules are unit-testable: a run of presses is announced once, 500 ms after the
// last press; a position that did not come from the nudge itself (a reset, another drag) makes the
// pending nudge stale, so it is neither announced nor used as the next start point.
import type { Pt } from "./view.ts";

/** Wait this long after the last nudge before announcing the new position. */
export const NUDGE_ANNOUNCE_MS = 500;

export interface NudgeTracker {
  /** Where the next nudge starts: the pending nudged position, else the live position. */
  from: (position: Pt) => Pt;
  /** Records a nudge result and restarts the announce timer; `onEnd` gets the final position. */
  push: (next: Pt, onEnd: (p: Pt) => void) => void;
  /** The live position changed: forget a pending nudge unless it is the position it produced. */
  sync: (position: Pt) => void;
  /** Forgets the pending nudge and stops the timer without announcing. */
  clear: () => void;
}

export function createNudgeTracker(): NudgeTracker {
  let pending: Pt | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    pending = null;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return {
    from: (position) => pending ?? position,
    push: (next, onEnd) => {
      pending = next;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        const end = pending;
        pending = null;
        timer = null;
        if (end) onEnd(end);
      }, NUDGE_ANNOUNCE_MS);
    },
    sync: (position) => {
      if (pending && (pending.x !== position.x || pending.y !== position.y)) clear();
    },
    clear,
  };
}
