// Token build CLI.
//   node scripts/design/build-tokens.ts                       regenerate every output
//   node scripts/design/build-tokens.ts --check               exit 1 on any drift
//   node scripts/design/build-tokens.ts --input <file.md|file.json> --out <file.css> [--scope <sel>] [--check]
// Exit 0 ok, 1 invalid input or drift, 2 bad arguments. Paths resolve from the repo root with
// node:path (the path holds spaces; no shell strings anywhere). Erasable TypeScript only.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkDesignHeadings,
  DIRECTION_DIR,
  extractTokensBlock,
  generateScopedCss,
  generateSystemCss,
  isValidScope,
  parseTokens,
  SYSTEM_INPUT,
  SYSTEM_OUT,
  scopeFor,
  type TokenDocument,
} from "./tokens.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const USAGE =
  "usage: node scripts/design/build-tokens.ts [--check] [--input <file.md|file.json> --out <file.css> [--scope <selector>]]";

export type TokenPair = { input: string; out: string; scope: string | null };
export type TokenInputs = { system: TokenPair; directions: TokenPair[] };

const posix = (p: string): string => p.replaceAll("\\", "/");

/** System input and every direction token file, repo-relative. A missing folder gives []. */
export function listTokenInputs(root: string = ROOT): TokenInputs {
  const dir = join(root, DIRECTION_DIR);
  const names = existsSync(dir)
    ? readdirSync(dir)
        .filter((n) => n.endsWith(".tokens.json"))
        .sort()
    : [];
  return {
    system: { input: SYSTEM_INPUT, out: SYSTEM_OUT, scope: null },
    directions: names.map((n) => ({
      input: posix(`${DIRECTION_DIR}/${n}`),
      out: posix(`${DIRECTION_DIR}/${n.replace(/\.tokens\.json$/, ".css")}`),
      scope: null,
    })),
  };
}

/**
 * Reads and validates one token input. A Markdown input must also have the DESIGN.md section
 * structure; the error then lists every missing, duplicate or out-of-order heading.
 */
export function loadTokens(root: string, input: string): TokenDocument {
  const text = readFileSync(resolve(root, input), "utf8");
  if (input.endsWith(".md")) {
    const problems = checkDesignHeadings(text);
    if (problems.length > 0) {
      throw new Error(`${input}: DESIGN.md sections are wrong:\n  ${problems.join("\n  ")}`);
    }
  }
  let json: unknown;
  try {
    json = JSON.parse(input.endsWith(".md") ? extractTokensBlock(text) : text);
  } catch (err) {
    throw new Error(`${input}: ${(err as Error).message}`);
  }
  return parseTokens(json, input);
}

/**
 * Generated CSS for one pair. `scope` null means the system file when the output is
 * src/styles/tokens.css or the input is Markdown (DESIGN.md is always the system document).
 */
export function renderPair(root: string, pair: TokenPair): string {
  const doc = loadTokens(root, pair.input);
  if (pair.scope === null && (pair.out === SYSTEM_OUT || pair.input.endsWith(".md"))) {
    return generateSystemCss(doc, pair.input);
  }
  const scope = pair.scope ?? scopeFor(doc.meta.direction);
  if (pair.scope === null && pair.input.endsWith(".tokens.json")) {
    const id = pair.input
      .split("/")
      .pop()
      ?.replace(/\.tokens\.json$/, "");
    if (id !== doc.meta.direction) {
      throw new Error(`${pair.input}: meta.direction "${doc.meta.direction}" must equal "${id}"`);
    }
  }
  return generateScopedCss(doc, scope, pair.input);
}

function readIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function parseArgs(argv: string[]): {
  check: boolean;
  input?: string;
  out?: string;
  scope?: string;
} {
  const args: { check: boolean; input?: string; out?: string; scope?: string } = { check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--check") args.check = true;
    else if (a === "--input" || a === "--out" || a === "--scope") {
      const v = argv[i + 1];
      if (v === undefined) throw new UsageError(`${a} needs a value`);
      args[a.slice(2) as "input" | "out" | "scope"] = v;
      i += 1;
    } else throw new UsageError(`unknown option ${a}`);
  }
  if ((args.input === undefined) !== (args.out === undefined)) {
    throw new UsageError("--input and --out go together");
  }
  return args;
}

class UsageError extends Error {}

function main(argv: string[]): number {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(`${(err as Error).message}\n${USAGE}`);
    return 2;
  }
  if (args.scope !== undefined && !isValidScope(args.scope)) {
    console.error(`--scope must match [data-direction="<kebab-id>"], got ${args.scope}`);
    return 1;
  }
  const pairs: TokenPair[] =
    args.input !== undefined && args.out !== undefined
      ? [{ input: args.input, out: args.out, scope: args.scope ?? null }]
      : (() => {
          const all = listTokenInputs(ROOT);
          return [all.system, ...all.directions];
        })();
  let written = 0;
  for (const pair of pairs) {
    let css: string;
    try {
      css = renderPair(ROOT, pair);
    } catch (err) {
      console.error((err as Error).message);
      return 1;
    }
    const outPath = resolve(ROOT, pair.out);
    if (args.check) {
      if (readIfExists(outPath) !== css) {
        console.error(`tokens drift: ${pair.out} differs from ${pair.input}`);
        return 1;
      }
    } else if (readIfExists(outPath) !== css) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, css);
      written += 1;
    }
  }
  console.log(
    args.check
      ? `tokens ok: ${pairs.length} file(s)`
      : `tokens written: ${written} of ${pairs.length} file(s)`,
  );
  return 0;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
