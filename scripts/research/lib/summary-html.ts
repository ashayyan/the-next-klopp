// Builds the self-contained research summary page (RSCH-06) as one HTML string. Erasable TypeScript only.
// The page is a research artefact, not app UI. It makes no network request: a CSP meta with
// default-src 'none' and a script hash blocks everything, and the data it shows is embedded.
// Strings that came from the web are escaped at build time or set with textContent in the page script.
import { createHash } from "node:crypto";
import { type Part, THREADS, TRACKS } from "./domains.ts";
import { studyOrder } from "./graph.ts";
import type { Layout, LayoutEdge } from "./layout.ts";
import type { ResearchBundle } from "./research-io.ts";

/**
 * Okabe-Ito colour-blind-safe hues for Parts A to G (black and the eighth hue are not used).
 * Source: Okabe and Ito, "Color Universal Design", https://jfly.uni-koeln.de/color/ , palette table
 * read 2026-11-27: orange (230,159,0), sky blue (86,180,233), bluish green (0,158,115),
 * yellow (240,228,66), blue (0,114,178), vermilion (213,94,0), reddish purple (204,121,167).
 * Colour is never the only cue: every node prints its Part letter.
 */
export const PART_COLOURS: Record<Part, string> = {
  A: "#E69F00",
  B: "#56B4E9",
  C: "#009E73",
  D: "#F0E442",
  E: "#0072B2",
  F: "#D55E00",
  G: "#CC79A7",
};

export interface Decision {
  title: string | null;
  bullets: string[];
}

export interface SummaryOptions {
  /** Status line from research/APPROVAL.md; "pending" when that file does not exist. */
  approvalStatus?: string;
}

/** The `## Decision` section of an ADR: its list items, else its non-empty lines. */
export function parseDecision(markdown: string): Decision {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const title =
    lines
      .find((l) => l.startsWith("# "))
      ?.slice(2)
      .trim() ?? null;
  const start = lines.findIndex((l) => /^##\s+Decision\s*$/i.test(l));
  if (start === -1) return { title, bullets: [] };
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    body.push(line.trim());
  }
  const items = body.filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ""));
  const bullets = items.length > 0 ? items : body.filter((l) => l.length > 0);
  return { title, bullets };
}

