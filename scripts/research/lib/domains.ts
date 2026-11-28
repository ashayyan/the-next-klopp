// Phase 2 research metadata. Erasable TypeScript only (no enums, namespaces or parameter
// properties) so `node file.ts` native type stripping can run it.
import type { DomainContext, Violation } from "./research-files.ts";

/** The ten Wave 1 research domains. Folder slugs under research/. Order is the CONTEXT order. */
export const DOMAIN_SLUGS: readonly string[] = [
  "laws-of-the-game",
  "pitch-geometry",
  "positions-and-numbering",
  "formations",
  "tactics-history",
  "how-analysts-watch",
  "learning-science-adhd",
  "role-definitions",
  "pl-data-sources",
  "interactive-explainers",
];

/** Per-domain caps from CONTEXT "Research method, caps and stop rules". */
export const CAPS = { maxSources: 25, findingsWords: 1500, visualWords: 600 } as const;

export type Part = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface Track {
  id: string;
  number: number;
  title: string;
  part: Part;
}

/** Brief section 7: Part A = Tracks 0-4, B = 5-12, C = 13-14, D = 15-20, E = 21-23, F = 24-27, G = 28. */
function partForNumber(n: number): Part {
  if (n <= 4) return "A";
  if (n <= 12) return "B";
  if (n <= 14) return "C";
  if (n <= 20) return "D";
  if (n <= 23) return "E";
  if (n <= 27) return "F";
  return "G";
}

const TRACK_DEFS: readonly (readonly [string, string])[] = [
  ["t00-start-here", "Start here"],
  ["t01-the-game", "The game"],
  ["t02-language-of-space", "The language of space"],
  ["t03-phases-of-play", "Phases of play"],
  ["t04-watch-gym", "Watch Gym"],
  ["t05-attacking-play", "Attacking play"],
  ["t06-defending", "Defending"],
  ["t07-transitions", "Transitions"],
  ["t08-set-pieces", "Set pieces"],
  ["t09-roles-and-profiles", "Roles and profiles"],
  ["t10-coaching-and-game-models", "Coaching and game models"],
  ["t11-head-coach", "The Head Coach / Manager"],
  ["t12-training-sports-science", "Training, sports science and medical"],
  ["t13-performance-analysis", "Performance Analysis"],
  ["t14-write-and-speak", "Write and Speak football"],
  ["t15-football-data", "Football data"],
  ["t16-metrics-and-models", "Metrics and models"],
  ["t17-numbers-by-role", "The numbers that matter, by position and role"],
  ["t18-python-lab", "Football Python lab"],
  ["t19-football-ai-ml", "Football AI and machine learning"],
  ["t20-head-of-data-science", "The Head of Data Science"],
  ["t21-scouting-1", "Scouting I: the scout's eye"],
  ["t22-scouting-2", "Scouting II: the recruitment system"],
  ["t23-transfers-and-valuation", "Transfers, salaries and player valuation"],
  ["t24-academy", "Academy and player development"],
  ["t25-sporting-director", "The Sporting Director"],
  ["t26-club-ceo", "The Club CEO / General Manager"],
  ["t27-premier-league-system", "The Premier League system"],
  ["t28-capstone", "Capstone: the Club Simulator"],
];

/** The 29 tracks t00 to t28 of brief section 7. Ids are frozen once concept-map.json references them. */
export const TRACKS: readonly Track[] = TRACK_DEFS.map(([id, title], number) => ({
  id,
  number,
  title,
  part: partForNumber(number),
}));

/** Part letter for a track id such as `t07-transitions`, derived from the numeric prefix. */
export function partForTrack(trackId: string): Part {
  const m = /^t(\d{2})-/.exec(trackId);
  const n = m ? Number(m[1]) : Number.NaN;
  if (!Number.isInteger(n) || n < 0 || n > 28) throw new Error(`not a track id: ${trackId}`);
  return partForNumber(n);
}

export const ROLE_IDS_SENIOR: readonly string[] = [
  "sporting-director",
  "head-coach",
  "head-of-performance-analysis",
  "head-of-data-science",
  "head-of-recruitment",
  "academy-director",
  "club-ceo",
  "head-of-performance",
];

export const ROLE_IDS_SUPPORTING: readonly string[] = [
  "assistant-coach",
  "set-piece-coach",
  "loan-manager",
  "chief-scout",
  "first-team-analyst",
  "recruitment-analyst",
  "data-engineer",
];

