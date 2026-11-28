// CLI contract of `npm run validate`: exit 0 on the real tree, 1 with the summary line when a
// lesson breaks a rule or the manifest is stale, 2 on bad arguments. Spawned with an argument
// array and shell: false, so the path with spaces needs no quoting.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const CLI = join(ROOT, "scripts", "validate-content.ts");

function run(args: string[]) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

const temps: string[] = [];
function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "tnk-validate-"));
  temps.push(dir);
  mkdirSync(join(dir, "content"), { recursive: true });
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("validate-content CLI", () => {
  it("exits 0 on the real tree with the pass summary", () => {
    const r = run([]);
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^validate-content: \d+ lessons? checked, no problems\.\n$/);
  });

  it("exits 1 with one line per break and the fail summary on a tree holding an invalid lesson", () => {
    const root = tempRoot();
    const lesson = join(root, "content", "tracks", "t01-the-game", "part-a", "broken");
    cpSync(join(ROOT, "content", "_fixtures", "invalid", "step-heading"), lesson, {
      recursive: true,
    });
    const r = run(["--root", root]);
    expect(r.status).toBe(1);
    const lines = r.stderr.trimEnd().split("\n");
    expect(lines).toContain(
      "content/tracks/t01-the-game/part-a/broken/lesson.mdx:9 step-heading: Step “see-the-line” does not start with one ## heading. Start the step with a single ## heading line.",
    );
    expect(lines).toContain(
      "content/lesson-manifest.json:1 manifest-stale: content/lesson-manifest.json is out of date. Run npm run validate -- --write, then commit it.",
    );
    expect(lines.at(-1)).toBe(
      "validate-content: 3 problems in 1 lesson. Nothing ships until they are fixed.",
    );
  });

  it("--write creates the manifest, after which a plain run passes; an edit makes it stale", () => {
    const root = tempRoot();
    cpSync(
      join(ROOT, "content", "_fixtures", "fx-a-goal-in-ten-actions"),
      join(root, "content", "_fixtures", "fx-a-goal-in-ten-actions"),
      { recursive: true },
    );
    expect(run(["--root", root, "--write"]).status).toBe(0);
    const file = join(root, "content", "lesson-manifest.json");
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.lessons[0].route).toBe("/learn/fx-a-goal-in-ten-actions");
    expect(run(["--root", root]).status).toBe(0);

    writeFileSync(file, JSON.stringify({ schemaVersion: 1, lessons: [] }));
    const stale = run(["--root", root]);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain("manifest-stale");
  });

  it("exits 2 with the usage line on an unknown flag or a missing --root value", () => {
    for (const args of [["--nope"], ["--root"]]) {
      const r = run(args);
      expect(r.status).toBe(2);
      expect(r.stderr).toContain("usage: node scripts/validate-content.ts");
    }
  });
});
