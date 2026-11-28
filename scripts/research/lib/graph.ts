// Prerequisite-graph helpers for the concept map (RSCH-04). Erasable TypeScript only so
// `node file.ts` can import it. Every function is pure and deterministic.
import { TRACKS } from "./domains.ts";

/** The slice of a concept the graph functions need. */
export interface GraphConcept {
  id: string;
  track: string;
  prerequisites: readonly string[];
}

export const MAX_PREREQUISITES = 4;
export const MAX_LAYERS = 14;

/** id -> list of prerequisite ids. Ids that are not keys of the map are ignored when layering. */
export type Prereqs = Map<string, readonly string[]>;

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

function walk(
  edges: ReadonlyMap<string, readonly string[]>,
  start: string,
  depth: number,
): Map<string, number> {
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

/**
 * Exact prerequisite cycles: every strongly connected group of two or more concepts (Tarjan),
 * members sorted, groups sorted by first member. Self-loops are not included; `checkGraph`
 * reports those on their own. Concepts that only hang off a cycle are not members.
 */
export function cycles(prereqs: Prereqs): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const groups: string[][] = [];
  let counter = 0;

  const visit = (id: string): void => {
    index.set(id, counter);
    low.set(id, counter);
    counter++;
    stack.push(id);
    onStack.add(id);
    for (const p of prereqs.get(id) ?? []) {
      if (!prereqs.has(p)) continue;
      if (!index.has(p)) {
        visit(p);
        low.set(id, Math.min(low.get(id) as number, low.get(p) as number));
      } else if (onStack.has(p)) {
        low.set(id, Math.min(low.get(id) as number, index.get(p) as number));
      }
    }
    if (low.get(id) === index.get(id)) {
      const group: string[] = [];
      let top: string | undefined;
      do {
        top = stack.pop() as string;
        onStack.delete(top);
        group.push(top);
      } while (top !== id);
      if (group.length > 1) groups.push(group.sort());
    }
  };

  for (const id of [...prereqs.keys()].sort()) {
    if (!index.has(id)) visit(id);
  }
  return groups.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
}

/**
 * Structural checks on the prerequisite graph. Errors fail the build; warnings only show up in the
 * quality report. Every message names the concept ids involved.
 */
export function checkGraph(concepts: readonly GraphConcept[]): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trackIds = new Set(TRACKS.map((t) => t.id));

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const c of concepts) {
    if (seen.has(c.id)) duplicates.add(c.id);
    seen.add(c.id);
  }
  for (const id of [...duplicates].sort()) errors.push(`duplicate concept id: ${id}`);

  const prereqs: Prereqs = new Map();
  for (const c of concepts) if (!prereqs.has(c.id)) prereqs.set(c.id, [...c.prerequisites]);

  for (const id of [...prereqs.keys()].sort()) {
    if (trackIds.has(id)) errors.push(`concept id is also a track id: ${id}`);
    const ps = prereqs.get(id) as string[];
    if (ps.includes(id)) errors.push(`self-loop: ${id} lists itself as a prerequisite`);
    for (const p of ps) {
      if (p !== id && !prereqs.has(p)) errors.push(`dangling prerequisite: ${id} -> ${p}`);
    }
  }

  for (const group of cycles(prereqs)) errors.push(`prerequisite cycle: ${group.join(", ")}`);

  if (prereqs.size > 0 && ![...prereqs.values()].some((ps) => ps.length === 0)) {
    errors.push("no root concept: every concept has at least one prerequisite");
  }

  for (const id of [...prereqs.keys()].sort()) {
    const n = (prereqs.get(id) as string[]).length;
    if (n > MAX_PREREQUISITES) {
      warnings.push(`${id} has ${n} prerequisites (more than ${MAX_PREREQUISITES})`);
    }
  }
  const { layer } = layers(prereqs);
  const depth = layer.size > 0 ? Math.max(...layer.values()) + 1 : 0;
  if (depth > MAX_LAYERS) {
    warnings.push(`longest prerequisite chain is ${depth} layers (more than ${MAX_LAYERS})`);
  }
  return { errors, warnings };
}

export interface StudyOrderOptions {
  /** Concept ids that start an early thread; they go first inside their layer. */
  threadStarters?: Iterable<string>;
  /** Track id -> number for tie breaks. Defaults to the `tNN-` prefix of the track id. */
  trackNumber?: (track: string) => number;
}

function defaultTrackNumber(track: string): number {
  const m = /^t(\d+)-/.exec(track);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * The study order as a pure function of the graph. Concepts are layered (Kahn); inside a layer the
 * order is thread starters first, then lower track number, then id. `stage` is the 0-based layer.
 * Concepts on or behind a cycle are left out of `order` and listed (sorted) in `cycle`.
 */
export function studyOrder(
  concepts: readonly GraphConcept[],
  options: StudyOrderOptions = {},
): { order: string[]; stage: Map<string, number>; cycle: string[] } {
  const starters = new Set(options.threadStarters ?? []);
  const trackNumber = options.trackNumber ?? defaultTrackNumber;
  const byId = new Map<string, GraphConcept>();
  for (const c of concepts) if (!byId.has(c.id)) byId.set(c.id, c);
  const { layer, cycle } = layers(new Map([...byId].map(([id, c]) => [id, [...c.prerequisites]])));

  const order = [...layer.keys()].sort((a, b) => {
    const la = layer.get(a) as number;
    const lb = layer.get(b) as number;
    if (la !== lb) return la - lb;
    const sa = starters.has(a) ? 0 : 1;
    const sb = starters.has(b) ? 0 : 1;
    if (sa !== sb) return sa - sb;
    const ta = trackNumber((byId.get(a) as GraphConcept).track);
    const tb = trackNumber((byId.get(b) as GraphConcept).track);
    if (ta !== tb) return ta - tb;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return { order, stage: layer, cycle: cycle.sort() };
}
