// Tests for the self-contained research summary page (RSCH-06) built from the mini fixture bundle.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { THREADS } from "./lib/domains.ts";
import { studyOrder } from "./lib/graph.ts";
import { type Layout, layoutConcepts } from "./lib/layout.ts";
import { loadResearchBundle } from "./lib/research-io.ts";
import {
  buildSummaryHtml,
  contrastRatio,
  inkFor,
  PART_COLOURS,
  parseDecision,
} from "./lib/summary-html.ts";

const MINI = join(import.meta.dirname, "fixtures", "mini");
const DECISION = { title: "Fixture decision", bullets: ["One.", "Two.", "Three."] };

function build(bundle = loadResearchBundle(MINI)): string {
  return buildSummaryHtml(bundle, layoutConcepts(bundle.concepts), DECISION);
}

function inlineScript(html: string): string {
  const m = /<script>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error("no inline script");
  return m[1] as string;
}

describe("self-containment", () => {
  const html = build();

  it("has no external reference or network API", () => {
    expect(html).not.toMatch(/<script\s+[^>]*\bsrc=/i);
    for (const banned of [
      "<link",
      "@import",
      "url(http",
      "fetch(",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "innerHTML",
      "eval(",
    ]) {
      expect(html, banned).not.toContain(banned);
    }
  });

  it("carries a CSP that blocks everything except its own hashed script", () => {
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
    expect(csp).not.toBeNull();
    const policy = csp?.[1] as string;
    expect(policy).toContain("default-src 'none'");
    expect(policy).not.toContain("script-src 'unsafe-inline'");
    const hash = createHash("sha256").update(inlineScript(html), "utf8").digest("base64");
    expect(policy).toContain(`script-src 'sha256-${hash}'`);
  });

  it("only builds nodes with textContent and creates http(s)-only links", () => {
    const script = inlineScript(html);
    expect(script).toContain("textContent");
    expect(script).toContain("noopener noreferrer");
    expect(script).toMatch(/\^https\?:/);
  });
});

describe("graph screen", () => {
  const bundle = loadResearchBundle(MINI);
  const html = build(bundle);

  it("has one focusable button node per concept with its Part letter", () => {
    const nodes = html.match(/<g class="node" [^>]*>/g) ?? [];
    expect(nodes).toHaveLength(bundle.concepts.length);
    for (const n of nodes) {
      expect(n).toContain('tabindex="0"');
      expect(n).toContain('role="button"');
      expect(n).toMatch(/aria-label="[^"]+, Part [A-G]"/);
    }
    expect(html.match(/<text class="part"/g)).toHaveLength(bundle.concepts.length);
  });

  it("is byte-identical across builds", () => {
    expect(build(bundle)).toBe(html);
    expect(html).not.toContain("\r");
  });
});

describe("hostile strings from the web", () => {
  const bundle = loadResearchBundle(MINI);
  const first = bundle.concepts[0];
  if (!first) throw new Error("fixture has no concepts");
  const evil = '</script><img src=x onerror="alert(1)"><b>';
  const hostile = {
    ...bundle,
    concepts: [{ ...first, title: evil, summary: evil }, ...bundle.concepts.slice(1)],
    sources: bundle.sources.map((s, i) => (i === 0 ? { ...s, title: evil } : s)),
  };
  const html = build(hostile);

  it("never lets a title or summary close the script or add markup", () => {
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>");
    const json = /<script type="application\/json" id="data">([\s\S]*?)<\/script>/.exec(html);
    expect(json).not.toBeNull();
    const body = json?.[1] as string;
    expect(body).not.toContain("<");
    const parsed = JSON.parse(body);
    expect(parsed.concepts.some((c: { title: string }) => c.title === evil)).toBe(true);
  });

  it("keeps exactly two script elements", () => {
    expect(html.match(/<script/g)).toHaveLength(2);
  });
});

/** Visible text of an HTML fragment: tags dropped, the few entities the page emits decoded. */
function textOf(fragment: string): string {
  return fragment
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function screenHtml(html: string, id: string): string {
  const m = new RegExp(`<section class="screen" id="screen-${id}"[\\s\\S]*?</section>`).exec(html);
  if (!m) throw new Error(`no screen ${id}`);
  return m[0];
}

function checkLayout(layout: Layout): void {
  const nodes = new Map(layout.nodes.map((n) => [n.id, n]));
  for (const e of layout.edges) {
    const from = nodes.get(e.from);
    const to = nodes.get(e.to);
    expect(from && to, `${e.from} -> ${e.to}`).toBeTruthy();
    expect((to?.x ?? 0) > (from?.x ?? 0), `${e.to} right of ${e.from}`).toBe(true);
  }
  const byX = new Map<number, typeof layout.nodes>();
  for (const n of layout.nodes) byX.set(n.x, [...(byX.get(n.x) ?? []), n]);
  for (const group of byX.values()) {
    const sorted = [...group].sort((a, b) => a.y - b.y);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1] as (typeof sorted)[number];
      const cur = sorted[i] as (typeof sorted)[number];
      expect(cur.y >= prev.y + prev.h, `${prev.id} overlaps ${cur.id}`).toBe(true);
    }
  }
}

