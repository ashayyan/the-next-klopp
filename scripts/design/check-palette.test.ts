// Palette gate tests. Golden numbers are inline copies of the 04-UI-SPEC "Validation evidence"
// tables (computed 2026-11-28), so they survive the removal of the direction token files in 04-13.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listTokenInputs, loadTokens } from "./build-tokens.ts";
import { checkPalette, checkTheme, renderMarkdown, worstDistances } from "./check-palette.ts";
import { contrast } from "./lib/color.ts";
import type { ResolvedTheme } from "./tokens.ts";

const root = join(import.meta.dirname, "..", "..");
const SCRIPT = join(root, "scripts", "design", "check-palette.ts");
const run = (args: string[] = []) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: "utf8" });

describe("teams: golden numbers from the UI-SPEC evidence", () => {
  it("floodlit dark: worst CVD 24.4 (protan), normal 27.4", () => {
    const w = worstDistances(["#3A97DA", "#C77F00"]);
    expect(w.cvd).toBeCloseTo(24.4, 0);
    expect(Math.abs(w.cvd - 24.4)).toBeLessThanOrEqual(0.2);
    expect(w.cvdKind).toBe("protan");
    expect(Math.abs(w.normal - 27.4)).toBeLessThanOrEqual(0.2);
  });

  it("floodlit light: worst CVD 21.9 (protan), normal 31.2", () => {
    const w = worstDistances(["#0072B2", "#D55E00"]);
    expect(Math.abs(w.cvd - 21.9)).toBeLessThanOrEqual(0.2);
    expect(w.cvdKind).toBe("protan");
    expect(Math.abs(w.normal - 31.2)).toBeLessThanOrEqual(0.2);
  });
});

describe("the gate reads real token sets", () => {
  it("passes every team check for the system input in both themes", () => {
    const results = checkPalette(loadTokens(root, listTokenInputs(root).system.input));
    expect(results.map((r) => r.theme)).toEqual(["dark", "light"]); // floodlit: dark is primary
    for (const r of results) {
      expect(r.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual([]);
      expect(r.checks.some((c) => c.id === "teams-cvd")).toBe(true);
    }
  });

  it("fails a team B that is too close to team A or too dark in chroma", () => {
    const doc = loadTokens(root, listTokenInputs(root).system.input);
    const bad = structuredClone(doc);
    bad.resolved.light.pitch["team-b"] = "#00A000";
    const light = checkPalette(bad).find((r) => r.theme === "light");
    expect(light?.checks.filter((c) => !c.pass).length).toBeGreaterThan(0);
  });

  it("the CLI exits 0 on the shipped sets and prints one line per theme", () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain("FAIL");
    expect(r.stdout).toContain("PASS floodlit dark");
  });
});

// ---------------------------------------------------------------------------------------------
// Full gate: every set from the UI-SPEC evidence tables (inline copies, 2026-11-28). The
// notebook dark control border is #6B7871, not the recorded #6A7770 (2.99:1 on the panel misses
// the 3:1 rule); its recorded 3.0 becomes 3.04.

interface Fixture {
  name: string;
  theme: "light" | "dark";
  color: Record<string, string>;
  pitch: Record<string, string>;
  data: Record<string, string>;
  /** Worst CVD delta E, worst normal delta E. */
  teams: [number, number];
  categorical: [number, number];
  diverging: number;
  /** null: the recorded row measured the accent, the gate measures the focus ring (ink). */
  contrast: Record<string, number | null>;
}

