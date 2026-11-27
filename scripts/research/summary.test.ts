// Tests for the self-contained research summary page (RSCH-06) built from the mini fixture bundle.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { layoutConcepts } from "./lib/layout.ts";
import { loadResearchBundle } from "./lib/research-io.ts";
import { buildSummaryHtml } from "./lib/summary-html.ts";

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
