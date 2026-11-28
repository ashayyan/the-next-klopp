// Pointer-capture drag for one pitch entity (layer-API consumer 2, 03-RESEARCH Pattern 5).
//
// Screen pixels become canonical metres through the inverse screen CTM of the
// `[data-canonical-root]` group, never the root <svg> CTM: the group carries the orientation
// matrix, so the same inverse is right in horizontal and vertical orientation. The position handed
// to onMove is already clamped to the run-off and rounded to 0.1 m.
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { dragPosition, type NudgeKey, nudgePosition, type PitchSize } from "./drag.ts";
import { createNudgeTracker } from "./nudgeTracker.ts";
import type { Pt, View } from "./view.ts";

export interface UseDraggableEntityOptions {
  /** Current position in canonical metres. */
  position: Pt;
  /** The live view, so an arrow key moves in screen directions in either orientation. */
  view: View;
  pitch: PitchSize;
  runoff?: number;
  onMove: (p: Pt) => void;
  /**
   * A drag that moved the player ended (drop), or 500 ms passed since the last arrow-key nudge.
   * Not called for Escape or a cancelled gesture.
   */
  onEnd?: (p: Pt) => void;
  /** The start position when a drag begins, null when it ends for any reason. */
  onDragChange?: (start: Pt | null) => void;
}

export interface DraggableBinding {
  /** Spread on the invisible hit circle. */
  hit: {
    onPointerDown: (e: ReactPointerEvent<SVGElement>) => void;
    onPointerMove: (e: ReactPointerEvent<SVGElement>) => void;
    onPointerUp: (e: ReactPointerEvent<SVGElement>) => void;
    onPointerCancel: (e: ReactPointerEvent<SVGElement>) => void;
    onLostPointerCapture: (e: ReactPointerEvent<SVGElement>) => void;
  };
  /** Spread on the focusable group: arrows nudge, Escape cancels a pointer drag. */
  onKeyDown: (e: ReactKeyboardEvent<SVGElement>) => void;
  dragging: boolean;
  /** Where the drag started, for the ghost; null when not dragging. */
  start: Pt | null;
  /** Escape cancels a pointer drag and restores the start position. */
  cancel: () => void;
}

interface ActiveDrag {
  pointerId: number;
  start: Pt;
  offset: Pt;
  last: Pt;
  root: SVGGElement;
  target: Element;
}

function pointerToCanonical(root: SVGGElement, clientX: number, clientY: number): Pt | null {
  const ctm = root.getScreenCTM();
  if (!ctm) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function release(target: Element, pointerId: number): void {
  try {
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
  } catch {
    // The element may already be gone; nothing to release.
  }
}

const NUDGE_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export function useDraggableEntity(options: UseDraggableEntityOptions): DraggableBinding {
  const { position, view, pitch, runoff = 3, onMove, onEnd, onDragChange } = options;
  const active = useRef<ActiveDrag | null>(null);
  const [start, setStart] = useState<Pt | null>(null);

  // The handlers read the latest callbacks and position without being re-created per render.
  const latest = useRef({ position, view, pitch, runoff, onMove, onEnd, onDragChange });
  latest.current = { position, view, pitch, runoff, onMove, onEnd, onDragChange };
  // A run of arrow presses is announced once, 500 ms after the last one (rules in nudgeTracker.ts).
  const [tracker] = useState(createNudgeTracker);
  const clearNudge = tracker.clear;
  useEffect(() => clearNudge, [clearNudge]);
  // A position that is not the one the last nudge produced came from outside (a reset, another
  // drag): the tracker forgets the pending nudge.
  useEffect(() => {
    tracker.sync({ x: position.x, y: position.y });
  }, [position.x, position.y, tracker]);

  const finish = useCallback(() => {
    active.current = null;
    setStart(null);
    latest.current.onDragChange?.(null);
  }, []);

  const cancel = useCallback(() => {
    const a = active.current;
    if (!a) return;
    release(a.target, a.pointerId);
    clearNudge();
    latest.current.onMove(a.start);
    finish();
  }, [finish, clearNudge]);

  // Page text is not selected while a drag runs; Escape works wherever the focus is.
  const dragging = start !== null;
  useEffect(() => {
    if (!dragging) return;
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.userSelect = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [dragging, cancel]);

  function onPointerDown(e: ReactPointerEvent<SVGElement>): void {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // A second finger must not replace the drag that is already running.
    if (active.current) return;
    const root = e.currentTarget.closest<SVGGElement>("[data-canonical-root]");
    if (!root) return;
    const pointer = pointerToCanonical(root, e.clientX, e.clientY);
    if (!pointer) return;
    clearNudge();
    const at = latest.current.position;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Pointer-down default is cancelled so no text selection starts; the player takes focus itself.
    e.preventDefault();
    e.currentTarget.closest<SVGElement>("[data-draggable]")?.focus({ preventScroll: true });
    active.current = {
      pointerId: e.pointerId,
      start: at,
      offset: { x: at.x - pointer.x, y: at.y - pointer.y },
      last: at,
      root,
      target: e.currentTarget,
    };
    setStart(at);
    latest.current.onDragChange?.(at);
  }

  function onPointerMove(e: ReactPointerEvent<SVGElement>): void {
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    const pointer = pointerToCanonical(a.root, e.clientX, e.clientY);
    if (!pointer) return;
    const next = dragPosition(pointer, a.offset, latest.current.pitch, latest.current.runoff);
    a.last = next;
    latest.current.onMove(next);
  }

  function onPointerUp(e: ReactPointerEvent<SVGElement>): void {
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    release(a.target, a.pointerId);
    const moved = a.last.x !== a.start.x || a.last.y !== a.start.y;
    const end = a.last;
    finish();
    if (moved) latest.current.onEnd?.(end);
  }

  function onPointerCancel(e: ReactPointerEvent<SVGElement>): void {
    if (active.current?.pointerId === e.pointerId) cancel();
  }

  function onLostPointerCapture(e: ReactPointerEvent<SVGElement>): void {
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    // Capture was taken away without a pointerup: keep where the player is and end the drag.
    const moved = a.last.x !== a.start.x || a.last.y !== a.start.y;
    const end = a.last;
    finish();
    if (moved) latest.current.onEnd?.(end);
  }

  function onKeyDown(e: ReactKeyboardEvent<SVGElement>): void {
    if (e.key === "Escape") {
      if (active.current) {
        e.preventDefault();
        cancel();
      }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Space and the arrows would scroll the page; while a pointer drag runs they do nothing else.
    if (e.key === " " || (active.current && NUDGE_KEYS.has(e.key))) {
      e.preventDefault();
      return;
    }
    if (!NUDGE_KEYS.has(e.key) || active.current) return;
    // The player wins on arrows: playback keys on the stage must not also fire.
    e.preventDefault();
    const now = latest.current;
    const next = nudgePosition(
      tracker.from(now.position),
      now.view,
      e.key as NudgeKey,
      e.shiftKey,
      {
        pitch: now.pitch,
        runoff: now.runoff,
      },
    );
    now.onMove(next);
    tracker.push(next, (end) => latest.current.onEnd?.(end));
  }

  return {
    hit: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture },
    onKeyDown,
    dragging,
    start,
    cancel,
  };
}
