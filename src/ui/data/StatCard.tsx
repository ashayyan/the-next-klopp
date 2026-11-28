export interface StatFigure {
  /** The number as shown, already formatted ("18.4"). */
  value: string;
  unit?: string;
  label: string;
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
        <div key={f.label} className="flex min-w-0 items-baseline gap-2">
          <dt className={`order-2 text-label ${labelClassName ?? "text-ink-muted"}`}>{f.label}</dt>
          <dd data-stat-figure className="order-1 font-mono text-display tabular-nums">
            {f.value}
            {f.unit ? <span className="text-heading">{` ${f.unit}`}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
