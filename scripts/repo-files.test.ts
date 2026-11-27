// Contract tests for .gitignore, .gitattributes and .env.example, asked of git itself.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function isIgnored(path: string): boolean {
  const r = spawnSync("git", ["check-ignore", "-q", path]);
  if (r.status !== 0 && r.status !== 1) {
    throw new Error(`git check-ignore failed for ${path}: status ${r.status}`);
  }
  return r.status === 0;
}

describe("gitignore contract (git check-ignore)", () => {
  it.each([
    "raw/x.csv",
    "pipeline/data/raw/a.json",
    "data/raw/b.json",
    ".env",
    ".env.local",
    "feedback/n.jsonl",
    "public/pyodide/p.js",
    "x.parquet",
    ".claude/skills/a/SKILL.md",
    "THE_NEXT_KLOPP_MASTER_PROMPT 1.md",
  ])("ignores %s", (p) => {
    expect(isIgnored(p)).toBe(true);
  });

  it.each([".env.example", "public/data/pl-2024/a.parquet", ".claude/CLAUDE.md", "src/main.tsx"])(
    "does not ignore %s",
    (p) => {
      expect(isIgnored(p)).toBe(false);
    },
  );
});

describe("repo file contents", () => {
  it(".gitattributes normalises line endings to LF", () => {
    const text = readFileSync(".gitattributes", "utf8");
    expect(text.split(/\r?\n/)).toContain("* text=auto eol=lf");
  });

  it(".env.example holds only empty KEY= placeholders", () => {
    const lines = readFileSync(".env.example", "utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l).toMatch(/^[A-Z][A-Z0-9_]*=$/);
  });
});