/** The 15 canonical role ids of brief section 7.1. */
export const ROLE_IDS: readonly string[] = [...ROLE_IDS_SENIOR, ...ROLE_IDS_SUPPORTING];

export const COMPETENCY_DOMAINS: readonly string[] = [
  "game-knowledge",
  "tactics",
  "coaching",
  "analysis",
  "data-science",
  "recruitment",
  "transfers-and-finance",
  "leadership",
  "communication",
  "sports-science",
  "governance",
  "academy-development",
];

/** Threads that must start early (brief section 11): their first concepts get light prerequisites. */
export const THREADS: readonly { track: string; label: string }[] = [
  { track: "t00-start-here", label: "Role Map" },
  { track: "t04-watch-gym", label: "Watch Gym" },
  { track: "t14-write-and-speak", label: "Write and Speak" },
  { track: "t21-scouting-1", label: "Scouting I" },
];

export type Coverage = "wave1" | "partial" | "deferred";

export interface BriefDomain {
  /** Brief section 6.2 number, with its letter where it has one (for example 14b, 20h). */
  number: string;
  name: string;
  coverage: Coverage;
  wave1Slugs: readonly string[];
  /** Tracks the deferred part must precede (research is just in time before the track starts). */
  proposedTracks: readonly string[];
}

function bd(
  number: string,
  name: string,
  coverage: Coverage,
  wave1Slugs: readonly string[],
  proposedTracks: readonly string[],
): BriefDomain {
  return { number, name, coverage, wave1Slugs, proposedTracks };
}

/** Every numbered domain of brief section 6.2, mapped per 02-RESEARCH.md Appendix A. */
export const BRIEF_DOMAINS: readonly BriefDomain[] = [
  bd(
    "1",
    "Laws of the Game, pitch geometry, positions, history of tactics and formations",
    "wave1",
    [
      "laws-of-the-game",
      "pitch-geometry",
      "positions-and-numbering",
      "formations",
      "tactics-history",
    ],
    ["t01-the-game"],
  ),
  bd(
    "2",
    "Principles of play, phases of play, the language of space",
    "deferred",
    [],
    ["t02-language-of-space", "t03-phases-of-play"],
  ),
  bd(
    "3",
    "Positional play, relationism and modern attacking models",
    "deferred",
    [],
    ["t05-attacking-play"],
  ),
  bd(
    "4",
    "Defending: blocks, pressing schemes, triggers, rest-defence",
    "deferred",
    [],
    ["t06-defending"],
  ),
  bd("5", "Transitions", "deferred", [], ["t07-transitions"]),
  bd("6", "Set pieces", "deferred", [], ["t08-set-pieces"]),
  bd("7", "Player roles and profiles (role catalogue)", "deferred", [], ["t09-roles-and-profiles"]),
  bd("8", "Coaching methodology", "deferred", [], ["t10-coaching-and-game-models"]),
  bd("9", "Training and sports science", "deferred", [], ["t12-training-sports-science"]),
  bd("10", "Match and video analysis workflow", "deferred", [], ["t13-performance-analysis"]),
  bd(
    "11",
    "Football data types and providers",
    "partial",
    ["pl-data-sources"],
    ["t15-football-data"],
  ),
  bd("12", "Football metrics and models", "deferred", [], ["t16-metrics-and-models"]),
  bd("12b", "Stats by position and role", "deferred", [], ["t17-numbers-by-role"]),
  bd("13", "The Python football ecosystem", "deferred", [], ["t18-python-lab"]),
  bd(
    "14",
    "Recruitment and scouting (a to f)",
    "deferred",
    [],
    ["t21-scouting-1", "t22-scouting-2"],
  ),
  bd(
    "14b",
    "How analysts actually watch football",
    "wave1",
    ["how-analysts-watch"],
    ["t04-watch-gym"],
  ),
  bd("14c", "Writing and speaking analysis", "deferred", [], ["t14-write-and-speak"]),
  bd(
    "15",
    "The transfer market, player valuation and salaries (a to f)",
    "deferred",
    [],
    ["t23-transfers-and-valuation"],
  ),
  bd("16", "Contracts, agents and regulations", "deferred", [], ["t23-transfers-and-valuation"]),
  bd("17", "Club finance", "deferred", [], ["t26-club-ceo", "t23-transfers-and-valuation"]),
  bd(
    "18",
    "Club strategy and the sporting director role",
    "deferred",
    [],
    ["t25-sporting-director"],
  ),
  bd("19", "Youth development and talent ID", "deferred", [], ["t24-academy"]),
  bd(
    "20",
    "The Premier League ecosystem and the Saudi Pro League context pack",
    "partial",
    ["pl-data-sources"],
    ["t27-premier-league-system"],
  ),
  bd("20b", "The head coach / manager", "deferred", [], ["t11-head-coach"]),
  bd("20c", "Performance analysis departments", "deferred", [], ["t13-performance-analysis"]),
  bd("20d", "Football AI and ML", "deferred", [], ["t19-football-ai-ml"]),
  bd("20e", "Club data departments", "deferred", [], ["t20-head-of-data-science"]),
  bd("20f", "Academy and player development", "deferred", [], ["t24-academy"]),
  bd("20g", "The club CEO/GM and the business of football", "deferred", [], ["t26-club-ceo"]),
  bd("20h", "Role definitions", "wave1", ["role-definitions"], ["t00-start-here"]),
  bd("21", "Learning science for ADHD and visual learners", "wave1", ["learning-science-adhd"], []),
  bd("22", "Inspiration audit for interactive explainers", "wave1", ["interactive-explainers"], []),
];

