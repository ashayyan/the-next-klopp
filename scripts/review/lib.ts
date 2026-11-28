// Pure review logic for `npm run review:screens` (QA-02): argument parsing, route slugging, the
// check registry, the evaluators that turn plain page data into pass or violation, the report
// shape (schemaVersion 1) and its Markdown rendering. No browser, no file system, no network, so
// Vitest covers all of it in CI. The browser module collects the data; thresholds live here.
// Erasable TypeScript only (run by `node` directly).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadTokens } from "../design/build-tokens.ts";
import { composite, contrast, parseCssColor, toHex } from "../design/lib/color.ts";
import { DIRECTION_DIR, SYSTEM_INPUT, type TokenDocument } from "../design/tokens.ts";
import { countWords } from "../lib/words.ts";

// One word counter for the review and the content validator (scripts/lib/words.ts).
export { countWords };

/** The review cannot run (no server, no browser, no taste skill): the CLI exits 2. */
export class ReviewUnavailableError extends Error {}

export type Theme = "light" | "dark";
export type Severity = "fail" | "warn";
export type CheckSource = "dom" | "static" | "taste";
export type Status = "pass" | "fail" | "warn" | "skipped";
export type Box = [number, number, number, number];

export const DEFAULT_WIDTHS = [375, 768, 1440] as const;
const HEIGHTS: Record<number, number> = { 375: 812, 768: 1024, 1440: 900 };
export const TAP_MIN_PX = 44;
export const TAP_GAP_PX = 8;
export const STEP_WORD_LIMIT = 60;
export const TEXT_RATIO = 4.5;
export const LARGE_TEXT_RATIO = 3;

export const heightFor = (width: number): number => HEIGHTS[width] ?? 900;

// ---------------------------------------------------------------- arguments and routes

export interface ReviewArgs {
  route: string;
  widths: number[];
  theme: Theme | "both";
  port: number | null;
  states: string[];
}

const UNKNOWN_OPTION = (flag: string) =>
  `Unknown option ${flag}. Use --widths, --theme, --port or --states.`;
export const ROUTE_ERROR =
  'Route must start with "/" and contain no "..", spaces, backslash or scheme.';

/** True when the route is a plain app path: leading slash, no traversal, whitespace, `\` or scheme. */
export function isSafeRoute(route: string): boolean {
  return (
    route.startsWith("/") &&
    !route.startsWith("//") &&
    !route.includes("..") &&
    !/\s/.test(route) &&
    !route.includes("\\") &&
    !route.includes("://")
  );
}

/** Folder name for a route: lower case, every run outside [a-z0-9] becomes one dash, trimmed. */
export function slugRoute(route: string): string | null {
  if (!isSafeRoute(route)) return null;
  const slug = route
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "root" : slug;
}

/**
 * Git Bash on Windows rewrites an argument that starts with "/" into a path under the Git install
 * ("/dev/pitch" becomes "C:/Program Files/Git/dev/pitch"). When the argument begins with that
 * install folder (EXEPATH, set by Git for Windows), the prefix is removed again.
 */
export function undoMsysPathConversion(arg: string, exepath: string | undefined): string {
  if (!exepath) return arg;
  const slashes = (s: string) => s.replaceAll("\\", "/").replace(/\/+$/, "");
  const value = arg.replaceAll("\\", "/");
  // EXEPATH is the Git folder or its bin folder; the rewrite uses the Git root.
  const exe = slashes(exepath);
  const roots = [exe, exe.replace(/\/(?:usr\/)?(?:bin|cmd)$/i, "")];
  for (const root of roots)
    if (value.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return value.slice(root.length);
  return arg;
}

export function parseArgs(argv: readonly string[]): ReviewArgs | { error: string } {
  const out: ReviewArgs = {
    route: "",
    widths: [...DEFAULT_WIDTHS],
    theme: "both",
    port: null,
    states: [],
  };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string;
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const [flag, inline] = a.includes("=")
      ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)]
      : [a, undefined];
    if (flag !== "--widths" && flag !== "--theme" && flag !== "--port" && flag !== "--states") {
      return { error: UNKNOWN_OPTION(flag as string) };
    }
    const value = inline ?? argv[i + 1];
    if (inline === undefined) i += 1;
    if (value === undefined || value === "") return { error: `${flag} needs a value.` };
    if (flag === "--widths") {
      const widths = value.split(",").map((w) => Number(w));
      if (widths.some((w) => !Number.isInteger(w) || w < 280 || w > 3840)) {
        return { error: "--widths needs whole numbers from 280 to 3840, comma separated." };
      }
      out.widths = [...new Set(widths)];
    } else if (flag === "--theme") {
      if (value !== "light" && value !== "dark" && value !== "both") {
        return { error: "--theme must be light, dark or both." };
      }
      out.theme = value;
    } else if (flag === "--port") {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1024 || port > 65535) {
        return { error: "--port must be a whole number from 1024 to 65535." };
      }
      out.port = port;
    } else {
      out.states = value.split(",").filter((s) => s !== "");
    }
  }
  if (positional.length !== 1) return { error: "Give exactly one route, for example /dev/pitch." };
  const route = undoMsysPathConversion(positional[0] as string, process.env.EXEPATH);
  if (!isSafeRoute(route)) return { error: ROUTE_ERROR };
  out.route = route;
  return out;
}

// ---------------------------------------------------------------- active token set

