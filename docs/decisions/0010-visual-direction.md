# 0010. Visual direction: pick one of floodlit, programme and notebook

Date: 2026-11-28

## Status

Proposed

Gates recorded; the scores, totals and the pick follow after the independent review of the screenshots.

## Context

- DESIGN.md, the design tokens and every later lesson screen need one visual direction. Phase 4 built three on the same two sample screens (a tactics lesson at Lesson Loop step 3 "Touch it" and a data lesson at step 2 "See it"), in dark and light themes:
  - `floodlit`: a night match under floodlights. Dark navy ground, a mint accent, a geometric sans for headings, a mono face for numbers. Primary theme dark.
  - `programme`: a matchday programme. Condensed headlines, a scoreline as the data-lesson title, a yellow highlighter accent, heavy black rules and square corners. Primary theme light.
  - `notebook`: an analyst's notebook. A serif display face on one paper sheet, a hyperlegible sans for body text, a deep green accent, margin notes beside the pitch. Primary theme light.
- The rubric is 04-UI-SPEC "Selection rubric (ADR 0010)": three gates, then seven weighted criteria scored 1-4, weighted total = Σ (weight × score ÷ 4) out of 100, and a tie-break for totals within 3 points (higher pitch legibility, then higher ADHD calm).
- The design needs come from brief section 1 (a visual, hands-on learner with ADHD; the Premier League as the default reference) and section 8 (Lesson Loop, one idea per screen, at most 60 words per step, focus mode, reduced motion, colour-blind-safe palettes). This ADR paraphrases them and quotes no personal detail.
- The learner delegated this checkpoint for the autonomous run. The pick is made by a fresh reviewer that did not build the directions and did not read their plans, summaries or source code (04-RESEARCH pitfall "same-agent screenshot review rubber-stamps").
- Inputs, and nothing else: the 36 default screenshots (3 directions × 2 screens × 2 themes × 3 widths), the 24 deuteranopia and achromatopsia captures at 375 px, the state captures (`state=with`, `t=11.48`), the 6 `report.json` and `report.md` files, `npm run palette -- --json`, the rubric, brief sections 1 and 8, and the cliché calibration list in the `frontend-design` skill with section 5 of the `design-taste-frontend` skill.

## Decision

Route commit: `f6e513df6cbf0c72bfdef89d036bbf59a7b6cd9a` (branch `gsd/phase-04-design-direction-system`, committed 2026-11-28T10:40:32+03:00). The working tree had no tracked change when the evidence was generated. All six reports were generated after that commit time, between 07:42:56Z and 07:46:12Z, with `REVIEW_PORT=5184 node scripts/review-screens.ts /dev/directions/<id>/<screen>` (tactics with `--states state=with`, data with `--states t=11.48`).

### Gates

G1 is `npm run palette -- --json`, both themes (44 checks per theme). G2 is 0 FAIL in `review:screens` on both screens at 375, 768 and 1440 in the primary theme. G3 is both themes rendering both screens: no `token-colours` or `font-local` failure and no missing screenshot (8 per theme per screen).

| Direction | Primary theme | G1 | G2 | G3 |
| --- | --- | --- | --- | --- |
| `floodlit` | dark | pass | pass | pass |
| `programme` | light | pass | pass | pass |
| `notebook` | light | pass | pass | pass |

- G1 detail: 0 failed checks in all six direction-theme pairs. Worst colour-blind team delta E: floodlit 24.4 dark and 21.9 light, programme 21.9 light and 24.4 dark, notebook 22.2 light and 23.4 dark (threshold 8).
- G2 detail: every report has 234 pass, 0 fail and 1 warn. The warn is `taste-copy` in every report: `copy-contrast` (4 contrast frames, budget 2) on the tactics screens and `copy-stat-strip` on the data screens; the programme tactics screen also has one `copy-stat-strip`. `taste-layout` passes everywhere; `edge-left` is ignored as a landing-page rule on floodlit tactics, programme tactics and programme data.
- G3 detail: `token-colours` and `font-local` pass at every width in both themes; each report has 16 screenshots.

### Evidence

Default captures and colour-vision captures, with the SHA-256 from each `report.json` (each hash re-checked against the file on disk). The PNG files are git-ignored artefacts; regenerate them from the route commit (see Consequences).

**floodlit tactics** (/dev/directions/floodlit/tactics, report generated 2026-11-28T07:42:56.616Z, verdict pass, 234 pass, 0 fail, 1 warn):

