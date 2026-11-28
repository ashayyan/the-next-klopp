// Every number on the data screen is computed here from the published scene, never typed by hand
// (04-UI-SPEC "Screen 2 — Data lesson", derived-values table). derived.test.ts recomputes them.
import type { Scene, SceneEvent } from "../../scene/schema.ts";

export interface GoalRow {
  /** 1-based action number (the sequence badge). */
  n: number;
  /** Seconds since the first action, one decimal. */
  t: number;
  /** Scene time of the action, for seeking. */
  sceneT: number;
  eventId: string;
  who: string;
  receiver: string | null;
  action: string;
  /** Metres toward the opponent's goal (end.x − start.x), one decimal. */
  metres: number;
  /** The end point is an estimate (the shot's end in Wyscout data). */
  approximate: boolean;
}

export interface GoalNote {
  /** The badge numbers the note is about, as shown: "1–5", "6", "10". */
  range: string;
  /** First badge number, for placing the note beside its badge. */
  badge: number;
  text: string;
}

export interface DerivedGoal {
  rows: GoalRow[];
  /** Shot time minus first pass time, one decimal. */
  firstToShotSec: number;
  /** Shot start x minus first pass start x, one decimal. */
  upfieldMetres: number;
  /** Distinct players with an action. */
  playersOnBall: number;
  notes: GoalNote[];
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** "+31.5" or "−15.3" (U+2212 minus); zero has no sign. */
export function formatMetres(v: number): string {
  const r = round1(v);
  if (r === 0) return "0.0";
  return `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}`;
}

/** Seconds with one decimal: "9.7". */
export function formatSeconds(v: number): string {
  return round1(v).toFixed(1);
}

/** Playing names: the surname is everything after the first given name ("De Bruyne"). */
const PLAYING_NAMES: Readonly<Record<string, string>> = { "da-silva": "Danilo" };

function surname(scene: Scene, id: string | undefined): string {
  if (!id) return "";
  const fixed = PLAYING_NAMES[id];
  if (fixed) return fixed;
  const entity = scene.entities.find((e) => e.id === id);
  const name = entity?.name ?? entity?.label ?? id;
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

function actionOf(event: SceneEvent): string {
  switch (event.type) {
    case "pass":
      return "Pass";
    case "shot":
      return event.goal ? "Shot, goal" : "Shot";
    case "carry":
      return "Carry";
    case "run":
      return "Run";
    case "pressure":
      return "Pressure";
  }
}

/** The ordered actions of the scene's sequence annotation (or all events in time order). */
function orderedEvents(scene: Scene): SceneEvent[] {
  const sequence = scene.annotations.find((a) => a.type === "sequence");
  const byId = new Map(scene.events.map((e) => [e.id, e]));
  if (sequence?.type === "sequence") {
    return sequence.events.flatMap((id) => {
      const e = byId.get(id);
      return e ? [e] : [];
    });
  }
  return [...scene.events].sort((a, b) => a.t - b.t);
}

export function deriveGoal(scene: Scene): DerivedGoal {
  const events = orderedEvents(scene);
  const first = events[0];
  const t0 = first?.t ?? 0;
  const rows: GoalRow[] = events.map((event, i) => ({
    n: i + 1,
    t: round1(event.t - t0),
    sceneT: event.t,
    eventId: event.id,
    who: surname(scene, event.player),
    receiver: event.type === "pass" && event.receiver ? surname(scene, event.receiver) : null,
    action: actionOf(event),
    metres: round1(event.end.x - event.start.x),
    approximate: event.type === "shot" && event.endApprox === true,
  }));

  const shot = events.find((e) => e.type === "shot");
  const firstToShotSec = shot && first ? round1(shot.t - first.t) : 0;
  const upfieldMetres = shot && first ? round1(shot.start.x - first.start.x) : 0;
  const playersOnBall = new Set(events.flatMap((e) => (e.player ? [e.player] : []))).size;

  // Notes are computed from the table (the rounded per-action values), as the margin reads them.
  const firstFive = rows.slice(0, 5);
  const net = round1(firstFive.reduce((sum, r) => sum + r.metres, 0));
  const biggest = rows.reduce<GoalRow | undefined>(
    (best, r) => (best === undefined || r.metres > best.metres ? r : best),
    undefined,
  );
  const shotRow = rows.find((r) => r.eventId === shot?.id);
  const fromGoalLine = shot ? round1(scene.pitch.length - shot.start.x) : 0;
  const notes: GoalNote[] = [];
  if (firstFive.length === 5) {
    notes.push({
      range: "1–5",
      badge: 1,
      text: `1–5: the ball moves back and across, net ${formatMetres(net)} m.`,
    });
  }
  if (biggest) {
    notes.push({
      range: String(biggest.n),
      badge: biggest.n,
      text: `${biggest.n}: the biggest gain, ${formatMetres(biggest.metres)} m.`,
    });
  }
  if (shotRow) {
    notes.push({
      range: String(shotRow.n),
      badge: shotRow.n,
      text: `${shotRow.n}: ${shotRow.who} shoots ${formatSeconds(fromGoalLine)} m from the goal line.`,
    });
  }

  return { rows, firstToShotSec, upfieldMetres, playersOnBall, notes };
}
