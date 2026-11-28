import { QuizOption, type QuizOptionState } from "../../../ui/lesson/QuizOption.tsx";

// Lesson primitives in the gallery (04-UI-SPEC "/dev/gallery contract", Lesson rows).

// ---------------------------------------------------------------- quiz option

const QUESTION = "Which pressing trigger do you start from?";
const CHOICES = ["A back pass to the goalkeeper", "A throw-in on the far side"] as const;

const QUIZ_STATES: readonly QuizOptionState[] = [
  "idle",
  "hover",
  "focus",
  "selected",
  "correct",
  "incorrect",
  "disabled",
];

/** One state of the quiz option: the state under test above a plain neighbour that shows the contrast. */
export function QuizOptionDemo({ state }: { state: string }) {
  const known = QUIZ_STATES.find((s) => s === state) ?? "idle";
  return (
    <div className="flex w-full max-w-[28rem] flex-col gap-2">
      <p className="text-label text-ink-muted">{QUESTION}</p>
      <QuizOption label={CHOICES[0]} state={known} />
      <QuizOption label={CHOICES[1]} state={known === "disabled" ? "disabled" : "idle"} />
    </div>
  );
}
