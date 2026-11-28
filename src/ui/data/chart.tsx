// Chart primitives (04-UI-SPEC "Data-viz standards"): SVG marks with token colours, D3-free linear
// maths, zero baselines for bars, direct labels on at most two marks, and a hover/focus tooltip.
import type { ReactNode } from "react";

/** A linear scale from `domain` to `range`; values outside the domain extrapolate. */
export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

/** Evenly spaced ticks from `from` to `to` (inclusive) every `step`. */
export function ticks(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(from / step) * step; v <= to + 1e-9; v += step)
    out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export interface GridlinesProps {
  values: readonly number[];
  y: (v: number) => number;
  x0: number;
  x1: number;
}

/** Horizontal gridlines; the zero line is the baseline, drawn in ink. */
export function Gridlines({ values, y, x0, x1 }: GridlinesProps) {
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: an SVG group without tabindex is not focusable
    <g data-chart="gridlines" aria-hidden="true">
      {values.map((v) => (
        <line
          key={v}
          x1={x0}
          x2={x1}
          y1={y(v)}
          y2={y(v)}
          className={v === 0 ? "stroke-ink" : "stroke-control-border"}
          strokeWidth={1}
          strokeOpacity={v === 0 ? 1 : 0.5}
          shapeRendering="crispEdges"
        />
      ))}
    </g>
  );
}

export interface AxisProps {
  orientation: "left" | "bottom";
  values: readonly (number | string)[];
  /** Position of each value along the axis, in SVG units. */
  at: (v: number | string) => number;
  /** The other coordinate: x of a left axis, y of a bottom axis. */
  offset: number;
  format?: (v: number | string) => string;
  /** Axis title. */
  label?: string;
  /** Where the title sits: x for a left axis (rotated), y for a bottom axis. */
  labelOffset?: number;
  /** Centre of the title along the axis. */
  labelAt?: number;
}

/** Tick labels in the Label size and muted ink, plus an axis title. No axis line: gridlines carry it. */
export function Axis({
  orientation,
  values,
  at,
  offset,
  format = String,
  label,
  labelOffset = 0,
  labelAt = 0,
}: AxisProps) {
  const left = orientation === "left";
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: an SVG group without tabindex is not focusable
    <g data-chart={`axis-${orientation}`} aria-hidden="true" className="fill-ink-muted text-label">
      {values.map((v) => (
        <text
          key={String(v)}
          x={left ? offset : at(v)}
          y={left ? at(v) : offset}
          textAnchor={left ? "end" : "middle"}
          dominantBaseline={left ? "central" : "hanging"}
          className="font-mono tabular-nums"
        >
          {format(v)}
        </text>
      ))}
      {label ? (
        <text
          x={left ? labelOffset : labelAt}
          y={left ? labelAt : labelOffset}
          textAnchor="middle"
          dominantBaseline={left ? "hanging" : "auto"}
          transform={left ? `rotate(-90 ${labelOffset} ${labelAt})` : undefined}
          className="fill-ink-muted"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

export interface BarDatum {
  key: string;
  value: number;
}

export interface BarsProps {
  data: readonly BarDatum[];
  /** Left edge of band i. */
  bandX: (i: number) => number;
  bandWidth: number;
  y: (v: number) => number;
  /** Data-end corner radius (the direction's --radius-sm). */
  radius: number;
  /** Key of the active bar: drawn with a 2 px ink outline. */
  active?: string | null;
  /** Fill class: one series wears its team colour. */
  fillClassName?: string;
}

/** Vertical bars from a zero baseline with a 2 px surface gap; only the data end is rounded. */
export function Bars({
  data,
  bandX,
  bandWidth,
  y,
  radius,
  active,
  fillClassName = "fill-(--team-a)",
}: BarsProps) {
  const w = Math.max(1, bandWidth - 2);
  const base = y(0);
  return (
    <g data-chart="bars">
      {data.map((d, i) => {
        const x = bandX(i) + 1;
        const top = Math.min(base, y(d.value));
        const h = Math.max(1, Math.abs(y(d.value) - base));
        const r = Math.min(radius, h / 2, w / 2);
        const positive = d.value >= 0;
        // A rounded rect plus a square patch on the baseline side keeps the baseline corners square.
        return (
          <g key={d.key} data-bar={d.key} data-active={active === d.key ? "" : undefined}>
            <rect x={x} y={top} width={w} height={h} rx={r} className={fillClassName} />
            {r > 0 ? (
              <rect
                x={x}
                y={positive ? base - Math.min(r, h) : top}
                width={w}
                height={Math.min(r, h)}
                className={fillClassName}
              />
            ) : null}
            {active === d.key ? (
              <rect
                x={x - 1}
                y={top - 1}
                width={w + 2}
                height={h + 2}
                rx={r}
                fill="none"
                className="stroke-ink"
                strokeWidth={2}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export interface DirectLabelProps {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
}

/** A label written on the chart next to its mark (dataviz: at most two marks per chart). */
export function DirectLabel({ x, y, children, anchor = "middle" }: DirectLabelProps) {
  return (
    <text
      data-chart="direct-label"
      x={x}
      y={y}
      textAnchor={anchor}
      className="fill-ink text-label font-semibold"
    >
      {children}
    </text>
  );
}

export interface ChartTooltipProps {
  /** Position inside the chart container, CSS pixels. */
  x: number;
  y: number;
  lines: readonly string[];
  /** Keep the box inside a container this wide. */
  containerWidth: number;
}

/**
 * The hover layer: a small raised box above the mark. It repeats the mark's accessible name, so it
 * is hidden from assistive tech.
 */
export function ChartTooltip({ x, y, lines, containerWidth }: ChartTooltipProps) {
  const width = 220;
  const left = Math.min(Math.max(0, x - width / 2), Math.max(0, containerWidth - width));
  return (
    <div
      aria-hidden="true"
      data-chart="tooltip"
      className="pointer-events-none absolute z-10 rounded-sm border border-control-border bg-surface-raised px-3 py-2 text-label text-ink"
      style={{ left, top: Math.max(0, y), width, transform: "translateY(-100%)" }}
    >
      {lines.map((line, i) => (
        <span key={line} className={`block ${i === 0 ? "font-semibold" : ""}`}>
          {line}
        </span>
      ))}
    </div>
  );
}
