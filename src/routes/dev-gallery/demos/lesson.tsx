import { useEffect, useState } from "react";
import { SceneLayer } from "../../../pitch/glyphs/SceneLayer.tsx";
import { Legend } from "../../../pitch/legend/Legend.tsx";
import { Pitch } from "../../../pitch/Pitch.tsx";
import { StatCard } from "../../../ui/data/StatCard.tsx";
import { Badge, type BadgeKind } from "../../../ui/lesson/Badge.tsx";
import { ConfusionButton } from "../../../ui/lesson/ConfusionButton.tsx";
import { GlossaryCard } from "../../../ui/lesson/GlossaryCard.tsx";
import { ProgressRing } from "../../../ui/lesson/ProgressRing.tsx";
import { QuizOption, type QuizOptionState } from "../../../ui/lesson/QuizOption.tsx";
import { FocusToggle, ShellBar } from "../../../ui/lesson/ShellBar.tsx";
import { LESSON_LOOP_STEPS, type LessonStepId, StepRail } from "../../../ui/lesson/StepRail.tsx";
import { Surface, type SurfaceLevel } from "../../../ui/Surface.tsx";
import type { ThemeChoice } from "../../../ui/theme.ts";
import { useCellContainer } from "./controls.tsx";
import { GALLERY_BOARD } from "./pitch.tsx";

// Lesson primitives in the gallery (04-UI-SPEC "/dev/gallery contract", Lesson rows).

/** True from 768 px: the bar's wide form. Server and first paint say false. */
function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    setWide(query.matches);
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return wide;
}

// ---------------------------------------------------------------- shell bar

