import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadTokens } from "../../scripts/design/build-tokens.ts";
import { SYSTEM_INPUT } from "../../scripts/design/tokens.ts";
import { Checkbox, RadioGroup } from "./Choice.tsx";
import { DataTable } from "./data/DataTable.tsx";
import { StatCard } from "./data/StatCard.tsx";
import { NumberInput, TextInput } from "./Field.tsx";
import { Badge } from "./lesson/Badge.tsx";
import { ProgressRing } from "./lesson/ProgressRing.tsx";
import { QuizOption, type QuizOptionState } from "./lesson/QuizOption.tsx";
import { ShellBar } from "./lesson/ShellBar.tsx";
import { LESSON_LOOP_STEPS, StepRail } from "./lesson/StepRail.tsx";
import { Slider } from "./Slider.tsx";
import { Surface } from "./Surface.tsx";
import { Tabs } from "./Tabs.tsx";
import {
  applyDocumentTheme,
  readStoredTheme,
  resolveTheme,
  THEME_KEY,
  writeStoredTheme,
} from "./theme.ts";

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("StepRail", () => {
  it("lists the seven Lesson Loop steps in order with exactly one current step", () => {
    const html = renderToStaticMarkup(<StepRail current="touch-it" form="vertical" />);
    const labels = [...html.matchAll(/data-step="([a-z-]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(LESSON_LOOP_STEPS.map((s) => s.id));
    expect(LESSON_LOOP_STEPS.map((s) => s.label)).toEqual([
      "Hook",
      "See it",
      "Touch it",
      "Predict",
      "Do it",
      "Lock it in",
      "Connect it",
    ]);
    expect(count(html, 'aria-current="step"')).toBe(1);
    expect(html).toMatch(/data-step="touch-it" data-status="current" aria-current="step"/);
  });

  it("marks complete steps with the check icon and keeps their visible label", () => {
    const html = renderToStaticMarkup(<StepRail current="touch-it" form="vertical" />);
    for (const id of ["hook", "see-it"]) {
      const item = html.split(`data-step="${id}"`)[1]?.split("</li>")[0] ?? "";
      expect(item).toContain('data-status="complete"');
      expect(item).toContain("<svg");
      expect(item).toContain("M4.5 10.5 L8.5 14.5 L15.5 5.5");
    }
    expect(html).toContain(">Hook<");
    expect(html).toContain(">See it<");
    const upcoming = html.split('data-step="predict"')[1]?.split("</li>")[0] ?? "";
    expect(upcoming).toContain('data-status="upcoming"');
    expect(upcoming).not.toContain("<svg");
  });

  it("reads “Touch it, step 3 of 7” in the compact form with 7 segments, 3 done or current", () => {
    const html = renderToStaticMarkup(<StepRail current="touch-it" form="compact" />);
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toContain("Touch it, step 3 of 7");
    expect(count(html, "data-segment=")).toBe(7);
    expect(count(html, 'data-segment="done"') + count(html, 'data-segment="current"')).toBe(3);
  });

  it("numbers the steps when asked", () => {
    const html = renderToStaticMarkup(<StepRail current="see-it" form="strip" numbered />);
    const text = html.replace(/<[^>]+>/g, " ");
    expect(text).toMatch(/2\s+See it/);
    expect(text).toMatch(/7\s+Connect it/);
  });
});

describe("ShellBar", () => {
  it("shows the wordmark, the lesson time and a switch named Focus mode", () => {
    const html = renderToStaticMarkup(
      <ShellBar minutes={6} focus={false} onFocusChange={() => {}} />,
    );
    expect(html).toContain("The Next Klopp");
    expect(html).toContain("About 6 min");
    const switchHtml = html.split('role="switch"')[1]?.split("</button>")[0] ?? "";
    expect(switchHtml.replace(/<[^>]+>/g, "")).toContain("Focus mode");
    expect(html).toMatch(/<header[^>]*class="[^"]*h-14/);
  });

  it("hides the lesson time in focus mode and keeps the switch", () => {
    const html = renderToStaticMarkup(<ShellBar minutes={6} focus onFocusChange={() => {}} />);
    expect(html).not.toContain("About 6 min");
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
  });
});

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const throwingStorage = {
  getItem: (): string | null => {
    throw new Error("SecurityError: storage is blocked");
  },
  setItem: (): void => {
    throw new Error("QuotaExceededError");
  },
};

describe("theme storage", () => {
  it("stores the choice under tnk:theme", () => {
    expect(THEME_KEY).toBe("tnk:theme");
    const storage = memoryStorage();
    writeStoredTheme("dark", storage);
    expect(storage.data.get("tnk:theme")).toBe("dark");
  });

  it("reads dark back, and falls back to system for an unknown value or a throwing storage", () => {
    expect(readStoredTheme(memoryStorage({ "tnk:theme": "dark" }))).toBe("dark");
    expect(readStoredTheme(memoryStorage({ "tnk:theme": "sepia" }))).toBe("system");
    expect(readStoredTheme(memoryStorage())).toBe("system");
    expect(readStoredTheme(throwingStorage)).toBe("system");
  });

  it("swallows a throwing setItem", () => {
    expect(() => writeStoredTheme("light", throwingStorage)).not.toThrow();
  });
});

describe("applyDocumentTheme", () => {
  const fakeRoot = (theme?: string) => {
    const dataset: Record<string, string | undefined> = {};
    if (theme !== undefined) dataset.theme = theme;
    return { dataset };
  };

  it('sets data-theme="dark" on the html element and stores dark', () => {
    const root = fakeRoot();
    const storage = memoryStorage();
    applyDocumentTheme("dark", { root, storage });
    expect(root.dataset.theme).toBe("dark");
    expect(storage.data.get("tnk:theme")).toBe("dark");
  });

  it("removes the attribute for system and stores system", () => {
    const root = fakeRoot("light");
    const storage = memoryStorage({ "tnk:theme": "light" });
    applyDocumentTheme("system", { root, storage });
    expect("theme" in root.dataset).toBe(false);
    expect(storage.data.get("tnk:theme")).toBe("system");
  });

  it("still sets the attribute and throws nothing when setItem throws", () => {
    const root = fakeRoot();
    expect(() => applyDocumentTheme("light", { root, storage: throwingStorage })).not.toThrow();
    expect(root.dataset.theme).toBe("light");
  });
});

describe("index.html theme script and font preload", () => {
  const root = join(import.meta.dirname, "..", "..");
  const html = readFileSync(join(root, "index.html"), "utf8");
  const head = html.slice(0, html.indexOf("</head>"));

  it("runs one classic inline script in <head>, before the module script, with the same key", () => {
    const inline = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? "");
    expect(inline).toHaveLength(1);
    const body = inline[0] as string;
    expect(body).toContain(`localStorage.getItem("${THEME_KEY}")`);
    expect(body).toMatch(/try\s*{/);
    expect(body).toMatch(/catch/);
    expect(body).toContain(`stored === "light" || stored === "dark"`);
    expect(body).not.toMatch(/innerHTML|eval\(|document\.write/);
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf(`<script type="module"`));
  });

  it("preloads exactly the display and body font files of the DESIGN.md tokens block", () => {
    const doc = loadTokens(root, SYSTEM_INPUT);
    const filesOf = (family: string) =>
      Object.values(doc.font)
        .filter((leaf) => leaf.$value[0] === family)
        .flatMap((leaf) => leaf.$extensions?.tnk.files ?? [])
        .map((f) => f.src);
    const expected = new Set([
      ...filesOf(doc.font.display.$value[0] as string),
      ...filesOf(doc.font.sans.$value[0] as string),
    ]);
    const preloads = [...head.matchAll(/<link\s[^>]*rel="preload"[^>]*>/g)].map((m) => m[0]);
    const hrefs = preloads.map((l) => /href="([^"]+)"/.exec(l)?.[1]);
    expect(new Set(hrefs)).toEqual(expected);
    expect(hrefs).toHaveLength(expected.size);
    for (const link of preloads) {
      expect(link).toContain(`as="font"`);
      expect(link).toContain(`type="font/woff2"`);
      expect(link).toContain("crossorigin");
    }
  });
});

