// Palette gate (DSGN-02): colour-blind safety and contrast for every token set, both themes.
//   node scripts/design/check-palette.ts [file ...] [--markdown] [--json]
// With no file it checks the system input and every direction token set. Exit 0 when every check
// passes, 1 when any fails, 2 on bad arguments. Thresholds are constants in THRESHOLDS: never
// loosen one to make a palette pass.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listTokenInputs, loadTokens } from "./build-tokens.ts";
import { type CvdKind, contrast, deltaE, oklch } from "./lib/color.ts";
import type { Theme, TokenDocument } from "./tokens.ts";

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
} as const;

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
  metrics: {
    teams: { cvd: number; cvdKind: CvdKind; normal: number; tritan: number };
  };
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

/** One result per theme, the primary theme first. */
export function checkPalette(doc: TokenDocument): PaletteResult[] {
  const themes: Theme[] = doc.meta.primaryTheme === "dark" ? ["dark", "light"] : ["light", "dark"];
  return themes.map((theme) => {
    const pitch = doc.resolved[theme].pitch;
    const teamColours = [pitch["team-a"] as string, pitch["team-b"] as string];
    const teams = markChecks(
      "teams",
      ["team-a", "team-b"],
      teamColours,
      pitch["pitch-surface"] as string,
      "pitch-surface",
      theme,
    );
    return {
      direction: doc.meta.direction,
      theme,
      primary: theme === doc.meta.primaryTheme,
      checks: [...teams.checks],
      metrics: { teams: teams.worst },
    };
  });
}

function formatLine(r: PaletteResult): string {
  const failed = r.checks.filter((c) => !c.pass);
  const t = r.metrics.teams;
  const head = `${failed.length === 0 ? "PASS" : "FAIL"} ${r.direction} ${r.theme}: teams ${r1(t.cvd)} ${t.cvdKind} / ${r1(t.normal)}`;
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
  console.log(results.map(formatLine).join("\n"));
  return results.every((r) => r.checks.every((c) => c.pass)) ? 0 : 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
