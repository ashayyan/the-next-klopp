// Pure review logic: arguments, slugging, the check registry, evaluators, report and exit codes.
// No browser here; the page-side collectors are exercised by the CLI itself.
import { describe, expect, it } from "vitest";
import {
  buildReport,
  CHECKS,
  type CheckResult,
  evalBannedGradient,
  evalNoOverflow,
  exitCodeFor,
  parseArgs,
  renderReportMd,
  slugRoute,
  toResult,
  undoMsysPathConversion,
} from "./lib.ts";

const ctx = { width: 375, theme: "dark" as const, state: null };

function reportWith(checks: CheckResult[]) {
  return buildReport({
    route: "/dev/review-fixture",
    server: "dev",
    url: "http://localhost:5184/dev/review-fixture",
    generatedAt: "2026-11-28T10:00:00.000Z",
    tokensSha256: "abcdef123456",
    widths: [375],
    themes: ["dark"],
    checks,
    screenshots: [
      {
        width: 375,
        theme: "dark",
        state: null,
        vision: "normal",
        path: "375-dark.png",
        sha256: "0",
      },
    ],
  });
}

describe("parseArgs", () => {
  it("defaults to three widths, both themes, no port and no states", () => {
    expect(parseArgs(["/dev/pitch"])).toEqual({
      route: "/dev/pitch",
      widths: [375, 768, 1440],
      theme: "both",
      port: null,
      states: [],
    });
  });

  it("reads every option, with a space or an equals sign", () => {
    const a = parseArgs([
      "/dev/pitch",
      "--widths",
      "375,1440",
      "--theme=dark",
      "--port",
      "5184",
      "--states",
      "state=with,t=2",
    ]);
    expect(a).toEqual({
      route: "/dev/pitch",
      widths: [375, 1440],
      theme: "dark",
      port: 5184,
      states: ["state=with", "t=2"],
    });
  });

  it("names an unknown flag with the documented copy", () => {
    expect(parseArgs(["/x", "--nope"])).toEqual({
      error: "Unknown option --nope. Use --widths, --theme, --port or --states.",
    });
  });

  it("rejects bad values and a missing or unsafe route", () => {
    expect("error" in (parseArgs(["/x", "--theme", "blue"]) as object)).toBe(true);
    expect("error" in (parseArgs(["/x", "--port", "80"]) as object)).toBe(true);
    expect("error" in (parseArgs(["/x", "--widths", "abc"]) as object)).toBe(true);
    expect("error" in (parseArgs([]) as object)).toBe(true);
    expect("error" in (parseArgs(["dev/pitch"]) as object)).toBe(true);
  });
});

describe("slugRoute", () => {
  it("lower-cases and joins runs outside [a-z0-9] with one dash", () => {
    expect(slugRoute("/dev/review-fixture?case=gradient")).toBe("dev-review-fixture-case-gradient");
    expect(slugRoute("/Dev//Pitch/")).toBe("dev-pitch");
    expect(slugRoute("/")).toBe("root");
  });

  it("refuses traversal, a missing slash, a scheme, whitespace and a backslash", () => {
    expect(slugRoute("/../x")).toBeNull();
    expect(slugRoute("http://x")).toBeNull();
    expect(slugRoute("dev")).toBeNull();
    expect(slugRoute("/a b")).toBeNull();
    expect(slugRoute("/a\\b")).toBeNull();
    expect(slugRoute("//evil.example/x")).toBeNull();
  });
});

describe("check registry", () => {
  it("holds the 22 ids of the UI-SPEC table with their severity", () => {
    expect(CHECKS).toHaveLength(22);
    expect(new Set(CHECKS.map((c) => c.id)).size).toBe(22);
    const sev = (id: string) => CHECKS.find((c) => c.id === id)?.severity;
    expect(sev("banned-gradient")).toBe("fail");
    expect(sev("banned-eyebrow")).toBe("warn");
    expect(sev("taste-copy")).toBe("warn");
  });
});

