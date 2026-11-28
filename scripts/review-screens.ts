// CLI: npm run review:screens -- <route> [--widths 375,768,1440] [--theme light|dark|both] [--port <n>] [--states <query,query>]
// Captures a route at each width and theme in Chrome, runs the DOM rule checks, and writes
// test-results/review/<route-slug>/report.json, report.md and the screenshots (git-ignored
// artefacts, not baselines). The first line of report.md is "REVIEW: PASS ..." or "REVIEW: FAIL ...".
// Exit 0 pass (warnings allowed), 1 any FAIL, 2 could not run (bad arguments, no server, no browser).
// Routes under /dev/ use the dev server (REVIEW_PORT, default 5173); other routes use vite preview
// (default 4173). A server that already answers is reused and never stopped. Erasable TypeScript only.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  capture,
  ensureServer,
  launchChrome,
  ReviewUnavailableError,
  type RunningServer,
  tokensHash,
} from "./review/browser.ts";
import {
  buildReport,
  exitCodeFor,
  parseArgs,
  renderReportMd,
  slugRoute,
  type Theme,
} from "./review/lib.ts";

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if ("error" in args) {
    console.error(args.error);
    return 2;
  }
  const slug = slugRoute(args.route);
  if (slug === null) {
    console.error("Route must start with a slash and contain no traversal, spaces or scheme.");
    return 2;
  }
  const root = process.cwd();
  const outDir = join(root, "test-results", "review", slug);
  const themes: Theme[] = args.theme === "both" ? ["dark", "light"] : [args.theme];

  let server: RunningServer | null = null;
  let browser: Awaited<ReturnType<typeof launchChrome>> | null = null;
  const cleanup = async () => {
    await browser?.close().catch(() => {});
    await server?.stop();
  };
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void cleanup().finally(() => process.exit(130));
    });
  }

  try {
    server = await ensureServer({ route: args.route, port: args.port, root });
    browser = await launchChrome();
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    const { screenshots, results } = await capture(browser, {
      baseUrl: server.baseUrl,
      route: args.route,
      widths: args.widths,
      themes,
      states: args.states,
      outDir,
    });
    const report = buildReport({
      route: args.route,
      server: server.kind,
      url: new URL(args.route, server.baseUrl).toString(),
      generatedAt: new Date().toISOString(),
      tokensSha256: tokensHash(root),
      widths: args.widths,
      themes,
      checks: results,
      screenshots,
    });
    const md = renderReportMd(report);
    writeFileSync(join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(join(outDir, "report.md"), md);
    console.log(md.split("\n")[0]);
    console.log(`report: ${join(outDir, "report.md")}`);
    return exitCodeFor(report);
  } catch (e) {
    if (e instanceof ReviewUnavailableError) {
      console.error(e.message);
      return 2;
    }
    console.error(`review:screens failed: ${(e as Error).message}`);
    return 2;
  } finally {
    await cleanup();
  }
}

process.exitCode = await main();
