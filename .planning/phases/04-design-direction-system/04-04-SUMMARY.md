---
phase: 04-design-direction-system
plan: "04"
subsystem: fonts-and-dependencies
tags: [fonts, fontsource, ofl, package-legitimacy, vite, self-hosting]
requires: ["04-01", "04-03"]
provides:
  - "exact pins for @base-ui/react 1.9.0, motion 14.14.0, @playwright/test 1.65.1 and seven @fontsource-variable/* 5.3.0 packages, each behind an automated identity gate"
  - "scripts/design/copy-fonts.ts: byte-for-byte font copy, licence record, 200 KB budget, --check and --prune"
  - "public/fonts/<family>/*.woff2 for seven families and public/fonts/LICENSES.md"
  - "npm run fonts; vite optimizeDeps.include for motion and base-ui entry points"
affects: [04-05, 04-06, 04-10, 04-11, 04-13]
actuals:
  tokens: 30000
  tasks: 2
  commits: 2
plan_head_before: 447a1a9f42d683da2e0bb120a8b0142aa2c9effa
plan_head_after: fb28906effd28bf5e8e9ccc295ba7a36b18268a4
tech-stack:
  added:
    - "@base-ui/react 1.9.0"
    - "motion 14.14.0"
    - "@playwright/test 1.65.1 (dev, no browser download)"
    - "@fontsource-variable/{mona-sans,geist-mono,archivo,martian-mono,newsreader,atkinson-hyperlegible-next,atkinson-hyperlegible-mono} 5.3.0 (dev, copy source only)"
  patterns:
    - "fonts are copied from the package into public/fonts and never imported at runtime, so no font request leaves localhost"
    - "the copy script is the only writer of public/fonts; --check is the drift gate"
key-files:
  created:
    - scripts/design/copy-fonts.ts
    - public/fonts/archivo/archivo-latin-wdth-normal.woff2
    - public/fonts/atkinson-hyperlegible-mono/atkinson-hyperlegible-mono-latin-wght-normal.woff2
    - public/fonts/atkinson-hyperlegible-next/atkinson-hyperlegible-next-latin-wght-normal.woff2
    - public/fonts/geist-mono/geist-mono-latin-wght-normal.woff2
    - public/fonts/martian-mono/martian-mono-latin-wght-normal.woff2
    - public/fonts/mona-sans/mona-sans-latin-wdth-normal.woff2
    - public/fonts/newsreader/newsreader-latin-opsz-normal.woff2
  modified:
    - package.json
    - package-lock.json
    - vite.config.ts
    - scripts/design/copy-fonts.test.ts
    - public/fonts/LICENSES.md
key-decisions:
  - "Install only after the identity gate passed for all 13 packages (repository URL, licence, no install scripts), then verify registry signatures"
  - "Playwright is installed as a package only; local runs use the system Chrome channel, so no browser download happens"
  - "Task 1 copies Mona Sans only (--family) so the tracer commit proves the byte copy and licence record before the other six families land"
requirements-completed: []
duration: 22min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 04: Fonts and phase packages Summary

**Thirteen packages were pinned exactly after an automated npm identity check, and seven Latin variable WOFF2 files are now self-hosted byte for byte under `public/fonts/` with a generated OFL-1.1 licence record, a 200 KB per-direction budget and a `--check` drift gate.**

## Performance
- **Duration:** 22 min
- **Tasks:** 2
- **Files modified:** 13 (8 created, 5 modified, plus the lockfile)

