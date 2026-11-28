import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ReactElement, ReactNode, RefObject } from "react";
import { POPUP_MOTION, Tooltip } from "./Tooltip.tsx";

export interface PopoverProps {
  /** The trigger element (a button); it receives the open state and the toggle. */
  trigger: ReactElement<Record<string, unknown>>;
  /** Wraps the trigger in a tooltip with this name (icon-only triggers). */
  tooltip?: string;
  /** Popup heading, rendered as the popover title (an h2). */
  title?: ReactNode;
  titleClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Width classes for the popup; default a 20 rem card. */
  className?: string;
  /** Render the popup inside this element instead of <body> (the gallery cell). */
  portalContainer?: HTMLElement | RefObject<HTMLElement | null> | null;
  /** `false` keeps focus where it is when the popover opens (the gallery's static open state). */
  initialFocus?: boolean;
  children: ReactNode;
}

/**
 * A Base UI popover with the menu's popup look: raised surface, 1 px control border, scale 0.98
 * to 1 plus fade. It scrolls inside a 60vh box, closes on Escape, and returns focus to its trigger.
 * It is portalled into <body>, which carries the direction's data attributes.
 */
export function Popover({
  trigger,
  tooltip,
  title,
  titleClassName,
  open,
  onOpenChange,
  className,
  portalContainer,
  initialFocus,
  children,
}: PopoverProps) {
  const triggerElement = <BasePopover.Trigger render={trigger} />;
  return (
    <BasePopover.Root
      open={open}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
    >
      {tooltip ? <Tooltip label={tooltip}>{triggerElement}</Tooltip> : triggerElement}
      <BasePopover.Portal container={portalContainer ?? undefined}>
        <BasePopover.Positioner side="bottom" align="center" sideOffset={8} collisionPadding={16}>
          <BasePopover.Popup
            initialFocus={initialFocus}
            className={`flex max-h-[60vh] max-w-[calc(100vw-32px)] flex-col gap-3 overflow-y-auto overscroll-contain rounded-md border border-control-border bg-surface-raised p-4 font-sans text-body text-ink outline-none ${POPUP_MOTION} ${className ?? "w-80"}`}
          >
            {title ? (
              <BasePopover.Title className={titleClassName ?? "text-heading font-semibold"}>
                {title}
              </BasePopover.Title>
            ) : null}
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
