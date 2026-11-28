import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { type ReactElement, type ReactNode, type RefObject, useRef } from "react";
import { Button } from "./Button.tsx";
import { POPUP_MOTION } from "./Tooltip.tsx";

/**
 * Dialog and AlertDialog on Base UI. Both are modal: focus is trapped, Escape closes, focus returns
 * to the trigger. The backdrop is a flat ink at low alpha with no blur. `contained` is for the
 * gallery only: the popup sits in its own cell (no backdrop, no fixed position) so one screenshot
 * shows it open.
 */

type Container = HTMLElement | RefObject<HTMLElement | null> | null;

const POPUP_BOX =
  "flex flex-col gap-4 rounded-lg border border-control-border bg-surface-raised p-6 font-sans text-ink outline-none";
const PAGE_POSITION =
  "fixed top-1/2 left-1/2 w-[28rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2";
const CONTAINED_POSITION = "relative w-full max-w-[28rem]";
const BACKDROP =
  "fixed inset-0 min-h-dvh bg-ink/40 transition-opacity duration-(--duration-ui) ease-(--ease-ui) data-ending-style:opacity-0 data-starting-style:opacity-0";
const TITLE = "font-display text-heading [font-stretch:var(--font-display-stretch)]";

export interface DialogProps {
  /** The element that opens the dialog (a button). Leave it out for a controlled dialog. */
  trigger?: ReactElement<Record<string, unknown>>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  /** Body text. */
  children: ReactNode;
  /** The action buttons; build them with `DialogClose` so they close the dialog. */
  actions: ReactNode;
  /** Gallery only: draw the popup in this container, without a backdrop or fixed position. */
  portalContainer?: Container;
  contained?: boolean;
  className?: string;
}

/** A button that closes the dialog it sits in. */
export function DialogClose({
  children,
  variant = "quiet",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "quiet";
  className?: string;
}) {
  return (
    <BaseDialog.Close render={<Button variant={variant} className={className} />}>
      {children}
    </BaseDialog.Close>
  );
}

export function Dialog({
  trigger,
  open,
  onOpenChange,
  title,
  children,
  actions,
  portalContainer,
  contained,
  className,
}: DialogProps) {
  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
      modal={contained ? false : true}
    >
      {trigger ? <BaseDialog.Trigger render={trigger} /> : null}
      <BaseDialog.Portal container={portalContainer ?? undefined}>
        {contained ? null : <BaseDialog.Backdrop className={BACKDROP} />}
        <BaseDialog.Popup
          initialFocus={contained ? false : undefined}
          className={`${POPUP_BOX} ${contained ? CONTAINED_POSITION : PAGE_POSITION} ${POPUP_MOTION}${className ? ` ${className}` : ""}`}
        >
          <BaseDialog.Title className={TITLE}>{title}</BaseDialog.Title>
          <BaseDialog.Description render={<div />} className="text-body text-ink-muted">
            {children}
          </BaseDialog.Description>
          <div className="flex flex-wrap justify-end gap-2">{actions}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export interface AlertDialogProps {
  trigger?: ReactElement<Record<string, unknown>>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  /** The destructive action; shown in the danger colour. */
  confirmLabel: string;
  /** The safe action; it has focus when the dialog opens. */
  cancelLabel: string;
  onConfirm?: () => void;
  portalContainer?: Container;
  contained?: boolean;
}

/**
 * The destructive confirmation (04-UI-SPEC "Destructive confirmation"). The safe action comes first
 * and has focus when the dialog opens, so pressing Enter by reflex keeps the learner's work.
 */
export function AlertDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  portalContainer,
  contained,
}: AlertDialogProps) {
  const keepRef = useRef<HTMLButtonElement>(null);
  // The real alert dialog is always modal. The gallery's static open state must not trap focus or
  // make the rest of the page inert, so it draws the same parts on a non-modal Dialog with the
  // alertdialog role.
  const P = contained ? BaseDialog : BaseAlertDialog;
  const onChange = onOpenChange ? (next: boolean) => onOpenChange(next) : undefined;
  const parts = (
    <P.Portal container={portalContainer ?? undefined}>
      {contained ? null : <P.Backdrop className={BACKDROP} />}
      <P.Popup
        initialFocus={contained ? false : keepRef}
        {...(contained ? { role: "alertdialog" } : {})}
        className={`${POPUP_BOX} ${contained ? CONTAINED_POSITION : PAGE_POSITION} ${POPUP_MOTION}`}
      >
        <P.Title className={TITLE}>{title}</P.Title>
        <P.Description className="text-body text-ink-muted">{description}</P.Description>
        <div className="flex flex-wrap justify-end gap-2">
          <P.Close render={<Button ref={keepRef} variant="primary" />}>{cancelLabel}</P.Close>
          <P.Close
            render={
              <Button variant="quiet" className="border-danger! text-danger!" onClick={onConfirm} />
            }
          >
            {confirmLabel}
          </P.Close>
        </div>
      </P.Popup>
    </P.Portal>
  );
  if (contained) {
    return (
      <BaseDialog.Root open={open} onOpenChange={onChange} modal={false}>
        {parts}
      </BaseDialog.Root>
    );
  }
  return (
    <BaseAlertDialog.Root open={open} onOpenChange={onChange}>
      {trigger ? <BaseAlertDialog.Trigger render={trigger} /> : null}
      {parts}
    </BaseAlertDialog.Root>
  );
}
