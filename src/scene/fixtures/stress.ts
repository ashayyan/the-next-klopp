// Deterministic 22-player stress scene for the 60 fps playback check (03-07, measured in 03-11).
// Two teams of eleven and a ball move on sine and cosine paths kept inside the pitch, 300 keyframes
// at 0.1 s (30 s), no events. Generated in code, so no data file is committed.
import type { Scene } from "../schema.ts";

const LENGTH = 105;
const WIDTH = 68;
const FRAMES = 300;
const STEP_S = 0.1;
const MARGIN = 2;

/** Lines of the 4-4-2 shape, x as a share of the pitch from the own goal. */
const SHAPE: readonly (readonly [x: number, y: number])[] = [
  [0.04, 0.5],
  [0.2, 0.15],
  [0.2, 0.38],
  [0.2, 0.62],
  [0.2, 0.85],
  [0.42, 0.15],
  [0.42, 0.38],
  [0.42, 0.62],
  [0.42, 0.85],
  [0.62, 0.38],
  [0.62, 0.62],
];

function clamp(value: number, max: number): number {
  return Math.min(max - MARGIN, Math.max(MARGIN, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function makeStressScene(): Scene {
  const players = (team: "home" | "away") =>
    SHAPE.map(([sx, sy], i) => ({
      id: `${team}-${i + 1}`,
      type: i === 0 ? ("goalkeeper" as const) : ("player" as const),
      team,
      number: i + 1,
      baseX: team === "home" ? sx * LENGTH : (1 - sx) * LENGTH,
      baseY: sy * WIDTH,
      phase: i * 0.7 + (team === "home" ? 0 : 1.9),
    }));
  const all = [...players("home"), ...players("away")];

  const frames = Array.from({ length: FRAMES }, (_, k) => {
    const t = round(k * STEP_S);
    const positions: Scene["frames"][number]["positions"] = {};
    for (const p of all) {
      positions[p.id] = {
        x: round(clamp(p.baseX + 6 * Math.sin(t * 0.5 + p.phase), LENGTH)),
        y: round(clamp(p.baseY + 4 * Math.cos(t * 0.7 + p.phase), WIDTH)),
      };
    }
    positions.ball = {
      x: round(clamp(LENGTH / 2 + 30 * Math.sin(t * 0.4), LENGTH)),
      y: round(clamp(WIDTH / 2 + 18 * Math.cos(t * 0.9), WIDTH)),
    };
    return { t, positions };
  });

  return {
    id: "stress-22-players",
    schemaVersion: 1,
    kind: "authored",
    label: "Stress · 22 players",
    pitch: { length: LENGTH, width: WIDTH },
    teams: [
      { id: "home", name: "Home", side: "a", venue: "home", attack: { "1": "ltr" } },
      { id: "away", name: "Away", side: "b", venue: "away", attack: { "1": "rtl" } },
    ],
    entities: [
      ...all.map(({ id, type, team, number }) => ({ id, type, team, number })),
      { id: "ball", type: "ball" as const },
    ],
    frames,
    events: [],
    annotations: [],
    source: {
      type: "authored",
      sourceIds: [],
      licence: "project-authored",
      attribution: "Generated for The Next Klopp (stress scene)",
      shippable: true,
    },
  };
}
