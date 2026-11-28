// Palette gate (DSGN-02): colour-blind safety and contrast for every token set, both themes.
//   node scripts/design/check-palette.ts [file ...] [--markdown] [--json]
// With no file it checks the system input and every direction token set. Exit 0 when every check
// passes, 1 when any fails, 2 on bad arguments. Thresholds are constants in THRESHOLDS: never
// loosen one to make a palette pass.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listTokenInputs, loadTokens } from "./build-tokens.ts";
import { type CvdKind, contrast, deltaE, hueDistance, oklch } from "./lib/color.ts";
import type { ResolvedTheme, Theme, TokenDocument } from "./tokens.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const THRESHOLDS = {
  /** Minimum over protan and deutan, OKLab delta E x 100, between any two marks. */
  cvdDeltaE: 8,
  /** Same pairs, normal vision. */
  normalDeltaE: 15,
  /** OKLCH lightness band of a mark. */
  lightness: { light: [0.43, 0.77], dark: [0.48, 0.67] },
  minChroma: 0.1,
  /** A mark against the surface it is drawn on (WCAG non-text). */
  markContrast: 3,
  /** Sequential steps 2 to 5: adjacent OKLCH lightness gap, hue spread, contrast on the page. */
  ordinal: { minStepL: 0.06, maxHueSpread: 40, minContrast: 2 },
} as const;

/** The contrast table of 04-UI-SPEC "Validation evidence", plus two added rows. */
export const CONTRAST_ROWS = [
  { id: "ink-page", label: "ink / page", fg: "ink", bg: "surface-page", min: 4.5 },
  { id: "ink-panel", label: "ink / panel", fg: "ink", bg: "surface-panel", min: 4.5 },
  { id: "muted-page", label: "muted / page", fg: "ink-muted", bg: "surface-page", min: 4.5 },
  { id: "muted-panel", label: "muted / panel", fg: "ink-muted", bg: "surface-panel", min: 4.5 },
  {
    id: "accent-ink-accent",
    label: "accent-ink / accent",
    fg: "accent-ink",
    bg: "accent",
    min: 4.5,
  },
  { id: "focus-page", label: "focus ring / page", fg: "focus-ring", bg: "surface-page", min: 3 },
  {
    id: "border-page",
    label: "control border / page",
    fg: "control-border",
    bg: "surface-page",
    min: 3,
  },
  {
    id: "border-panel",
    label: "control border / panel",
    fg: "control-border",
    bg: "surface-panel",
    min: 3,
  },
  { id: "danger-page", label: "danger / page", fg: "danger", bg: "surface-page", min: 4.5 },
  {
    id: "panel-page",
    label: "panel / page (tone step)",
    fg: "surface-panel",
    bg: "surface-page",
    min: 1.2,
  },
  {
    id: "line-surface",
    label: "pitch line / surface",
    fg: "pitch-line",
    bg: "pitch-surface",
    min: 3,
  },
  {
    id: "line-runoff",
    label: "pitch line / run-off",
    fg: "pitch-line",
    bg: "pitch-runoff",
    min: 3,
  },
  { id: "team-a-surface", label: "team A / surface", fg: "team-a", bg: "pitch-surface", min: 3 },
  { id: "team-b-surface", label: "team B / surface", fg: "team-b", bg: "pitch-surface", min: 3 },
  {
    id: "team-a-ink-team-a",
    label: "team-a-ink / team A",
    fg: "team-a-ink",
    bg: "team-a",
    min: 4.5,
  },
  {
    id: "highlight-ink",
    label: "highlight-ink / highlight",
    fg: "surface-highlight-ink",
    bg: "surface-highlight",
    min: 4.5,
  },
  {
    id: "team-b-ink-fill",
    label: "team-b-ink / team-b-fill",
    fg: "team-b-ink",
    bg: "team-b-fill",
    min: 4.5,
  },
] as const;
export type ContrastRowId = (typeof CONTRAST_ROWS)[number]["id"];

export interface Check {
  id: string;
  pass: boolean;
  value: number;
  threshold: string;
  detail: string;
}

export interface PaletteResult {
  direction: string;
  theme: Theme;
  primary: boolean;
  checks: Check[];
  metrics: PaletteMetrics;
}

type Distances = { cvd: number; cvdKind: CvdKind; normal: number; tritan: number };

