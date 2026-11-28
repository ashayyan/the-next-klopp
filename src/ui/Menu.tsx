import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ReactNode } from "react";
import { CONTROL_BASE } from "./Button.tsx";
import { CheckIcon } from "./icons/index.tsx";
import { POPUP_MOTION, Tooltip } from "./Tooltip.tsx";

export interface RadioMenuOption<V extends string> {
  value: V;
  label: string;
}

export interface RadioMenuProps<V extends string> {
  /** The trigger's accessible name and tooltip, for example "Theme" or "More options". */
  label: string;
  icon: ReactNode;
  value: V;
  onValueChange: (value: V) => void;
  options: readonly RadioMenuOption<V>[];
  /** A non-interactive line above the choices (the lesson time in the 375 overflow menu). */
  before?: ReactNode;
  /** Forced look for the gallery, written to `data-state` on the trigger. */
  state?: string;
}

const ICON_TRIGGER = `${CONTROL_BASE} size-11 rounded-md border border-control-border bg-transparent text-ink hov:bg-surface-panel data-popup-open:bg-surface-panel`;

/**
 * An icon-only menu button with one group of radio choices, on Base UI Menu. The checked choice
 * carries the check icon on an accent marker (04-UI-SPEC "Accent reserved for", item 3); every
 * item is at least 44 px tall. The popup is portalled into <body>, which carries the direction's
 * data attributes, so it reads the same tokens as the page.
 */
export function RadioMenu<V extends string>({
  label,
  icon,
  value,
  onValueChange,
  options,
  before,
  state,
}: RadioMenuProps<V>) {
  return (
    <BaseMenu.Root>
      <Tooltip label={label}>
        <BaseMenu.Trigger aria-label={label} data-state={state} className={ICON_TRIGGER}>
          {icon}
        </BaseMenu.Trigger>
      </Tooltip>
      <BaseMenu.Portal>
        <BaseMenu.Positioner side="bottom" align="end" sideOffset={8}>
          <BaseMenu.Popup
            className={`min-w-48 rounded-md border border-control-border bg-surface-raised p-1 font-sans text-label text-ink outline-none ${POPUP_MOTION}`}
          >
            {before ? (
              <div className="border-control-border border-b px-3 py-2 text-ink-muted">
                {before}
              </div>
            ) : null}
            <BaseMenu.RadioGroup
              value={value}
              onValueChange={(next: unknown) => {
                const picked = options.find((o) => o.value === next);
                if (picked) onValueChange(picked.value);
              }}
            >
              {options.map((option) => (
                <BaseMenu.RadioItem
                  key={option.value}
                  value={option.value}
                  closeOnClick
                  className="group flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-sm px-3 outline-none data-highlighted:bg-surface-panel data-checked:font-semibold"
                >
                  <span
                    aria-hidden="true"
                    data-fill-edge="checked-child"
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm border-2 border-transparent group-data-checked:bg-accent group-data-checked:text-accent-ink"
                  >
                    <BaseMenu.RadioItemIndicator>
                      <CheckIcon className="size-4" />
                    </BaseMenu.RadioItemIndicator>
                  </span>
                  {option.label}
                </BaseMenu.RadioItem>
              ))}
            </BaseMenu.RadioGroup>
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