const DIRECTION_ROUTE = /^\/dev\/directions\/([a-z0-9-]+)(?:[/?#]|$)/;

/**
 * The token file a route is reviewed against: a direction's own file for /dev/directions/<id>/...
 * while that file exists, else the system input. Repo-relative path.
 */
export function activeTokenInput(route: string, root: string): string {
  const id = DIRECTION_ROUTE.exec(route)?.[1];
  if (id) {
    const own = `${DIRECTION_DIR}/${id}.tokens.json`;
    if (existsSync(join(root, own))) return own;
  }
  return SYSTEM_INPUT;
}

export function loadActiveTokens(route: string, root: string): TokenDocument {
  return loadTokens(root, activeTokenInput(route, root));
}

// ---------------------------------------------------------------- check registry

export interface CheckDef {
  id: string;
  severity: Severity;
  source: CheckSource;
}

/** The 22 checks of the 04-UI-SPEC table. Ids without a result in a run report `skipped`. */
export const CHECKS: readonly CheckDef[] = [
  { id: "no-overflow", severity: "fail", source: "dom" },
  { id: "tap-size", severity: "fail", source: "dom" },
  { id: "focus-visible", severity: "fail", source: "dom" },
  { id: "text-contrast", severity: "fail", source: "dom" },
  { id: "token-colours", severity: "fail", source: "dom" },
  { id: "no-hex-in-source", severity: "fail", source: "static" },
  { id: "banned-gradient", severity: "fail", source: "dom" },
  { id: "banned-glass", severity: "fail", source: "dom" },
  { id: "banned-emoji", severity: "fail", source: "dom" },
  { id: "banned-stripes", severity: "fail", source: "dom" },
  { id: "banned-transition-all", severity: "fail", source: "dom" },
  { id: "banned-eyebrow", severity: "warn", source: "dom" },
  { id: "card-grid", severity: "warn", source: "dom" },
  { id: "arrow-suffix", severity: "warn", source: "dom" },
  { id: "legend-present", severity: "fail", source: "dom" },
  { id: "step-words", severity: "fail", source: "dom" },
  { id: "reduced-motion", severity: "fail", source: "dom" },
  { id: "font-local", severity: "fail", source: "dom" },
  { id: "heading-order", severity: "fail", source: "dom" },
  { id: "control-names", severity: "fail", source: "dom" },
  { id: "taste-layout", severity: "fail", source: "taste" },
  { id: "taste-copy", severity: "warn", source: "taste" },
];

export function checkDef(id: string): CheckDef {
  const def = CHECKS.find((c) => c.id === id);
  if (!def) throw new Error(`unknown check id ${id}`);
  return def;
}

// ---------------------------------------------------------------- evaluators (plain data in)

export interface Offender {
  selector: string;
  text: string;
  box: Box;
  value: string;
}

export interface Outcome {
  violated: boolean;
  detail: string;
  offenders: Offender[];
}

const ZERO_BOX: Box = [0, 0, 0, 0];
const round1 = (n: number) => Math.round(n * 10) / 10;
const clip = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function evalNoOverflow(input: { scrollWidth: number; innerWidth: number }): Outcome {
  const { scrollWidth, innerWidth } = input;
  const violated = scrollWidth > innerWidth;
  return {
    violated,
    detail: `scrollWidth ${scrollWidth} ${violated ? ">" : "≤"} ${innerWidth}`,
    offenders: violated
      ? [
          {
            selector: "html",
            text: "",
            box: ZERO_BOX,
            value: `scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`,
          },
        ]
      : [],
  };
}

export interface GradientProbe {
  selector: string;
  text: string;
  box: Box;
  backgroundImage: string;
}

const GRADIENT_RE = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/i;

export function evalBannedGradient(elements: readonly GradientProbe[]): Outcome {
  const offenders = elements
    .filter((e) => GRADIENT_RE.test(e.backgroundImage))
    .map((e) => ({
      selector: e.selector,
      text: clip(e.text),
      box: e.box,
      value: clip(e.backgroundImage, 100),
    }));
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? "no gradient in any computed background-image"
        : `${offenders.length} element(s) with a gradient background`,
    offenders,
  };
}

export interface TapTarget {
  selector: string;
  text: string;
  box: Box;
  /**
   * True for an inline link (or inline button) inside a sentence: its `p` or `li` also holds words
   * outside any link or button (WCAG 2.5.8 inline exception). Exempt from size and spacing.
   */
  runningText: boolean;
  /**
   * The unrounded box (`getBoundingClientRect()` plus scroll). Sizes and gaps are judged on it;
   * `box` is the 0.1 px display copy. Falls back to `box` when absent.
   */
  exact?: Box;
}

/**
 * Chrome lays out in 1/64 px units, so two edges that are truly 8 px apart can differ from 8 by
 * no more than that. Anything larger is a real layout gap, not a measuring artefact.
 */
export const TAP_EPSILON_PX = 1 / 64;

function gapBetween(a: Box, b: Box): number {
  const dx = Math.max(a[0] - (b[0] + b[2]), b[0] - (a[0] + a[2]), 0);
  const dy = Math.max(a[1] - (b[1] + b[3]), b[1] - (a[1] + a[3]), 0);
  return Math.hypot(dx, dy);
}

function contains(outer: Box, inner: Box): boolean {
  return (
    inner[0] >= outer[0] - 0.5 &&
    inner[1] >= outer[1] - 0.5 &&
    inner[0] + inner[2] <= outer[0] + outer[2] + 0.5 &&
    inner[1] + inner[3] <= outer[1] + outer[3] + 0.5
  );
}

export function evalTapSize(targets: readonly TapTarget[]): Outcome {
  const live = targets.filter((t) => t.box[2] > 0 && t.box[3] > 0 && !t.runningText);
  const found = new Map<string, Offender>();
  const add = (t: TapTarget, value: string) => {
    const key = `${t.selector}@${t.box.join(",")}`;
    const prior = found.get(key);
    if (prior) prior.value = `${prior.value}; ${value}`;
    else found.set(key, { selector: t.selector, text: clip(t.text), box: t.box, value });
  };
  const exact = (t: TapTarget): Box => t.exact ?? t.box;
  for (const t of live) {
    const [, , w, h] = exact(t);
    if (w + TAP_EPSILON_PX < TAP_MIN_PX || h + TAP_EPSILON_PX < TAP_MIN_PX)
      add(t, `${round1(w)} x ${round1(h)} px, needs ${TAP_MIN_PX} x ${TAP_MIN_PX}`);
  }
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i] as TapTarget;
      const b = live[j] as TapTarget;
      const ea = exact(a);
      const eb = exact(b);
      if (contains(ea, eb) || contains(eb, ea)) continue;
      // Judged on the unrounded boxes: only a sub-layout-unit difference is forgiven.
      const gap = gapBetween(ea, eb);
      if (gap + TAP_EPSILON_PX < TAP_GAP_PX) {
        add(a, `${round1(gap)} px from ${b.selector}, needs ${TAP_GAP_PX}`);
        add(b, `${round1(gap)} px from ${a.selector}, needs ${TAP_GAP_PX}`);
      }
    }
  }
  const offenders = [...found.values()];
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? `${live.length} target(s) at least ${TAP_MIN_PX} x ${TAP_MIN_PX} px and ${TAP_GAP_PX} px apart`
        : `${offenders.length} of ${live.length} target(s) too small or too close`,
    offenders,
  };
}

