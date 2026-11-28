import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// DSGN-04 / T-04-30: visual baselines are Linux CI artefacts. Playwright names a baseline by platform
// (`snapshotPathTemplate` in playwright.config.ts), so a Windows or macOS run would write `-win32` or
// `-darwin` files; none may ever be tracked, and the baselines folder holds `*-linux.png` only.

const BASELINES = "tests/visual/__baselines__/";

/** The offending paths, with a reason each; an empty list means the tracked files are acceptable. */
function checkBaselineFiles(paths: readonly string[]): string[] {
  const problems: string[] = [];
  for (const path of paths) {
    const norm = path.replaceAll("\\", "/");
    if (/-(win32|darwin)\.png$/.test(norm)) {
      problems.push(`${norm}: a non-Linux baseline must never be tracked`);
    } else if (norm.startsWith(BASELINES) && !norm.endsWith("-linux.png")) {
      problems.push(`${norm}: only *-linux.png files may live under ${BASELINES}`);
    }
  }
  return problems;
}

function trackedFiles(): string[] {
  const result = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
  return result.stdout.split("\0").filter(Boolean);
}

describe("baseline platform guard", () => {
  it("passes on the tracked files", () => {
    expect(checkBaselineFiles(trackedFiles())).toEqual([]);
  });

  it("rejects a win32 baseline in the baselines folder", () => {
    const problems = checkBaselineFiles([`${BASELINES}button-dark-375-win32.png`]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("non-Linux");
  });

  it("rejects a darwin png anywhere", () => {
    expect(checkBaselineFiles(["docs/x-darwin.png"])).toHaveLength(1);
  });

  it("rejects any other file under the baselines folder", () => {
    expect(checkBaselineFiles([`${BASELINES}notes.txt`])).toHaveLength(1);
    expect(checkBaselineFiles([`${BASELINES}button-dark-375.png`])).toHaveLength(1);
  });

  it("accepts a linux baseline and ordinary files", () => {
    expect(
      checkBaselineFiles([
        `${BASELINES}button-dark-375-linux.png`,
        "src/ui/Button.tsx",
        "tests/visual/gallery.visual.spec.ts",
      ]),
    ).toEqual([]);
  });

  it("reads Windows-style separators", () => {
    expect(checkBaselineFiles(["tests\\visual\\__baselines__\\a-win32.png"])).toHaveLength(1);
  });
});