describe("resolveTheme", () => {
  it("lets a valid ?theme= win over everything", () => {
    expect(
      resolveTheme({ param: "light", stored: "dark", prefersDark: true, primary: "dark" }),
    ).toBe("light");
  });

  it("uses a stored light or dark choice when there is no param", () => {
    expect(
      resolveTheme({ param: null, stored: "dark", prefersDark: false, primary: "light" }),
    ).toBe("dark");
  });

  it("uses the direction's primary theme for a stored system choice", () => {
    expect(
      resolveTheme({ param: null, stored: "system", prefersDark: true, primary: "light" }),
    ).toBe("light");
  });

  it("follows prefers-color-scheme for a stored system choice when there is no primary", () => {
    expect(resolveTheme({ param: null, stored: "system", prefersDark: true })).toBe("dark");
    expect(resolveTheme({ param: null, stored: "system", prefersDark: false })).toBe("light");
  });

  it("ignores an invalid param", () => {
    expect(resolveTheme({ param: "sepia", stored: "dark", prefersDark: false })).toBe("dark");
  });
});

describe("StatCard", () => {
  it("shows three figures in the mono family with each label beside its figure", () => {
    const html = renderToStaticMarkup(
      <StatCard
        figures={[
          { value: "18.4", unit: "s", label: "first pass to shot" },
          { value: "59.3", unit: "m", label: "ball moved upfield before the shot" },
          { value: "7", label: "City players on the ball" },
        ]}
      />,
    );
    expect(count(html, "data-stat-figure")).toBe(3);
    const figures = html.split("data-stat-figure").slice(1);
    for (const f of figures) expect(f).toMatch(/^[^>]*class="[^"]*font-mono[^"]*tabular-nums/);
    // Each figure and its label share one row (a flex line), label second.
    const rows = html.split('<div class="flex min-w-0 items-baseline gap-2">').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("first pass to shot");
    expect(rows[0]).toContain("18.4");
  });
});

describe("DataTable", () => {
  const rows = [
    { id: "a", n: 1, who: "Mangala", metres: "+14.4" },
    { id: "b", n: 2, who: "Danilo", metres: "−15.3" },
  ];
  const columns = [
    { id: "n", header: "#", numeric: true, cell: (r: (typeof rows)[number]) => r.n },
    { id: "who", header: "Who", cell: (r: (typeof rows)[number]) => r.who },
    { id: "m", header: "Metres", numeric: true, cell: (r: (typeof rows)[number]) => r.metres },
  ];

  it("has a caption, right-aligned mono numerals and aria-selected on the active row", () => {
    const html = renderToStaticMarkup(
      <DataTable
        caption="All ten actions"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        activeRow="b"
        onRowEnter={() => {}}
      />,
    );
    expect(html).toMatch(/<caption[^>]*>All ten actions<\/caption>/);
    const cells = [...html.matchAll(/<td class="([^"]*)">([^<]*)<\/td>/g)];
    const numeric = cells.filter((m) => m[2] === "+14.4" || m[2] === "1");
    expect(numeric.length).toBe(2);
    for (const m of numeric) {
      expect(m[1]).toContain("text-right");
      expect(m[1]).toContain("font-mono");
    }
    expect(html).toMatch(/data-row="b" aria-selected="true"/);
    expect(html).toMatch(/data-row="a" aria-selected="false"/);
  });

  it("shows the empty copy when there are no rows", () => {
    const html = renderToStaticMarkup(
      <DataTable
        caption="All ten actions"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        empty={{
          heading: "No events in this window",
          body: "Widen the time window or pick another match to see events here.",
        }}
      />,
    );
    expect(html).toContain("No events in this window");
    expect(html).not.toContain("<table");
  });
});

describe("Field", () => {
  const ERROR = "Enter a number from 0 to 100.";

  it("links the error text to the input with aria-describedby and marks it invalid", () => {
    const html = renderToStaticMarkup(
      <TextInput label="Minutes" defaultValue="abc" error={ERROR} />,
    );
    const input = /<input[^>]*>/.exec(html)?.[0] ?? "";
    expect(input).toContain('aria-invalid="true"');
    const describedBy = /aria-describedby="([^"]+)"/.exec(input)?.[1] ?? "";
    expect(describedBy).not.toBe("");
    const ids = describedBy.split(" ");
    const errorId = ids.find((id) => html.includes(`id="${id}"`) && html.includes(ERROR));
    expect(errorId).toBeDefined();
    const errorText = html.split(`id="${errorId}"`)[1]?.replace(/<[^>]+>/g, "") ?? "";
    expect(errorText).toContain(ERROR);
    expect(html).toContain("text-danger");
  });

  it("renders no error text and no invalid flag when there is no error", () => {
    const html = renderToStaticMarkup(<TextInput label="Minutes" defaultValue="42" />);
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain('text-danger"');
  });

  it("names the input with its visible label", () => {
    const html = renderToStaticMarkup(<TextInput label="Minutes" defaultValue="42" />);
    const label = /<label[^>]*for="([^"]+)"/.exec(html)?.[1];
    expect(label).toBeDefined();
    expect(html).toContain(`id="${label}"`);
  });

  it("number input keeps the same error link and a text input mode", () => {
    const html = renderToStaticMarkup(
      <NumberInput label="Minutes" defaultValue={140} min={0} max={100} error={ERROR} />,
    );
    const input = /<input[^>]*>/.exec(html)?.[0] ?? "";
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain("aria-describedby=");
    expect(html).toContain(ERROR);
  });
});