/** HTML-escape text that goes into the static markup. */
export function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function luminance(hex: string): number {
  const channel = (i: number): number => {
    const v = Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on this fill. */
export function inkFor(fill: string): string {
  return contrastRatio(fill, "#000000") >= contrastRatio(fill, "#FFFFFF") ? "#000000" : "#FFFFFF";
}

const PARTS = Object.keys(PART_COLOURS) as Part[];

/** The page script. Built with createElement and textContent only; no network API is used. */
export const INLINE_SCRIPT = `
(function () {
  "use strict";
  var data = JSON.parse(document.getElementById("data").textContent);
  var byId = new Map(data.concepts.map(function (c) { return [c.id, c]; }));
  var unlocks = new Map();
  data.concepts.forEach(function (c) {
    c.prerequisites.forEach(function (p) {
      if (!unlocks.has(p)) unlocks.set(p, []);
      unlocks.get(p).push(c.id);
    });
  });
  var nodes = new Map();
  document.querySelectorAll("g.node").forEach(function (g) { nodes.set(g.getAttribute("data-id"), g); });
  var panel = document.getElementById("detail");

  function make(tag, text, cls) {
    var e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function link(url, label) {
    if (/^https?:\\/\\//i.test(url)) {
      var a = make("a", label);
      a.href = url;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      return a;
    }
    return make("span", label);
  }

  function jumpList(title, ids) {
    var box = make("div");
    box.appendChild(make("h4", title));
    if (ids.length === 0) {
      box.appendChild(make("p", "None", "muted"));
      return box;
    }
    var ul = make("ul");
    ids.forEach(function (id) {
      var c = byId.get(id);
      var li = make("li");
      var b = make("button", c ? c.title : id, "linkish");
      b.type = "button";
      b.addEventListener("click", function () { select(id); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  function select(id) {
    var c = byId.get(id);
    if (!c) return;
    nodes.forEach(function (g, key) { g.classList.toggle("sel", key === id); });
    panel.textContent = "";
    panel.appendChild(make("h3", c.title));
    panel.appendChild(make("p", "Part " + c.part + ", " + c.trackTitle, "muted"));
    panel.appendChild(make("p", c.summary));
    panel.appendChild(jumpList("Needs first", c.prerequisites));
    panel.appendChild(jumpList("Unlocks", unlocks.get(id) || []));
    var srcBox = make("div");
    srcBox.appendChild(make("h4", "Sources"));
    var ul = make("ul");
    c.sources.forEach(function (sid) {
      var s = data.sources[sid];
      var li = make("li");
      li.appendChild(s ? link(s.url, s.title) : make("span", sid));
      if (s && s.status !== "active") li.appendChild(make("span", " (" + s.status + ")", "muted"));
      ul.appendChild(li);
    });
    srcBox.appendChild(ul);
    panel.appendChild(srcBox);
  }

  nodes.forEach(function (g, id) {
    g.addEventListener("click", function () { select(id); });
    g.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(id); }
    });
  });

  select(data.defaultId);
  document.documentElement.dataset.ready = "1";
})();
`;

export function scriptHash(script: string): string {
  return createHash("sha256").update(script, "utf8").digest("base64");
}

const CSS = `
:root { color-scheme: light; --ink: #1b1b1b; --muted: #55554f; --line: #c9c9c2; --bg: #fbfaf6; --focus: #0b3d91; }
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.5 system-ui, "Segoe UI", sans-serif; color: var(--ink); background: var(--bg); }
.top { position: sticky; top: 0; z-index: 2; display: flex; gap: 20px; align-items: baseline; padding: 8px 16px; background: var(--bg); border-bottom: 1px solid var(--line); }
.top h1 { font-size: 1rem; margin: 0; }
.top a { color: var(--ink); margin-right: 12px; }
.screen { max-width: 1240px; margin: 0 auto; padding: 24px 16px; border-bottom: 1px solid var(--line); }
h2 { font-size: 1.3rem; margin: 0 0 12px; }
h3 { font-size: 1.05rem; margin: 0 0 4px; }
h4 { font-size: 0.9rem; margin: 12px 0 4px; }
.muted { color: var(--muted); margin: 0 0 8px; }
a { color: var(--focus); }
a:focus-visible, button:focus-visible, [tabindex]:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
button { font: inherit; }
button.linkish { background: none; border: 0; padding: 0; color: var(--focus); text-decoration: underline; cursor: pointer; text-align: left; }
.graph-wrap { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
.graph { border: 1px solid var(--line); background: #fff; overflow: hidden; }
.graph svg { display: block; width: 100%; height: 62vh; min-height: 320px; }
#detail { border: 1px solid var(--line); padding: 12px; background: #fff; min-height: 200px; }
#detail ul { margin: 0; padding-left: 18px; }
.node { cursor: pointer; transition: opacity 0.15s; }
.node rect { fill: #fff; stroke-width: 2; }
.node.sel rect { stroke: var(--ink) !important; stroke-width: 4; }
.node:focus { outline: none; }
.node:focus-visible rect { stroke: var(--focus) !important; stroke-width: 5; }
.node text.label { font-size: 12px; fill: var(--ink); }
.node text.part { font-size: 13px; font-weight: 700; text-anchor: middle; }
.edge { fill: none; stroke: #8a8a84; stroke-width: 1.4; transition: opacity 0.15s; }
@media (max-width: 900px) { .graph-wrap { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; scroll-behavior: auto !important; } }
`;

function wrapLabel(title: string): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && `${line} ${w}`.length > 21) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** Smooth cubic path through dagre's routed points (Catmull-Rom converted to Bezier). */
function edgePath(points: LayoutEdge["points"]): string {
  const p = points;
  if (p.length === 0) return "";
  const first = p[0] as { x: number; y: number };
  if (p.length === 1) return `M${first.x} ${first.y}`;
  let d = `M${first.x} ${first.y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)] as { x: number; y: number };
    const p1 = p[i] as { x: number; y: number };
    const p2 = p[i + 1] as { x: number; y: number };
    const p3 = p[Math.min(p.length - 1, i + 2)] as { x: number; y: number };
    const c1x = Math.round((p1.x + (p2.x - p0.x) / 6) * 10) / 10;
    const c1y = Math.round((p1.y + (p2.y - p0.y) / 6) * 10) / 10;
    const c2x = Math.round((p2.x - (p3.x - p1.x) / 6) * 10) / 10;
    const c2y = Math.round((p2.y - (p3.y - p1.y) / 6) * 10) / 10;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

function trackTitle(trackId: string): string {
  return TRACKS.find((t) => t.id === trackId)?.title ?? trackId;
}

function graphSvg(bundle: ResearchBundle, layout: Layout): string {
  const byId = new Map(bundle.concepts.map((c) => [c.id, c]));
  const out: string[] = [
    `<svg id="graph-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Concept graph. Each box is a concept; arrows point from a prerequisite to the concept that needs it.">`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8a8a84"/></marker></defs>`,
    `<g class="edges">`,
  ];
  for (const e of layout.edges) {
    out.push(
      `<path class="edge" data-from="${esc(e.from)}" data-to="${esc(e.to)}" d="${edgePath(e.points)}" marker-end="url(#arrow)"/>`,
    );
  }
  out.push(`</g>`, `<g class="nodes">`);
  for (const n of layout.nodes) {
    const c = byId.get(n.id);
    if (!c) continue;
    const fill = PART_COLOURS[c.part] ?? "#999999";
    const lines = wrapLabel(c.title);
    const text = lines
      .map(
        (l, i) =>
          `<tspan x="${n.x + 34}" y="${n.y + (lines.length === 1 ? n.h / 2 + 4 : 20 + i * 15)}">${esc(l)}</tspan>`,
      )
      .join("");
    out.push(
      `<g class="node" data-id="${esc(c.id)}" data-part="${esc(c.part)}" tabindex="0" role="button" aria-label="${esc(c.title)}, Part ${esc(c.part)}">` +
        `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="4" stroke="${fill}"/>` +
        `<circle cx="${n.x + 17}" cy="${n.y + n.h / 2}" r="11" fill="${fill}"/>` +
        `<text class="part" x="${n.x + 17}" y="${n.y + n.h / 2 + 4.5}" fill="${inkFor(fill)}">${esc(c.part)}</text>` +
        `<text class="label">${text}</text>` +
        `</g>`,
    );
  }
  out.push(`</g>`, `</svg>`);
  return out.join("");
}

