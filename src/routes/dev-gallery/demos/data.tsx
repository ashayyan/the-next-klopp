import { type ReactNode, useState } from "react";
import { Pitch } from "../../../pitch/Pitch.tsx";
import {
  Axis,
  Bars,
  ChartLegend,
  ChartTooltip,
  type ChartView,
  DirectLabel,
  formatNumber,
  Gridlines,
  type LegendItem,
  Line,
  linear,
  Marker,
  type MarkerShape,
  TableViewToggle,
  ticks,
} from "../../../ui/data/chart.tsx";
import { type DataColumn, DataTable } from "../../../ui/data/DataTable.tsx";
import { StatCard } from "../../../ui/data/StatCard.tsx";
import { useMeasuredWidth } from "../../dev-directions/shared.ts";
import { useGalleryTheme } from "../StateCell.tsx";

// Data primitives in the gallery (04-UI-SPEC "/dev/gallery contract", Data rows). Every number here
// is example data written for the gallery, and each chart says so.

const EXAMPLE = "Example numbers for the gallery.";

// ---------------------------------------------------------------- stat card

export function StatCardDemo({ state }: { state: string }) {
  if (state === "three-figures") {
    return (
      <StatCard
        layout="row"
        figures={[
          { value: "14", label: "passes into the box" },
          { value: "1.8", unit: "xG", label: "chances created" },
          { value: "62", unit: "%", label: "possession" },
        ]}
      />
    );
  }
  if (state === "loading") {
    return <StatCard figures={[{ value: "", label: "passes into the box", status: "loading" }]} />;
  }
  if (state === "missing") {
    return (
      <StatCard
        figures={[
          {
            value: "",
            label: "distance covered",
            status: "missing",
            reason: "No tracking data for this match.",
          },
        ]}
      />
    );
  }
  return <StatCard figures={[{ value: "14", label: "passes into the box" }]} />;
}

// ---------------------------------------------------------------- chart primitives

const HEIGHT = 220;
const MARGIN = { top: 16, right: 8, bottom: 36, left: 52 };
const MATCHES = [1, 2, 3, 4, 5, 6];

interface Series {
  key: string;
  label: string;
  shape: MarkerShape;
  stroke: string;
  fill: string;
  values: readonly number[];
}

const SERIES: readonly Series[] = [
  {
    key: "a",
    label: "Wide play",
    shape: "circle",
    stroke: "stroke-data-cat-1",
    fill: "fill-data-cat-1",
    values: [4, 7, 6, 9, 11, 10],
  },
  {
    key: "b",
    label: "Central play",
    shape: "square",
    stroke: "stroke-data-cat-2",
    fill: "fill-data-cat-2",
    values: [10, 9, 12, 8, 7, 6],
  },
  {
    key: "c",
    label: "Long balls",
    shape: "diamond",
    stroke: "stroke-data-cat-3",
    fill: "fill-data-cat-3",
    values: [2, 3, 2, 4, 3, 5],
  },
];

const BARS = [
  { key: "1", value: 12 },
  { key: "2", value: -6 },
  { key: "3", value: 18 },
  { key: "4", value: 4 },
  { key: "5", value: -12 },
  { key: "6", value: 9 },
];

interface FrameProps {
  title: string;
  /** Pixels of room on the right for the direct labels. */
  rightRoom?: number;
  children: (g: {
    width: number;
    plotW: number;
    plotH: number;
    left: number;
    top: number;
  }) => ReactNode;
  /** Drawn over the chart; gets the measured width so it stays inside the figure. */
  tooltip?: (width: number) => ReactNode;
}

/** A measured chart frame: a title, the example-data note and an SVG in real pixels. */
function ChartFrame({ title, rightRoom = 0, children, tooltip }: FrameProps) {
  const [ref, width] = useMeasuredWidth(360);
  const plotW = Math.max(10, width - MARGIN.left - MARGIN.right - rightRoom);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  return (
    <figure data-chart-figure className="flex w-full min-w-0 max-w-[40rem] flex-col gap-2">
      <figcaption className="flex flex-col">
        <span className="font-semibold text-label">{title}</span>
        <span className="text-label text-ink-muted">{EXAMPLE}</span>
      </figcaption>
      <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={title}
          className="block overflow-visible"
        >
          {children({ width, plotW, plotH, left: MARGIN.left, top: MARGIN.top })}
        </svg>
        {tooltip?.(width)}
      </div>
    </figure>
  );
}

function matchAxis(left: number, plotW: number, plotH: number) {
  const x = linear([0.5, MATCHES.length + 0.5], [left, left + plotW]);
  return (
    <Axis
      orientation="bottom"
      values={MATCHES}
      at={(v) => x(Number(v))}
      offset={MARGIN.top + plotH + 8}
      label="Match"
      labelOffset={HEIGHT - 2}
      labelAt={left + plotW / 2}
    />
  );
}

