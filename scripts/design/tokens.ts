// Pure token library: block extraction, validation, alias resolution and CSS generation.
// No node:fs import at module level, so browser code and Playwright specs can import it.
// Output is byte-stable: key order comes from the schema key lists, "\n" line endings, one
// trailing newline. Erasable TypeScript only.

import {
  ALIAS,
  FONT_KEYS,
  RADIUS_KEYS,
  type RawTokenDocument,
  REQUIRED_COLOR_KEYS,
  REQUIRED_DATA_KEYS,
  REQUIRED_PITCH_KEYS,
  SPACE_KEYS,
  TEXT_KEYS,
  tokenDocumentSchema,
} from "./tokens-schema.ts";

export const SYSTEM_INPUT = "src/routes/dev-directions/tokens/floodlit.tokens.json";
export const SYSTEM_OUT = "src/styles/tokens.css";
export const DIRECTION_DIR = "src/routes/dev-directions/tokens";

export type Theme = "light" | "dark";
type Group = "color" | "pitch" | "data";
export type ResolvedTheme = Record<Group, Record<string, string>>;
export type TokenDocument = RawTokenDocument & { resolved: Record<Theme, ResolvedTheme> };

export function scopeFor(id: string): string {
  return `[data-direction="${id}"]`;
}

export function isValidScope(scope: string): boolean {
  return /^\[data-direction="[a-z-]+"\]$/.test(scope);
}