/** Only `<` needs escaping inside a JSON data block, plus the two line separators. */
function embedJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, String.raw`\u003c`)
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), String.raw`\u2028`)
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), String.raw`\u2029`);
}

function pageData(bundle: ResearchBundle) {
  const starters = THREADS.map((t) => bundle.config?.thread_starters[t.track]).filter(
    (id): id is string => id !== undefined,
  );
  const { order } = studyOrder(bundle.concepts, { threadStarters: starters });
  const cited = new Set(bundle.concepts.flatMap((c) => c.sources));
  const sources: Record<string, { title: string; url: string; status: string }> = {};
  for (const s of [...bundle.sources].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (cited.has(s.id)) sources[s.id] = { title: s.title, url: s.url, status: s.status };
  }
  return {
    defaultId: starters.find((id) => bundle.concepts.some((c) => c.id === id)) ?? order[0] ?? "",
    concepts: [...bundle.concepts]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((c) => ({
        id: c.id,
        title: c.title,
        track: c.track,
        trackTitle: trackTitle(c.track),
        part: c.part,
        summary: c.summary,
        prerequisites: c.prerequisites,
        sources: c.sources,
      })),
    sources,
  };
}

export function buildSummaryHtml(
  bundle: ResearchBundle,
  layout: Layout,
  _decision: Decision,
  _options: SummaryOptions = {},
): string {
  const csp = `default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'sha256-${scriptHash(INLINE_SCRIPT)}'`;
  const parts = [
    "<!doctype html>",
    `<html lang="en">`,
    "<head>",
    `<meta charset="utf-8">`,
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    "<title>Research summary</title>",
    `<style>${CSS}</style>`,
    "</head>",
    "<body>",
    `<header class="top"><h1>Research summary</h1></header>`,
    "<main>",
    `<section class="screen" id="screen-graph" aria-labelledby="h-graph">`,
    `<h2 id="h-graph">Concept map</h2>`,
    `<div class="graph-wrap"><div class="graph">${graphSvg(bundle, layout)}</div>`,
    `<aside id="detail" aria-live="polite" aria-label="Concept details"></aside></div>`,
    "</section>",
    "</main>",
    `<script type="application/json" id="data">${embedJson(pageData(bundle))}</script>`,
    `<script>${INLINE_SCRIPT}</script>`,
    "</body>",
    "</html>",
    "",
  ];
  return parts.join("\n");
}

export { PARTS };
