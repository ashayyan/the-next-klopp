import type { ReactNode } from "react";
import { Switch } from "../Switch.tsx";

export interface FocusToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  state?: string;
}

/** The "Focus mode" switch: on, the lesson keeps only the step (04-UI-SPEC "Focus mode"). */
export function FocusToggle({ checked, onCheckedChange, state }: FocusToggleProps) {
  return (
    <Switch
      // Narrow screens show "Focus" and keep "mode" for assistive tech, so the bar fits at 320 px
      // and the visible text stays inside the accessible name "Focus mode".
      label={
        <>
          Focus<span className="max-md:sr-only"> mode</span>
        </>
      }
      checked={checked}
      onCheckedChange={onCheckedChange}
      state={state}
    />
  );
}

export interface ShellBarProps {
  /** Lesson length in minutes, shown as "About {n} min". */
  minutes: number;
  focus: boolean;
  onFocusChange: (focus: boolean) => void;
  /** The "I'm confused here" control (04-08 Task 3). */
  confusion?: ReactNode;
  /** The theme menu (wide) and the overflow menu (375), when the screen provides them. */
  themeMenu?: ReactNode;
  overflowMenu?: ReactNode;
  /** Classes for the bar: padding and any direction rule under it. */
  className?: string;
  /** Classes for the wordmark: the display face and its stretch. */
  wordmarkClassName?: string;
  state?: string;
}

/**
 * The 56 px lesson top bar: wordmark, lesson time, Focus mode, "I'm confused here" and the theme
 * menu. Focus mode hides the time and the theme menu. Below 768 px the time and theme choices
 * move into the overflow menu ("More options").
 */
export function ShellBar({
  minutes,
  focus,
  onFocusChange,
  confusion,
  themeMenu,
  overflowMenu,
  className,
  wordmarkClassName,
  state,
}: ShellBarProps) {
  return (
    <header
      data-shell-bar
      data-state={state}
      className={`flex h-14 items-center justify-between gap-2${className ? ` ${className}` : ""}`}
    >
      <span className={`whitespace-nowrap text-label md:text-heading ${wordmarkClassName ?? ""}`}>
        The Next Klopp
      </span>
      <div className="flex min-w-0 items-center gap-2">
        {focus ? null : (
          <span
            data-lesson-time
            className="hidden whitespace-nowrap text-label text-ink-muted md:inline"
          >
            {`About ${minutes} min`}
          </span>
        )}
        <FocusToggle checked={focus} onCheckedChange={onFocusChange} />
        {confusion}
        {focus || !themeMenu ? null : <span className="hidden md:inline-flex">{themeMenu}</span>}
        {focus || !overflowMenu ? null : (
          <span className="inline-flex md:hidden">{overflowMenu}</span>
        )}
      </div>
    </header>
  );
}
