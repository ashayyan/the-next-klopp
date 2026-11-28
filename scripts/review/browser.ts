// Browser side of `npm run review:screens`: reuse or start the Vite server, drive Chrome through
// Playwright, take the screenshots and collect plain page data that lib.ts judges. Nothing here
// applies a threshold. Every child process gets an argument array, never a shell string, and the
// repo path contains spaces. Erasable TypeScript only (run by `node` directly).
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, chromium } from "@playwright/test";
import {
  type Box,
  type CheckResult,
  type ControlProbe,
  evalBannedGradient,
  evalControlNames,
  evalHeadingOrder,
  evalLegendPresent,
  evalNoOverflow,
  evalStepWords,
  evalTapSize,
  evalTextContrast,
  type HeadingProbe,
  heightFor,
  type ScreenshotRecord,
  type StepProbe,
  type TapTarget,
  type TextProbe,
  type Theme,
  toResult,
} from "./lib.ts";

export const DEV_PORT = 5173;
export const PREVIEW_PORT = 4173;

export class ReviewUnavailableError extends Error {}

// ---------------------------------------------------------------- server

export interface RunningServer {
  baseUrl: string;
  kind: "dev" | "preview";
  /** True when this command started the server (and so stops it). */
  started: boolean;
  stop(): Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function answers(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

function stopTree(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill();
  }
}

export const isDevRoute = (route: string): boolean => route === "/dev" || route.startsWith("/dev/");

/**
 * Reuses a server that already answers (and never stops it), else starts Vite: the dev server for
 * `/dev/` routes, `vite preview` (after a build when dist is missing) for the rest.
 */
export async function ensureServer(options: {
  route: string;
  port: number | null;
  root?: string;
}): Promise<RunningServer> {
  const root = options.root ?? process.cwd();
  const kind = isDevRoute(options.route) ? "dev" : "preview";
  const defaultPort = kind === "dev" ? DEV_PORT : PREVIEW_PORT;
  const port = options.port ?? Number(process.env.REVIEW_PORT ?? defaultPort);
  const baseUrl = `http://localhost:${port}`;
  const timeout = Number(process.env.REVIEW_START_TIMEOUT_MS ?? 60_000);

  if (await answers(`${baseUrl}/`)) {
    return { baseUrl, kind, started: false, stop: async () => {} };
  }

  const vite = join(root, "node_modules", "vite", "bin", "vite.js");
  if (kind === "preview" && !existsSync(join(root, "dist", "index.html"))) {
    const build = spawnSync(process.execPath, [vite, "build"], { cwd: root, stdio: "inherit" });
    if (build.status !== 0) {
      throw new ReviewUnavailableError("review:screens could not build the app for vite preview.");
    }
  }
  // Vite 8 refuses a second server per project unless the lock is bypassed. A port other than the
  // default means another server (often the learner's) is running, so bypass it and leave it alone.
  const lock = port === defaultPort ? [] : ["--bypass-lock"];
  const child = spawn(
    process.execPath,
    [
      vite,
      ...(kind === "preview" ? ["preview"] : []),
      "--port",
      String(port),
      "--strictPort",
      "--host",
      "localhost",
      ...lock,
    ],
    { cwd: root, stdio: ["ignore", "ignore", "pipe"] },
  );
  // Browser console warnings echo through Vite's stderr on every page; keep the tail for a failed start only.
  let serverLog = "";
  child.stderr?.on("data", (d: Buffer) => {
    serverLog = (serverLog + d.toString()).slice(-2000);
  });
  let exited = false;
  child.on("exit", () => {
    exited = true;
  });
  const server: RunningServer = {
    baseUrl,
    kind,
    started: true,
    stop: async () => {
      stopTree(child);
    },
  };
  const end = Date.now() + timeout;
  for (;;) {
    if (await answers(`${baseUrl}/`)) return server;
    if (exited || Date.now() >= end) {
      await server.stop();
      throw new ReviewUnavailableError(
        `review:screens could not reach ${baseUrl}. Start the server with npm run dev (or npm run preview), or pass --port.${serverLog.trim() === "" ? "" : `\nServer output:\n${serverLog.trim()}`}`,
      );
    }
    await sleep(200);
  }
}

// ---------------------------------------------------------------- browser

export async function launchChrome(): Promise<Browser> {
  const wanted = process.env.REVIEW_CHANNEL;
  const channels: (string | undefined)[] = wanted ? [wanted] : ["chrome", "msedge", undefined];
  const errors: string[] = [];
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (e) {
      errors.push(`${channel ?? "bundled chromium"}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  throw new ReviewUnavailableError(
    `review:screens could not start a browser (${errors.join("; ")}). Install Chrome, or run: npx playwright install chromium`,
  );
}

// ---------------------------------------------------------------- page-side collection

interface PageData {
  scrollWidth: number;
  innerWidth: number;
  gradients: { selector: string; text: string; box: Box; backgroundImage: string }[];
  targets: TapTarget[];
  texts: TextProbe[];
  headings: HeadingProbe[];
  controls: ControlProbe[];
  glyphCount: number;
  legendVisible: boolean;
  steps: StepProbe[];
}

/** Runs inside the page: returns plain data only. Self-contained, Playwright serialises it. */
function collectPage(): PageData {
  const round = (n: number) => Math.round(n * 10) / 10;
  const selectorOf = (el: Element): string => {
    const parts: string[] = [];
    let node: Element | null = el;
    for (let depth = 0; node && depth < 4 && node !== document.documentElement; depth += 1) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${part}#${node.id}`);
        break;
      }
      const cls = [...node.classList].slice(0, 2);
      if (cls.length > 0) part += `.${cls.join(".")}`;
      const parent: Element | null = node.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => c.tagName === node?.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(" > ");
  };
  const boxOf = (el: Element): [number, number, number, number] => {
    const r = el.getBoundingClientRect();
    return [round(r.x + scrollX), round(r.y + scrollY), round(r.width), round(r.height)];
  };

