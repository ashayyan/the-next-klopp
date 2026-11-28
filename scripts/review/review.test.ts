// Pure review logic: arguments, slugging, the check registry, evaluators, report and exit codes.
// No browser here; the page-side collectors are exercised by the CLI itself.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DIRECTION_DIR, SYSTEM_INPUT } from "../design/tokens.ts";
import {
  activeTokenInput,
  buildReport,
  CHECKS,
  type CheckResult,
  type ControlProbe,
  countWords,
  evalBannedGradient,
  evalControlNames,
  evalHeadingOrder,
  evalLegendPresent,
  evalNoOverflow,
  evalStepWords,
  evalTapSize,
  evalTextContrast,
  exitCodeFor,
  loadActiveTokens,
  parseArgs,
  ReviewUnavailableError,
  renderReportMd,
  resolveBackground,
  slugRoute,
  type TextProbe,
  tasteCopyResult,
  tasteLayoutResult,
  toResult,
  undoMsysPathConversion,
} from "./lib.ts";
import {
  assertTasteSkill,
  mapCopyFindings,
  mapLayoutFindings,
  TASTE_IGNORED,
  tasteProfile,
} from "./taste.ts";

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

const btn = (selector: string, box: [number, number, number, number], runningText = false) => ({
  selector,
  text: "",
  box,
  runningText,
});

describe("tap-size", () => {
  it("fails a 40 x 40 button and names its selector and box", () => {
    const out = evalTapSize([btn("button.small", [10, 10, 40, 40])]);
    expect(out.violated).toBe(true);
    expect(out.offenders[0]?.selector).toBe("button.small");
    expect(out.offenders[0]?.box).toEqual([10, 10, 40, 40]);
  });

  it("fails two 44 x 44 buttons 4 px apart and passes them 8 px apart", () => {
    const close = evalTapSize([btn("a", [0, 0, 44, 44]), btn("b", [48, 0, 44, 44])]);
    expect(close.violated).toBe(true);
    expect(close.offenders.map((o) => o.selector).sort()).toEqual(["a", "b"]);
    const apart = evalTapSize([btn("a", [0, 0, 44, 44]), btn("b", [52, 0, 44, 44])]);
    expect(apart.violated).toBe(false);
  });

  it("exempts a link in running text and skips zero-size elements", () => {
    expect(evalTapSize([btn("p a", [0, 0, 30, 16], true)]).violated).toBe(false);
    expect(evalTapSize([btn("hidden", [0, 0, 0, 0])]).violated).toBe(false);
  });

  it("does not count a control nested inside another as too close", () => {
    expect(
      evalTapSize([btn("label", [0, 0, 100, 44]), btn("input", [4, 0, 44, 44])]).violated,
    ).toBe(false);
  });
});

const text = (over: Partial<TextProbe>): TextProbe => ({
  selector: "p",
  text: "Words",
  box: [0, 0, 100, 20],
  color: "#767676",
  bgChain: ["rgba(0, 0, 0, 0)", "#FFFFFF"],
  fontSize: 16,
  fontWeight: 400,
  exempt: false,
  ...over,
});

describe("text-contrast", () => {
  it("passes #767676 on white at 16 px (4.54:1) and fails #808080 (3.95:1)", () => {
    expect(evalTextContrast([text({})]).violated).toBe(false);
    const bad = evalTextContrast([text({ color: "#808080" })]);
    expect(bad.violated).toBe(true);
    expect(bad.offenders[0]?.value).toContain("3.95:1");
  });

  it("accepts 3:1 at 24 px and at 18.66 px with weight 600", () => {
    expect(evalTextContrast([text({ color: "#808080", fontSize: 24 })]).violated).toBe(false);
    expect(
      evalTextContrast([text({ color: "#808080", fontSize: 18.66, fontWeight: 600 })]).violated,
    ).toBe(false);
    expect(
      evalTextContrast([text({ color: "#808080", fontSize: 18.66, fontWeight: 400 })]).violated,
    ).toBe(true);
  });

  it("composites a semi-transparent panel over its opaque ancestor", () => {
    // 50% black over white is #808080: #767676 text on it is 0.9 below 4.5.
    const onPanel = text({ bgChain: ["rgba(0, 0, 0, 0.5)", "#FFFFFF"] });
    expect(resolveBackground(onPanel.bgChain)).toBe("#808080");
    expect(evalTextContrast([onPanel]).violated).toBe(true);
  });

  it("composites translucent text over the resolved background", () => {
    const faint = text({ color: "rgba(0, 0, 0, 0.2)" });
    expect(evalTextContrast([faint]).violated).toBe(true);
    expect(evalTextContrast([text({ color: "rgba(0, 0, 0, 0.9)" })]).violated).toBe(false);
  });

  it("skips exempt text (pitch SVG, disabled controls) and empty text", () => {
    expect(evalTextContrast([text({ color: "#CCCCCC", exempt: true })]).violated).toBe(false);
    expect(evalTextContrast([text({ color: "#CCCCCC", text: "  " })]).violated).toBe(false);
  });
});