describe("tracer evaluators", () => {
  it("no-overflow compares scrollWidth with innerWidth", () => {
    expect(evalNoOverflow({ scrollWidth: 375, innerWidth: 375 }).violated).toBe(false);
    const wide = evalNoOverflow({ scrollWidth: 412, innerWidth: 375 });
    expect(wide.violated).toBe(true);
    expect(wide.detail).toBe("scrollWidth 412 > 375");
  });

  it("banned-gradient catches linear, radial, conic and repeating forms only", () => {
    const probe = (backgroundImage: string) => ({
      selector: "div",
      text: "",
      box: [0, 0, 10, 10] as [number, number, number, number],
      backgroundImage,
    });
    for (const g of [
      "linear-gradient(rgb(0, 0, 0), rgb(1, 1, 1))",
      "radial-gradient(circle, red, blue)",
      "conic-gradient(red, blue)",
      "repeating-linear-gradient(45deg, red, blue)",
    ]) {
      expect(evalBannedGradient([probe(g)]).violated, g).toBe(true);
    }
    expect(evalBannedGradient([probe("none"), probe('url("a.png")')]).violated).toBe(false);
  });
});

describe("report and exit codes", () => {
  it("a failing banned-gradient check renders REVIEW: FAIL and exits 1", () => {
    const failing = toResult(
      "banned-gradient",
      ctx,
      evalBannedGradient([
        {
          selector: "div",
          text: "",
          box: [0, 0, 5, 5],
          backgroundImage: "linear-gradient(red, blue)",
        },
      ]),
    );
    const report = reportWith([failing]);
    expect(report.verdict).toBe("fail");
    expect(report.counts.fail).toBe(1);
    expect(exitCodeFor(report)).toBe(1);
    expect(renderReportMd(report).split("\n")[0]).toBe("REVIEW: FAIL — 1 fail, 0 warn");
  });

  it("only warnings still exit 0 and read PASS", () => {
    const warn = toResult("banned-eyebrow", ctx, {
      violated: true,
      detail: "1 eyebrow",
      offenders: [],
    });
    const report = reportWith([warn]);
    expect(warn.status).toBe("warn");
    expect(exitCodeFor(report)).toBe(0);
    expect(renderReportMd(report).split("\n")[0]).toBe("REVIEW: PASS — 0 fail, 1 warn");
  });

  it("marks every registered check without a result as skipped and keeps schemaVersion 1", () => {
    const report = reportWith([
      toResult("no-overflow", ctx, evalNoOverflow({ scrollWidth: 375, innerWidth: 375 })),
    ]);
    expect(report.schemaVersion).toBe(1);
    expect(report.counts.pass).toBe(1);
    expect(report.counts.skipped).toBe(21);
    expect(report.tasteSkill).toBeNull();
    expect(report.reviewer.status).toBe("pending");
    expect(report.designRef).toEqual({ file: "docs/DESIGN.md", tokensSha256: "abcdef123456" });
  });

  it("the Markdown holds the check table, the offenders and the screenshot paths", () => {
    const failing = toResult(
      "no-overflow",
      ctx,
      evalNoOverflow({ scrollWidth: 412, innerWidth: 375 }),
    );
    const md = renderReportMd(reportWith([failing]));
    expect(md).toContain("| no-overflow | fail | fail |");
    expect(md).toContain("### no-overflow (FAIL) 375px dark");
    expect(md).toContain("- 375-dark.png");
  });
});

describe("Git Bash path rewriting", () => {
  const exe = String.raw`C:\Program Files\Git\bin`;
  it("restores a route that Git Bash rewrote under the Git folder", () => {
    expect(undoMsysPathConversion("C:/Program Files/Git/dev/review-fixture", exe)).toBe(
      "/dev/review-fixture",
    );
    expect(
      undoMsysPathConversion("C:/Program Files/Git/dev/review-fixture?case=gradient", exe),
    ).toBe("/dev/review-fixture?case=gradient");
    expect(
      undoMsysPathConversion(
        String.raw`C:\Program Files\Git\dev\x`,
        String.raw`C:\Program Files\Git`,
      ),
    ).toBe("/dev/x");
  });

  it("leaves a normal route, another drive path and a missing EXEPATH alone", () => {
    expect(undoMsysPathConversion("/dev/pitch", exe)).toBe("/dev/pitch");
    expect(undoMsysPathConversion("D:/x/dev/pitch", exe)).toBe("D:/x/dev/pitch");
    expect(undoMsysPathConversion("C:/Program Files/Git/dev/x", undefined)).toBe(
      "C:/Program Files/Git/dev/x",
    );
  });
});
