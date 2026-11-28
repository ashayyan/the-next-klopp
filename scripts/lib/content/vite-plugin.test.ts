import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { LessonSpec } from "../../../src/schemas/lesson.ts";
import { discoverLessons, isLessonFile, renderModule } from "./vite-plugin.ts";

const temps: string[] = [];

afterEach(() => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/** A throwaway root with a space in its path, like the learner's project folder. */
function root(): string {
  const dir = mkdtempSync(join(tmpdir(), "tnk lessons "));
  temps.push(dir);
  return dir;
}

/** A minimal spec-v1 lesson; overrides replace top-level fields. */
function spec(overrides: Partial<LessonSpec> & Record<string, unknown> = {}): LessonSpec {
  return {
    id: "l-one",
    version: 1,
    title: "T",
    track: "t01-the-game",
    chapter: "part-a",
    concepts: ["scoring-a-goal"],
    prerequisites: [],
    durationMin: 5,
    effort: "low",
    status: "draft",
    author: "test",
    roles: [],
    competencies: [],
    template: "concept",
    steps: [{ id: "hook", stage: "hook", dataRefs: [] }],
    quiz: [],
    sources: [],
    dataRefs: [],
    ...overrides,
  } as LessonSpec;
}

function lesson(base: string, segments: string[], spec: Record<string, unknown>): void {
  const dir = join(base, ...segments);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "lesson.json"), JSON.stringify(spec));
  writeFileSync(join(dir, "lesson.mdx"), "");
}

describe("discoverLessons", () => {
  it("finds track lessons and fixtures, never content/_fixtures/invalid", () => {
    const base = root();
    lesson(base, ["content", "tracks", "t01", "part-a", "l-one"], spec({ id: "l-one" }));
    lesson(base, ["content", "_fixtures", "fx-one"], spec({ id: "fx-one" }));
    lesson(base, ["content", "_fixtures", "invalid", "no-frontmatter"], {
      id: "bad",
      status: "draft",
    });
    mkdirSync(join(base, "content", "_fixtures", "invalid"), { recursive: true });
    writeFileSync(
      join(base, "content", "_fixtures", "invalid", "lesson.json"),
      JSON.stringify({ id: "bad-top", status: "draft" }),
    );

    const found = discoverLessons(base);
    expect(found.map((l) => [l.spec.id, l.fixture, l.dir])).toEqual([
      ["l-one", false, "/content/tracks/t01/part-a/l-one"],
      ["fx-one", true, "/content/_fixtures/fx-one"],
    ]);
  });

  it("returns nothing when content/ is missing", () => {
    expect(discoverLessons(root())).toEqual([]);
  });

  it("names the file when a lesson.json is not JSON", () => {
    const base = root();
    const dir = join(base, "content", "_fixtures", "broken");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "lesson.json"), "{");
    expect(() => discoverLessons(base)).toThrow(/^\/content\/_fixtures\/broken\/lesson\.json/);
  });
});

describe("renderModule", () => {
  it("writes root-relative ids through JSON.stringify and no absolute path", () => {
    const code = renderModule([
      { spec: spec({ id: 'x"y', status: "shipped" }), fixture: false, dir: "/content/a b" },
    ]);
    expect(code).toContain('"x\\"y": () => import("/content/a b/lesson.mdx"),');
    expect(code).toContain('"fixture":false,"dir":"/content/a b"');
    expect(code).not.toMatch(/[A-Za-z]:[\\/]/);
  });

  it("emits empty exports when nothing is included", () => {
    expect(renderModule([])).toBe("export const lessons = [];\nexport const loaders = {\n\n};\n");
  });
});

describe("isLessonFile", () => {
  const base = join(tmpdir(), "tnk root");
  it.each([
    [join(base, "content", "_fixtures", "fx", "lesson.json"), true],
    [join(base, "content", "tracks", "t", "c", "l", "lesson.mdx"), true],
    [join(base, "content", "whats-new.json"), false],
    [join(base, "src", "lesson.mdx"), false],
  ])("%s -> %s", (file, expected) => {
    expect(isLessonFile(base, file)).toBe(expected);
  });
});
