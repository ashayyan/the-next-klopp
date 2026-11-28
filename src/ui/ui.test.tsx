import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable } from "./data/DataTable.tsx";
import { StatCard } from "./data/StatCard.tsx";
import { ShellBar } from "./lesson/ShellBar.tsx";
import { LESSON_LOOP_STEPS, StepRail } from "./lesson/StepRail.tsx";
import { readStoredTheme, resolveTheme, THEME_KEY, writeStoredTheme } from "./theme.ts";

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
