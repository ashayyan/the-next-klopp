import { useEffect, useId, useState } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import { NextFrameIcon, PauseIcon, PlayIcon, PreviousFrameIcon, ReplayIcon } from "./icons.tsx";
import { type PlaybackState, SPEEDS } from "./store.ts";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
const quietButton = `inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm border border-control-border bg-transparent text-ink hover:bg-surface-panel ${focusRing}`;

export interface PlaybackBarProps {
  store: StoreApi<PlaybackState>;
}

/** Play, Pause and Replay share one button: accent background, white icon and label. */
function TransportButton({ store }: PlaybackBarProps) {
  const playing = useStore(store, (s) => s.playing);
  const ended = useStore(store, (s) => s.ended);
  const toggle = useStore(store, (s) => s.toggle);
  const [label, Icon] = playing
    ? (["Pause", PauseIcon] as const)
    : ended
      ? (["Replay", ReplayIcon] as const)
      : (["Play", PlayIcon] as const);
  return (
    <button
      type="button"
      aria-label={`${label} sequence`}
      onClick={toggle}
      className={`order-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-sm bg-accent px-3 text-sm font-semibold text-accent-ink ${focusRing}`}
    >
      <Icon />
      <span className="hidden md:inline">{`${label} sequence`}</span>
    </button>
  );
}

function seconds(value: number): string {
  return value.toFixed(1);
}

/** One polite live region: says "Paused at {t} seconds" or "End of sequence", never per frame. */
function Announcer({ store }: PlaybackBarProps) {
  const [message, setMessage] = useState("");
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (!previous.playing || state.playing) return;
        setMessage(state.ended ? "End of sequence" : `Paused at ${seconds(state.t)} seconds`);
      }),
    [store],
  );
  return (
    <p aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}

export function PlaybackBar({ store }: PlaybackBarProps) {
  const speedId = useId();
  const t = useStore(store, (s) => s.t);
  const duration = useStore(store, (s) => s.duration);
  const speed = useStore(store, (s) => s.speed);
  const stepPrev = useStore(store, (s) => s.stepPrev);
  const stepNext = useStore(store, (s) => s.stepNext);
  const seek = useStore(store, (s) => s.seek);
  const setSpeed = useStore(store, (s) => s.setSpeed);

  return (
    <div className="mt-2">
      <div role="toolbar" aria-label="Playback" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Previous frame"
          title="Previous frame"
          onClick={stepPrev}
          className={`order-1 ${quietButton}`}
        >
          <PreviousFrameIcon />
        </button>
        <TransportButton store={store} />
        <button
          type="button"
          aria-label="Next frame"
          title="Next frame"
          onClick={stepNext}
          className={`order-3 ${quietButton}`}
        >
          <NextFrameIcon />
        </button>
        <input
          type="range"
          aria-label="Sequence time"
          aria-valuetext={`${seconds(t)} seconds of ${seconds(duration)}`}
          min={0}
          max={duration}
          step={0.04}
          value={t}
          onChange={(e) => seek(Number(e.target.value))}
          className="order-5 min-h-11 min-w-0 basis-[calc(100%-9rem)] accent-accent md:order-4 md:basis-0 md:flex-1"
        />
        <output className="order-4 font-mono text-sm tabular-nums md:order-5">
          {`${seconds(t)} s / ${seconds(duration)} s`}
        </output>
        <div className="order-6 flex items-center gap-2 md:ml-2">
          <label htmlFor={speedId} className="text-sm">
            Speed
          </label>
          <select
            id={speedId}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className={`min-h-11 rounded-sm border border-control-border bg-surface-page px-2 text-sm text-ink ${focusRing}`}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {`${s}×`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Announcer store={store} />
    </div>
  );
}
