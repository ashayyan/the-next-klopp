// CLI: npm run check:pitch
// Starts the Vite dev server on 5173, opens /dev/pitch in headless Edge (else Chrome) over the
// DevTools protocol and prints one "ok …" or "FAIL …" line per check. Screenshots go to
// test-results/pitch/ (git-ignored review artefacts, not baselines).
// Exit 0 when every check passes, 1 when one fails, 2 when no browser is installed.
// No new dependency: Node 24 globals plus scripts/lib/cdp.ts. Erasable TypeScript only.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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
      process.exit(130);
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
