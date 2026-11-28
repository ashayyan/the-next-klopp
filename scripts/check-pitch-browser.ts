// CLI: npm run check:pitch
// Starts the Vite dev server on 5173, opens /dev/pitch in headless Edge (else Chrome) over the
// DevTools protocol and prints one "ok …" or "FAIL …" line per check. Screenshots go to
// test-results/pitch/ (git-ignored review artefacts, not baselines).
// Exit 0 when every check passes, 1 when one fails, 2 when no browser is installed.
// No new dependency: Node 24 globals plus scripts/lib/cdp.ts. Erasable TypeScript only.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import {
  type Cdp,
  findBrowser,
  type LaunchedBrowser,
  launchBrowser,
  sleep,
  waitFor,
} from "./lib/cdp.ts";

// 5173 is the dev port (ADR 0005). CHECK_PITCH_PORT moves the check to another port when a dev
// server the learner is using already holds 5173; the check never stops someone else's server.
const PORT = Number(process.env.CHECK_PITCH_PORT ?? 5173);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  console.error(
    `CHECK_PITCH_PORT must be an integer from 1024 to 65535, got ${process.env.CHECK_PITCH_PORT}`,
  );
  process.exit(2);
}
const BASE = `http://localhost:${PORT}`;
const SHOTS = join(process.cwd(), "test-results", "pitch");

const results: { ok: boolean; line: string }[] = [];

function report(ok: boolean, name: string, detail = ""): void {
  const line = `${ok ? "ok" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`;
  results.push({ ok, line });
  console.log(line);
}

// ---------------------------------------------------------------- dev server