const FIXTURES: Fixture[] = [
  {
    name: "floodlit dark",
    theme: "dark",
    color: {
      "surface-page": "#0E151D",
      "surface-panel": "#1C2834",
      ink: "#E8EDF1",
      "ink-muted": "#9CA8B4",
      accent: "#6FD0AE",
      "accent-ink": "#0E151D",
      "focus-ring": "#6FD0AE",
      "control-border": "#6A7B8B",
      danger: "#F2857A",
      "surface-highlight": "#243241",
      "surface-highlight-ink": "#E8EDF1",
    },
    pitch: {
      "pitch-runoff": "#121B24",
      "pitch-surface": "#182431",
      "pitch-line": "#71859A",
      "team-a": "#3A97DA",
      "team-a-ink": "#0E151D",
      "team-b": "#C77F00",
      "team-b-fill": "#0E151D",
      "team-b-ink": "#E8EDF1",
    },
    data: {
      "cat-1": "#3A97DA",
      "cat-2": "#C77F00",
      "cat-3": "#3DAA6E",
      "cat-other": "#9AA7B3",
      "seq-1": "#173A3A",
      "seq-2": "#1B5E57",
      "seq-3": "#24857A",
      "seq-4": "#4FB3A2",
      "seq-5": "#9EDCCF",
      "div-neg": "#B0702A",
      "div-mid": "#3A3F45",
      "div-pos": "#26A896",
    },
    teams: [24.4, 27.4],
    categorical: [9.1, 18.6],
    diverging: 12.7,
    contrast: {
      "ink-page": 15.6,
      "ink-panel": 12.7,
      "muted-page": 7.6,
      "muted-panel": 6.2,
      "accent-ink-accent": 9.9,
      "focus-page": 9.9,
      "border-page": 4.2,
      "border-panel": 3.4,
      "danger-page": 7.4,
      "panel-page": 1.23,
      "line-surface": 4.1,
      "line-runoff": 4.6,
      "team-a-surface": 5,
      "team-b-surface": 4.8,
      "team-a-ink-team-a": 5.8,
    },
  },
  {
    name: "floodlit light",
    theme: "light",
    color: {
      "surface-page": "#F3F5F7",
      "surface-panel": "#D8E0E7",
      ink: "#111922",
      "ink-muted": "#4C5967",
      accent: "#0A7558",
      "accent-ink": "#FFFFFF",
      "focus-ring": "#0A7558",
      "control-border": "#6B7987",
      danger: "#B3261E",
      "surface-highlight": "#FFFFFF",
      "surface-highlight-ink": "#111922",
    },
    pitch: {
      "pitch-runoff": "#DCE3E9",
      "pitch-surface": "#E9EEF2",
      "pitch-line": "#66778A",
      "team-a": "#0072B2",
      "team-a-ink": "#FFFFFF",
      "team-b": "#D55E00",
      "team-b-fill": "#FFFFFF",
      "team-b-ink": "#111922",
    },
    data: {
      "cat-1": "#0072B2",
      "cat-2": "#D55E00",
      "cat-3": "#009E73",
      "cat-other": "#6B7987",
      "seq-1": "#D3ECE6",
      "seq-2": "#62B5A3",
      "seq-3": "#3A9F8E",
      "seq-4": "#1B7A6C",
      "seq-5": "#0B4F47",
      "div-neg": "#8C510A",
      "div-mid": "#EEF0F1",
      "div-pos": "#0A8F7F",
    },
    teams: [21.9, 31.2],
    categorical: [11.0, 18.7],
    diverging: 13.5,
    contrast: {
      "ink-page": 16.2,
      "ink-panel": 13.3,
      "muted-page": 6.6,
      "muted-panel": 5.4,
      "accent-ink-accent": 5.7,
      "focus-page": 5.2,
      "border-page": 4.1,
      "border-panel": 3.3,
      "danger-page": 6,
      "panel-page": 1.22,
      "line-surface": 3.9,
      "line-runoff": 3.5,
      "team-a-surface": 4.4,
      "team-b-surface": 3.3,
      "team-a-ink-team-a": 5.2,
    },
  },
  {
    name: "programme light",
    theme: "light",
    color: {
      "surface-page": "#FAFAF7",
      "surface-panel": "#E4E4DC",
      ink: "#10241A",
      "ink-muted": "#4D5B53",
      accent: "#F5D90A",
      "accent-ink": "#10241A",
      "focus-ring": "#10241A",
      "control-border": "#6E7A72",
      danger: "#B3261E",
      "surface-highlight": "#F5D90A",
      "surface-highlight-ink": "#10241A",
    },
    pitch: {
      "pitch-runoff": "#E4E4DC",
      "pitch-surface": "#FFFFFF",
      "pitch-line": "#4A5A51",
      "team-a": "#0072B2",
      "team-a-ink": "#FFFFFF",
      "team-b": "#D55E00",
      "team-b-fill": "#FFFFFF",
      "team-b-ink": "#10241A",
    },
    data: {
      "cat-1": "#0072B2",
      "cat-2": "#D55E00",
      "cat-3": "#009E73",
      "cat-other": "#6B7987",
      "seq-1": "#E2E7ED",
      "seq-2": "#8C9DB1",
      "seq-3": "#667C96",
      "seq-4": "#455D7A",
      "seq-5": "#263E5C",
      "div-neg": "#8C510A",
      "div-mid": "#EFEFEA",
      "div-pos": "#0A8F7F",
    },
    teams: [21.9, 31.2],
    categorical: [11.0, 18.7],
    diverging: 13.5,
    contrast: {
      "ink-page": 15.6,
      "ink-panel": 12.7,
      "muted-page": 6.8,
      "muted-panel": 5.6,
      "accent-ink-accent": 11.5,
      "focus-page": null,
      "border-page": 4.3,
      "border-panel": 3.5,
      "danger-page": 6.3,
      "panel-page": 1.22,
      "line-surface": 7.3,
      "line-runoff": 5.7,
      "team-a-surface": 5.2,
      "team-b-surface": 3.9,
      "team-a-ink-team-a": 5.2,
    },
  },
  {
    name: "programme dark",
    theme: "dark",
    color: {
      "surface-page": "#0F1C15",
      "surface-panel": "#1D3027",
      ink: "#F2F3EE",
      "ink-muted": "#A6B1AA",
      accent: "#F5D90A",
      "accent-ink": "#10241A",
      "focus-ring": "#F5D90A",
      "control-border": "#6F7F76",
      danger: "#F2857A",
      "surface-highlight": "#F5D90A",
      "surface-highlight-ink": "#10241A",
    },
    pitch: {
      "pitch-runoff": "#13221A",
      "pitch-surface": "#1A2D23",
      "pitch-line": "#8A9B90",
      "team-a": "#3A97DA",
      "team-a-ink": "#0F1C15",
      "team-b": "#C77F00",
      "team-b-fill": "#0F1C15",
      "team-b-ink": "#F2F3EE",
    },
    data: {
      "cat-1": "#3A97DA",
      "cat-2": "#C77F00",
      "cat-3": "#3DAA6E",
      "cat-other": "#9AA7B3",
      "seq-1": "#1C2B3B",
      "seq-2": "#33506F",
      "seq-3": "#4F7096",
      "seq-4": "#7896BA",
      "seq-5": "#AFC4DB",
      "div-neg": "#B0702A",
      "div-mid": "#33403A",
      "div-pos": "#26A896",
    },
    teams: [24.4, 27.4],
    categorical: [9.1, 18.6],
    diverging: 12.7,
    contrast: {
      "ink-page": 15.7,
      "ink-panel": 12.5,
      "muted-page": 7.9,
      "muted-panel": 6.3,
      "accent-ink-accent": 11.5,
      "focus-page": 12.4,
      "border-page": 4.2,
      "border-panel": 3.3,
      "danger-page": 7,
      "panel-page": 1.26,
      "line-surface": 5,
      "line-runoff": 5.6,
      "team-a-surface": 4.6,
      "team-b-surface": 4.5,
      "team-a-ink-team-a": 5.5,
    },
  },
  {
    name: "notebook light",
    theme: "light",
    color: {
      "surface-page": "#EEF1EE",
      "surface-panel": "#D7DED9",
      ink: "#1D2824",
      "ink-muted": "#505E58",
      accent: "#2C5E47",
      "accent-ink": "#FFFFFF",
      "focus-ring": "#2C5E47",
      "control-border": "#6C7A73",
      danger: "#A8321F",
      "surface-highlight": "#FAFBFA",
      "surface-highlight-ink": "#1D2824",
    },
    pitch: {
      "pitch-runoff": "#D7DED9",
      "pitch-surface": "#FAFBFA",
      "pitch-line": "#6C7B74",
      "team-a": "#2B62AE",
      "team-a-ink": "#FFFFFF",
      "team-b": "#C25118",
      "team-b-fill": "#FFFFFF",
      "team-b-ink": "#1D2824",
    },
    data: {
      "cat-1": "#2B62AE",
      "cat-2": "#C25118",
      "cat-3": "#118A6B",
      "cat-other": "#6C7A73",
      "seq-1": "#E5EDE2",
      "seq-2": "#8DB389",
      "seq-3": "#5E9563",
      "seq-4": "#3E774B",
      "seq-5": "#22533A",
      "div-neg": "#8C510A",
      "div-mid": "#ECEFEC",
      "div-pos": "#0A8F7F",
    },
    teams: [22.2, 29.0],
    categorical: [10.7, 18.2],
    diverging: 13.5,
    contrast: {
      "ink-page": 13.4,
      "ink-panel": 11.1,
      "muted-page": 6,
      "muted-panel": 5,
      "accent-ink-accent": 7.5,
      "focus-page": 6.6,
      "border-page": 4,
      "border-panel": 3.3,
      "danger-page": 5.9,
      "panel-page": 1.2,
      "line-surface": 4.3,
      "line-runoff": 3.2,
      "team-a-surface": 5.8,
      "team-b-surface": 4.5,
      "team-a-ink-team-a": 6.1,
    },
  },
  {
    name: "notebook dark",
    theme: "dark",
    color: {
      "surface-page": "#151B19",
      "surface-panel": "#242E2A",
      ink: "#E4E8E3",
      "ink-muted": "#9DA7A1",
      accent: "#8CCBAF",
      "accent-ink": "#151B19",
      "focus-ring": "#8CCBAF",
      "control-border": "#6B7871",
      danger: "#F08A7B",
      "surface-highlight": "#2C3733",
      "surface-highlight-ink": "#E4E8E3",
    },
    pitch: {
      "pitch-runoff": "#192120",
      "pitch-surface": "#202A27",
      "pitch-line": "#7D8B85",
      "team-a": "#4A90D9",
      "team-a-ink": "#151B19",
      "team-b": "#CF7A2E",
      "team-b-fill": "#151B19",
      "team-b-ink": "#E4E8E3",
    },
    data: {
      "cat-1": "#4A90D9",
      "cat-2": "#CF7A2E",
      "cat-3": "#21A07F",
      "cat-other": "#9AA7B3",
      "seq-1": "#1E3326",
      "seq-2": "#33603F",
      "seq-3": "#4A8058",
      "seq-4": "#6FA67A",
      "seq-5": "#A8D1A9",
      "div-neg": "#B0702A",
      "div-mid": "#343D39",
      "div-pos": "#26A896",
    },
    teams: [23.4, 26.7],
    categorical: [9.9, 16.2],
    diverging: 12.7,
    contrast: {
      "ink-page": 14.1,
      "ink-panel": 11.3,
      "muted-page": 7,
      "muted-panel": 5.7,
      "accent-ink-accent": 9.4,
      "focus-page": 9.4,
      "border-page": 3.7,
      "border-panel": 3.04,
      "danger-page": 7.2,
      "panel-page": 1.25,
      "line-surface": 4.2,
      "line-runoff": 4.6,
      "team-a-surface": 4.4,
      "team-b-surface": 4.6,
      "team-a-ink-team-a": 5.2,
    },
  },
];

