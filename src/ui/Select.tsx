import { Select as BaseSelect } from "@base-ui/react/select";
import type { RefObject } from "react";
import { CheckIcon, ChevronIcon } from "./icons/index.tsx";
import { POPUP_MOTION } from "./Tooltip.tsx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  /** Visible label; also the trigger's accessible name. */
  label: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Controlled open state; the gallery uses it to show the popup open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Forced look for the gallery ("focus-visible"), written to `data-state` on the trigger. */
  state?: string;
  /** Render the popup inside this element instead of <body> (the gallery cell). */
  portalContainer?: HTMLElement | RefObject<HTMLElement | null> | null;
  className?: string;
}

/**
 * A learner-facing select on Base UI: a 44 px trigger, a popup with 44 px options and a check icon
 * on the selected one. The popup opens below the trigger and never overlaps it. Dev routes keep
 * the native `<select>`; use this where a learner picks a value.
 */
export function Select({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Choose one",
  disabled,
  open,
  onOpenChange,
  state,
  portalContainer,
  className,
}: SelectProps) {
  const items = options.map((o) => ({ value: o.value, label: o.label }));
  return (
    <BaseSelect.Root
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => onValueChange(String(next)) : undefined}
      disabled={disabled}
      open={open}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
      modal={false}
    >
      <div className={`flex w-full flex-col items-start gap-1${className ? ` ${className}` : ""}`}>
        <BaseSelect.Label className="text-label font-semibold text-ink">{label}</BaseSelect.Label>
        <BaseSelect.Trigger
          data-state={state}
          className="inline-flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-control-border bg-surface-page px-3 text-body text-ink outline-offset-2 hov:bg-surface-panel fv:outline-2 fv:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BaseSelect.Value
            placeholder={placeholder}
            className="min-w-0 truncate data-placeholder:text-ink-muted"
          />
          <BaseSelect.Icon className="inline-flex shrink-0 rotate-90">
            <ChevronIcon />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
      </div>
      <BaseSelect.Portal container={portalContainer ?? undefined}>
        <BaseSelect.Positioner
          alignItemWithTrigger={false}
          sideOffset={4}
          collisionPadding={16}
          className="z-10 outline-none"
        >
          <BaseSelect.Popup
            className={`max-h-[60vh] min-w-(--anchor-width) max-w-[calc(100vw-32px)] overflow-y-auto overscroll-contain rounded-md border border-control-border bg-surface-raised py-1 font-sans text-body text-ink outline-none ${POPUP_MOTION}`}
          >
            <BaseSelect.List className="flex flex-col gap-2 px-1">
              {options.map((o) => (
                <BaseSelect.Item
                  key={o.value}
                  value={o.value}
                  className="grid min-h-11 cursor-pointer grid-cols-[1.25rem_1fr] items-center gap-2 px-3 rounded-sm outline-0 select-none data-highlighted:bg-surface-panel focus:outline-2 focus:-outline-offset-2 focus:outline-focus-ring data-highlighted:outline-2 data-highlighted:-outline-offset-2 data-highlighted:outline-focus-ring data-selected:font-semibold"
                >
                  <BaseSelect.ItemIndicator className="col-start-1 inline-flex">
                    <CheckIcon />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className="col-start-2 min-w-0">
                    {o.label}
                  </BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
