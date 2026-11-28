import { useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { SceneLayer } from "../../pitch/glyphs/SceneLayer.tsx";
import { describeScene } from "../../pitch/legend/glyphIds.ts";
import { Legend } from "../../pitch/legend/Legend.tsx";
import { Pitch } from "../../pitch/Pitch.tsx";
import { autoOrientation } from "../../pitch/view.ts";
import type { Scene, ScenePoint } from "../../scene/schema.ts";
import { parseScene } from "../../scene/validate.ts";
import { Button } from "../../ui/Button.tsx";
import { ConfusionButton } from "../../ui/lesson/ConfusionButton.tsx";
import { GlossaryTerm } from "../../ui/lesson/GlossaryCard.tsx";
import { StepRail, type StepRailForms } from "../../ui/lesson/StepRail.tsx";
import { Segmented } from "../../ui/Segmented.tsx";
import { type Direction, DirectionScope, DirectionShellBar } from "./DirectionScope.tsx";
import {
  type Line,
  lineOf,
  morphLengthMs,
  morphPositions,
  parseDurationMs,
  parseEase,
} from "./morph.ts";
import rawCity from "./scenes/city-2022-23-shapes.json";
import { DISPLAY, useMeasuredWidth } from "./shared.ts";

// Screen 1 of 04-UI-SPEC: the tactics lesson ("concept" template, Lesson Loop step 3: Touch it).
// The content blocks and copy are fixed for all three directions; only the layout wrappers differ.

export type ShapeState = "without" | "with";

const SHAPES: Record<
  ShapeState,
  { t: number; frame: number; formation: string; title: string; announcement: string }
> = {
  without: {
    t: 0,
    frame: 0,
    formation: "4-4-2",
    title: "Manchester City shape, without the ball",
    announcement: "Shape now 4-4-2.",
  },
  with: {
    t: 1,
    frame: 1,
    formation: "3-2-4-1",
    title: "Manchester City shape, with the ball",
    announcement: "Shape now 3-2-4-1. Stones moved into midfield.",
  },
};

const POSSESSION_OPTIONS = [
  { value: "without", label: "Without the ball" },
  { value: "with", label: "With the ball" },
] as const;

const SOURCE_LINE =
  "Source: The Analyst (Stats Perform), “John Stones’ centre-midfield and centre-back hybrid role”, 2023. Positions are illustrative, drawn from that description.";

function loadCity(): Scene {
  // The fixture is checked by parseScene (Zod plus integrity rules) before anything draws it.
  const parsed = parseScene(rawCity);
  if (!parsed.ok) throw new Error("The City shapes scene does not pass the scene validator.");
  return parsed.scene;
}

const CITY = loadCity();

/** Each player's line from the frame-0 role code: the morph moves the lines from the back. */
const LINES: Readonly<Record<string, Line>> = Object.fromEntries(
  CITY.entities.map((e) => [e.id, lineOf(e)]),
);

function framePositions(state: ShapeState): Readonly<Record<string, ScenePoint>> {
  return CITY.frames[SHAPES[state].frame]?.positions ?? {};
}

/** Copywriting Contract glossary definitions. */
const GLOSSARY = {
  "4-4-2":
    "Four defenders, four midfielders and two forwards, counted from the back. The goalkeeper is not counted.",
  "3-2-4-1": "Three at the back, two in front of them, four further up, one striker.",
  "centre-back": "A defender who plays in the middle of the back line.",
} as const;

/**
 * A 240 px static pitch of one frame for a formation card. No legend inside the card: the page
 * legend sits next to the body that opens it.
 */
function MiniPitch({ shape }: { shape: ShapeState }) {
  const s = SHAPES[shape];
  return (
    <Pitch
      title={`Manchester City ${s.formation}, ${shape === "with" ? "with" : "without"} the ball`}
      initialCssWidth={240}
    >
      <SceneLayer scene={CITY} t={s.t} mode="stepped" />
    </Pitch>
  );
}

/** `?state=with` opens the in-possession frame; anything else opens without the ball. */
export function shapeFromQuery(param: string | null): ShapeState {
  return param === "with" ? "with" : "without";
}

/** Every block of the screen, built once; a direction layout only decides where each one sits. */
interface Blocks {
  shell: (className: string) => ReactNode;
  /** The step rail in the given forms, or null in focus mode. */
  rail: (form: StepRailForms, numbered?: boolean) => ReactNode;
  title: ReactNode;
  context: ReactNode;
  heading: ReactNode;
  body: ReactNode;
  pitch: ReactNode;
  toggle: (className: string, optionClassName?: string) => ReactNode;
  readout: (className: string) => ReactNode;
  legend: (columnsClassName: string) => ReactNode;
  /** The source line, or null in focus mode. */
  source: ReactNode;
  cta: (className: string) => ReactNode;
}

/**
 * floodlit: a stage. At 1440 the title runs across the top, then a 12-column grid: step rail
 * (2 columns, about 200 px), the pitch at the largest size of the three directions (7) and the
 * reading column (3, 320 px). Below 1280 px the two columns dissolve (`contents`) and `order`
 * sets the 768 and 375 sequences of 04-UI-SPEC; the DOM keeps the 1440 reading order.
 */
function FloodlitLayout({ b }: { b: Blocks }) {
  return (
    <>
      {b.shell("px-4 md:px-6 xl:px-8")}
      <main>
        <div className="wrap flex flex-col gap-6 px-4 pt-2 pb-16 md:px-6 md:pt-4 xl:grid xl:grid-cols-12 xl:gap-x-8 xl:gap-y-6 xl:px-8 xl:pt-6">
          <div className="order-2 flex flex-col gap-1 xl:order-none xl:col-span-12">
            {b.title}
            {b.context}
          </div>
          <div className="order-1 xl:order-none xl:col-span-2">
            <div className="xl:sticky xl:top-6">
              {b.rail({ base: "compact", md: "strip", xl: "vertical" })}
            </div>
          </div>
          <div className="contents xl:col-span-7 xl:flex xl:min-w-0 xl:flex-col xl:gap-6">
            <div className="order-4 md:order-3 xl:order-none">{b.pitch}</div>
            <div className="order-5 flex flex-col gap-4 md:order-4 md:flex-row md:items-center md:justify-between xl:order-none xl:flex-col xl:justify-start">
              {b.toggle("w-full md:w-auto")}
              {b.readout("")}
            </div>
          </div>
          <div className="contents xl:col-span-3 xl:flex xl:min-w-0 xl:flex-col xl:gap-6">
            <div
              data-lesson-step
              className="contents xl:flex xl:flex-col xl:gap-2 [&>h2]:order-3 md:[&>h2]:order-5 [&>p]:order-6 xl:[&>*]:order-none"
            >
              {b.heading}
              {b.body}
            </div>
            <div className="order-7 xl:order-none">
              {b.legend("grid-cols-1 md:grid-cols-2 xl:grid-cols-1")}
            </div>
            {b.source ? <div className="order-8 xl:order-none">{b.source}</div> : null}
            <div className="order-9 xl:order-none xl:mt-auto">{b.cta("w-full xl:w-auto")}</div>
          </div>
        </div>
      </main>
    </>
  );
}

/** A yellow fill in `programme` carries a 2 px ink border in light, so its edge never relies on 1.4:1. */
const INK_EDGE_LIGHT = "border-2 border-transparent in-data-[theme=light]:border-ink";
const RULE = "border-ink [border-width:var(--border-rule)]";

/**
 * programme: a matchday programme spread. A 3 px ink rule under the top bar and under the
 * masthead, then a 12-column 4/8 split: the "team sheet" block (step, toggle, readout in the yellow
 * block, source, CTA) and the pitch printed in a 3 px ink frame with the legend in 3 columns.
 * At 768 a 2-column grid puts the team sheet beside the readout block under the pitch; at 375 the
 * readout block leads the pitch (04-UI-SPEC per-direction table).
 */
function ProgrammeLayout({ b }: { b: Blocks }) {
  return (
    <>
      {b.shell("border-ink border-b-[length:var(--border-rule)] px-4 md:px-6 xl:px-8")}
      <main>
        <div className="wrap flex flex-col gap-6 px-4 pt-4 pb-16 md:grid md:grid-cols-2 md:gap-x-6 md:px-6 md:pt-6 xl:grid-cols-12 xl:gap-x-8 xl:gap-y-8 xl:px-8">
          <div className="order-1 flex flex-col gap-4 border-ink border-b-[length:var(--border-rule)] pb-4 md:col-span-2 xl:order-none xl:col-span-12 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
            <div className="flex flex-col gap-1">
              {b.title}
              {b.context}
            </div>
            {b.rail({ base: "compact", md: "strip" }, true)}
          </div>
          <div className="contents xl:col-span-4 xl:flex xl:min-w-0 xl:flex-col xl:gap-6">
            <div className="contents md:order-4 md:flex md:min-w-0 md:flex-col md:gap-4 xl:order-none">
              <div
                data-lesson-step
                className="contents md:flex md:flex-col md:gap-2 [&>h2]:order-6 [&>p]:order-7 md:[&>*]:order-none"
              >
                {b.heading}
                {b.body}
              </div>
              <div className="order-5 md:order-none">{b.toggle("w-full")}</div>
            </div>
            <div className="order-3 md:order-5 md:self-start xl:order-none">
              {b.readout(
                `bg-surface-highlight px-4 py-3 text-surface-highlight-ink ${INK_EDGE_LIGHT}`,
              )}
            </div>
            {b.source ? (
              <div className="order-9 md:order-7 md:col-span-2 xl:order-none">{b.source}</div>
            ) : null}
            <div className="order-10 md:order-8 md:col-span-2 xl:order-none">
              {b.cta("w-full xl:w-auto")}
            </div>
          </div>
          <div className="contents xl:col-span-8 xl:flex xl:min-w-0 xl:flex-col xl:gap-6">
            <div className={`order-4 md:order-3 md:col-span-2 xl:order-none ${RULE}`}>
              {b.pitch}
            </div>
            <div className="order-8 md:order-6 md:col-span-2 xl:order-none">
              {b.legend("grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/**
 * notebook: one raised sheet on a sage page. At 1440 the sheet holds the head, then a 720 px main
 * column (step, pitch, toggle and readout) beside a 280 px margin (legend, source) with a quiet
 * rule, and the CTA at the sheet's bottom right. At 768 the sheet fills the width; at 375 it is
 * flush and the 35-word body leads the pitch: a "read, then see" direction.
 */
function NotebookLayout({ b }: { b: Blocks }) {
  return (
    <>
      {b.shell("px-4 md:px-6 xl:mx-auto xl:max-w-[1144px] xl:px-0")}
      <main>
        <div className="wrap md:px-6 md:pb-16 xl:px-8">
          <div className="flex flex-col gap-6 bg-surface-raised px-4 pt-4 pb-8 md:rounded-lg md:p-8 md:[box-shadow:var(--shadow-sheet)] xl:mx-auto xl:max-w-[1144px] xl:p-12">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                {b.title}
                {b.context}
              </div>
              {b.rail({ base: "compact", md: "row" })}
            </div>
            <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[720px_280px] xl:gap-12">
              <div className="flex min-w-0 flex-col gap-6">
                <div data-lesson-step className="flex flex-col gap-2">
                  {b.heading}
                  {b.body}
                </div>
                {b.pitch}
                <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
                  {b.toggle("w-full md:w-auto")}
                  {b.readout("")}
                </div>
              </div>
              <aside
                aria-label="Margin"
                className="flex min-w-0 flex-col gap-6 xl:border-control-border xl:border-l xl:pl-6"
              >
                {b.legend("grid-cols-1 md:grid-cols-2 xl:grid-cols-1")}
                {b.source}
              </aside>
            </div>
            <div className="flex xl:justify-end">{b.cta("w-full xl:w-auto")}</div>
          </div>
        </div>
      </main>
    </>
  );
}

const LAYOUTS = {
  floodlit: FloodlitLayout,
  programme: ProgrammeLayout,
  notebook: NotebookLayout,
} as const;

export function TacticsScreen({ direction }: { direction: Direction }) {
  const [params] = useSearchParams();
  const reduced = useReducedMotion() === true;
  const [initial] = useState<ShapeState>(() => shapeFromQuery(params.get("state")));
  const [focus, setFocus] = useState(() => params.get("focus") === "1");
  // `target` is what the toggle shows; `settled` is the shape the readout, title and live region
  // report, which changes at the end of the morph. `moving` holds the in-between positions.
  const [target, setTarget] = useState<ShapeState>(initial);
  const [settled, setSettled] = useState<ShapeState>(initial);
  const [moving, setMoving] = useState<Readonly<Record<string, ScenePoint>> | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [stageRef, stageWidth] = useMeasuredWidth(840);
  const lastPositions = useRef<Readonly<Record<string, ScenePoint>>>(framePositions(initial));
  const frame = useRef<number | null>(null);
  const current = SHAPES[settled];
  const orientation = autoOrientation(stageWidth);
  const description = useMemo(() => describeScene(CITY), []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  /** One requestAnimationFrame loop per change; positions are f(elapsed) (ADR 0009). */
  const changeShape = (next: ShapeState) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setTarget(next);
    const to = framePositions(next);
    const finish = () => {
      lastPositions.current = to;
      setMoving(null);
      setSettled(next);
      setAnnouncement(SHAPES[next].announcement);
    };
    if (reduced) {
      finish();
      return;
    }
    // Motion tokens are read from the direction root, so each direction moves its own way.
    const tokens = getComputedStyle(stageRef.current ?? document.documentElement);
    const durationMs = parseDurationMs(tokens.getPropertyValue("--duration-morph"), 640);
    const staggerMs = parseDurationMs(tokens.getPropertyValue("--stagger-line"), 0);
    const ease = parseEase(tokens.getPropertyValue("--ease-morph"));
    const total = morphLengthMs(durationMs, staggerMs);
    const from = lastPositions.current;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const elapsedMs = now - start;
      if (elapsedMs >= total) {
        frame.current = null;
        finish();
        return;
      }
      const positions = Object.fromEntries(
        morphPositions({ from, to, lines: LINES, elapsedMs, durationMs, staggerMs, ease }),
      );
      lastPositions.current = positions;
      setMoving(positions);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  const blocks: Blocks = {
    shell: (className) => (
      <DirectionShellBar
        confusion={<ConfusionButton headingClassName={`${DISPLAY} text-heading`} />}
        minutes={6}
        focus={focus}
        onFocusChange={setFocus}
        className={className}
        wordmarkClassName={DISPLAY}
      />
    ),
    rail: (form, numbered) =>
      focus ? null : <StepRail current="touch-it" form={form} numbered={numbered} />,
    title: <h1 className={`${DISPLAY} text-display text-balance`}>One team, two shapes</h1>,
    context: <p className="text-label text-ink-muted">Manchester City, Premier League 2022/23</p>,
    heading: <h2 className={`${DISPLAY} text-heading`}>Flip the shape</h2>,
    body: (
      <p className="max-w-[65ch] text-body">
        Without the ball, City defended as a{" "}
        <GlossaryTerm
          term="4-4-2"
          definition={GLOSSARY["4-4-2"]}
          titleClassName={`${DISPLAY} text-heading`}
          visual={<MiniPitch shape="without" />}
        >
          4-4-2
        </GlossaryTerm>
        . With it, John Stones stepped up from{" "}
        <GlossaryTerm
          term="Centre-back"
          definition={GLOSSARY["centre-back"]}
          titleClassName={`${DISPLAY} text-heading`}
        >
          centre-back
        </GlossaryTerm>{" "}
        into midfield and the shape became a{" "}
        <GlossaryTerm
          term="3-2-4-1"
          definition={GLOSSARY["3-2-4-1"]}
          titleClassName={`${DISPLAY} text-heading`}
          visual={<MiniPitch shape="with" />}
        >
          3-2-4-1
        </GlossaryTerm>
        . Flip the switch and watch who moves.
      </p>
    ),
    pitch: (
      <div
        ref={stageRef}
        data-stage
        data-morphing={moving ? "" : undefined}
        className="min-w-0 [&_[data-layer=shapes]]:transition-opacity [&_[data-layer=shapes]]:duration-(--duration-ui) [&_[data-layer=shapes]]:ease-(--ease-ui) [&[data-morphing]_[data-layer=shapes]]:opacity-0"
      >
        <Pitch title={current.title} desc={description} orientation={orientation}>
          <SceneLayer
            scene={CITY}
            t={SHAPES[moving ? target : settled].t}
            mode="stepped"
            positions={moving ?? undefined}
          />
        </Pitch>
        <p aria-live="polite" data-announcer className="sr-only">
          {announcement}
        </p>
      </div>
    ),
    toggle: (className, optionClassName) => (
      <Segmented
        label="Possession"
        options={POSSESSION_OPTIONS}
        value={target}
        onValueChange={changeShape}
        className={className}
        optionClassName={optionClassName}
      />
    ),
    readout: (className) => (
      <p data-readout="shape" className={`${DISPLAY} text-heading ${className}`}>
        Shape now: <span className="font-mono font-semibold tabular-nums">{current.formation}</span>
      </p>
    ),
    legend: (columnsClassName) => (
      <Legend scene={CITY} density={false} sticky={false} columnsClassName={columnsClassName} />
    ),
    source: focus ? null : <p className="text-label text-ink-muted">{SOURCE_LINE}</p>,
    cta: (className) => (
      <Button variant="primary" className={className}>
        Continue to Predict
      </Button>
    ),
  };

  const Layout = LAYOUTS[direction.id];

  return (
    <DirectionScope direction={direction}>
      <Layout b={blocks} />
    </DirectionScope>
  );
}
