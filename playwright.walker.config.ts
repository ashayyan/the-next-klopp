// The lesson walker: one spec reads content/lesson-manifest.json and walks every fixture and every
// shippable or shipped lesson on the fixtures build (dist-walker/, built by
// `node scripts/content/build-fixtures.ts`). Port 4174 only: never 5173 (the learner's dev server)
// or 4173 (the study preview). The main playwright.config.ts ignores tests/walker/**.
import { defineConfig } from "@playwright/test";

const ci = Boolean(process.env.CI);
const baseURL = "http://localhost:4174";

export default defineConfig({
  testDir: "tests/walker",
  // Kept apart from test-results/playwright (main config) and test-results/review (review:screens).
  outputDir: "test-results/walker",
  workers: ci ? 1 : undefined,
  retries: 0,
  reporter: ci ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    // CI uses the Playwright image's own Chromium; locally the installed Chrome is used.
    channel: ci ? undefined : (process.env.REVIEW_CHANNEL ?? "chrome"),
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js preview --outDir dist-walker --port 4174 --strictPort --bypass-lock",
    url: `${baseURL}/`,
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
});
