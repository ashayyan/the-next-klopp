// Keyboard map for the playback transport, kept pure so it can be tested without a DOM.
//   Space / K       play or pause (a focused <button> keeps its native Space behaviour)
//   Left / Right    previous / next keyframe
//   Shift + arrows  jump 1 s back / forward
//   Home / End      first / last frame
// The handler lives on the Pitch stage region only, never on the page. Keys aimed at form controls
// (a range input uses the arrows itself) and at draggable players (arrows nudge the player,
// 03-09) are left alone.
import type { StoreApi } from "zustand/vanilla";
import type { PlaybackState } from "./store.ts";

export interface KeyTarget {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
}

export interface TransportKeyEvent {
  key: string;
  shiftKey: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target: KeyTarget | null;
}

const FORM_TAGS: ReadonlySet<string> = new Set(["INPUT", "SELECT", "TEXTAREA"]);

function isFormControl(target: KeyTarget | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return FORM_TAGS.has((target.tagName ?? "").toUpperCase());
}

function isDraggable(target: KeyTarget | null): boolean {
  return Boolean(target?.closest?.("[data-draggable]"));
}

/** Apply a key to the store. Returns true when the key was a transport key and was handled. */
export function handleTransportKey(
  event: TransportKeyEvent,
  store: StoreApi<PlaybackState>,
): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isFormControl(event.target) || isDraggable(event.target)) return false;
  const state = store.getState();
  switch (event.key) {
    case " ":
    case "Spacebar":
      // A focused button turns Space into its own click; do not toggle twice.
      if ((event.target?.tagName ?? "").toUpperCase() === "BUTTON") return false;
      state.toggle();
      return true;
    case "k":
    case "K":
      state.toggle();
      return true;
    case "ArrowRight":
      if (event.shiftKey) state.jumpBy(1);
      else state.stepNext();
      return true;
    case "ArrowLeft":
      if (event.shiftKey) state.jumpBy(-1);
      else state.stepPrev();
      return true;
    case "Home":
      state.first();
      return true;
    case "End":
      state.last();
      return true;
    default:
      return false;
  }
}
