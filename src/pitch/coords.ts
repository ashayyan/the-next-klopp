// Provider coordinates to canonical metres, and back. The single place coordinate bugs can live.
//
// Port of kloppy 3.19.1 pitch.py (PitchDimensions._transformation_zones_x/_y, to_metric_base,
// from_metric_base) and transformers.py (__change_point_coordinate_system). Opta and Wyscout
// fixed landmarks are as implemented by kloppy 3.19.1. Expected values come from kloppy itself:
// src/pitch/fixtures/landmarks.json, written by `klopp-pipeline landmarks` and checked by both
// Vitest and pytest.
//
// Canonical frame: metres, origin top-left of the field, x along the touchline 0..length, y down
// 0..width. Fixed-landmark providers are warped zone by zone so penalty-area lines, goal-area
// lines, penalty spots and the centre line land exactly on the Law 1 landmarks of the scene pitch.
// Inputs are post-parse provider coordinates: the StatsBomb cell-centre offset is applied only by
// statsBombCellCentre(), never inside the converter.

export type ProviderId =
  | "statsbomb"
  | "opta"
  | "wyscout"
  | "tracab"
  | "tracking-metres"
  | "metrica";

export interface Landmarks {
  sixYardLength: number;
  sixYardWidth: number;
  goalWidth: number;
  penaltyAreaLength: number;
  penaltyAreaWidth: number;
  circleRadius: number;
  penaltySpotDistance: number;
  penaltyArcRadius: number;
}

export interface ProviderFrame {
  id: ProviderId;
  label: string;
  unit: "yards" | "normed" | "centimetres" | "metres" | "unit";
  origin: "top-left" | "bottom-left" | "centre";
  /** True when provider y grows down the screen (as canonical y does). */
  yDown: boolean;
  /** "fixed": the axis range is a constant; "pitch": the range is the real pitch size. */
  axis: "fixed" | "pitch";
  fixedSize?: { length: number; width: number };
  /** Landmarks in provider units, or "ifab" (Law 1 values scaled to the provider unit). */
  landmarks: Landmarks | "ifab";
}

/** Law 1 landmark distances in metres (kloppy MetricPitchDimensions, IFAB 2026/27). */
export const IFAB_LANDMARKS: Landmarks = {
  sixYardLength: 5.5,
  sixYardWidth: 18.32,
  goalWidth: 7.32,
  penaltyAreaLength: 16.5,
  penaltyAreaWidth: 40.32,
  circleRadius: 9.15,
  penaltySpotDistance: 11,
  penaltyArcRadius: 9.15,
};

export const PROVIDERS: Partial<Record<ProviderId, ProviderFrame>> = {
  // kloppy StatsBombCoordinateSystem + ImperialPitchDimensions.
  statsbomb: {
    id: "statsbomb",
    label: "StatsBomb (120 × 80)",
    unit: "yards",
    origin: "top-left",
    yDown: true,
    axis: "fixed",
    fixedSize: { length: 120, width: 80 },
    landmarks: {
      sixYardLength: 6,
      sixYardWidth: 20,
      goalWidth: 8,
      penaltyAreaLength: 18,
      penaltyAreaWidth: 44,
      circleRadius: 10,
      penaltySpotDistance: 12,
      penaltyArcRadius: 10,
    },
  },
};

export interface ConvertOptions {
  /** The scene pitch in metres (the canonical target). */
  pitch: { length: number; width: number };
  /** Real pitch of the source data, for pitch-sized providers (tracking, Metrica). Default: pitch. */
  sourcePitch?: { length: number; width: number };
}

interface Pt {
  x: number;
  y: number;
}

/** Axis ranges plus landmarks in one unit system (kloppy PitchDimensions). */
interface Dims {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  lm: Landmarks;
}

type Zone = readonly [number, number];

function frameOf(provider: ProviderId): ProviderFrame {
  const frame = PROVIDERS[provider];
  if (!frame) throw new Error(`unknown provider "${provider}"`);
  return frame;
}

function scaled(lm: Landmarks, kx: number, ky: number): Landmarks {
  // x-axis distances scale with length, y-axis distances (widths) with width.
  return {
    sixYardLength: lm.sixYardLength * kx,
    sixYardWidth: lm.sixYardWidth * ky,
    goalWidth: lm.goalWidth * ky,
    penaltyAreaLength: lm.penaltyAreaLength * kx,
    penaltyAreaWidth: lm.penaltyAreaWidth * ky,
    circleRadius: lm.circleRadius * kx,
    penaltySpotDistance: lm.penaltySpotDistance * kx,
    penaltyArcRadius: lm.penaltyArcRadius * kx,
  };
}

