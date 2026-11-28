import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

// ---------------------------------------------------------------- workflow static checks (T-04-29 to T-04-32)

const CI = readFileSync(".github/workflows/ci.yml", "utf8");
const UPDATE = readFileSync(".github/workflows/update-snapshots.yml", "utf8");
const PLAYWRIGHT_VERSION = (
  JSON.parse(readFileSync("package.json", "utf8")) as { devDependencies: Record<string, string> }
).devDependencies["@playwright/test"];
// Built from two parts so this file holds no template placeholder text.
const EXPRESSION_OPEN = "$" + "{{";
const IMAGE = `mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble`;

/** The text of every `run:` step of a workflow file, single-line or block. */
function runScripts(yaml: string): string[] {
  const lines = yaml.split("\n");
  const scripts: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^(\s*)(?:- )?run:\s*(.*)$/.exec(lines[i] ?? "");
    if (!match) continue;
    const indent = (match[1] ?? "").length;
    const rest = match[2] ?? "";
    if (rest !== "|" && rest !== ">") {
      scripts.push(rest);
      continue;
    }
    const body: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j] ?? "";
      if (line.trim() !== "" && line.length - line.trimStart().length <= indent) break;
      body.push(line);
    }
    scripts.push(body.join("\n"));
  }
  return scripts;
}

/** Counts a literal in a text (a regex-free count, so the needle needs no escaping). */
function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe("update-snapshots workflow", () => {
  it("runs only by workflow_dispatch", () => {
    const on = /^on:\n((?:[ \t]+.*\n|\n)*)/m.exec(UPDATE)?.[1] ?? "";
    expect(on.trim()).toBe("workflow_dispatch:");
    expect(UPDATE).not.toContain("pull_request");
    expect(UPDATE).not.toContain("push:");
  });

  it("has exactly the permissions contents: write and actions: write, only on the commit job", () => {
    const writes = [...UPDATE.matchAll(/^\s+([a-z-]+): write$/gm)].map((m) => m[1]).sort();
    expect(writes).toEqual(["actions", "contents"]);
    expect(UPDATE).toMatch(/^permissions:\n {2}contents: read$/m);
    const commitStart = UPDATE.indexOf("\n  commit:");
    const generateStart = UPDATE.indexOf("\n  generate:");
    expect(commitStart).toBeGreaterThan(generateStart);
    expect(UPDATE.slice(commitStart)).toContain("contents: write");
    expect(UPDATE.slice(commitStart)).toContain("actions: write");
    expect(UPDATE.slice(generateStart, commitStart)).not.toContain("write");
  });

  it("refuses main and tags, uses the pinned image and writes baselines only with CI and UPDATE_BASELINES", () => {
    expect(
      occurrences(
        UPDATE,
        "if: startsWith(github.ref, 'refs/heads/') && github.ref != 'refs/heads/main'",
      ),
    ).toBe(2);
    expect(UPDATE).toContain(`image: ${IMAGE}`);
    expect(UPDATE).toContain('CI: "true"');
    expect(UPDATE).toContain('UPDATE_BASELINES: "1"');
    expect(UPDATE).toContain("npx playwright test --project=visual");
  });

  it("stages only the Linux baselines, pushes to the branch and dispatches ci", () => {
    expect(UPDATE).toContain("git add tests/visual/__baselines__/*-linux.png");
    expect(occurrences(UPDATE, "git add ")).toBe(1);
    expect(UPDATE).toContain('git push origin "HEAD:refs/heads/$BRANCH"');
    expect(UPDATE).toContain('gh workflow run ci --ref "$BRANCH"');
    expect(UPDATE).toContain(`BRANCH: ${EXPRESSION_OPEN} github.ref_name }}`);
  });

  it("queues two dispatches on one branch instead of racing them", () => {
    expect(UPDATE).toContain(`group: update-snapshots-${EXPRESSION_OPEN} github.ref }}`);
    expect(UPDATE).toContain("cancel-in-progress: false");
  });
});

describe("workflow files", () => {
  it("never put a GitHub expression inside a run: script", () => {
    for (const [name, yaml] of [
      ["ci.yml", CI],
      ["update-snapshots.yml", UPDATE],
    ] as const) {
      const scripts = runScripts(yaml);
      expect(scripts.length, `${name} has run steps`).toBeGreaterThan(0);
      for (const script of scripts)
        expect(script, `${name}: ${script}`).not.toContain(EXPRESSION_OPEN);
    }
  });

  it("pin every action by commit SHA", () => {
    for (const yaml of [CI, UPDATE]) {
      for (const match of yaml.matchAll(/^\s*-?\s*uses: (\S+)/gm)) {
        const ref = match[1] ?? "";
        if (ref.startsWith("./")) continue;
        expect(ref, ref).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });

  it("run the visual job of ci.yml in the image whose tag equals the @playwright/test pin", () => {
    expect(PLAYWRIGHT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    // The visual job and the required build job (which runs the lesson walker) carry the image.
    expect(occurrences(CI, IMAGE)).toBe(2);
    const buildJob = CI.slice(CI.indexOf("\n  build:"), CI.indexOf("\n  guards:"));
    expect(buildJob).toContain(`image: ${IMAGE}`);
    const visualJob = CI.slice(CI.indexOf("\n  visual:"));
    expect(visualJob).toContain(`image: ${IMAGE}`);
    expect(visualJob).toContain("--project=functional");
    expect(visualJob).toContain("--project=visual");
  });

  it("keep ci.yml read-only", () => {
    expect(CI).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(CI).not.toMatch(/: write$/m);
    expect(CI).not.toContain("pull_request_target");
  });
});
