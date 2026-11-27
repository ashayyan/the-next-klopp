// Build-time layered layout of the concept map (RSCH-06). A thin, pure wrapper around dagre so the
// summary page ships plain coordinates and no layout code. Erasable TypeScript only.
import { Graph, layout } from "@dagrejs/dagre";

export const NODE_W = 172;
export const NODE_H = 50;
const NODE_SEP = 22;
const RANK_SEP = 84;
const PAD = 16;

export interface LayoutNode {
  id: string;
  /** Top-left corner. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutEdge {
  /** The prerequisite. */
  from: string;
  /** The concept that needs it. */
  to: string;
  points: { x: number; y: number }[];
}

export interface Layout {
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Left-to-right layout: every prerequisite edge points to a later rank. Nodes and edges are added in
 * sorted order and coordinates are rounded to one decimal, so the output is deterministic.
 * Prerequisite ids that are not concepts are ignored (`checkGraph` reports them).
 */
export function layoutConcepts(
  concepts: readonly { id: string; prerequisites: readonly string[] }[],
): Layout {
  const g = new Graph();
  g.setGraph({
    rankdir: "LR",
    ranker: "network-simplex",
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(concepts.map((c) => c.id));
  const sorted = [...concepts].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const c of sorted) g.setNode(c.id, { width: NODE_W, height: NODE_H });
  const pairs: [string, string][] = [];
  for (const c of sorted) {
    for (const p of [...new Set(c.prerequisites)].sort()) {
      if (ids.has(p) && p !== c.id) pairs.push([p, c.id]);
    }
  }
  pairs.sort((a, b) => (`${a[0]}>${a[1]}` < `${b[0]}>${b[1]}` ? -1 : 1));
  for (const [from, to] of pairs) g.setEdge(from, to);

  layout(g);

  // dagre reports centres and can route edges outside the node box; shift everything into view.
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const grow = (x: number, y: number): void => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const c of sorted) {
    const n = g.node(c.id);
    grow(n.x - NODE_W / 2, n.y - NODE_H / 2);
    grow(n.x + NODE_W / 2, n.y + NODE_H / 2);
  }
  for (const [from, to] of pairs) {
    for (const p of g.edge(from, to).points ?? []) grow(p.x, p.y);
  }
  if (sorted.length === 0) return { width: 0, height: 0, nodes: [], edges: [] };
  const dx = PAD - minX;
  const dy = PAD - minY;

  return {
    width: round1(maxX - minX + 2 * PAD),
    height: round1(maxY - minY + 2 * PAD),
    nodes: sorted.map((c) => {
      const n = g.node(c.id);
      return {
        id: c.id,
        x: round1(n.x - NODE_W / 2 + dx),
        y: round1(n.y - NODE_H / 2 + dy),
        w: NODE_W,
        h: NODE_H,
      };
    }),
    edges: pairs.map(([from, to]) => ({
      from,
      to,
      points: (g.edge(from, to).points ?? []).map((p: { x: number; y: number }) => ({
        x: round1(p.x + dx),
        y: round1(p.y + dy),
      })),
    })),
  };
}