export interface PaletteMetrics {
  teams: Distances;
  categorical: Distances;
  /** Diverging poles, minimum over protan and deutan. */
  divergingCvd: number;
  ordinal: { pass: boolean; minStepL: number; hueSpread: number; minContrast: number };
  contrast: Record<ContrastRowId, number>;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

function pairs<T>(items: readonly T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) out.push([items[i] as T, items[j] as T]);
  }
  return out;
}

/** The worst (smallest) CVD and normal distance over every pair. */
export function worstDistances(colours: readonly string[]): {
  cvd: number;
  cvdKind: CvdKind;
  normal: number;
  tritan: number;
} {
  let cvd = Number.POSITIVE_INFINITY;
  let cvdKind: CvdKind = "protan";
  let normal = Number.POSITIVE_INFINITY;
  let tritan = Number.POSITIVE_INFINITY;
  for (const [a, b] of pairs(colours)) {
    for (const kind of ["protan", "deutan"] as const) {
      const d = deltaE(a, b, kind);
      if (d < cvd) {
        cvd = d;
        cvdKind = kind;
      }
    }
    normal = Math.min(normal, deltaE(a, b));
    tritan = Math.min(tritan, deltaE(a, b, "tritan"));
  }
  return { cvd, cvdKind, normal, tritan };
}

/** Lightness band, chroma, contrast on the surface, and pair distances for a set of marks. */
function markChecks(
  prefix: string,
  names: readonly string[],
  colours: readonly string[],
  surface: string,
  surfaceName: string,
  theme: Theme,
): { checks: Check[]; worst: ReturnType<typeof worstDistances> } {
  const checks: Check[] = [];
  const [lo, hi] = THRESHOLDS.lightness[theme];
  colours.forEach((hex, i) => {
    const name = names[i] ?? hex;
    const { L, C } = oklch(hex);
    checks.push({
      id: `${prefix}-lightness:${name}`,
      pass: L >= lo && L <= hi,
      value: L,
      threshold: `${lo}-${hi}`,
      detail: `${name} ${hex} OKLCH L ${L.toFixed(3)} (${theme} band ${lo}-${hi})`,
    });
    checks.push({
      id: `${prefix}-chroma:${name}`,
      pass: C >= THRESHOLDS.minChroma,
      value: C,
      threshold: `>= ${THRESHOLDS.minChroma}`,
      detail: `${name} ${hex} chroma ${C.toFixed(3)}`,
    });
    const ratio = contrast(hex, surface);
    checks.push({
      id: `${prefix}-contrast:${name}`,
      pass: ratio >= THRESHOLDS.markContrast,
      value: ratio,
      threshold: `>= ${THRESHOLDS.markContrast}`,
      detail: `${name} ${hex} on ${surfaceName} ${surface} is ${ratio.toFixed(2)}:1`,
    });
  });
  const worst = worstDistances(colours);
  checks.push({
    id: `${prefix}-cvd`,
    pass: worst.cvd >= THRESHOLDS.cvdDeltaE,
    value: worst.cvd,
    threshold: `>= ${THRESHOLDS.cvdDeltaE}`,
    detail: `worst colour-blind delta E ${r1(worst.cvd)} (${worst.cvdKind})`,
  });
  checks.push({
    id: `${prefix}-normal`,
    pass: worst.normal >= THRESHOLDS.normalDeltaE,
    value: worst.normal,
    threshold: `>= ${THRESHOLDS.normalDeltaE}`,
    detail: `worst normal-vision delta E ${r1(worst.normal)}`,
  });
  // Tritan is reported, never gated: every categorical chart carries direct labels or a table.
  checks.push({
    id: `${prefix}-tritan`,
    pass: true,
    value: worst.tritan,
    threshold: "reported",
    detail: `worst tritan delta E ${r1(worst.tritan)} (reported only)`,
  });
  return { checks, worst };
}