describe("Choice, Tabs and Slider", () => {
  it("marks the checked radio aria-checked true and the others false", () => {
    const html = renderToStaticMarkup(
      <RadioGroup
        label="Possession"
        options={[
          { value: "with", label: "With the ball" },
          { value: "without", label: "Without the ball" },
        ]}
        defaultValue="with"
      />,
    );
    expect(count(html, 'role="radio"')).toBe(2);
    expect(count(html, 'aria-checked="true"')).toBe(1);
    expect(count(html, 'aria-checked="false"')).toBe(1);
    expect(html).toContain('role="radiogroup"');
  });

  it("renders a checked checkbox with its label inside the target", () => {
    const html = renderToStaticMarkup(<Checkbox label="Show xG" defaultChecked />);
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html.startsWith("<label")).toBe(true);
  });

  it("gives the tab list role tablist, an accessible name and the selected tab", () => {
    const html = renderToStaticMarkup(
      <Tabs
        label="Team plan"
        tabs={[
          { value: "a", label: "Shape", content: "One" },
          { value: "b", label: "Press", content: "Two" },
        ]}
        defaultValue="b"
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Team plan"');
    expect(count(html, 'role="tab"')).toBe(2);
    expect(html).toMatch(
      /role="tab"[^>]*aria-selected="true"[^>]*>Press|aria-selected="true"[^>]*role="tab"/,
    );
  });

  it("names the slider and shows its value", () => {
    const html = renderToStaticMarkup(
      <Slider label="Sample size" min={10} max={200} step={10} defaultValue={100} />,
    );
    expect(html).toContain("Sample size");
    expect(html).toContain("100");
  });
});

