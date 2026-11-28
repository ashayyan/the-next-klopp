// Playback clock: scene state is f(t), so the store holds only the clock (t, playing, speed, motion)
// and every transition is a pure function of its inputs. There are no timers in here: the single
// requestAnimationFrame loop in loop.ts calls `tick(dtMs)`, and tests call it directly in node.
// The store is a factory, never a module singleton, so each scene and each test gets its own clock.
import { createStore, type StoreApi } from "zustand/vanilla";
import type { Scene } from "../schema.ts";
import { keyframeTimes, type MotionMode, sceneDuration } from "./sample.ts";

export type Speed = 0.25 | 0.5 | 1;
export const SPEEDS: readonly Speed[] = [0.25, 0.5, 1];
/** Stepped mode holds each keyframe for this long at speed 1 (divided by the speed). */
export const STEP_HOLD_MS = 500;

export interface PlaybackState {
  /** Playback time in seconds, 0..duration. */
  t: number;
  duration: number;
  /** Sorted unique frame times. */
  keyframes: number[];
  playing: boolean;
  /** True once playback reached (or was moved to) the last frame; Play then restarts. */
  ended: boolean;
  speed: Speed;
  motion: MotionMode;
  /** Stepped mode: milliseconds spent on the current keyframe. */
  holdMs: number;
  play(): void;
  pause(): void;
  toggle(): void;
  replay(): void;
  seek(t: number): void;
  stepNext(): void;
  stepPrev(): void;
  jumpBy(seconds: number): void;
  first(): void;
  last(): void;
  setSpeed(speed: number): void;
  setMotion(motion: MotionMode): void;
  /** Advance the clock by `dtMs` of wall time. Does nothing while paused. */
  tick(dtMs: number): void;
  /** Reset to a new scene, paused at t 0. */
  load(scene: Scene): void;
}

/** Stepped when the learner asked the system for reduced motion, otherwise smooth. */
export function defaultMotion(prefersReducedMotion: boolean): MotionMode {
  return prefersReducedMotion ? "stepped" : "smooth";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createPlaybackStore(
  scene: Scene,
  options: { motion: MotionMode },
): StoreApi<PlaybackState> {
  const clockFor = (s: Scene) => ({
    t: 0,
    duration: sceneDuration(s),
    keyframes: keyframeTimes(s),
    playing: false,
    ended: false,
    holdMs: 0,
  });

  return createStore<PlaybackState>()((set, get) => {
    /** Move to `t`, paused. */
    const moveTo = (t: number) => {
      const { duration } = get();
      const next = clamp(t, 0, duration);
      set({ t: next, playing: false, ended: duration > 0 && next >= duration, holdMs: 0 });
    };

    return {
      ...clockFor(scene),
      speed: 1,
      motion: options.motion,

      play() {
        const { duration, ended, playing } = get();
        if (duration <= 0 || playing) return;
        if (ended) {
          get().replay();
          return;
        }
        set({ playing: true, holdMs: 0 });
      },
      pause() {
        set({ playing: false });
      },
      toggle() {
        if (get().playing) get().pause();
        else get().play();
      },
      replay() {
        if (get().duration <= 0) return;
        set({ t: 0, ended: false, playing: true, holdMs: 0 });
      },
      seek(t) {
        moveTo(t);
      },
      stepNext() {},
      stepPrev() {},
      jumpBy() {},
      first() {},
      last() {},
      setSpeed() {},
      setMotion(motion) {
        set({ motion, holdMs: 0 });
      },

      tick(dtMs) {
        const { playing, t, duration, speed } = get();
        if (!playing || dtMs <= 0) return;
        const next = Math.min(duration, t + (dtMs / 1000) * speed);
        if (next >= duration) {
          set({ t: duration, playing: false, ended: true, holdMs: 0 });
        } else {
          set({ t: next });
        }
      },

      load(next) {
        set(clockFor(next));
      },
    };
  });
}
