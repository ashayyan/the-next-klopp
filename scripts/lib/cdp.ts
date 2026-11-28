// Minimal DevTools-protocol client and headless browser launcher (03-11). No dependency: Node 24's
// global WebSocket and fetch, and the Edge (else Chrome) already installed on the machine.
// Copied from scripts/research/check-summary-browser.ts, which stays unchanged.
// Erasable TypeScript only (run by `node` directly).
//
// Safety (threat T-03-28): the browser runs on a throwaway profile under the OS temp folder, its
// debugging port is bound to 127.0.0.1, and close() kills the process tree and removes the profile.
// Never point this at a real user profile.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Polls `fn` every 100 ms until it returns something other than undefined, or throws on timeout. */
export async function waitFor<T>(
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
    await sleep(100);
  }
}

export interface CdpMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
}

export class Cdp {
  private nextId = 1;
  private pending = new Map<number, (m: CdpMessage) => void>();
  private listeners: ((m: CdpMessage) => void)[] = [];
  private ws: WebSocket;
  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as CdpMessage;
      if (msg.id !== undefined) {
        const reply = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        reply?.(msg);
      } else for (const l of this.listeners) l(msg);
    });
    // A crashed browser closes the socket: fail every call still waiting instead of hanging.
    ws.addEventListener("close", () => {
      for (const reply of [...this.pending.values()]) {
        reply({ error: { message: "the browser connection closed" } });
      }
      this.pending.clear();
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
        m.error ? fail(new Error(`${method}: ${m.error.message}`)) : ok(m.result ?? {}),
      );
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close(): void {
    this.ws.close();
  }
}

export function findBrowser(): string | null {
  return BROWSERS.find((p) => existsSync(p)) ?? null;
}

export interface LaunchedBrowser {
  /** Executable path. */
  path: string;
  /** Debugging port on 127.0.0.1. */
  port: number;
  /** Browser-level connection (Browser.getVersion, Browser.close). */
  cdp: Cdp;
  /** Connects to the first page target. */
  openPage(): Promise<Cdp>;
  /** Closes the browser, kills its process tree and removes the temp profile. Never throws. */
  close(): Promise<void>;
}

/**
 * Kills the process we started and, on Windows, every process still running on our temp profile.
 * msedge.exe as launched often hands off to a child and exits 0 at once, so the child pid alone
 * does not reach the browser; the profile path is unique to this run, so matching it touches
 * nothing but our own processes.
 */
function killTree(child: ChildProcess, profile: string): void {
  if (process.platform === "win32") {
    if (child.pid !== undefined && child.exitCode === null) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    }
    const name = basename(profile).replace(/[^A-Za-z0-9-]/g, "");
    const script = `Get-CimInstance Win32_Process -Filter "Name='${basename(child.spawnfile)}'" | Where-Object { $_.CommandLine -like '*${name}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
      stdio: "ignore",
    });
  } else {
    if (child.pid === undefined || child.exitCode !== null) return;
    try {
      child.kill("SIGKILL");
    } catch {
      // already gone
    }
  }
}

/**
 * Starts a headless browser on a throwaway profile. Arguments go as an array (no shell), so the
 * profile path, which may contain spaces, is one argv element.
 */
export async function launchBrowser(
  path: string,
  extraArgs: string[] = [],
): Promise<LaunchedBrowser> {
  const profile = mkdtempSync(join(tmpdir(), "klopp-cdp-"));
  const child = spawn(
    path,
    [
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-sync",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      ...extraArgs,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let cdp: Cdp | null = null;
  const pages: Cdp[] = [];

  const close = async (): Promise<void> => {
    for (const page of pages) {
      try {
        page.close();
      } catch {
        // already closed
      }
    }
    try {
      await Promise.race([cdp?.send("Browser.close"), sleep(3000)]);
    } catch {
      // the browser may already be gone
    }
    cdp?.close();
    killTree(child, profile);
    await sleep(500);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    } catch (e) {
      // Never let a locked temp folder replace the real result.
      console.error(`could not remove ${profile}: ${(e as Error).message}`);
    }
  };

  try {
    const active = await waitFor(
      "the browser debug port",
      () => {
        const file = join(profile, "DevToolsActivePort");
        if (!existsSync(file)) return undefined;
        const [port, wsPath] = readFileSync(file, "utf8").trim().split(/\r?\n/);
        return port && wsPath ? { port: Number(port), wsPath } : undefined;
      },
      30_000,
    );
    cdp = await Cdp.connect(`ws://127.0.0.1:${active.port}${active.wsPath}`);
    const port = active.port;
    return {
      path,
      port,
      cdp,
      async openPage() {
        const targets = await waitFor(
          "a page target",
          async () => {
            const res = await fetch(`http://127.0.0.1:${port}/json/list`);
            const list = (await res.json()) as { type: string; webSocketDebuggerUrl: string }[];
            const found = list.filter((t) => t.type === "page");
            return found.length > 0 ? found : undefined;
          },
          15_000,
        );
        const page = await Cdp.connect(
          (targets[0] as { webSocketDebuggerUrl: string }).webSocketDebuggerUrl,
        );
        pages.push(page);
        return page;
      },
      close,
    };
  } catch (e) {
    await close();
    throw e;
  }
}
