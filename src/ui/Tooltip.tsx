import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, RefObject } from "react";

export interface TooltipProps {
  /** The visible name; the same text as the trigger's aria-label. */
  label: string;
  /** The trigger element (an icon-only button). */
  children: ReactElement<Record<string, unknown>>;
  /** Controlled open state; the gallery uses it to show the tooltip open. */
  open?: boolean;
  /** Render the popup inside this element instead of <body> (the gallery cell). */
  portalContainer?: HTMLElement | RefObject<HTMLElement | null> | null;
}

/** Popup look shared by the tooltip, the menus and the popovers. */
export const POPUP_MOTION =
  "origin-(--transform-origin) transition-[opacity,scale] duration-(--duration-ui) ease-(--ease-ui) data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0";

/**
 * A name for an icon-only button (04-UI-SPEC: tooltips name icon-only buttons only). Opens on hover
 * and on keyboard focus; the trigger keeps its own aria-label, so the tooltip is a visual echo.
 */
export function Tooltip({ label, children, open, portalContainer }: TooltipProps) {
  return (
    <BaseTooltip.Root open={open}>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal container={portalContainer ?? undefined}>
        <BaseTooltip.Positioner side="bottom" sideOffset={8}>
          <BaseTooltip.Popup
            className={`rounded-sm border border-control-border bg-surface-raised px-2 py-1 text-label text-ink ${POPUP_MOTION}`}
          >
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