const heading = (level: number) => ({ level, text: `h${level}`, selector: `h${level}` });

describe("heading-order", () => {
  it("fails two h1", () => {
    expect(evalHeadingOrder([heading(1), heading(2), heading(1)]).violated).toBe(true);
  });

  it("fails an h2 followed by an h4", () => {
    const out = evalHeadingOrder([heading(1), heading(2), heading(4)]);
    expect(out.violated).toBe(true);
    expect(out.offenders[0]?.value).toBe("h4 follows h2");
  });

  it("passes h1, h2, h3, h2 and fails a page without an h1", () => {
    expect(evalHeadingOrder([heading(1), heading(2), heading(3), heading(2)]).violated).toBe(false);
    expect(evalHeadingOrder([heading(2)]).violated).toBe(true);
  });
});

const control = (over: Partial<ControlProbe>): ControlProbe => ({
  selector: "button",
  text: "",
  box: [0, 0, 44, 44],
  ariaLabel: "",
  labelledByText: "",
  labelText: "",
  title: "",
  alt: "",
  ...over,
});

describe("control-names", () => {
  it("fails an icon-only button without aria-label and names it", () => {
    const out = evalControlNames([control({ selector: "button.icon" })]);
    expect(out.violated).toBe(true);
    expect(out.offenders[0]?.selector).toBe("button.icon");
  });

  it("passes visible text, a label, aria-labelledby, aria-label, title and alt", () => {
    for (const named of [
      control({ text: "Continue" }),
      control({ selector: "input", labelText: "Name" }),
      control({ labelledByText: "Heading" }),
      control({ ariaLabel: "Close" }),
      control({ title: "Close" }),
      control({ alt: "Play" }),
    ]) {
      expect(evalControlNames([named]).violated).toBe(false);
    }
  });
});

describe("legend-present", () => {
  it("fails a glyph without a visible legend and passes with one or with no glyph", () => {
    expect(evalLegendPresent({ glyphCount: 3, legendVisible: false }).violated).toBe(true);
    expect(evalLegendPresent({ glyphCount: 3, legendVisible: true }).violated).toBe(false);
    expect(evalLegendPresent({ glyphCount: 0, legendVisible: false }).violated).toBe(false);
  });
});

describe("step-words", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  it("fails 61 words and passes 60, counting any whitespace", () => {
    expect(
      evalStepWords([{ selector: "section", text: words(61), box: [0, 0, 1, 1] }]).violated,
    ).toBe(true);
    expect(
      evalStepWords([{ selector: "section", text: words(60), box: [0, 0, 1, 1] }]).violated,
    ).toBe(false);
    expect(countWords("one\n two\t three  ")).toBe(3);
  });

  it("passes a page with no step", () => {
    expect(evalStepWords([]).violated).toBe(false);
  });
});

describe("taste layout mapping", () => {
  const f = (rule: string) => ({ rule, where: "main", detail: "d" });
  const raw = [
    {
      size: "375x812",
      findings: [
        "overflow-x",
        "spill",
        "edge-left",
        "container",
        "hero-fold",
        "screen-short",
        "neighbour-ground",
        "lines",
        "edge-right",
      ].map(f),
    },
    { size: "1440x900", findings: [f("hero-fold"), f("photo-none")] },
  ];

  it("fails overflow-x and spill, warns the other app ids, ignores landing-page ids with a reason", () => {
    const m = mapLayoutFindings(raw);
    expect(m.fails.map((x) => x.rule)).toEqual(["overflow-x", "spill"]);
    expect(m.warns.map((x) => x.rule)).toEqual(["lines", "edge-right"]);
    expect(m.ignored.map((x) => x.id)).toEqual([
      "container",
      "edge-left",
      "hero-fold",
      "neighbour-ground",
      "photo-none",
      "screen-short",
    ]);
    for (const i of m.ignored) expect(i.reason).toBe("landing-page rule, not an app-screen rule");
    expect(m.fails[0]?.size).toBe("375x812");
  });

  it("keeps an id outside the ignore list as a warning", () => {
    expect(TASTE_IGNORED.some((re) => re.test("sparse"))).toBe(false);
    expect(mapLayoutFindings([{ size: "x", findings: [f("sparse")] }]).warns).toHaveLength(1);
  });

  it("maps a clean checker run to nothing", () => {
    expect(mapLayoutFindings([{ size: "375x812", findings: [] }])).toEqual({
      fails: [],
      warns: [],
      ignored: [],
    });
  });
});

describe("copy-lint mapping", () => {
  it("one FAIL and two WARN ids give one failure and two warnings; INFO is dropped", () => {
    const m = mapCopyFindings({
      files: [
        {
          findings: [
            { sev: "FAIL", id: "copy-slop-word", count: 2, msg: "slop" },
            { sev: "WARN", id: "copy-two-fragment", count: 1, msg: "fragments" },
            { sev: "WARN", id: "copy-unread", msg: "unread" },
            { sev: "INFO", id: "copy-contrast", count: 1, msg: "contrast" },
          ],
        },
      ],
    });
    expect(m.fails.map((x) => x.id)).toEqual(["copy-slop-word"]);
    expect(m.warns.map((x) => x.id)).toEqual(["copy-two-fragment", "copy-unread"]);
    expect(m.warns[1]?.count).toBe(1);
  });
});

