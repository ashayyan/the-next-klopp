// Builds the self-contained research summary page (RSCH-06) as one HTML string. Erasable TypeScript only.
// The page is a research artefact, not app UI. It makes no network request: a CSP meta with
// default-src 'none' and a script hash blocks everything, and the data it shows is embedded.
// Strings that came from the web are escaped at build time or set with textContent in the page script
// (summary-page.js, inlined verbatim and hashed).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/** Drop ADR citation tokens like `[src-id#anchor]` and Markdown code backticks for learner text. */
export function plainDecisionText(text: string): string {
  return text
    .replace(/\s*\[src-[^\]]*\](?:\[src-[^\]]*\])*/g, "")
    .replace(/`/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The `## Decision` section of an ADR: its list items, else its non-empty lines. Stops at the
 * next heading of any level, so `###` sub-sections (such as a deny-manifest list) stay out.
 */
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
    if (/^#{2,}\s/.test(line)) break;
    body.push(line.trim());
  }
  const items = body.filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ""));
  const bullets = (items.length > 0 ? items : body.filter((l) => l.length > 0))
    .map(plainDecisionText)
    .filter((b) => b.length > 0);
  return { title, bullets };
}

/** At most `max` words, cut at the last full sentence that fits; an ellipsis only when none fits. */
export function shortSentences(text: string, max: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return esc(words.join(" "));
  const head = words.slice(0, max);
  let end = -1;
  head.forEach((w, i) => {
    if (/[.!?]$/.test(w)) end = i;
  });
  return esc(end >= 0 ? head.slice(0, end + 1).join(" ") : `${head.join(" ")}…`);
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

/** Keep page prose short: at most `max` words, then an ellipsis. Escaped for markup. */
function short(text: string, max = 28): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return esc(words.length > max ? `${words.slice(0, max).join(" ")}…` : words.join(" "));
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

/** The page script: summary-page.js with "\n" line endings. It is hashed into the page CSP. */
export const INLINE_SCRIPT: string = readFileSync(
  join(import.meta.dirname, "summary-page.js"),
  "utf8",
).replace(/\r\n/g, "\n");

export function scriptHash(script: string): string {
  return createHash("sha256").update(script, "utf8").digest("base64");
}

const CSS = `
:root { color-scheme: light; --ink: #1b1b1b; --muted: #55554f; --line: #c9c9c2; --bg: #fbfaf6; --focus: #0b3d91; }
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.5 system-ui, "Segoe UI", sans-serif; color: var(--ink); background: var(--bg); }
.top { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: baseline; padding: 8px 16px; background: var(--bg); border-bottom: 1px solid var(--line); }
.top h1 { font-size: 1rem; margin: 0; }
.top a { color: var(--ink); margin-right: 12px; }
.screen { max-width: 1240px; margin: 0 auto; padding: 24px 16px; border-bottom: 1px solid var(--line); scroll-margin-top: 48px; }
h2 { font-size: 1.3rem; margin: 0 0 12px; }
h3 { font-size: 1.05rem; margin: 16px 0 4px; }
h4 { font-size: 0.9rem; margin: 12px 0 4px; }
p { margin: 0 0 8px; max-width: 70ch; }
.muted { color: var(--muted); }
a { color: var(--focus); }
a:focus-visible, button:focus-visible, [tabindex]:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
button { font: inherit; }
button.linkish { background: none; border: 0; padding: 0; color: var(--focus); text-decoration: underline; cursor: pointer; text-align: left; }
ul.plain { margin: 0 0 12px; padding-left: 20px; max-width: 70ch; }
ul.plain li { margin-bottom: 6px; }
.status { font-size: 1.1rem; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 10px; }
.controls button { border: 2px solid var(--ink); background: #fff; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.controls button[aria-pressed="true"] { background: var(--ink); color: #fff; }
.swatch { display: inline-block; min-width: 22px; padding: 0 4px; margin-right: 6px; border-radius: 3px; text-align: center; font-weight: 700; }
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
.node.dim, .edge.dim { opacity: 0.16; }
.node.off, .edge.off { opacity: 0.07; }
.strip { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.strip li { border: 1px solid var(--line); background: #fff; padding: 8px 12px; min-width: 180px; max-width: 260px; }
.strip .tn { font-weight: 700; margin-right: 6px; }
.strip .tag { display: block; font-size: 0.85rem; color: var(--muted); }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; background: #fff; }
th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #f0efe8; }
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

function swatch(part: string): string {
  const fill = PART_COLOURS[part as Part] ?? "#999999";
  return `<span class="swatch" style="background:${fill};color:${inkFor(fill)}">${esc(part)}</span>`;
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

/** `<` and the two line separators become JSON escapes, so no embedded string can end the data block. */
const JSON_ESCAPES = new Map([
  [0x3c, "003c"],
  [0x2028, "2028"],
  [0x2029, "2029"],
]);

function embedJson(value: unknown): string {
  let out = "";
  for (const ch of JSON.stringify(value)) {
    const hex = JSON_ESCAPES.get(ch.codePointAt(0) as number);
    out += hex ? `${String.fromCharCode(92)}u${hex}` : ch;
  }
  return out;
}

function starterIds(bundle: ResearchBundle): string[] {
  return THREADS.map((t) => bundle.config?.thread_starters[t.track]).filter(
    (id): id is string => id !== undefined,
  );
}

function pageData(bundle: ResearchBundle, layout: Layout, defaultId: string) {
  const cited = new Set(bundle.concepts.flatMap((c) => c.sources));
  const sources: Record<string, { title: string; url: string; status: string }> = {};
  for (const s of [...bundle.sources].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (cited.has(s.id)) sources[s.id] = { title: s.title, url: s.url, status: s.status };
  }
  return {
    defaultId,
    layout: {
      width: layout.width,
      height: layout.height,
      nodes: layout.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h })),
    },
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

function decisionScreen(bundle: ResearchBundle, status: string): string {
  const tracks = new Set(bundle.concepts.map((c) => c.track)).size;
  const labels = THREADS.map((t) => t.label).join(", ");
  return [
    `<section class="screen" id="screen-decision" aria-labelledby="h-decision">`,
    `<h2 id="h-decision">What you approve</h2>`,
    `<ul class="plain">`,
    `<li>The concept map: ${bundle.concepts.length} concepts in ${tracks} tracks, each with prerequisites and sources.</li>`,
    `<li>The study order and the four early threads: ${esc(labels)}.</li>`,
    `<li>The data coverage, the Watch Gym clip decision and the gaps still open.</li>`,
    `</ul>`,
    `<p class="status">Status: <strong>${esc(status)}</strong></p>`,
    `<p class="muted">Approval is recorded in research/APPROVAL.md.</p>`,
    `</section>`,
  ].join("\n");
}

function graphScreen(bundle: ResearchBundle, layout: Layout): string {
  const present = [...new Set(bundle.concepts.map((c) => c.part))].sort();
  const chip = (part: string, label: string, pressed: boolean): string =>
    `<button type="button" class="chip" data-part="${esc(part)}" aria-pressed="${pressed}">${
      part === "all" ? "" : swatch(part)
    }${esc(label)}</button>`;
  return [
    `<section class="screen" id="screen-graph" aria-labelledby="h-graph">`,
    `<h2 id="h-graph">Concept map</h2>`,
    `<p class="muted">Pick a concept to see what it needs first and what it unlocks. The letter in each box is its Part.</p>`,
    `<div class="controls" role="group" aria-label="Filter by Part">${[
      chip("all", "All", true),
      ...present.map((p) => chip(p, `Part ${p}`, false)),
    ].join("")}</div>`,
    `<div class="controls"><button type="button" id="btn-view" aria-pressed="false">Show all</button>` +
      `<span id="zoom" hidden><button type="button" id="zoom-in">Zoom in</button>` +
      `<button type="button" id="zoom-out">Zoom out</button>` +
      `<button type="button" id="zoom-reset">Reset view</button></span></div>`,
    `<div class="graph-wrap">`,
    `<div id="graph-box" data-view="focus" class="graph" tabindex="0" role="group" aria-label="Concept graph. In the Show all view, press the arrow keys to pan and plus or minus to zoom.">${graphSvg(bundle, layout)}</div>`,
    `<aside id="detail" aria-live="polite" aria-label="Concept details"></aside>`,
    `</div>`,
    `</section>`,
  ].join("\n");
}

function curriculumScreen(bundle: ResearchBundle): string {
  const { order, stage } = studyOrder(bundle.concepts, { threadStarters: starterIds(bundle) });
  const byId = new Map(bundle.concepts.map((c) => [c.id, c]));
  const trackStage = new Map<string, number>();
  for (const id of order) {
    const track = (byId.get(id) as { track: string }).track;
    if (!trackStage.has(track)) trackStage.set(track, (stage.get(id) as number) + 1);
  }
  const milestone = new Set(bundle.config?.milestone_1_tracks ?? []);
  const items = [...trackStage].map(([track, firstStage], i) => {
    const concepts = bundle.concepts.filter((c) => c.track === track);
    const part = concepts[0]?.part ?? "A";
    const thread = THREADS.find(
      (t) => t.track === track && bundle.config?.thread_starters[t.track] !== undefined,
    );
    return [
      `<li class="track" data-track="${esc(track)}">`,
      `<span class="tn">${i + 1}</span>${swatch(part)}<strong>${esc(trackTitle(track))}</strong>`,
      `<span class="tag">${concepts.length} ${concepts.length === 1 ? "concept" : "concepts"}, from stage ${firstStage}</span>`,
      thread ? `<span class="tag">Starter: ${esc(thread.label)}</span>` : "",
      milestone.has(track) ? `<span class="tag">Milestone 1</span>` : "",
      `</li>`,
    ].join("");
  });
  return [
    `<section class="screen" id="screen-curriculum" aria-labelledby="h-curriculum">`,
    `<h2 id="h-curriculum">Study order</h2>`,
    `<p class="muted">Tracks appear in the order the concept map lets you reach them, not in track-number order.</p>`,
    `<ol class="strip">${items.join("")}</ol>`,
    `</section>`,
  ].join("\n");
}

interface CoverageGroup {
  provider: string;
  type: string;
  pl: number;
  total: number;
  /** "play" when every row in the group counts plays (Last Row), else "match". */
  unit: "match" | "play";
  unreachable: boolean;
  statuses: string[];
}

function coverageGroups(rows: NonNullable<ResearchBundle["coverage"]>["rows"]): CoverageGroup[] {
  const groups = new Map<string, CoverageGroup>();
  for (const r of rows) {
    const key = `${r.provider}|${r.data_type}`;
    const g = groups.get(key) ?? {
      provider: r.provider,
      type: r.data_type,
      pl: 0,
      total: 0,
      unit: r.unit,
      unreachable: false,
      statuses: [],
    };
    if (r.unit === "match") g.unit = "match";
    if (r.pl_matches === null || r.matches_total === null) g.unreachable = true;
    else {
      g.pl += r.pl_matches;
      g.total += r.matches_total;
    }
    if (!g.statuses.includes(r.status)) g.statuses.push(r.status);
    groups.set(key, g);
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(a.unreachable) - Number(b.unreachable) ||
      b.pl - a.pl ||
      a.provider.localeCompare(b.provider) ||
      a.type.localeCompare(b.type),
  );
}

function countText(n: number, unit: "match" | "play"): string {
  return unit === "play" ? `${n} plays` : String(n);
}

function coverageScreen(bundle: ResearchBundle, decision: Decision): string {
  const out = [
    `<section class="screen" id="screen-coverage" aria-labelledby="h-coverage">`,
    `<h2 id="h-coverage">Data coverage</h2>`,
  ];
  if (bundle.coverage) {
    out.push(
      `<p class="muted">Premier League matches by provider and data type. Checked ${esc(bundle.coverage.generated_at.slice(0, 10))}.</p>`,
      `<div class="table-wrap"><table><thead><tr><th>Provider</th><th>Data type</th><th>Premier League matches</th><th>All matches</th><th>Status</th></tr></thead><tbody>`,
      ...coverageGroups(bundle.coverage.rows).map(
        (g) =>
          `<tr><td>${esc(g.provider)}</td><td>${esc(g.type)}</td><td>${g.unreachable ? "unreachable" : countText(g.pl, g.unit)}</td><td>${g.unreachable ? "unreachable" : countText(g.total, g.unit)}</td><td>${g.unreachable ? "unreachable" : esc(g.statuses.join(", "))}</td></tr>`,
      ),
      `</tbody></table></div>`,
    );
  } else out.push(`<p class="muted">No coverage matrix yet.</p>`);
  out.push(`<h3>Watch Gym clip decision</h3>`);
  if (decision.bullets.length > 0) {
    out.push(
      `<ul class="plain">${decision.bullets.map((b) => `<li>${shortSentences(b, 35)}</li>`).join("")}</ul>`,
    );
  } else out.push(`<p class="muted">No decision written yet.</p>`);
  out.push(`</section>`);
  return out.join("\n");
}

function gapsScreen(bundle: ResearchBundle): string {
  const gaps = bundle.gaps;
  const out = [
    `<section class="screen" id="screen-gaps" aria-labelledby="h-gaps">`,
    `<h2 id="h-gaps">Gaps</h2>`,
  ];
  if (!gaps) {
    out.push(`<p class="muted">No gaps recorded yet.</p>`, `</section>`);
    return out.join("\n");
  }
  out.push(
    `<h3>Deferred domains</h3>`,
    `<div class="table-wrap"><table><thead><tr><th>Domain</th><th>Why deferred</th><th>Must precede</th><th>Research trigger</th></tr></thead><tbody>`,
    ...gaps.deferred_domains.map(
      (d) =>
        `<tr><td>${short(d.name, 12)}</td><td>${short(d.why_deferred)}</td><td>${esc(d.must_precede.join(", "))}</td><td>${short(d.research_trigger, 12)}</td></tr>`,
    ),
    `</tbody></table></div>`,
  );
  if (gaps.pl_coverage_gaps.length > 0) {
    out.push(
      `<h3>Premier League coverage gaps</h3>`,
      `<div class="table-wrap"><table><thead><tr><th>Gap</th><th>Impact</th><th>Mitigation</th></tr></thead><tbody>`,
      ...gaps.pl_coverage_gaps.map(
        (g) =>
          `<tr><td>${short(g.gap)}</td><td>${short(g.impact)}</td><td>${short(g.mitigation)}</td></tr>`,
      ),
      `</tbody></table></div>`,
    );
  }
  out.push(
    `<p class="muted">Unknown licence terms: ${gaps.unknown_licence_sources.length} sources. Competencies with no concept yet: ${gaps.orphan_competencies.length}. As of ${esc(gaps.as_of)}.</p>`,
    `</section>`,
  );
  return out.join("\n");
}

export function buildSummaryHtml(
  bundle: ResearchBundle,
  layout: Layout,
  decision: Decision,
  options: SummaryOptions = {},
): string {
  const starters = starterIds(bundle);
  const { order } = studyOrder(bundle.concepts, { threadStarters: starters });
  const defaultId =
    starters.find((id) => bundle.concepts.some((c) => c.id === id)) ?? order[0] ?? "";
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
    `<header class="top"><h1>Research summary</h1><nav aria-label="Screens"><a href="#screen-decision">1 Approve</a><a href="#screen-graph">2 Concepts</a><a href="#screen-curriculum">3 Order</a><a href="#screen-coverage">4 Data</a><a href="#screen-gaps">5 Gaps</a></nav></header>`,
    "<main>",
    decisionScreen(bundle, options.approvalStatus ?? "pending"),
    graphScreen(bundle, layout),
    curriculumScreen(bundle),
    coverageScreen(bundle, decision),
    gapsScreen(bundle),
    "</main>",
    `<script type="application/json" id="data">${embedJson(pageData(bundle, layout, defaultId))}</script>`,
    `<script>${INLINE_SCRIPT}</script>`,
    "</body>",
    "</html>",
    "",
  ];
  return parts.join("\n");
}