export interface TextProbe {
  selector: string;
  text: string;
  box: Box;
  /** Computed text colour (`color`, or `fill` for SVG text). */
  color: string;
  /** Computed background colours from the element outward, up to the root. */
  bgChain: string[];
  fontSize: number;
  fontWeight: number;
  /** True for SVG text inside the pitch and for disabled controls. */
  exempt: boolean;
}

/** WCAG large text: 24 px, or 18.66 px at weight 600 or more. */
export function isLargeText(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 600);
}

/** Resolved opaque background: alpha layers composited from the nearest opaque ancestor out. */
export function resolveBackground(chain: readonly string[]): string {
  let layer: ReturnType<typeof composite> | null = null;
  for (const css of chain) {
    const c = parseCssColor(css);
    if (!c || c.a === 0) continue;
    layer = layer === null ? c : composite(layer, c);
    if (layer.a >= 0.999) break;
  }
  const base = { r: 255, g: 255, b: 255, a: 1 };
  return toHex(layer === null ? base : composite(layer, base));
}

export function evalTextContrast(items: readonly TextProbe[]): Outcome {
  const offenders: Offender[] = [];
  let checked = 0;
  for (const it of items) {
    if (it.exempt || it.text.trim() === "") continue;
    const fg = parseCssColor(it.color);
    if (!fg) continue;
    const bg = resolveBackground(it.bgChain);
    const bgRgba = parseCssColor(bg);
    if (!bgRgba) continue;
    checked += 1;
    const ink = toHex(fg.a >= 0.999 ? fg : composite(fg, bgRgba));
    const ratio = contrast(ink, bg);
    const needed = isLargeText(it.fontSize, it.fontWeight) ? LARGE_TEXT_RATIO : TEXT_RATIO;
    if (ratio + 1e-9 < needed) {
      offenders.push({
        selector: it.selector,
        text: clip(it.text),
        box: it.box,
        value: `${ratio.toFixed(2)}:1 (${ink} on ${bg}), needs ${needed}:1`,
      });
    }
  }
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? `${checked} text element(s) meet 4.5:1 (3:1 for large text)`
        : `${offenders.length} of ${checked} text element(s) below the ratio`,
    offenders,
  };
}

export interface HeadingProbe {
  level: number;
  text: string;
  selector: string;
}

export function evalHeadingOrder(headings: readonly HeadingProbe[]): Outcome {
  const offenders: Offender[] = [];
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length !== 1) {
    offenders.push({
      selector: "h1",
      text: "",
      box: ZERO_BOX,
      value: `${h1s.length} h1 element(s), needs exactly 1`,
    });
  }
  let prev = 0;
  for (const h of headings) {
    if (prev > 0 && h.level > prev + 1) {
      offenders.push({
        selector: h.selector,
        text: clip(h.text),
        box: ZERO_BOX,
        value: `h${h.level} follows h${prev}`,
      });
    }
    prev = h.level;
  }
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? `${headings.length} heading(s), one h1, no skipped level`
        : `${offenders.length} heading problem(s)`,
    offenders,
  };
}

export interface ControlProbe {
  selector: string;
  /** Visible text content of the control. */
  text: string;
  box: Box;
  ariaLabel: string;
  /** Text of the elements named by aria-labelledby. */
  labelledByText: string;
  /** Text of the associated label elements. */
  labelText: string;
  title: string;
  /** Alt text of a child image or the control's own alt (image buttons). */
  alt: string;
}

