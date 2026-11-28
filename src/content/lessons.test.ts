// The typed accessors over `virtual:tnk-lessons`. Vitest runs in test mode, so the module holds
// every lesson and fixture (scripts/lib/content/select.ts).
import { describe, expect, it } from "vitest";
import {
  buildDate,
  curriculum,
  findLesson,
  lessonsInChapter,
  order,
  sourceById,
  trackById,
  whatsNew,
} from "./lessons.ts";

describe("content accessors", () => {
  it("names all 29 tracks and finds one by id", () => {
    expect(curriculum.tracks).toHaveLength(29);
    expect(trackById("t01-the-game")?.parts[0]?.chapter).toBe("part-a");
    expect(trackById("t99-none")).toBeUndefined();
  });

  it("lists the fixture lesson in its chapter and in the study order", () => {
    expect(lessonsInChapter("t01-the-game", "part-a").map((l) => l.id)).toContain(
      "fx-a-goal-in-ten-actions",
    );
    expect(order).toContain("fx-a-goal-in-ten-actions");
    expect(findLesson("fx-a-goal-in-ten-actions")?.fixture).toBe(true);
  });

  it("gives What's new and the build date", () => {
    expect(whatsNew.entries.some((e) => e.title === "The app is ready for lessons")).toBe(true);
    expect(buildDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns undefined for a source no included lesson cites", () => {
    expect(sourceById("src-not-cited")).toBeUndefined();
    expect(sourceById("constructor")).toBeUndefined();
  });
});
