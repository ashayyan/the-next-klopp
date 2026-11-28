// WR-06: a nudge that is pending when the position changes from outside (Reset positions, another
// drag) is forgotten. The tracker is driven here the way useDraggableEntity drives it: it computes
// the next position with nudgePosition from tracker.from(), tells the parent (onMove) and pushes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nudgePosition } from "./drag.ts";
import { createNudgeTracker, NUDGE_ANNOUNCE_MS } from "./nudgeTracker.ts";
import { makeView, type Pt } from "./view.ts";

const PITCH = { length: 105, width: 68 };
const VIEW = makeView({
  length: 105,
  width: 68,
  runoff: 3,
  orientation: "horizontal",
  cssWidth: 960,
});
const START: Pt = { x: 30, y: 30 };

/** A player on a board: the parent owns `position`; the hook calls onMove and onEnd. */
function setup() {
  const tracker = createNudgeTracker();
  let position = START;
  const ends: Pt[] = [];
  /** The parent's state change; the hook's effect then syncs the tracker with the new position. */
  const setPosition = (p: Pt) => {
    position = p;
    tracker.sync(position);
  };
  const press = () => {
    const next = nudgePosition(tracker.from(position), VIEW, "ArrowRight", false, { pitch: PITCH });
    setPosition(next);
    tracker.push(next, (end) => ends.push(end));
    return next;
  };
  return { tracker, press, setPosition, ends, position: () => position };
}

describe("nudge tracker (WR-06)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("announces a run of presses once, from the last position, after 500 ms", () => {
    const p = setup();
    p.press();
    p.press();
    vi.advanceTimersByTime(NUDGE_ANNOUNCE_MS - 1);
    expect(p.ends).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(p.ends).toEqual([{ x: 32, y: 30 }]);
  });

  it("nudge, Reset within 500 ms, nudge: starts from the reset position and announces only that", () => {
    const p = setup();
    p.press();
    expect(p.press()).toEqual({ x: 32, y: 30 });
    vi.advanceTimersByTime(200);
    p.setPosition(START); // Reset positions
    vi.advanceTimersByTime(NUDGE_ANNOUNCE_MS); // the stale announcement would fire here
    expect(p.ends).toEqual([]);
    expect(p.press()).toEqual({ x: 31, y: 30 }); // reset position plus 1 m, not 32 + 1
    vi.advanceTimersByTime(NUDGE_ANNOUNCE_MS);
    expect(p.ends).toEqual([{ x: 31, y: 30 }]);
  });

  it("forgets a pending nudge when another drag moves the player", () => {
    const p = setup();
    p.press();
    p.setPosition({ x: 60, y: 10 });
    vi.advanceTimersByTime(NUDGE_ANNOUNCE_MS);
    expect(p.ends).toEqual([]);
    expect(p.press()).toEqual({ x: 61, y: 10 });
  });

  it("keeps the pending nudge when the position is the one the nudge produced", () => {
    const p = setup();
    p.press();
    p.tracker.sync(p.position());
    vi.advanceTimersByTime(NUDGE_ANNOUNCE_MS);
    expect(p.ends).toEqual([{ x: 31, y: 30 }]);
  });

  it("clear stops the pending announcement", () => {
    const p = setup();
    p.press();
    p.tracker.clear();
    vi.advanceTimersByTime(NUDGE_ANNOUNCE_MS * 2);
    expect(p.ends).toEqual([]);
  });
});
