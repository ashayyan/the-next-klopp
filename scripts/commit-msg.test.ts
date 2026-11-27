import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { isConventionalCommit } from "./lib/commit-msg.ts";

describe("isConventionalCommit: accepts", () => {
  it.each([
    "feat(01-02): add smoke script",
    "docs(phase-1): add validation strategy",
    "chore: add project config",
    "fix!: drop legacy flag",
    "refactor(guard)!: rename rule ids",
    "Merge branch 'x' into gsd/phase-1-setup-contracts",
    'Revert "feat: x"',
    "fixup! feat: x",
    "squash! fix: y",
  ])("%s", (msg) => {
    expect(isConventionalCommit(msg)).toBe(true);
  });

  it("ignores git template comment lines", () => {
    expect(isConventionalCommit("# Please enter a message\nfeat: add thing\n# more")).toBe(true);
  });

  it("only judges the first non-blank line", () => {
    expect(isConventionalCommit("\n\nfeat: add thing\n\nbody text without a type")).toBe(true);
  });
});

describe("isConventionalCommit: rejects", () => {
  it.each([
    ["free text", "added stuff"],
    ["capitalised type", "Feat: capitalised type"],
    ["empty subject", "feat: "],
    ["missing colon", "feat(scope) missing colon"],
    ["empty message", ""],
    ["only comments", "# comment one\n# comment two\n"],
    ["space inside scope", "feat(a b): nope"],
    ["unknown type", "wip: stuff"],
  ])("%s", (_name, msg) => {
    expect(isConventionalCommit(msg)).toBe(false);
  });
});

describe("isConventionalCommit: repo history", () => {
  it("accepts every subject in git log", () => {
    const r = spawnSync("git", ["log", "--format=%s"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    const subjects = r.stdout.split(/\r?\n/).filter((s) => s.length > 0);
    expect(subjects.length).toBeGreaterThan(0);
    const bad = subjects.filter((s) => !isConventionalCommit(s));
    expect(bad).toEqual([]);
  });
});