/** Returns the body of the single fenced block whose info string is `tokens`. */
export function extractTokensBlock(markdown: string): string {
  const text = markdown.replaceAll("\r\n", "\n");
  const blocks: string[] = [];
  const re = /^```tokens[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) blocks.push(m[1] ?? "");
  if (blocks.length !== 1) {
    throw new Error(`DESIGN.md must hold exactly one tokens block, found ${blocks.length}`);
  }
  return blocks[0] as string;
}

function describePath(path: PropertyKey[]): string {
  return path.map(String).join(".");
}

function checkKeys(label: string, actual: string[], required: readonly string[]): void {
  const missing = required.filter((k) => !actual.includes(k));
  if (missing.length > 0) throw new Error(`${label}: missing required key ${missing[0]}`);
  const extra = actual.filter((k) => !required.includes(k));
  if (extra.length > 0) throw new Error(`${label}: unexpected key ${extra[0]}`);
}

type Leaf = { $type: string; $value: string | number };

function resolveLeaf(
  groups: Record<Group, Record<string, Leaf>>,
  theme: Theme,
  group: Group,
  key: string,
  stack: string[],
): string {
  const path = `${group}.${theme}.${key}`;
  if (stack.includes(path)) throw new Error(`alias cycle: ${[...stack, path].join(" -> ")}`);
  const leaf = groups[group][key];
  if (leaf === undefined) throw new Error(`unknown alias at ${path}`);
  const value = leaf.$value;
  if (typeof value === "number") return String(value);
  if (!ALIAS.test(value)) return value;
  const [targetGroup, targetKey] = value.slice(1, -1).split(".") as [string, string];
  if (
    (targetGroup !== "color" && targetGroup !== "pitch" && targetGroup !== "data") ||
    groups[targetGroup][targetKey] === undefined
  ) {
    throw new Error(`unknown alias ${value} at ${path}`);
  }
  return resolveLeaf(groups, theme, targetGroup, targetKey, [...stack, path]);
}

/** Validates, checks required keys in both themes and resolves aliases inside each theme. */
export function parseTokens(json: unknown, source: string): TokenDocument {
  const parsed = tokenDocumentSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue === undefined ? "" : describePath(issue.path);
    throw new Error(`${source}: ${where}: ${issue?.message ?? "invalid token document"}`);
  }
  const doc = parsed.data;
  const resolved = { light: emptyTheme(), dark: emptyTheme() } as Record<Theme, ResolvedTheme>;
  for (const theme of ["light", "dark"] as const) {
    try {
      checkKeys(`color.${theme}`, Object.keys(doc.color[theme]), REQUIRED_COLOR_KEYS);
      checkKeys(`pitch.${theme}`, Object.keys(doc.pitch[theme]), REQUIRED_PITCH_KEYS);
      checkKeys(`data.${theme}`, Object.keys(doc.data[theme]), REQUIRED_DATA_KEYS);
      const groups: Record<Group, Record<string, Leaf>> = {
        color: doc.color[theme],
        pitch: doc.pitch[theme],
        data: doc.data[theme],
      };
      for (const group of ["color", "pitch", "data"] as const) {
        for (const key of Object.keys(groups[group])) {
          resolved[theme][group][key] = resolveLeaf(groups, theme, group, key, []);
        }
      }
    } catch (err) {
      throw new Error(`${source}: ${(err as Error).message}`);
    }
  }
  return { ...doc, resolved };
}

function emptyTheme(): ResolvedTheme {
  return { color: {}, pitch: {}, data: {} };
}

// ---------------------------------------------------------------------------------------------
// CSS generation

const px = (d: { value: number }): string => `${d.value}px`;
const ms = (d: { value: number }): string => `${d.value}ms`;
const GENERIC = new Set(["ui-sans-serif", "ui-serif", "ui-monospace", "system-ui", "sans-serif"]);
const GENERIC_ALL = new Set([...GENERIC, "serif", "monospace"]);

function familyList(names: string[]): string {
  return names.map((n) => (GENERIC_ALL.has(n) ? n : `"${n}"`)).join(", ");
}

function headerComment(source: string): string {
  return `/* ${source}: generated by scripts/design/build-tokens.ts, do not edit. */`;
}

function themedLines(doc: TokenDocument, theme: Theme, indent: string): string[] {
  const r = doc.resolved[theme];
  const lines: string[] = [];
  for (const k of REQUIRED_COLOR_KEYS) lines.push(`${indent}--${k}: ${r.color[k]};`);
  for (const k of REQUIRED_PITCH_KEYS) lines.push(`${indent}--${k}: ${r.pitch[k]};`);
  for (const k of REQUIRED_DATA_KEYS) lines.push(`${indent}--data-${k}: ${r.data[k]};`);
  return lines;
}

/** Plain custom properties that are not themed and create no Tailwind utility. */
function plainLines(doc: TokenDocument, indent: string): string[] {
  const lines: string[] = [];
  for (const k of SPACE_KEYS) lines.push(`${indent}--space-${k}: ${px(doc.space[k].$value)};`);
  lines.push(`${indent}--duration-ui: ${ms(doc.duration.ui.$value)};`);
  lines.push(`${indent}--duration-draw: ${ms(doc.duration.draw.$value)};`);
  lines.push(`${indent}--duration-morph: ${ms(doc.duration.morph.$value)};`);
  lines.push(`${indent}--stagger-line: ${ms(doc.duration["stagger-line"].$value)};`);
  lines.push(`${indent}--border-rule: ${px(doc.border.rule.$value)};`);
  lines.push(`${indent}--icon-stroke: ${px(doc.icon.stroke.$value)};`);
  lines.push(`${indent}--icon-linecap: ${doc.icon.stroke.$extensions.tnk.linecap};`);
  const g = doc.pitch.glyphText.$value;
  lines.push(`${indent}--pitch-glyph-text: ${px(g.fontSize)};`);
  lines.push(`${indent}--pitch-glyph-text--font-weight: ${g.fontWeight};`);
  lines.push(`${indent}--pitch-glyph-text--line-height: ${g.lineHeight};`);
  return lines;
}

/** Font, type, radius, shadow and easing: Tailwind theme namespaces. */
function typeLines(doc: TokenDocument, indent: string): string[] {
  const lines: string[] = [];
  for (const k of FONT_KEYS) {
    const leaf = doc.font[k];
    lines.push(`${indent}--font-${k}: ${familyList(leaf.$value)};`);
    const stretch = leaf.$extensions?.tnk.stretch;
    if (stretch !== undefined) lines.push(`${indent}--font-${k}-stretch: ${stretch};`);
  }
  for (const k of TEXT_KEYS) {
    const t = doc.text[k].$value;
    lines.push(`${indent}--text-${k}: ${px(t.fontSize)};`);
    lines.push(`${indent}--text-${k}--line-height: ${t.lineHeight};`);
    lines.push(`${indent}--text-${k}--font-weight: ${t.fontWeight};`);
  }
  for (const k of RADIUS_KEYS) lines.push(`${indent}--radius-${k}: ${px(doc.radius[k].$value)};`);
  const layers = doc.shadow.sheet.$value;
  const shadow =
    layers.length === 0
      ? "none"
      : layers
          .map((l) => `${px(l.offsetX)} ${px(l.offsetY)} ${px(l.blur)} ${px(l.spread)} ${l.color}`)
          .join(", ");
  lines.push(`${indent}--shadow-sheet: ${shadow};`);
  for (const k of ["ui", "morph"] as const) {
    lines.push(`${indent}--ease-${k}: cubic-bezier(${doc.easing[k].$value.join(", ")});`);
  }
  return lines;
}

function fontFaces(doc: TokenDocument): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of FONT_KEYS) {
    const leaf = doc.font[k];
    const name = leaf.$value[0] as string;
    for (const f of leaf.$extensions?.tnk.files ?? []) {
      const id = `${name}|${f.src}|${f.weight}|${f.stretch ?? ""}|${f.style}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const lines = [
        "@font-face {",
        `  font-family: "${name}";`,
        `  font-style: ${f.style};`,
        `  font-weight: ${f.weight};`,
      ];
      if (f.stretch !== undefined) lines.push(`  font-stretch: ${f.stretch};`);
      lines.push("  font-display: swap;", `  src: url("${f.src}") format("woff2");`, "}");
      out.push(lines.join("\n"));
    }
  }
  return out;
}