- `test-results/review/dev-directions-floodlit-tactics/375-dark.png` sha256 `5f67f092b5ee69cdd5c5718457a749f6267200c89d03ca3134019d66bcbcfb57`
- `test-results/review/dev-directions-floodlit-tactics/375-dark-deuteranopia.png` sha256 `53aedaa773e15825cd7218de1db7b27a5b2e6587ac0e1367240e28264bdb3739`
- `test-results/review/dev-directions-floodlit-tactics/375-dark-achromatopsia.png` sha256 `d13e5085d488118367ef528a2eae3b9685526075228b53ecde89cf7cb9c44e1c`
- `test-results/review/dev-directions-floodlit-tactics/768-dark.png` sha256 `534ec0482ce943c7a0ec0fe22b0e3a27127703e6a7cd2de97fe0f793ba394912`
- `test-results/review/dev-directions-floodlit-tactics/1440-dark.png` sha256 `568002ab211f8041e77b229e9c23b0fdb38cf4585adddb8eea21c43005c5636b`
- `test-results/review/dev-directions-floodlit-tactics/375-light.png` sha256 `f6b3997c3c29142aca55db6dcc0dd24b08fef3b70cf1d5840a68835c1706f9a0`
- `test-results/review/dev-directions-floodlit-tactics/375-light-deuteranopia.png` sha256 `a766fcebda2ae094bbf2a6977d3975462609ddab12dcf12bc27495cf052fbdf3`
- `test-results/review/dev-directions-floodlit-tactics/375-light-achromatopsia.png` sha256 `1ecd45674da7ab47e23618728e3e4c8f9bf848ef04aaf2b75ba0c312c707ab32`
- `test-results/review/dev-directions-floodlit-tactics/768-light.png` sha256 `6240a2c04795a451515f067b82f326c214ca788a5181be1f649c16af0c961693`
- `test-results/review/dev-directions-floodlit-tactics/1440-light.png` sha256 `3e32f18c086b9f63a55dbd80e86163e279ce80cfda5480cf3cd07c61074086d8`

**floodlit data** (/dev/directions/floodlit/data, report generated 2026-11-28T07:43:37.550Z, verdict pass, 234 pass, 0 fail, 1 warn):

- `test-results/review/dev-directions-floodlit-data/375-dark.png` sha256 `8a1a39a6fc958e6b3ecbb6fa28d79cbdc83f6618793aa1b0ed3291679f7baf3c`
- `test-results/review/dev-directions-floodlit-data/375-dark-deuteranopia.png` sha256 `9fec4aa376e5b38d02742462d5d14083df50740a87c36754fe3d42b4874beec4`
- `test-results/review/dev-directions-floodlit-data/375-dark-achromatopsia.png` sha256 `0b7e7a2ab04b8338a4bee69c40e226725e802f2a0e1983e1f07b3ecd98bf651a`
- `test-results/review/dev-directions-floodlit-data/768-dark.png` sha256 `b37e4a5fe60f1c1290f48acea1de9717abd2f804c6873c03aa077e8a71ee4385`
- `test-results/review/dev-directions-floodlit-data/1440-dark.png` sha256 `0f52f6889831809665d36e441fedf59ef98829a3efb0e763f798077bfeaec77d`
- `test-results/review/dev-directions-floodlit-data/375-light.png` sha256 `d46267712e96529f6b43949d688eee9eb9dd2ab11125975f5062510892c53b5b`
- `test-results/review/dev-directions-floodlit-data/375-light-deuteranopia.png` sha256 `4df4865199b4fcb3b0ce8a526c62d5da2775f7ea83bc0134e1c523bb8909525c`
- `test-results/review/dev-directions-floodlit-data/375-light-achromatopsia.png` sha256 `d164053e44e402eba2f574723d2d7fb3166649a2a5fc0f72a332a948778b3017`
- `test-results/review/dev-directions-floodlit-data/768-light.png` sha256 `b96ddca1c8f9c7c18a667acf8a9b86ccf25a2d3fbc659b5df710ff23cf3c5c56`
- `test-results/review/dev-directions-floodlit-data/1440-light.png` sha256 `e704101754e82147e369337bf5d6a4b34d128274c9abdf707186a33be20b2602`

**programme tactics** (/dev/directions/programme/tactics, report generated 2026-11-28T07:44:14.014Z, verdict pass, 234 pass, 0 fail, 1 warn):

