// Colour maths for the palette gate and the screenshot-review contrast checks. Dependency-free,
// erasable TypeScript. Formulas are re-implemented from their published sources:
//   WCAG 2.2 relative luminance and contrast ratio (w3.org/TR/WCAG22),
//   OKLab (Ottosson 2020, bottosson.github.io/posts/oklab),
//   colour-vision-deficiency simulation (Machado, Oliveira, Fernandes 2009, IEEE TVCG 15(6)),
//   severity 1.0, applied to linear RGB. Thresholds elsewhere are calibrated to this model, so do
//   not swap in Vienot 1999.

export type Rgb = [number, number, number];
export type CvdKind = "protan" | "deutan" | "tritan";

/** A parsed colour: channels 0 to 255 (not necessarily whole numbers), alpha 0 to 1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const satisfies Record<CvdKind, readonly (readonly number[])[]>;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const toLin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

/** Linear sRGB of `#RRGGBB` (an alpha pair after the six digits is ignored). */
export function hexToLin(hex: string): Rgb {
  if (!/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/.test(hex))
    throw new Error(`not a hex colour: ${hex}`);
  return [1, 3, 5].map((i) => toLin(Number.parseInt(hex.slice(i, i + 2), 16) / 255)) as Rgb;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToLin(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque `#RRGGBB` colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** OKLab from linear sRGB. */
export function oklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Linear sRGB from OKLab (not clamped). */
function oklabToLin(L: number, a: number, b: number): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH of `#RRGGBB`: lightness 0 to 1, chroma, hue in degrees 0 to 360. */
export function oklch(hex: string): { L: number; C: number; h: number } {
  const [L, a, b] = oklab(hexToLin(hex));
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C: Math.hypot(a, b), h: (h + 360) % 360 };
}

/** Smallest angle between two hues in degrees, 0 to 180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 100 x Euclidean OKLab distance, after the Machado simulation of `kind` when given. */
export function deltaE(hexA: string, hexB: string, kind?: CvdKind): number {
  const f = (hex: string): Rgb => {
    const lin = hexToLin(hex);
    if (kind === undefined) return oklab(lin);
    const M = MACHADO[kind];
    return oklab(
      M.map((row) =>
        clamp01((row[0] ?? 0) * lin[0] + (row[1] ?? 0) * lin[1] + (row[2] ?? 0) * lin[2]),
      ) as Rgb,
    );
  };
  const [a, b] = [f(hexA), f(hexB)];
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// ---------------------------------------------------------------------------------------------
// Parsing browser colour strings

function parseAlpha(token: string | undefined): number | null {
  if (token === undefined) return 1;
  const v = token.endsWith("%") ? Number.parseFloat(token) / 100 : Number.parseFloat(token);
  return Number.isFinite(v) ? clamp01(v) : null;
}

function channel255(token: string): number | null {
  const v = token.endsWith("%") ? (Number.parseFloat(token) / 100) * 255 : Number.parseFloat(token);
  return Number.isFinite(v) ? Math.max(0, Math.min(255, v)) : null;
}

function fromLinear(lin: Rgb, a: number): Rgba {
  return {
    r: clamp01(toGamma(clamp01(lin[0]))) * 255,
    g: clamp01(toGamma(clamp01(lin[1]))) * 255,
    b: clamp01(toGamma(clamp01(lin[2]))) * 255,
    a,
  };
}

/** Splits "a b c / d" and "a, b, c, d" into channel tokens and an optional alpha token. */
function splitArgs(inner: string): { channels: string[]; alpha: string | undefined } {
  const [main = "", slashAlpha] = inner.split("/").map((s) => s.trim());
  const parts = main.includes(",") ? main.split(",") : main.split(/\s+/);
  const tokens = parts.map((s) => s.trim()).filter((s) => s.length > 0);
  if (slashAlpha !== undefined) return { channels: tokens, alpha: slashAlpha };
  if (main.includes(",") && tokens.length === 4) {
    return { channels: tokens.slice(0, 3), alpha: tokens[3] };
  }
  return { channels: tokens, alpha: undefined };
}

/**
 * Parses `#rgb[a]`, `#rrggbb[aa]`, `rgb()` and `rgba()` (comma or space syntax), `color(srgb ...)`,
 * `oklab()` and `oklch()`. Returns null for anything else (named colours, `color-mix()` that was
 * not resolved by the browser, `transparent`).
 */
export function parseCssColor(value: string): Rgba | null {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(v);
  if (hex) {
    let h = hex[1] as string;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const fn = /^([a-z-]+)\(\s*([^)]*)\)$/i.exec(v);
  if (!fn) return null;
  const name = (fn[1] as string).toLowerCase();
  const { channels, alpha } = splitArgs(fn[2] as string);
  const a = parseAlpha(alpha);
  if (a === null) return null;
  if (name === "rgb" || name === "rgba") {
    if (channels.length !== 3) return null;
    const rgb = channels.map((c) => channel255(c));
    if (rgb.some((c) => c === null)) return null;
    return { r: rgb[0] as number, g: rgb[1] as number, b: rgb[2] as number, a };
  }
  if (name === "color") {
    const [space, ...rest] = channels;
    if (space !== "srgb" || rest.length !== 3) return null;
    const c = rest.map((t) =>
      t.endsWith("%") ? Number.parseFloat(t) / 100 : Number.parseFloat(t),
    );
    if (c.some((x) => !Number.isFinite(x))) return null;
    return {
      r: clamp01(c[0] as number) * 255,
      g: clamp01(c[1] as number) * 255,
      b: clamp01(c[2] as number) * 255,
      a,
    };
  }
  if (name === "oklab" || name === "oklch") {
    if (channels.length !== 3) return null;
    const [t0 = "", t1 = "", t2 = ""] = channels;
    const L = t0.endsWith("%") ? Number.parseFloat(t0) / 100 : Number.parseFloat(t0);
    const second = Number.parseFloat(t1);
    const third = Number.parseFloat(t2);
    if (![L, second, third].every(Number.isFinite)) return null;
    if (name === "oklab") return fromLinear(oklabToLin(L, second, third), a);
    const rad = (third * Math.PI) / 180;
    return fromLinear(oklabToLin(L, second * Math.cos(rad), second * Math.sin(rad)), a);
  }
  return null;
}

/** Alpha-composites `top` over `bottom` (both may carry alpha). */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
}

/** `#RRGGBB` of a parsed colour, ignoring alpha. */
export function toHex(c: Rgba): string {
  const h = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}
