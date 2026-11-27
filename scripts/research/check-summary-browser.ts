// CLI: node scripts/research/check-summary-browser.ts <html> [--screenshot <png>] [--interact]
// Opens the page in headless Edge (else Chrome) and exits 0 only when the page's own script ran
// under its CSP (data-ready="1") and the browser logged no error. Exit 2 when no browser is installed.
// The browser is driven over the DevTools protocol because `--dump-dom` output does not reach a pipe
// on Windows (the launcher process detaches). Erasable TypeScript only.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitFor<T>(
  what: string,
  fn: () => Promise<T | undefined> | T | undefined,
  timeoutMs: number,
): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      const v = await fn();
      if (v !== undefined) return v;
    } catch {
      // not ready yet
    }
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(150);
  }
}

interface CdpMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
}

class Cdp {
  private nextId = 1;
  private pending = new Map<number, (m: CdpMessage) => void>();
  private listeners: ((m: CdpMessage) => void)[] = [];
  private ws: WebSocket;
  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as CdpMessage;
      if (msg.id !== undefined) this.pending.get(msg.id)?.(msg);
      else for (const l of this.listeners) l(msg);
    });
  }
  static connect(url: string): Promise<Cdp> {
    return new Promise((ok, fail) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => ok(new Cdp(ws)));
      ws.addEventListener("error", () => fail(new Error(`cannot connect to ${url}`)));
    });
  }
  on(listener: (m: CdpMessage) => void): void {
    this.listeners.push(listener);
  }
  send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    return new Promise((ok, fail) => {
      this.pending.set(id, (m) =>
        m.error ? fail(new Error(m.error.message)) : ok(m.result ?? {}),
      );
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close(): void {
    this.ws.close();
  }
}

/** Runs inside the page: drives the real controls and reports every expectation that failed. */
const INTERACTION_SCRIPT = `(async () => {
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };
  const box = document.getElementById("graph-box");
  const nodes = [...document.querySelectorAll("g.node")];
  const title = (g) => g.getAttribute("aria-label").replace(/, Part [A-G]$/, "");
  const panelTitle = () => document.querySelector("#detail h3")?.textContent;
  const viewBox = () => document.getElementById("graph-svg").getAttribute("viewBox").split(" ").map(Number);
  ok(nodes.length > 1, "the graph has nodes");
  ok(box.dataset.view === "focus", "the page starts in the focus view");

  const last = nodes[nodes.length - 1];
  last.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  ok(panelTitle() === title(last), "a click shows the details of " + title(last));
  ok(last.classList.contains("sel"), "the clicked node is marked selected");
  ok(document.querySelectorAll("g.node.dim").length > 0, "the focus view dims the rest");

  nodes[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  ok(panelTitle() === title(nodes[0]), "Enter selects " + title(nodes[0]));
  nodes[1].dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
  ok(panelTitle() === title(nodes[1]), "Space selects " + title(nodes[1]));

  const chips = [...document.querySelectorAll("button.chip")];
  const all = chips.find((c) => c.dataset.part === "all");
  const one = chips.find((c) => c.dataset.part !== "all");
  one.click();
  ok(one.getAttribute("aria-pressed") === "true", "the Part chip is pressed");
  ok(all.getAttribute("aria-pressed") === "false", "All is released");
  for (const g of nodes) {
    ok(g.classList.contains("off") === (g.getAttribute("data-part") !== one.dataset.part), "filter state of " + title(g));
  }
  all.click();
  ok(!nodes.some((g) => g.classList.contains("off")), "All clears the Part filter");

  const toggle = document.getElementById("btn-view");
  toggle.click();
  ok(box.dataset.view === "all", "Show all switches the view");
  ok(!nodes.some((g) => g.classList.contains("dim")), "nothing is dimmed in Show all");
  ok(!document.getElementById("zoom").hidden, "the zoom buttons appear");
  const full = viewBox();
  document.getElementById("zoom-in").click();
  const zoomed = viewBox();
  ok(zoomed[2] < full[2], "zoom in narrows the view box");
  box.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  ok(viewBox()[0] > zoomed[0], "the right arrow pans right");
  document.getElementById("zoom-reset").click();
  ok(viewBox()[2] === full[2], "Reset view restores the whole graph");
  toggle.click();
  ok(box.dataset.view === "focus", "Back to focus view returns to the focus view");
  return fails;
})()`;

function findBrowser(): string | null {
  return BROWSERS.find((p) => existsSync(p)) ?? null;
}

async function run(
  page: string,
  screenshot: string | null,
  interact: boolean,
  browser: string,
): Promise<number> {
  const url = pathToFileURL(page).href;
  const profile = mkdtempSync(join(tmpdir(), "klopp-browser-"));
  const child = spawn(
    browser,
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  child.unref();

  let browserWs: Cdp | null = null;
  try {
    const active = await waitFor(
      "the browser debug port",
      () => {
        const path = join(profile, "DevToolsActivePort");
        if (!existsSync(path)) return undefined;
        const [port, wsPath] = readFileSync(path, "utf8").trim().split(/\r?\n/);
        return port && wsPath ? { port, wsPath } : undefined;
      },
      30_000,
    );
    browserWs = await Cdp.connect(`ws://127.0.0.1:${active.port}${active.wsPath}`);

    const pages = await waitFor(
      "a page target",
      async () => {
        const res = await fetch(`http://127.0.0.1:${active.port}/json/list`);
        const list = (await res.json()) as { type: string; webSocketDebuggerUrl: string }[];
        const found = list.filter((t) => t.type === "page");
        return found.length > 0 ? found : undefined;
      },
      15_000,
    );
    const tab = await Cdp.connect(
      (pages[0] as { webSocketDebuggerUrl: string }).webSocketDebuggerUrl,
    );

    const problems: string[] = [];
    let loaded = false;
    tab.on((m) => {
      if (m.method === "Page.loadEventFired") loaded = true;
      else if (m.method === "Runtime.exceptionThrown") {
        const d = m.params?.exceptionDetails as {
          text?: string;
          exception?: { description?: string };
        };
        problems.push(`exception: ${d?.exception?.description ?? d?.text ?? "unknown"}`);
      } else if (m.method === "Log.entryAdded") {
        const e = m.params?.entry as { level?: string; text?: string; source?: string };
        if (e?.level === "error") problems.push(`${e.source ?? "log"}: ${e.text ?? ""}`);
      } else if (m.method === "Runtime.consoleAPICalled" && m.params?.type === "error") {
        problems.push("console.error called");
      }
    });
    await tab.send("Page.enable");
    await tab.send("Runtime.enable");
    await tab.send("Log.enable");
    await tab.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await tab.send("Page.navigate", { url });
    await waitFor("the page load event", () => (loaded ? true : undefined), 30_000);

    let ready = false;
    try {
      await waitFor(
        'data-ready="1"',
        async () => {
          const r = (await tab.send("Runtime.evaluate", {
            expression: "document.documentElement.dataset.ready",
            returnByValue: true,
          })) as { result?: { value?: string } };
          return r.result?.value === "1" ? true : undefined;
        },
        10_000,
      );
      ready = true;
    } catch {
      ready = false;
    }

    if (screenshot) {
      // Whole page, not just the first 900 px: the reviewer wants all five screens.
      const metrics = (await tab.send("Page.getLayoutMetrics")) as {
        cssContentSize?: { width: number; height: number };
      };
      const size = metrics.cssContentSize ?? { width: 1440, height: 900 };
      const shot = (await tab.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: size.width, height: Math.min(size.height, 6000), scale: 1 },
      })) as { data: string };
      writeFileSync(resolve(screenshot), Buffer.from(shot.data, "base64"));
      console.log(`screenshot: ${resolve(screenshot)}`);
    }
    let interactionFailures: string[] = [];
    if (interact && ready) {
      const r = (await tab.send("Runtime.evaluate", {
        expression: INTERACTION_SCRIPT,
        awaitPromise: true,
        returnByValue: true,
      })) as { result?: { value?: string[] }; exceptionDetails?: { text?: string } };
      interactionFailures = r.result?.value ?? [
        `interaction script threw: ${r.exceptionDetails?.text ?? "unknown"}`,
      ];
    }
    tab.close();

    if (!ready) {
      console.error('page script did not run: data-ready="1" never appeared (CSP or script error)');
      for (const p of problems) console.error(`  ${p}`);
      return 1;
    }
    if (problems.length > 0) {
      console.error("the page ran but the browser logged errors:");
      for (const p of problems) console.error(`  ${p}`);
      return 1;
    }
    if (interactionFailures.length > 0) {
      console.error("interaction checks failed:");
      for (const f of interactionFailures) console.error(`  ${f}`);
      return 1;
    }
    console.log(`ok: page script ran under its CSP with no browser errors (${browser})`);
    if (interact)
      console.log("interactions ok: click, Enter, Space, Part filter, Show all, zoom, pan");
    return 0;
  } finally {
    try {
      await browserWs?.send("Browser.close");
    } catch {
      // the browser may already be gone
    }
    browserWs?.close();
    await sleep(500);
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  let html: string | null = null;
  let screenshot: string | null = null;
  let interact = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--interact") interact = true;
    else if (arg === "--screenshot") screenshot = argv[++i] ?? null;
    else if (arg.startsWith("--screenshot=")) screenshot = arg.slice("--screenshot=".length);
    else if (!html) html = arg;
    else {
      console.error(`unexpected argument: ${arg}`);
      return 2;
    }
  }
  if (!html) {
    console.error(
      "usage: node scripts/research/check-summary-browser.ts <html> [--screenshot <png>] [--interact]",
    );
    return 2;
  }
  const page = resolve(html);
  if (!existsSync(page)) {
    console.error(`no such file: ${page}`);
    return 1;
  }
  const browser = findBrowser();
  if (!browser) {
    console.error("no Edge or Chrome found; install one or open the page by hand");
    return 2;
  }
  try {
    return await run(page, screenshot, interact, browser);
  } catch (e) {
    console.error(`browser check failed: ${(e as Error).message}`);
    return 1;
  }
}

process.exitCode = await main();
