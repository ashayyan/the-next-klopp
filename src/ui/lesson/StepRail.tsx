import { CheckIcon } from "../icons/index.tsx";

/** The seven Lesson Loop steps, in order (04-UI-SPEC "Lesson Loop step rail"). */
export const LESSON_LOOP_STEPS = [
  { id: "hook", label: "Hook" },
  { id: "see-it", label: "See it" },
  { id: "touch-it", label: "Touch it" },
  { id: "predict", label: "Predict" },
  { id: "do-it", label: "Do it" },
  { id: "lock-it-in", label: "Lock it in" },
  { id: "connect-it", label: "Connect it" },
] as const;

export type LessonStepId = (typeof LESSON_LOOP_STEPS)[number]["id"];

/**
 * vertical: a column (a stage's side rail). strip: seven equal cells with a 2 px state bar.
 * row: one quiet line of labels. compact: "Touch it, step 3 of 7" plus a 7-segment bar.
 */
export type StepRailForm = "vertical" | "strip" | "row" | "compact";

/** A form per width band: below 768 px, from 768 px, from 1280 px. */
export interface StepRailForms {
  base: StepRailForm;
  md?: StepRailForm;
  xl?: StepRailForm;
}

export interface StepRailProps {
  current: LessonStepId;
  form: StepRailForm | StepRailForms;
  /** Show step numbers (a real sequence, so the numbers are honest). */
  numbered?: boolean;
  /** Forced look for the gallery, written to `data-state`. */
  state?: string;
  className?: string;
}

type Band = "base" | "md" | "xl";

// Literal class tables: Tailwind only generates classes it can read in the source.
const LIST: Record<StepRailForm, Record<Band, string>> = {
  vertical: {
    base: "flex flex-col gap-3",
    md: "md:flex md:flex-col md:gap-3",
    xl: "xl:flex xl:flex-col xl:gap-3",
  },
  strip: {
    base: "grid grid-cols-7 gap-2",
    md: "md:grid md:grid-cols-7 md:gap-2",
    xl: "xl:grid xl:grid-cols-7 xl:gap-2",
  },
  row: {
    base: "flex flex-wrap gap-x-5 gap-y-1",
    md: "md:flex md:flex-wrap md:gap-x-5 md:gap-y-1",
    xl: "xl:flex xl:flex-wrap xl:gap-x-5 xl:gap-y-1",
  },
  compact: { base: "hidden", md: "md:hidden", xl: "xl:hidden" },
};

const COMPACT: Record<Band, { on: string; off: string }> = {
  base: { on: "flex", off: "hidden" },
  md: { on: "md:flex", off: "md:hidden" },
  xl: { on: "xl:flex", off: "xl:hidden" },
};

// Each step carries a 2 px state line: on the left in the vertical rail, on top in the strip,
// none in the quiet row.
const ITEM: Record<StepRailForm, Record<Band, string>> = {
  vertical: {
    base: "border-l-2 border-t-0 py-1 pl-3 pt-1",
    md: "md:border-l-2 md:border-t-0 md:py-1 md:pl-3 md:pt-1",
    xl: "xl:border-l-2 xl:border-t-0 xl:py-1 xl:pl-3 xl:pt-1",
  },
  strip: {
    base: "border-t-2 border-l-0 pt-2 pl-0 pb-0",
    md: "md:border-t-2 md:border-l-0 md:pt-2 md:pl-0 md:pb-0",
    xl: "xl:border-t-2 xl:border-l-0 xl:pt-2 xl:pl-0 xl:pb-0",
  },
  row: {
    base: "border-0 p-0",
    md: "md:border-0 md:p-0",
    xl: "xl:border-0 xl:p-0",
  },
  compact: { base: "", md: "", xl: "" },
};

function bands(form: StepRailForm | StepRailForms): [Band, StepRailForm][] {
  const f = typeof form === "string" ? { base: form } : form;
  const out: [Band, StepRailForm][] = [["base", f.base]];
  if (f.md) out.push(["md", f.md]);
  if (f.xl) out.push(["xl", f.xl]);
  return out;
}

/**
 * The Lesson Loop step rail. One ordered list carries `aria-current="step"` on the current step;
 * the compact form below 768 px is a sentence plus a decorative 7-segment bar. Steps are not
 * links: there is no other step to open yet.
 */
export function StepRail({ current, form, numbered = false, state, className }: StepRailProps) {
  const index = LESSON_LOOP_STEPS.findIndex((s) => s.id === current);
  const currentStep = LESSON_LOOP_STEPS[index] ?? LESSON_LOOP_STEPS[0];
  const forms = bands(form);
  const listClass = forms.map(([band, f]) => LIST[f][band]).join(" ");
  const compactClass = forms
    .map(([band, f]) => (f === "compact" ? COMPACT[band].on : COMPACT[band].off))
    .join(" ");
  const itemClass = forms.map(([band, f]) => ITEM[f][band]).join(" ");

  return (
    <nav
      aria-label="Lesson steps"
      data-step-rail
      data-state={state}
      className={`text-label${className ? ` ${className}` : ""}`}
    >
      <ol className={listClass}>
        {LESSON_LOOP_STEPS.map((step, i) => {
          const status = i < index ? "complete" : i === index ? "current" : "upcoming";
          const isCurrent = status === "current";
          return (
            <li
              key={step.id}
              data-step={step.id}
              data-status={status}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex min-w-0 ${itemClass} ${
                isCurrent
                  ? numbered
                    ? "border-ink"
                    : "border-accent"
                  : status === "complete"
                    ? "border-ink-muted"
                    : "border-surface-panel"
              }`}
            >
              <span
                className={`inline-flex min-w-0 items-center gap-1.5 ${
                  isCurrent
                    ? `font-semibold text-ink${numbered ? " bg-surface-highlight px-1.5 text-surface-highlight-ink" : ""}`
                    : status === "complete"
                      ? "text-ink"
                      : "text-ink-muted"
                }`}
              >
                {numbered ? null : (
                  <span
                    aria-hidden="true"
                    className="inline-flex size-4 items-center justify-center"
                  >
                    {status === "complete" ? <CheckIcon className="size-4" /> : null}
                    {isCurrent ? <span className="size-2 rounded-sm bg-accent" /> : null}
                  </span>
                )}
                {numbered && status === "complete" ? <CheckIcon className="size-4" /> : null}
                {numbered ? <span className="font-mono tabular-nums">{i + 1}</span> : null}
                <span className="min-w-0">{step.label}</span>
                {status === "complete" ? <span className="sr-only">, done</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      <div className={`${compactClass} flex-col gap-1.5`} data-step-compact>
        <p>
          <span className="font-semibold">{currentStep.label}</span>
          {`, step ${index + 1} of ${LESSON_LOOP_STEPS.length}`}
        </p>
        {/* One SVG, not seven boxes: a progress bar, stretched to the rail's width. */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 70 4"
          preserveAspectRatio="none"
          className="block h-1 w-full"
        >
          {LESSON_LOOP_STEPS.map((step, i) => (
            <rect
              key={step.id}
              data-segment={i < index ? "done" : i === index ? "current" : "upcoming"}
              x={i * 10}
              y={0}
              width={9}
              height={4}
              className={
                i < index ? "fill-ink-muted" : i === index ? "fill-accent" : "fill-surface-panel"
              }
            />
          ))}
        </svg>
      </div>
    </nav>
  );
}