## Accomplishments
- Package legitimacy gate (automated, per the orchestrator's acceptance of the plan's slopsquatting checkpoint): `npm view <name>@<version>` for every package checked name, version, licence, repository URL and the absence of preinstall, install and postinstall scripts. Result: `identity gate: all 13 ok`. `npm audit signatures` then reported 68 packages with verified attestations.

  | Package | Version | Licence | Repository | Install scripts |
  |---------|---------|---------|------------|-----------------|
  | @base-ui/react | 1.9.0 | MIT | mui/base-ui | none |
  | motion | 14.14.0 | MIT | motiondivision/motion | none |
  | framer-motion (transitive of motion) | 14.14.0 | MIT | motiondivision/motion | none |
  | @playwright/test | 1.65.1 | Apache-2.0 | microsoft/playwright | none |
  | playwright (transitive) | 1.65.1 | Apache-2.0 | microsoft/playwright | none |
  | playwright-core (transitive) | 1.65.1 | Apache-2.0 | microsoft/playwright | none |
  | @fontsource-variable/mona-sans | 5.3.0 | OFL-1.1 | fontsource/font-files | none |
  | @fontsource-variable/geist-mono | 5.3.0 | OFL-1.1 | fontsource/font-files | none |
  | @fontsource-variable/archivo | 5.3.0 | OFL-1.1 | fontsource/font-files | none |
  | @fontsource-variable/martian-mono | 5.3.0 | OFL-1.1 | fontsource/font-files | none |
  | @fontsource-variable/newsreader | 5.3.0 | OFL-1.1 | fontsource/font-files | none |
  | @fontsource-variable/atkinson-hyperlegible-next | 5.3.0 | OFL-1.1 | fontsource/font-files | none |
  | @fontsource-variable/atkinson-hyperlegible-mono | 5.3.0 | OFL-1.1 | fontsource/font-files | none |

- `copy-fonts.ts` reads every `font.*.$extensions.tnk.files` entry from the token sets, copies the matching Fontsource file unmodified (Mona Sans carries the Reserved Font Name "Mona"), and writes `public/fonts/LICENSES.md` with package, version, licence, copyright line, source and full licence text for each of the seven families.
- Direction font totals: floodlit 121,252 bytes (Mona Sans + Geist Mono), programme 113,660 bytes (Archivo + Martian Mono), notebook 183,748 bytes (Newsreader + Atkinson Hyperlegible Next + Mono). All under the 200 KB (204,800 byte) budget.
- `--check` exits 1 for a missing file, a one-byte change, an unreferenced font or a stale `LICENSES.md`; `--prune` removes unreferenced family folders; `--family` is refused together with either flag.
- `vite.config.ts` pre-bundles `motion/react` and the base-ui entry points the phase uses, so the dev server does not re-optimise mid-review.
- Verification: `npx vitest run scripts/design` 79 tests pass; `node scripts/design/copy-fonts.ts --check` prints `fonts ok`; `tsc --noEmit` and `biome ci .` clean; `npm run build`, `npm run guard:bundle` (16 files) and `npm run guard` (434 tracked files) pass.

## Task Commits
1. **Task 1: pin packages after the identity gate, copy-fonts with Mona Sans (tracer)** - `38ed8a3`
2. **Task 2: copy all seven fonts, fonts script, prebundle UI dependencies** - `fb28906`

## Files Created/Modified
- `package.json`, `package-lock.json` - exact pins and the `fonts` script
- `scripts/design/copy-fonts.ts`, `copy-fonts.test.ts` - copy CLI and tests (byte identity, budget, licences, check, prune)
- `public/fonts/**` - seven WOFF2 files and `LICENSES.md`
- `vite.config.ts` - `optimizeDeps.include`

## Decisions & Deviations

### Auto-fixed Issues

None - plan executed as written. The tracer test file briefly carried an unused `writeFileSync` import (a Biome warning) between the two task commits; Task 2 restored the full test file that uses it.

The plan's package-legitimacy checkpoint was handled by the orchestrator-approved automated gate rather than a human pause. It halts on any identity, licence or signature mismatch; none occurred.

**Total deviations:** 0. **Impact:** none.

## Known Stubs
None.

## Threat Flags
None. T-04-05 (supply chain) is mitigated by the identity gate, exact pins and signature audit; fonts are copied files, not runtime imports, so no third-party request is made. No Playwright browser was downloaded.

## Next Phase Readiness
04-05 (review CLI) can import `@playwright/test` and `motion`; 04-10 and later direction work can rely on `/fonts/<family>/<file>.woff2` URLs referenced by the token sets.

## Self-Check: PASSED
