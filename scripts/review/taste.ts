// Taste-skill runners for `npm run review:screens` (QA-02): the layout checker (check.mjs) and the
// copy linter (copy-lint.mjs) of the design-taste-frontend skill, plus the mapping from their
// findings to app-screen severities. The skill is git-denied, so it exists on the learner's machine
// only: nothing here touches it at import time, and `assertTasteSkill` is called when a review
// starts. The skill's files are only ever executed, never edited or copied.
// Every child process gets an argument array (the repo path has spaces). Erasable TypeScript only.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReviewUnavailableError, type TasteSkillBlock } from "./lib.ts";

export const SKILL_DIR = ".claude/skills/design-taste-frontend";
export const CHECK_MJS = `${SKILL_DIR}/assets/layout/check.mjs`;
export const COPY_LINT_MJS = `${SKILL_DIR}/scripts/copy-lint.mjs`;
export const TASTE_PROFILE_BASE = ".taste-skill/chrome-review";

/**
 * A profile folder of its own per run, under the project's git-ignored .taste-skill folder (the
 * skill requires that location). check.mjs can leave its Chrome running on Windows, and a second
 * Chrome on the same profile refuses to start, so a fixed folder would break the next review.
 */
export function tasteProfile(pid: number = process.pid, now: number = Date.now()): string {
  return `${TASTE_PROFILE_BASE}-${pid}-${now.toString(36)}`;
}
export const TASTE_SIZES = "375x812,768x1024,1440x900";
export const TASTE_IGNORE_REASON = "landing-page rule, not an app-screen rule";
const TIMEOUT_MS = 10 * 60 * 1000;

/** Landing-page layout ids that mean nothing for an app screen. Matched against the whole id. */
export const TASTE_IGNORED: readonly RegExp[] = [
  /^edge-left$/,
  /^container$/,
  /^hero-.+$/,
  /^screen-short$/,
  /^screen-height$/,
  /^section-height$/,
  /^one-section$/,
  /^neighbour.*$/,
  /^moment-none$/,
  /^hero-enter$/,
  /^photo-.+$/,
  /^fold-.+$/,
];

/** The only layout ids that are real defects on an app screen. */
const TASTE_FAIL_IDS: ReadonlySet<string> = new Set(["overflow-x", "spill"]);

export interface RawLayoutFinding {
  rule: string;
  where?: string;
  detail?: string;
}

export interface RawLayoutSize {
  size?: string;
  vw?: number;
  vh?: number;
  findings?: RawLayoutFinding[];
  overflowX?: boolean;
}

export interface LayoutFinding {
  rule: string;
  where: string;
  detail: string;
  size: string;
}

export interface MappedLayout {
  fails: LayoutFinding[];
  warns: LayoutFinding[];
  ignored: { id: string; reason: string }[];
}

export function isIgnoredLayoutId(id: string): boolean {
  return TASTE_IGNORED.some((re) => re.test(id));
}

/** FAIL for overflow-x and spill, ignore the landing-page ids with a reason, WARN for the rest. */
export function mapLayoutFindings(raw: readonly RawLayoutSize[]): MappedLayout {
  const out: MappedLayout = { fails: [], warns: [], ignored: [] };
  const ignored = new Set<string>();
  for (const entry of raw) {
    const size = entry.size ?? `${entry.vw ?? "?"}x${entry.vh ?? "?"}`;
    for (const f of entry.findings ?? []) {
      const finding: LayoutFinding = {
        rule: f.rule,
        where: f.where ?? "page",
        detail: f.detail ?? "",
        size,
      };
      if (TASTE_FAIL_IDS.has(f.rule)) out.fails.push(finding);
      else if (isIgnoredLayoutId(f.rule)) ignored.add(f.rule);
      else out.warns.push(finding);
    }
  }
  out.ignored = [...ignored].sort().map((id) => ({ id, reason: TASTE_IGNORE_REASON }));
  return out;
}

export interface RawCopyFinding {
  sev: "FAIL" | "WARN" | "INFO";
  id: string;
  count?: number;
  msg?: string;
}

export interface RawCopyResult {
  files?: { findings?: RawCopyFinding[] }[];
}

export interface CopyFinding {
  id: string;
  count: number;
  msg: string;
}

export interface MappedCopy {
  fails: CopyFinding[];
  warns: CopyFinding[];
}

/** FAIL ids fail, WARN ids warn, INFO is dropped. */
export function mapCopyFindings(raw: RawCopyResult): MappedCopy {
  const out: MappedCopy = { fails: [], warns: [] };
  for (const file of raw.files ?? []) {
    for (const f of file.findings ?? []) {
      const finding = { id: f.id, count: f.count ?? 1, msg: f.msg ?? "" };
      if (f.sev === "FAIL") out.fails.push(finding);
      else if (f.sev === "WARN") out.warns.push(finding);
    }
  }
  return out;
}

// ---------------------------------------------------------------- running the skill