async function portInUse(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

function startVite(): { child: ChildProcess; state: { code: number | null } } {
  const vite = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
  // Vite 8 refuses a second dev server for the same project (command lock in node_modules/.vite).
  // On a CHECK_PITCH_PORT run the other server is the learner's, so the lock is bypassed; the
  // pre-bundled deps are only read, the lockfile has not changed, so neither server re-optimises.
  const lock = PORT === 5173 ? [] : ["--bypass-lock"];
  const child = spawn(
    process.execPath,
    [vite, "--port", String(PORT), "--strictPort", "--host", "localhost", ...lock],
    {
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  const state: { code: number | null } = { code: null };
  child.on("exit", (code) => {
    state.code = code ?? 1;
  });
  return { child, state };
}

function stopVite(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill();
  }
}

// ---------------------------------------------------------------- page helpers

interface PageOptions {
  width: number;
  height?: number;
  dpr?: number;
  reducedMotion?: boolean;
}

class Page {
  readonly tab: Cdp;
  problems: string[] = [];
  private loaded = false;
  constructor(tab: Cdp) {
    this.tab = tab;
    tab.on((m) => {
      if (m.method === "Page.loadEventFired") this.loaded = true;
      else if (m.method === "Runtime.exceptionThrown") {
        const d = m.params?.exceptionDetails as {
          text?: string;
          exception?: { description?: string };
        };
        this.problems.push(`exception: ${d?.exception?.description ?? d?.text ?? "unknown"}`);
      } else if (m.method === "Runtime.consoleAPICalled" && m.params?.type === "error") {
        const args = (m.params?.args as { value?: unknown; description?: string }[]) ?? [];
        const text = args.map((a) => String(a.value ?? a.description ?? "")).join(" ");
        this.problems.push(`console.error: ${text.slice(0, 200)}`);
      }
    });
  }

  async init(): Promise<void> {
    await this.tab.send("Page.enable");
    await this.tab.send("Runtime.enable");
  }

  /** Sets the viewport and media, then loads BASE + path and waits for the pitch title. */
  async goto(path: string, o: PageOptions): Promise<void> {
    await this.tab.send("Emulation.setDeviceMetricsOverride", {
      width: o.width,
      height: o.height ?? 900,
      deviceScaleFactor: o.dpr ?? 1,
      mobile: false,
    });
    await this.tab.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-reduced-motion", value: o.reducedMotion ? "reduce" : "no-preference" },
      ],
    });
    this.loaded = false;
    await this.tab.send("Page.navigate", { url: `${BASE}${path}` });
    await waitFor("the page load event", () => (this.loaded ? true : undefined), 30_000);
    await waitFor(
      "the pitch",
      async () =>
        (await this.eval<boolean>("!!document.querySelector('[data-canonical-root]')"))
          ? true
          : undefined,
      15_000,
    );
    // One more frame so effects (ResizeObserver, matchMedia) have run.
    await this.eval("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
  }

  async eval<T>(expression: string): Promise<T> {
    const r = (await this.tab.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result?: { value?: T };
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    };
    if (r.exceptionDetails) {
      throw new Error(
        r.exceptionDetails.exception?.description ?? r.exceptionDetails.text ?? "evaluate failed",
      );
    }
    return r.result?.value as T;
  }

  async screenshot(name: string): Promise<string> {
    const metrics = (await this.tab.send("Page.getLayoutMetrics")) as {
      cssContentSize?: { width: number; height: number };
    };
    const size = metrics.cssContentSize ?? { width: 1440, height: 900 };
    const shot = (await this.tab.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: size.width, height: Math.min(size.height, 6000), scale: 1 },
    })) as { data: string };
    const file = join(SHOTS, `${name}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    return file;
  }

  /** Waits until `expression` is truthy in the page. */
  async until(what: string, expression: string, timeoutMs = 15_000): Promise<void> {
    await waitFor(
      what,
      async () => ((await this.eval<boolean>(`!!(${expression})`)) ? true : undefined),
      timeoutMs,
    );
  }

  /** Two animation frames, so React has committed and the browser has painted. */
  async frames(): Promise<void> {
    await this.eval("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
  }

  /** Scrolls the element to the viewport centre and returns its box centre in CSS pixels. */
  async centre(selector: string): Promise<{ x: number; y: number }> {
    const c = await this.eval<{ x: number; y: number } | null>(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: "center", inline: "center" });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    if (!c) throw new Error(`no element ${selector}`);
    await this.frames();
    return c;
  }

  async mouse(
    type: "mouseMoved" | "mousePressed" | "mouseReleased",
    x: number,
    y: number,
    pressed = false,
  ): Promise<void> {
    await this.tab.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: type === "mouseMoved" && !pressed ? "none" : "left",
      buttons: pressed || type === "mousePressed" ? 1 : 0,
      clickCount: type === "mouseMoved" ? 0 : 1,
      pointerType: "mouse",
    });
  }

  /** A real mouse click at the element centre (pointer and click events from the browser). */
  async click(selector: string): Promise<void> {
    const c = await this.centre(selector);
    await this.mouse("mouseMoved", c.x, c.y);
    await this.mouse("mousePressed", c.x, c.y);
    await this.mouse("mouseReleased", c.x, c.y);
    await this.frames();
  }

  async key(key: "Escape" | "ArrowRight"): Promise<void> {
    const code = key === "Escape" ? 27 : 39;
    const base = { key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
    await this.tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
    await this.tab.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  }
}

// ---------------------------------------------------------------- checks

async function checkPitchOnly(page: Page): Promise<void> {
  page.problems = [];
  await page.goto("/dev/pitch?scene=pitch-only", { width: 1440 });
  const title = await page.eval<string>(
    "document.querySelector('[data-pitch] svg[aria-labelledby] > title')?.textContent ?? ''",
  );
  const expected = "Pitch, 105 by 68 metres — Pitch only";
  report(title === expected, "pitch-only: top SVG title", `"${title}"`);
  const file = await page.screenshot("pitch-only-1440");
  await sleep(300);
  report(
    page.problems.length === 0,
    "pitch-only: no console error or exception",
    page.problems.join("; ") || file,
  );
}

/** A scene from the registry has been loaded and drawn (not "Loading scene…"). */
const SCENE_DRAWN = "document.querySelector('[data-layer=\"scene\"]')";

/** Runs in the page: overflow, control sizes and overlaps, legend and note-chip geometry. */
const LAYOUT_PROBE = `(() => {
  const de = document.documentElement;
  const name = (el) =>
    (el.getAttribute("aria-label") || el.getAttribute("name") || el.textContent || el.tagName)
      .trim().slice(0, 40);
  const targets = [];
  const small = [];
  for (const el of document.querySelectorAll("button, select, input, textarea")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    // A radio or checkbox is operated through its label: the label is the target.
    const box = (el.type === "checkbox" || el.type === "radio") ? (el.closest("label") ?? el) : el;
    const r = box.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue; // visually hidden (sr-only)
    if (r.height < 43.99) small.push(name(el) + " " + r.height.toFixed(1) + " px");
    if (!targets.some((t) => t.box === box)) targets.push({ box, r, label: name(el) });
  }
  const overlaps = [];
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i], b = targets[j];
      if (a.box.contains(b.box) || b.box.contains(a.box)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 1 && h > 1) overlaps.push(a.label + " / " + b.label);
    }
  }
  const legend = document.querySelector("[data-legend]");
  const lr = legend.getBoundingClientRect();
  const pr = document.querySelector("[data-pitch]").getBoundingClientRect();
  const sr = document.querySelector("[data-stage]").getBoundingClientRect();
  const chips = [...document.querySelectorAll('[data-part="note-text"]')].map((c) => c.getBoundingClientRect());
  return {
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    controls: targets.length,
    small,
    overlaps,
    legend: {
      w: lr.width, h: lr.height, left: lr.left, top: lr.top,
      display: getComputedStyle(legend).display,
      expanded: legend.getAttribute("data-expanded"),
    },
    pitch: { left: pr.left, right: pr.right, top: pr.top, bottom: pr.bottom },
    stageBottom: sr.bottom,
    chipsOutside: chips.filter((c) => c.left < pr.left - 0.5 || c.right > pr.right + 0.5 || c.top < pr.top - 0.5 || c.bottom > pr.bottom + 0.5).length,
    chips: chips.length,
  };
})()`;

interface LayoutProbe {
  scrollWidth: number;
  clientWidth: number;
  controls: number;
  small: string[];
  overlaps: string[];
  legend: { w: number; h: number; left: number; top: number; display: string; expanded: string };
  pitch: { left: number; right: number; top: number; bottom: number };
  stageBottom: number;
  chipsOutside: number;
  chips: number;
}

function legendVisible(l: LayoutProbe["legend"]): boolean {
  return l.w > 0 && l.h > 0 && l.display !== "none";
}

/** (1) Widths 320, 375, 768, 1440 on the glyph sheet: overflow, 44 px, overlap, legend, chips. */
async function checkWidths(page: Page): Promise<void> {
  for (const width of [320, 375, 768, 1440]) {
    await page.goto("/dev/pitch?scene=glyph-sheet", { width, height: 900 });
    await page.until("the glyph sheet", SCENE_DRAWN);
    await page.frames();
    const a = await page.eval<LayoutProbe>(LAYOUT_PROBE);
    report(
      a.scrollWidth <= a.clientWidth,
      `${width} px: no horizontal scroll`,
      `scrollWidth ${a.scrollWidth}, clientWidth ${a.clientWidth}`,
    );
    report(
      a.small.length === 0 && a.overlaps.length === 0,
      `${width} px: every control at least 44 px tall, none overlapping`,
      a.small.length + a.overlaps.length === 0
        ? `${a.controls} controls`
        : [...a.small, ...a.overlaps.map((o) => `overlap ${o}`)].join("; "),
    );
    const beside = width >= 1024;
    const placed = beside ? a.legend.left >= a.pitch.right - 1 : a.legend.top >= a.stageBottom - 1;
    report(
      legendVisible(a.legend) && a.legend.expanded === "true" && placed,
      `${width} px: Notation expanded, visible, ${beside ? "right of the pitch" : "under the stage"}`,
      `${a.legend.w.toFixed(0)}×${a.legend.h.toFixed(0)} at ${a.legend.left.toFixed(0)},${a.legend.top.toFixed(0)}`,
    );
    report(
      a.chips > 0 && a.chipsOutside === 0,
      `${width} px: note chips inside the pitch`,
      `${a.chips} chip(s), ${a.chipsOutside} outside`,
    );
    const shot = await page.screenshot(`glyph-sheet-${width}`);
    await page.click('[data-legend] button[aria-expanded="true"]');
    const c = await page.eval<LayoutProbe>(LAYOUT_PROBE);
    const label = await page.eval<string>(
      "document.querySelector('[data-legend] button[aria-expanded]')?.textContent ?? ''",
    );
    report(
      legendVisible(c.legend) && c.legend.expanded === "false" && label === "Expand notation",
      `${width} px: Notation collapsed and still visible`,
      `${c.legend.w.toFixed(0)}×${c.legend.h.toFixed(0)}, ${shot}`,
    );
  }
}

/** (2) Canvas backing store = CSS size × devicePixelRatio. */
async function checkCanvasDpr(page: Page): Promise<void> {
  await page.goto("/dev/pitch?scene=glyph-sheet", { width: 768, dpr: 2 });
  await page.until("the density canvas", "document.querySelector('[data-layer=\"canvas\"]')");
  await page.frames();
  const c = await page.eval<{ dpr: number; css: number; cssH: number; w: number; h: number }>(
    `(() => {
      const c = document.querySelector('[data-layer="canvas"]');
      const r = c.getBoundingClientRect();
      return { dpr: devicePixelRatio, css: r.width, cssH: r.height, w: c.width, h: c.height };
    })()`,
  );
  const ok =
    c.dpr === 2 && c.w === Math.floor(c.css * 2) && Math.abs(c.h - Math.floor(c.cssH * 2)) <= 1;
  report(
    ok,
    "DPR 2 at 768 px: canvas backing width = floor(CSS width × 2)",
    `css ${c.css.toFixed(2)} × ${c.cssH.toFixed(2)}, backing ${c.w} × ${c.h}`,
  );
}

/** (3) Vertical orientation: pointer over canonical (11, 34), the left penalty mark. */
async function checkVerticalReadout(page: Page): Promise<void> {
  await page.goto("/dev/pitch?scene=pitch-only", { width: 375, height: 812 });
  const transform = await page.eval<string>(
    "document.querySelector('[data-canonical-root]')?.getAttribute('transform') ?? ''",
  );
  report(
    transform === "matrix(0 -1 1 0 0 105)",
    "375 px Auto: canonical root has the vertical matrix",
    transform || "no transform",
  );
  await page.centre("[data-pitch]");
  const p = await page.eval<{ x: number; y: number }>(`(() => {
    const g = document.querySelector('[data-canonical-root]');
    const q = new DOMPoint(11, 34).matrixTransform(g.getScreenCTM());
    return { x: q.x, y: q.y };
  })()`);
  await page.mouse("mouseMoved", p.x, p.y);
  await page.frames();
  const text = await page.eval<string>(
    "document.querySelector('[data-readout=\"pointer\"]')?.textContent ?? ''",
  );
  report(
    text === "Pointer x 11.00 m · y 34.00 m",
    "375 px vertical: pointer readout at the left penalty mark",
    `"${text}" at screen ${p.x.toFixed(2)}, ${p.y.toFixed(2)}`,
  );
  await page.mouse("mouseMoved", 1, 1);
}

const BALL = `(() => {
  const c = document.querySelector('[data-glyph="ball"] circle');
  return c ? c.getAttribute("cx") + "," + c.getAttribute("cy") : "";
})()`;

const TIME =
  "document.querySelector('[role=\"toolbar\"][aria-label=\"Playback\"] output')?.textContent ?? ''";

/** (4) Reconstruction: starts at 0.0 s, still before Play, moves after Play, ends at Replay. */
async function checkPlayback(page: Page): Promise<void> {
  await page.goto("/dev/pitch?scene=reconstruction", { width: 1440 });
  await page.until(
    "the reconstruction",
    `${SCENE_DRAWN} && document.querySelector('[aria-label="Play sequence"]')`,
  );
  const smooth = await page.eval<boolean>(
    'document.querySelector(\'input[name="motion"][value="smooth"]\')?.checked === true',
  );
  report(smooth, "reconstruction: Motion defaults to Smooth without reduced motion");
  const time = await page.eval<string>(TIME);
  const before = await page.eval<string>(BALL);
  await sleep(500);
  const still = await page.eval<string>(BALL);
  report(
    time.startsWith("0.0 s") && before !== "" && still === before,
    "reconstruction: starts at 0.0 s and nothing moves before Play",
    `"${time}", ball ${before}`,
  );
  await page.click('[aria-label="Play sequence"]');
  await sleep(1000);
  const moved = await page.eval<string>(BALL);
  report(moved !== before, "reconstruction: the ball moves after Play", `${before} to ${moved}`);
  const duration = Number(/\/ ([\d.]+) s/.exec(time)?.[1] ?? 30);
  const t0 = Date.now();
  let replay = false;
  try {
    await page.until(
      "Replay sequence",
      "document.querySelector('[aria-label=\"Replay sequence\"]')",
      (duration + 10) * 1000,
    );
    replay = true;
  } catch {
    replay = false;
  }
  report(
    replay,
    "reconstruction: playback reaches Replay sequence",
    `${duration.toFixed(1)} s scene, ended after ${((Date.now() - t0) / 1000 + 1).toFixed(1)} s, readout "${await page.eval<string>(TIME)}"`,
  );
}

/** (5) Reduced motion: Stepped by default, nothing moves before Play, every transition 0 s. */
async function checkReducedMotion(page: Page): Promise<void> {
  await page.goto("/dev/pitch?scene=reconstruction", { width: 1440, reducedMotion: true });
  await page.until(
    "the reconstruction",
    `${SCENE_DRAWN} && document.querySelector('[aria-label="Play sequence"]')`,
  );
  await page.frames();
  const r = await page.eval<{ matches: boolean; stepped: boolean; play: string; moving: string[] }>(
    `(() => {
      const moving = [];
      for (const el of document.querySelectorAll("*")) {
        const d = getComputedStyle(el).transitionDuration.split(",").map(parseFloat);
        if (d.some((v) => v > 0)) moving.push(el.tagName.toLowerCase());
      }
      return {
        matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
        stepped: document.querySelector('input[name="motion"][value="stepped"]')?.checked === true,
        play: getComputedStyle(document.querySelector('[aria-label="Play sequence"]')).transitionDuration,
        moving,
      };
    })()`,
  );
  report(r.matches && r.stepped, "reduced motion: the Stepped radio is checked by default");
  const before = await page.eval<string>(BALL);
  await sleep(500);
  const after = await page.eval<string>(BALL);
  report(
    before !== "" && after === before,
    "reduced motion: the ball has not moved 500 ms after load",
    before,
  );
  report(
    r.play === "0s" && r.moving.length === 0,
    "reduced motion: Play button and every element have transition-duration 0s",
    `Play ${r.play}, ${r.moving.length} element(s) with a transition`,
  );
}

function boardPosition(label: string): { x: number; y: number } | null {
  const m = /x (-?[\d.]+) metres, y (-?[\d.]+) metres/.exec(label);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

/** (6) Board: drag moves a player, Escape restores it, ArrowRight nudges x by 1.0 m. */
async function checkBoard(page: Page): Promise<void> {
  await page.goto("/dev/pitch?scene=board", { width: 1440 });
  await page.until("a draggable player", "document.querySelector('[data-draggable]')");
  const id = await page.eval<string>(
    "document.querySelector('[data-draggable]').getAttribute('data-entity')",
  );
  const handle = `[data-draggable][data-entity="${id}"]`;
  const read = async () =>
    boardPosition(
      await page.eval<string>(`document.querySelector('${handle}').getAttribute('aria-label')`),
    );

  const drag = async (dx: number, dy: number, cancelWithEscape: boolean) => {
    const c = await page.centre(`${handle} [data-hit]`);
    await page.mouse("mouseMoved", c.x, c.y);
    await page.mouse("mousePressed", c.x, c.y);
    for (let i = 1; i <= 6; i++) {
      await page.mouse("mouseMoved", c.x + (dx * i) / 6, c.y + (dy * i) / 6, true);
    }
    await page.frames();
    if (cancelWithEscape) {
      await page.key("Escape");
      await page.frames();
    }
    await page.mouse("mouseReleased", c.x + dx, c.y + dy);
    await page.frames();
  };

  const start = await read();
  await drag(60, 0, false);
  const dropped = await read();
  report(
    start !== null && dropped !== null && (dropped.x !== start.x || dropped.y !== start.y),
    "board: a 60 px drag moves the first player",
    `${id} ${JSON.stringify(start)} to ${JSON.stringify(dropped)}`,
  );
  await drag(0, 60, true);
  const restored = await read();
  report(
    dropped !== null && restored !== null && restored.x === dropped.x && restored.y === dropped.y,
    "board: Escape before mouse up restores the start position",
    JSON.stringify(restored),
  );
  await page.eval(`document.querySelector('${handle}').focus()`);
  await page.key("ArrowRight");
  await page.frames();
  const nudged = await read();
  report(
    restored !== null &&
      nudged !== null &&
      Math.abs(nudged.x - restored.x - 1) < 1e-9 &&
      nudged.y === restored.y,
    "board: ArrowRight nudges x by 1.0 m",
    `${restored?.x} to ${nudged?.x}`,
  );
  await sleep(700);
  const said = await page.eval<string>(
    "document.querySelector('[data-readout=\"announcement\"]')?.textContent ?? ''",
  );
  report(
    /moved to x [\d.]+ m, y [\d.]+ m\.$/.test(said),
    "board: the move is announced",
    `"${said}"`,
  );
}

interface FrameStats {
  frames: number;
  meanWorkMs: number;
  fps: number;
  p95IntervalMs: number;
  gapsOver50: number;
}

// 03-RESEARCH Pattern 7 / Assumption A5 thresholds. Work time, not the mean rAF interval: headless
// browsers run rAF at the display rate.
const MAX_MEAN_WORK_MS = 6;
const MAX_P95_INTERVAL_MS = 20;
const MAX_GAPS_OVER_50 = 0;

/** (7) Stress: 22 players and a ball for 5 s; frame statistics within the thresholds. */
async function checkStress(page: Page, browserVersion: string): Promise<FrameStats | null> {
  await page.goto("/dev/pitch?scene=stress", { width: 1440 });
  await page.until(
    "22 players",
    'document.querySelectorAll(\'[data-layer="players"] [data-glyph^="player-"], [data-layer="players"] [data-glyph^="goalkeeper-"]\').length >= 22 && document.querySelector(\'[aria-label="Play sequence"]\')',
  );
  const players = await page.eval<number>(
    'document.querySelectorAll(\'[data-layer="players"] [data-glyph^="player-"], [data-layer="players"] [data-glyph^="goalkeeper-"]\').length',
  );
  await page.click('[aria-label="Play sequence"]');
  await sleep(5000);
  const s = await page.eval<FrameStats | null>(
    "window.__pitchFrameStats ? { ...window.__pitchFrameStats } : null",
  );
  const readout = await page.eval<string>(
    "[...document.querySelectorAll('p')].find((p) => p.textContent.startsWith('Frame time'))?.textContent ?? ''",
  );
  await page.click('[aria-label="Pause sequence"]').catch(() => undefined);
  const cpu = cpus()[0]?.model.trim() ?? "unknown CPU";
  console.log(
    `stress: ${players} players + ball, ${cpu}, ${cpus().length} logical cores, ${browserVersion}`,
  );
  if (!s) {
    report(false, "stress: window.__pitchFrameStats is present");
    return null;
  }
  console.log(
    `stress: frames ${s.frames}, mean work ${s.meanWorkMs.toFixed(3)} ms, fps ${s.fps.toFixed(1)}, p95 interval ${s.p95IntervalMs.toFixed(2)} ms, gaps over 50 ms ${s.gapsOver50}; readout "${readout}"`,
  );
  report(
    players === 22 && s.frames > 60,
    "stress: 22 players played for 5 s",
    `${players} players, ${s.frames} frames`,
  );
  report(
    s.meanWorkMs <= MAX_MEAN_WORK_MS,
    `stress: mean work ≤ ${MAX_MEAN_WORK_MS} ms`,
    `${s.meanWorkMs.toFixed(3)} ms`,
  );
  report(
    s.p95IntervalMs <= MAX_P95_INTERVAL_MS,
    `stress: p95 rAF interval ≤ ${MAX_P95_INTERVAL_MS} ms`,
    `${s.p95IntervalMs.toFixed(2)} ms`,
  );
  report(
    s.gapsOver50 <= MAX_GAPS_OVER_50,
    "stress: no rAF interval above 50 ms after warm-up",
    `${s.gapsOver50}`,
  );
  const shown = Number(/Frame time ([\d.]+) ms/.exec(readout)?.[1] ?? Number.NaN);
  report(shown <= 16.7, "stress: frame-time readout at or under 16.7 ms", `"${readout}"`);
  return s;
}

// ---------------------------------------------------------------- main

async function main(): Promise<number> {
  const browserPath = findBrowser();
  if (!browserPath) {
    console.error("no Edge or Chrome found; install one to run the pitch browser check");
    return 2;
  }
  if (await portInUse(`${BASE}/`)) {
    console.error(
      `check:pitch FAILED: ${BASE} is already in use; stop that server or set CHECK_PITCH_PORT`,
    );
    return 1;
  }
  mkdirSync(SHOTS, { recursive: true });

  const vite = startVite();
  let browser: LaunchedBrowser | null = null;
  const stopAll = () => stopVite(vite.child);
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      stopAll();
      // The `finally` below never runs after process.exit, so close the browser here: it kills
      // the msedge process tree and removes the temp profile. Bounded, so Ctrl-C cannot hang.
      void Promise.race([browser?.close(), sleep(10_000)]).finally(() => process.exit(130));
    });
  }
  try {
    await waitFor(
      "the dev server",
      async () => {
        if (vite.state.code !== null)
          throw new Error(`vite exited early (code ${vite.state.code})`);
        const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
        return res.ok ? true : undefined;
      },
      30_000,
    ).catch((e: Error) => {
      if (vite.state.code !== null) throw new Error(`vite exited early (code ${vite.state.code})`);
      throw e;
    });
    browser = await launchBrowser(browserPath);
    const page = new Page(await browser.openPage());
    await page.init();
    const version = (await browser.cdp.send("Browser.getVersion")) as { product?: string };
    console.log(`browser: ${version.product ?? "unknown"} (${browserPath})`);

    await checkPitchOnly(page);
    page.problems = [];
    await checkWidths(page);
    await checkCanvasDpr(page);
    await checkVerticalReadout(page);
    await checkPlayback(page);
    await checkReducedMotion(page);
    await checkBoard(page);
    await checkStress(page, version.product ?? "unknown browser");
    report(
      page.problems.length === 0,
      "all scenes: no console error or exception",
      page.problems.slice(0, 3).join("; "),
    );
  } catch (e) {
    report(false, "check run", (e as Error).message);
  } finally {
    await browser?.close();
    stopAll();
    await sleep(1000);
  }

  const failed = results.filter((r) => !r.ok).length;
  const passed = results.length - failed;
  console.log(`${passed} ok, ${failed} failed; screenshots in ${SHOTS}`);
  return failed === 0 && passed > 0 ? 0 : 1;
}

process.exitCode = await main();