export function evalControlNames(controls: readonly ControlProbe[]): Outcome {
  const offenders = controls
    .filter(
      (c) =>
        ![c.ariaLabel, c.labelledByText, c.labelText, c.text, c.title, c.alt].some(
          (s) => s.trim() !== "",
        ),
    )
    .map((c) => ({
      selector: c.selector,
      text: "",
      box: c.box,
      value: "no accessible name",
    }));
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? `${controls.length} control(s) have an accessible name`
        : `${offenders.length} of ${controls.length} control(s) without a name`,
    offenders,
  };
}

export function evalLegendPresent(input: { glyphCount: number; legendVisible: boolean }): Outcome {
  const violated = input.glyphCount > 0 && !input.legendVisible;
  return {
    violated,
    detail:
      input.glyphCount === 0
        ? "no glyph on the page"
        : violated
          ? `${input.glyphCount} glyph(s) and no visible legend`
          : `${input.glyphCount} glyph(s) with a visible legend`,
    offenders: violated
      ? [
          {
            selector: "[data-glyph]",
            text: "",
            box: ZERO_BOX,
            value: "no visible [data-legend] on the page",
          },
        ]
      : [],
  };
}

export interface StepProbe {
  selector: string;
  text: string;
  box: Box;
}

export function evalStepWords(steps: readonly StepProbe[]): Outcome {
  const offenders = steps
    .map((s) => ({ s, words: countWords(s.text) }))
    .filter((x) => x.words > STEP_WORD_LIMIT)
    .map((x) => ({
      selector: x.s.selector,
      text: clip(x.s.text),
      box: x.s.box,
      value: `${x.words} words, limit ${STEP_WORD_LIMIT}`,
    }));
  return {
    violated: offenders.length > 0,
    detail:
      steps.length === 0
        ? "no [data-lesson-step] on the page"
        : offenders.length === 0
          ? `${steps.length} step(s) within ${STEP_WORD_LIMIT} words`
          : `${offenders.length} of ${steps.length} step(s) over ${STEP_WORD_LIMIT} words`,
    offenders,
  };
}

// ---------------------------------------------------------------- style and token evaluators

export interface ColourGroup {
  /** CSS property the value came from: color, background-color, border-color, fill or stroke. */
  property: string;
  /** Computed value as the browser prints it. */
  value: string;
  /** Number of elements using this property and value. */
  count: number;
  examples: { selector: string; text: string; box: Box }[];
}

/** Every colour the active theme defines, as sRGB triples (color, pitch and data groups). */
export function allowedColours(
  resolved: Record<string, Record<string, string>>,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const group of ["color", "pitch", "data"]) {
    for (const value of Object.values(resolved[group] ?? {})) {
      const c = parseCssColor(value);
      if (c) out.push([Math.round(c.r), Math.round(c.g), Math.round(c.b)]);
    }
  }
  return out;
}

/** Computed colour values must be a token colour of the active theme; alpha is ignored. */
export function evalTokenColours(
  groups: readonly ColourGroup[],
  allowed: readonly [number, number, number][],
): Outcome {
  const offenders: Offender[] = [];
  let checked = 0;
  for (const g of groups) {
    const c = parseCssColor(g.value);
    if (!c || c.a === 0) continue;
    checked += g.count;
    const ok = allowed.some(
      ([r, gr, b]) => Math.abs(c.r - r) <= 1 && Math.abs(c.g - gr) <= 1 && Math.abs(c.b - b) <= 1,
    );
    if (ok) continue;
    for (const e of g.examples) {
      offenders.push({
        selector: e.selector,
        text: clip(e.text),
        box: e.box,
        value: `${g.property} ${g.value} is not a token colour (${g.count} element(s))`,
      });
    }
  }
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? `${checked} colour use(s) are token colours`
        : `${offenders.length} colour use(s) outside the token set`,
    offenders,
  };
}

// 3, 4, 6 or 8 hex digits after '#', ending at a word boundary (same rule as pitch.test.tsx).
const HEX_LITERAL = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;
const RGB_LITERAL = /\brgba?\(/;

export interface SourceFile {
  path: string;
  text: string;
}

/** Every .ts and .tsx file under src/, with a repo-relative forward-slash path. */
export function listSourceFiles(root: string): SourceFile[] {
  const out: SourceFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(join(root, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(join(root, rel)).isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(name))
        out.push({ path: rel, text: readFileSync(join(root, rel), "utf8") });
    }
  };
  if (existsSync(join(root, "src"))) walk("src");
  return out;
}

/** No hex or rgb( literal in a source file; test files are skipped, comments still count. */
export function evalHexInSource(files: readonly SourceFile[]): Outcome {
  const offenders: Offender[] = [];
  let scanned = 0;
  for (const f of files) {
    if (/\.test\.(ts|tsx)$/.test(f.path)) continue;
    scanned += 1;
    const lines = f.text.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] as string;
      const hit = HEX_LITERAL.exec(line) ?? RGB_LITERAL.exec(line);
      if (hit) {
        offenders.push({
          selector: `${f.path}:${i + 1}`,
          text: "",
          box: ZERO_BOX,
          value: `literal ${hit[0]}`,
        });
      }
    }
  }
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? `${scanned} source file(s) hold no colour literal`
        : `${offenders.length} colour literal(s) in source`,
    offenders,
  };
}

export interface PropertyProbe {
  selector: string;
  text: string;
  box: Box;
  /** The computed value being judged (transition-property, backdrop-filter, ...). */
  value: string;
}

