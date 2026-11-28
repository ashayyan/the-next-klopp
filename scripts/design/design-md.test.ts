// DESIGN.md structure and token-source tests (DSGN-02, DSGN-03). docs/DESIGN.md is the one human
// document the app's tokens come from: 8 `##` sections in a fixed order, exactly one `tokens`
// block naming the direction ADR 0010 picked, and src/styles/tokens.css equal to its generated CSS.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GLYPH_IDS } from "../../src/pitch/glyphs/registry.ts";
import { CHECKS } from "../review/lib.ts";
import { TASTE_IGNORE_REASON, TASTE_IGNORED } from "../review/taste.ts";
import { loadTokens } from "./build-tokens.ts";
import { checkPalette, renderMarkdown } from "./check-palette.ts";
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

describe("DESIGN.md sections 2 and 3", () => {
  const START = "<!-- palette:start -->\n";
  const END = "<!-- palette:end -->";

  it("embeds the check-palette --markdown output between the palette markers", () => {
    expect(design.split(START).length - 1).toBe(1);
    expect(design.split(END).length - 1).toBe(1);
    const embedded = design.slice(design.indexOf(START) + START.length, design.indexOf(END));
    const doc = parseTokens(JSON.parse(extractTokensBlock(design)), SYSTEM_INPUT);
    expect(embedded).toBe(renderMarkdown(checkPalette(doc)));
  });

  it("passes the palette gate in both themes", () => {
    const results = checkPalette(loadTokens(root, SYSTEM_INPUT));
    expect(results.map((r) => r.theme).sort()).toEqual(["dark", "light"]);
    for (const r of results) expect(r.checks.filter((c) => !c.pass)).toEqual([]);
  });

  it("section 2 names the pick, links ADR 0010 and carries the override note", () => {
    const s2 = design.slice(
      design.indexOf("## 2. Visual direction"),
      design.indexOf("## 3. Foundations"),
    );
    expect(s2).toContain("decisions/0010-visual-direction.md");
    expect(s2).toContain(
      "picked by Claude under learner delegation; the learner may override by asking",
    );
    for (const total of ["81.25", "73.75"]) expect(s2).toContain(total);
  });

  it("section 3 has the subsections 3.1 to 3.7 in order", () => {
    const subs = design
      .split("\n")
      .filter((l) => /^### 3\.\d /.test(l))
      .map((l) => l.trim());
    expect(subs).toEqual([
      "### 3.1 Colour",
      "### 3.2 Typography",
      "### 3.3 Spacing and grid",
      "### 3.4 Radius and elevation",
      "### 3.5 Iconography",
      "### 3.6 Motion language",
      "### 3.7 Tokens",
    ]);
  });

  it("every hex value the prose quotes for a role exists in the tokens block", () => {
    const s3 = design.slice(design.indexOf("## 3. Foundations"), design.indexOf("### 3.7 Tokens"));
    const block = extractTokensBlock(design).toUpperCase();
    const quoted = new Set([...s3.matchAll(/`(#[0-9A-F]{6}(?:[0-9A-F]{2})?)`/g)].map((m) => m[1]));
    expect(quoted.size).toBeGreaterThan(40);
    for (const hex of quoted) expect(block).toContain(`"${hex}"`);
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

// ---------------------------------------------------------------------------------------------
// Coverage locks (04-12): the catalogue against brief section 9.5, the gallery ids, and later the
// templates and the review registry.

/** Text of one `##` section, from its heading to the next `##` heading. */
function section(n: number): string {
  const heading = DESIGN_HEADINGS[n - 1] as string;
  const start = design.indexOf(`${heading}\n`);
  const next = DESIGN_HEADINGS[n];
  const end = next === undefined ? design.length : design.indexOf(`${next}\n`);
  return design.slice(start, end);
}

/** Text under a heading line, up to the next heading of the same or a higher level. */
function under(text: string, headingLine: string): string | null {
  const lines = text.split("\n");
  const at = lines.indexOf(headingLine);
  if (at < 0) return null;
  const level = (/^#+/.exec(headingLine)?.[0] ?? "").length;
  const out: string[] = [];
  for (const line of lines.slice(at + 1)) {
    const m = /^(#+) /.exec(line);
    if (m && (m[1] as string).length <= level) break;
    out.push(line);
  }
  return out.join("\n");
}

/** Every bold component name of brief section 9.5, in the brief's order, exactly as written. */
const CATALOGUE = [
  "Tactics Board",
  "Phase Animator",
  "Zone Explorer",
  "Shape Comparator",
  "Pressing Trigger Trainer",
  "Event Inspector",
  "Shot Map and xG Playground",
  "xT Grid Lab",
  "Pitch Control Live",
  "Pass Network Builder",
  "Radar/Pizza Builder",
  "Metric Noise Lab",
  "Role Signature Explorer",
  "Role KPI Explorer",
  "Stat Lie Detector",
  "Player vs Player Court",
  "Signal vs Noise Meter",
  "Squad Planner",
  "Scouting Report Builder",
  "Transfer Deal Builder",
  'Player Price Lab ("set the number")',
  "Sell-or-Keep Simulator",
  "Wage Structure Builder",
  "Negotiation Simulator",
  "Regulation Navigator",
  "Session Designer",
  "Load Monitor",
  "Decision Simulator",
  "Concept Map",
  "Python Cell",
  "Video Note Player",
  "Watch Gym Player",
  "Live Watch Notebook",
  "Report Writer",
  "Speak-It Coach",
  "Player Scout Card",
  "Role Map and Readiness Meter",
  "Matchday Command Centre (head coach)",
  "Microcycle Planner",
  "Team Talk and Press Conference Simulator",
  "Analysis Department Workflow Board",
  "ML Model Lab",
  "Computer Vision Demo",
  "AI Scout Assistant Lab",
  "Data Department Builder",
  "Org Chart and Budget Builder (sporting director)",
  "Coach Hiring Lab",
  "Academy Pathway Planner",
  "Club P&L Dashboard (CEO)",
  "Quiz / Flashcards / Spaced-Repetition Review",
] as const;

const FIELDS = [
  "Purpose",
  "Inputs and controls",
  "Learning goal",
  "States",
  "Data needed",
  "Accessibility fallback",
] as const;

/** The 37 primitive ids of the 04-UI-SPEC `/dev/gallery` table. */
const GALLERY_IDS = [
  "colour",
  "type",
  "space-radius",
  "icons",
  "motion",
  "button",
  "link",
  "input",
  "select",
  "checkbox-radio-switch",
  "segmented",
  "slider",
  "tabs",
  "dialog",
  "alert-dialog",
  "popover",
  "tooltip",
  "toast",
  "shell-bar",
  "step-rail",
  "focus-toggle",
  "confusion-button",
  "glossary-card",
  "quiz-option",
  "progress-ring",
  "badge",
  "surface",
  "stat-card",
  "chart-primitives",
  "data-table",
  "scales",
  "pitch",
  "glyphs",
  "legend",
  "playback",
  "drag",
  "converter-probe",
] as const;

describe("section 5: interaction component catalogue", () => {
  const s5 = section(5);

  it("holds the 50 brief components, once each, in brief order", () => {
    expect(CATALOGUE).toHaveLength(50);
    const headings = s5
      .split("\n")
      .filter((l) => l.startsWith("#### "))
      .map((l) => l.slice(5));
    expect(headings).toEqual([...CATALOGUE]);
  });

  for (const name of CATALOGUE) {
    it(`${name}: has the six fields, each with text`, () => {
      const body = under(s5, `#### ${name}`);
      expect(body, `missing #### ${name}`).not.toBeNull();
      for (const field of FIELDS) {
        const line = (body as string).split("\n").find((l) => l.startsWith(`- **${field}**: `));
        expect(line, `${name}: missing **${field}**`).toBeDefined();
        expect((line as string).slice(`- **${field}**: `.length).trim().length).toBeGreaterThan(10);
      }
    });
  }

  it("lists every gallery primitive id with its /dev/gallery link before the components", () => {
    const prim = under(s5, "### Primitives");
    expect(prim).not.toBeNull();
    for (const id of GALLERY_IDS) expect(prim).toContain(`/dev/gallery/${id})`);
    expect(s5.indexOf("### Primitives")).toBeLessThan(s5.indexOf("### Interaction components"));
  });
});

/** The banned-pattern checks of the review registry: every `banned-*` id plus the slop and token checks. */
const BANNED_IDS = [
  ...CHECKS.filter((c) => c.id.startsWith("banned-")).map((c) => c.id),
  "card-grid",
  "arrow-suffix",
  "no-hex-in-source",
  "token-colours",
];

describe("section 1: principles and anti-slop rules", () => {
  const s1 = section(1);

  it("has a Do list, a Don't list and the voice rules", () => {
    for (const h of ["### Do", "### Don't", "### Voice"]) expect(s1.split("\n")).toContain(h);
  });

  it("names the review check of every banned pattern in the Don't list", () => {
    const dont = under(s1, "### Don't") as string;
    expect(BANNED_IDS.length).toBeGreaterThanOrEqual(9);
    for (const id of BANNED_IDS) expect(dont).toContain(`\`${id}\``);
  });
});

describe("section 4: Pitch Standard", () => {
  const s4 = section(4);

  it("has one registry table row per glyph id, in registry order", () => {
    const rows = s4
      .split("\n")
      .map((l) => /^\| `([a-z-]+)` \|/.exec(l)?.[1])
      .filter((id): id is string => id !== undefined);
    expect(rows).toEqual([...GLYPH_IDS]);
  });

  it("states the disc sizing, legend and placement rules and links ADR 0009", () => {
    expect(s4).toContain("clamp(22px, 2.0 m, 28px)");
    expect(s4).toContain("decisions/0009-pitch-layer-api.md");
    expect(s4).toContain("`legend-present`");
    expect(s4).toContain("disc radius plus 8 px");
    expect(s4).toContain("inside the SVG");
  });
});

describe("section 7: data-viz standards", () => {
  const s7 = section(7);

  it("covers form, colour by job, axes, annotation, uncertainty, hover and table view", () => {
    for (const h of [
      "### Form choice",
      "### Colour by job",
      "### Axes and labels",
      "### Annotation",
      "### Uncertainty",
      "### Hover layer and table view",
    ]) {
      expect(s7.split("\n")).toContain(h);
    }
    expect(s7).toContain("One axis per chart");
    expect(s7).toContain("Bars start at zero");
    expect(s7).toContain("at most two marks");
    expect(s7).toContain('"n ="');
  });
});

const TEMPLATES = [
  "Concept",
  "Simulation",
  "Data lab",
  "Case study (scrollytelling)",
  "Regulation",
  "Review",
  "Capstone",
] as const;

/** `/^hero-.+$/` is written `hero-*` in DESIGN.md. */
function displayPattern(re: RegExp): string {
  return re.source
    .replace(/^\^/, "")
    .replace(/\$$/, "")
    .replace(/\.[+*]$/, "*");
}

describe("section 6: lesson templates", () => {
  const s6 = section(6);

  it("has the seven templates in order, each with 375, 768 and 1440 and the step it hosts", () => {
    const heads = s6
      .split("\n")
      .filter((l) => l.startsWith("### "))
      .map((l) => l.slice(4));
    expect(heads).toEqual([...TEMPLATES]);
    for (const t of TEMPLATES) {
      const body = under(s6, `### ${t}`) as string;
      for (const w of ["375", "768", "1440"]) expect(body, `${t} at ${w}`).toContain(`**${w}:**`);
      expect(body, `${t} hosts`).toContain("**Hosts:**");
    }
  });

  it("cites the picked direction's two screens as the concept and data-lab references", () => {
    expect(under(s6, "### Concept")).toContain(`/dev/directions/${pickedId()}/tactics`);
    expect(under(s6, "### Data lab")).toContain(`/dev/directions/${pickedId()}/data`);
  });

  it("dates regulations, caps the review queue and keeps scrolling free of motion", () => {
    expect(under(s6, "### Regulation")).toMatch(/Effective from .* As of /);
    expect(under(s6, "### Review")).toContain("no backlog count");
    expect(under(s6, "### Case study (scrollytelling)")).toContain("No scroll-triggered motion");
  });
});

describe("section 8: quality bar, locked to the review registry", () => {
  const s8 = section(8);

  it("lists every CHECKS id once with its severity", () => {
    const rows = new Map<string, string>();
    for (const line of s8.split("\n")) {
      const m = /^\| `([a-z-]+)` \| (fail|warn) \|/.exec(line);
      if (m) {
        expect(rows.has(m[1] as string), `duplicate row ${m[1]}`).toBe(false);
        rows.set(m[1] as string, m[2] as string);
      }
    }
    expect(rows.size).toBe(CHECKS.length);
    for (const c of CHECKS) expect(rows.get(c.id), c.id).toBe(c.severity);
  });

  it("lists every TASTE_IGNORED pattern with its reason, and the FAIL ids", () => {
    expect(TASTE_IGNORE_REASON).toBe("landing-page rule, not an app-screen rule");
    const lines = s8.split("\n");
    for (const re of TASTE_IGNORED) {
      const shown = `| \`${displayPattern(re)}\` | ${TASTE_IGNORE_REASON} |`;
      expect(lines, shown).toContain(shown);
    }
    expect(s8).toContain("`overflow-x` and `spill`");
    expect(s8).toContain("Primary theme only");
    expect(s8).toContain("Local only");
  });

  it("states the exit codes, the budget, the baseline rule and the environment variables", () => {
    for (const code of ["`0` pass", "`1` at least one FAIL", "`2` the review could not run"]) {
      expect(s8).toContain(code);
    }
    for (const budget of ["200 KB", "180 KB gzip", "CLS below 0.1", "60 fps"]) {
      expect(s8).toContain(budget);
    }
    expect(s8).toContain("`@visual`");
    expect(s8).toContain("v1.65.1-noble");
    for (const env of [
      "REVIEW_PORT",
      "REVIEW_CHANNEL",
      "REVIEW_START_TIMEOUT_MS",
      "CHROME_PATH",
      "UPDATE_BASELINES",
    ]) {
      expect(s8).toContain(`| \`${env}\` |`);
    }
    expect(s8).toContain("`reviewer` block");
  });
});

describe("DESIGN.md is complete", () => {
  it("has at least 80 words under every one of the 8 headings", () => {
    for (let n = 1; n <= 8; n += 1) {
      const body = section(n).split("\n").slice(1).join(" ");
      const words = body.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
      expect(words, DESIGN_HEADINGS[n - 1]).toBeGreaterThanOrEqual(80);
    }
  });

  it("no longer holds a one-sentence 'This section covers' stub on its own", () => {
    for (let n = 1; n <= 8; n += 1) {
      const paragraphs = section(n)
        .split("\n\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && !p.startsWith("## "));
      expect(paragraphs.length, DESIGN_HEADINGS[n - 1]).toBeGreaterThan(1);
    }
  });
});
