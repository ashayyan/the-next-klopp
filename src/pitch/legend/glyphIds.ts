// Pure legend id set and scene description. No React and no DOM, so tests and the server render
// can call them. The legend and the accessible description are derived from scene data, never
// authored by hand, so what the legend lists is what the pitch draws.
import type { Scene } from "../../scene/schema.ts";
import { GLYPH_IDS, type GlyphId } from "../glyphs/registry.ts";

/**
 * Glyph ids a scene can draw over its whole duration (all entities, events and annotations, not one
 * instant), in registry order. `density` is included only when the Canvas layer is on and the scene
 * has events.
 */
export function glyphIdsForScene(scene: Scene, options: { density: boolean }): GlyphId[] {
  const present = new Set<GlyphId>();
  const sideOf = new Map(scene.teams.map((t) => [t.id, t.side]));

  for (const entity of scene.entities) {
    if (entity.type === "ball") {
      present.add("ball");
      continue;
    }
    const side = (entity.team ? sideOf.get(entity.team) : undefined) ?? "a";
    present.add(`${entity.type === "goalkeeper" ? "goalkeeper" : "player"}-${side}`);
  }
  for (const event of scene.events) present.add(event.type);
  for (const annotation of scene.annotations) {
    switch (annotation.type) {
      case "note":
        present.add("annotation");
        break;
      case "sequence":
        present.add("sequence-badge");
        break;
      default:
        present.add(annotation.type);
    }
  }
  if (options.density && scene.events.length > 0) present.add("density");

  return GLYPH_IDS.filter((id) => present.has(id));
}

function count(n: number, one: string, many: string): string | null {
  if (n === 0) return null;
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Text alternative for the pitch, such as "22 players, 1 ball, 6 passes, 2 carries, 1 shot.",
 * followed by every note in full (notes are truncated to 40 characters on the pitch).
 */
export function describeScene(scene: Scene): string {
  const countOf = (type: string) => scene.events.filter((e) => e.type === type).length;
  const annotationsOf = (type: string) => scene.annotations.filter((a) => a.type === type).length;
  const parts = [
    count(
      scene.entities.filter((e) => e.type === "player" || e.type === "goalkeeper").length,
      "player",
      "players",
    ),
    count(scene.entities.filter((e) => e.type === "ball").length, "ball", "balls"),
    count(countOf("pass"), "pass", "passes"),
    count(countOf("carry"), "carry", "carries"),
    count(countOf("run"), "run without the ball", "runs without the ball"),
    count(countOf("shot"), "shot", "shots"),
    count(countOf("pressure"), "pressure", "pressures"),
    count(annotationsOf("zone"), "zone", "zones"),
    count(annotationsOf("shape"), "shape line", "shape lines"),
    count(annotationsOf("highlight"), "highlight", "highlights"),
    count(annotationsOf("note"), "note", "notes"),
    count(annotationsOf("point"), "point", "points"),
  ].filter((p): p is string => p !== null);

  let text = parts.length > 0 ? `${parts.join(", ")}.` : "Nothing is drawn on this pitch.";
  for (const annotation of scene.annotations) {
    if (annotation.type === "note") text += ` Note: ${annotation.text}`;
  }
  if (scene.events.some((e) => e.type === "shot" && e.endApprox)) {
    text += " The shot has an approximate end point.";
  }
  return text;
}
