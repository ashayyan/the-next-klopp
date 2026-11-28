# 0011. Lessons as data: MDX plus a frozen JSON spec, chosen at build time

Date: 2026-11-28

## Status

Accepted

Decided in Phase 5 (plans 05-01 and 05-02) under the learner's delegation of every grey area in 05-CONTEXT.

## Context

- The app ships chapter by chapter while the learner studies. Every later gate (content validator, walker, verification record, frozen ids, role report, shell navigation) needs one stable description of a lesson.
- CLAUDE.md forbids content-layer frameworks (Velite, Content Collections, fumadocs-mdx, Contentlayer) and `gray-matter`, and asks for an own validator.
- Drafts and test fixtures must never reach the study build or Vercel, not even as unused chunks: a chunk in `dist/` is a published file.
- The repo is public, so lesson text and metadata are reviewed as code and must be machine-checkable.

## Decision

1. **One folder per lesson.** `content/tracks/<track-id>/<chapter-id>/<lesson-id>/` holds `lesson.mdx` (the screens) and `lesson.json` (the spec), plus `verification.json` once a verifier has checked it. Chapter ids are `part-a` to `part-g`, from the concept-map `part` field.
2. **Spec v1 is frozen.** `schemas/lesson.schema.json` (JSON Schema 2020-12) is the source of truth, mirrored by `lessonSchema` in `src/schemas/lesson.ts`; `schemas/schemas.test.ts` proves ajv and Zod agree on every fixture. After Phase 5 only additive changes are allowed (CONT-06). The same rule covers `schemas/verification.schema.json` and `schemas/whats-new.schema.json`.
3. **No frontmatter.** `lesson.json` is the only metadata. The MDX frontmatter export plugin (`remark-mdx-frontmatter`) is not installed, and the content validator fails a lesson whose MDX starts with a frontmatter block.
4. **No code in lesson MDX.** A lesson may hold no `import`, no `export` and no `{expression}` block. The only exception is the static `sides` attribute on `<Contested>`. Components come through `MDXProvider`.
5. **Steps match by id.** Each `<Step id>` in the MDX matches a `steps[].id` in order. `steps[].screen` names the MDX anchor and defaults to `id` when absent, so most lessons omit it.
6. **Selection at build time.** The Vite plugin behind `virtual:tnk-lessons` reads every `lesson.json`, rejects one that breaks spec v1 (the build stops with the file path and the first issue), and emits only the lessons this build includes, with one lazy MDX loader each. The study and Vercel builds include `shipped` lessons only; an excluded lesson has no dynamic import and therefore no chunk. The same module carries the curriculum, the cited slice of the source registry, concept summaries, study order and What's new, so the app never bundles the full registry or concept map.
7. **Fixtures stay out of study.** Fixture lessons live under `content/_fixtures/` and are built only by `npm run build:fixtures` into `dist-walker/` (`VITE_INCLUDE_FIXTURES=1`), which the repo guard denies. The generic walker runs against that build inside the required `build` CI job.
8. **Friendly limits live in the validator.** The schema keeps hard bounds (`durationMin` 1 to 60, title at most 40 characters); authoring rules such as the 5 to 12 minute duration, 60 words a screen and the 25-word excerpt give plain-English messages from the validator.

Reversibility: costly. Every lesson file conforms to spec v1; changing a field means migrating every lesson and its frozen ids.

## Consequences

- One schema drives the validator, the walker manifest, the shell and the verification gate; a malformed lesson cannot build.
- Lesson authors write two files per lesson. The validator checks that they agree (step parity, stage order, citations).
- Adding a field later is cheap (additive, optional); renaming or removing one is not.
- Dev and test builds show drafts and fixtures; the study build never does, which `scripts/content/selection.test.ts` proves.

## Alternatives

- **Velite or Content Collections.** Rejected: CLAUDE.md rules out content-layer frameworks; the value here is the cross-reference checks, which we write anyway.
- **A runtime status filter.** Rejected: drafts would still be bundled as chunks and published in `dist/`.
- **Frontmatter metadata in the MDX.** Rejected: two sources of truth for the same lesson, and frontmatter needs `remark-mdx-frontmatter` plus a typing shim.
- **Zod as the only schema.** Rejected: the Python pipeline and external tools read JSON Schema; the Phase 3 Scene contract set the dual-validator pattern.