/** `transition: all` animates properties nobody chose; a list that names `all` fails. */
export function evalTransitionAll(elements: readonly PropertyProbe[]): Outcome {
  const offenders = elements
    .filter((e) => e.value.split(",").some((p) => p.trim() === "all"))
    .map((e) => ({
      selector: e.selector,
      text: clip(e.text),
      box: e.box,
      value: `transition-property: ${e.value}`,
    }));
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? "no transition-property: all"
        : `${offenders.length} element(s) transition all properties`,
    offenders,
  };
}

/** Any backdrop-filter other than none is glass. */
export function evalBannedGlass(elements: readonly PropertyProbe[]): Outcome {
  const offenders = elements
    .filter((e) => e.value.trim() !== "" && e.value.trim() !== "none")
    .map((e) => ({
      selector: e.selector,
      text: clip(e.text),
      box: e.box,
      value: `backdrop-filter: ${e.value}`,
    }));
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? "no backdrop-filter"
        : `${offenders.length} element(s) use backdrop-filter`,
    offenders,
  };
}

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

/** No pictographic character in visible text or in an aria-label. */
export function evalBannedEmoji(
  items: readonly { selector: string; text: string; box: Box; where: "text" | "aria-label" }[],
): Outcome {
  const offenders = items
    .filter((i) => PICTOGRAPHIC.test(i.text))
    .map((i) => ({
      selector: i.selector,
      text: clip(i.text),
      box: i.box,
      value: `pictographic character in ${i.where}`,
    }));
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? "no emoji in text or aria-label"
        : `${offenders.length} emoji use(s)`,
    offenders,
  };
}

export interface StripeProbe {
  /** Pattern and gradient elements inside the pitch SVG. */
  paintServers: number;
  /** Computed fill of each `[data-layer="field"]`. */
  fieldFills: string[];
  /** Computed background-image of the pitch stage and its parent when not none. */
  stageImages: string[];
}

/** The pitch field is one flat fill: no pattern, gradient or image behind it. */
export function evalBannedStripes(pitches: readonly StripeProbe[]): Outcome {
  const offenders: Offender[] = [];
  for (const p of pitches) {
    if (p.paintServers > 0) {
      offenders.push({
        selector: "[data-pitch] svg",
        text: "",
        box: ZERO_BOX,
        value: `${p.paintServers} pattern or gradient element(s) in the pitch SVG`,
      });
    }
    for (const fill of p.fieldFills) {
      if (/^url\(/i.test(fill)) {
        offenders.push({
          selector: '[data-layer="field"]',
          text: "",
          box: ZERO_BOX,
          value: `field fill is a paint server: ${fill}`,
        });
      }
    }
    for (const img of p.stageImages) {
      offenders.push({
        selector: "[data-pitch]",
        text: "",
        box: ZERO_BOX,
        value: `stage background-image: ${clip(img, 80)}`,
      });
    }
  }
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? pitches.length === 0
          ? "no pitch on the page"
          : `${pitches.length} pitch(es) with one flat field fill`
        : `${offenders.length} stripe or pattern problem(s)`,
    offenders,
  };
}

export interface FocusStop {
  selector: string;
  text: string;
  box: Box;
  outlineWidth: number;
  outlineStyle: string;
  outlineColor: string;
  boxShadow: string;
  /** Visible [data-focus-ring] strokes inside the focused element (SVG players). */
  ringStrokes: { color: string; width: number }[];
  /** Background colours of the focused element's parents, nearest first. */
  surfaceChain: string[];
}

export const FOCUS_RING_MIN_PX = 2;
export const FOCUS_RING_RATIO = 3;

interface Ring {
  width: number;
  color: string;
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
}

/** Solid, unblurred, non-inset shadows with no offset are rings; width is the spread. */
export function shadowRings(boxShadow: string): Ring[] {
  if (boxShadow.trim() === "" || boxShadow.trim() === "none") return [];
  const rings: Ring[] = [];
  for (const part of splitTopLevel(boxShadow)) {
    if (/\binset\b/.test(part)) continue;
    const colour =
      /(rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|#[0-9a-fA-F]+)/.exec(part)?.[0];
    if (!colour) continue;
    const nums = part
      .replace(colour, " ")
      .split(/\s+/)
      .filter((s) => s !== "")
      .map((s) => Number.parseFloat(s));
    const [x = 0, y = 0, blur = 0, spread = 0] = nums;
    if (x === 0 && y === 0 && blur === 0 && spread > 0)
      rings.push({ width: spread, color: colour });
  }
  return rings;
}

export function evalFocusVisible(stops: readonly FocusStop[]): Outcome {
  const offenders: Offender[] = [];
  for (const s of stops) {
    const surface = resolveBackground(s.surfaceChain);
    const surfaceRgba = parseCssColor(surface);
    const rings: Ring[] = [];
    if (s.outlineStyle !== "none" && s.outlineStyle !== "hidden" && s.outlineWidth > 0) {
      rings.push({ width: s.outlineWidth, color: s.outlineColor });
    }
    rings.push(...shadowRings(s.boxShadow));
    for (const r of s.ringStrokes) rings.push({ width: r.width, color: r.color });
    let best = 0;
    let bestWidth = 0;
    for (const ring of rings) {
      const c = parseCssColor(ring.color);
      if (!c || c.a === 0 || !surfaceRgba) continue;
      const ink = toHex(c.a >= 0.999 ? c : composite(c, surfaceRgba));
      const ratio = contrast(ink, surface);
      if (ring.width >= FOCUS_RING_MIN_PX && ratio > best) {
        best = ratio;
        bestWidth = ring.width;
      }
    }
    if (best + 1e-9 < FOCUS_RING_RATIO) {
      const widest = Math.max(0, ...rings.map((r) => r.width));
      offenders.push({
        selector: s.selector,
        text: clip(s.text),
        box: s.box,
        value:
          bestWidth === 0
            ? `no ring of ${FOCUS_RING_MIN_PX} px or more (widest ${round1(widest)} px)`
            : `ring contrast ${best.toFixed(2)}:1, needs ${FOCUS_RING_RATIO}:1`,
      });
    }
  }
  return {
    violated: offenders.length > 0,
    detail:
      stops.length === 0
        ? "no focusable element on the page"
        : offenders.length === 0
          ? `${stops.length} focus stop(s) show a ring of ${FOCUS_RING_MIN_PX} px or more at ${FOCUS_RING_RATIO}:1`
          : `${offenders.length} of ${stops.length} focus stop(s) without a visible ring`,
    offenders,
  };
}

export interface EyebrowProbe {
  selector: string;
  text: string;
  box: Box;
  textTransform: string;
  /** letter-spacing in em. */
  letterSpacingEm: number;
}

/** Uppercase with tracking above 0.05em is the eyebrow pattern. Warn only. */
export function evalBannedEyebrow(elements: readonly EyebrowProbe[]): Outcome {
  const offenders = elements
    .filter((e) => e.textTransform === "uppercase" && e.letterSpacingEm > 0.05)
    .map((e) => ({
      selector: e.selector,
      text: clip(e.text),
      box: e.box,
      value: `uppercase with letter-spacing ${round1(e.letterSpacingEm * 100) / 100}em`,
    }));
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? "no uppercase tracked eyebrow"
        : `${offenders.length} uppercase tracked label(s)`,
    offenders,
  };
}

