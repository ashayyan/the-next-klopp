// Research approval record (RSCH-06). research/APPROVAL.md is written by an independent reviewer
// pass; this file checks its structure. Cases skip while APPROVAL.md is absent, unless
// RESEARCH_GATE=1 (then absence fails).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROLE_IDS, TRACKS } from "./lib/domains.ts";

const root = join(import.meta.dirname, "..", "..");
const gate = process.env.RESEARCH_GATE === "1";
const approvalPath = join(root, "research", "APPROVAL.md");
const present = existsSync(approvalPath);

const DELEGATION =
  "approved by Claude under learner delegation (autonomous run, 2026-11-27); learner may re-open at any time";
const LEARNER_LINE = "Learner review: pending (non-blocking)";

function readApproval(): string {
  return readFileSync(approvalPath, "utf8").replace(/\r\n/g, "\n");
}

/** Body of a `## heading` section, up to the next `## ` heading. */
function section(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return "";
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    body.push(line);
  }
  return body.join("\n");
}

/** Data rows of the first Markdown table in a section (header and separator rows dropped). */
function tableRows(body: string): string[] {
  const rows = body.split("\n").filter((l) => l.trim().startsWith("|"));
  return rows.slice(2);
}

/** The status word: "approved" or "changes requested", or null when the line is missing. */
function approvalStatus(md: string): "approved" | "changes requested" | null {
  const m = /^Status: (approved|changes requested)\b/m.exec(md);
  return m ? (m[1] as "approved" | "changes requested") : null;
}

describe("research approval record (research/APPROVAL.md)", () => {
  it.skipIf(present || !gate)("exists under npm run research:gate", () => {
    expect(present, "research/APPROVAL.md is missing").toBe(true);
  });

  describe.skipIf(!present)("structure", () => {
    it("has exactly one Status line, approved or changes requested", () => {
      const md = readApproval();
      expect(md.match(/^Status: /gm)?.length ?? 0).toBe(1);
      expect(approvalStatus(md)).not.toBeNull();
    });

    it("carries the delegation sentence when approved", () => {
      const md = readApproval();
      if (approvalStatus(md) === "approved") expect(md).toContain(DELEGATION);
    });

    it("records the learner's own review as pending and non-blocking", () => {
      expect(readApproval()).toContain(LEARNER_LINE);
    });

    it("names the reviewer as an independent pass", () => {
      expect(readApproval()).toMatch(
        /independent Opus reviewer pass; did not author the synthesis/,
      );
    });

    it("checks every brief section 7 track", () => {
      const rows = tableRows(section(readApproval(), "Checklist: brief section 7 spine"));
      for (const t of TRACKS) {
        expect(
          rows.some((r) => r.includes(t.id)),
          `no spine row for ${t.id}`,
        ).toBe(true);
      }
    });

    it("checks every brief section 7.1 role", () => {
      const rows = tableRows(section(readApproval(), "Checklist: brief section 7.1 roles"));
      for (const id of ROLE_IDS) {
        expect(
          rows.some((r) => r.includes(`\`${id}\``) || new RegExp(`\\b${id}\\b`).test(r)),
          `no role row for ${id}`,
        ).toBe(true);
      }
    });

    it("checks at least 8 brief section 8 learning-design rules", () => {
      const rows = tableRows(section(readApproval(), "Checklist: brief section 8 learning design"));
      expect(rows.length).toBeGreaterThanOrEqual(8);
    });

    it("samples at least 10 claims against their sources", () => {
      const rows = tableRows(section(readApproval(), "Source sample"));
      expect(rows.length).toBeGreaterThanOrEqual(10);
      for (const r of rows) {
        expect(r, "each sampled claim cites a source id").toMatch(/src-[a-z0-9-]+/);
        expect(r, "each sampled claim has a verdict").toMatch(
          /\b(supported|partly supported|not supported)\b/,
        );
      }
    });

    it("splits the review notes into Blocking and Non-blocking lists", () => {
      const notes = section(readApproval(), "Review notes");
      expect(notes).toMatch(/^### Blocking$/m);
      expect(notes).toMatch(/^### Non-blocking$/m);
    });

    it("has no blocking note when approved", () => {
      const md = readApproval();
      if (approvalStatus(md) !== "approved") return;
      const notes = section(md, "Review notes");
      const blocking = notes.split(/^### Non-blocking$/m)[0]?.split(/^### Blocking$/m)[1] ?? "";
      const items = blocking.split("\n").filter((l) => /^\s*[-*]\s+/.test(l));
      expect(items.map((l) => l.trim())).toEqual(["- None."]);
    });
  });
});

// Status flip. Approval covers Tracks 0-4 (Part A), except concepts whose every cited source is
// an unverified just-in-time seed: those stay draft until their research lands, and APPROVAL.md
// names each of them in its Scope section.
const conceptMapPath = join(root, "research", "concept-map.json");
const registryPath = join(root, "research", "SOURCE_REGISTRY.json");
const aliasesPath = join(root, "research", "SOURCE_ALIASES.json");
const pagePath = join(root, "research", "summary", "index.html");
const flipInputs = [conceptMapPath, registryPath, aliasesPath].every((p) => existsSync(p));
const APPROVED_TRACK = /^t0[0-4]-/;

interface MapConcept {
  id: string;
  track: string;
  sources: string[];
  status: string;
}

function loadFlipInputs(): { concepts: MapConcept[]; seedOnly: Set<string> } {
  const map = JSON.parse(readFileSync(conceptMapPath, "utf8")) as { concepts: MapConcept[] };
  const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
    id: string;
    status: string;
  }[];
  const aliases =
    (JSON.parse(readFileSync(aliasesPath, "utf8")) as { aliases?: Record<string, string> })
      .aliases ?? {};
  const status = new Map(registry.map((s) => [s.id, s.status]));
  const seedOnly = new Set(
    map.concepts
      .filter((c) => c.sources.every((s) => status.get(aliases[s] ?? s) === "unverified"))
      .map((c) => c.id),
  );
  return { concepts: map.concepts, seedOnly };
}

describe.skipIf(!present || !flipInputs)("concept status follows the approval record", () => {
  it("approves exactly the Tracks 0-4 concepts with a verified source when approved", () => {
    const md = readApproval();
    const { concepts, seedOnly } = loadFlipInputs();
    if (approvalStatus(md) !== "approved") {
      expect(concepts.filter((c) => c.status === "approved").map((c) => c.id)).toEqual([]);
      return;
    }
    for (const c of concepts) {
      const expected = APPROVED_TRACK.test(c.track) && !seedOnly.has(c.id) ? "approved" : "draft";
      expect(c.status, `${c.id} (${c.track})`).toBe(expected);
    }
  });

  it("names every held Tracks 0-4 concept in the Scope section", () => {
    const md = readApproval();
    if (approvalStatus(md) !== "approved") return;
    const scope = section(md, "Scope of the approval");
    const { concepts, seedOnly } = loadFlipInputs();
    const held = concepts.filter((c) => APPROVED_TRACK.test(c.track) && seedOnly.has(c.id));
    for (const c of held) expect(scope, `${c.id} not named as held`).toContain(`\`${c.id}\``);
  });

  it.skipIf(!existsSync(pagePath))("shows the APPROVAL.md status line on the summary page", () => {
    const line = /^Status:\s*(.+)$/m.exec(readApproval())?.[1]?.trim() ?? "";
    const text = readFileSync(pagePath, "utf8")
      .replace(/<[^>]+>/g, "")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
    expect(text).toContain(`Status: ${line}`);
  });
});