describe("QuizOption", () => {
  const render = (state: QuizOptionState) =>
    renderToStaticMarkup(<QuizOption label="A back pass" state={state} />);

  it("shows the check icon and the word Correct for the right answer", () => {
    const html = render("correct");
    expect(html).toContain("M4.5 10.5 L8.5 14.5 L15.5 5.5");
    expect(html).toContain(">Correct<");
    expect(html).toContain('data-answer="correct"');
  });

  it("shows the cross icon and the full sentence for a wrong pick", () => {
    const html = render("incorrect");
    expect(html).toContain("M5.5 5.5 L14.5 14.5 M14.5 5.5 L5.5 14.5");
    expect(html).toContain(">Not quite — here is the answer<");
  });

  it("marks a selected option with the accent marker and aria-pressed", () => {
    const html = render("selected");
    expect(html).toContain("bg-accent");
    expect(html).toContain('aria-pressed="true"');
  });

  it("leaves the tab order only when disabled, and keeps a revealed option readable", () => {
    expect(render("disabled")).toMatch(/<button[^>]* disabled=""/);
    expect(render("correct")).not.toMatch(/<button[^>]* disabled=""/);
    expect(render("idle")).not.toContain("Correct");
    expect(render("idle")).not.toContain("<svg");
  });

  it("writes the forced hover and focus looks to data-state", () => {
    expect(render("hover")).toContain('data-state="hover"');
    expect(render("focus")).toContain('data-state="focus-visible"');
  });
});