- `test-results/review/dev-directions-programme-tactics/375-dark.png` sha256 `44eb442ee0a2d558f43ade3808be556cb856c355a7fc723df422d24df4e109a8`
- `test-results/review/dev-directions-programme-tactics/375-dark-deuteranopia.png` sha256 `491ab8f43073c8ee68e9b6ebca83a52e3959a36e61837e8555897f3fa81ed16a`
- `test-results/review/dev-directions-programme-tactics/375-dark-achromatopsia.png` sha256 `54105ad784d6dfdfacdba04b0a59a51a902666ff7bf0105623e66cd78db11a06`
- `test-results/review/dev-directions-programme-tactics/768-dark.png` sha256 `b5bae1f416972ee07ba58ff38dfe646e83799d701c31d9be7e72a780f3b52bcd`
- `test-results/review/dev-directions-programme-tactics/1440-dark.png` sha256 `ddef6ef6dd641d7c811b4a520766423dcf7f5a51a3362faceec7b29f6300deba`
- `test-results/review/dev-directions-programme-tactics/375-light.png` sha256 `a3f0f732b46486b422b433a1cef4c87642d114a620c49b7ae30d4aa2cae72b81`
- `test-results/review/dev-directions-programme-tactics/375-light-deuteranopia.png` sha256 `8ada18a88641f58ae1169608ee3d73713611fceb41a9e76a90569e18e518a7ba`
- `test-results/review/dev-directions-programme-tactics/375-light-achromatopsia.png` sha256 `8368c20bf0f8d415420b55201c5c5b6e869ffb76716d6b0014f6c722abcf2bef`
- `test-results/review/dev-directions-programme-tactics/768-light.png` sha256 `b838801281c2ef5418cbd49fb6bd5682edd6a22bdf3a5d1e35558248d5fce764`
- `test-results/review/dev-directions-programme-tactics/1440-light.png` sha256 `f97c627bb883d5904fb6102e00a036940ca1a7ef85a1bf27ab22a618b84c5c6c`

**programme data** (/dev/directions/programme/data, report generated 2026-11-28T07:44:54.734Z, verdict pass, 234 pass, 0 fail, 1 warn):

- `test-results/review/dev-directions-programme-data/375-dark.png` sha256 `db722e0d2ef06efb0208ea97db4953824b999c58c7d5190cec3cb729ec8b0437`
- `test-results/review/dev-directions-programme-data/375-dark-deuteranopia.png` sha256 `48752a9fedfed1b3d14656fc13951be73113186b1f39e193f797eb6febec972a`
- `test-results/review/dev-directions-programme-data/375-dark-achromatopsia.png` sha256 `79e427c3277510f9adb3ac2019716ffa1a9a61b8bffc8dcf5cbef574a5458831`
- `test-results/review/dev-directions-programme-data/768-dark.png` sha256 `736d4d742b69aedf9e5db1cfeb2ab343dfab8733bca4342fa2096f561ca3da1a`
- `test-results/review/dev-directions-programme-data/1440-dark.png` sha256 `9dd03c009a0090c3d7999e4b27e1961dcf8b2140499241ed1ef82623e669330f`
- `test-results/review/dev-directions-programme-data/375-light.png` sha256 `61f701b786405c7b0e8eb795fa75c0d41e8271fbd110364af0e06801dc8fbe32`
- `test-results/review/dev-directions-programme-data/375-light-deuteranopia.png` sha256 `df9075e575f7dae9b2adde04d0df05b88a0cb4eb45b506ce5508939445041b26`
- `test-results/review/dev-directions-programme-data/375-light-achromatopsia.png` sha256 `71d7bd461cb4b4bb0b2266cf9d7e5e4c21b5cf89247a1efe751dd737d2357033`
- `test-results/review/dev-directions-programme-data/768-light.png` sha256 `955c31ffc216348960406979d91796c8bb74b5c81e9b0778419f794e1c83f4f4`
- `test-results/review/dev-directions-programme-data/1440-light.png` sha256 `14bdec11822c0cd928c2a6d421f21c4e56d2fd6c72d03a0611f2ef02fa6a1f37`

**notebook tactics** (/dev/directions/notebook/tactics, report generated 2026-11-28T07:45:31.178Z, verdict pass, 234 pass, 0 fail, 1 warn):