const asTheme = (f: Fixture): ResolvedTheme => ({ color: f.color, pitch: f.pitch, data: f.data });

describe("full gate against the recorded evidence, six sets", () => {
  for (const f of FIXTURES) {
    it(`${f.name}: every recorded number reproduces and every check passes`, () => {
      const { checks, metrics } = checkTheme(asTheme(f), f.theme);
      expect(checks.filter((c) => !c.pass).map((c) => c.detail)).toEqual([]);
      expect(Math.abs(metrics.teams.cvd - f.teams[0])).toBeLessThanOrEqual(0.2);
      expect(Math.abs(metrics.teams.normal - f.teams[1])).toBeLessThanOrEqual(0.2);
      expect(Math.abs(metrics.categorical.cvd - f.categorical[0])).toBeLessThanOrEqual(0.2);
      expect(Math.abs(metrics.categorical.normal - f.categorical[1])).toBeLessThanOrEqual(0.2);
      expect(Math.abs(metrics.divergingCvd - f.diverging)).toBeLessThanOrEqual(0.2);
      expect(metrics.ordinal.pass).toBe(true);
      for (const [id, expected] of Object.entries(f.contrast)) {
        if (expected === null) continue;
        const got = metrics.contrast[id as keyof typeof metrics.contrast];
        const tolerance = id === "panel-page" ? 0.02 : 0.2;
        expect(
          Math.abs(got - expected),
          `${f.name} ${id}: ${got} vs ${expected}`,
        ).toBeLessThanOrEqual(tolerance);
      }
    });
  }

  it("rings programme light focus in ink, not the yellow accent", () => {
    const f = FIXTURES.find((x) => x.name === "programme light") as Fixture;
    const { metrics } = checkTheme(asTheme(f), f.theme);
    expect(f.color["focus-ring"]).toBe(f.color.ink);
    expect(metrics.contrast["focus-page"]).toBeGreaterThan(15);
    expect(contrast(f.color.accent as string, f.color["surface-page"] as string)).toBeLessThan(1.5);
  });

  it("adds the highlight and team-B ink rows and passes them", () => {
    for (const f of FIXTURES) {
      const { metrics } = checkTheme(asTheme(f), f.theme);
      expect(metrics.contrast["highlight-ink"]).toBeGreaterThanOrEqual(4.5);
      expect(metrics.contrast["team-b-ink-fill"]).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("the gate fails unsafe palettes", () => {
  const light = FIXTURES.find((x) => x.name === "floodlit light") as Fixture;

  it("fails a floodlit light copy whose team B is #00A000", () => {
    const bad = { ...asTheme(light), pitch: { ...light.pitch, "team-b": "#00A000" } };
    const failed = checkTheme(bad, "light")
      .checks.filter((c) => !c.pass)
      .map((c) => c.id);
    expect(failed.some((id) => id.startsWith("teams-"))).toBe(true);
  });

  it("fails a sequential ramp that is not monotone", () => {
    const bad = {
      ...asTheme(light),
      data: { ...light.data, "seq-3": "#0B4F47", "seq-5": "#62B5A3" },
    };
    expect(checkTheme(bad, "light").metrics.ordinal.pass).toBe(false);
  });

  it("fails a text pair below 4.5:1", () => {
    const bad = { ...asTheme(light), color: { ...light.color, "ink-muted": "#8FA0B0" } };
    const failed = checkTheme(bad, "light").checks.filter((c) => !c.pass);
    expect(failed.map((c) => c.id)).toContain("contrast:muted-page");
  });

  it("the CLI exits 1 for a token file with team B #00A000 and names the check", () => {
    const dir = mkdtempSync(join(tmpdir(), "tnk-palette-"));
    const json = JSON.parse(readFileSync(join(root, listTokenInputs(root).system.input), "utf8"));
    json.pitch.light["team-b"] = { $type: "color", $value: "#00A000" };
    const file = join(dir, "bad.tokens.json");
    writeFileSync(file, JSON.stringify(json));
    const r = run([file]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("FAIL floodlit light");
    expect(r.stdout).toContain("teams-");
  });

  it("exits 2 on an unknown option", () => {
    expect(run(["--nope"]).status).toBe(2);
  });
});

describe("--json and --markdown", () => {
  it("--json prints 6 entries for 3 sets x 2 themes", () => {
    const r = run(["--json"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as {
      direction: string;
      theme: string;
      checks: unknown[];
    }[];
    expect(parsed).toHaveLength(6);
    expect(new Set(parsed.map((p) => p.direction))).toEqual(
      new Set(["floodlit", "programme", "notebook"]),
    );
    expect(parsed.every((p) => p.checks.length > 20)).toBe(true);
  });

  it("--markdown prints one row per set and theme in both tables", () => {
    const r = run(["--markdown"]);
    expect(r.status).toBe(0);
    for (const name of ["floodlit dark", "floodlit light", "programme light", "notebook dark"]) {
      expect(r.stdout.match(new RegExp(`^\\| ${name} \\|`, "gm"))).toHaveLength(2);
    }
    expect(r.stdout).toContain(
      "| floodlit dark | 24.4 protan / 27.4 | 9.1 deutan / 18.6 | 12.7 | PASS |",
    );
    expect(r.stdout).toContain("panel / page (tone step)");
  });

  it("renderMarkdown is stable for identical input", () => {
    const results = checkPalette(loadTokens(root, listTokenInputs(root).system.input));
    expect(renderMarkdown(results)).toBe(renderMarkdown(results));
  });
});

describe("CI gate", () => {
  it("every discovered token set passes every check in both themes", () => {
    const all = listTokenInputs(root);
    const inputs = [...new Set([all.system.input, ...all.directions.map((d) => d.input)])];
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    for (const input of inputs) {
      for (const r of checkPalette(loadTokens(root, input))) {
        expect(
          r.checks.filter((c) => !c.pass).map((c) => `${r.direction} ${r.theme} ${c.detail}`),
        ).toEqual([]);
      }
    }
  });
});
