# 0007. Protect main with GitHub branch protection

Date: 2026-11-27

## Status

Accepted

## Context

- The repo `ashayyan/the-next-klopp` is private. Making it public is out of the question (brief rule 3).
- GitHub documents protected branches and rulesets on private repos as a Pro, Team or Enterprise feature. The API reports this account's plan as `null` (`gh api user --jq .plan`), so the plan was unknown and a refusal was the expected outcome.
- The protection payload `.github/branch-protection.json` was sent with `gh api --include -X PUT repos/ashayyan/the-next-klopp/branches/main/protection`. GitHub answered `HTTP/2.0 200 OK`. It was not refused.
- The follow-up GET returned the six required checks `build,guards,lint,test,typecheck,windows-smoke`, `strict: true`, `enforce_admins: true`, zero required approvals with a PR required, force pushes off and deletions off.
- The ruleset payload `.github/ruleset-main.json` was also sent in the same run and answered `HTTP/2.0 201 Created`. It duplicated the classic rule, so it was deleted again (`HTTP/2.0 204 No Content`); `GET /rulesets` now returns an empty list. The file stays in the repo as the alternative.
- Secret scanning: `security_and_analysis` is `null` on this repo, so GitHub secret scanning is not reported as available. The controls are gitleaks over the full history in CI plus the local guard.
- Token scopes on the learner's `gh` login: `gist`, `read:org`, `repo`, `workflow`.

## Decision

- Platform protection on `main`: the six checks `lint`, `typecheck`, `test`, `build`, `guards` and `windows-smoke` are required, the branch must be up to date (`strict`), a pull request is required with zero approvals (a solo owner cannot approve their own PR), admins are enforced, force pushes and deletions are blocked.
- `main` changes only through a pull request from a `gsd/phase-*` branch, merged with `gh pr merge --merge` after all six checks are green.
- The `.husky/pre-push` main block stays as a local early warning. It is skippable with `--no-verify`, so it is advisory only. The CI `guards` job and GitHub protection are the non-bypassable controls.
- If protection is ever refused or removed (for example after a plan downgrade), the fallback is the CI workflow on every PR, the pre-push hook and the PR-only merge rule above.

Reversibility: costly - protection governs how every later phase merges; changing the model later means re-running the API call or changing the merge routine.

## Consequences

- Good: a red or missing check blocks the merge, even for the repo owner.
- Good: the payloads are committed, so the rule can be re-applied or audited with one command.
- Bad: the required check names are the `ci.yml` job keys. Renaming a job without updating the payload blocks every merge.
- Bad: `strict` means a PR must be rebased or merged up to date with `main` before merging, which costs one extra CI run when another PR lands first.
- Bad: the phase's final docs commits must land in the same PR, then wait for green again.
- Bad: GitHub secret scanning is not available on this repo, so gitleaks in CI is the only history scan.

## Alternatives

- Make the repo public to get protection for free: rejected, the repo must stay private.
- Rulesets instead of classic protection: tried and equivalent, same plan limits, and two overlapping rules would be confusing. The payload stays in `.github/ruleset-main.json`.
- Local hook only: rejected as the main control because `--no-verify` bypasses it. Kept as the fallback.
- Upgrade to GitHub Pro: not needed, since the API accepted the rule. Revisit if GitHub starts refusing it.

Sources: `01-CONTEXT.md` (GitHub repo, branches and CI), `01-RESEARCH.md` (Pitfall 2), GitHub REST docs for branch protection and rulesets.