/** Bars with positive and negative values around a zero baseline; optional direct label and tooltip. */
function BarChart({
  labelled = false,
  tooltip = false,
}: {
  labelled?: boolean;
  tooltip?: boolean;
}) {
  const domain: [number, number] = [-20, 20];
  const marks = ticks(-20, 20, 10);
  const frame = (g: { plotW: number; plotH: number; left: number; top: number }) => {
    const y = linear(domain, [g.top + g.plotH, g.top]);
    const band = g.plotW / BARS.length;
    const bandX = (i: number) => g.left + i * band;
    const labelAt = BARS[0];
    return (
      <>
        <Gridlines values={marks} y={y} x0={g.left} x1={g.left + g.plotW} />
        <Axis
          orientation="left"
          values={marks}
          at={(v) => y(Number(v))}
          offset={g.left - 8}
          format={(v) => formatNumber(Number(v), 0)}
          label="Change in xG, per cent"
          labelOffset={0}
          labelAt={g.top + g.plotH / 2}
        />
        <Axis
          orientation="bottom"
          values={BARS.map((b) => b.key)}
          at={(v) => bandX(Number(v) - 1) + band / 2}
          offset={g.top + g.plotH + 8}
          label="Match"
          labelOffset={HEIGHT - 2}
          labelAt={g.left + g.plotW / 2}
        />
        <Bars
          data={BARS}
          bandX={bandX}
          bandWidth={band}
          y={y}
          radius={2}
          active={tooltip ? "3" : null}
        />
        {labelled && labelAt ? (
          <DirectLabel x={g.left} y={y(labelAt.value) - 8} anchor="start">
            {`${formatNumber(labelAt.value, 0)}% in match 1`}
          </DirectLabel>
        ) : null}
      </>
    );
  };
  return (
    <ChartFrame
      title="Change in xG per match"
      tooltip={
        tooltip
          ? (width) => (
              <ChartTooltip
                x={MARGIN.left + ((width - MARGIN.left - MARGIN.right) / BARS.length) * 2.5 + 120}
                y={96}
                containerWidth={width}
                lines={["Match 3", "+18% xG", "Example value"]}
              />
            )
          : undefined
      }
    >
      {frame}
    </ChartFrame>
  );
}

/** Lines with markers; each series has its own colour and shape. One series needs no legend. */
function LineChart({ series }: { series: readonly Series[] }) {
  const domain: [number, number] = [0, 15];
  const marks = ticks(0, 15, 5);
  const direct = series.length > 1;
  return (
    <ChartFrame title="Passes into the box per match" rightRoom={direct ? 104 : 0}>
      {(g) => {
        const x = linear([0.5, MATCHES.length + 0.5], [g.left, g.left + g.plotW]);
        const y = linear(domain, [g.top + g.plotH, g.top]);
        const labelYs = spreadLabels(
          series.map((s) => ({ key: s.key, y: y(s.values[s.values.length - 1] ?? 0) })),
          16,
        );
        return (
          <>
            <Gridlines values={marks} y={y} x0={g.left} x1={g.left + g.plotW} />
            <Axis
              orientation="left"
              values={marks}
              at={(v) => y(Number(v))}
              offset={g.left - 8}
              format={(v) => formatNumber(Number(v), 0)}
              label="Passes"
              labelOffset={0}
              labelAt={g.top + g.plotH / 2}
            />
            {matchAxis(g.left, g.plotW, g.plotH)}
            {series.map((s) => {
              const points = s.values.map((v, i) => ({ x: x(i + 1), y: y(v) }));
              const labelY = labelYs.get(s.key);
              const last = points[points.length - 1];
              return (
                <g key={s.key} data-series={s.key}>
                  <Line points={points} className={s.stroke} />
                  {points.map((p) => (
                    <Marker key={p.x} x={p.x} y={p.y} shape={s.shape} className={s.fill} />
                  ))}
                  {last && direct ? (
                    <DirectLabel x={last.x + 12} y={(labelY ?? last.y) + 4} anchor="start">
                      {s.label}
                    </DirectLabel>
                  ) : null}
                </g>
              );
            })}
          </>
        );
      }}
    </ChartFrame>
  );
}

/** Moves end labels apart so no two sit closer than `gap` px; the order of the marks is kept. */
function spreadLabels(items: { key: string; y: number }[], gap: number): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const out = new Map<string, number>();
  let previous = Number.NEGATIVE_INFINITY;
  for (const item of sorted) {
    const y = Math.max(item.y, previous + gap);
    out.set(item.key, y);
    previous = y;
  }
  return out;
}

