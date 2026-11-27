// ADR structure and coverage test (SETUP-06). Generic over docs/decisions/*.md, so later records
// (for example 0007 branch protection) are checked automatically.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(import.meta.dirname, "..", "docs", "decisions");
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : [];

function read(file: string): string {
  return readFileSync(join(dir, file), "utf8");
}

describe("ADR structure: docs/decisions", () => {
  it("has at least one ADR", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("ADR structure: file names match NNNN-kebab-title.md", () => {
    const bad = files.filter((f) => !/^\d{4}-[a-z0-9-]+\.md$/.test(f));
    expect(bad).toEqual([]);
  });

  it("ADR structure: numbers are unique", () => {
    const numbers = files.map((f) => f.slice(0, 4));
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it.each(files)("ADR structure: %s has every section", (file) => {
    const text = read(file);
    for (const heading of [
      "## Status",
      "## Context",
      "## Decision",
      "## Consequences",
      "## Alternatives",
    ]) {
      expect(text, `${file} lacks ${heading}`).toMatch(new RegExp(`^${heading}\\s*$`, "m"));
    }
    expect(text, `${file} lacks a Reversibility line`).toMatch(
      /^Reversibility: (reversible|costly|one-way)\b/m,
    );
    expect(text, `${file} title must be "# NNNN. Title"`).toMatch(
      new RegExp(`^# ${file.slice(0, 4)}\\. \\S`, "m"),
    );
  });

  it.each(files)("ADR structure: %s status is a known value", (file) => {
    const lines = read(file).split(/\r?\n/);
    const i = lines.findIndex((l) => l.trim() === "## Status");
    const first = lines.slice(i + 1).find((l) => l.trim() !== "") ?? "";
    expect(first).toMatch(/^(Proposed|Accepted|Superseded|Deprecated)\b/);
  });
});

// Required decisions: number, then keywords that must appear in the file (case-sensitive).
const required: Array<[string, string[]]> = [
  ["0001", ["Vite", "Next.js"]],
  ["0002", ["React Router"]],
  ["0003", ["Dexie"]],
];

describe("ADR coverage", () => {
  it.each(required)("ADR %s topic", (number, keywords) => {
    const file = files.find((f) => f.startsWith(`${number}-`));
    expect(file, `ADR ${number} is missing`).toBeDefined();
    const text = read(file as string);
    for (const k of keywords) expect(text, `ADR ${number} lacks "${k}"`).toContain(k);
  });
});
