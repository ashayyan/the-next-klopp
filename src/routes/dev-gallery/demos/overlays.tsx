import { Button } from "../../../ui/Button.tsx";
import { AlertDialog, Dialog, DialogClose } from "../../../ui/Dialog.tsx";
import { CloseIcon } from "../../../ui/icons/index.tsx";
import { Link } from "../../../ui/Link.tsx";
import { Popover } from "../../../ui/Popover.tsx";
import { ToastOnMount, ToastProvider, ToastViewport } from "../../../ui/Toast.tsx";
import { Tooltip } from "../../../ui/Tooltip.tsx";
import { useCellContainer } from "./controls.tsx";

// Overlays in the gallery. A static "open" state draws the popup inside its own cell (Base UI
// portal `container`, non-modal) so one screenshot shows it; the "interactive" states open the real
// modal on a click, to try focus, Escape and focus return.

const CLEAR_TITLE = "Clear this board?";
const CLEAR_BODY = "All players and arrows on this board will be removed. You can't undo this.";

// ---------------------------------------------------------------- dialog

export function DialogDemo({ state }: { state: string }) {
  const cell = useCellContainer();
  const actions = (
    <>
      <DialogClose>Not now</DialogClose>
      <DialogClose variant="primary">Save note</DialogClose>
    </>
  );
  const body = "This note stays on this device. You can edit or delete it later.";
  if (state === "interactive") {
    return (
      <Dialog
        trigger={<Button variant="quiet">Open dialog</Button>}
        title="Save to your notes?"
        actions={actions}
      >
        {body}
      </Dialog>
    );
  }
  return (
    <>
      <div ref={cell.ref} />
      {cell.el ? (
        <Dialog
          open
          contained
          portalContainer={cell.el}
          title="Save to your notes?"
          actions={actions}
        >
          {body}
        </Dialog>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- alert dialog

export function AlertDialogDemo({ state }: { state: string }) {
  const cell = useCellContainer();
  const props = {
    title: CLEAR_TITLE,
    description: CLEAR_BODY,
    confirmLabel: "Clear board",
    cancelLabel: "Keep board",
  };
  if (state === "interactive") {
    return (
      <AlertDialog
        {...props}
        trigger={
          <Button variant="quiet" className="border-danger! text-danger!">
            Clear board
          </Button>
        }
      />
    );
  }
  return (
    <>
      <div ref={cell.ref} />
      {cell.el ? <AlertDialog {...props} open contained portalContainer={cell.el} /> : null}
    </>
  );
}

// ---------------------------------------------------------------- popover

const GLOSSARY = [
  "A pressing trap leaves one passing lane open on purpose. The team wins the ball when the receiver takes the bait.",
  "The trap works because the nearest players close the lane behind the pass and the rest of the team squeezes up the pitch together.",
  "Watch the striker first: the way the striker curves a run decides which lane stays open and which one closes.",
  "Then watch the midfield line. If it stays deep the trap fails, because the receiver has time and a short pass behind the press.",
  "Last, watch the back line. A high line shortens the pitch for the opponent and gives the press room to work.",
  "Teams use this trap most against a back three or a goalkeeper who likes to play out from the back.",
  "It is risky: one missed step opens a long ball behind the line, so the team rehearses the trigger until it is automatic.",
];

export function PopoverDemo({ state }: { state: string }) {
  const cell = useCellContainer();
  const long = state === "long-text";
  return (
    <div ref={cell.ref} className={`relative w-full ${long ? "min-h-[36rem]" : "min-h-56"}`}>
      {cell.el ? (
        <Popover
          open
          portalContainer={cell.el}
          initialFocus={false}
          trigger={<Button variant="quiet">Pressing trap</Button>}
          title="Pressing trap"
        >
          {(long ? GLOSSARY : GLOSSARY.slice(0, 1)).map((p) => (
            <p key={p}>{p}</p>
          ))}
          {long ? (
            <Link href="#sources" variant="standalone">
              Open the source registry
            </Link>
          ) : null}
        </Popover>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- tooltip

export function TooltipDemo() {
  const cell = useCellContainer();
  return (
    <div ref={cell.ref} className="relative min-h-28 w-full">
      {cell.el ? (
        <Tooltip label="Close" open portalContainer={cell.el}>
          <Button variant="icon" aria-label="Close">
            <CloseIcon />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- toast

export function ToastDemo() {
  const cell = useCellContainer();
  return (
    <div ref={cell.ref} className="relative min-h-24 w-full">
      {cell.el ? (
        <ToastProvider timeout={0}>
          <ToastViewport portalContainer={cell.el} />
          <ToastOnMount title="Note saved" />
        </ToastProvider>
      ) : null}
    </div>
  );
}