const bundleForPage = loadResearchBundle(MINI);

describe("five screens", () => {
  const html = build(bundleForPage);

  it("has at most five screens in the agreed order", () => {
    const ids = [...html.matchAll(/<section class="screen" id="screen-([a-z]+)"/g)].map(
      (m) => m[1],
    );
    expect(ids).toEqual(["decision", "graph", "curriculum", "coverage", "gaps"]);
  });

  it("states what is approved in at most three bullets and shows the status", () => {
    const decision = screenHtml(html, "decision");
    expect(decision.match(/<li>/g)?.length).toBeLessThanOrEqual(3);
    expect(textOf(decision)).toContain("Status: pending");
    const approved = buildSummaryHtml(
      bundleForPage,
      layoutConcepts(bundleForPage.concepts),
      DECISION,
      { approvalStatus: "approved 2026-12-01" },
    );
    expect(textOf(screenHtml(approved, "decision"))).toContain("Status: approved 2026-12-01");
  });

  it("offers a chip per Part present plus All, a focus view and a Show all view", () => {
    const graph = screenHtml(html, "graph");
    const chips = [
      ...graph.matchAll(/<button type="button" class="chip" data-part="([A-Za-z]+)"/g),
    ].map((m) => m[1]);
    const present = [...new Set(bundleForPage.concepts.map((c) => c.part))].sort();
    expect(chips).toEqual(["all", ...present]);
    expect(graph).toContain('id="graph-box" data-view="focus"');
    expect(graph).toContain(">Show all<");
    expect(graph).toContain('id="detail"');
    expect(graph.match(/aria-pressed="true"/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it("lists tracks in study order and marks thread starters and Milestone 1 tracks", () => {
    const curriculum = screenHtml(html, "curriculum");
    const items = [
      ...curriculum.matchAll(/<li class="track" data-track="([a-z0-9-]+)">([\s\S]*?)<\/li>/g),
    ];
    const starters = Object.values(bundleForPage.config?.thread_starters ?? {}).filter(
      (x): x is string => x !== undefined,
    );
    const { order } = studyOrder(bundleForPage.concepts, { threadStarters: starters });
    const byId = new Map(bundleForPage.concepts.map((c) => [c.id, c.track]));
    const expected = [...new Set(order.map((id) => byId.get(id) as string))];
    expect(items.map((m) => m[1])).toEqual(expected);
    for (const t of THREADS) {
      const item = items.find((m) => m[1] === t.track);
      expect(textOf(item?.[2] ?? ""), t.track).toContain(`Starter: ${t.label}`);
    }
    const milestone = bundleForPage.config?.milestone_1_tracks ?? [];
    for (const m of items) {
      const marked = textOf(m[2] as string).includes("Milestone 1");
      expect(marked, m[1]).toBe(milestone.includes(m[1] as string));
    }
  });

  it("shows Premier League matches by provider and the clip decision", () => {
    const coverage = textOf(screenHtml(html, "coverage"));
    expect(coverage).toMatch(/StatsBomb event 380 380 ok/);
    expect(coverage).toMatch(/PFF tracking 0 64 request-only/);
    for (const bullet of DECISION.bullets) expect(coverage).toContain(bullet);

    const rows = (bundleForPage.coverage?.rows ?? []).map((r, i) =>
      i === 0 ? { ...r, status: "unreachable" as const, matches_total: null, pl_matches: null } : r,
    );
    const down = buildSummaryHtml(
      { ...bundleForPage, coverage: bundleForPage.coverage && { ...bundleForPage.coverage, rows } },
      layoutConcepts(bundleForPage.concepts),
      DECISION,
    );
    expect(textOf(screenHtml(down, "coverage"))).toMatch(
      /StatsBomb event unreachable unreachable unreachable/,
    );
  });

  it("lists deferred domains with the track each must precede, and the PL gaps", () => {
    const gaps = textOf(screenHtml(html, "gaps"));
    expect(gaps).toContain("Formations and shapes");
    expect(gaps).toContain("t02-language-of-space");
    expect(gaps).toContain("No open Premier League tracking data exists.");
  });
});

describe("page quality", () => {
  const html = build(bundleForPage);

  it("stays under 1.5 MB and no paragraph, item or cell passes 40 words", () => {
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(1_500_000);
    for (const m of html.matchAll(/<(p|li|td)[ >][\s\S]*?<\/\1>/g)) {
      expect(textOf(m[0]).split(" ").length, textOf(m[0]).slice(0, 60)).toBeLessThanOrEqual(40);
    }
  });

  it("uses seven distinct Okabe-Ito hues and every Part letter reads at 4.5:1", () => {
    const hues = Object.values(PART_COLOURS);
    expect(hues).toHaveLength(7);
    expect(new Set(hues.map((h) => h.toUpperCase())).size).toBe(7);
    for (const hue of hues) {
      expect(contrastRatio(hue, inkFor(hue)), hue).toBeGreaterThanOrEqual(4.5);
    }
    expect(html.match(/<text class="part"/g)).toHaveLength(bundleForPage.concepts.length);
  });
});

describe("layout invariants", () => {
  it("puts every prerequisite left of its dependant with no overlap in a rank (fixture)", () => {
    checkLayout(layoutConcepts(bundleForPage.concepts));
  });

  it("holds on a 60-concept generated graph and is deterministic", () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const concepts = Array.from({ length: 60 }, (_, i) => ({
      id: `n${String(i).padStart(2, "0")}`,
      prerequisites: Array.from({ length: Math.floor(rand() * 4) }, () =>
        i === 0 ? "" : `n${String(Math.floor(rand() * i)).padStart(2, "0")}`,
      ).filter(Boolean),
    }));
    const first = layoutConcepts(concepts);
    checkLayout(first);
    expect(layoutConcepts(concepts)).toEqual(first);
    expect(layoutConcepts([...concepts].reverse())).toEqual(first);
  });
});

describe("parseDecision", () => {
  it("reads the list items of the Decision section", () => {
    const md = "# 0008. Clips\n\n## Decision\n\n- One.\n- Two.\n\n## Consequences\n\n- Not this.\n";
    expect(parseDecision(md)).toEqual({ title: "0008. Clips", bullets: ["One.", "Two."] });
  });

  it("falls back to the lines of the section and to nothing when it is absent", () => {
    expect(parseDecision("# T\n\n## Decision\nWe ship it.\n").bullets).toEqual(["We ship it."]);
    expect(parseDecision("# T\n\n## Status\nAccepted\n").bullets).toEqual([]);
  });
});

describe("headless browser", () => {
  const BROWSERS = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ];
  const hasBrowser = BROWSERS.some((p) => existsSync(p));
  const dir = mkdtempSync(join(tmpdir(), "klopp-summary-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const check = (file: string) =>
    spawnSync(process.execPath, [join(import.meta.dirname, "check-summary-browser.ts"), file], {
      encoding: "utf8",
    });

  it.skipIf(!hasBrowser)(
    "runs the page script under the page CSP",
    () => {
      const file = join(dir, "ok.html");
      writeFileSync(file, build(), "utf8");
      const res = check(file);
      expect(res.status, res.stderr).toBe(0);
    },
    90_000,
  );

  it.skipIf(!hasBrowser)(
    "filters by Part, follows focus, shows all, zooms and pans from the keyboard",
    () => {
      const file = join(dir, "interact.html");
      writeFileSync(file, build(), "utf8");
      const res = spawnSync(
        process.execPath,
        [join(import.meta.dirname, "check-summary-browser.ts"), file, "--interact"],
        { encoding: "utf8" },
      );
      expect(res.status, res.stderr).toBe(0);
      expect(res.stdout).toContain("interactions ok");
    },
    90_000,
  );

  it.skipIf(!hasBrowser)(
    "fails when the CSP hash does not match the script",
    () => {
      const file = join(dir, "bad.html");
      writeFileSync(file, build().replace(/sha256-[A-Za-z0-9+/=]+/, "sha256-AAAA"), "utf8");
      const res = check(file);
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("data-ready");
    },
    90_000,
  );
});

describe("research/ real data", () => {
  const REPO = join(import.meta.dirname, "..", "..");
  const pagePath = join(REPO, "research", "summary", "index.html");
  const run = existsSync(pagePath) || process.env.RESEARCH_GATE === "1";

  it.skipIf(!run)("--check passes and the real page meets the same structural rules", () => {
    const res = spawnSync(
      process.execPath,
      [join(import.meta.dirname, "build-summary.ts"), "--root", "research", "--check"],
      { cwd: REPO, encoding: "utf8" },
    );
    expect(res.status, res.stderr).toBe(0);

    const html = readFileSync(pagePath, "utf8");
    expect(html).not.toMatch(/<script\s+[^>]*\bsrc=/i);
    for (const banned of [
      "<link",
      "@import",
      "url(http",
      "fetch(",
      "XMLHttpRequest",
      "WebSocket",
    ]) {
      expect(html, banned).not.toContain(banned);
    }
    const policy = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(policy).toContain("default-src 'none'");
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";
    const hash = createHash("sha256").update(script, "utf8").digest("base64");
    expect(policy).toContain(`script-src 'sha256-${hash}'`);
    expect(html.match(/<section class="screen"/g)?.length).toBeLessThanOrEqual(5);
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(1_500_000);

    const bundle = loadResearchBundle(join(REPO, "research"));
    expect(html.match(/<g class="node"/g)).toHaveLength(bundle.concepts.length);
    checkLayout(layoutConcepts(bundle.concepts));
  });
});
