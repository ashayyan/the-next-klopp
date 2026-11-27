# 0006. Keep the project at a path with spaces (D10)

Date: 2026-11-27

## Status

Accepted

The learner delegated this decision for the autonomous Phase 1 run. The project stays at `E:\To become new klop`.

## Context

- The project folder contains spaces, which breaks naive shell scripts, unquoted paths and string-built commands.
- This machine runs Windows with `core.autocrlf=true`, which causes CRLF churn and snapshot differences.
- Windows is the learner's only platform, so the spaced path is the real environment, not an edge case.
- Moving the project later is a folder move plus a re-clone.

## Decision

- Stay at `E:\To become new klop`; do not move it.
- Quote every path. Write file operations in Node scripts, not shell. No `make`. No bash-only chains in `package.json`; the single `&&` in `study` works under both cmd.exe and sh.
- Spawn child processes with argument arrays, never with a string passed to a shell.
- `.gitattributes` carries `* text=auto eol=lf`, and `core.longpaths` is set to `true`.
- CI includes a `windows-smoke` job that checks out into a folder with a space (`klopp checkout`), then runs `npm ci`, builds, and runs the smoke script against the preview server.

Reversibility: reversible - a later move is cheap, but the choice shapes every script written meanwhile.

## Consequences

- Good: bugs from spaced paths surface in the first week, on the real platform, and in CI.
- Good: scripts stay portable between cmd.exe, PowerShell and Git Bash.
- Bad: every new script and agent command needs quoting discipline; a missed quote fails only on this machine.
- Bad: some third-party tools mishandle spaces; each one found needs a note or a workaround.

## Alternatives

- Move to a path without spaces: deferred to the learner. It needs a folder move and a re-clone.
- WSL: rejected. It adds setup work for the learner and the target platform is native Windows.

Sources: `.claude/CLAUDE.md` Technology Stack (decision 12), `01-CONTEXT.md`, `01-RESEARCH.md`.