function has(text: string, needle: string): boolean {
  return text.includes(needle);
}

function lawsRule(ctx: DomainContext): Violation[] {
  const v: Violation[] = [];
  for (const needle of ["2026/27", "1 July 2026"]) {
    if (!has(ctx.findings, needle)) {
      v.push({
        rule: "slug-laws-edition",
        detail: `findings.md must state the Laws edition and effective date; "${needle}" is missing`,
      });
    }
  }
  return v;
}

function adhdRule(ctx: DomainContext): Violation[] {
  const v: Violation[] = [];
  for (const s of ctx.sources) {
    if (s.type === "paper" && !/evidence grade:\s*(high|moderate|low|very low)\b/i.test(s.notes)) {
      v.push({
        rule: "slug-adhd-evidence-grade",
        detail: `${s.id} is a paper; its notes must contain "evidence grade: high|moderate|low|very low"`,
      });
    }
  }
  for (const label of ["ADHD-specific", "General learning science"]) {
    if (!has(ctx.findings, label)) {
      v.push({
        rule: "slug-adhd-sections",
        detail: `findings.md must separate evidence kinds; "${label}" is missing`,
      });
    }
  }
  return v;
}

function rolesRule(ctx: DomainContext): Violation[] {
  const missing = ROLE_IDS.filter((id) => !has(ctx.findings, id));
  return missing.length === 0
    ? []
    : [
        {
          rule: "slug-roles-covered",
          detail: `findings.md must mention every canonical role id; missing: ${missing.join(", ")}`,
        },
      ];
}

function plDataRule(ctx: DomainContext): Violation[] {
  const v: Violation[] = [];
  const fbref = ctx.sources.find((s) => s.id === "src-fbref-advanced-stats");
  if (fbref?.status !== "removed") {
    v.push({
      rule: "slug-pl-fbref-removed",
      detail: "sources.json must include src-fbref-advanced-stats with status removed",
    });
  }
  if (!has(ctx.findings, "coverage-matrix.json")) {
    v.push({
      rule: "slug-pl-coverage-matrix",
      detail: "findings.md must point to coverage-matrix.json",
    });
  }
  return v;
}

function explainersRule(ctx: DomainContext): Violation[] {
  const okabe = ctx.sources.find((s) => s.id === "src-okabe-ito-cud");
  return okabe && Array.isArray(okabe.excerpts) && okabe.excerpts.length > 0
    ? []
    : [
        {
          rule: "slug-explainers-okabe-ito",
          detail:
            "sources.json must include src-okabe-ito-cud with at least one excerpt (palette hex values are verified, not remembered)",
        },
      ];
}

/** Slug-specific extra checks run by validateDomainFolder after the shared rules. */
export const SLUG_RULES: Record<string, (ctx: DomainContext) => Violation[]> = {
  "laws-of-the-game": lawsRule,
  "learning-science-adhd": adhdRule,
  "role-definitions": rolesRule,
  "pl-data-sources": plDataRule,
  "interactive-explainers": explainersRule,
};
