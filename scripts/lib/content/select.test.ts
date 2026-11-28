import { describe, expect, it } from "vitest";
import { type SelectMode, selectLessons } from "./select.ts";

const lesson = (id: string, status: string, fixture = false) => ({
  spec: { id, status },
  fixture,
});

const ALL = [
  lesson("draft", "draft"),
  lesson("review", "review"),
  lesson("shippable", "shippable"),
  lesson("shipped", "shipped"),
  lesson("fx-draft", "draft", true),
  lesson("fx-shipped", "shipped", true),
];

const ids = (mode: SelectMode) => selectLessons(ALL, mode).map((l) => l.spec.id);

describe("selectLessons", () => {
  it("returns every lesson and fixture under vitest", () => {
    expect(ids({ command: "serve", includeFixtures: false, test: true })).toEqual(
      ALL.map((l) => l.spec.id),
    );
    expect(ids({ command: "build", includeFixtures: false, test: true })).toHaveLength(ALL.length);
  });

  it("serves every status in dev and no fixture without the flag", () => {
    expect(ids({ command: "serve", includeFixtures: false, test: false })).toEqual([
      "draft",
      "review",
      "shippable",
      "shipped",
    ]);
  });

  it("adds the fixtures to dev with the flag", () => {
    expect(ids({ command: "serve", includeFixtures: true, test: false })).toEqual([
      "draft",
      "review",
      "shippable",
      "shipped",
      "fx-draft",
      "fx-shipped",
    ]);
  });

  it("builds shipped and shippable lessons plus fixtures with the flag, leaving drafts out", () => {
    expect(ids({ command: "build", includeFixtures: true, test: false })).toEqual([
      "shippable",
      "shipped",
      "fx-draft",
      "fx-shipped",
    ]);
  });

  it("builds shipped lessons only without the flag, never a fixture", () => {
    expect(ids({ command: "build", includeFixtures: false, test: false })).toEqual(["shipped"]);
  });

  it("does not mutate its input", () => {
    const copy = structuredClone(ALL);
    selectLessons(ALL, { command: "build", includeFixtures: false, test: false });
    expect(ALL).toEqual(copy);
  });
});