function legendOf(series: readonly Series[]): LegendItem[] {
  return series.map((s) => ({ key: s.key, label: s.label, shape: s.shape, className: s.fill }));
}

interface TableRow {
  match: number;
  wide: number;
  central: number;
}

function ViewToggleChart({ initial }: { initial: ChartView }) {
  const [view, setView] = useState<ChartView>(initial);
  const rows: TableRow[] = MATCHES.map((m, i) => ({
    match: m,
    wide: SERIES[0]?.values[i] ?? 0,
    central: SERIES[1]?.values[i] ?? 0,
  }));
  const columns: DataColumn<TableRow>[] = [
    { id: "match", header: "Match", cell: (r) => r.match, numeric: true },
    { id: "wide", header: "Wide play", cell: (r) => formatNumber(r.wide, 0), numeric: true },
    {
      id: "central",
      header: "Central play",
      cell: (r) => formatNumber(r.central, 0),
      numeric: true,
    },
  ];
  const two = SERIES.slice(0, 2);
  return (
    <div className="flex w-full min-w-0 max-w-[40rem] flex-col gap-3">
      <TableViewToggle view={view} onViewChange={setView} />
      {view === "chart" ? (
        <>
          <LineChart series={two} />
          <ChartLegend items={legendOf(two)} />
        </>
      ) : (
        <DataTable
          caption="Passes into the box per match. Example numbers for the gallery."
          columns={columns}
          rows={rows}
          rowKey={(r) => String(r.match)}
        />
      )}
    </div>
  );
}

export function ChartPrimitivesDemo({ state }: { state: string }) {
  if (state === "axis-gridlines") {
    return (
      <ChartFrame title="Axis and gridlines">
        {(g) => {
          const y = linear([-20, 20], [g.top + g.plotH, g.top]);
          const marks = ticks(-20, 20, 10);
          return (
            <>
              <Gridlines values={marks} y={y} x0={g.left} x1={g.left + g.plotW} />
              <Axis
                orientation="left"
                values={marks}
                at={(v) => y(Number(v))}
                offset={g.left - 8}
                format={(v) => formatNumber(Number(v), 0)}
                label="Value"
                labelOffset={0}
                labelAt={g.top + g.plotH / 2}
              />
              {matchAxis(g.left, g.plotW, g.plotH)}
            </>
          );
        }}
      </ChartFrame>
    );
  }
  if (state === "bars") return <BarChart />;
  if (state === "label-tooltip") return <BarChart labelled tooltip />;
  if (state === "line-marker") return <LineChart series={SERIES.slice(0, 1)} />;
  if (state === "legend-2-series") {
    const two = SERIES.slice(0, 2);
    return (
      <div className="flex w-full min-w-0 max-w-[40rem] flex-col gap-3">
        <LineChart series={two} />
        <ChartLegend items={legendOf(two)} />
      </div>
    );
  }
  if (state === "legend-3-series") {
    return (
      <div className="flex w-full min-w-0 max-w-[40rem] flex-col gap-3">
        <LineChart series={SERIES} />
        <ChartLegend items={legendOf(SERIES)} />
      </div>
    );
  }
  return <ViewToggleChart initial="table" />;
}

// ---------------------------------------------------------------- data table

interface EventRow {
  id: string;
  minute: string;
  event: string;
  player: string;
  metres: number;
}

const EVENTS: EventRow[] = [
  { id: "e1", minute: "12:04", event: "Pass", player: "Player A", metres: 8.4 },
  { id: "e2", minute: "12:09", event: "Carry", player: "Player B", metres: 14.2 },
  { id: "e3", minute: "12:15", event: "Pass", player: "Player C", metres: -3.1 },
  { id: "e4", minute: "12:21", event: "Shot", player: "Player D", metres: 22 },
];

const FOUR_COLUMNS: DataColumn<EventRow>[] = [
  { id: "minute", header: "Time", cell: (r) => r.minute, numeric: true },
  { id: "event", header: "Event", cell: (r) => r.event },
  { id: "player", header: "Player", cell: (r) => r.player },
  { id: "metres", header: "Metres", cell: (r) => formatNumber(r.metres), numeric: true },
];

const THREE_COLUMNS = FOUR_COLUMNS.filter((c) => c.id !== "player");

export const EMPTY_TABLE = {
  heading: "No events in this window",
  body: "Widen the time window or pick another match to see events here.",
} as const;

