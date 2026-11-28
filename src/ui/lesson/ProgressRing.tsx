import { Meter } from "@base-ui/react/meter";

export interface ProgressRingProps {
  value: number;
  max: number;
  /** The visible words and the meter's name, for example "4 of 10 concepts". */
  label: string;
  /** Put the label under the ring instead of beside it. */
  stacked?: boolean;
  /** Ring diameter in CSS pixels. */
  size?: number;
}

const RADIUS = 16;
const STROKE = 4;

/**
 * An SVG progress ring with Base UI Meter semantics (`role="meter"` with value, min, max and the
 * label as its name). The fill is the accent (04-UI-SPEC "Accent reserved for", item 5), the track
 * the panel tone, and the share is also written as a number in the middle, so the fill is never the
 * only carrier. There is no streak, no "lost" look and no urgency: a ring at 0 is just empty.
 */
export function ProgressRing({ value, max, label, stacked = false, size = 64 }: ProgressRingProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);
  return (
    <Meter.Root
      value={clamped}
      min={0}
      max={safeMax}
      getAriaValueText={() => label}
      data-progress-ring
      className={`inline-flex items-center gap-3 ${stacked ? "flex-col text-center" : ""}`}
    >
      <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 40 40"
          width={size}
          height={size}
          aria-hidden="true"
          focusable="false"
          className="-rotate-90 block"
        >
          <circle
            cx={20}
            cy={20}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-surface-panel"
          />
          {percent > 0 ? (
            <circle
              data-ring-fill
              cx={20}
              cy={20}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              pathLength={100}
              strokeDasharray={`${percent} ${100 - percent}`}
              className="stroke-accent"
            />
          ) : null}
        </svg>
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-mono text-label tabular-nums"
        >
          {`${percent}%`}
        </span>
      </span>
      <Meter.Label className="text-label text-ink">{label}</Meter.Label>
    </Meter.Root>
  );
}
