// Playwright setup. Two projects share one dev server:
//   functional  every spec not tagged @visual; runs anywhere (local Chrome, Linux CI).
//   visual      @visual specs only; baselines are Linux CI artefacts, never written from Windows.
// REVIEW_PORT moves the server off 5173 when a learner-owned dev server already holds it; a port
// other than 5173 starts Vite with --bypass-lock so the two servers do not collide.
import { defineConfig } from "@playwright/test";

const ci = Boolean(process.env.CI);
const port = Number(process.env.REVIEW_PORT ?? 5173);
const baseURL = `http://localhost:${port}`;
const lock = port === 5173 ? "" : " --bypass-lock";

export default defineConfig({
  testDir: "tests",
  // Playwright empties its output folder at the start of every run; keep it apart from the review
  // artefacts that `npm run review:screens` writes under test-results/review/.
  outputDir: "test-results/playwright",
  snapshotPathTemplate: "{testDir}/visual/__baselines__/{arg}-{platform}{ext}",
  // Local runs never write a baseline; CI writes only changed ones, and only on request.
  updateSnapshots: ci && process.env.UPDATE_BASELINES === "1" ? "changed" : "none",
  workers: ci ? 1 : undefined,
  retries: 0,
  reporter: ci ? [["list"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.002 },
  },
  use: {
    baseURL,
    // CI uses the Playwright image's own Chromium; locally the installed Chrome is used.
    channel: ci ? undefined : (process.env.REVIEW_CHANNEL ?? "chrome"),
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort${lock}`,
    url: `${baseURL}/dev`,
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
  projects: [
    { name: "functional", grepInvert: /@visual/ },
    { name: "visual", grep: /@visual/, use: { reducedMotion: "no-preference" } },
  ],
});
