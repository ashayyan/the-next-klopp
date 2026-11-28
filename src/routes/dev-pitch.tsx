import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { CanvasLayer } from "../pitch/CanvasLayer.tsx";
import { PointGlyph } from "../pitch/glyphs/MarkGlyphs.tsx";
import { drawDensity, SceneLayer } from "../pitch/glyphs/SceneLayer.tsx";
import { describeScene } from "../pitch/legend/glyphIds.ts";
import { Legend } from "../pitch/legend/Legend.tsx";
import { Pitch } from "../pitch/Pitch.tsx";
import { autoOrientation, type Orientation, type Pt } from "../pitch/view.ts";
import { DEV_SCENES, FALLBACK_SCENE_ID, findDevScene } from "../scene/fixtures/index.ts";
import { FrameReadout } from "../scene/playback/FrameReadout.tsx";
import { handleTransportKey } from "../scene/playback/keys.ts";
import { markCommitted, startPlaybackLoop } from "../scene/playback/loop.ts";
import { PlaybackBar } from "../scene/playback/PlaybackBar.tsx";
import { sceneDuration } from "../scene/playback/sample.ts";
import { createPlaybackStore, defaultMotion, type PlaybackState } from "../scene/playback/store.ts";
import type { Scene, SceneEntity } from "../scene/schema.ts";
import { ConverterProbe, type ProbeInput } from "./dev-pitch/ConverterProbe.tsx";
import { LandmarksLayer } from "./dev-pitch/LandmarksLayer.tsx";
import { probeConvert } from "./dev-pitch/probe.ts";
import { StatePanel } from "./dev-pitch/StatePanels.tsx";
import {
  hasLocalStatsbomb,
  type LoadResult,
  loadDevScene,
  sceneOptionLabel,
} from "./dev-pitch/sceneSources.ts";

// Dev-only page (registered inside the includeDev && import.meta.env.DEV branch of buildRoutes).
// The subline text below is the marker scripts/smoke.ts looks for in the study build.

/** The load state of the scene the page is showing, tagged with the registry id it belongs to. */
type SceneState = { id: string } & (LoadResult | { status: "loading" });

const PITCH_SIZES = [
  { id: "105x68", length: 105, width: 68, label: "105 × 68 m (Premier League standard)" },
  { id: "100x65", length: 100, width: 65, label: "100 × 65 m (Fulham, registered)" },
  { id: "101x68", length: 101, width: 68, label: "101 × 68 m (Liverpool, registered)" },
] as const;

/** Scenes drawn on the chosen pitch size instead of their own. */
const SIZE_SELECT_SCENES: ReadonlySet<string> = new Set(["pitch-only", "glyph-sheet"]);

type OrientationChoice = "auto" | Orientation;

const ORIENTATIONS: readonly { id: OrientationChoice; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "horizontal", label: "Horizontal" },
  { id: "vertical", label: "Vertical" },
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const control = `min-h-11 w-full rounded-sm border border-control-border bg-surface-page px-2 text-sm text-ink sm:w-auto ${focusRing}`;

const quietButton =
  "min-h-11 rounded-sm border border-control-border bg-transparent px-4 text-sm text-ink hover:bg-surface-panel";

/** Saved-board spike: every outfield player is draggable, goalkeepers and the ball are not. */
function isOutfieldPlayer(entity: SceneEntity): boolean {
  return entity.type === "player";
}

function formatMetres(n: number): string {
  return n.toFixed(2);
}

const MOTIONS = [
  { id: "smooth", label: "Smooth" },
  { id: "stepped", label: "Stepped" },
] as const;

