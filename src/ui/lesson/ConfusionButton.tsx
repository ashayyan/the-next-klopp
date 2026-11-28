import { useId, useState } from "react";
import { Button, CONTROL_BASE } from "../Button.tsx";
import { QuestionIcon } from "../icons/index.tsx";
import { Popover } from "../Popover.tsx";

export interface ConfusionButtonProps {
  /** Classes for the heading inside the popover (a direction's display face). */
  headingClassName?: string;
  /** Forced look for the gallery, written to `data-state` on the trigger. */
  state?: string;
}

const HELPER = "In this preview the note is not stored. Saving arrives with the progress system.";

/**
 * "I'm confused here": a note popover that is honest about not saving yet (04-UI-SPEC "partial").
 * The trigger shows icon and text from 768 px and the icon alone below it; the text stays in the
 * accessible name at every width, and the tooltip echoes it. The typed note lives in component
 * state only: Save note stores and sends nothing, and closes the popover.
 */
export function ConfusionButton({ headingClassName, state }: ConfusionButtonProps) {
  const fieldId = useId();
  const helperId = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      tooltip="I'm confused here"
      title="What's confusing here?"
      titleClassName={headingClassName ?? "text-heading font-semibold"}
      trigger={
        <button
          type="button"
          data-state={state}
          className={`${CONTROL_BASE} min-w-11 rounded-md border border-control-border bg-transparent text-ink hov:bg-surface-panel data-popup-open:bg-surface-panel md:px-3`}
        >
          <QuestionIcon />
          <span className="max-md:sr-only">I'm confused here</span>
        </button>
      }
    >
      <label htmlFor={fieldId} className="text-label">
        Note (optional)
      </label>
      <textarea
        id={fieldId}
        name="confusion-note"
        rows={3}
        autoComplete="off"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-describedby={helperId}
        className="w-full resize-y rounded-sm border border-control-border bg-surface-page px-3 py-2 text-body text-ink outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus-ring"
      />
      <div>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Save note
        </Button>
      </div>
      <p id={helperId} className="text-label text-ink-muted">
        {HELPER}
      </p>
    </Popover>
  );
}
