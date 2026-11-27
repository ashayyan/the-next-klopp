// verify-setup section: the installed husky hooks block bad input (SETUP-03, SETUP-04).
// Creates no commit. Everything it stages or writes is undone in `finally`.
// Dependency-free. Erasable TypeScript only. Git is spawned with argument arrays, never a shell.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface RunResult {
  status: number;
  output: string;
}

function childEnv(extra?: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  delete env.HUSKY; // HUSKY=0 would turn the hooks into no-ops and hide a broken install
  return env;
}

function toResult(r: ReturnType<typeof spawnSync>): RunResult {
  return { status: r.status ?? 1, output: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function git(args: string[], extra?: Record<string, string>): RunResult {
  return toResult(spawnSync("git", args, { encoding: "utf8", env: childEnv(extra) }));
}

/** `git hook run` exists from Git 2.36. */
function gitHasHookRun(): boolean {
  const m = /(\d+)\.(\d+)/.exec(git(["--version"]).output);
  if (m === null) return false;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return major > 2 || (major === 2 && minor >= 36);
}

const hasHookRun = gitHasHookRun();
if (!hasHookRun) {
  console.log("verify hook: Git older than 2.36, falling back to sh .husky/<hook>");
}

interface HookOptions {
  stdinFile?: string;
  args?: string[];
  env?: Record<string, string>;
}

function runHook(name: string, opts: HookOptions = {}): RunResult {
  const args = opts.args ?? [];
  if (hasHookRun) {
    const cmd = ["hook", "run"];
    if (opts.stdinFile !== undefined) cmd.push(`--to-stdin=${opts.stdinFile}`);
    cmd.push(name);
    if (args.length > 0) cmd.push("--", ...args);
    return git(cmd, opts.env);
  }
  return toResult(
    spawnSync("sh", [join(".husky", name), ...args], {
      encoding: "utf8",
      env: childEnv(opts.env),
      input: opts.stdinFile === undefined ? "" : readFileSync(opts.stdinFile, "utf8"),
    }),
  );
}

const failures: string[] = [];
function expectProbe(name: string, ok: boolean, detail: string): void {
  if (ok) {
    console.log(`  probe ok: ${name}`);
  } else {
    console.error(`  probe FAILED: ${name}\n${detail}`);
    failures.push(name);
  }
}

function probePreCommit(): void {
  try {
    mkdirSync("raw", { recursive: true });
    writeFileSync("raw/hook-probe.txt", "probe");
    git(["add", "-f", "raw/hook-probe.txt"]); // raw/ is git-ignored by design, so force it
    const r = runHook("pre-commit");
    expectProbe(
      "pre-commit rejects a staged raw/ file",
      r.status !== 0 && r.output.includes("denied-path"),
      `status=${r.status}\n${r.output}`,
    );
  } finally {
    git(["rm", "-q", "--cached", "-f", "raw/hook-probe.txt"]);
    rmSync("raw", { recursive: true, force: true });
  }
}

function probePrePush(dir: string): void {
  const sha = "0".repeat(40);
  const mainLine = join(dir, "push-main.txt");
  const phaseLine = join(dir, "push-phase.txt");
  writeFileSync(mainLine, `refs/heads/probe ${sha} refs/heads/main ${sha}\n`);
  writeFileSync(phaseLine, `refs/heads/probe ${sha} refs/heads/gsd/phase-probe ${sha}\n`);
  const args = ["origin", "probe-url"];

  const blocked = runHook("pre-push", { stdinFile: mainLine, args });
  expectProbe(
    "pre-push blocks a push to refs/heads/main",
    blocked.status !== 0 && blocked.output.includes("direct push to main is blocked"),
    `status=${blocked.status}\n${blocked.output}`,
  );
  const allowed = runHook("pre-push", { stdinFile: mainLine, args, env: { ALLOW_MAIN_PUSH: "1" } });
  expectProbe(
    "pre-push allows main with ALLOW_MAIN_PUSH=1",
    allowed.status === 0,
    `status=${allowed.status}\n${allowed.output}`,
  );
  const phase = runHook("pre-push", { stdinFile: phaseLine, args });
  expectProbe(
    "pre-push allows refs/heads/gsd/phase-probe",
    phase.status === 0,
    `status=${phase.status}\n${phase.output}`,
  );
}

function probeCommitMsg(dir: string): void {
  const bad = join(dir, "bad-msg.txt");
  const good = join(dir, "good-msg.txt");
  writeFileSync(bad, "added stuff\n");
  writeFileSync(good, "chore: probe\n");
  const badRun = runHook("commit-msg", { args: [bad] });
  expectProbe(
    "commit-msg rejects a free-text message",
    badRun.status !== 0,
    `status=${badRun.status}\n${badRun.output}`,
  );
  const goodRun = runHook("commit-msg", { args: [good] });
  expectProbe(
    "commit-msg accepts a conventional message",
    goodRun.status === 0,
    `status=${goodRun.status}\n${goodRun.output}`,
  );
}

function main(): number {
  const hooksPath = git(["config", "--get", "core.hooksPath"]).output.trim();
  if (hooksPath !== ".husky/_") {
    console.error(
      `verify hook: core.hooksPath is "${hooksPath}", expected ".husky/_". Run: npx husky`,
    );
    return 1;
  }
  if (git(["diff", "--cached", "--quiet"]).status !== 0) {
    console.error("verify hook: the index is not empty. Unstage first: git restore --staged .");
    return 1;
  }
  if (existsSync("raw")) {
    console.error(
      "verify hook: a raw/ folder already exists. Move it away; the probe needs that name.",
    );
    return 1;
  }

  const dir = mkdtempSync(join(tmpdir(), "klopp-hook-"));
  try {
    probePreCommit();
    probePrePush(dir);
    probeCommitMsg(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  if (git(["diff", "--cached", "--quiet"]).status !== 0) {
    console.error("verify hook: index not clean after probes");
    return 1;
  }
  if (failures.length > 0) {
    console.error(`verify hook: failing probes: ${failures.join("; ")}`);
    return 1;
  }
  console.log("verify hook: ok");
  return 0;
}

process.exit(main());
