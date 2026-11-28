// Token pipeline tests: the floodlit tracer path through Tailwind, generated-file drift, and the
// Phase 3 variable names. The refusal and CLI behaviours follow in the second block.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { listTokenInputs, loadTokens } from "./build-tokens.ts";
import {
  DIRECTION_DIR,
  extractTokensBlock,
  generateScopedCss,
  generateSystemCss,
  isValidScope,
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
  });

  it("redeclares the type, font and radius tokens under a direction scope", () => {
    const scoped = generateScopedCss(doc, scopeFor("floodlit"), SYSTEM_INPUT);
    expect(scoped).toContain('[data-direction="floodlit"] {');
    for (const name of ["--surface-page:", "--font-display:", "--radius-md:"]) {
      expect(scoped).toContain(name);
    }
    expect(scoped).not.toContain("@theme");
  });
});

// biome-ignore lint/suspicious/noExplicitAny: test fixtures mutate a parsed JSON document
type Json = Record<string, any>;
const floodlitJson = (): Json => JSON.parse(extractTokensBlock(read(SYSTEM_INPUT)));
const SCRIPT = join(root, "scripts", "design", "build-tokens.ts");
const run = (args: string[]) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: "utf8" });

describe("all three direction sets", () => {
  const ids = ["floodlit", "programme", "notebook"] as const;
  const primary = { floodlit: "dark", programme: "light", notebook: "light" } as const;

  for (const id of ids) {
    it(`${id}: parses with every required key in both themes`, () => {
      const doc = loadTokens(root, `${DIRECTION_DIR}/${id}.tokens.json`);
      expect(doc.meta.direction).toBe(id);
      expect(doc.meta.primaryTheme).toBe(primary[id]);
      for (const theme of ["light", "dark"] as const) {
        for (const k of REQUIRED_COLOR_KEYS) expect(doc.resolved[theme].color[k]).toBeDefined();
        for (const k of REQUIRED_PITCH_KEYS) expect(doc.resolved[theme].pitch[k]).toBeDefined();
        for (const k of REQUIRED_DATA_KEYS) expect(doc.resolved[theme].data[k]).toBeDefined();
      }
    });

    it(`${id}: scoped CSS file equals the generator output`, () => {
      const rel = `${DIRECTION_DIR}/${id}.tokens.json`;
      const doc = loadTokens(root, rel);
      expect(read(`${DIRECTION_DIR}/${id}.css`)).toBe(generateScopedCss(doc, scopeFor(id), rel));
    });
  }

  it("programme keeps accent for fills and rings focus in ink on the light page", () => {
    const doc = loadTokens(root, `${DIRECTION_DIR}/programme.tokens.json`);
    expect(doc.resolved.light.color["focus-ring"]).toBe(doc.resolved.light.color.ink);
    expect(doc.resolved.dark.color["focus-ring"]).toBe(doc.resolved.dark.color.accent);
    expect(doc.resolved.light.color["surface-highlight"]).toBe("#F5D90A");
    expect(doc.resolved.light.color["surface-highlight-ink"]).toBe("#10241A");
  });

  it("the three directions use three different display families", () => {
    const families = ids.map(
      (id) => loadTokens(root, `${DIRECTION_DIR}/${id}.tokens.json`).font.display.$value[0],
    );
    expect(new Set(families).size).toBe(3);
  });
});

