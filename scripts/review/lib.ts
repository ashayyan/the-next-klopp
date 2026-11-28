// Pure review logic for `npm run review:screens` (QA-02): argument parsing, route slugging, the
// check registry, the evaluators that turn plain page data into pass or violation, the report
// shape (schemaVersion 1) and its Markdown rendering. No browser, no file system, no network, so
// Vitest covers all of it in CI. The browser module collects the data; thresholds live here.
// Erasable TypeScript only (run by `node` directly).

import { composite, contrast, parseCssColor, toHex } from "../design/lib/color.ts";

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
  /** True for a link inside running text (`p`, `li`): exempt from size and spacing. */
  runningText: boolean;
}

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
  for (const t of live) {
    const w = round1(t.box[2]);
    const h = round1(t.box[3]);
    if (w < TAP_MIN_PX || h < TAP_MIN_PX)
      add(t, `${w} x ${h} px, needs ${TAP_MIN_PX} x ${TAP_MIN_PX}`);
  }
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i] as TapTarget;
      const b = live[j] as TapTarget;
      if (contains(a.box, b.box) || contains(b.box, a.box)) continue;
      const gap = gapBetween(a.box, b.box);
      if (gap < TAP_GAP_PX) {
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

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w !== "").length;
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
  vision: "normal";
  path: string;
  sha256: string;
}

export interface ReportInput {
  route: string;
  server: "dev" | "preview";
  url: string;
  generatedAt: string;
  tokensSha256: string;
  widths: number[];
  themes: Theme[];
  checks: CheckResult[];
  screenshots: ScreenshotRecord[];
}

export interface ReviewReport {
  schemaVersion: 1;
  route: string;
  server: "dev" | "preview";
  url: string;
  generatedAt: string;
  designRef: { file: string; tokensSha256: string };
  widths: number[];
  themes: Theme[];
  verdict: "pass" | "fail";
  counts: Record<Status, number>;
  checks: CheckResult[];
  screenshots: ScreenshotRecord[];
  tasteSkill: null;
  reviewer: { status: "pending"; by: null; notes: null };
}

export const SKIPPED_DETAIL = "not implemented in this run (arrives with plan 04-06)";

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
    widths: input.widths,
    themes: input.themes,
    verdict: counts.fail > 0 ? "fail" : "pass",
    counts,
    checks,
    screenshots: input.screenshots,
    tasteSkill: null,
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
    const cells = widths.map((w) => {
      const s = worst(rows.filter((r) => r.width === w));
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
  lines.push("## Screenshots", "");
  for (const s of report.screenshots) lines.push(`- ${s.path}`);
  lines.push("");
  return lines.join("\n");
}
