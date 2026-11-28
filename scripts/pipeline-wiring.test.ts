// Phase 3 Nyquist gaps: PIPE-02 (one npm script runs the pipeline on Windows, no make) and the CI
// half of PIPE-03 (the size/licence gates actually run in CI, after a real build).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
const pyproject = readFileSync("pipeline/pyproject.toml", "utf8");
const cli = readFileSync("pipeline/src/klopp_pipeline/cli.py", "utf8");
const ci = readFileSync(".github/workflows/ci.yml", "utf8").replace(/\r\n/g, "\n");

// Split the `jobs:` map into { jobName: body } on two-space job keys.
function jobs(yml: string): Record<string, string> {
  const body = yml.slice(yml.indexOf("\njobs:\n") + 7);
  const out: Record<string, string> = {};
  let name = "";
  for (const line of body.split("\n")) {
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (m) {
      name = m[1] ?? "";
      out[name] = "";
    } else if (name) out[name] += `${line}\n`;
  }
  return out;
}

describe("PIPE-02: one npm script runs the whole pipeline", () => {
  it("npm run data calls the locked uv project's run-all, with no make and no shell chain", () => {
    const data = pkg.scripts.data;
    expect(data).toBe("uv run --locked --project pipeline klopp-pipeline run-all");
    for (const s of ["data", "data:fetch", "pipeline:test"]) {
      expect(pkg.scripts[s]).not.toMatch(/\bmake\b|&&|\|\||;/);
      expect(pkg.scripts[s]).toMatch(/^uv run --locked --project pipeline /);
    }
  });

  it("the klopp-pipeline entry point exists and registers a run-all command", () => {
    expect(pyproject).toMatch(/^klopp-pipeline = "klopp_pipeline\.cli:app"$/m);
    expect(cli).toMatch(/@app\.command\("run-all"\)\s*\ndef run_all\(/);
  });

  it("pins Python 3.12 within <3.13 so socceraction resolves on Windows", () => {
    expect(pyproject).toMatch(/requires-python = ">=3\.11,<3\.13"/);
    expect(readFileSync("pipeline/.python-version", "utf8").trim()).toBe("3.12");
  });
});

describe("PIPE-03: CI enforces the bundle and repo gates", () => {
  const j = jobs(ci);

  it("the build job runs the bundle gate after building dist", () => {
    const b = j.build ?? "";
    const build = b.indexOf("vite build");
    const gate = b.indexOf("node scripts/check-bundle.ts");
    expect(build).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(build);
  });

  it("the guards job checks every tracked file and the add-only version rule", () => {
    const g = j.guards ?? "";
    expect(g).toContain("node scripts/guard-files.ts --tracked");
    expect(g).toContain("node scripts/check-immutable.ts --base");
  });

  it("the Windows smoke job builds, gates the bundle and runs the pipeline tests", () => {
    const w = j["windows-smoke"] ?? "";
    expect(w).toContain("runs-on: windows-latest");
    const order = ["npm run build", "node scripts/check-bundle.ts", "npm run pipeline:test"].map(
      (s) => w.indexOf(s),
    );
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
