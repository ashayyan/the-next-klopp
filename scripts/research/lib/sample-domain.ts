// Test helper: a minimal domain folder that satisfies every shared rule, plus temp-folder writers.
// Tests make one change to the valid sample to prove that exactly one rule rejects it.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SourceEntry } from "./research-files.ts";

export interface SampleFiles {
  findings: string;
  sources: SourceEntry[];
  visual: string;
}

const permission = (value: string, note: string) => ({ value, note });

export function sampleSource(id: string, url: string): SourceEntry {
  return {
    id,
    title: `Sample source ${id}`,
    url,
    type: "website",
    publisher: "Sample Publisher",
    free: true,
    license: {
      read: permission("yes", "Public page"),
      automated_access: permission("yes", "No robots restriction seen"),
      redistribute: permission("no", "All rights reserved"),
      derivative: permission("conditional", "Paraphrase with credit"),
    },
    quality: 3,
    recency: "2026-01-01",
    as_of: "2026-11-27",
    best_for: ["testing"],
    notes: "Synthetic source for the gate tests.",
    status: "active",
  } as SourceEntry;
}

/** A domain that passes every shared rule. Cites the seed excerpt src-ifab-laws-2026-27#effective-date. */
export function sampleFiles(): SampleFiles {
  const toy = "src-sample-toy";
  const ifab = "src-ifab-laws-2026-27";
  return {
    findings: [
      "# Sample domain",
      "",
      "## Key concepts",
      `- The 2026/27 edition of the Laws applies from 1 July 2026 [${ifab}#effective-date].`,
      `- A toy idea is described by one sample source [${toy}].`,
      "",
      "## Must teach",
      `- Teach the idea in one visual step [${toy}].`,
      "",
      "## Misconceptions",
      `- Learners often assume the sample is real [${toy}].`,
      "",
      "## Contested points",
      `Contested: one view says the toy idea works [${toy}], another view says it does not [${ifab}].`,
      "",
      "## Open questions",
      "- Nothing else is known yet.",
      "",
    ].join("\n"),
    sources: [sampleSource("src-sample-toy", "https://example.org/sample-toy")],
    visual: [
      "# Visual ideas",
      "",
      "## Idea one",
      "A pitch with two moving dots.",
      "",
      "## Idea two",
      "A slider that changes a line.",
      "",
      "## Idea three",
      "A before and after toggle.",
      "",
    ].join("\n"),
  };
}

/** Writes the three files of a domain folder under `<root>/research/<slug>/`. */
export function writeDomain(
  root: string,
  slug: string,
  files: { findings?: string; sources?: unknown; visual?: string },
): void {
  const dir = join(root, "research", slug);
  mkdirSync(dir, { recursive: true });
  if (files.findings !== undefined) writeFileSync(join(dir, "findings.md"), files.findings);
  if (files.sources !== undefined) {
    writeFileSync(join(dir, "sources.json"), `${JSON.stringify(files.sources, null, 2)}\n`);
  }
  if (files.visual !== undefined) writeFileSync(join(dir, "visual_ideas.md"), files.visual);
}

/** A fresh temp repo root holding research/seed-sources.json. */
export function makeTempRoot(seed: SourceEntry[]): string {
  const root = mkdtempSync(join(tmpdir(), "klopp-research-"));
  mkdirSync(join(root, "research"), { recursive: true });
  writeFileSync(join(root, "research", "seed-sources.json"), `${JSON.stringify(seed, null, 2)}\n`);
  return root;
}
