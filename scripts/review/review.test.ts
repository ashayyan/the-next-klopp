// Pure review logic: arguments, slugging, the check registry, evaluators, report and exit codes.
// No browser here; the page-side collectors are exercised by the CLI itself.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hexToLin, oklab } from "../design/lib/color.ts";
import { DIRECTION_DIR, SYSTEM_INPUT } from "../design/tokens.ts";
import {
  activeTokenInput,
  allowedColours,
  buildReport,
  type CardChild,
  CHECKS,
  type CheckResult,
  type ControlProbe,
  countWords,
  evalArrowSuffix,
  evalBannedEmoji,
  evalBannedEyebrow,
  evalBannedGlass,
  evalBannedGradient,
  evalBannedStripes,
  evalCardGrid,
  evalControlNames,
  evalFocusVisible,
  evalFontLocal,
  evalHeadingOrder,
  evalHexInSource,
  evalLegendPresent,
  evalNoOverflow,
  evalReducedMotion,
  evalStepWords,
  evalTapSize,
  evalTextContrast,
  evalTokenColours,
  evalTransitionAll,
  exitCodeFor,
  type FocusStop,
  listSourceFiles,
  loadActiveTokens,
  parseArgs,
  ReviewUnavailableError,
  renderReportMd,
  resolveBackground,
  screenshotName,
  shadowRings,
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
    tokensSha256: "000000000000",
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
  it("records the reviewed commit and whether the served build was fresh (WR-05)", () => {
    expect(reportWith([]).source).toBeNull();
    const withSource = buildReport({
      ...reportWith([]),
      tokensSha256: "000000000000",
      source: { commit: "abc1234-dirty", fresh: false },
    });
    expect(withSource.source).toEqual({ commit: "abc1234-dirty", fresh: false });
  });

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
    expect(report.designRef).toEqual({ file: "docs/DESIGN.md", tokensSha256: "000000000000" });
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

  it("judges gaps on the unrounded boxes with a 1/64 px margin only (WR-02)", () => {
    const pair = (gap: number) => [
      { ...btn("a", [0, 0, 44, 44]), exact: [0, 0, 44, 44] as [number, number, number, number] },
      {
        ...btn("b", [Math.round((44 + gap) * 10) / 10, 0, 44, 44]),
        exact: [44 + gap, 0, 44, 44] as [number, number, number, number],
      },
    ];
    // The PlaybackBar defect from deferred-items.md: 7.9 px is a real layout gap.
    expect(evalTapSize(pair(7.9)).violated).toBe(true);
    expect(evalTapSize(pair(7.95)).violated).toBe(true);
    // A true 8 px gap that Chrome lays out a fraction of a layout unit short still passes.
    expect(evalTapSize(pair(8 - 1 / 128)).violated).toBe(false);
    expect(evalTapSize(pair(8)).violated).toBe(false);
  });

  it("judges size on the unrounded box: 43.95 px fails although it displays as 44", () => {
    const t = {
      ...btn("a", [0, 0, 44, 44]),
      exact: [0, 0, 43.95, 44] as [number, number, number, number],
    };
    expect(evalTapSize([t]).violated).toBe(true);
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
      tokensSha256: "000000000000",
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

const group = (property: string, value: string, count = 1) => ({
  property,
  value,
  count,
  examples: [
    {
      selector: `${property}.el`,
      text: "x",
      box: [0, 0, 10, 10] as [number, number, number, number],
    },
  ],
});

describe("token-colours", () => {
  const allowed = allowedColours({
    color: { ink: "#0E151D", accent: "#0A7558" },
    pitch: { "zone-fill-opacity": "0.45" },
  });

  it("builds the allowed set from colour values only", () => {
    expect(allowed).toEqual([
      [14, 21, 29],
      [10, 117, 88],
    ]);
  });

  it("allows rgb, rgba, color(srgb) and oklab forms of a token colour, with alpha", () => {
    const [L, a, b] = oklab(hexToLin("#0E151D"));
    for (const value of [
      "rgb(14, 21, 29)",
      "rgba(14, 21, 29, 0.5)",
      "color(srgb 0.0549 0.0824 0.1137 / 0.5)",
      `oklab(${L} ${a} ${b} / 0.5)`,
    ]) {
      expect(evalTokenColours([group("color", value)], allowed).violated, value).toBe(false);
    }
  });

  it("fails rgb(255, 0, 0) with the selector and value, and passes transparent and none", () => {
    const out = evalTokenColours([group("background-color", "rgb(255, 0, 0)", 3)], allowed);
    expect(out.violated).toBe(true);
    expect(out.offenders[0]?.selector).toBe("background-color.el");
    expect(out.offenders[0]?.value).toContain("rgb(255, 0, 0)");
    const quiet = [
      group("color", "rgba(0, 0, 0, 0)"),
      group("fill", "none"),
      group("stroke", "transparent"),
    ];
    expect(evalTokenColours(quiet, allowed).violated).toBe(false);
  });
});

describe("no-hex-in-source", () => {
  it("fails a hex and an rgb( literal and names file and line", () => {
    const out = evalHexInSource([
      { path: "src/a.tsx", text: "const a = 1;\nconst c = '#FFF';\n" },
      { path: "src/b.ts", text: "const d = 'rgb(1, 2, 3)';" },
    ]);
    expect(out.offenders.map((o) => o.selector)).toEqual(["src/a.tsx:2", "src/b.ts:1"]);
  });

  it("skips test files, still counts a hex inside a comment, and passes clean source", () => {
    expect(
      evalHexInSource([{ path: "src/a.test.ts", text: "const c = '#FFFFFF';" }]).violated,
    ).toBe(false);
    expect(evalHexInSource([{ path: "src/a.ts", text: "// was #0E151D" }]).violated).toBe(true);
    expect(evalHexInSource([{ path: "src/a.ts", text: "const issue = '#12';" }]).violated).toBe(
      false,
    );
  });

  it("the repo's own src folder is clean", () => {
    expect(evalHexInSource(listSourceFiles(process.cwd())).offenders).toEqual([]);
  });
});

const prop = (value: string) => ({
  selector: "button",
  text: "",
  box: [0, 0, 5, 5] as [number, number, number, number],
  value,
});

describe("banned patterns", () => {
  it("transition-all fails a list that names all and passes opacity, transform", () => {
    expect(evalTransitionAll([prop("all")]).violated).toBe(true);
    expect(evalTransitionAll([prop("opacity, all")]).violated).toBe(true);
    expect(evalTransitionAll([prop("opacity, transform")]).violated).toBe(false);
  });

  it("banned-glass fails any backdrop-filter except none", () => {
    expect(evalBannedGlass([prop("blur(8px)")]).violated).toBe(true);
    expect(evalBannedGlass([prop("none"), prop("")]).violated).toBe(false);
  });

  it("banned-emoji fails a pictographic character in text or aria-label", () => {
    const item = (text: string, where: "text" | "aria-label" = "text") => ({
      selector: "p",
      text,
      box: [0, 0, 1, 1] as [number, number, number, number],
      where,
    });
    expect(evalBannedEmoji([item("Goal ⚽")]).violated).toBe(true);
    expect(evalBannedEmoji([item("\u{1F680} Go", "aria-label")]).violated).toBe(true);
    expect(evalBannedEmoji([item("Goal 1 – 0, 1×2")]).violated).toBe(false);
  });

  it("banned-stripes fails paint servers, a url fill and a stage image; passes one flat fill", () => {
    const flat = { paintServers: 0, fieldFills: ["rgb(1, 2, 3)"], stageImages: [] as string[] };
    expect(evalBannedStripes([{ ...flat, paintServers: 1 }]).violated).toBe(true);
    expect(evalBannedStripes([{ ...flat, fieldFills: ['url("#grass")'] }]).violated).toBe(true);
    expect(evalBannedStripes([{ ...flat, stageImages: ['url("a.png")'] }]).violated).toBe(true);
    expect(evalBannedStripes([flat]).violated).toBe(false);
    expect(evalBannedStripes([]).violated).toBe(false);
  });
});

const stop = (over: Partial<FocusStop>): FocusStop => ({
  selector: "button",
  text: "Go",
  box: [0, 0, 44, 44],
  outlineWidth: 0,
  outlineStyle: "none",
  outlineColor: "rgb(0, 0, 0)",
  boxShadow: "none",
  ringStrokes: [],
  surfaceChain: ["rgb(255, 255, 255)"],
  ...over,
});

const outline = (width: number, color: string) =>
  stop({ outlineWidth: width, outlineStyle: "solid", outlineColor: color });

describe("focus-visible", () => {
  it("fails a 1 px outline", () => {
    const out = evalFocusVisible([outline(1, "rgb(0, 0, 0)")]);
    expect(out.violated).toBe(true);
    expect(out.offenders[0]?.value).toContain("no ring of 2 px or more");
  });

  it("passes a 2 px ring at 3:1 or better and fails one at 1.4:1", () => {
    expect(evalFocusVisible([outline(2, "rgb(118, 118, 118)")]).violated).toBe(false);
    const weak = evalFocusVisible([outline(2, "rgb(221, 221, 221)")]);
    expect(weak.violated).toBe(true);
    expect(weak.offenders[0]?.value).toContain("needs 3:1");
  });

  it("accepts a solid box-shadow ring and an SVG ring stroke, ignores inset and blurred shadows", () => {
    expect(
      evalFocusVisible([stop({ boxShadow: "rgb(10, 117, 88) 0px 0px 0px 2px" })]).violated,
    ).toBe(false);
    expect(
      evalFocusVisible([stop({ ringStrokes: [{ color: "rgb(14, 21, 29)", width: 3 }] })]).violated,
    ).toBe(false);
    expect(
      evalFocusVisible([stop({ boxShadow: "rgb(10, 117, 88) 0px 0px 0px 2px inset" })]).violated,
    ).toBe(true);
    expect(
      evalFocusVisible([stop({ boxShadow: "rgb(10, 117, 88) 0px 0px 8px 2px" })]).violated,
    ).toBe(true);
    expect(shadowRings("rgb(1, 2, 3) 0px 0px 0px 2px, rgb(4, 5, 6) 0px 0px 0px 4px")).toHaveLength(
      2,
    );
  });

  it("measures the ring against the parent surface, composited", () => {
    const dark = stop({
      outlineWidth: 2,
      outlineStyle: "solid",
      outlineColor: "rgb(14, 21, 29)",
      surfaceChain: ["rgb(14, 21, 29)"],
    });
    expect(evalFocusVisible([dark]).violated).toBe(true);
    expect(evalFocusVisible([]).detail).toBe("no focusable element on the page");
  });
});

describe("warn checks", () => {
  const at = [0, 0, 1, 1] as [number, number, number, number];

  it("banned-eyebrow flags uppercase above 0.05em and always yields a warning", () => {
    const el = (textTransform: string, letterSpacingEm: number) => ({
      selector: "p",
      text: "NEW",
      box: at,
      textTransform,
      letterSpacingEm,
    });
    const out = evalBannedEyebrow([el("uppercase", 0.12)]);
    expect(out.violated).toBe(true);
    expect(toResult("banned-eyebrow", ctx, out).status).toBe("warn");
    expect(evalBannedEyebrow([el("uppercase", 0.05), el("none", 0.2)]).violated).toBe(false);
  });

  it("card-grid flags three identical boxes and always yields a warning", () => {
    const card = (over: Partial<CardChild> = {}): CardChild => ({
      radius: "6px",
      shadow: "none",
      background: "rgb(255, 255, 255)",
      width: 100,
      height: 80,
      ...over,
    });
    const container = (children: CardChild[]) => ({ selector: "ul.grid", box: at, children });
    const three = evalCardGrid([container([card(), card({ width: 101 }), card({ height: 81 })])]);
    expect(three.violated).toBe(true);
    expect(toResult("card-grid", ctx, three).status).toBe("warn");
    expect(evalCardGrid([container([card(), card()])]).violated).toBe(false);
    const sizes = [card({ width: 100 }), card({ width: 150 }), card({ width: 200 })];
    expect(evalCardGrid([container(sizes)]).violated).toBe(false);
    const flat = card({ radius: "0px", background: "rgba(0, 0, 0, 0)" });
    expect(evalCardGrid([container([flat, flat, flat])]).violated).toBe(false);
  });

  it("arrow-suffix flags a trailing right arrow and always yields a warning", () => {
    const c = (text: string) => ({ selector: "a", text, box: at });
    const out = evalArrowSuffix([c("Read more →"), c("Continue")]);
    expect(out.offenders).toHaveLength(1);
    expect(toResult("arrow-suffix", ctx, out).status).toBe("warn");
  });
});

describe("reduced-motion", () => {
  const calm = {
    animations: [],
    transitions: [],
    glyphsBefore: [[10, 10, 20, 20]] as [number, number, number, number][],
    glyphsAfter: [[10, 10, 20, 20]] as [number, number, number, number][],
  };

  it("fails an animation of 300 ms and passes 0 ms", () => {
    const out = evalReducedMotion({
      ...calm,
      animations: [{ selector: ".pulse", name: "pulse", durationMs: 300 }],
    });
    expect(out.violated).toBe(true);
    expect(out.offenders[0]?.value).toBe("animation pulse runs 300 ms");
    expect(
      evalReducedMotion({
        ...calm,
        animations: [{ selector: ".pulse", name: "pulse", durationMs: 0 }],
      }).violated,
    ).toBe(false);
  });

  it("fails a transition above 0 ms", () => {
    const out = evalReducedMotion({
      ...calm,
      transitions: [{ selector: "button", property: "opacity", durationMs: 200 }],
    });
    expect(out.violated).toBe(true);
  });

  it("fails glyph boxes that move more than 0.5 px between two reads and passes a 0.4 px jitter", () => {
    const moved = evalReducedMotion({ ...calm, glyphsAfter: [[12, 10, 20, 20]] });
    expect(moved.violated).toBe(true);
    expect(moved.offenders[0]?.value).toBe("moved 2 px within 500 ms without input");
    expect(evalReducedMotion({ ...calm, glyphsAfter: [[10.4, 10, 20, 20]] }).violated).toBe(false);
    expect(evalReducedMotion(calm).violated).toBe(false);
  });
});

describe("font-local", () => {
  const loaded = [{ family: "Mona Sans", loaded: true }];

  it("fails a request to fonts.example.com and passes localhost, 127.0.0.1 and data URLs", () => {
    const bad = evalFontLocal({
      requests: ["https://fonts.example.com/a.woff2"],
      families: loaded,
    });
    expect(bad.violated).toBe(true);
    expect(bad.offenders[0]?.value).toContain("fonts.example.com");
    const good = evalFontLocal({
      requests: [
        "http://localhost:5173/fonts/a.woff2",
        "http://127.0.0.1:4173/",
        "data:font/woff2;base64,AAAA",
        "blob:http://localhost:5173/x",
      ],
      families: loaded,
    });
    expect(good.violated).toBe(false);
  });

  it("fails a family that is not loaded and names it", () => {
    const out = evalFontLocal({
      requests: [],
      families: [
        { family: "Mona Sans", loaded: true },
        { family: "Geist Mono", loaded: false },
      ],
    });
    expect(out.violated).toBe(true);
    expect(out.offenders[0]?.value).toBe('font family "Geist Mono" is not loaded');
  });
});

describe("capture names", () => {
  it("names state captures from their query and colour-vision captures from their mode", () => {
    expect(screenshotName(375, "dark", null)).toBe("375-dark.png");
    expect(screenshotName(375, "dark", "state=with")).toBe("375-dark-state-with.png");
    expect(screenshotName(1440, "light", "t=11.48")).toBe("1440-light-t-11-48.png");
    expect(screenshotName(375, "light", null, "deuteranopia")).toBe("375-light-deuteranopia.png");
    expect(screenshotName(375, "dark", null, "achromatopsia")).toBe("375-dark-achromatopsia.png");
  });

  it("parses --states into one entry per query", () => {
    const parsed = parseArgs(["/dev/x", "--states", "state=with,t=11.48"]);
    expect("error" in parsed ? [] : parsed.states).toEqual(["state=with", "t=11.48"]);
  });
});

describe("registry coverage", () => {
  it("a report that runs every check has nothing skipped", () => {
    const all = CHECKS.map((c) =>
      toResult(c.id, ctx, { violated: false, detail: "ok", offenders: [] }),
    );
    const report = reportWith(all);
    expect(report.counts.skipped).toBe(0);
    expect(report.counts.pass).toBe(22);
  });
});
