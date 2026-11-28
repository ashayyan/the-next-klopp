import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId } from "react";
import { CheckIcon } from "./icons/index.tsx";

/**
 * Checkbox and radio group on Base UI. The visible label is part of the 44 px target; a checked
 * box or radio is filled with the accent (04-UI-SPEC "Accent reserved for", item 3). The switch is
 * `Switch.tsx`.
 */

const ROW =
  "inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-md pr-2 text-label text-ink has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50";

// The Base UI root is the 44 px target (the review measures the control itself); the 24 px box is
// its visible face. The focus ring is drawn inside the target so it never touches the next row.
const TARGET =
  "group inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-offset-[-2px] fv:outline-2 fv:outline-focus-ring data-disabled:cursor-not-allowed";

const FACE =
  "inline-flex size-6 items-center justify-center border-2 border-control-border bg-surface-page text-accent-ink group-data-checked:border-accent group-data-checked:bg-accent";

export interface CheckboxProps {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Forced look for the gallery ("hover", "focus-visible"), written to `data-state`. */
  state?: string;
  className?: string;
}

export function Checkbox({
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  state,
  className,
}: CheckboxProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={`${ROW}${className ? ` ${className}` : ""}`}>
      <BaseCheckbox.Root
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange ? (next) => onCheckedChange(next) : undefined}
        disabled={disabled}
        data-state={state}
        className={TARGET}
      >
        <span className={`${FACE} rounded-sm`}>
          <BaseCheckbox.Indicator className="flex data-unchecked:hidden">
            <CheckIcon className="size-4" />
          </BaseCheckbox.Indicator>
        </span>
      </BaseCheckbox.Root>
      <span>{label}</span>
    </label>
  );
}

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  /** The group's visible name. */
  label: string;
  options: readonly RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /** Forced look for the gallery, written to `data-state` on the selected radio (or the first). */
  state?: string;
  className?: string;
}

export function RadioGroup({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  state,
  className,
}: RadioGroupProps) {
  const labelId = useId();
  const picked = value ?? defaultValue ?? options[0]?.value;
  const radioId = (v: string) => `${labelId}-${v}`;
  return (
    <BaseRadioGroup
      aria-labelledby={labelId}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => onValueChange(String(next)) : undefined}
      disabled={disabled}
      className={`flex flex-col items-start gap-2${className ? ` ${className}` : ""}`}
    >
      <span id={labelId} className="text-label font-semibold text-ink">
        {label}
      </span>
      {options.map((o) => (
        <label key={o.value} htmlFor={radioId(o.value)} className={ROW}>
          <BaseRadio.Root
            id={radioId(o.value)}
            value={o.value}
            data-state={o.value === picked ? state : undefined}
            className={TARGET}
          >
            <span className={`${FACE} rounded-full`}>
              <BaseRadio.Indicator className="flex items-center justify-center data-unchecked:hidden before:size-2 before:rounded-full before:bg-current" />
            </span>
          </BaseRadio.Root>
          <span>{o.label}</span>
        </label>
      ))}
    </BaseRadioGroup>
  );
}