  const gradients: PageData["gradients"] = [];
  for (const el of document.querySelectorAll("html, body, body *")) {
    for (const pseudo of [null, "::before", "::after"]) {
      const bg = getComputedStyle(el, pseudo).backgroundImage;
      if (bg && bg !== "none" && /gradient\(/i.test(bg)) {
        gradients.push({
          selector: selectorOf(el) + (pseudo ?? ""),
          text: (el.textContent ?? "").trim().slice(0, 60),
          box: boxOf(el),
          backgroundImage: bg,
        });
      }
    }
  }

  const CONTROLS =
    'a[href], button, input:not([type="hidden"]), select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=slider], [role=option], [role=menuitem], [tabindex]:not([tabindex="-1"])';
  const shown = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  };
  const textOf = (el: Element): string =>
    // biome-ignore lint/performance/useDomNodeTextContent: innerText is wanted, it skips hidden text.
    ((el as HTMLElement).innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim();

  const controlEls = [...document.querySelectorAll(CONTROLS)].filter(shown);
  // A checkbox or radio wrapped by its label is hit through the label, so the label's box counts.
  const hitBox = (el: Element): [number, number, number, number] => {
    const label = (el as HTMLInputElement).labels?.[0];
    return label && shown(label) ? boxOf(label) : boxOf(el);
  };
  const targets: PageData["targets"] = controlEls.map((el) => ({
    selector: selectorOf(el),
    text: textOf(el),
    box: hitBox(el),
    runningText: el.tagName === "A" && el.closest("p, li") !== null,
  }));
  const controls: PageData["controls"] = controlEls.map((el) => {
    const labelledBy = (el.getAttribute("aria-labelledby") ?? "")
      .split(/\s+/)
      .map((id) => (id ? (document.getElementById(id)?.textContent ?? "") : ""))
      .join(" ");
    const labels = "labels" in el ? [...((el as HTMLInputElement).labels ?? [])] : [];
    const own = el as HTMLInputElement;
    return {
      selector: selectorOf(el),
      text: textOf(el) || (/^(button|submit|reset)$/.test(own.type ?? "") ? (own.value ?? "") : ""),
      box: boxOf(el),
      ariaLabel: el.getAttribute("aria-label") ?? "",
      labelledByText: labelledBy,
      labelText: labels.map((l) => l.textContent ?? "").join(" "),
      title: el.getAttribute("title") ?? el.querySelector("svg > title")?.textContent ?? "",
      alt: el.getAttribute("alt") ?? el.querySelector("img[alt]")?.getAttribute("alt") ?? "",
    };
  });

  const texts: PageData["texts"] = [];
  const seen = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !(n.textContent ?? "").trim()) continue;
    if (/^(script|style|noscript|title|desc)$/i.test(el.tagName)) continue;
    seen.add(el);
    if (!shown(el)) continue;
    const style = getComputedStyle(el);
    const svg = el instanceof SVGElement;
    const chain: string[] = [];
    for (let a: Element | null = el; a; a = a.parentElement) {
      chain.push(getComputedStyle(a).backgroundColor);
    }
    texts.push({
      selector: selectorOf(el),
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
      box: boxOf(el),
      color: svg ? style.fill : style.color,
      bgChain: chain,
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: Number.parseInt(style.fontWeight, 10) || 400,
      exempt:
        // Text drawn on a pitch or glyph sits on SVG shapes, not on a CSS background; the palette
        // gate covers those pairs (player ink on team fills), so the DOM check skips them.
        el.closest("[data-pitch], [data-glyph]") !== null ||
        el.closest(":disabled, [aria-disabled='true']") !== null,
    });
  }

  const headings: PageData["headings"] = [
    ...document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role=heading]"),
  ]
    .filter(shown)
    .map((el) => ({
      level: /^h[1-6]$/i.test(el.tagName)
        ? Number(el.tagName.slice(1))
        : Number(el.getAttribute("aria-level") ?? 2),
      text: textOf(el),
      selector: selectorOf(el),
    }));

  const legendVisible = [...document.querySelectorAll("[data-legend]")].some(shown);
  const steps: PageData["steps"] = [...document.querySelectorAll("[data-lesson-step]")].map(
    (el) => ({
      selector: selectorOf(el),
      text: textOf(el),
      box: boxOf(el),
    }),
  );
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    gradients,
    targets,
    texts,
    headings,
    controls,
    glyphCount: document.querySelectorAll("[data-glyph]").length,
    legendVisible,
    steps,
  };
}

