// Palette gate tests. Golden numbers are inline copies of the 04-UI-SPEC "Validation evidence"
// tables (computed 2026-11-28), so they survive the removal of the direction token files in 04-13.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listTokenInputs, loadTokens } from "./build-tokens.ts";
import { checkPalette, worstDistances } from "./check-palette.ts";

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
