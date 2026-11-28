// One requestAnimationFrame loop drives the playback store: it runs only while the clock is playing,
// takes dt from the rAF timestamps (capped at 100 ms so a background tab cannot jump the scene) and
// calls `tick`. It also records frame statistics for the 60 fps check on the stress scene.
//
// Work time is the time from the start of the rAF callback to the React commit (`markCommitted`,
// called from a layout effect in the playback layer). The mean rAF interval is NOT a useful number:
// headless browsers run rAF at the display rate (about 148 Hz in the 03-RESEARCH measurement), so
// the statistics here are work time, the 95th percentile interval and the count of long gaps.
import type { StoreApi } from "zustand/vanilla";
import type { PlaybackState } from "./store.ts";

const MAX_DT_MS = 100;
const WINDOW_MS = 1000;
const WARMUP_FRAMES = 5;
const LONG_GAP_MS = 50;
const KEEP_INTERVALS = 1200;

export interface FrameStatsSnapshot {
  /** Frames recorded since the last reset (play pressed). */
  frames: number;
  /** Rolling 1 s mean of rAF-callback-start to commit, in ms. */
  meanWorkMs: number;
  /** Rolling 1 s frames per second from the rAF intervals. */
  fps: number;
  /** 95th percentile rAF interval since the last reset, in ms. */
  p95IntervalMs: number;
  /** Intervals above 50 ms since the last reset, ignoring the first 5 frames. */
  gapsOver50: number;
}

declare global {
  interface Window {
    /** Dev builds only: live frame statistics for the browser check. */
    __pitchFrameStats?: FrameStatsSnapshot;
  }
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index] ?? 0;
}

class FrameStats {
  private recent: { at: number; interval: number }[] = [];
  private work: { at: number; ms: number }[] = [];
  private intervals: number[] = [];
  private lastAt: number | null = null;
  private callbackStart: number | null = null;
  private frames = 0;
  private gaps = 0;

  /** The object `window.__pitchFrameStats` points at; updated in place. */
  readonly live: FrameStatsSnapshot = {
    frames: 0,
    meanWorkMs: 0,
    fps: 0,
    p95IntervalMs: 0,
    gapsOver50: 0,
  };

  reset(): void {
    this.recent = [];
    this.work = [];
    this.intervals = [];
    this.lastAt = null;
    this.callbackStart = null;
    this.frames = 0;
    this.gaps = 0;
    this.publish(0);
  }

  /** Call at the start of every rAF callback. */
  beginFrame(now: number): void {
    if (this.lastAt !== null) {
      const interval = now - this.lastAt;
      this.frames += 1;
      this.recent.push({ at: now, interval });
      this.intervals.push(interval);
      if (this.intervals.length > KEEP_INTERVALS) this.intervals.shift();
      if (this.frames > WARMUP_FRAMES && interval > LONG_GAP_MS) this.gaps += 1;
    }
    this.lastAt = now;
    this.callbackStart = now;
  }

  /** Call once React has committed the frame. */
  committed(now: number): void {
    if (this.callbackStart === null) return;
    this.work.push({ at: now, ms: now - this.callbackStart });
    this.callbackStart = null;
    this.publish(now);
  }

  snapshot(now: number): FrameStatsSnapshot {
    const from = now - WINDOW_MS;
    this.recent = this.recent.filter((r) => r.at >= from);
    this.work = this.work.filter((w) => w.at >= from);
    const meanWork =
      this.work.length === 0 ? 0 : this.work.reduce((sum, w) => sum + w.ms, 0) / this.work.length;
    const meanInterval =
      this.recent.length === 0
        ? 0
        : this.recent.reduce((sum, r) => sum + r.interval, 0) / this.recent.length;
    return {
      frames: this.frames,
      meanWorkMs: meanWork,
      fps: meanInterval > 0 ? 1000 / meanInterval : 0,
      p95IntervalMs: percentile95(this.intervals),
      gapsOver50: this.gaps,
    };
  }

  private publish(now: number): void {
    Object.assign(this.live, this.snapshot(now));
  }
}

export const frameStats = new FrameStats();

// Dev builds only: the study and Vercel builds never carry this hook.
if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__pitchFrameStats = frameStats.live;
}

/** Called from a layout effect after the playback layer commits a new `t`. */
export function markCommitted(): void {
  frameStats.committed(performance.now());
}

/**
 * Start the single rAF loop for a playback store. The loop only runs while `playing` is true and
 * stops itself at the end of the sequence. Returns the stop function (call it on unmount or when
 * the scene changes).
 */
export function startPlaybackLoop(store: StoreApi<PlaybackState>): () => void {
  let raf: number | null = null;
  let last: number | null = null;

  const frame = (now: number) => {
    const state = store.getState();
    if (!state.playing) {
      raf = null;
      last = null;
      return;
    }
    const dt = last === null ? 0 : Math.min(MAX_DT_MS, now - last);
    last = now;
    frameStats.beginFrame(now);
    state.tick(dt);
    // `raf` stays set while the callback runs so the store subscription below cannot start a second loop.
    raf = store.getState().playing ? requestAnimationFrame(frame) : null;
    if (raf === null) last = null;
  };

  const ensureRunning = () => {
    if (raf !== null || !store.getState().playing) return;
    last = null;
    frameStats.reset();
    raf = requestAnimationFrame(frame);
  };

  const unsubscribe = store.subscribe(ensureRunning);
  ensureRunning();

  return () => {
    unsubscribe();
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    last = null;
  };
}
