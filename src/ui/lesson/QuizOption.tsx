import type { ReactNode } from "react";
import { CONTROL_BASE } from "../Button.tsx";
import { CheckIcon, CrossIcon } from "../icons/index.tsx";

/** Copy for the two answers (04-UI-SPEC Copywriting Contract "Quiz feedback"). */
export const QUIZ_CORRECT = "Correct";
export const QUIZ_INCORRECT = "Not quite — here is the answer";

export type QuizOptionState =
  | "idle"
  | "hover"
  | "focus"
  | "selected"
  | "correct"
  | "incorrect"
  | "disabled";

export interface QuizOptionProps {
  label: ReactNode;
  /**
   * idle to selected are the choosing looks; correct and incorrect are the revealed answers (icon and
   * words, never colour alone); disabled is an option after the reveal. hover and focus are forced
   * looks for the gallery, written to `data-state`.
   */
  state?: QuizOptionState;
  onSelect?: () => void;
  className?: string;
}

const BASE = `${CONTROL_BASE} w-full justify-start gap-3 rounded-md border bg-transparent px-3 py-2 text-left text-body text-ink`;

/**
 * One answer choice: a 44 px row. Selected carries the accent marker. After the reveal the right
 * answer shows the check icon and "Correct"; a wrong pick shows the cross icon and "Not quite — here
 * is the answer". There is no shake, bounce or confetti. A revealed option stays readable and
 * focusable (it is announced with its feedback) but does nothing; a disabled option is muted and
 * leaves the tab order. The learner still reads a disabled option to understand the answer, so it
 * is muted once (ink-muted, at least 4.5:1) and the control base's 50 % disabled opacity is cancelled.
 */
export function QuizOption({ label, state = "idle", onSelect, className }: QuizOptionProps) {
  const revealed = state === "correct" || state === "incorrect";
  const forced = state === "hover" ? "hover" : state === "focus" ? "focus-visible" : undefined;
  const look =
    state === "selected"
      ? "border-2 border-ink"
      : state === "correct"
        ? "border-2 border-ink bg-surface-panel"
        : state === "incorrect"
          ? "border-control-border border-dashed bg-surface-panel"
          : "border-control-border hov:bg-surface-panel";

  return (
    <button
      type="button"
      data-quiz-option
      data-state={forced}
      data-answer={revealed ? state : undefined}
      aria-pressed={state === "selected" ? true : revealed ? undefined : false}
      aria-disabled={revealed ? true : undefined}
      disabled={state === "disabled"}
      onClick={revealed ? undefined : onSelect}
      className={`${BASE} ${look}${state === "disabled" ? " text-ink-muted disabled:opacity-100!" : ""}${className ? ` ${className}` : ""}`}
    >
      <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center">
        {state === "selected" ? <span className="size-3 rounded-sm bg-accent" /> : null}
        {state === "correct" ? <CheckIcon className="size-4" /> : null}
        {state === "incorrect" ? <CrossIcon className="size-4" /> : null}
      </span>
      <span className="flex min-w-0 flex-col">
        <span>{label}</span>
        {revealed ? (
          <span data-quiz-feedback className="font-semibold text-label">
            {state === "correct" ? QUIZ_CORRECT : QUIZ_INCORRECT}
          </span>
        ) : null}
      </span>
    </button>
  );
}