export interface CardChild {
  radius: string;
  shadow: string;
  background: string;
  width: number;
  height: number;
}

export interface CardContainer {
  selector: string;
  box: Box;
  children: CardChild[];
}

const isBoxy = (c: CardChild): boolean => {
  const bg = parseCssColor(c.background);
  return (
    (c.radius !== "" && c.radius !== "0px") ||
    (c.shadow !== "" && c.shadow !== "none") ||
    (bg !== null && bg.a > 0)
  );
};

/** Three or more equal boxes (radius, shadow, background, size within 2 px) in one row or grid. */
export function evalCardGrid(containers: readonly CardContainer[]): Outcome {
  const offenders: Offender[] = [];
  for (const c of containers) {
    const boxes = c.children.filter(isBoxy);
    for (const first of boxes) {
      const same = boxes.filter(
        (o) =>
          o.radius === first.radius &&
          o.shadow === first.shadow &&
          o.background === first.background &&
          Math.abs(o.width - first.width) <= 2 &&
          Math.abs(o.height - first.height) <= 2,
      );
      if (same.length >= 3) {
        offenders.push({
          selector: c.selector,
          text: "",
          box: c.box,
          value: `${same.length} identical boxes (${round1(first.width)} x ${round1(first.height)} px)`,
        });
        break;
      }
    }
  }
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? "no run of three identical boxes"
        : `${offenders.length} card grid(s)`,
    offenders,
  };
}

/** Button or link text that ends in a right arrow. Warn only. */
export function evalArrowSuffix(
  controls: readonly { selector: string; text: string; box: Box }[],
): Outcome {
  const offenders = controls
    .filter((c) => /[→⟶➜➔➡]\s*$/.test(c.text))
    .map((c) => ({
      selector: c.selector,
      text: clip(c.text),
      box: c.box,
      value: "ends in an arrow",
    }));
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? "no control text ends in an arrow"
        : `${offenders.length} control(s) end in an arrow`,
    offenders,
  };
}

// ---------------------------------------------------------------- motion, fonts and capture names

export interface MotionProbe {
  /** Running or pending animations: `document.getAnimations()`. */
  animations: { selector: string; name: string; durationMs: number }[];
  /** Elements whose computed transition-duration is above zero. */
  transitions: { selector: string; property: string; durationMs: number }[];
  /** `[data-glyph]` boxes read twice, 500 ms apart, with no input between. */
  glyphsBefore: Box[];
  glyphsAfter: Box[];
}

export const GLYPH_MOVE_TOLERANCE_PX = 0.5;

/** With reduce emulated: nothing animates, nothing transitions, nothing moves before input. */
export function evalReducedMotion(input: MotionProbe): Outcome {
  const offenders: Offender[] = [];
  for (const a of input.animations) {
    if (a.durationMs > 0) {
      offenders.push({
        selector: a.selector,
        text: "",
        box: ZERO_BOX,
        value: `animation ${a.name || "(unnamed)"} runs ${a.durationMs} ms`,
      });
    }
  }
  for (const t of input.transitions) {
    if (t.durationMs > 0) {
      offenders.push({
        selector: t.selector,
        text: "",
        box: ZERO_BOX,
        value: `transition of ${t.property} takes ${t.durationMs} ms`,
      });
    }
  }
  const count = Math.min(input.glyphsBefore.length, input.glyphsAfter.length);
  for (let i = 0; i < count; i += 1) {
    const a = input.glyphsBefore[i] as Box;
    const b = input.glyphsAfter[i] as Box;
    const moved = Math.max(...a.map((v, k) => Math.abs(v - (b[k] as number))));
    if (moved > GLYPH_MOVE_TOLERANCE_PX) {
      offenders.push({
        selector: `[data-glyph] #${i + 1}`,
        text: "",
        box: b,
        value: `moved ${round1(moved)} px within 500 ms without input`,
      });
    }
  }
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? "no animation, transition or glyph movement under reduced motion"
        : `${offenders.length} motion problem(s) under reduced motion`,
    offenders,
  };
}

