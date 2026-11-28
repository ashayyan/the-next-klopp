import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShellBar } from "./lesson/ShellBar.tsx";
import { LESSON_LOOP_STEPS, StepRail } from "./lesson/StepRail.tsx";

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
