import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { CONTROL_BASE } from "./Button.tsx";

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}

export interface SegmentedProps<V extends string> {
  /** The group's accessible name, for example "Possession". */
  label: string;
  options: readonly SegmentedOption<V>[];
  value: V;
  onValueChange: (value: V) => void;
  /** Forced look for the gallery, written to `data-state` on every option. */
  state?: string;
  /** Classes for the group (width, alignment). */
  className?: string;
  /** Classes added to every option (a direction's border on the selected fill). */
  optionClassName?: string;
}

/**
 * A segmented control on Base UI ToggleGroup: exactly one option is pressed at a time, the
 * selected option is filled with the accent (04-UI-SPEC "Accent reserved for", item 3). Options sit
 * 8 px apart so every target clears the tap-size rule, and wrap on a narrow screen.
 */
export function Segmented<V extends string>({
  label,
  options,
  value,
  onValueChange,
  state,
  className,
  optionClassName,
}: SegmentedProps<V>) {
  return (
    <ToggleGroup<V>
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        // A single-select group may report an empty value when the pressed option is pressed again.
        const picked = next[0];
        if (picked !== undefined && picked !== value) onValueChange(picked);
      }}
      className={`flex flex-wrap gap-2 rounded-lg bg-surface-panel p-1${className ? ` ${className}` : ""}`}
    >
      {options.map((option) => (
        <Toggle<V>
          key={option.value}
          value={option.value}
          data-state={state}
          className={`${CONTROL_BASE} flex-1 rounded-md px-4 font-normal whitespace-nowrap text-ink not-data-pressed:hov:bg-surface-page data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-accent-ink act:translate-y-px${optionClassName ? ` ${optionClassName}` : ""}`}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