/** All checks for one resolved theme. */
export function checkTheme(
  r: ResolvedTheme,
  theme: Theme,
): { checks: Check[]; metrics: PaletteMetrics } {
  const color = (k: string): string => r.color[k] as string;
  const pitch = (k: string): string => r.pitch[k] as string;
  const data = (k: string): string => r.data[k] as string;
  const checks: Check[] = [];

  const teams = markChecks(
    "teams",
    ["team-a", "team-b"],
    [pitch("team-a"), pitch("team-b")],
    pitch("pitch-surface"),
    "pitch-surface",
    theme,
  );
  checks.push(...teams.checks);

  const cat = markChecks(
    "cat",
    ["cat-1", "cat-2", "cat-3"],
    [data("cat-1"), data("cat-2"), data("cat-3")],
    color("surface-page"),
    "surface-page",
    theme,
  );
  checks.push(...cat.checks);
  const other = contrast(data("cat-other"), color("surface-page"));
  checks.push({
    id: "cat-contrast:other",
    pass: other >= THRESHOLDS.markContrast,
    value: other,
    threshold: `>= ${THRESHOLDS.markContrast}`,
    detail: `cat-other ${data("cat-other")} on surface-page is ${other.toFixed(2)}:1`,
  });

  const divergingCvd = Math.min(
    deltaE(data("div-neg"), data("div-pos"), "protan"),
    deltaE(data("div-neg"), data("div-pos"), "deutan"),
  );
  checks.push({
    id: "div-cvd",
    pass: divergingCvd >= THRESHOLDS.cvdDeltaE,
    value: divergingCvd,
    threshold: `>= ${THRESHOLDS.cvdDeltaE}`,
    detail: `diverging poles colour-blind delta E ${r1(divergingCvd)}`,
  });

  // Sequential step 1 means "near zero" and may recede to the surface: the ordinal set is 2 to 5.
  const steps = ["seq-2", "seq-3", "seq-4", "seq-5"].map((k) => data(k));
  const lch = steps.map((hex) => oklch(hex));
  const dL = lch.slice(1).map((c, i) => c.L - (lch[i]?.L ?? 0));
  const monotone = dL.every((d) => d > 0) || dL.every((d) => d < 0);
  const minStepL = Math.min(...dL.map((d) => Math.abs(d)));
  const hueSpread = Math.max(
    ...lch.flatMap((a, i) => lch.slice(i + 1).map((b) => hueDistance(a.h, b.h))),
  );
  const minOrdinalContrast = Math.min(...steps.map((hex) => contrast(hex, color("surface-page"))));
  const o = THRESHOLDS.ordinal;
  const ordinalPass =
    monotone &&
    minStepL >= o.minStepL &&
    hueSpread <= o.maxHueSpread &&
    minOrdinalContrast >= o.minContrast;
  checks.push(
    {
      id: "seq-monotone",
      pass: monotone,
      value: monotone ? 1 : 0,
      threshold: "monotone lightness",
      detail: `steps 2-5 lightness ${lch.map((c) => c.L.toFixed(2)).join(", ")}`,
    },
    {
      id: "seq-step",
      pass: minStepL >= o.minStepL,
      value: minStepL,
      threshold: `>= ${o.minStepL}`,
      detail: `smallest adjacent lightness gap ${minStepL.toFixed(3)}`,
    },
    {
      id: "seq-hue",
      pass: hueSpread <= o.maxHueSpread,
      value: hueSpread,
      threshold: `<= ${o.maxHueSpread}`,
      detail: `hue spread ${hueSpread.toFixed(1)} degrees`,
    },
    {
      id: "seq-contrast",
      pass: minOrdinalContrast >= o.minContrast,
      value: minOrdinalContrast,
      threshold: `>= ${o.minContrast}`,
      detail: `weakest step on surface-page ${minOrdinalContrast.toFixed(2)}:1`,
    },
  );

  const rows = {} as Record<ContrastRowId, number>;
  for (const row of CONTRAST_ROWS) {
    const lookup = (k: string): string => (r.color[k] ?? r.pitch[k]) as string;
    const ratio = contrast(lookup(row.fg), lookup(row.bg));
    rows[row.id] = ratio;
    checks.push({
      id: `contrast:${row.id}`,
      pass: ratio >= row.min,
      value: ratio,
      threshold: `>= ${row.min}`,
      detail: `${row.label} ${ratio.toFixed(2)}:1`,
    });
  }

  return {
    checks,
    metrics: {
      teams: teams.worst,
      categorical: cat.worst,
      divergingCvd,
      ordinal: { pass: ordinalPass, minStepL, hueSpread, minContrast: minOrdinalContrast },
      contrast: rows,
    },
  };
}