// ---------------------------------------------------------------- capture

export interface CaptureInput {
  baseUrl: string;
  route: string;
  widths: number[];
  themes: Theme[];
  states: string[];
  outDir: string;
}

export interface CaptureOutput {
  screenshots: ScreenshotRecord[];
  results: CheckResult[];
}

const stateSlug = (state: string): string =>
  state
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function urlFor(base: string, route: string, theme: Theme, state: string | null): string {
  const url = new URL(route, base);
  url.searchParams.set("theme", theme);
  if (state) {
    for (const [k, v] of new URLSearchParams(state)) url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function capture(browser: Browser, input: CaptureInput): Promise<CaptureOutput> {
  mkdirSync(input.outDir, { recursive: true });
  const screenshots: ScreenshotRecord[] = [];
  const results: CheckResult[] = [];
  const states: (string | null)[] = [null, ...input.states];
  for (const theme of input.themes) {
    for (const width of input.widths) {
      for (const state of states) {
        const context = await browser.newContext({
          viewport: { width, height: heightFor(width) },
          colorScheme: theme,
          reducedMotion: "reduce",
          deviceScaleFactor: 1,
        });
        try {
          const page = await context.newPage();
          await page.goto(urlFor(input.baseUrl, input.route, theme, state), {
            waitUntil: "load",
          });
          await page.waitForFunction(
            () => (document.querySelector("#root")?.childElementCount ?? 0) > 0,
            null,
            {
              timeout: 15_000,
            },
          );
          // Pages that set data-ready say when their scene is drawn; others are ready at load.
          if ((await page.locator("[data-ready]").count()) > 0) {
            await page.waitForSelector('[data-ready="1"]', { timeout: 10_000 }).catch(() => {});
          }
          await page.evaluate(() => document.fonts.ready);
          await sleep(100);

          const file = `${width}-${theme}${state ? `-${stateSlug(state)}` : ""}.png`;
          const bytes = await page.screenshot({ path: join(input.outDir, file), fullPage: true });
          screenshots.push({
            width,
            theme,
            state,
            vision: "normal",
            path: file,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          });

          const data = await page.evaluate(collectPage);
          const ctx = { width, theme, state };
          results.push(
            toResult("no-overflow", ctx, evalNoOverflow(data)),
            toResult("banned-gradient", ctx, evalBannedGradient(data.gradients)),
            toResult("tap-size", ctx, evalTapSize(data.targets)),
            toResult("text-contrast", ctx, evalTextContrast(data.texts)),
            toResult("heading-order", ctx, evalHeadingOrder(data.headings)),
            toResult("control-names", ctx, evalControlNames(data.controls)),
            toResult(
              "legend-present",
              ctx,
              evalLegendPresent({ glyphCount: data.glyphCount, legendVisible: data.legendVisible }),
            ),
            toResult("step-words", ctx, evalStepWords(data.steps)),
          );
          if (width === 375) {
            await page.setViewportSize({ width: 320, height: heightFor(width) });
            await sleep(100);
            const narrow = await page.evaluate(() => ({
              scrollWidth: document.documentElement.scrollWidth,
              innerWidth: window.innerWidth,
            }));
            results.push(
              toResult("no-overflow", { width: 320, theme, state }, evalNoOverflow(narrow)),
            );
          }
        } finally {
          await context.close();
        }
      }
    }
  }
  return { screenshots, results };
}

export function tokensHash(root: string): string {
  const css = join(root, "src", "styles", "tokens.css");
  if (!existsSync(css)) return "none";
  return createHash("sha256").update(readFileSync(css)).digest("hex").slice(0, 12);
}
