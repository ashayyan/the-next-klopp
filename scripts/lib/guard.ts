// Pure repo-guard rules. No I/O. Erasable TypeScript only (no enums, namespaces or
// parameter properties) so `node file.ts` native type stripping can run it.
//
// Secret patterns use character classes so this file's own text cannot match them.

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface FileInput {
  path: string;
  size: number;
  /** null for binary or unread files: only the size and path rules apply. */
  content: string | null;
}

export interface Violation {
  rule: string;
  path: string;
  detail?: string;
}

const DENIED_PREFIXES: readonly string[] = [
  "feedback/",
  "public/pyodide/",
  ".claude/skills/",
  ".claude/worktrees/",
  ".agents/",
  ".taste-skill/",
  "pipeline/.venv/",
  "node_modules/",
  "dist/",
  "test-results/",
  "playwright-report/",
];

const DENIED_EXTENSIONS: readonly string[] = [
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".db",
  ".sqlite",
  ".mp4",
  ".mkv",
  ".mov",
  ".avi",
];

const DENIED_BASENAMES: readonly string[] = ["credentials.json"];

function normalise(path: string): string {
  let p = path.replace(/\\/g, "/");
  while (p.startsWith("./")) p = p.slice(2);
  return p;
}

function basename(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

/** Returns a human reason when the path must never be committed, otherwise null. */
export function isDeniedPath(path: string): string | null {
  const p = normalise(path);
  const segments = p.split("/");
  const base = basename(p);
  const lower = base.toLowerCase();

  if (segments.includes("raw")) return "raw data folder";
  if (base === ".env" || (base.startsWith(".env.") && base !== ".env.example")) {
    return "env file";
  }
  if (lower.endsWith(".parquet") && !p.startsWith("public/data/")) {
    return "parquet outside public/data/";
  }
  for (const prefix of DENIED_PREFIXES) {
    if (p.startsWith(prefix)) return `under ${prefix}`;
  }
  if (p === ".claude/settings.local.json") return "local settings";
  if (base.startsWith("THE_NEXT_KLOPP_MASTER_PROMPT")) return "learner brief copy";
  for (const ext of DENIED_EXTENSIONS) {
    if (lower.endsWith(ext)) return `forbidden extension ${ext}`;
  }
  if (DENIED_BASENAMES.includes(lower)) return "credentials file";
  if (lower.startsWith("id_rsa") || lower.startsWith("id_ed25519")) {
    return "ssh private key";
  }
  return null;
}

interface SecretRule {
  id: string;
  pattern: RegExp;
  /** Return true to ignore a match (documented example values). */
  ignore?: (match: string) => boolean;
}

const SECRET_RULES: readonly SecretRule[] = [
  {
    id: "aws-access-key",
    pattern: /\b(?:AKI[A]|ASI[A])[A-Z0-9]{16}\b/g,
    ignore: (m) => m.endsWith("EXAMPLE"),
  },
  {
    id: "github-token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}|\bgithub_pat_[A-Za-z0-9_]{22,}/g,
  },
  {
    id: "private-key",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    id: "slack-token",
    pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  },
  {
    id: "anthropic-key",
    pattern: /\bsk-ant-[A-Za-z0-9_-]{8,}/g,
  },
  {
    id: "openai-key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g,
  },
  {
    id: "generic-secret-assignment",
    pattern: /(?:api_?key|secret|token|password)["']?\s*[:=]\s*["'][A-Za-z0-9_\-./+=]{16,}["']/gi,
  },
];

/** Returns the ids of every secret rule that matches the text. */
export function findSecrets(text: string): string[] {
  const hits: string[] = [];
  for (const rule of SECRET_RULES) {
    rule.pattern.lastIndex = 0;
    let found = false;
    for (const m of text.matchAll(rule.pattern)) {
      if (rule.ignore?.(m[0])) continue;
      found = true;
      break;
    }
    if (found) hits.push(rule.id);
  }
  return hits;
}

export function checkFile(input: FileInput): Violation[] {
  const path = normalise(input.path);
  const violations: Violation[] = [];

  if (input.size > MAX_FILE_BYTES) {
    violations.push({
      rule: "oversize",
      path,
      detail: `${input.size} bytes > ${MAX_FILE_BYTES}`,
    });
  }

  const denied = isDeniedPath(path);
  if (denied !== null) {
    violations.push({ rule: "denied-path", path, detail: denied });
  }

  if (input.content !== null) {
    for (const id of findSecrets(input.content)) {
      violations.push({ rule: `secret:${id}`, path });
    }
  }
  return violations;
}
