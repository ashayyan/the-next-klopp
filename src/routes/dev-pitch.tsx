import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { Pitch } from "../pitch/Pitch.tsx";
import { autoOrientation, type Orientation } from "../pitch/view.ts";

// Dev-only page (registered inside the includeDev && import.meta.env.DEV branch of buildRoutes).
// The subline text below is the marker scripts/smoke.ts looks for in the study build.

const SCENES = [{ id: "pitch-only", label: "Pitch only" }] as const;

const PITCH_SIZES = [
  { id: "105x68", length: 105, width: 68, label: "105 × 68 m (Premier League standard)" },
  { id: "100x65", length: 100, width: 65, label: "100 × 65 m (Fulham, registered)" },
  { id: "101x68", length: 101, width: 68, label: "101 × 68 m (Liverpool, registered)" },
] as const;

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
  const [scene, setScene] = useState<string>("pitch-only");
  const [sizeKey, setSizeKey] = useState<string>("105x68");
  const [choice, setChoice] = useState<OrientationChoice>("auto");
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

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

  const sceneLabel = SCENES.find((s) => s.id === scene)?.label ?? "Pitch only";
  const size = PITCH_SIZES.find((s) => s.id === sizeKey) ?? PITCH_SIZES[0];
  const { length, width } = size;
  const orientation: Orientation = choice === "auto" ? autoOrientation(stageWidth) : choice;
  const onPitch =
    pointer !== null &&
    pointer.x >= 0 &&
    pointer.x <= length &&
    pointer.y >= 0 &&
    pointer.y <= width;

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
            value={scene}
            onChange={(e) => setScene(e.target.value)}
          >
            {SCENES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {scene === "pitch-only" ? (
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
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-6 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-8">
        {/* A <section> with an accessible name has the implicit role "region" (Biome noRedundantRoles). */}
        <section ref={stageRef} aria-label="Pitch stage" data-stage className="min-w-0">
          <Pitch
            title={sceneLabel}
            length={length}
            width={width}
            orientation={orientation}
            onPointerCanonical={setPointer}
          />
        </section>

        <aside className="flex min-w-0 flex-col gap-4 md:gap-6">
          <section aria-labelledby={inspectorId} className="bg-surface-panel p-4">
            <h2 id={inspectorId} className="text-base leading-tight font-semibold">
              Scene
            </h2>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-muted">Pitch</dt>
              <dd>{`${length} × ${width} m`}</dd>
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