const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export interface FontLocalProbe {
  /** Every request URL the page made. */
  requests: string[];
  /** Each family of the active token set and whether its faces finished loading. */
  families: { family: string; loaded: boolean }[];
}

/** No request leaves localhost, and every family of the active token set is loaded. */
export function evalFontLocal(input: FontLocalProbe): Outcome {
  const offenders: Offender[] = [];
  for (const url of input.requests) {
    let host = "";
    try {
      const u = new URL(url);
      if (u.protocol === "data:" || u.protocol === "blob:" || u.protocol === "about:") continue;
      host = u.hostname;
    } catch {
      host = url;
    }
    if (!LOCAL_HOSTS.has(host)) {
      offenders.push({
        selector: "network",
        text: "",
        box: ZERO_BOX,
        value: `request to ${clip(url, 100)}`,
      });
    }
  }
  for (const f of input.families) {
    if (!f.loaded) {
      offenders.push({
        selector: "document.fonts",
        text: f.family,
        box: ZERO_BOX,
        value: `font family "${f.family}" is not loaded`,
      });
    }
  }
  return {
    violated: offenders.length > 0,
    detail:
      offenders.length === 0
        ? `${input.requests.length} request(s) all local; ${input.families.length} font family(ies) loaded`
        : `${offenders.length} remote request(s) or unloaded font(s)`,
    offenders,
  };
}

export type Vision = "normal" | "deuteranopia" | "achromatopsia";

/** `<width>-<theme>[-<state>][-<vision>].png`, the file a capture is saved under. */
export function screenshotName(
  width: number,
  theme: Theme,
  state: string | null,
  vision: Vision = "normal",
): string {
  const slug = state
    ? state
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";
  return `${width}-${theme}${slug ? `-${slug}` : ""}${vision === "normal" ? "" : `-${vision}`}.png`;
}

// ---------------------------------------------------------------- results and report

export interface CheckResult {
  id: string;
  source: CheckSource;
  severity: Severity;
  width: number | null;
  theme: Theme | null;
  state: string | null;
  status: Status;
  detail: string;
  offenders: Offender[];
}

/** Turns an evaluator outcome into a result row; a violation is `fail` or `warn` by the registry. */
export function toResult(
  id: string,
  context: { width: number | null; theme: Theme | null; state: string | null },
  outcome: Outcome,
): CheckResult {
  const def = checkDef(id);
  return {
    id,
    source: def.source,
    severity: def.severity,
    ...context,
    status: outcome.violated ? def.severity : "pass",
    detail: outcome.detail,
    offenders: outcome.offenders,
  };
}

export interface ScreenshotRecord {
  width: number;
  theme: Theme;
  state: string | null;
  vision: Vision;
  path: string;
  sha256: string;
}

export interface TasteLayoutFinding {
  rule: string;
  where: string;
  detail: string;
  size: string;
}

export interface TasteSkillBlock {
  layout: {
    command: string;
    exitCode: number;
    findings: TasteLayoutFinding[];
    ignored: { id: string; reason: string }[];
  };
  copy: {
    command: string;
    exitCode: number;
    fails: { id: string; count: number; msg: string }[];
    warns: { id: string; count: number; msg: string }[];
  };
}

const NO_BOX: Box = [0, 0, 0, 0];

/** `taste-layout`: fail only for overflow-x and spill, warn for the other app-relevant ids. */
export function tasteLayoutResult(block: TasteSkillBlock["layout"], theme: Theme): CheckResult {
  const fails = block.findings.filter((f) => f.rule === "overflow-x" || f.rule === "spill");
  const warns = block.findings.filter((f) => !fails.includes(f));
  const offender = (f: TasteLayoutFinding): Offender => ({
    selector: f.where,
    text: "",
    box: NO_BOX,
    value: `${f.rule} at ${f.size}${f.detail ? `: ${f.detail}` : ""}`,
  });
  const def = checkDef("taste-layout");
  return {
    id: def.id,
    source: def.source,
    severity: def.severity,
    width: null,
    theme,
    state: null,
    status: fails.length > 0 ? "fail" : warns.length > 0 ? "warn" : "pass",
    detail: `check.mjs: ${fails.length} fail, ${warns.length} warn, ${block.ignored.length} ignored id(s)`,
    offenders: [...fails, ...warns].map(offender),
  };
}

/** `taste-copy`: copy-lint FAIL ids fail, WARN ids warn. */
export function tasteCopyResult(block: TasteSkillBlock["copy"], theme: Theme): CheckResult {
  const def = checkDef("taste-copy");
  const offender = (f: { id: string; count: number; msg: string }): Offender => ({
    selector: f.id,
    text: "",
    box: NO_BOX,
    value: `${f.count} x ${f.msg}`,
  });
  return {
    id: def.id,
    source: def.source,
    severity: def.severity,
    width: null,
    theme,
    state: null,
    status: block.fails.length > 0 ? "fail" : block.warns.length > 0 ? "warn" : "pass",
    detail: `copy-lint: ${block.fails.length} fail, ${block.warns.length} warn`,
    offenders: [...block.fails, ...block.warns].map(offender),
  };
}

