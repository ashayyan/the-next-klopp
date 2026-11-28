// One view matrix for the SVG layers, the Canvas layer and the pointer inverse.
//
// The SVG user space is canonical metres. The run-off margin is a viewBox concern only, and the
// vertical orientation is a group transform inside a swapped viewBox, so data never changes with
// orientation (03-CONTEXT "Canonical coordinate system", 03-RESEARCH Pattern 4).

export type Orientation = "horizontal" | "vertical";

/** A 2x3 affine matrix in SVG order: [a, b, c, d, e, f] maps (x, y) to (a·x + c·y + e, b·x + d·y + f). */
export type Matrix = readonly [number, number, number, number, number, number];

export interface ViewInput {
  /** Field length in metres (along the touchline). */
  length: number;
  /** Field width in metres (along the goal line). */
  width: number;
  /** Run-off margin drawn around the field, in metres. */
  runoff: number;
  orientation: Orientation;
  /** Rendered width of the pitch container in CSS pixels. */
  cssWidth: number;
}

export interface View extends ViewInput {
  viewBox: string;
  vbWidth: number;
  vbHeight: number;
  cssHeight: number;
  /** CSS pixels per metre. */
  pxPerMetre: number;
  /** Transform for the canonical-root group; undefined in horizontal orientation. */
  groupTransform: string | undefined;
  /** Canonical metres to CSS pixels relative to the container top-left. */
  cssMatrix: Matrix;
}

export interface Pt {
  x: number;
  y: number;
}

export function makeView(input: ViewInput): View {
  const { length: L, width: W, runoff: r, orientation, cssWidth } = input;
  if (orientation === "vertical") {
    const vbWidth = W + 2 * r;
    const vbHeight = L + 2 * r;
    const s = cssWidth / vbWidth;
    return {
      ...input,
      viewBox: `${-r} ${-r} ${vbWidth} ${vbHeight}`,
      vbWidth,
      vbHeight,
      cssHeight: s * vbHeight,
      pxPerMetre: s,
      // Canonical (x, y) to view (y, L - x): canonical x runs bottom to top on screen.
      groupTransform: `matrix(0 -1 1 0 0 ${L})`,
      cssMatrix: [0, -s, s, 0, s * r, s * (L + r)],
    };
  }
  const vbWidth = L + 2 * r;
  const vbHeight = W + 2 * r;
  const s = cssWidth / vbWidth;
  return {
    ...input,
    viewBox: `${-r} ${-r} ${vbWidth} ${vbHeight}`,
    vbWidth,
    vbHeight,
    cssHeight: s * vbHeight,
    pxPerMetre: s,
    groupTransform: undefined,
    cssMatrix: [s, 0, 0, s, s * r, s * r],
  };
}

export function applyMatrix(m: Matrix, p: Pt): Pt {
  const [a, b, c, d, e, f] = m;
  return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
}

export function invertMatrix(m: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (det === 0) throw new Error("view matrix is not invertible");
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

/** Canonical metres to CSS pixels relative to the pitch container's top-left corner. */
export function canonicalToScreen(view: View, p: Pt): Pt {
  return applyMatrix(view.cssMatrix, p);
}

/** CSS pixels relative to the pitch container's top-left corner to canonical metres. */
export function screenToCanonical(view: View, cssX: number, cssY: number): Pt {
  return applyMatrix(invertMatrix(view.cssMatrix), { x: cssX, y: cssY });
}

/** The CSS matrix scaled to device pixels, ready for `ctx.setTransform(...canvasMatrix(view, dpr))`. */
export function canvasMatrix(view: View, dpr: number): Matrix {
  const [a, b, c, d, e, f] = view.cssMatrix;
  return [a * dpr, b * dpr, c * dpr, d * dpr, e * dpr, f * dpr];
}

/**
 * A size given in metres, clamped on screen to [minPx, maxPx], returned in metres.
 * Glyphs use it so a disc stays readable on a phone and does not bloat on a wide screen.
 */
export function sizeInMetres(minPx: number, metres: number, maxPx: number, pxPerMetre: number) {
  const px = Math.min(maxPx, Math.max(minPx, metres * pxPerMetre));
  return px / pxPerMetre;
}

/** Auto orientation: vertical when the stage column is narrower than 480 CSS pixels. */
export function autoOrientation(stageCssWidth: number): Orientation {
  return stageCssWidth < 480 ? "vertical" : "horizontal";
}
