// Browser side of `npm run review:screens`: reuse or start the Vite server, drive Chrome through
// Playwright, take the screenshots and collect plain page data that lib.ts judges. Nothing here
// applies a threshold. Every child process gets an argument array, never a shell string, and the
// repo path contains spaces. Erasable TypeScript only (run by `node` directly).
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "@playwright/test";
import type { TokenDocument } from "../design/tokens.ts";
import { FONT_KEYS } from "../design/tokens-schema.ts";
import {
  allowedColours,
  type Box,
  type CardContainer,
  type CheckResult,
  type ColourGroup,
  type ControlProbe,
  type EyebrowProbe,
  evalArrowSuffix,
  evalBannedEmoji,
  evalBannedEyebrow,
  evalBannedGlass,
  evalBannedGradient,
  evalBannedStripes,
  evalCardGrid,
  evalControlNames,
  evalFocusVisible,
  evalFontLocal,
  evalHeadingOrder,
  evalLegendPresent,
  evalNoOverflow,
  evalReducedMotion,
  evalStepWords,
  evalTapSize,
  evalTextContrast,
  evalTokenColours,
  evalTransitionAll,
  type FocusStop,
  type FontLocalProbe,
  type HeadingProbe,
  heightFor,
  type MotionProbe,
  type PropertyProbe,
  ReviewUnavailableError,
  type ScreenshotRecord,
  type StepProbe,
  type StripeProbe,
  screenshotName,
  type TapTarget,
  type TextProbe,
  type Theme,
  toResult,
  type Vision,
} from "./lib.ts";

