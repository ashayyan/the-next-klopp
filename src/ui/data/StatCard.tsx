export interface StatFigure {
  /** The number as shown, already formatted ("18.4"). */
  value: string;
  unit?: string;
  label: string;
  /** loading shows "…"; missing shows "—" and the `reason` line. */
  status?: "loading" | "missing";
  /** Why the number is missing, for example "No tracking data for this match". */
  reason?: string;
}

export interface StatCardProps {
  figures: readonly StatFigure[];
  /** stack: one figure per line. row: side by side, wrapping on a narrow screen. */
  layout?: "stack" | "row";
  /** Surface classes (default a panel); a direction may set its highlight block here. */
  className?: string;
  /** Classes for the label text (default muted ink on the surface). */
  labelClassName?: string;
  /** Forced look for the gallery, written to `data-state`. */
  state?: string;
}

/**
 * Stat figures in the Display size and the mono family (numbers that matter read as data), each
 * with its Label beside it. A description list, so each figure keeps its meaning for assistive tech.
 */
export function StatCard({
  figures,
  layout = "stack",
  className,
  labelClassName,
  state,
}: StatCardProps) {
  return (
    <dl
      data-stat-card
      data-state={state}
      className={`flex ${layout === "row" ? "flex-row flex-wrap gap-x-8 gap-y-4" : "flex-col gap-4"} ${className ?? "bg-surface-panel p-4"}`}
    >
      {figures.map((f) => (
        <div
          key={f.label}
          className={`flex min-w-0 items-baseline gap-2${f.status === "missing" ? " flex-wrap gap-y-0" : ""}`}
        >
          <dt className={`order-2 text-label ${labelClassName ?? "text-ink-muted"}`}>{f.label}</dt>
          <dd
            data-stat-figure
            data-status={f.status}
            aria-busy={f.status === "loading" ? true : undefined}
            className="order-1 shrink-0 whitespace-nowrap font-mono text-display tabular-nums"
          >
            {f.status === "loading" ? "…" : f.status === "missing" ? "—" : f.value}
            {f.status === undefined && f.unit ? (
              <span className="text-heading">{` ${f.unit}`}</span>
            ) : null}
            {f.status === "loading" ? <span className="sr-only">Loading</span> : null}
            {f.status === "missing" ? <span className="sr-only">Not available</span> : null}
          </dd>
          {f.status === "missing" && f.reason ? (
            <dd
              data-stat-reason
              className={`order-3 basis-full text-label ${labelClassName ?? "text-ink-muted"}`}
            >
              {f.reason}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