export function DataTableDemo({ state }: { state: string }) {
  const empty = state === "empty";
  const interactive = state === "active-row" || state === "hover-row";
  return (
    <div className="w-full min-w-0 max-w-[40rem]">
      <DataTable
        caption="Events in this window. Example numbers for the gallery."
        columns={state === "three-column" ? THREE_COLUMNS : FOUR_COLUMNS}
        rows={empty ? [] : EVENTS}
        rowKey={(r) => r.id}
        activeRow={state === "active-row" ? "e2" : null}
        rowLabel={(r) => `${r.minute}, ${r.event}, ${r.player}`}
        onRowEnter={interactive ? () => undefined : undefined}
        rowState={state === "hover-row" ? (r) => (r.id === "e3" ? "hover" : undefined) : undefined}
        empty={EMPTY_TABLE}
      />
    </div>
  );
}

// ---------------------------------------------------------------- scales

const CATEGORICAL = [
  { token: "data-cat-1", name: "Category 1", shape: "circle", fill: "fill-data-cat-1" },
  { token: "data-cat-2", name: "Category 2", shape: "square", fill: "fill-data-cat-2" },
  { token: "data-cat-3", name: "Category 3", shape: "diamond", fill: "fill-data-cat-3" },
  { token: "data-cat-other", name: "Other", shape: "circle", fill: "fill-data-cat-other" },
] as const;

/** Shared by the pitch grid and its key: level 1 (lowest) to 5. */
const SEQUENTIAL = [1, 2, 3, 4, 5] as const;

const ZONE_COLS = 6;
const ZONE_ROWS = 3;

const ZONES = Array.from({ length: ZONE_COLS * ZONE_ROWS }, (_unused, n) => {
  const col = n % ZONE_COLS;
  const row = Math.floor(n / ZONE_COLS);
  return { col, row, key: `${col}-${row}` };
});

/** A sample level for zone (col, row): higher towards the attacking end and the centre lane. */
export function zoneLevel(col: number, row: number): number {
  const raw = 1 + (col * 4) / (ZONE_COLS - 1) - (row === 1 ? 0 : 0.8);
  return Math.min(5, Math.max(1, Math.round(raw)));
}

/** Text on a sequential cell: the light theme ramps pale to dark, the dark theme dark to pale. */
function zoneTextFill(level: number, theme: "light" | "dark"): string {
  if (theme === "light") return level >= 3 ? "var(--accent-ink)" : "var(--ink)";
  return level >= 4 ? "var(--accent-ink)" : "var(--ink)";
}

function ZoneGrid() {
  const theme = useGalleryTheme();
  const length = 105;
  const width = 68;
  const zw = length / ZONE_COLS;
  const zh = width / ZONE_ROWS;
  return (
    <div className="w-full max-w-[40rem]">
      <Pitch title="Eighteen zones shaded by level, 1 to 5" length={length} width={width}>
        {ZONES.map(({ col, row, key }) => {
          const level = zoneLevel(col, row);
          return (
            <g key={key} data-zone={key} data-level={level}>
              <rect
                x={col * zw}
                y={row * zh}
                width={zw}
                height={zh}
                style={{ fill: `var(--data-seq-${level})` }}
                fillOpacity={0.92}
              />
              <text
                x={col * zw + zw / 2}
                y={row * zh + zh / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-mono"
                style={{ fill: zoneTextFill(level, theme), fontSize: 4 }}
              >
                {level}
              </text>
            </g>
          );
        })}
      </Pitch>
    </div>
  );
}

export function ScalesDemo({ state }: { state: string }) {
  if (state === "sequential") {
    return (
      <div className="flex w-full flex-col gap-3">
        <ZoneGrid />
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-label" aria-label="Sequential scale">
          {SEQUENTIAL.map((level) => (
            <li key={level} data-seq={level} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-5 border border-control-border"
                style={{ background: `var(--data-seq-${level})` }}
              />
              <span className="font-mono tabular-nums">{level}</span>
              <span className="text-ink-muted">
                {level === 1 ? "lowest" : level === 5 ? "highest" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (state === "diverging") {
    return (
      <div className="flex w-full max-w-[40rem] flex-col gap-2">
        <div
          data-diverging
          role="img"
          aria-label="Diverging scale from below the average, through the average, to above it"
          className="flex h-6 w-full"
        >
          <span className="h-full flex-1 bg-data-div-neg" />
          <span className="h-full flex-1 bg-data-div-mid" />
          <span className="h-full flex-1 bg-data-div-pos" />
        </div>
        <div className="flex justify-between text-label">
          <span>Below average</span>
          <span className="text-ink-muted">Average</span>
          <span>Above average</span>
        </div>
      </div>
    );
  }
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Categorical scale">
      {CATEGORICAL.map((c) => (
        <li key={c.token} data-cat={c.token} className="flex items-center gap-2 text-label">
          <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <Marker x={10} y={10} shape={c.shape} size={14} className={c.fill} />
          </svg>
          <span className="font-semibold">{c.name}</span>
          <span className="font-mono text-ink-muted">{`--${c.token}`}</span>
        </li>
      ))}
    </ul>
  );
}
