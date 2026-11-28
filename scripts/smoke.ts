import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
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
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
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
    // Synchronous so the process tree is gone before this script exits.
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    child.kill();
  }
}

// A cancelled CI run or Ctrl-C must not orphan vite (and its port).
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    for (const child of children) stop(child, { code: child.exitCode });
    process.exit(130);
  });
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
    // `vite preview` serves the SPA fallback for every path, so a 200 on /dev proves only that deep
    // links resolve, not that the dev route is absent. Absence is checked in the built chunks.
    const deep = await fetch(`${base}/dev`, { signal: AbortSignal.timeout(5000) });
    if (!deep.ok) throw new Error(`deep link /dev returned HTTP ${deep.status}`);
    // Text taken from src/routes/dev.tsx; update both together if that copy changes.
    const devMarker = "left out of the study build";
    // Text taken from the subline in src/routes/dev-pitch.tsx; update both together.
    const devPitchMarker = "Dev view of the canonical pitch";
    const assetsDir = join(process.cwd(), "dist", "assets");
    for (const file of readdirSync(assetsDir).filter((f) => f.endsWith(".js"))) {
      const text = readFileSync(join(assetsDir, file), "utf8");
      if (text.includes(devMarker) || text.includes(devPitchMarker)) {
        throw new Error(`dev route code leaked into dist/assets/${file}`);
      }
    }
    console.log(`smoke ok (preview): ${base}/, SPA fallback, no dev route code in dist/assets`);
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
