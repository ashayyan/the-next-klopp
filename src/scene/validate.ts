// Semantic integrity checks for Scene v1: the rules JSON Schema cannot express. Shared by the
// tests and the /dev/pitch error panel, so issues are plain data with JSON Pointer paths and
// short, plain-English messages.
import { type Scene, type ScenePoint, sceneSchema } from "./schema.ts";

/** Run-off margin around the field (metres) inside which scene coordinates may lie. */
export const RUNOFF_METRES = 3;

export interface SceneIssue {
  /** JSON Pointer into the scene document, for example `/frames/2/t`. */
  path: string;
  message: string;
}

function escapePointer(segment: string | number): string {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function pointer(...segments: (string | number)[]): string {
  return segments.map((s) => `/${escapePointer(s)}`).join("");
}

export function checkSceneIntegrity(scene: Scene): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const add = (message: string, ...path: (string | number)[]) => {
    issues.push({ path: pointer(...path), message });
  };

  const { length, width } = scene.pitch;
  const r = RUNOFF_METRES;
  const checkPoint = (p: ScenePoint, ...path: (string | number)[]) => {
    if (p.x < -r || p.x > length + r || p.y < -r || p.y > width + r) {
      add(
        `Point (${p.x}, ${p.y}) is outside the ${length} × ${width} m pitch plus ${r} m run-off.`,
        ...path,
      );
    }
  };

  // Teams: unique ids, each side used once.
  const teamIds = new Set<string>();
  const sides = new Set<string>();
  scene.teams.forEach((team, i) => {
    if (teamIds.has(team.id)) add(`Team id “${team.id}” is used twice.`, "teams", i, "id");
    teamIds.add(team.id);
    if (sides.has(team.side)) add(`Side “${team.side}” is used by two teams.`, "teams", i, "side");
    sides.add(team.side);
  });

  // Entities: unique ids, team rules, one ball.
  const entityById = new Map<string, Scene["entities"][number]>();
  let balls = 0;
  scene.entities.forEach((entity, i) => {
    if (entityById.has(entity.id)) {
      add(`Entity id “${entity.id}” is used twice.`, "entities", i, "id");
    } else {
      entityById.set(entity.id, entity);
    }
    if (entity.type === "ball") {
      balls += 1;
      if (balls > 1) add("A scene can hold only one ball.", "entities", i, "type");
      if (entity.team !== undefined) add("The ball has no team.", "entities", i, "team");
    } else if (entity.team === undefined) {
      add(`Player “${entity.id}” needs a team.`, "entities", i, "team");
    } else if (!teamIds.has(entity.team)) {
      add(`Team “${entity.team}” is not in teams.`, "entities", i, "team");
    }
  });

  const isPlayer = (id: string) => {
    const e = entityById.get(id);
    return e !== undefined && e.type !== "ball";
  };
  const playerInTeam = (id: string, team: string) => entityById.get(id)?.team === team;

  // Frames: start at 0, strictly increasing, known keys, valid owner, inside the pitch.
  const seen = new Set<string>();
  scene.frames.forEach((frame, i) => {
    if (i === 0 && frame.t !== 0) add("The first frame must be at t 0.", "frames", 0, "t");
    const prev = scene.frames[i - 1];
    if (prev !== undefined && frame.t <= prev.t) {
      add(`Frame times must increase: ${frame.t} s follows ${prev.t} s.`, "frames", i, "t");
    }
    for (const [key, p] of Object.entries(frame.positions)) {
      if (!entityById.has(key)) {
        add(`“${key}” is not an entity in this scene.`, "frames", i, "positions", key);
        continue;
      }
      seen.add(key);
      checkPoint(p, "frames", i, "positions", key);
    }
    if (frame.ballOwner !== undefined && !isPlayer(frame.ballOwner)) {
      add(`Ball owner “${frame.ballOwner}” is not a player.`, "frames", i, "ballOwner");
    }
  });
  scene.entities.forEach((entity, i) => {
    if (!seen.has(entity.id)) add(`Entity “${entity.id}” appears in no frame.`, "entities", i);
  });

  // Events: unique ids, known team and players, ordered times, inside the pitch.
  const eventIds = new Set<string>();
  scene.events.forEach((event, i) => {
    if (eventIds.has(event.id)) add(`Event id “${event.id}” is used twice.`, "events", i, "id");
    eventIds.add(event.id);
    if (!teamIds.has(event.team)) add(`Team “${event.team}” is not in teams.`, "events", i, "team");
    if (event.player !== undefined) {
      if (!isPlayer(event.player)) {
        add(`Player “${event.player}” is not in this scene.`, "events", i, "player");
      } else if (!playerInTeam(event.player, event.team)) {
        add(`Player “${event.player}” does not play for “${event.team}”.`, "events", i, "player");
      }
    }
    if (event.type === "pass" && event.receiver !== undefined && !isPlayer(event.receiver)) {
      add(`Receiver “${event.receiver}” is not in this scene.`, "events", i, "receiver");
    }
    if (event.type === "pressure" && event.target !== undefined && !isPlayer(event.target)) {
      add(`Target “${event.target}” is not in this scene.`, "events", i, "target");
    }
    if (event.tEnd !== undefined && event.tEnd < event.t) {
      add("tEnd must not be before t.", "events", i, "tEnd");
    }
    checkPoint(event.start, "events", i, "start");
    checkPoint(event.end, "events", i, "end");
  });

  // Annotations: unique ids, ordered ranges, references, inside the pitch.
  const annotationIds = new Set<string>();
  scene.annotations.forEach((a, i) => {
    if (annotationIds.has(a.id))
      add(`Annotation id “${a.id}” is used twice.`, "annotations", i, "id");
    annotationIds.add(a.id);
    if (a.type !== "sequence" && a.from !== undefined && a.to !== undefined && a.from > a.to) {
      add("The time range ends before it starts.", "annotations", i, "to");
    }
    switch (a.type) {
      case "zone":
        a.points.forEach((p, j) => {
          checkPoint(p, "annotations", i, "points", j);
        });
        break;
      case "shape":
        if (!teamIds.has(a.team)) {
          add(`Team “${a.team}” is not in teams.`, "annotations", i, "team");
        }
        a.members.forEach((m, j) => {
          if (!playerInTeam(m, a.team) || !isPlayer(m)) {
            add(`“${m}” is not a player of “${a.team}”.`, "annotations", i, "members", j);
          }
        });
        break;
      case "highlight":
        if ((a.target === undefined) === (a.at === undefined)) {
          add("A highlight needs exactly one of target and at.", "annotations", i);
        }
        if (a.target !== undefined && !entityById.has(a.target)) {
          add(`Target “${a.target}” is not in this scene.`, "annotations", i, "target");
        }
        if (a.at !== undefined) checkPoint(a.at, "annotations", i, "at");
        break;
      case "note":
        checkPoint(a.at, "annotations", i, "at");
        if (a.anchor !== undefined) checkPoint(a.anchor, "annotations", i, "anchor");
        break;
      case "point":
        checkPoint(a.at, "annotations", i, "at");
        break;
      case "sequence":
        a.events.forEach((id, j) => {
          if (!eventIds.has(id))
            add(`Event “${id}” is not in events.`, "annotations", i, "events", j);
        });
        break;
    }
  });

  // Source licence rules (ADR 0008).
  const src = scene.source;
  if (src.localOnly === true && src.shippable) {
    add("A local-only scene can never be shippable.", "source", "shippable");
  }
  if (src.type === "open-data") {
    if (src.provider === undefined)
      add("Open-data scenes name their provider.", "source", "provider");
    if (src.licenceUrl === undefined) {
      add("Open-data scenes link their licence.", "source", "licenceUrl");
    }
  }
  if (src.provider === "statsbomb") {
    if (src.shippable && src.localOnly !== true) {
      add("StatsBomb scenes are local-only and never shippable (ADR 0008).", "source", "shippable");
    }
    if (src.logoRequired !== true) {
      add("StatsBomb scenes must credit StatsBomb with its logo.", "source", "logoRequired");
    }
  }

  return issues;
}

interface ZodIssueLike {
  code: string;
  path: PropertyKey[];
  message: string;
  keys?: string[];
}

/** Zod issues as JSON Pointers; unknown keys are reported at the key itself (as ajv does). */
function zodIssues(issues: readonly ZodIssueLike[]): SceneIssue[] {
  return issues.flatMap((issue) => {
    const base = issue.path.map((p) => `/${escapePointer(String(p))}`).join("");
    if (issue.code === "unrecognized_keys") {
      return (issue.keys ?? []).map((k) => ({
        path: `${base}/${escapePointer(k)}`,
        message: "This property is not part of the scene format.",
      }));
    }
    return [{ path: base, message: issue.message }];
  });
}

/** Parse untrusted input: Zod first (shape), then the integrity rules (meaning). */
export function parseScene(
  input: unknown,
): { ok: true; scene: Scene } | { ok: false; issues: SceneIssue[] } {
  const parsed = sceneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issues: zodIssues(parsed.error.issues) };
  const issues = checkSceneIntegrity(parsed.data);
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, scene: parsed.data };
}
