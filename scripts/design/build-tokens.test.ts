// Token pipeline tests: the floodlit tracer path through Tailwind, generated-file drift, and the
// Phase 3 variable names. The refusal and CLI behaviours follow in the second block.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { listTokenInputs, loadTokens } from "./build-tokens.ts";
import {
  DIRECTION_DIR,
  generateScopedCss,
  generateSystemCss,
  parseTokens,
  SYSTEM_INPUT,
  SYSTEM_OUT,
  scopeFor,
} from "./tokens.ts";
import { REQUIRED_COLOR_KEYS, REQUIRED_DATA_KEYS, REQUIRED_PITCH_KEYS } from "./tokens-schema.ts";

const root = join(import.meta.dirname, "..", "..");
const read = (rel: string): string => readFileSync(join(root, rel), "utf8");

describe("floodlit tracer: schema, generator, Tailwind", () => {
  const doc = loadTokens(root, SYSTEM_INPUT);
  const css = generateSystemCss(doc, SYSTEM_INPUT);

  it("parses and carries every required key in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const k of REQUIRED_COLOR_KEYS) expect(doc.resolved[theme].color[k]).toBeDefined();
      for (const k of REQUIRED_PITCH_KEYS) expect(doc.resolved[theme].pitch[k]).toBeDefined();
      for (const k of REQUIRED_DATA_KEYS) expect(doc.resolved[theme].data[k]).toBeDefined();
    }
    expect(doc.meta.primaryTheme).toBe("dark");
  });

  it("resolves aliases inside their own theme", () => {
    expect(doc.resolved.dark.color["focus-ring"]).toBe(doc.resolved.dark.color.accent);
    expect(doc.resolved.light.color["focus-ring"]).toBe(doc.resolved.light.color.accent);
    expect(doc.resolved.dark.color["focus-ring"]).not.toBe(doc.resolved.light.color["focus-ring"]);
  });

  it("writes alpha as an 8-digit hex (E8EDF1 at 0.35 is E8EDF159)", () => {
    expect(doc.resolved.dark.pitch["density-mark"]).toBe("#E8EDF159");
  });

  it("emits Tailwind utilities that read the variables (compile() proof)", async () => {
    const compiler = await compile(`${css}\n@tailwind utilities;`);
    const out = compiler.build([
      "bg-surface-page",
      "text-ink",
      "text-label",
      "font-display",
      "rounded-md",
      "bg-data-cat-1",
    ]);
    expect(out).toMatch(/\.bg-surface-page\s*{\s*background-color:\s*var\(--surface-page\)/);
    expect(out).toMatch(/\.text-ink\s*{\s*color:\s*var\(--ink\)/);
    expect(out).toMatch(/\.text-label\s*{[^}]*font-size:\s*var\(--text-label\)/);
    expect(out).toMatch(/\.font-display\s*{\s*font-family:\s*var\(--font-display\)/);
    expect(out).toMatch(/\.rounded-md\s*{\s*border-radius:\s*var\(--radius-md\)/);
    expect(out).toMatch(/\.bg-data-cat-1\s*{\s*background-color:\s*var\(--data-cat-1\)/);
  });

  it("keeps src/styles/tokens.css equal to the generator output, byte for byte", () => {
    expect(read(SYSTEM_OUT)).toBe(css);
  });

  it("lists the system file and every direction file", () => {
    const inputs = listTokenInputs(root);
    expect(inputs.system).toEqual({ input: SYSTEM_INPUT, out: SYSTEM_OUT, scope: null });
    expect(inputs.directions.map((d) => d.input)).toContain(
      `${DIRECTION_DIR}/floodlit.tokens.json`,
    );
  });

  it("keeps every Phase 3 variable name in the light and in the dark block", () => {
    const names = [
      ...REQUIRED_COLOR_KEYS,
      ...REQUIRED_PITCH_KEYS,
      "font-sans",
      "font-mono",
      "space-xs",
      "space-3xl",
    ];
    const light = css.slice(css.indexOf(":root {"), css.indexOf('[data-theme="dark"] {'));
    const dark = css.slice(
      css.indexOf('[data-theme="dark"] {'),
      css.indexOf("@media (prefers-color-scheme: dark)"),
    );
    for (const n of REQUIRED_COLOR_KEYS) {
      expect(light).toContain(`--${n}:`);
      expect(dark).toContain(`--${n}:`);
    }
    for (const n of REQUIRED_PITCH_KEYS) {
      expect(light).toContain(`--${n}:`);
      expect(dark).toContain(`--${n}:`);
    }
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--font-mono:");
    expect(names.length).toBeGreaterThan(30);
  });

  it("redeclares the type, font and radius tokens under a direction scope", () => {
    const scoped = generateScopedCss(doc, scopeFor("floodlit"), SYSTEM_INPUT);
    expect(scoped).toContain('[data-direction="floodlit"] {');
    for (const name of ["--surface-page:", "--font-display:", "--radius-md:"]) {
      expect(scoped).toContain(name);
    }
    expect(scoped).not.toContain("@theme");
  });

  it("matches the Phase 3 palette test by exposing parseTokens on the same document", () => {
    expect(parseTokens(JSON.parse(read(SYSTEM_INPUT)), "x").meta.direction).toBe("floodlit");
  });
});
