import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ReactNode } from "react";

export interface SwitchProps {
  /** Visible label; its text is also the switch's accessible name. */
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Forced look for the gallery ("hover", "focus-visible"), written to `data-state`. */
  state?: string;
  className?: string;
}

/**
 * An on/off switch on Base UI. The whole control (label plus track) is one native button at least
 * 44 px tall, so the visible label is part of the target. The checked track is filled with the
 * accent (04-UI-SPEC "Accent reserved for", item 3); `data-fill-edge` lets a direction whose
 * accent is too light against its page draw the track's edge in ink.
 */
export function Switch({ label, checked, onCheckedChange, state, className }: SwitchProps) {
  return (
    <BaseSwitch.Root
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
      nativeButton
      render={<button type="button" />}
      data-state={state}
      className={`group inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-md px-2 text-label text-ink outline-offset-2 hov:bg-surface-panel fv:outline-2 fv:outline-focus-ring${className ? ` ${className}` : ""}`}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        data-fill-edge="checked-child"
        className="inline-flex h-6 w-10 shrink-0 items-center rounded-lg border-2 border-control-border bg-surface-page p-0.5 group-data-checked:border-accent group-data-checked:bg-accent"
      >
        <BaseSwitch.Thumb className="size-4 rounded-md bg-ink-muted transition-[translate] duration-(--duration-ui) ease-(--ease-ui) data-checked:translate-x-4 data-checked:bg-accent-ink" />
      </span>
    </BaseSwitch.Root>
  );
}