/** Throws, naming the folder, when the skill is not on this machine. Call before any capture. */
export function assertTasteSkill(root: string): void {
  if (!existsSync(join(root, CHECK_MJS)) || !existsSync(join(root, COPY_LINT_MJS))) {
    throw new ReviewUnavailableError(
      `review:screens needs the taste skill at ${SKILL_DIR} (local only, git-denied); restore the project skills, then run again.`,
    );
  }
}

interface NodeRun {
  code: number;
  stdout: string;
  stderr: string;
}

function runNode(root: string, args: string[]): Promise<NodeRun> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    const timer = setTimeout(() => {
      child.kill();
      rejectRun(new ReviewUnavailableError(`taste skill timed out after ${TIMEOUT_MS / 1000} s.`));
    }, TIMEOUT_MS);
    child.on("error", (e) => {
      clearTimeout(timer);
      rejectRun(new ReviewUnavailableError(`taste skill could not start: ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveRun({ code: code ?? 2, stdout, stderr });
    });
  });
}

function parseJson<T>(text: string, what: string, run: NodeRun): T {
  const start = text.search(/[[{]/);
  try {
    return JSON.parse(start < 0 ? text : text.slice(start)) as T;
  } catch {
    throw new ReviewUnavailableError(
      `${what} printed no JSON (exit ${run.code}): ${(run.stderr || run.stdout).trim().slice(0, 300)}`,
    );
  }
}

/**
 * Asks the Chrome that check.mjs started on this run's profile to exit, through its own DevTools
 * port (Browser.close), then removes the profile folder. Touches nothing but that profile. Never throws.
 */
async function closeProfileBrowser(root: string, profile: string): Promise<void> {
  try {
    const [port, path] = readFileSync(join(root, profile, "DevToolsActivePort"), "utf8")
      .trim()
      .split(/\r?\n/);
    if (port && path) {
      await new Promise<void>((done) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
        const stop = setTimeout(() => done(), 5000);
        ws.addEventListener("open", () =>
          ws.send(JSON.stringify({ id: 1, method: "Browser.close" })),
        );
        ws.addEventListener("close", () => {
          clearTimeout(stop);
          done();
        });
        ws.addEventListener("error", () => {
          clearTimeout(stop);
          done();
        });
      });
    }
  } catch {
    // no DevToolsActivePort: Chrome never started or already exited
  }
  await new Promise((r) => setTimeout(r, 1000));
  rmSync(join(root, profile), { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
}

export interface LayoutRun {
  command: string;
  exitCode: number;
  mapped: MappedLayout;
}

/** `check.mjs` once, at the URL given (the caller merges the primary theme into it). */
export async function runLayoutCheck(
  root: string,
  url: string,
  sizes: string = TASTE_SIZES,
): Promise<LayoutRun> {
  const profile = tasteProfile();
  const args = [
    CHECK_MJS,
    "--url",
    url,
    "--sizes",
    sizes,
    "--json",
    "--no-stress",
    "--profile",
    profile,
  ];
  let run: NodeRun;
  try {
    run = await runNode(root, args);
  } finally {
    await closeProfileBrowser(root, profile);
  }
  // Exit 1 means findings (valid JSON); anything above is a failure to run.
  if (run.code > 1) {
    throw new ReviewUnavailableError(
      `check.mjs failed (exit ${run.code}): ${(run.stderr || run.stdout).trim().slice(0, 300)}`,
    );
  }
  const raw = parseJson<RawLayoutSize[]>(run.stdout, "check.mjs", run);
  return {
    command: `node ${args.join(" ")}`,
    exitCode: run.code,
    mapped: mapLayoutFindings(raw),
  };
}

export interface CopyRun {
  command: string;
  exitCode: number;
  mapped: MappedCopy;
}

/** `copy-lint.mjs` on the visible text, written to a temp file passed as one argv element. */
export async function runCopyLint(root: string, text: string): Promise<CopyRun> {
  const dir = mkdtempSync(join(tmpdir(), "tnk-copy-"));
  try {
    const file = join(dir, "visible.txt");
    writeFileSync(file, text);
    const args = [COPY_LINT_MJS, file, "--kind", "software", "--json"];
    const run = await runNode(root, args);
    if (run.code > 1) {
      throw new ReviewUnavailableError(
        `copy-lint.mjs failed (exit ${run.code}): ${(run.stderr || run.stdout).trim().slice(0, 300)}`,
      );
    }
    const raw = parseJson<RawCopyResult>(run.stdout, "copy-lint.mjs", run);
    return {
      command: `node ${COPY_LINT_MJS} <visible text file> --kind software --json`,
      exitCode: run.code,
      mapped: mapCopyFindings(raw),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function tasteBlock(layout: LayoutRun, copy: CopyRun): TasteSkillBlock {
  return {
    layout: {
      command: layout.command,
      exitCode: layout.exitCode,
      findings: [...layout.mapped.fails, ...layout.mapped.warns],
      ignored: layout.mapped.ignored,
    },
    copy: {
      command: copy.command,
      exitCode: copy.exitCode,
      fails: copy.mapped.fails,
      warns: copy.mapped.warns,
    },
  };
}
