// Prerequisite-graph helpers for the concept map (RSCH-04). Erasable TypeScript only so
// `node file.ts` can import it. Every function is pure and deterministic.

/** id -> list of prerequisite ids. Ids that are not keys of the map are ignored when layering. */
export type Prereqs = Map<string, string[]>;

/**
 * Kahn layering. A concept sits one layer after its deepest prerequisite, roots are layer 0.
 * Prerequisites that are not concepts (dangling ids) are ignored here; `checkGraph` reports them.
 * `cycle` lists every concept that could not be layered, which is the cycle members plus anything
 * downstream of them. Use `cycles` for the exact members.
 */
export function layers(prereqs: Prereqs): { layer: Map<string, number>; cycle: string[] } {
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  for (const [id, ps] of prereqs) {
    const known = [...new Set(ps)].filter((p) => prereqs.has(p));
    indeg.set(id, known.length);
    for (const p of known) out.set(p, [...(out.get(p) ?? []), id]);
  }
  const layer = new Map<string, number>();
  let frontier = [...indeg].filter(([, d]) => d === 0).map(([id]) => id);
  for (let l = 0; frontier.length > 0; l++) {
    const next: string[] = [];
    for (const id of frontier) {
      layer.set(id, l);
      for (const child of out.get(id) ?? []) {
        const d = (indeg.get(child) ?? 0) - 1;
        indeg.set(child, d);
        if (d === 0) next.push(child);
      }
    }
    frontier = next;
  }
  return { layer, cycle: [...prereqs.keys()].filter((id) => !layer.has(id)) };
}

function reverse(prereqs: Prereqs): Map<string, string[]> {
  const rev = new Map<string, string[]>();
  for (const [id, ps] of prereqs) {
    for (const p of ps) rev.set(p, [...(rev.get(p) ?? []), id]);
  }
  return rev;
}

function walk(edges: Map<string, string[]>, start: string, depth: number): Map<string, number> {
  const dist = new Map<string, number>();
  let frontier = [start];
  for (let d = 1; d <= depth && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of [...(edges.get(id) ?? [])].sort()) {
        if (n === start || dist.has(n)) continue;
        dist.set(n, d);
        next.push(n);
      }
    }
    frontier = next;
  }
  return dist;
}

/** Prerequisites of `id`, transitively, up to `depth` steps. Value = distance (1 = direct). */
export function ancestors(
  prereqs: Prereqs,
  id: string,
  depth = Number.POSITIVE_INFINITY,
): Map<string, number> {
  return walk(prereqs, id, depth);
}

/** Concepts unlocked by `id`, transitively, up to `depth` steps. Value = distance (1 = direct). */
export function descendants(
  prereqs: Prereqs,
  id: string,
  depth = Number.POSITIVE_INFINITY,
): Map<string, number> {
  return walk(reverse(prereqs), id, depth);
}