describe("validation refuses malformed input", () => {
  it("resolves {color.accent} to the same theme's accent", () => {
    const j = floodlitJson();
    j.color.dark["focus-ring"] = { $type: "color", $value: "{color.accent}" };
    expect(parseTokens(j, "t").resolved.dark.color["focus-ring"]).toBe(j.color.dark.accent.$value);
  });

  it("throws on an alias cycle, naming the key path", () => {
    const j = floodlitJson();
    j.color.light.accent = { $type: "color", $value: "{color.ink}" };
    j.color.light.ink = { $type: "color", $value: "{color.accent}" };
    expect(() => parseTokens(j, "t")).toThrow(/alias cycle.*color\.light\.(accent|ink)/);
  });

  it("throws on an unknown alias", () => {
    const j = floodlitJson();
    j.color.light["focus-ring"] = { $type: "color", $value: "{color.nope}" };
    expect(() => parseTokens(j, "t")).toThrow(/unknown alias \{color\.nope\}/);
  });

  it("refuses a colour that is not #RRGGBB or #RRGGBBAA, naming the key", () => {
    const j = floodlitJson();
    j.color.light.accent = { $type: "color", $value: "#12345" };
    expect(() => parseTokens(j, "t")).toThrow(/color\.light\.accent/);
  });

  it("refuses a missing required key and an unexpected key", () => {
    const missing = floodlitJson();
    delete missing.pitch.dark["team-a"];
    expect(() => parseTokens(missing, "t")).toThrow(/pitch\.dark: missing required key team-a/);
    const extra = floodlitJson();
    extra.data.light["cat-9"] = { $type: "color", $value: "#FFFFFF" };
    expect(() => parseTokens(extra, "t")).toThrow(/data\.light: unexpected key cat-9/);
  });

  it("refuses a font family with a semicolon and a font src off /fonts/", () => {
    const fam = floodlitJson();
    fam.font.display.$value[0] = "Mona;Sans";
    expect(() => parseTokens(fam, "t")).toThrow(/font\.display/);
    const src = floodlitJson();
    src.font.display.$extensions.tnk.files[0].src = "https://cdn.example/x.woff2";
    expect(() => parseTokens(src, "t")).toThrow(/font\.display/);
  });

  it('accepts only [data-direction="<kebab-id>"] scopes', () => {
    expect(isValidScope('[data-direction="floodlit"]')).toBe(true);
    expect(isValidScope("body{}")).toBe(false);
    expect(isValidScope("[data-direction=x]")).toBe(false);
    expect(isValidScope('[data-direction="a{b"]')).toBe(false);
    expect(() => generateScopedCss(loadTokens(root, SYSTEM_INPUT), "body{}", "t")).toThrow(/scope/);
  });

  it("generates identical output twice, with only LF endings and one trailing newline", () => {
    const doc = loadTokens(root, SYSTEM_INPUT);
    const a = generateSystemCss(doc, SYSTEM_INPUT);
    expect(generateSystemCss(doc, SYSTEM_INPUT)).toBe(a);
    expect(a).not.toContain("\r");
    expect(a.endsWith("}\n")).toBe(true);
    expect(a.endsWith("\n\n")).toBe(false);
  });

  it("extracts exactly one tokens block from Markdown", () => {
    const one = '# T\n\n```tokens\n{"a":1}\n```\n';
    expect(extractTokensBlock(one).trim()).toBe('{"a":1}');
    expect(() => extractTokensBlock("# none\n")).toThrow(/found 0/);
    expect(() => extractTokensBlock(`${one}\n${one}`)).toThrow(/found 2/);
  });
});

describe("CLI", () => {
  it("--check exits 0 on the unchanged tree and prints the file count", () => {
    const r = run(["--check"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/tokens ok: 4 file\(s\)/);
  });

  it("--check exits 1 and prints 'tokens drift:' after one changed byte", () => {
    const dir = mkdtempSync(join(tmpdir(), "tnk-tokens-"));
    const out = join(dir, "floodlit.css");
    copyFileSync(join(root, DIRECTION_DIR, "floodlit.css"), out);
    const args = [
      "--input",
      `${DIRECTION_DIR}/floodlit.tokens.json`,
      "--out",
      out,
      "--scope",
      scopeFor("floodlit"),
      "--check",
    ];
    expect(run(args).status).toBe(0);
    writeFileSync(out, readFileSync(out, "utf8").replace("#F3F5F7", "#F3F5F8"));
    const r = run(args);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("tokens drift:");
  });

  it("exits 1 on a refused scope", () => {
    const r = run([
      "--input",
      join(root, DIRECTION_DIR, "floodlit.tokens.json"),
      "--out",
      join(tmpdir(), "never-written.css"),
      "--scope",
      "body{}",
    ]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("--scope");
  });

  it("exits 2 on an unknown option", () => {
    expect(run(["--nope"]).status).toBe(2);
  });
});