export const DEV_PORT = 5173;
export const PREVIEW_PORT = 4173;

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
  colourGroups: ColourGroup[];
  glass: PropertyProbe[];
  eyebrows: EyebrowProbe[];
  cardContainers: CardContainer[];
  transitionAll: PropertyProbe[];
  ariaLabels: { selector: string; text: string; box: Box; where: "aria-label" }[];
  pitches: StripeProbe[];
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

  // ---- style and token collectors
  const ownText = (el: Element): string =>
    [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  const painted = [...document.querySelectorAll("html, body, body *")].filter(
    (el) => !/^(script|style|noscript|title|desc|meta|link|defs)$/i.test(el.tagName),
  );
  const colourMap = new Map<string, PageData["colourGroups"][number]>();
  const addColour = (el: Element, property: string, value: string) => {
    if (!value || value === "none" || value === "transparent") return;
    const key = `${property}|${value}`;
    let g = colourMap.get(key);
    if (!g) {
      g = { property, value, count: 0, examples: [] };
      colourMap.set(key, g);
    }
    g.count += 1;
    if (g.examples.length < 3) {
      g.examples.push({ selector: selectorOf(el), text: ownText(el), box: boxOf(el) });
    }
  };
  const glass: PageData["glass"] = [];
  const eyebrows: PageData["eyebrows"] = [];
  const cardContainers: PageData["cardContainers"] = [];
  for (const el of painted) {
    if (el.getClientRects().length === 0 || el.closest("canvas")) continue;
    const style = getComputedStyle(el);
    const svgEl = el instanceof SVGElement;
    const text = ownText(el);
    if (!svgEl && (text !== "" || /^(input|select|textarea|button)$/i.test(el.tagName))) {
      addColour(el, "color", style.color);
    }
    if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
      addColour(el, "background-color", style.backgroundColor);
    }
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const w = Number.parseFloat(style.getPropertyValue(`border-${side}-width`));
      const s = style.getPropertyValue(`border-${side}-style`);
      if (w > 0 && s !== "none" && s !== "hidden") {
        addColour(el, "border-color", style.getPropertyValue(`border-${side}-color`));
      }
    }
    if (
      svgEl &&
      /^(path|circle|rect|ellipse|line|polyline|polygon|text|tspan)$/i.test(el.tagName)
    ) {
      // A <line> has no interior, so its fill (black by default) is never painted.
      if (!/^line$/i.test(el.tagName)) addColour(el, "fill", style.fill);
      if (Number.parseFloat(style.strokeWidth) > 0) addColour(el, "stroke", style.stroke);
    }
    const backdrop = style.backdropFilter || style.getPropertyValue("-webkit-backdrop-filter");
    if (backdrop && backdrop !== "none") {
      glass.push({ selector: selectorOf(el), text, box: boxOf(el), value: backdrop });
    }
    if (text !== "" && style.textTransform === "uppercase") {
      const spacing = Number.parseFloat(style.letterSpacing);
      const size = Number.parseFloat(style.fontSize);
      eyebrows.push({
        selector: selectorOf(el),
        text,
        box: boxOf(el),
        textTransform: style.textTransform,
        letterSpacingEm: Number.isFinite(spacing) && size > 0 ? spacing / size : 0,
      });
    }
    if (/grid|flex/.test(style.display) && el.children.length >= 3) {
      const kids = [...el.children].filter((c) => c.getClientRects().length > 0).slice(0, 40);
      if (kids.length >= 3) {
        cardContainers.push({
          selector: selectorOf(el),
          box: boxOf(el),
          children: kids.map((c) => {
            const cs = getComputedStyle(c);
            const r = c.getBoundingClientRect();
            return {
              radius: cs.borderTopLeftRadius,
              shadow: cs.boxShadow,
              background: cs.backgroundColor,
              width: r.width,
              height: r.height,
            };
          }),
        });
      }
    }
  }

  // `transition: all` is read from the authored rules: the computed value is `all` on every element
  // (the default), and the reduced-motion rule zeroes the durations the review emulates.
  const transitionAll: PageData["transitionAll"] = [];
  const marked = new Set<Element>();
  const markAll = (el: Element) => {
    if (marked.has(el)) return;
    marked.add(el);
    transitionAll.push({
      selector: selectorOf(el),
      text: ownText(el),
      box: boxOf(el),
      value: getComputedStyle(el).transitionProperty,
    });
  };
  const namesAll = (v: string) => v.split(",").some((p) => p.trim() === "all");
  for (const el of painted) {
    if (namesAll((el as HTMLElement).style?.transitionProperty ?? "")) markAll(el);
  }
  const STATE_PSEUDO =
    /:{1,2}(?:hover|focus|focus-visible|focus-within|active|disabled|checked|before|after|placeholder|selection)/g;
  const walkRules = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule && namesAll(rule.style.transitionProperty)) {
        for (const sel of [rule.selectorText, rule.selectorText.replace(STATE_PSEUDO, "")]) {
          try {
            const found = document.querySelectorAll(sel);
            if (found.length > 0) {
              for (const el of found) markAll(el);
              break;
            }
          } catch {
            // a selector the page cannot query (nested or vendor): skip it
          }
        }
      }
      if ("cssRules" in rule) walkRules((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      walkRules(sheet.cssRules);
    } catch {
      // a cross-origin sheet cannot be read
    }
  }

  const ariaLabels: PageData["ariaLabels"] = [...document.querySelectorAll("[aria-label]")].map(
    (el) => ({
      selector: selectorOf(el),
      text: el.getAttribute("aria-label") ?? "",
      box: boxOf(el),
      where: "aria-label" as const,
    }),
  );
  const pitches: PageData["pitches"] = [...document.querySelectorAll("[data-pitch]")].map((p) => ({
    paintServers: p.querySelectorAll("pattern, linearGradient, radialGradient").length,
    fieldFills: [...p.querySelectorAll('[data-layer="field"]')].map(
      (f) => getComputedStyle(f).fill,
    ),
    stageImages: [p, p.parentElement]
      .filter((e): e is Element => e !== null)
      .map((e) => getComputedStyle(e).backgroundImage)
      .filter((v) => v !== "none"),
  }));
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
    colourGroups: [...colourMap.values()],
    glass,
    eyebrows,
    cardContainers,
    transitionAll,
    ariaLabels,
    pitches,
  };
}

