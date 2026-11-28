// The 29 curriculum tracks (brief section 7) and their parts. Pure, erasable TypeScript with no
// Node import, so the app, the content build (scripts/lib/content/) and the Phase 2 research
// scripts share one list. scripts/research/lib/domains.ts re-exports it unchanged.

export type Part = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface Track {
  id: string;
  number: number;
  title: string;
  part: Part;
}

/** Brief section 7: Part A = Tracks 0-4, B = 5-12, C = 13-14, D = 15-20, E = 21-23, F = 24-27, G = 28. */
export function partForNumber(n: number): Part {
  if (n <= 4) return "A";
  if (n <= 12) return "B";
  if (n <= 14) return "C";
  if (n <= 20) return "D";
  if (n <= 23) return "E";
  if (n <= 27) return "F";
  return "G";
}

export const TRACK_DEFS: readonly (readonly [string, string])[] = [
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
