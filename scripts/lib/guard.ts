// Pure repo-guard rules. No I/O. Erasable TypeScript only (no enums, namespaces or
// parameter properties) so `node file.ts` native type stripping can run it.
//
// Secret patterns use character classes so this file's own text cannot match them.

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface FileInput {
  path: string;
  size: number;
  /** null for unread files: only the size and path rules apply. */
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
  ".webm",
  ".m4v",
  ".wmv",
  ".sqlite3",
  ".db-wal",
  ".db-shm",
];

/**
 * Dataset ids from pipeline/sources.allow.json: `shippable: false` is local-only, `shippable: true`
 * may ship (ADR 0008). scripts/deny-manifest.test.ts asserts both lists equal the manifest and the
 * allow-list, so adding a source cannot skip the gate.
 */
export const LOCAL_ONLY_DATASETS: readonly string[] = [
  "last-row",
  "metrica",
  "skillcorner",
  "statsbomb",
];
export const SHIP_DATASETS: readonly string[] = ["dfl", "wyscout"];

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

/**
 * Returns a human reason when the path must never be committed, otherwise null.
 * Matching is case-insensitive (Windows and macOS file systems are) and prefix rules apply at
 * any depth, so `.ENV`, `Raw/a.csv` and `sub/node_modules/x.js` are all rejected.
 */
export function isDeniedPath(path: string): string | null {
  const p = normalise(path);
  const lowerPath = p.toLowerCase();
  const segments = lowerPath.split("/");
  const lower = basename(lowerPath);

  if (segments.includes("raw")) return "raw data folder";
  const dataIndex = segments.findIndex(
    (seg, i) =>
      seg === "data" &&
      i + 2 < segments.length &&
      LOCAL_ONLY_DATASETS.includes(segments[i + 1] ?? ""),
  );
  if (dataIndex !== -1)
    return `local-only dataset folder data/${segments[dataIndex + 1]}/ (ADR 0008)`;
  if (lowerPath.startsWith("public/data/")) {
    const rest = segments.slice(2);
    if (rest.length === 1 && rest[0] !== "catalog.json") {
      return "public/data/ holds only catalog.json at its top level (ADR 0008)";
    }
    if (rest.length > 1 && !SHIP_DATASETS.includes(rest[0] ?? "")) {
      return `public/data/${rest[0]}/ is not a ship dataset (ADR 0008)`;
    }
  }
  if (lower === ".env" || (lower.startsWith(".env.") && lower !== ".env.example")) {
    return "env file";
  }
  if (lower.endsWith(".parquet") && !lowerPath.startsWith("public/data/")) {
    return "parquet outside public/data/";
  }
  for (const prefix of DENIED_PREFIXES) {
    if (lowerPath.startsWith(prefix) || lowerPath.includes(`/${prefix}`)) {
      return `under ${prefix}`;
    }
  }
  if (lowerPath === ".claude/settings.local.json") return "local settings";
  if (lower.startsWith("the_next_klopp_master_prompt")) return "learner brief copy";
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
    id: "aws-secret-key",
    pattern: /\baws_secret_access_key["'`]?\s*[:=]\s*["'`]?[A-Za-z0-9/+=]{40}/gi,
  },
  {
    id: "stripe-key",
    pattern: /\b[sr]k_live_[A-Za-z0-9]{16,}/g,
  },
  {
    id: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}/g,
  },
  {
    id: "npm-token",
    pattern: /\bnpm_[A-Za-z0-9]{36}\b/g,
  },
  {
    id: "authorization-header",
    pattern: /\bauthorization["'`]?\s*[:=]\s*["'`]?(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]{16,}/gi,
  },
  {
    id: "generic-secret-assignment",
    pattern: /(?:api[-_]?key|secret|token|passw(?:or)?d)["'`]?\s*[:=]\s*["'`][^\s"'`]{16,}["'`]/gi,
    // Template placeholders such as ${VAR} or <your-value> are not literal secrets.
    ignore: (m) => /["'`](?:\$\{|<|\{\{)/.test(m),
  },
];

/**
 * Decodes file bytes for secret scanning. Files with a NUL in the first 8000 bytes used to be
 * skipped as "binary", which let a leading NUL or a UTF-16 file hide a secret. They are now
 * scanned as latin1 plus a NUL-stripped copy, so ASCII tokens inside UTF-16 text still match.
 */
export function decodeForScan(bytes: Uint8Array): string {
  if (!bytes.subarray(0, 8000).includes(0)) return new TextDecoder("utf-8").decode(bytes);
  const raw = new TextDecoder("latin1").decode(bytes.subarray(0, MAX_FILE_BYTES));
  return `${raw}\n${raw.replaceAll("\0", "")}`;
}

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
