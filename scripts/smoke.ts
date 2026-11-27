import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

type Mode = "preview" | "dev";

const mode: Mode = process.argv[2] === "dev" ? "dev" : "preview";
const port = mode === "dev" ? 5173 : 4173;
const base = `http://localhost:${port}`;
const vite = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
const viteArgs =
  mode === "dev"
    ? ["--port", "5173", "--strictPort", "--host", "localhost"]
    : ["preview", "--port", "4173", "--strictPort", "--host", "localhost"];

const children: ChildProcess[] = [];

function start(): { child: ChildProcess; state: { code: number | null } } {
  const child = spawn(process.execPath, [vite, ...viteArgs], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  const state: { code: number | null } = { code: null };
  child.on("exit", (code) => {
    state.code = code ?? 1;
  });
  children.push(child);
  return { child, state };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(url: string, ms: number, state: { code: number | null }): Promise<Response> {
  const end = Date.now() + ms;
  let last = "no response";
  while (Date.now() < end) {
    if (state.code !== null) {
      throw new Error(`vite exited early (code ${state.code}); is port ${port} busy?`);
    }
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      last = `HTTP ${res.status}`;
    } catch (error) {
      last = String(error);
    }
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${url}: ${last}`);
}

function stop(child: ChildProcess, state: { code: number | null }): void {
  if (state.code !== null || child.pid === undefined) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    child.kill();
  }
}

// Refuse to run against a server that was already listening: the first fetch would hit that
// stale process while our own freshly spawned vite fails on strictPort, and the run would pass.
async function portInUse(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

if (await portInUse(`${base}/`)) {
  console.error(`smoke FAILED: ${base} is already in use; stop that server first`);
  process.exit(1);
}

const first = start();
try {
  const res = await waitFor(`${base}/`, 30_000, first.state);
  if (!(await res.text()).includes('id="root"')) {
    throw new Error("home page missing #root");
  }
  if (mode === "preview") {
    const deep = await fetch(`${base}/dev`);
    if (!deep.ok) throw new Error(`/dev returned HTTP ${deep.status}`);
    console.log(`smoke ok (preview): ${base}/ and /dev`);
  } else {
    const second = start();
    const end = Date.now() + 20_000;
    while (second.state.code === null && Date.now() < end) {
      await sleep(250);
    }
    if (second.state.code === null) {
      stop(second.child, second.state);
      throw new Error("second dev server did not exit: strictPort not enforced");
    }
    if (second.state.code === 0) {
      throw new Error("second dev server exited 0, expected non-zero");
    }
    console.log(`smoke ok (dev): ${base}/ and duplicate start rejected`);
  }
} catch (error) {
  console.error(`smoke FAILED: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  for (const child of children) {
    stop(child, { code: child.exitCode });
  }
  // Give taskkill a moment so the ports are free when this script returns.
  await sleep(1000);
}
