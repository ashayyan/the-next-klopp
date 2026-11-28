import type { ReactNode } from "react";
import { MoreIcon, ThemeIcon } from "../icons/index.tsx";
import { RadioMenu } from "../Menu.tsx";
import { Switch } from "../Switch.tsx";
import type { ThemeChoice } from "../theme.ts";

export const THEME_OPTIONS = [
  { value: "system", label: "Match my system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export interface FocusToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  state?: string;
}

/** The "Focus mode" switch: on, the lesson keeps only the step (04-UI-SPEC "Focus mode"). */
export function FocusToggle({ checked, onCheckedChange, state }: FocusToggleProps) {
  return (
    <Switch
      // Below 768 px the switch shows "Focus" and keeps "mode" for assistive tech (the visible text
      // stays inside the accessible name "Focus mode"); below 375 px only the track shows, so the
      // bar fits at 320 px.
      label={
        <>
          <span className="max-[374px]:sr-only">Focus</span>
          <span className="max-md:sr-only"> mode</span>
        </>
      }
      checked={checked}
      onCheckedChange={onCheckedChange}
      state={state}
      className="shrink-0 max-md:px-1"
    />
  );
}

export interface ShellBarProps {
  /** Lesson length in minutes, shown as "About {n} min". */
  minutes: number;
  focus: boolean;
  onFocusChange: (focus: boolean) => void;
  /** The learner's theme choice; with onThemeChange the bar shows the theme menus. */
  theme?: ThemeChoice;
  onThemeChange?: (theme: ThemeChoice) => void;
  /** The "I'm confused here" control. */
  confusion?: ReactNode;
  /** Classes for the bar: padding and any direction rule under it. */
  className?: string;
  /** Classes for the wordmark: the display face and its stretch. */
  wordmarkClassName?: string;
  state?: string;
}

/**
 * The 56 px lesson top bar: wordmark, lesson time, Focus mode, "I'm confused here" and the theme
 * menu. Focus mode hides the time and the theme menu. Below 768 px the time and theme choices
 * move into the overflow menu ("More options"), so the bar fits at 320 px.
 */
export function ShellBar({
  minutes,
  focus,
  onFocusChange,
  theme,
  onThemeChange,
  confusion,
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
      <span
        className={`whitespace-nowrap text-label max-[374px]:whitespace-normal max-[374px]:leading-tight md:text-heading ${wordmarkClassName ?? ""}`}
      >
        The Next Klopp
      </span>
      <div className="flex shrink-0 items-center gap-3 [&>*]:shrink-0">
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
        {focus || !theme || !onThemeChange ? null : (
          <>
            <span className="hidden md:inline-flex">
              <RadioMenu
                label="Theme"
                icon={<ThemeIcon />}
                value={theme}
                onValueChange={onThemeChange}
                options={THEME_OPTIONS}
              />
            </span>
            <span className="inline-flex md:hidden">
              <RadioMenu
                label="More options"
                icon={<MoreIcon />}
                value={theme}
                onValueChange={onThemeChange}
                options={THEME_OPTIONS}
                before={`About ${minutes} min`}
              />
            </span>
          </>
        )}
      </div>
    </header>
  );
}