function colourScheme(theme: Theme, indent: string): string {
  return `${indent}color-scheme: ${theme};`;
}

function joinBlocks(blocks: string[]): string {
  return `${blocks.join("\n\n")}\n`;
}

export function generateSystemCss(doc: TokenDocument, source: string): string {
  const blocks: string[] = [headerComment(source)];
  blocks.push(...fontFaces(doc));
  blocks.push(
    [
      ":root {",
      colourScheme("light", "  "),
      ...themedLines(doc, "light", "  "),
      ...plainLines(doc, "  "),
      "}",
    ].join("\n"),
  );
  blocks.push(
    [
      '[data-theme="dark"] {',
      colourScheme("dark", "  "),
      ...themedLines(doc, "dark", "  "),
      "}",
    ].join("\n"),
  );
  blocks.push(
    [
      "@media (prefers-color-scheme: dark) {",
      '  :root:where(:not([data-theme="light"])) {',
      colourScheme("dark", "    "),
      ...themedLines(doc, "dark", "    "),
      "  }",
      "}",
    ].join("\n"),
  );
  const inline = [
    ...REQUIRED_COLOR_KEYS.map((k) => `  --color-${k}: var(--${k});`),
    ...REQUIRED_DATA_KEYS.map((k) => `  --color-data-${k}: var(--data-${k});`),
  ];
  blocks.push(["@theme inline {", ...inline, "}"].join("\n"));
  blocks.push(["@theme static {", ...typeLines(doc, "  "), "}"].join("\n"));
  return joinBlocks(blocks);
}

export function generateScopedCss(doc: TokenDocument, scope: string, source: string): string {
  if (!isValidScope(scope)) {
    throw new Error(`scope must match [data-direction="<kebab-id>"], got ${scope}`);
  }
  const blocks: string[] = [headerComment(source)];
  blocks.push(...fontFaces(doc));
  blocks.push(
    [
      `${scope} {`,
      colourScheme("light", "  "),
      ...themedLines(doc, "light", "  "),
      ...plainLines(doc, "  "),
      ...typeLines(doc, "  "),
      "}",
    ].join("\n"),
  );
  blocks.push(
    [
      `${scope}[data-theme="dark"] {`,
      colourScheme("dark", "  "),
      ...themedLines(doc, "dark", "  "),
      "}",
    ].join("\n"),
  );
  blocks.push(
    [
      "@media (prefers-color-scheme: dark) {",
      `  ${scope}:where(:not([data-theme="light"])) {`,
      colourScheme("dark", "    "),
      ...themedLines(doc, "dark", "    "),
      "  }",
      "}",
    ].join("\n"),
  );
  return joinBlocks(blocks);
}
