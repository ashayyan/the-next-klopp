// CLI: npm run review:screens -- <route> [--widths 375,768,1440] [--theme light|dark|both] [--port <n>] [--states <query,query>] [--fixtures]
// Captures a route at each width and theme in Chrome, runs the DOM rule checks and the taste-skill
// review, and writes test-results/review/<route-slug>/report.json, report.md and the screenshots
// (git-ignored artefacts, not baselines). The first line of report.md is "REVIEW: PASS ..." or
// "REVIEW: FAIL ...". Exit 0 pass (warnings allowed), 1 any FAIL, 2 could not run (bad arguments,
// no server, no browser, no taste skill folder).
// Routes under /dev/ use the dev server (REVIEW_PORT, default 5173); other routes use vite preview
// (default 4173), built first so a stale dist/ is never reviewed. A server that already answers is
// reused and never stopped; report.json records the commit and whether the served build was fresh.
// --fixtures reviews the fixtures build instead: it runs scripts/content/build-fixtures.ts and previews
// dist-walker on port 4175 (REVIEW_PORT or --port override), the only build that holds the test lessons.
// Erasable TypeScript only.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  capture,
  ensureServer,
  gitCommit,
  launchChrome,
  type RunningServer,
  tokensHash,
  urlFor,
} from "./review/browser.ts";
import {
  buildReport,
  evalHexInSource,
  exitCodeFor,
  listSourceFiles,
  loadActiveTokens,
  parseArgs,
  ReviewUnavailableError,
  renderReportMd,
  slugRoute,
  type Theme,
  tasteCopyResult,
  tasteLayoutResult,
  toResult,
} from "./review/lib.ts";
import { assertTasteSkill, runCopyLint, runLayoutCheck, tasteBlock } from "./review/taste.ts";

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
    // The skill folder is local only; refuse to start before any server or capture work.
    assertTasteSkill(root);
    const tokens = loadActiveTokens(args.route, root);
    const primary: Theme = tokens.meta.primaryTheme;
    const themes: Theme[] = args.theme === "both" ? ["dark", "light"] : [args.theme];

    server = await ensureServer({
      route: args.route,
      port: args.port,
      root,
      fixtures: args.fixtures,
    });
    browser = await launchChrome();
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    const { screenshots, results, copyText } = await capture(browser, {
      baseUrl: server.baseUrl,
      route: args.route,
      widths: args.widths,
      themes,
      states: args.states,
      outDir,
      primaryTheme: primary,
      tokens,
    });
    results.push(
      toResult(
        "no-hex-in-source",
        { width: null, theme: null, state: null },
        evalHexInSource(listSourceFiles(root)),
      ),
    );

    // Taste skill: once per review, at the primary theme only (about 20 s per run).
    const layout = await runLayoutCheck(root, urlFor(server.baseUrl, args.route, primary, null));
    const copy = await runCopyLint(root, copyText);
    const tasteSkill = tasteBlock(layout, copy);
    results.push(
      tasteLayoutResult(tasteSkill.layout, primary),
      tasteCopyResult(tasteSkill.copy, primary),
    );

    const report = buildReport({
      route: args.route,
      server: server.kind,
      url: new URL(args.route, server.baseUrl).toString(),
      generatedAt: new Date().toISOString(),
      tokensSha256: tokensHash(root),
      source: { commit: gitCommit(root), fresh: server.fresh },
      widths: args.widths,
      themes,
      checks: results,
      screenshots,
      tasteSkill,
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
