// Converter probe and provider-landmarks overlay for /dev/pitch (PITCH-02 visible in the app).
// Pure: no React, no DOM. Every conversion goes through the real converter in src/pitch/coords.ts,
// never through stored expected values, so the overlay and the probe exercise the live code.
import { type ProviderId, providerBounds, toCanonical } from "../../pitch/coords.ts";
import landmarks from "../../pitch/fixtures/landmarks.json";

export interface ProbeProvider {
  id: ProviderId;
  label: string;
  /** One-letter chip on the landmarks overlay. */
  chip: "S" | "O" | "W" | "T";
}

/** In the order of the 03-UI-SPEC "Converter probe" select. */
export const PROBE_PROVIDERS: readonly ProbeProvider[] = [
  { id: "statsbomb", label: "StatsBomb (120 × 80)", chip: "S" },
  { id: "opta", label: "Opta (0–100)", chip: "O" },
  { id: "wyscout", label: "Wyscout (0–100)", chip: "W" },
  { id: "tracking-metres", label: "Tracking (metres, centre origin)", chip: "T" },
];

export interface Pitch {
  length: number;
  width: number;
}

export type ProbeResult =
  | { ok: true; point: { x: number; y: number } }
  | { ok: false; field: "x" | "y"; message: string };

// Plain decimal text only: no exponent, hex, Infinity or NaN, which Number() would let through.
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

function parse(text: string): number | null {
  const trimmed = text.trim();
  if (!DECIMAL.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** 52.5 stays 52.5, 120 stays 120: no trailing zeros and no float dust. */
function plain(n: number): string {
  return String(Number(n.toFixed(2)));
}

/**
 * Converts provider text input to canonical metres on the scene pitch. Validates against the
 * provider's own bounds first, so an out-of-range value is an error and never a drawn point.
 */
export function probeConvert(
  provider: ProviderId,
  xText: string,
  yText: string,
  pitch: Pitch,
): ProbeResult {
  const entry = PROBE_PROVIDERS.find((p) => p.id === provider);
  const label = entry?.label ?? provider;
  const bounds = providerBounds(provider, { pitch });
  const x = parse(xText);
  if (x === null) return { ok: false, field: "x", message: "x must be a number." };
  if (x < bounds.xMin || x > bounds.xMax) {
    return {
      ok: false,
      field: "x",
      message: `x must be between ${plain(bounds.xMin)} and ${plain(bounds.xMax)} for ${label}.`,
    };
  }
  const y = parse(yText);
  if (y === null) return { ok: false, field: "y", message: "y must be a number." };
  if (y < bounds.yMin || y > bounds.yMax) {
    return {
      ok: false,
      field: "y",
      message: `y must be between ${plain(bounds.yMin)} and ${plain(bounds.yMax)} for ${label}.`,
    };
  }
  return { ok: true, point: toCanonical(provider, { x, y }, { pitch }) };
}

export interface LandmarkMark {
  provider: ProviderId;
  chip: ProbeProvider["chip"];
  name: string;
  point: { x: number; y: number };
}

interface LandmarkCase {
  provider: string;
  name: string;
  targetPitch: Pitch;
  sourcePitch?: Pitch;
  input: number[];
}

const OVERLAY_PITCH: Pitch = { length: 105, width: 68 };

/**
 * One mark per fixture case on the given pitch (105 x 68 by default) for the four overlay
 * providers, each converted live from its `input`. Run-off and source-pitch cases are left out:
 * they test bounds and scaling, not shared landmarks. Correct converters make the points of one
 * landmark coincide; the left and right penalty marks form two separate clusters. A pitch size the
 * fixture has no cases for (101 x 68) yields no marks.
 */
export function landmarkMarks(pitch: Pitch = OVERLAY_PITCH): LandmarkMark[] {
  const marks: LandmarkMark[] = [];
  for (const c of landmarks.cases as LandmarkCase[]) {
    const entry = PROBE_PROVIDERS.find((p) => p.id === c.provider);
    if (!entry || c.sourcePitch) continue;
    if (c.targetPitch.length !== pitch.length || c.targetPitch.width !== pitch.width) continue;
    if (c.name.startsWith("run-off")) continue;
    const [x, y] = c.input;
    if (x === undefined || y === undefined) continue;
    marks.push({
      provider: entry.id,
      chip: entry.chip,
      name: c.name,
      point: toCanonical(entry.id, { x, y }, { pitch }),
    });
  }
  return marks;
}
