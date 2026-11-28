// The generic fixture test: every folder under content/_fixtures/invalid/ is one failing lesson
// (or a set of lesson subfolders for a cross-lesson rule) plus expected.txt, the exact validator
// output lines. A new rule needs only a new folder; this file needs no edit.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INVALID_FIXTURES_DIR, loadContext, loadLesson, loadSharedInputs } from "./context.ts";
import { formatIssue, RULES, runRules } from "./rules/index.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const INVALID = join(ROOT, ...INVALID_FIXTURES_DIR.split("/"));

const folders = readdirSync(INVALID, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

/** Folder name before an optional `--<case>` suffix. */
const ruleOf = (folder: string) => folder.split("--")[0] ?? folder;

function lessonDirs(folder: string): string[] {
  const rel = `${INVALID_FIXTURES_DIR}/${folder}`;
  if (existsSync(join(INVALID, folder, "lesson.json"))) return [rel];
  return readdirSync(join(INVALID, folder), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(INVALID, folder, d.name, "lesson.json")))
    .map((d) => `${rel}/${d.name}`)
    .sort();
}

const shared = loadSharedInputs(ROOT);

describe("invalid fixtures", () => {
  it("has a folder for every rule and a rule for every folder", () => {
    const ids = new Set(RULES.map((r) => r.id));
    expect(ids.size).toBe(RULES.length);
    expect(folders.map(ruleOf).filter((r) => !ids.has(r))).toEqual([]);
    expect([...ids].filter((id) => !folders.some((f) => ruleOf(f) === id))).toEqual([]);
  });

  for (const folder of folders) {
    it(`${folder} prints exactly expected.txt`, () => {
      const lessons = lessonDirs(folder).map((dir) => loadLesson(ROOT, dir, true));
      expect(lessons.length).toBeGreaterThan(0);
      const output = runRules({ ...shared, lessons }).map(formatIssue);
      const expected = readFileSync(join(INVALID, folder, "expected.txt"), "utf8")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter((line) => line !== "");
      expect(output).toEqual(expected);
      // Each line comes from the folder's own rule: the lesson is valid in every other respect.
      expect(output.every((line) => line.includes(` ${ruleOf(folder)}: `))).toBe(true);
    });
  }
});

describe("the real tree", () => {
  it("has no problems", () => {
    expect(runRules(loadContext(ROOT)).map(formatIssue)).toEqual([]);
  });

  it("never reads a lesson from content/_fixtures/invalid/", () => {
    const dirs = loadContext(ROOT).lessons.map((l) => l.dir);
    expect(dirs.some((d) => d.startsWith(INVALID_FIXTURES_DIR))).toBe(false);
    expect(dirs).toContain("content/_fixtures/fx-a-goal-in-ten-actions");
  });
});
