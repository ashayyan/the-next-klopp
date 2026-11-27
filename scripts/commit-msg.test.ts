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

function git(args: string[]) {
  return spawnSync("git", args, { encoding: "utf8" });
}

// Only commits on this branch that are not on main are judged. Judging all of history would fail
// forever on any one non-conforming historical subject (a UI edit, a bot commit), and history
// cannot be rewritten. A shallow clone or a missing base ref cannot answer the question, so the
// check is skipped there instead of silently testing something different.
function branchSubjects(): string[] | null {
  if (git(["rev-parse", "--is-shallow-repository"]).stdout.trim() === "true") return null;
  for (const base of ["origin/main", "main"]) {
    if (git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]).status !== 0) continue;
    const r = git(["log", "--format=%s", `${base}..HEAD`]);
    if (r.status === 0) return r.stdout.split(/\r?\n/).filter((line) => line.length > 0);
  }
  return null;
}

describe("isConventionalCommit: branch history", () => {
  const subjects = branchSubjects();
  it.skipIf(subjects === null)("accepts every subject on this branch since main", () => {
    const bad = (subjects ?? []).filter((subject) => !isConventionalCommit(subject));
    expect(bad).toEqual([]);
  });
});