/** One result per theme, the primary theme first. */
export function checkPalette(doc: TokenDocument): PaletteResult[] {
  const themes: Theme[] = doc.meta.primaryTheme === "dark" ? ["dark", "light"] : ["light", "dark"];
  return themes.map((theme) => ({
    direction: doc.meta.direction,
    theme,
    primary: theme === doc.meta.primaryTheme,
    ...checkTheme(doc.resolved[theme], theme),
  }));
}

const f1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
const f2 = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);

/**
 * The two validation tables DESIGN.md section 3.1 embeds, in the shape of the 04-UI-SPEC
 * "Validation evidence" tables: one row per set and theme.
 */
export function renderMarkdown(results: readonly PaletteResult[]): string {
  const name = (r: PaletteResult) => `${r.direction} ${r.theme}`;
  const dist = (d: Distances) => `${f1(d.cvd)} ${d.cvdKind} / ${f1(d.normal)}`;
  const head1 = [
    "| Set | Teams on pitch surface (all pairs): worst CVD ΔE / normal ΔE | Categorical 1-3 on page (all pairs): worst CVD ΔE / normal ΔE | Diverging poles CVD ΔE | Sequential ordinal |",
    "|-----|------|------|------|------|",
  ];
  const rows1 = results.map(
    (r) =>
      `| ${name(r)} | ${dist(r.metrics.teams)} | ${dist(r.metrics.categorical)} | ${f1(r.metrics.divergingCvd)} | ${r.metrics.ordinal.pass ? "PASS" : "FAIL"} |`,
  );
  const labels = CONTRAST_ROWS.map((row) => row.label);
  const head2 = [
    `| Set | ${labels.join(" | ")} |`,
    `|-----|${labels.map(() => "------").join("|")}|`,
  ];
  const rows2 = results.map(
    (r) =>
      `| ${name(r)} | ${CONTRAST_ROWS.map((row) => (row.id === "panel-page" ? f2 : f1)(r.metrics.contrast[row.id])).join(" | ")} |`,
  );
  return `${[...head1, ...rows1, "", ...head2, ...rows2].join("\n")}\n`;
}

function formatLine(r: PaletteResult): string {
  const failed = r.checks.filter((c) => !c.pass);
  const t = r.metrics.teams;
  const c = r.metrics.categorical;
  const head = `${failed.length === 0 ? "PASS" : "FAIL"} ${r.direction} ${r.theme}: teams ${r1(t.cvd)} ${t.cvdKind} / ${r1(t.normal)}, categorical ${r1(c.cvd)} / ${r1(c.normal)}, diverging ${r1(r.metrics.divergingCvd)}`;
  return [head, ...failed.map((c) => `  FAIL ${c.id}: ${c.detail} (needs ${c.threshold})`)].join(
    "\n",
  );
}

function main(argv: string[]): number {
  const files = argv.filter((a) => !a.startsWith("--"));
  const unknown = argv.filter((a) => a.startsWith("--") && a !== "--json" && a !== "--markdown");
  if (unknown.length > 0) {
    console.error(
      `unknown option ${unknown[0]}\nusage: node scripts/design/check-palette.ts [file ...] [--markdown] [--json]`,
    );
    return 2;
  }
  let inputs: string[];
  if (files.length > 0) inputs = files.map((f) => resolve(process.cwd(), f));
  else {
    const all = listTokenInputs(ROOT);
    inputs = [...new Set([all.system.input, ...all.directions.map((d) => d.input)])];
  }
  const results: PaletteResult[] = [];
  for (const input of inputs) {
    try {
      results.push(...checkPalette(loadTokens(ROOT, input)));
    } catch (err) {
      console.error((err as Error).message);
      return 1;
    }
  }
  const machine = argv.includes("--json") || argv.includes("--markdown");
  if (argv.includes("--json")) console.log(JSON.stringify(results, null, 2));
  else if (argv.includes("--markdown")) process.stdout.write(renderMarkdown(results));
  else console.log(results.map(formatLine).join("\n"));
  if (machine) {
    for (const r of results) {
      for (const c of r.checks.filter((x) => !x.pass)) {
        console.error(`FAIL ${r.direction} ${r.theme} ${c.id}: ${c.detail} (needs ${c.threshold})`);
      }
    }
  }
  return results.every((r) => r.checks.every((c) => c.pass)) ? 0 : 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
