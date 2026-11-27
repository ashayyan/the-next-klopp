// CLI: node scripts/research/remember-verdicts.ts [--dry-run]
// Writes the short Phase 2 verdicts to agentmemory (rohitg00 server, REST on localhost:3111).
// Only paraphrased decisions, each at most 600 characters; never research text. Idempotent:
// a verdict is skipped only when its exact text is already stored. When the text changed since an
// earlier run (the approval verdict is built from research/APPROVAL.md), a superseding memory is
// posted instead of leaving the stale one as the only answer (see lib/verdict-sync.ts).
// The secret in ~/.agentmemory/secret is read in-process into the Authorization header only,
// exactly as scripts/verify/memory.ts does. It is never printed, logged or written.
// Standalone, dependency-free, erasable TypeScript.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { listingTruncated, storedState, textToPost } from "./lib/verdict-sync.ts";

const BASE = "http://localhost:3111/agentmemory";
const PROJECT = "the-next-klopp";
const MAX_CHARS = 600;
const root = join(import.meta.dirname, "..", "..");

interface Verdict {
  title: string;
  body: string;
  concepts: string[];
}

function approvalOutcome(): string {
  const path = join(root, "research", "APPROVAL.md");
  if (!existsSync(path)) return "no approval record yet (research/APPROVAL.md missing).";
  const md = readFileSync(path, "utf8");
  const status = /^Status:\s*(.+)$/m.exec(md)?.[1]?.trim() ?? "unknown";
  const date = /^- Review date:\s*(\S+?)\.?$/m.exec(md)?.[1] ?? "unknown date";
  const reviewer = /^- Reviewer:\s*([^;.\n]+)/m.exec(md)?.[1]?.trim() ?? "unknown reviewer";
  const delegated = /under learner delegation/i.test(md) ? " under learner delegation" : "";
  return `Status ${status}, reviewed ${date} by ${reviewer}${delegated}; the learner may re-open it. Seed-only Track 2 concepts (18 zones, 5 lanes, half-spaces, four superiorities) stay draft until domain 2 research. Phase 4 DESIGN.md may start. Record: research/APPROVAL.md.`;
}

const VERDICTS: Verdict[] = [
  {
    title: "Phase 2 verdict: Wave 1 research domains.",
    body: "Wave 1 researched ten domains: laws-of-the-game, pitch-geometry, positions-and-numbering, formations, tactics-history, how-analysts-watch, learning-science-adhd, role-definitions, pl-data-sources, interactive-explainers. Every other brief domain is just-in-time: research it at the start of the first track that needs it (list and triggers in research/GAPS.md).",
    concepts: ["research-domains", "just-in-time"],
  },
  {
    title: "Phase 2 verdict: FBref advanced stats removed.",
    body: "FBref's advanced (Opta) statistics were removed on 2026-01-20. The source registry marks them status removed; never cite FBref as a live free xG source. Compute metrics from open event data in the pipeline instead.",
    concepts: ["fbref", "data-sources"],
  },
  {
    title: "Phase 2 verdict: Laws of the Game edition.",
    body: "Lessons use the IFAB Laws of the Game 2026/27, effective 1 July 2026. The Premier League adopts only a subset of the 2026/27 options (for example the five-second throw-in and goal-kick countdowns, but no VAR review of wrongly awarded corners); show the PL variant wherever it differs.",
    concepts: ["laws-of-the-game", "ifab"],
  },
  {
    title: "Phase 2 verdict: Watch Gym L1 clip supply (ADR 0008).",
    body: "Watch Gym Level 1 clips: open-data reconstructions first, the learner's local files second, YouTube link-out only (no embed overlay, no download). Every clip spec needs a reconstruction fallback and states its dataset and league; non-PL data never uses PL wording.",
    concepts: ["watch-gym", "adr-0008"],
  },
  {
    title: "Phase 2 verdict: data shipping policy.",
    body: "Only CC BY data ships in the Vercel bundle (Wyscout PL 2017/18 events, DFL/Sportec), each with credit and a licence link. StatsBomb-derived and Last Row artifacts stay in the local study build only, with StatsBomb logo credit, and a deploy deny-manifest blocks them. Metrica and SkillCorner stay local until their licence is settled.",
    concepts: ["licensing", "deploy"],
  },
  {
    title: "Phase 2 verdict: transfermarkt-datasets paused.",
    body: "transfermarkt-datasets updates are paused; the data is current only to 2026-07-06. Its CC0 licence does not clear the Transfermarkt site terms, so keep it local only and type valuations by hand with a link and an as-of date.",
    concepts: ["transfermarkt", "data-sources"],
  },
  {
    title: "Phase 2 verdict: research approval (RSCH-06).",
    body: approvalOutcome(),
    concepts: ["rsch-06", "approval"],
  },
];

function contentOf(v: Verdict): string {
  return `${v.title} ${v.body}`;
}

for (const v of VERDICTS) {
  const n = contentOf(v).length;
  if (n > MAX_CHARS) {
    console.error(`remember-verdicts: "${v.title}" is ${n} characters (limit ${MAX_CHARS})`);
    process.exit(1);
  }
}

const dryRun = process.argv.includes("--dry-run");
if (dryRun) {
  for (const v of VERDICTS)
    console.log(`would remember: ${v.title} (${contentOf(v).length} chars)`);
  console.log(`remember-verdicts: dry run, ${VERDICTS.length} verdicts, nothing written`);
  process.exit(0);
}

const headers: Record<string, string> = { "Content-Type": "application/json" };
const secretFile = join(homedir(), ".agentmemory", "secret");
if (existsSync(secretFile)) {
  const secret = readFileSync(secretFile, "utf8").trim();
  if (secret.length > 0) headers.Authorization = `Bearer ${secret}`;
}

function fail(message: string): never {
  console.error(`remember-verdicts: FAIL - ${message}`);
  process.exit(1);
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, signal: AbortSignal.timeout(15000) });
  } catch {
    fail(`agentmemory is not reachable at ${BASE}`);
  }
  if (!res.ok) fail(`${init.method ?? "GET"} ${path} returned HTTP ${res.status}`);
  return res.json();
}

const listed = (await request(`/memories?project=${PROJECT}`, { method: "GET" })) as {
  memories?: { content?: string }[];
} & Record<string, unknown>;
const existing = (listed.memories ?? []).map((m) => m.content ?? "");
if (listingTruncated(listed, existing.length)) {
  fail(
    `the memory list for ${PROJECT} is truncated (${existing.length} returned); refusing to post duplicates`,
  );
}

let written = 0;
let superseded = 0;
for (const v of VERDICTS) {
  const state = storedState(existing, v.title, contentOf(v));
  if (state === "current") {
    console.log(`already stored: ${v.title}`);
    continue;
  }
  const content = textToPost(state, contentOf(v));
  if (content.length > MAX_CHARS) {
    fail(`"${v.title}" is ${content.length} characters with the supersede prefix`);
  }
  await request("/remember", {
    method: "POST",
    body: JSON.stringify({
      content,
      concepts: [PROJECT, "phase-2", ...v.concepts],
      project: PROJECT,
    }),
  });
  written += 1;
  if (state === "stale") superseded += 1;
  console.log(`${state === "stale" ? "superseded" : "remembered"}: ${v.title}`);
}
console.log(
  `remember-verdicts: ok (${written} written, ${superseded} of them superseding, ${VERDICTS.length - written} already stored)`,
);