describe("taste results in the report", () => {
  const layout = (rules: string[]) => ({
    command: "node check.mjs",
    exitCode: rules.length > 0 ? 1 : 0,
    findings: rules.map((rule) => ({ rule, where: "main", detail: "", size: "375x812" })),
    ignored: [{ id: "hero-fold", reason: "landing-page rule, not an app-screen rule" }],
  });

  it("taste-layout fails for overflow-x, warns for lines, passes when clean", () => {
    expect(tasteLayoutResult(layout(["overflow-x", "lines"]), "dark").status).toBe("fail");
    expect(tasteLayoutResult(layout(["lines"]), "dark").status).toBe("warn");
    expect(tasteLayoutResult(layout([]), "dark").status).toBe("pass");
  });

  it("taste-copy fails on FAIL ids, warns on WARN ids", () => {
    const c = (fails: number, warns: number) => ({
      command: "node copy-lint.mjs",
      exitCode: fails > 0 ? 1 : 0,
      fails: Array.from({ length: fails }, () => ({ id: "f", count: 1, msg: "m" })),
      warns: Array.from({ length: warns }, () => ({ id: "w", count: 1, msg: "m" })),
    });
    expect(tasteCopyResult(c(1, 2), "dark").status).toBe("fail");
    expect(tasteCopyResult(c(0, 2), "dark").status).toBe("warn");
    expect(tasteCopyResult(c(0, 0), "dark").status).toBe("pass");
  });

  it("report.md lists each ignored taste id with its reason, and the table shows once-per-run checks under every width", () => {
    const base = reportWith([
      toResult("no-overflow", ctx, evalNoOverflow({ scrollWidth: 375, innerWidth: 375 })),
    ]);
    const withTaste = buildReport({
      route: "/dev/x",
      server: "dev",
      url: "http://localhost:1/dev/x",
      generatedAt: "2026-11-28T10:00:00.000Z",
      tokensSha256: "abc",
      widths: [375],
      themes: ["dark"],
      checks: [
        ...base.checks.filter((c) => c.status !== "skipped"),
        tasteLayoutResult(layout(["lines"]), "dark"),
      ],
      screenshots: [],
      tasteSkill: {
        layout: layout(["lines"]),
        copy: { command: "c", exitCode: 0, fails: [], warns: [] },
      },
    });
    const md = renderReportMd(withTaste);
    expect(md).toContain("## Ignored taste ids");
    expect(md).toContain("- hero-fold: landing-page rule, not an app-screen rule");
    expect(md).toContain("| taste-layout | fail | warn |");
    expect(withTaste.tasteSkill?.layout.command).toBe("node check.mjs");
  });
});

describe("skill gate and active token set", () => {
  it("assertTasteSkill throws a ReviewUnavailableError naming the skill folder when it is absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "tnk-skill-"));
    expect(() => assertTasteSkill(dir)).toThrow(ReviewUnavailableError);
    expect(() => assertTasteSkill(dir)).toThrow(".claude/skills/design-taste-frontend");
  });

  it("a /dev/directions/<id> route uses the direction file when it exists, else the system input", () => {
    const dir = mkdtempSync(join(tmpdir(), "tnk-dir-"));
    expect(activeTokenInput("/dev/directions/floodlit/data", dir)).toBe(SYSTEM_INPUT);
    mkdirSync(join(dir, DIRECTION_DIR), { recursive: true });
    writeFileSync(join(dir, DIRECTION_DIR, "floodlit.tokens.json"), "{}");
    expect(activeTokenInput("/dev/directions/floodlit/data", dir)).toBe(
      `${DIRECTION_DIR}/floodlit.tokens.json`,
    );
    expect(activeTokenInput("/dev/directions/floodlit", dir)).toBe(
      `${DIRECTION_DIR}/floodlit.tokens.json`,
    );
    expect(activeTokenInput("/dev/pitch", dir)).toBe(SYSTEM_INPUT);
  });

  it("the repo's system input resolves to a primary theme", () => {
    const doc = loadActiveTokens("/dev/pitch", process.cwd());
    expect(["light", "dark"]).toContain(doc.meta.primaryTheme);
  });
});

describe("taste profile folder", () => {
  it("is a folder of its own under the git-ignored .taste-skill folder, new for every run", () => {
    const a = tasteProfile(10, 1000);
    expect(a.startsWith(".taste-skill/chrome-review-10-")).toBe(true);
    expect(a).not.toContain("..");
    expect(tasteProfile(10, 2000)).not.toBe(a);
    expect(tasteProfile(11, 1000)).not.toBe(a);
  });
});
