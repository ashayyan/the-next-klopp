import { useId, useState } from "react";
import { Link } from "react-router";
import { Pitch } from "../pitch/Pitch.tsx";

// Dev-only page (registered inside the includeDev && import.meta.env.DEV branch of buildRoutes).
// The subline text below is the marker scripts/smoke.ts looks for in the study build.

const SCENES = [{ id: "pitch-only", label: "Pitch only" }] as const;

const control =
  "min-h-11 rounded-sm border border-control-border bg-surface-page px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function DevPitchPage() {
  const sceneId = useId();
  const inspectorId = useId();
  const [scene, setScene] = useState<string>("pitch-only");
  const sceneLabel = SCENES.find((s) => s.id === scene)?.label ?? "Pitch only";
  const length = 105;
  const width = 68;

  return (
    <main className="mx-auto min-h-screen max-w-[1280px] bg-surface-page p-4 pb-16 font-sans text-ink md:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl leading-tight font-semibold text-balance">Pitch Standard</h1>
        <p className="mt-2 text-base text-ink-muted">
          Dev view of the canonical pitch, glyphs, notation and scene playback. Not part of the
          study build.
        </p>
        <p className="mt-2 text-sm">
          <Link
            to="/dev"
            className="underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Back to dev routes
          </Link>
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-end gap-4 bg-surface-panel p-4 lg:mt-12">
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
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-8">
        {/* A <section> with an accessible name has the implicit role "region" (Biome noRedundantRoles). */}
        <section aria-label="Pitch stage" data-stage className="min-w-0">
          <Pitch title={sceneLabel} length={length} width={width} />
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby={inspectorId} className="bg-surface-panel p-4">
            <h2 id={inspectorId} className="text-base leading-tight font-semibold">
              Scene
            </h2>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-muted">Pitch</dt>
              <dd>{`${length} × ${width} m`}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
