// Pure review logic for `npm run review:screens` (QA-02): argument parsing, route slugging, the
// check registry, the evaluators that turn plain page data into pass or violation, the report
// shape (schemaVersion 1) and its Markdown rendering. No browser, no file system, no network, so
// Vitest covers all of it in CI. The browser module collects the data; thresholds live here.
// Erasable TypeScript only (run by `node` directly).

export type Theme = "light" | "dark";
export type Severity = "fail" | "warn";
export type CheckSource = "dom" | "static" | "taste";
export type Status = "pass" | "fail" | "warn" | "skipped";
export type Box = [number, number, number, number];

export const DEFAULT_WIDTHS = [375, 768, 1440] as const;
const HEIGHTS: Record<number, number> = { 375: 812, 768: 1024, 1440: 900 };
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
