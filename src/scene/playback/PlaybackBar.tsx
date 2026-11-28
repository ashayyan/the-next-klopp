import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import { PauseIcon, PlayIcon, ReplayIcon } from "./icons.tsx";
import type { PlaybackState } from "./store.ts";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

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
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-sm bg-accent px-3 text-sm font-semibold text-accent-ink ${focusRing}`}
    >
      <Icon />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

export function PlaybackBar({ store }: PlaybackBarProps) {
  return (
    <div role="toolbar" aria-label="Playback" className="mt-2 flex flex-wrap items-center gap-2">
      <TransportButton store={store} />
    </div>
  );
}