- `test-results/review/dev-directions-notebook-tactics/375-dark.png` sha256 `cb0219c28bcd835cdf3a629a4f6e731e4ec720b1049d6f9f2eb2eb89fb7f919e`
- `test-results/review/dev-directions-notebook-tactics/375-dark-deuteranopia.png` sha256 `6e6d893fbf1e33bf0b0149aa3d6f70f4991edeb8558aeab3fa53a139049bc9c7`
- `test-results/review/dev-directions-notebook-tactics/375-dark-achromatopsia.png` sha256 `43d995b7bd10da39fd492b075f8680d934a48424e2a101f83dfc005cb0d9a645`
- `test-results/review/dev-directions-notebook-tactics/768-dark.png` sha256 `5656e230ecc541621af1098b3bd7ff1d38455f4acb9efcd6217f4968559d335d`
- `test-results/review/dev-directions-notebook-tactics/1440-dark.png` sha256 `24c3425793411fa15a264f9fb0fc4be7d1ad13f950fb10da8807dd7c2efcff94`
- `test-results/review/dev-directions-notebook-tactics/375-light.png` sha256 `44bf5d579e45303d26ba318fc115b97f00ac07062653422944d524855d5cc34a`
- `test-results/review/dev-directions-notebook-tactics/375-light-deuteranopia.png` sha256 `383320316c1a8162c970049484a7afa5757aa0daabe1667d2992013c4a4f8d87`
- `test-results/review/dev-directions-notebook-tactics/375-light-achromatopsia.png` sha256 `577280f9e4ad9ca5a96c540a85c90dd2b62aacdd797efe31672e375d70c2c283`
- `test-results/review/dev-directions-notebook-tactics/768-light.png` sha256 `a5ea89e5e520c9fc991cea10177c0e8fca2adafd0044afdd7dbc9921e072011c`
- `test-results/review/dev-directions-notebook-tactics/1440-light.png` sha256 `7ec87f479cfd4dea8ddd375f670a859ac58d1a3c85d6829c4dd83a71aac1179d`

**notebook data** (/dev/directions/notebook/data, report generated 2026-11-28T07:46:12.828Z, verdict pass, 234 pass, 0 fail, 1 warn):

- `test-results/review/dev-directions-notebook-data/375-dark.png` sha256 `66349de8ed8ce9bd15ef230ae570afe079528c8c8e77abe2bc1925447e19aa5a`
- `test-results/review/dev-directions-notebook-data/375-dark-deuteranopia.png` sha256 `29dcf5c5590cbf4d47ba79a767893d9ca7ecd7c68465bb55cf7d57ceb5743262`
- `test-results/review/dev-directions-notebook-data/375-dark-achromatopsia.png` sha256 `71d074429cff549325b1f557ba55328025bcd5efa3010ce64575c84275ad152f`
- `test-results/review/dev-directions-notebook-data/768-dark.png` sha256 `633e68c31766678c1664197d57e03a2ef57bf22f3bf87291cf2c9fa0833de462`
- `test-results/review/dev-directions-notebook-data/1440-dark.png` sha256 `6ca3b886a44737b189706bffb4ba09108fedc51cdf4a887c45fc6ab68d556c01`
- `test-results/review/dev-directions-notebook-data/375-light.png` sha256 `755bff4867c20b36bed6e4646d9667b6318fb5fd03ad9e8dcae241aa537a125b`
- `test-results/review/dev-directions-notebook-data/375-light-deuteranopia.png` sha256 `93a2a7936188e39a3740eb67814e91fd14dbf6fb6572ea02f3f74f723fa797a0`
- `test-results/review/dev-directions-notebook-data/375-light-achromatopsia.png` sha256 `0454993e8d857e898f1796846be3c148646f72f795c9c421a28440f44536706d`
- `test-results/review/dev-directions-notebook-data/768-light.png` sha256 `da162fc90e68e98417e8cd0d7f6c837b44ee0403db6b593ec69a3f60f7f1ffff`
- `test-results/review/dev-directions-notebook-data/1440-light.png` sha256 `3ac554c530d04a90eb0b15c4fb2ac03c63f693d104af9ce5094506aba78e0542`

Reversibility: costly — DESIGN.md (04-11), the token set and every later screen follow the pick. An override before the Phase 5 lessons is cheap; after them it means restyling shipped lessons.

## Consequences

- To be completed with the pick.

## Alternatives

- To be completed with the pick.
