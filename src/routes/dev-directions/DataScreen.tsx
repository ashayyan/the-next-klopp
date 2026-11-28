import { useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { HighlightGlyph } from "../../pitch/glyphs/MarkGlyphs.tsx";
import { SceneLayer } from "../../pitch/glyphs/SceneLayer.tsx";
import { describeScene } from "../../pitch/legend/glyphIds.ts";
import { Legend } from "../../pitch/legend/Legend.tsx";
import { Pitch } from "../../pitch/Pitch.tsx";
import { autoOrientation } from "../../pitch/view.ts";
import { findDevScene } from "../../scene/fixtures/index.ts";
import { markCommitted, startPlaybackLoop } from "../../scene/playback/loop.ts";
import { PlaybackBar } from "../../scene/playback/PlaybackBar.tsx";
import { eventState } from "../../scene/playback/sample.ts";
import {
  createPlaybackStore,
  defaultMotion,
  type PlaybackState,
} from "../../scene/playback/store.ts";
import type { Scene } from "../../scene/schema.ts";
import { Button } from "../../ui/Button.tsx";
import { type DataColumn, DataTable } from "../../ui/data/DataTable.tsx";
import { StatCard } from "../../ui/data/StatCard.tsx";
import { ConfusionButton } from "../../ui/lesson/ConfusionButton.tsx";
import { StepRail, type StepRailForms } from "../../ui/lesson/StepRail.tsx";
import { type LoadResult, loadDevScene } from "../dev-pitch/sceneSources.ts";
import { type Direction, DirectionScope, DirectionShellBar } from "./DirectionScope.tsx";
import { deriveGoal, formatMetres, formatSeconds, type GoalRow } from "./derived.ts";
import { DISPLAY, useMeasuredWidth } from "./shared.ts";

// Screen 2 of 04-UI-SPEC: the data lesson ("data lab" template, Lesson Loop step 2: See it), on
// the published Wyscout reconstruction of Leroy Sané's goal. Every number comes from deriveGoal.

type Load = LoadResult | { status: "loading" };

const ERROR_BODY =
  "The scene file public/data/wyscout/v1-809b8aff1fda/scene-wyscout-2499754-sane-goal.json is missing or invalid. Run npm run data, then reload this page.";

/** The event whose time window holds t (the Phase 3 eventState rule), or null. */
function activeEventAt(scene: Scene, t: number): string | null {
  for (const event of scene.events) {
    if (eventState(scene, event, t) === "active") return event.id;
  }
  return null;
}

/** Draws the scene at the clock's time; subscribes to `t` and `motion` only. */
function PlaybackLayer({ scene, store }: { scene: Scene; store: StoreApi<PlaybackState> }) {
  const t = useStore(store, (s) => s.t);
  const motion = useStore(store, (s) => s.motion);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per committed t on purpose
  useLayoutEffect(() => {
    markCommitted();
  }, [t]);
  return <SceneLayer scene={scene} t={t} mode={motion} />;
}

const IDLE = createStore<{ t: number }>(() => ({ t: 0 }));

function rowLabel(r: GoalRow): string {
  const who = r.receiver ? `${r.who} to ${r.receiver}` : r.who;
  return `Action ${r.n}, ${who}, ${r.action.toLowerCase()}, ${formatMetres(r.metres)} m at ${formatSeconds(r.t)} s`;
}

const COLUMNS: readonly DataColumn<GoalRow>[] = [
  { id: "n", header: "#", numeric: true, cell: (r) => r.n },
  {
    id: "time",
    header: "Time",
    numeric: true,
    className: "max-md:hidden",
    cell: (r) => `${formatSeconds(r.t)} s`,
  },
  {
    id: "who",
    // The arrow is outside the self-hosted Latin subset, so the header says "to" (04-RESEARCH Fonts).
    header: (
      <>
        <span className="max-md:hidden">Player to receiver</span>
        <span className="md:hidden">Who</span>
      </>
    ),
    cell: (r) => (
      <>
        <span className="max-md:hidden">{r.receiver ? `${r.who} to ${r.receiver}` : r.who}</span>
        <span className="md:hidden">
          {r.who}
          <span className="block font-normal text-ink-muted text-label">{`${r.action}, ${formatSeconds(r.t)} s`}</span>
        </span>
      </>
    ),
  },
  { id: "action", header: "Action", className: "max-md:hidden", cell: (r) => r.action },
  {
    id: "metres",
    header: "Metres",
    numeric: true,
    cell: (r) => (
      <>
        {formatMetres(r.metres)}
        {r.approximate ? (
          <span className="block font-normal font-sans text-ink-muted text-label">
            end point approximate
          </span>
        ) : null}
      </>
    ),
  },
];

interface Blocks {
  shell: (className: string) => ReactNode;
  rail: (form: StepRailForms, numbered?: boolean) => ReactNode;
  title: ReactNode;
  context: ReactNode;
  heading: ReactNode;
  body: ReactNode;
  /** Pitch, status line and playback bar. */
  stage: ReactNode;
  /** The error panel when the scene did not load, else null. */
  problem: ReactNode;
  stat: (layout: "stack" | "row", className?: string, labelClassName?: string) => ReactNode;
  chart: ReactNode;
  table: (className?: string, rowClassName?: string) => ReactNode;
  legend: (columnsClassName: string) => ReactNode;
  source: ReactNode;
  cta: (className: string) => ReactNode;
}

/**
 * floodlit: the stage again. The title runs across the top at 1440; below it the rail (2 of 12
 * columns), the pitch, playback and chart (6) and the reading column with the stat card and the
 * event table (4, wide enough for five table columns). Below 1280 px `contents` and `order` give
 * the 768 and 375 sequences.
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
          <div className="contents xl:col-span-6 xl:flex xl:min-w-0 xl:flex-col xl:gap-6">
            <div className="order-4 md:order-3 xl:order-none">{b.stage}</div>
            {b.problem ? <div className="order-5 md:order-4 xl:order-none">{b.problem}</div> : null}
            {b.chart ? <div className="order-7 xl:order-none">{b.chart}</div> : null}
          </div>
          <div className="contents xl:col-span-4 xl:flex xl:min-w-0 xl:flex-col xl:gap-6">
            <div
              data-lesson-step
              className="contents xl:flex xl:flex-col xl:gap-2 [&>h2]:order-3 md:[&>h2]:order-5 [&>p]:order-6 xl:[&>*]:order-none"
            >
              {b.heading}
              {b.body}
            </div>
            <div className="order-5 md:order-4 xl:order-none">
              {b.stat(
                "stack",
                "bg-surface-panel p-4 md:flex-row md:flex-wrap md:gap-x-8 xl:flex-col",
              )}
            </div>
            <div className="order-8 xl:order-none">{b.table("xl:text-label")}</div>
            <div className="order-9 xl:order-none">
              {b.legend("grid-cols-1 md:grid-cols-2 xl:grid-cols-1")}
            </div>
            {b.source ? <div className="order-10 xl:order-none">{b.source}</div> : null}
            <div className="order-11 xl:order-none">{b.cta("w-full xl:w-auto")}</div>
          </div>
        </div>
      </main>
    </>
  );
}

const LAYOUTS: Record<Direction["id"], (props: { b: Blocks }) => ReactNode> = {
  floodlit: FloodlitLayout,
  programme: FloodlitLayout,
  notebook: FloodlitLayout,
};

export function DataScreen({ direction }: { direction: Direction }) {
  const [params] = useSearchParams();
  const reduced = useReducedMotion() === true;
  const [focus, setFocus] = useState(() => params.get("focus") === "1");
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [preview, setPreview] = useState<string | null>(null);
  const [stageRef, stageWidth] = useMeasuredWidth(720);

  useEffect(() => {
    const entry = findDevScene("reconstruction");
    if (!entry) {
      setLoad({ status: "error", message: "The reconstruction scene is not registered." });
      return;
    }
    let cancelled = false;
    loadDevScene(entry).then((result) => {
      if (!cancelled) setLoad(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scene = load.status === "ready" ? load.scene : null;
  const goal = useMemo(() => (scene ? deriveGoal(scene) : null), [scene]);
  // One clock per loaded scene, paused at ?t= (default 0); it never autoplays. Reduced motion
  // starts in Stepped (04-UI-SPEC "Motion language"); the motion mode is read once per scene.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the motion default is read once per scene
  const store = useMemo(() => {
    if (!scene || scene.frames.length < 2) return null;
    const created = createPlaybackStore(scene, { motion: defaultMotion(reduced) });
    const t = Number(params.get("t"));
    if (Number.isFinite(t) && t > 0) created.getState().seek(t);
    return created;
  }, [scene]);
  useEffect(() => (store ? startPlaybackLoop(store) : undefined), [store]);
  const activeId = useStore(store ?? IDLE, (s) => (scene ? activeEventAt(scene, s.t) : null));

  const orientation = autoOrientation(stageWidth);
  const previewEvent = scene?.events.find((e) => e.id === preview);
  const seekTo = (row: GoalRow) => {
    const s = store?.getState();
    if (!s) return;
    s.seek(row.sceneT);
    s.pause();
  };

  const failed = load.status !== "loading" && load.status !== "ready";
  const source = scene?.source;

  const blocks: Blocks = {
    shell: (className) => (
      <DirectionShellBar
        confusion={<ConfusionButton headingClassName={`${DISPLAY} text-heading`} />}
        minutes={8}
        focus={focus}
        onFocusChange={setFocus}
        className={className}
        wordmarkClassName={DISPLAY}
      />
    ),
    rail: (form, numbered) =>
      focus ? null : <StepRail current="see-it" form={form} numbered={numbered} />,
    title: <h1 className={`${DISPLAY} text-display text-balance`}>A goal in ten actions</h1>,
    context: (
      <p className="text-label text-ink-muted">
        Manchester City 5–0 Liverpool, Premier League, 9 September 2017. Leroy Sané's goal in the
        second half.
      </p>
    ),
    heading: <h2 className={`${DISPLAY} text-heading`}>Follow the ball</h2>,
    body: (
      <p className="max-w-[65ch] text-body">
        {`Ten City actions in ${goal ? formatSeconds(goal.firstToShotSec) : "18.4"} seconds, from Mangala in his own half to Sané's finish. Press Play, or step one action at a time. The table and the chart follow the ball.`}
      </p>
    ),
    stage: (
      <div ref={stageRef} data-stage className="flex min-w-0 flex-col gap-2">
        <Pitch
          title={scene?.label ?? "Manchester City 5–0 Liverpool, the Sané goal"}
          desc={scene ? describeScene(scene) : undefined}
          orientation={orientation}
          length={scene?.pitch.length}
          width={scene?.pitch.width}
        >
          {scene && store ? <PlaybackLayer scene={scene} store={store} /> : null}
          {previewEvent ? (
            <HighlightGlyph x={previewEvent.start.x} y={previewEvent.start.y} />
          ) : null}
        </Pitch>
        {load.status === "loading" ? (
          <p role="status" className="text-label text-ink-muted">
            Loading the goal…
          </p>
        ) : null}
        {store ? <PlaybackBar store={store} /> : null}
      </div>
    ),
    problem: failed ? (
      <div
        role="alert"
        data-error-panel
        className="flex flex-col gap-2 border-danger border-l-4 bg-surface-panel p-4"
      >
        <h2 className={`${DISPLAY} text-heading`}>The goal data didn't load</h2>
        <p className="text-body">{ERROR_BODY}</p>
      </div>
    ) : null,
    stat: (layout, className, labelClassName) =>
      goal ? (
        <StatCard
          layout={layout}
          className={className}
          labelClassName={labelClassName}
          figures={[
            { value: formatSeconds(goal.firstToShotSec), unit: "s", label: "first pass to shot" },
            {
              value: formatSeconds(goal.upfieldMetres),
              unit: "m",
              label: "ball moved upfield before the shot",
            },
            { value: String(goal.playersOnBall), label: "City players on the ball" },
          ]}
        />
      ) : null,
    chart: null,
    table: (className, rowClassName) =>
      goal ? (
        <DataTable
          caption="All ten actions"
          columns={COLUMNS}
          rows={goal.rows}
          rowKey={(r) => r.eventId}
          activeRow={activeId}
          rowLabel={rowLabel}
          onRowPreview={(r) => setPreview(r?.eventId ?? null)}
          onRowEnter={seekTo}
          className={className}
          rowClassName={rowClassName}
        />
      ) : null,
    legend: (columnsClassName) => (
      <Legend scene={scene} density={false} sticky={false} columnsClassName={columnsClassName} />
    ),
    source:
      focus || !source ? null : (
        <p className="text-label text-ink-muted">{`Source: ${source.attribution} · Licence: ${source.licence}`}</p>
      ),
    cta: (className) => (
      <Button variant="primary" className={className}>
        Continue to Touch it
      </Button>
    ),
  };

  const Layout = LAYOUTS[direction.id];
  return (
    <DirectionScope direction={direction} ready={load.status !== "loading"}>
      <Layout b={blocks} />
    </DirectionScope>
  );
}