describe("ProgressRing", () => {
  it("exposes Base UI meter semantics for 4 of 10 concepts", () => {
    const html = renderToStaticMarkup(<ProgressRing value={4} max={10} label="4 of 10 concepts" />);
    expect(html).toContain('role="meter"');
    expect(html).toContain('aria-valuenow="4"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="10"');
    expect(html).toContain("4 of 10 concepts");
    expect(html).toContain("40%");
    expect(html).toContain("stroke-accent");
  });

  it("draws no fill at 0 and a full ring at 100 percent", () => {
    const empty = renderToStaticMarkup(
      <ProgressRing value={0} max={10} label="0 of 10 concepts" />,
    );
    expect(empty).not.toContain("data-ring-fill");
    expect(empty).toContain("0%");
    const full = renderToStaticMarkup(
      <ProgressRing value={10} max={10} label="10 of 10 concepts" />,
    );
    expect(full).toContain('stroke-dasharray="100 0"');
  });

  it("keeps a value above the maximum inside the ring", () => {
    const html = renderToStaticMarkup(
      <ProgressRing value={14} max={10} label="10 of 10 concepts" />,
    );
    expect(html).toContain('aria-valuenow="10"');
  });
});

describe("Badge", () => {
  it("renders the words for every kind and the check icon only for done", () => {
    const neutral = renderToStaticMarkup(<Badge kind="neutral">Chapter 2</Badge>);
    const done = renderToStaticMarkup(<Badge kind="done">Done</Badge>);
    const fresh = renderToStaticMarkup(<Badge kind="new">New</Badge>);
    expect(neutral).toContain(">Chapter 2<");
    expect(done).toContain(">Done<");
    expect(done).toContain("M4.5 10.5 L8.5 14.5 L15.5 5.5");
    expect(fresh).toContain(">New<");
    expect(neutral).not.toContain("<svg");
    expect(fresh).not.toContain("<svg");
  });
});

describe("Surface", () => {
  it("maps the levels to the surface tokens and adds the shadow token only for a sheet", () => {
    expect(renderToStaticMarkup(<Surface level="page" />)).toContain("bg-surface-page");
    expect(renderToStaticMarkup(<Surface level="panel" />)).toContain("bg-surface-panel");
    const raised = renderToStaticMarkup(<Surface level="raised" />);
    expect(raised).toContain("bg-surface-raised");
    expect(raised).not.toContain("shadow-sheet");
    expect(renderToStaticMarkup(<Surface level="raised" sheet />)).toContain("shadow-sheet");
  });
});
