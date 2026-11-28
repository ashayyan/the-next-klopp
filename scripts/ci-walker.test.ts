// QA-05: the lesson walker runs inside the required `build` CI job, in the pinned Playwright image.
// docs/decisions/0007-branch-protection.md keeps six required checks by job key, so the keys must not
// change and the walker must not move into a job of its own.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8").replace(/\r\n/g, "\n");
const playwrightVersion = (
  JSON.parse(readFileSync("package.json", "utf8")) as { devDependencies: Record<string, string> }
).devDependencies["@playwright/test"];
// Built from two parts so this file holds no template placeholder text.
const EXPRESSION_OPEN = "$" + "{{";
const IMAGE = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;

// Split the `jobs:` map into { jobName: body } on two-space job keys.
function jobs(yml: string): Record<string, string> {
  const body = yml.slice(yml.indexOf("\njobs:\n") + 7);
  const out: Record<string, string> = {};
  let name = "";
  for (const line of body.split("\n")) {
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (m) {
      name = m[1] ?? "";
      out[name] = "";
    } else if (name) out[name] += `${line}\n`;
  }
  return out;
}

const j = jobs(ci);
const build = j.build ?? "";

describe("required checks keep their job keys", () => {
  it("has lint, typecheck, test, build, guards and windows-smoke", () => {
    for (const key of ["lint", "typecheck", "test", "build", "guards", "windows-smoke"]) {
      expect(Object.keys(j), `job ${key}`).toContain(key);
    }
  });
});

describe("the build job runs the walker", () => {
  it("runs in the Playwright image whose tag equals the @playwright/test pin", () => {
    expect(playwrightVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(build).toContain("container:");
    expect(build).toContain(`image: ${IMAGE}`);
  });

  it("has a 20-minute timeout", () => {
    expect(build).toContain("timeout-minutes: 20");
  });

  it("runs npm ci, vite build, the bundle gate, the fixtures build, then the walker, in order", () => {
    const order = [
      "run: npm ci",
      "run: npx vite build",
      "run: node scripts/check-bundle.ts",
      "run: node scripts/content/build-fixtures.ts",
      "run: npx playwright test -c playwright.walker.config.ts",
    ].map((step) => build.indexOf(step));
    expect(
      order.every((i) => i > -1),
      `all steps present: ${order.join(",")}`,
    ).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("sets HOME through env on the walker step", () => {
    const step = build.slice(
      build.indexOf("run: npx playwright test -c playwright.walker.config.ts"),
    );
    expect(step.split("- ")[0]).toMatch(/env:\n\s+HOME: \/root/);
  });

  it("uploads the walker report when the job did not pass", () => {
    expect(build).toContain(`if: ${EXPRESSION_OPEN} !cancelled() }}`);
    expect(build).toContain("name: walker-report");
    expect(build).toContain("test-results/walker/");
    expect(build).toContain("playwright-report/");
  });
});

describe("the Playwright image appears in exactly the visual and build jobs", () => {
  it("is used twice in ci.yml", () => {
    expect(ci.split(IMAGE).length - 1).toBe(2);
    expect(j.visual).toContain(`image: ${IMAGE}`);
    expect(j.build).toContain(`image: ${IMAGE}`);
  });
});
