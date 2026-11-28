import { Slider as BaseSlider } from "@base-ui/react/slider";

export interface SliderProps {
  /** Visible label; also the slider's accessible name. */
  label: string;
  min: number;
  max: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  /** Forced look for the gallery ("focus-visible"), written to `data-state` on the thumb. */
  state?: string;
  className?: string;
}

/**
 * A parameter slider on Base UI (xG threshold, sample size). The filled track and the thumb are
 * the accent (04-UI-SPEC "Accent reserved for"); the value is shown in mono next to the label. The
 * thumb is a 24 px dot inside a 44 px target, so it is easy to grab by touch; the native input in
 * it carries the focus ring.
 */
export function Slider({
  label,
  min,
  max,
  step,
  value,
  defaultValue,
  onValueChange,
  disabled,
  state,
  className,
}: SliderProps) {
  return (
    <BaseSlider.Root
      min={min}
      max={max}
      step={step}
      thumbAlignment="edge"
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? min) : undefined}
      onValueChange={onValueChange ? (next) => onValueChange(Number(next)) : undefined}
      disabled={disabled}
      className={`flex w-full flex-col gap-1${className ? ` ${className}` : ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <BaseSlider.Label className="text-label font-semibold text-ink">{label}</BaseSlider.Label>
        <BaseSlider.Value className="font-mono text-label tabular-nums text-ink" />
      </div>
      <BaseSlider.Control className="flex min-h-11 w-full touch-none items-center select-none data-disabled:opacity-50">
        <BaseSlider.Track className="h-2 w-full rounded-sm bg-surface-panel shadow-[inset_0_0_0_1px_var(--control-border)]">
          <BaseSlider.Indicator className="rounded-sm bg-accent" />
          <BaseSlider.Thumb
            data-state={state}
            className="flex size-11 items-center justify-center rounded-md outline-offset-[-2px] data-[state~=focus-visible]:outline-2 data-[state~=focus-visible]:outline-focus-ring [&>input]:pointer-events-none [&>input]:appearance-none [&>input]:rounded-md [&>input]:bg-transparent [&>input]:outline-offset-[-2px] [&>input]:[clip-path:none]! [&>input:focus-visible]:outline-2 [&>input:focus-visible]:outline-focus-ring [&>input::-webkit-slider-thumb]:size-0 [&>input::-webkit-slider-thumb]:appearance-none [&>input::-moz-range-thumb]:size-0 [&>input::-moz-range-thumb]:border-0"
          >
            <span
              aria-hidden="true"
              data-fill-edge="always"
              className="size-6 rounded-full border-2 border-accent-ink bg-accent"
            />
          </BaseSlider.Thumb>
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