export interface ReportInput {
  route: string;
  server: "dev" | "preview";
  url: string;
  generatedAt: string;
  tokensSha256: string;
  /** What was reviewed: HEAD (with "-dirty") and whether the server showed the source on disk. */
  source?: ReviewSource;
  widths: number[];
  themes: Theme[];
  checks: CheckResult[];
  screenshots: ScreenshotRecord[];
  tasteSkill?: TasteSkillBlock | null;
}

export interface ReviewSource {
  commit: string | null;
  /** False when a reused preview server served a dist/ this run did not build. */
  fresh: boolean;
}

export interface ReviewReport {
  schemaVersion: 1;
  route: string;
  server: "dev" | "preview";
  url: string;
  generatedAt: string;
  designRef: { file: string; tokensSha256: string };
  source: ReviewSource | null;
  widths: number[];
  themes: Theme[];
  verdict: "pass" | "fail";
  counts: Record<Status, number>;
  checks: CheckResult[];
  screenshots: ScreenshotRecord[];
  tasteSkill: TasteSkillBlock | null;
  reviewer: { status: "pending"; by: null; notes: null };
}

export const SKIPPED_DETAIL = "check did not run in this review";

export function buildReport(input: ReportInput): ReviewReport {
  const seen = new Set(input.checks.map((c) => c.id));
  const skipped: CheckResult[] = CHECKS.filter((c) => !seen.has(c.id)).map((c) => ({
    id: c.id,
    source: c.source,
    severity: c.severity,
    width: null,
    theme: null,
    state: null,
    status: "skipped",
    detail: SKIPPED_DETAIL,
    offenders: [],
  }));
  const checks = [...input.checks, ...skipped];
  const counts: Record<Status, number> = { pass: 0, fail: 0, warn: 0, skipped: 0 };
  for (const c of checks) counts[c.status] += 1;
  return {
    schemaVersion: 1,
    route: input.route,
    server: input.server,
    url: input.url,
    generatedAt: input.generatedAt,
    designRef: { file: "docs/DESIGN.md", tokensSha256: input.tokensSha256 },
    source: input.source ?? null,
    widths: input.widths,
    themes: input.themes,
    verdict: counts.fail > 0 ? "fail" : "pass",
    counts,
    checks,
    screenshots: input.screenshots,
    tasteSkill: input.tasteSkill ?? null,
    reviewer: { status: "pending", by: null, notes: null },
  };
}

export const exitCodeFor = (report: ReviewReport): 0 | 1 => (report.counts.fail > 0 ? 1 : 0);

const RANK: Record<Status, number> = { fail: 3, warn: 2, pass: 1, skipped: 0 };

function worst(rows: readonly CheckResult[]): Status | null {
  let best: Status | null = null;
  for (const r of rows) if (best === null || RANK[r.status] > RANK[best]) best = r.status;
  return best;
}

export function renderReportMd(report: ReviewReport): string {
  const { fail, warn } = report.counts;
  const lines: string[] = [
    `REVIEW: ${report.verdict === "pass" ? "PASS" : "FAIL"} — ${fail} fail, ${warn} warn`,
    "",
    `Route ${report.route} (${report.server} server), ${report.url}`,
    `Generated ${report.generatedAt}. Widths ${report.widths.join(", ")}. Themes ${report.themes.join(", ")}.`,
    "",
  ];
  const widths = [
    ...new Set(report.checks.flatMap((c) => (c.width === null ? [] : [c.width]))),
  ].sort((a, b) => a - b);
  lines.push(`| check | severity | ${widths.map((w) => `${w}`).join(" | ")} |`);
  lines.push(`| --- | --- | ${widths.map(() => "---").join(" | ")} |`);
  for (const def of CHECKS) {
    const rows = report.checks.filter((c) => c.id === def.id);
    // A check that runs once per review (width null) shows its status under every width.
    const once = rows.filter((r) => r.width === null && r.status !== "skipped");
    const cells = widths.map((w) => {
      const s = worst(once.length > 0 ? once : rows.filter((r) => r.width === w));
      return s === null ? "-" : s;
    });
    const allSkipped = rows.every((r) => r.status === "skipped");
    lines.push(
      `| ${def.id} | ${def.severity} | ${(allSkipped ? widths.map(() => "skipped") : cells).join(" | ")} |`,
    );
  }
  const bad = report.checks.filter((c) => c.status === "fail" || c.status === "warn");
  if (bad.length > 0) {
    lines.push("", "## Offenders", "");
    for (const c of bad) {
      const where = [c.width === null ? null : `${c.width}px`, c.theme, c.state]
        .filter((x) => x !== null)
        .join(" ");
      lines.push(`### ${c.id} (${c.status.toUpperCase()}) ${where}`, "", c.detail, "");
      for (const o of c.offenders.slice(0, 20)) {
        const text = o.text === "" ? "" : ` "${o.text}"`;
        lines.push(`- \`${o.selector}\`${text} at [${o.box.map(round1).join(", ")}]: ${o.value}`);
      }
      if (c.offenders.length > 20) lines.push(`- and ${c.offenders.length - 20} more`);
      lines.push("");
    }
  }
  if (report.tasteSkill) {
    lines.push("## Ignored taste ids", "");
    if (report.tasteSkill.layout.ignored.length === 0) lines.push("None.");
    for (const i of report.tasteSkill.layout.ignored) lines.push(`- ${i.id}: ${i.reason}`);
    lines.push("");
  }
  lines.push("## Screenshots", "");
  for (const s of report.screenshots) lines.push(`- ${s.path}`);
  lines.push("");
  return lines.join("\n");
}
