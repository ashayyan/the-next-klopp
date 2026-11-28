// DESIGN.md structure and token-source tests (DSGN-02, DSGN-03). docs/DESIGN.md is the one human
// document the app's tokens come from: 8 `##` sections in a fixed order, exactly one `tokens`
// block naming the direction ADR 0010 picked, and src/styles/tokens.css equal to its generated CSS.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadTokens } from "./build-tokens.ts";
import {
  checkDesignHeadings,
  DESIGN_HEADINGS,
  DIRECTION_DIR,
  extractTokensBlock,
  generateSystemCss,
  parseTokens,
  SYSTEM_INPUT,
  SYSTEM_OUT,
} from "./tokens.ts";

const root = join(import.meta.dirname, "..", "..");
const read = (rel: string): string =>
  readFileSync(join(root, rel), "utf8").replaceAll("\r\n", "\n");
const design = read("docs/DESIGN.md");
const SCRIPT = join(root, "scripts", "design", "build-tokens.ts");

function pickedId(): string {
  const m = /^Picked: `([a-z-]+)`$/m.exec(read("docs/decisions/0010-visual-direction.md"));
  if (!m?.[1]) throw new Error("ADR 0010 has no 'Picked: `<id>`' line");
  return m[1];
}

/** `##` headings outside fenced code blocks, in document order. */
function level2(markdown: string): string[] {
  const out: string[] = [];
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced;
    else if (!fenced && line.startsWith("## ")) out.push(line.trimEnd());
  }
  return out;
}

describe("DESIGN.md structure", () => {
  it("is the system token input", () => {
    expect(SYSTEM_INPUT).toBe("docs/DESIGN.md");
  });

  it("lists the 8 outline headings in order", () => {
    expect(DESIGN_HEADINGS).toEqual([
      "## 1. Principles and anti-slop rules",
      "## 2. Visual direction",
      "## 3. Foundations",
      "## 4. Pitch Standard",
      "## 5. Interaction component catalogue",
      "## 6. Lesson templates",
      "## 7. Data-viz standards",
      "## 8. Quality bar",
    ]);
    expect(level2(design)).toEqual([...DESIGN_HEADINGS]);
    expect(checkDesignHeadings(design)).toEqual([]);
  });

  it("reports a swapped pair and a missing heading", () => {
    const swapped = design
      .replace("## 4. Pitch Standard", "@@FOUR@@")
      .replace("## 5. Interaction component catalogue", "## 4. Pitch Standard")
      .replace("@@FOUR@@", "## 5. Interaction component catalogue");
    const swapProblems = checkDesignHeadings(swapped);
    expect(swapProblems).toContain("out of order: ## 4. Pitch Standard");
    expect(swapProblems).toContain("out of order: ## 5. Interaction component catalogue");

    const missing = design.replace("## 7. Data-viz standards", "## 7. Charts");
    expect(checkDesignHeadings(missing)).toEqual(["missing: ## 7. Data-viz standards"]);
  });

  it("ignores headings inside fenced code", () => {
    const fenced = `${design}\n\`\`\`text\n## 2. Visual direction\n\`\`\`\n`;
    expect(checkDesignHeadings(fenced)).toEqual([]);
  });
});

describe("DESIGN.md tokens block", () => {
  const block = extractTokensBlock(design);
  const json = JSON.parse(block);

  it("holds exactly one tokens block", () => {
    expect(design.split("\n").filter((l) => l.startsWith("```tokens")).length).toBe(1);
  });

  it("names the direction ADR 0010 picked and has no $schema key", () => {
    expect(json.meta.direction).toBe(pickedId());
    expect(Object.keys(json)).not.toContain("$schema");
  });

  it("parses with the token schema", () => {
    expect(() => parseTokens(json, SYSTEM_INPUT)).not.toThrow();
  });

  it("is the picked direction's set, verbatim, while the direction file exists", () => {
    const rel = `${DIRECTION_DIR}/${pickedId()}.tokens.json`;
    if (!existsSync(join(root, rel))) return;
    expect(json).toEqual(JSON.parse(read(rel)));
  });

  it("generates src/styles/tokens.css byte for byte", () => {
    const doc = loadTokens(root, SYSTEM_INPUT);
    expect(read(SYSTEM_OUT)).toBe(generateSystemCss(doc, SYSTEM_INPUT));
  });
});

describe("build-tokens on Markdown input", () => {
  const run = (args: string[]) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: "utf8" });

  it("exits 1 and lists the heading problems when a section is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "tnk-design-"));
    const md = join(dir, "DESIGN.md");
    writeFileSync(md, design.replace("## 8. Quality bar\n", ""));
    const r = run(["--input", md, "--out", join(dir, "tokens.css")]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("missing: ## 8. Quality bar");
    expect(existsSync(join(dir, "tokens.css"))).toBe(false);
  });

  it("exits 1 when a second tokens block appears", () => {
    const dir = mkdtempSync(join(tmpdir(), "tnk-design-"));
    const md = join(dir, "DESIGN.md");
    writeFileSync(md, `${design}\n\`\`\`tokens\n{}\n\`\`\`\n`);
    const r = run(["--input", md, "--out", join(dir, "tokens.css")]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("exactly one tokens block, found 2");
  });

  it("--check exits 1 with 'tokens drift:' when tokens.css differs from the block", () => {
    const dir = mkdtempSync(join(tmpdir(), "tnk-design-"));
    const out = join(dir, "tokens.css");
    writeFileSync(
      out,
      read(SYSTEM_OUT).replace("--surface-page: #F3F5F7", "--surface-page: #F3F5F8"),
    );
    const r = run(["--input", SYSTEM_INPUT, "--out", out, "--check"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("tokens drift:");
  });
});