export function ShellBarDemo({ state }: { state: string }) {
  const cell = useCellContainer();
  const wide = useWide();
  const [focus, setFocus] = useState(state === "focus-mode-on");
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const open = state === "overflow-menu-open";
  return (
    <div ref={cell.ref} className={`relative w-full ${open ? "min-h-72" : ""}`}>
      <ShellBar
        minutes={12}
        focus={focus}
        onFocusChange={setFocus}
        theme={theme}
        onThemeChange={setTheme}
        confusion={<ConfusionButton />}
        className="border-control-border border-b"
        wordmarkClassName="font-display font-semibold"
        openMenu={open && cell.el ? (wide ? "theme" : "overflow") : undefined}
        menuContainer={open ? cell.el : undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------- step rail

/** Each of the seven steps current; "compact" is the sentence-and-bar form of below 768 px, at every width. */
export function StepRailDemo({ state }: { state: string }) {
  const step = LESSON_LOOP_STEPS.find((s) => s.id === state)?.id;
  if (!step) {
    return <StepRail current="touch-it" form="compact" className="w-full max-w-sm" />;
  }
  const current: LessonStepId = step;
  return <StepRail current={current} form={{ base: "compact", md: "strip" }} className="w-full" />;
}

// ---------------------------------------------------------------- focus toggle

export function FocusToggleDemo({ state }: { state: string }) {
  const [on, setOn] = useState(state === "on");
  return <FocusToggle checked={on} onCheckedChange={setOn} />;
}

// ---------------------------------------------------------------- confusion button

export function ConfusionButtonDemo({ state }: { state: string }) {
  const cell = useCellContainer();
  const open = state !== "idle";
  return (
    <div ref={cell.ref} className={`relative w-full ${open ? "min-h-[32rem]" : ""}`}>
      {open && !cell.el ? null : (
        <ConfusionButton
          initialOpen={open}
          initialNote={state === "note-typed" ? "Why does the far winger stay wide here?" : ""}
          portalContainer={open ? cell.el : undefined}
          initialFocus={open ? false : undefined}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- glossary card

const SHORT =
  "Winning the ball back within a few seconds of losing it, close to where it was lost.";
const LONG =
  "A pressing trap leaves one passing lane open on purpose. The team wins the ball when the receiver takes the bait: the nearest players close the lane behind the pass and the rest of the team squeezes up the pitch together. It is risky, because one missed step opens a long ball behind the line, so the team rehearses the trigger until it is automatic.";

function MiniPitch() {
  return (
    <Pitch title="A six-player shape" length={105} width={68}>
      <SceneLayer scene={GALLERY_BOARD} t={0} mode="smooth" />
    </Pitch>
  );
}

/** The card as the popover shows it: title, definition, and for "mini-pitch" a 240 px static pitch. */
export function GlossaryCardDemo({ state }: { state: string }) {
  const long = state === "long-definition";
  const shape = state === "mini-pitch";
  const term = long ? "Pressing trap" : shape ? "Shape" : "Gegenpress";
  const definition = long
    ? LONG
    : shape
      ? "The way a team arranges its players when it has the ball or does not."
      : SHORT;
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-72 max-w-full flex-col gap-3 rounded-md border border-control-border bg-surface-raised p-4">
        <p className="font-semibold text-heading">{term}</p>
        <GlossaryCard
          term={term}
          definition={definition}
          visual={shape ? <MiniPitch /> : undefined}
        />
      </div>
      {/* A pitch is never shown without the key to its marks. */}
      {shape ? (
        <div className="w-72 max-w-full">
          <Legend
            scene={GALLERY_BOARD}
            density={false}
            sticky={false}
            columnsClassName="grid-cols-1"
          />
        </div>
      ) : null}
    </div>
  );
}

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

// ---------------------------------------------------------------- progress ring

/** 0, 40 and 100 percent of ten concepts beside their words, and the stacked form with "4 of 10 concepts". */
export function ProgressRingDemo({ state }: { state: string }) {
  if (state === "0-percent") return <ProgressRing value={0} max={10} label="0 of 10 concepts" />;
  if (state === "100-percent") {
    return <ProgressRing value={10} max={10} label="10 of 10 concepts" />;
  }
  if (state === "labelled") {
    return <ProgressRing value={4} max={10} label="4 of 10 concepts" stacked size={96} />;
  }
  return <ProgressRing value={4} max={10} label="4 of 10 concepts" />;
}

// ---------------------------------------------------------------- badge

const BADGES: Record<string, { kind: BadgeKind; text: string }> = {
  neutral: { kind: "neutral", text: "Chapter 2" },
  done: { kind: "done", text: "Done" },
  new: { kind: "new", text: "New" },
};

export function BadgeDemo({ state }: { state: string }) {
  const badge = BADGES[state] ?? { kind: "neutral" as const, text: "Chapter 2" };
  return (
    <p className="flex items-center gap-2 text-body">
      <span>Pressing triggers</span>
      <Badge kind={badge.kind}>{badge.text}</Badge>
    </p>
  );
}

// ---------------------------------------------------------------- surface

const SURFACES: Record<string, { text: string; note: string; level: SurfaceLevel }> = {
  page: { text: "Page", note: "--surface-page. Lessons and screens sit on it.", level: "page" },
  panel: {
    text: "Panel",
    note: "--surface-panel. Steps up one tone: rails, stat cards, tables.",
    level: "panel",
  },
  raised: {
    text: "Raised",
    note: "--surface-raised. Overlays, the table header, the highlight block.",
    level: "raised",
  },
  sheet: {
    text: "Sheet",
    note: "Raised plus --shadow-sheet, which is none when elevation is tone only.",
    level: "raised",
  },
};

export function SurfaceDemo({ state }: { state: string }) {
  if (state === "stat-card") {
    return (
      <StatCard
        figures={[
          { value: "14", label: "passes into the box" },
          { value: "1.8", unit: "xG", label: "chances created" },
        ]}
      />
    );
  }
  const copy = SURFACES[state] ?? { text: "Page", note: "", level: "page" as const };
  return (
    <Surface
      level={copy.level}
      sheet={state === "sheet"}
      className={`flex w-full max-w-[28rem] flex-col gap-1 p-4 ${copy.level === "page" ? "border border-control-border" : ""}`}
    >
      <p className="font-semibold text-body">{copy.text}</p>
      <p className="text-label text-ink-muted">{copy.note}</p>
    </Surface>
  );
}
