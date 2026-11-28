import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { SceneLayer } from "../../pitch/glyphs/SceneLayer.tsx";
import { describeScene } from "../../pitch/legend/glyphIds.ts";
import { Legend } from "../../pitch/legend/Legend.tsx";
import { Pitch } from "../../pitch/Pitch.tsx";
import { autoOrientation } from "../../pitch/view.ts";
import type { Scene } from "../../scene/schema.ts";
import { parseScene } from "../../scene/validate.ts";
import { Button } from "../../ui/Button.tsx";
import { Segmented } from "../../ui/Segmented.tsx";
import { type Direction, DirectionScope } from "./DirectionScope.tsx";
import rawCity from "./scenes/city-2022-23-shapes.json";

// Screen 1 of 04-UI-SPEC: the tactics lesson ("concept" template, Lesson Loop step 3: Touch it).
// The content blocks and copy are fixed for all three directions; only the layout wrappers differ.

export type ShapeState = "without" | "with";

const SHAPES: Record<ShapeState, { t: number; formation: string; title: string }> = {
  without: { t: 0, formation: "4-4-2", title: "Manchester City shape, without the ball" },
  with: { t: 1, formation: "3-2-4-1", title: "Manchester City shape, with the ball" },
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

/** `?state=with` opens the in-possession frame; anything else opens without the ball. */
export function shapeFromQuery(param: string | null): ShapeState {
  return param === "with" ? "with" : "without";
}

/** The pitch container's CSS width, measured, so orientation follows the space it has. */
function useMeasuredWidth(initial: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined && w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Every block of the screen, built once; a direction layout only decides where each one sits. */
interface Blocks {
  wordmark: ReactNode;
  title: ReactNode;
  context: ReactNode;
  heading: ReactNode;
  body: ReactNode;
  pitch: ReactNode;
  toggle: (className: string, optionClassName?: string) => ReactNode;
  readout: (className: string) => ReactNode;
  legend: (columnsClassName: string) => ReactNode;
  source: ReactNode;
  cta: (className: string) => ReactNode;
}

const DISPLAY = "font-display [font-stretch:var(--font-display-stretch)]";

/**
 * floodlit: a stage. At 1440 the title runs across the top, then a 12-column grid: step rail
 * (2 columns, about 200 px), the pitch at the largest size of the three directions (7) and the
 * reading column (3, 320 px). Below 1280 px the two columns dissolve (`contents`) and `order`
 * sets the 768 and 375 sequences of 04-UI-SPEC; the DOM keeps the 1440 reading order.
 */
function FloodlitLayout({ b }: { b: Blocks }) {
  return (
    <>
      <header className="flex h-14 items-center px-4 md:px-6 xl:px-8">{b.wordmark}</header>
      <main>
        <div className="wrap flex flex-col gap-6 px-4 pt-2 pb-16 md:px-6 md:pt-4 xl:grid xl:grid-cols-12 xl:gap-x-8 xl:gap-y-6 xl:px-8 xl:pt-6">
          <div className="order-2 flex flex-col gap-1 xl:order-none xl:col-span-12">
            {b.title}
            {b.context}
          </div>
          {/* Step rail column: the Lesson Loop rail arrives with the lesson chrome (04-08). */}
          <div data-rail-slot className="hidden xl:col-span-2 xl:block" />
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
            <div className="order-8 xl:order-none">{b.source}</div>
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
      <header className="flex h-14 items-center border-ink border-b-[length:var(--border-rule)] px-4 md:px-6 xl:px-8">
        {b.wordmark}
      </header>
      <main>
        <div className="wrap flex flex-col gap-6 px-4 pt-4 pb-16 md:grid md:grid-cols-2 md:gap-x-6 md:px-6 md:pt-6 xl:grid-cols-12 xl:gap-x-8 xl:gap-y-8 xl:px-8">
          <div className="order-1 flex flex-col gap-1 border-ink border-b-[length:var(--border-rule)] pb-4 md:col-span-2 xl:order-none xl:col-span-12">
            {b.title}
            {b.context}
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
              <div className="order-5 md:order-none">
                {b.toggle(
                  "w-full",
                  "border-2 border-transparent in-data-[theme=light]:data-pressed:border-ink",
                )}
              </div>
            </div>
            <div className="order-3 md:order-5 md:self-start xl:order-none">
              {b.readout(
                `bg-surface-highlight px-4 py-3 text-surface-highlight-ink ${INK_EDGE_LIGHT}`,
              )}
            </div>
            <div className="order-9 md:order-7 md:col-span-2 xl:order-none">{b.source}</div>
            <div className="order-10 md:order-8 md:col-span-2 xl:order-none">
              {b.cta(`w-full xl:w-auto ${INK_EDGE_LIGHT}`)}
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
      <header className="flex h-14 items-center px-4 md:px-6 xl:mx-auto xl:max-w-[1144px] xl:px-0">
        {b.wordmark}
      </header>
      <main>
        <div className="wrap md:px-6 md:pb-16 xl:px-8">
          <div className="flex flex-col gap-6 bg-surface-raised px-4 pt-4 pb-8 md:rounded-lg md:p-8 md:[box-shadow:var(--shadow-sheet)] xl:mx-auto xl:max-w-[1144px] xl:p-12">
            <div className="flex flex-col gap-1">
              {b.title}
              {b.context}
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
  const [shape, setShape] = useState<ShapeState>(() => shapeFromQuery(params.get("state")));
  const [stageRef, stageWidth] = useMeasuredWidth(840);
  const current = SHAPES[shape];
  const orientation = autoOrientation(stageWidth);
  const description = useMemo(() => describeScene(CITY), []);

  const blocks: Blocks = {
    wordmark: <span className={`${DISPLAY} text-heading`}>The Next Klopp</span>,
    title: <h1 className={`${DISPLAY} text-display text-balance`}>One team, two shapes</h1>,
    context: <p className="text-label text-ink-muted">Manchester City, Premier League 2022/23</p>,
    heading: <h2 className={`${DISPLAY} text-heading`}>Flip the shape</h2>,
    body: (
      <p className="max-w-[65ch] text-body">
        Without the ball, City defended as a <span className="whitespace-nowrap">4-4-2</span>. With
        it, John Stones stepped up from <span className="whitespace-nowrap">centre-back</span> into
        midfield and the shape became a <span className="whitespace-nowrap">3-2-4-1</span>. Flip the
        switch and watch who moves.
      </p>
    ),
    pitch: (
      <div ref={stageRef} data-stage className="min-w-0">
        <Pitch title={current.title} desc={description} orientation={orientation}>
          <SceneLayer scene={CITY} t={current.t} mode="stepped" />
        </Pitch>
      </div>
    ),
    toggle: (className, optionClassName) => (
      <Segmented
        label="Possession"
        options={POSSESSION_OPTIONS}
        value={shape}
        onValueChange={setShape}
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
    source: <p className="text-label text-ink-muted">{SOURCE_LINE}</p>,
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
