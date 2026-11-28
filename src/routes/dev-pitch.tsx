import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CanvasLayer } from "../pitch/CanvasLayer.tsx";
import { drawDensity, SceneLayer } from "../pitch/glyphs/SceneLayer.tsx";
import { describeScene } from "../pitch/legend/glyphIds.ts";
import { Legend } from "../pitch/legend/Legend.tsx";
import { Pitch } from "../pitch/Pitch.tsx";
import { autoOrientation, type Orientation } from "../pitch/view.ts";
import { DEV_SCENES, FALLBACK_SCENE_ID, findDevScene } from "../scene/fixtures/index.ts";
import { sceneDuration } from "../scene/playback/sample.ts";
import type { Scene } from "../scene/schema.ts";
import { parseScene, type SceneIssue } from "../scene/validate.ts";

// Dev-only page (registered inside the includeDev && import.meta.env.DEV branch of buildRoutes).
// The subline text below is the marker scripts/smoke.ts looks for in the study build.

type SceneState =
  | { id: string; status: "none" }
  | { id: string; status: "loading" }
  | { id: string; status: "ready"; scene: Scene }
  | { id: string; status: "invalid"; issues: SceneIssue[] };

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

function formatMetres(n: number): string {
  return n.toFixed(2);
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
    const pending = devScene?.load();
    if (!pending) {
      setState({ id: activeId, status: "none" });
      return;
    }
    let cancelled = false;
    setState({ id: activeId, status: "loading" });
    pending.then((raw) => {
      if (cancelled) return;
      const parsed = parseScene(raw);
      setState(
        parsed.ok
          ? { id: activeId, status: "ready", scene: parsed.scene }
          : { id: activeId, status: "invalid", issues: parsed.issues },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [devScene, activeId]);

  // A state that belongs to the previous scene id is treated as loading, never drawn.
  const current: SceneState = state.id === activeId ? state : { id: activeId, status: "loading" };
  const usesSizeSelect = SIZE_SELECT_SCENES.has(activeId);
  const size = PITCH_SIZES.find((s) => s.id === sizeKey) ?? PITCH_SIZES[0];
  const loaded = current.status === "ready" ? current.scene : null;
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
  const orientation: Orientation = choice === "auto" ? autoOrientation(stageWidth) : choice;
  const onPitch =
    pointer !== null &&
    pointer.x >= 0 &&
    pointer.x <= length &&
    pointer.y >= 0 &&
    pointer.y <= width;
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
                {s.label}
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
        </fieldset>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-6 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-8">
        {/* A <section> with an accessible name has the implicit role "region" (Biome noRedundantRoles). */}
        <section ref={stageRef} aria-label="Pitch stage" data-stage className="min-w-0">
          {current.status === "invalid" ? (
            <div
              role="alert"
              className="mb-4 border-l-4 border-danger bg-surface-panel p-4"
              data-state="invalid-scene"
            >
              <h2 className="text-base leading-tight font-semibold">Scene failed validation</h2>
              <p className="mt-2 text-base">
                {`${current.issues.length} ${current.issues.length === 1 ? "problem" : "problems"} in “${activeId}”. Fix the fixture file and save; the page reloads with the change.`}
              </p>
              <ul className="mt-2 font-mono text-sm">
                {current.issues.slice(0, 5).map((issue) => (
                  <li
                    key={`${issue.path}:${issue.message}`}
                  >{`${issue.path}: ${issue.message}`}</li>
                ))}
              </ul>
              {current.issues.length > 5 ? (
                <p className="mt-1 text-sm">{`and ${current.issues.length - 5} more`}</p>
              ) : null}
            </div>
          ) : null}
          <Pitch
            title={sceneLabel}
            desc={scene ? describeScene(scene) : undefined}
            length={length}
            width={width}
            orientation={orientation}
            canvas={densityOn && draw ? <CanvasLayer draw={draw} /> : undefined}
            onPointerCanonical={setPointer}
          >
            {scene ? <SceneLayer scene={scene} t={0} mode="smooth" /> : null}
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
        </section>

        <aside className="flex min-w-0 flex-col gap-4 md:gap-6">
          <Legend scene={scene} density={densityOn} />
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
        </aside>
      </div>
    </main>
  );
}