function metricDims(length: number, width: number): Dims {
  return { xMin: 0, xMax: length, yMin: 0, yMax: width, lm: IFAB_LANDMARKS };
}

function sourceDims(frame: ProviderFrame, real: { length: number; width: number }): Dims {
  if (frame.axis === "fixed") {
    const size = frame.fixedSize;
    if (!size || frame.landmarks === "ifab") {
      throw new Error(`provider "${frame.id}" needs fixedSize and landmarks`);
    }
    return { xMin: 0, xMax: size.length, yMin: 0, yMax: size.width, lm: frame.landmarks };
  }
  const { length: L, width: W } = real;
  if (frame.unit === "unit") {
    return { xMin: 0, xMax: 1, yMin: 0, yMax: 1, lm: scaled(IFAB_LANDMARKS, 1 / L, 1 / W) };
  }
  const k = frame.unit === "centimetres" ? 100 : 1;
  const lm = k === 1 ? IFAB_LANDMARKS : scaled(IFAB_LANDMARKS, k, k);
  if (frame.origin === "centre") {
    return { xMin: (-L / 2) * k, xMax: (L / 2) * k, yMin: (-W / 2) * k, yMax: (W / 2) * k, lm };
  }
  return { xMin: 0, xMax: L * k, yMin: 0, yMax: W * k, lm };
}

function zonesX(d: Dims, length: number): Zone[] {
  const l = d.lm;
  const m = d.xMin;
  const arc = l.penaltySpotDistance + l.penaltyArcRadius;
  return [
    [m, m + l.sixYardLength],
    [m + l.sixYardLength, m + l.penaltySpotDistance],
    [m + l.penaltySpotDistance, m + l.penaltyAreaLength],
    [m + l.penaltyAreaLength, m + arc],
    [m + arc, m + length / 2 - l.circleRadius],
    [m + length / 2 - l.circleRadius, m + length / 2],
  ];
}

function zonesY(d: Dims, width: number): Zone[] {
  const l = d.lm;
  const m = d.yMin;
  return [
    [m, m + (width - l.penaltyAreaWidth) / 2],
    [m + (width - l.penaltyAreaWidth) / 2, m + (width - l.sixYardWidth) / 2],
    [m + (width - l.sixYardWidth) / 2, m + (width - l.goalWidth) / 2],
    [m + (width - l.goalWidth) / 2, m + width / 2],
  ];
}

function zoneIndex(zones: readonly Zone[], v: number): number {
  return zones.findIndex((z) => z[0] <= v && v <= z[1]);
}

/** kloppy to_metric_base `transform`: provider value to IFAB metres on the base pitch. */
function toBase(
  v: number,
  from: readonly Zone[],
  fromLen: number,
  ifab: readonly Zone[],
  ifabLen: number,
) {
  const f0 = from[0]?.[0] ?? 0;
  const last = from[from.length - 1]?.[1] ?? 0;
  let value = v;
  let mirror = false;
  if (value > last) {
    value = fromLen - (value - f0) + f0;
    mirror = true;
  }
  const z = zoneIndex(from, value);
  const fz = from[z];
  const iz = ifab[z];
  let out: number;
  if (fz === undefined || iz === undefined) {
    // Outside the pitch: global per-axis scale (kloppy StopIteration branch).
    out = (ifab[0]?.[0] ?? 0) + (value - f0) * (ifabLen / fromLen);
  } else {
    out = iz[0] + (value - fz[0]) * ((iz[1] - iz[0]) / (fz[1] - fz[0]));
  }
  return mirror ? ifabLen - out : out;
}

/** kloppy from_metric_base `transform`: IFAB metres on the base pitch to target units. */
function fromBase(
  v: number,
  to: readonly Zone[],
  toLen: number,
  ifab: readonly Zone[],
  ifabLen: number,
) {
  const t0 = to[0]?.[0] ?? 0;
  let value = v;
  let mirror = false;
  if (value > ifabLen / 2) {
    value = ifabLen - value;
    mirror = true;
  }
  const z = zoneIndex(ifab, value);
  const tz = to[z];
  const iz = ifab[z];
  if (tz === undefined || iz === undefined) {
    value = t0 + (value - (ifab[0]?.[0] ?? 0)) * (toLen / ifabLen);
  } else {
    value = tz[0] + (value - iz[0]) * ((tz[1] - tz[0]) / (iz[1] - iz[0]));
  }
  return mirror ? toLen + t0 - value + t0 : value;
}