/** Smooth or Stepped; disabled (Smooth shown) for scenes without a clock. */
function MotionGroup({ store }: { store: StoreApi<PlaybackState> | null }) {
  const [idle] = useState(() =>
    createStore<{ motion: "smooth" | "stepped" }>(() => ({ motion: "smooth" })),
  );
  const motion = useStore(store ?? idle, (s) => s.motion);
  return (
    <fieldset className="flex min-w-0 flex-col gap-1" disabled={store === null}>
      <legend className="text-sm">Motion</legend>
      <div className="flex flex-wrap gap-2">
        {MOTIONS.map((m) => (
          <label
            key={m.id}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
          >
            <input
              type="radio"
              name="motion"
              value={m.id}
              checked={motion === m.id}
              onChange={() => store?.getState().setMotion(m.id)}
              className="size-4 accent-accent"
            />
            <span className={motion === m.id ? "font-semibold" : undefined}>{m.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Draws the scene at the clock's time; subscribes to `t` and `motion` only. */
function PlaybackLayer({ scene, store }: { scene: Scene; store: StoreApi<PlaybackState> }) {
  const t = useStore(store, (s) => s.t);
  const motion = useStore(store, (s) => s.motion);
  // Marks the end of this frame's work for the frame statistics (03-07, measured in 03-11).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per committed t on purpose
  useLayoutEffect(() => {
    markCommitted();
  }, [t]);
  return <SceneLayer scene={scene} t={t} mode={motion} />;
}

export default function DevPitchPage() {
  const sceneId = useId();
  const sizeId = useId();
  const inspectorId = useId();
  const [params, setParams] = useSearchParams();
  const [sizeKey, setSizeKey] = useState<string>("105x68");
  const [choice, setChoice] = useState<OrientationChoice>("auto");
  const [densityChoice, setDensityChoice] = useState<Record<string, boolean>>({});
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  // Saved-board spike: positions the learner changed (canonical metres, 0.1 m), per scene id.
  // Nothing is persisted; the reset button clears them.
  const [moved, setMoved] = useState<{ sceneId: string; positions: Record<string, Pt> } | null>(
    null,
  );
  const localStatsbomb = hasLocalStatsbomb();
  const [landmarksOn, setLandmarksOn] = useState(false);
  const [probe, setProbe] = useState<ProbeInput>({ provider: "statsbomb", xText: "", yText: "" });
  const [announcement, setAnnouncement] = useState<{ sceneId: string; text: string } | null>(null);

  // ?scene= is looked up only through the fixed registry: it is never a path or import specifier.
  const requested = params.get("scene");
  const known = findDevScene(requested);
  const unknownId = requested !== null && known === undefined ? requested : null;
  const devScene =
    known ??
    findDevScene(requested === null ? DEV_SCENES[0]?.id : FALLBACK_SCENE_ID) ??
    DEV_SCENES[0];
  const activeId = devScene?.id ?? "pitch-only";

  // Auto orientation reads the measured stage width (vertical below 480 px).
  const stageRef = useRef<HTMLElement>(null);
  const [stageWidth, setStageWidth] = useState(960);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined && w > 0) setStageWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [state, setState] = useState<SceneState>({ id: "pitch-only", status: "none" });
  useEffect(() => {
    if (!devScene || devScene.blank) {
      setState({ id: activeId, status: "none" });
      return;
    }
    let cancelled = false;
    setState({ id: activeId, status: "loading" });
    loadDevScene(devScene).then((result) => {
      if (!cancelled) setState({ id: activeId, ...result });
    });
    return () => {
      cancelled = true;
    };
  }, [devScene, activeId]);

  // A state that belongs to the previous scene id is treated as loading, never drawn.
  const current: SceneState = state.id === activeId ? state : { id: activeId, status: "loading" };
  const usesSizeSelect = SIZE_SELECT_SCENES.has(activeId);
  const size = PITCH_SIZES.find((s) => s.id === sizeKey) ?? PITCH_SIZES[0];
  const loaded = current.status === "ready" || current.status === "empty" ? current.scene : null;
  // The glyph sheet is drawn on the chosen pitch size; every other scene keeps its own pitch.
  const scene = useMemo<Scene | null>(
    () =>
      loaded && usesSizeSelect
        ? { ...loaded, pitch: { length: size.length, width: size.width } }
        : loaded,
    [loaded, usesSizeSelect, size.length, size.width],
  );

  const length = scene?.pitch.length ?? size.length;
  const width = scene?.pitch.width ?? size.width;
  const hasEvents = (scene?.events.length ?? 0) > 0;
  const densityOn = hasEvents && (densityChoice[activeId] ?? true);
  const draw = useMemo(() => (scene ? drawDensity(scene) : null), [scene]);

  // One clock per loaded scene, never autoplaying; a still scene (1 frame) has no clock.
  const store = useMemo(
    () =>
      scene && scene.frames.length > 1 ? createPlaybackStore(scene, { motion: "smooth" }) : null,
    [scene],
  );
  useEffect(() => (store ? startPlaybackLoop(store) : undefined), [store]);
  // Default motion follows the system setting; it is read once per scene and the learner can change it.
  useEffect(() => {
    if (!store || typeof window.matchMedia !== "function") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    store.getState().setMotion(defaultMotion(reduced));
  }, [store]);
  const probeResult = probeConvert(probe.provider, probe.xText, probe.yText, { length, width });
  const extraGlyphs = landmarksOn || probeResult.ok ? (["point"] as const) : [];
  const isBoard = scene?.kind === "board";
  const boardPositions = scene && moved?.sceneId === scene.id ? moved.positions : undefined;
  const boardAnnouncement = scene && announcement?.sceneId === scene.id ? announcement.text : "";
  const orientation: Orientation = choice === "auto" ? autoOrientation(stageWidth) : choice;
  const onPitch =
    pointer !== null &&
    pointer.x >= 0 &&
    pointer.x <= length &&
    pointer.y >= 0 &&
    pointer.y <= width;
  const boardSceneId = scene?.id ?? "";
  const moveEntity = (id: string, p: Pt) =>
    setMoved((prev) => ({
      sceneId: boardSceneId,
      positions: { ...(prev?.sceneId === boardSceneId ? prev.positions : {}), [id]: p },
    }));
  const endEntity = (id: string, p: Pt) => {
    const entity = scene?.entities.find((e) => e.id === id);
    const who = entity?.number ?? entity?.label ?? id;
    setAnnouncement({
      sceneId: boardSceneId,
      text: `Number ${who} moved to x ${p.x.toFixed(1)} m, y ${p.y.toFixed(1)} m.`,
    });
  };
  const sceneLabel = scene?.label ?? devScene?.label ?? "Pitch only";
  const source = scene?.source;

  return (
    <main className="mx-auto min-h-screen max-w-[1280px] bg-surface-page p-4 pb-16 font-sans text-ink md:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl leading-tight font-semibold text-balance">Pitch Standard</h1>
        <p className="mt-2 text-base text-ink-muted">
          Dev view of the canonical pitch, glyphs, notation and scene playback. Not part of the
          study build.
        </p>
        <p className="mt-2 text-sm">
          <Link to="/dev" className={`underline ${focusRing}`}>
            Back to dev routes
          </Link>
        </p>
      </header>

      <div className="mt-4 flex flex-col gap-4 bg-surface-panel p-4 sm:flex-row sm:flex-wrap sm:items-end md:mt-6 lg:mt-12">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={sceneId} className="text-sm">
            Scene
          </label>
          <select
            id={sceneId}
            name="scene"
            className={control}
            value={activeId}
            onChange={(e) => setParams({ scene: e.target.value }, { replace: true })}
          >
            {DEV_SCENES.map((s) => (
              <option key={s.id} value={s.id}>
                {sceneOptionLabel(s, localStatsbomb)}
              </option>
            ))}
          </select>
        </div>

        {usesSizeSelect ? (
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={sizeId} className="text-sm">
              Pitch size
            </label>
            <select
              id={sizeId}
              name="pitch-size"
              className={control}
              value={sizeKey}
              onChange={(e) => setSizeKey(e.target.value)}
            >
              {PITCH_SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <fieldset className="flex min-w-0 flex-col gap-1">
          <legend className="text-sm">Pitch orientation</legend>
          <div className="flex flex-wrap gap-2">
            {ORIENTATIONS.map((o) => (
              <label
                key={o.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
              >
                <input
                  type="radio"
                  name="orientation"
                  value={o.id}
                  checked={choice === o.id}
                  onChange={() => setChoice(o.id)}
                  className="size-4 accent-accent"
                />
                <span className={choice === o.id ? "font-semibold" : undefined}>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <MotionGroup store={store} />

        <fieldset className="flex min-w-0 flex-col gap-1">
          <legend className="text-sm">Layers</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
            <input
              type="checkbox"
              name="layer-density"
              checked={densityOn}
              disabled={!hasEvents}
              onChange={(e) =>
                setDensityChoice((prev) => ({ ...prev, [activeId]: e.target.checked }))
              }
              className="size-4 accent-accent"
            />
            <span>Density layer (Canvas)</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
            <input
              type="checkbox"
              name="layer-landmarks"
              checked={landmarksOn}
              onChange={(e) => setLandmarksOn(e.target.checked)}
              className="size-4 accent-accent"
            />
            <span>Provider landmarks</span>
          </label>
        </fieldset>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-6 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-8">
        {/* A <section> with an accessible name has the implicit role "region" (Biome noRedundantRoles). */}
        <section
          ref={stageRef}
          aria-label="Pitch stage"
          data-stage
          className="min-w-0"
          onKeyDown={(e) => {
            if (!store) return;
            const handled = handleTransportKey(
              {
                key: e.key,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                altKey: e.altKey,
                target: e.target as HTMLElement,
              },
              store,
            );
            if (handled) e.preventDefault();
          }}
        >
          {current.status === "empty" ||
          current.status === "invalid" ||
          current.status === "missing-local" ||
          current.status === "error" ? (
            <StatePanel state={current} sceneId={activeId} />
          ) : null}
          <Pitch
            title={sceneLabel}
            desc={scene ? describeScene(scene) : undefined}
            length={length}
            width={width}
            orientation={orientation}
            interactive={isBoard}
            canvas={densityOn && draw ? <CanvasLayer draw={draw} /> : undefined}
            onPointerCanonical={setPointer}
          >
            {landmarksOn ? <LandmarksLayer /> : null}
            {probeResult.ok ? <PointGlyph at={probeResult.point} label="Probe" /> : null}
            {scene && store ? <PlaybackLayer scene={scene} store={store} /> : null}
            {scene && !store ? (
              <SceneLayer
                scene={scene}
                t={0}
                mode="smooth"
                positions={boardPositions}
                draggable={isBoard ? isOutfieldPlayer : undefined}
                onEntityMove={moveEntity}
                onEntityEnd={endEntity}
              />
            ) : null}
          </Pitch>
          <div className="mt-2 flex flex-col gap-1 text-sm text-ink-muted">
            {unknownId !== null ? (
              <p role="status">{`No scene called “${unknownId}”. Showing the glyph sheet instead.`}</p>
            ) : null}
            {current.status === "loading" ? <p role="status">Loading scene…</p> : null}
            {scene && scene.frames.length === 1 ? <p>Still scene — 1 frame</p> : null}
            {source?.type === "open-data" ? (
              <p>{`Source: ${source.attribution} · Licence: ${source.licence}${source.localOnly ? " · Local only, not shipped" : ""}`}</p>
            ) : null}
          </div>
          {isBoard ? (
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className={`${quietButton} ${focusRing}`}
                onClick={() => {
                  setMoved(null);
                  setAnnouncement(null);
                }}
              >
                Reset positions
              </button>
              <p
                role="status"
                aria-live="polite"
                data-readout="announcement"
                className="min-w-0 text-sm text-ink-muted"
              >
                {boardAnnouncement}
              </p>
            </div>
          ) : null}
          {store ? <PlaybackBar store={store} /> : null}
          {store && activeId === "stress" ? <FrameReadout /> : null}
        </section>

        <aside className="flex min-w-0 flex-col gap-4 md:gap-6">
          <Legend scene={scene} density={densityOn} extraGlyphs={extraGlyphs} />
          <section aria-labelledby={inspectorId} className="bg-surface-panel p-4">
            <h2 id={inspectorId} className="text-base leading-tight font-semibold">
              Scene
            </h2>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-muted">Scene id</dt>
              <dd className="min-w-0 break-words">{scene?.id ?? "none"}</dd>
              <dt className="text-ink-muted">Kind</dt>
              <dd>{scene?.kind ?? "none"}</dd>
              <dt className="text-ink-muted">Schema version</dt>
              <dd>{scene ? scene.schemaVersion : "none"}</dd>
              <dt className="text-ink-muted">Pitch</dt>
              <dd>{`${length} × ${width} m`}</dd>
              <dt className="text-ink-muted">Frames</dt>
              <dd>{scene ? scene.frames.length : 0}</dd>
              <dt className="text-ink-muted">Duration</dt>
              <dd>{scene ? `${sceneDuration(scene).toFixed(1)} s` : "none"}</dd>
              <dt className="text-ink-muted">Teams</dt>
              <dd className="min-w-0 break-words">
                {scene && scene.teams.length > 0
                  ? scene.teams.map((t) => `${t.name} (${t.side.toUpperCase()})`).join(" · ")
                  : "none"}
              </dd>
              <dt className="text-ink-muted">Source</dt>
              <dd>{source ? (source.provider ?? source.type) : "none"}</dd>
              <dt className="text-ink-muted">Licence</dt>
              <dd className="min-w-0 break-words">{source?.licence ?? "none"}</dd>
              <dt className="text-ink-muted">Shippable</dt>
              <dd>{source ? (source.shippable ? "Yes" : "No") : "none"}</dd>
              <dt className="text-ink-muted">Orientation</dt>
              <dd>{choice === "auto" ? `Auto (${orientation})` : orientation}</dd>
            </dl>
            <p data-readout="pointer" className="mt-4 font-mono text-sm tabular-nums">
              {onPitch && pointer
                ? `Pointer x ${formatMetres(pointer.x)} m · y ${formatMetres(pointer.y)} m`
                : "Pointer off pitch"}
            </p>
          </section>
          <ConverterProbe value={probe} onChange={setProbe} result={probeResult} />
        </aside>
      </div>
    </main>
  );
}
