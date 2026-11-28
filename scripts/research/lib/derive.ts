// Derived reverse links for the concept map (RSCH-04). Erasable TypeScript only so `node file.ts`
// can import it. Pure and idempotent: running deriveLinks on its own output changes nothing.
//
// Source of truth (authored by hand):
//   concept.prerequisites, concept.competencies, related and contrasts edges, role.competencies
// Derived here:
//   concept.roles          = roles that require any competency the concept lists
//   prerequisite edges     = one edge per (prerequisite -> concept) pair
//   competency.concepts    = concepts that list the competency
import type { Competency, Concept, Edge, Role } from "./research-io.ts";

export interface ConceptMapDoc {
  schema_version: 1;
  concepts: Concept[];
  edges: Edge[];
}

export interface DerivedLinks {
  conceptMap: ConceptMapDoc;
  competencies: Competency[];
}

function byString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function trackNumber(track: string): number {
  const m = /^t(\d+)-/.exec(track);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

function edgeKey(e: Edge): string {
  return `${e.from}\u0000${e.to}\u0000${e.kind}`;
}

function compareEdges(a: Edge, b: Edge): number {
  return byString(a.from, b.from) || byString(a.to, b.to) || byString(a.kind, b.kind);
}

/**
 * Rebuilds every derived field from the authored ones. Returns new objects; inputs are not
 * mutated. Concepts come out sorted by track number then id, with keys in schema order.
 * Edges: authored related and contrasts edges first (deduplicated, sorted by from, to, kind),
 * then the generated prerequisite edges (sorted by from, to). Competencies keep their order;
 * only their `concepts` list is replaced.
 */
export function deriveLinks(
  conceptMap: { concepts: readonly Concept[]; edges: readonly Edge[] },
  competencies: readonly Competency[],
  roles: readonly Role[],
): DerivedLinks {
  const rolesByCompetency = new Map<string, Set<string>>();
  for (const r of roles) {
    for (const k of r.competencies) {
      const set = rolesByCompetency.get(k.id) ?? new Set<string>();
      set.add(r.id);
      rolesByCompetency.set(k.id, set);
    }
  }

  const concepts: Concept[] = [...conceptMap.concepts]
    .sort((a, b) => trackNumber(a.track) - trackNumber(b.track) || byString(a.id, b.id))
    .map((c) => {
      const roleIds = new Set<string>();
      for (const k of c.competencies)
        for (const r of rolesByCompetency.get(k) ?? []) roleIds.add(r);
      return {
        id: c.id,
        title: c.title,
        track: c.track,
        part: c.part,
        summary: c.summary,
        prerequisites: [...c.prerequisites],
        roles: [...roleIds].sort(byString),
        competencies: [...c.competencies],
        sources: [...c.sources],
        status: c.status,
      };
    });

  const authored = new Map<string, Edge>();
  for (const e of conceptMap.edges) {
    if (e.kind === "prerequisite") continue;
    const edge: Edge = { from: e.from, to: e.to, kind: e.kind };
    authored.set(edgeKey(edge), edge);
  }
  const prerequisiteEdges = new Map<string, Edge>();
  for (const c of concepts) {
    for (const p of c.prerequisites) {
      const edge: Edge = { from: p, to: c.id, kind: "prerequisite" };
      prerequisiteEdges.set(edgeKey(edge), edge);
    }
  }
  const edges = [
    ...[...authored.values()].sort(compareEdges),
    ...[...prerequisiteEdges.values()].sort(compareEdges),
  ];

  const conceptsByCompetency = new Map<string, string[]>();
  for (const c of concepts) {
    for (const k of c.competencies) {
      conceptsByCompetency.set(k, [...(conceptsByCompetency.get(k) ?? []), c.id]);
    }
  }
  const derivedCompetencies: Competency[] = competencies.map((k) => ({
    id: k.id,
    title: k.title,
    domain: k.domain,
    levels: k.levels.map((l) => ({ level: l.level, descriptor: l.descriptor })),
    concepts: [...new Set(conceptsByCompetency.get(k.id) ?? [])].sort(byString),
  }));

  return {
    conceptMap: { schema_version: 1, concepts, edges },
    competencies: derivedCompetencies,
  };
}

/** The JSON text the derive CLI writes: two-space indent and a trailing newline. */
export function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