function dimsToMetricBase(d: Dims, p: Pt, baseL: number, baseW: number): Pt {
  const ifab = metricDims(baseL, baseW);
  const lenX = d.xMax - d.xMin;
  const lenY = d.yMax - d.yMin;
  return {
    x: toBase(p.x, zonesX(d, lenX), lenX, zonesX(ifab, baseL), baseL),
    y: toBase(p.y, zonesY(d, lenY), lenY, zonesY(ifab, baseW), baseW),
  };
}

function dimsFromMetricBase(d: Dims, p: Pt, baseL: number, baseW: number): Pt {
  const ifab = metricDims(baseL, baseW);
  const lenX = d.xMax - d.xMin;
  const lenY = d.yMax - d.yMin;
  return {
    x: fromBase(p.x, zonesX(d, lenX), lenX, zonesX(ifab, baseL), baseL),
    y: fromBase(p.y, zonesY(d, lenY), lenY, zonesY(ifab, baseW), baseW),
  };
}

interface Plan {
  source: Dims;
  target: Dims;
  baseL: number;
  baseW: number;
  flipY: boolean;
  /** Pitch-sized source of the same size as the scene: translation, scale and flip only. */
  affine: boolean;
}

function plan(provider: ProviderId, opts: ConvertOptions): Plan {
  const frame = frameOf(provider);
  const real = frame.axis === "pitch" ? (opts.sourcePitch ?? opts.pitch) : opts.pitch;
  const same =
    frame.axis === "pitch" && real.length === opts.pitch.length && real.width === opts.pitch.width;
  return {
    source: sourceDims(frame, real),
    target: metricDims(opts.pitch.length, opts.pitch.width),
    baseL: real.length,
    baseW: real.width,
    flipY: !frame.yDown,
    affine: same,
  };
}

/** Provider-native (post-parse) coordinates to canonical metres on the scene pitch. */
export function toCanonical(provider: ProviderId, p: Pt, opts: ConvertOptions): Pt {
  const pl = plan(provider, opts);
  const s = pl.source;
  if (pl.affine) {
    const x = ((p.x - s.xMin) * opts.pitch.length) / (s.xMax - s.xMin);
    const y = ((p.y - s.yMin) * opts.pitch.width) / (s.yMax - s.yMin);
    return { x, y: pl.flipY ? opts.pitch.width - y : y };
  }
  const base = dimsToMetricBase(s, p, pl.baseL, pl.baseW);
  if (pl.flipY) base.y = pl.baseW - base.y;
  return dimsFromMetricBase(pl.target, base, pl.baseL, pl.baseW);
}

/** Canonical metres on the scene pitch back to provider-native coordinates (exact inverse). */
export function fromCanonical(provider: ProviderId, p: Pt, opts: ConvertOptions): Pt {
  const pl = plan(provider, opts);
  const s = pl.source;
  if (pl.affine) {
    const y = pl.flipY ? opts.pitch.width - p.y : p.y;
    return {
      x: s.xMin + (p.x * (s.xMax - s.xMin)) / opts.pitch.length,
      y: s.yMin + (y * (s.yMax - s.yMin)) / opts.pitch.width,
    };
  }
  const base = dimsToMetricBase(pl.target, p, pl.baseL, pl.baseW);
  if (pl.flipY) base.y = pl.baseW - base.y;
  return dimsFromMetricBase(s, base, pl.baseL, pl.baseW);
}

/** The provider's in-pitch coordinate range (used by the converter probe on /dev/pitch). */
export function providerBounds(provider: ProviderId, opts: ConvertOptions) {
  const pl = plan(provider, opts);
  return { xMin: pl.source.xMin, xMax: pl.source.xMax, yMin: pl.source.yMin, yMax: pl.source.yMax };
}

/**
 * Raw StatsBomb cell coordinates to the point kloppy reports: (1, 1) names the top-left one-yard
 * cell, so its centre is (0.5, 0.5); fidelity 2 data uses 0.1-yard cells (offset 0.05).
 * Apply once, before toCanonical; the converter itself never applies it.
 */
export function statsBombCellCentre(raw: Pt, fidelity: 1 | 2): Pt {
  const half = fidelity === 2 ? 0.05 : 0.5;
  return { x: raw.x - half, y: raw.y - half };
}