/** Runs inside the page after a Tab press: the focused element's ring data, or null at the end. */
function collectFocus(): (FocusStop & { key: string }) | null {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const round = (n: number) => Math.round(n * 10) / 10;
  const r = el.getBoundingClientRect();
  const box: [number, number, number, number] = [
    round(r.x + scrollX),
    round(r.y + scrollY),
    round(r.width),
    round(r.height),
  ];
  const style = getComputedStyle(el);
  const surfaceChain: string[] = [];
  for (let a = el.parentElement; a; a = a.parentElement) {
    surfaceChain.push(getComputedStyle(a).backgroundColor);
  }
  const ringStrokes: { color: string; width: number }[] = [];
  for (const ring of el.querySelectorAll("[data-focus-ring]")) {
    if (getComputedStyle(ring).visibility === "hidden") continue;
    for (const shape of [ring, ...ring.querySelectorAll("*")]) {
      const s = getComputedStyle(shape);
      const width = Number.parseFloat(s.strokeWidth);
      if (s.stroke !== "none" && width > 0) ringStrokes.push({ color: s.stroke, width });
    }
  }
  const tag = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "");
  return {
    key: `${tag}@${box.join(",")}`,
    selector: tag + (el.classList.length > 0 ? `.${[...el.classList].slice(0, 2).join(".")}` : ""),
    text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
    box,
    outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
    outlineStyle: style.outlineStyle,
    outlineColor: style.outlineColor,
    boxShadow: style.boxShadow,
    ringStrokes,
    surfaceChain,
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
  /** The theme whose capture supplies the visible text for copy-lint. */
  primaryTheme: Theme;
  /** The active token set; token-colours allows exactly its colours. */
  tokens: TokenDocument;
}

export interface CaptureOutput {
  screenshots: ScreenshotRecord[];
  results: CheckResult[];
  /** Visible text of the primary-theme capture at 1440 (else the widest), for copy-lint. */
  copyText: string;
}

export function urlFor(base: string, route: string, theme: Theme, state: string | null): string {
  const url = new URL(route, base);
  url.searchParams.set("theme", theme);
  if (state) {
    for (const [k, v] of new URLSearchParams(state)) url.searchParams.set(k, v);
  }
  return url.toString();
}

/** Tabs through the first 40 focusable elements and reads each one's focus ring. */
async function collectFocusStops(page: Page): Promise<FocusStop[]> {
  const stops: FocusStop[] = [];
  const seen = new Set<string>();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(collectFocus);
    if (stop === null || seen.has(stop.key)) break;
    seen.add(stop.key);
    const { key: _key, ...rest } = stop;
    stops.push(rest);
  }
  return stops;
}

/** Runs inside the page: animations, transitions and glyph boxes for the reduced-motion check. */
function collectMotion(): {
  animations: MotionProbe["animations"];
  transitions: MotionProbe["transitions"];
  glyphs: Box[];
} {
  const sel = (el: Element | null): string =>
    el
      ? el.tagName.toLowerCase() +
        (el.id ? `#${el.id}` : "") +
        (el.classList.length > 0 ? `.${[...el.classList].slice(0, 2).join(".")}` : "")
      : "document";
  const animations = document
    .getAnimations()
    .filter((a) => a.playState === "running" || a.pending)
    .map((a) => {
      const duration = a.effect?.getComputedTiming().duration;
      const target = (a.effect as KeyframeEffect | null)?.target ?? null;
      return {
        selector: sel(target),
        name: (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? "",
        durationMs: typeof duration === "number" ? duration : 0,
      };
    });
  const transitions: MotionProbe["transitions"] = [];
  for (const el of document.querySelectorAll("body, body *")) {
    const s = getComputedStyle(el);
    if (s.transitionProperty === "none") continue;
    const ms = s.transitionDuration.split(",").map((v) => {
      const n = Number.parseFloat(v);
      return v.trim().endsWith("ms") ? n : n * 1000;
    });
    const longest = Math.max(0, ...ms);
    if (longest > 0 && transitions.length < 20) {
      transitions.push({ selector: sel(el), property: s.transitionProperty, durationMs: longest });
    }
  }
  const glyphs = [...document.querySelectorAll("[data-glyph]")].map((g): Box => {
    const r = g.getBoundingClientRect();
    return [r.x + scrollX, r.y + scrollY, r.width, r.height];
  });
  return { animations, transitions, glyphs };
}

/** Runs inside the page: loads each family and reports whether a face of it is loaded. */
async function collectFonts(names: string[]): Promise<FontLocalProbe["families"]> {
  const out: FontLocalProbe["families"] = [];
  for (const family of names) {
    await document.fonts.load(`16px "${family}"`).catch(() => []);
    const faces = [...document.fonts].filter((f) => f.family.replaceAll('"', "") === family);
    out.push({ family, loaded: faces.some((f) => f.status === "loaded") });
  }
  return out;
}

const VISIONS = ["deuteranopia", "achromatopsia"] as const;

export async function capture(browser: Browser, input: CaptureInput): Promise<CaptureOutput> {
  mkdirSync(input.outDir, { recursive: true });
  const screenshots: ScreenshotRecord[] = [];
  const results: CheckResult[] = [];
  const states: (string | null)[] = [null, ...input.states];
  const families = [...new Set(FONT_KEYS.map((k) => input.tokens.font[k].$value[0] as string))];
  let copyText = "";
  const copyTheme = input.themes.includes(input.primaryTheme)
    ? input.primaryTheme
    : input.themes[0];
  const copyWidth = input.widths.includes(1440) ? 1440 : Math.max(...input.widths);
  const shoot = async (
    page: Page,
    width: number,
    theme: Theme,
    state: string | null,
    vision: Vision,
  ) => {
    const file = screenshotName(width, theme, state, vision);
    const bytes = await page.screenshot({ path: join(input.outDir, file), fullPage: true });
    screenshots.push({
      width,
      theme,
      state,
      vision,
      path: file,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  };

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
          const ctx = { width, theme, state };
          const page = await context.newPage();
          const requests: string[] = [];
          page.on("request", (r) => requests.push(r.url()));
          await page.goto(urlFor(input.baseUrl, input.route, theme, state), {
            waitUntil: "load",
          });
          await page.waitForFunction(
            () => (document.querySelector("#root")?.childElementCount ?? 0) > 0,
            null,
            { timeout: 15_000 },
          );
          // Pages that set data-ready say when their scene is drawn; others are ready at load.
          if ((await page.locator("[data-ready]").count()) > 0) {
            await page.waitForSelector('[data-ready="1"]', { timeout: 10_000 }).catch(() => {});
          }
          await page.evaluate(() => document.fonts.ready);
          await sleep(100);

          // Reduced motion first, before any input: two reads of the glyph boxes 500 ms apart.
          const motion = await page.evaluate(collectMotion);
          await sleep(500);
          const after = await page.evaluate(collectMotion);
          results.push(
            toResult(
              "reduced-motion",
              ctx,
              evalReducedMotion({
                animations: motion.animations,
                transitions: motion.transitions,
                glyphsBefore: motion.glyphs,
                glyphsAfter: after.glyphs,
              }),
            ),
          );
          const fontFamilies = await page.evaluate(collectFonts, families);
          results.push(
            toResult("font-local", ctx, evalFontLocal({ requests, families: fontFamilies })),
          );

          await shoot(page, width, theme, state, "normal");
          // Colour-vision captures: the emulation is Chrome's own, 375 and the plain route only.
          if (width === 375 && state === null) {
            const cdp = await context.newCDPSession(page);
            for (const vision of VISIONS) {
              await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: vision });
              await shoot(page, width, theme, state, vision);
            }
            await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: "none" });
          }

          if (theme === copyTheme && width === copyWidth && state === null) {
            copyText = await page.evaluate(
              // biome-ignore lint/performance/useDomNodeTextContent: the rendered text is what a visitor reads.
              () => document.body.innerText,
            );
          }
          const data = await page.evaluate(collectPage);
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
            toResult(
              "token-colours",
              ctx,
              evalTokenColours(data.colourGroups, allowedColours(input.tokens.resolved[theme])),
            ),
            toResult("banned-glass", ctx, evalBannedGlass(data.glass)),
            toResult(
              "banned-emoji",
              ctx,
              evalBannedEmoji([
                ...data.texts.map((x) => ({
                  selector: x.selector,
                  text: x.text,
                  box: x.box,
                  where: "text" as const,
                })),
                ...data.ariaLabels,
              ]),
            ),
            toResult("banned-stripes", ctx, evalBannedStripes(data.pitches)),
            toResult("banned-transition-all", ctx, evalTransitionAll(data.transitionAll)),
            toResult("banned-eyebrow", ctx, evalBannedEyebrow(data.eyebrows)),
            toResult("card-grid", ctx, evalCardGrid(data.cardContainers)),
            toResult("arrow-suffix", ctx, evalArrowSuffix(data.controls)),
          );
          results.push(
            toResult("focus-visible", ctx, evalFocusVisible(await collectFocusStops(page))),
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
  return { screenshots, results, copyText };
}

export function tokensHash(root: string): string {
  const css = join(root, "src", "styles", "tokens.css");
  if (!existsSync(css)) return "none";
  return createHash("sha256").update(readFileSync(css)).digest("hex").slice(0, 12);
}
