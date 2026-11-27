# Pitch geometry: findings

Edition shown everywhere: IFAB Laws of the Game 2026/27, effective 1 July 2026 [src-ifab-laws-2026-27#effective-date]. Premier League figures are from the 2026/27 Handbook unless stated. As-of date 2026-11-27.

## Key concepts

- Law 1 describes a rectangular field whose touchlines are longer than its goal lines. [src-ifab-laws-2026-27#law1-touchline-longer]
- The Law gives ranges, and each competition picks the exact length and width inside them. [src-ifab-laws-2026-27#law1-competitions-choose]
- The 105 x 68 m pitch is a competition rule and a design convention, not a Law value. [src-pl-handbook-2026-27#rule-k17-pitch-size][src-ifab-laws-2026-27#law1-competitions-choose]
- A line belongs to the area it bounds, so a ball on the line is inside the area. [src-ifab-laws-2026-27#law1-lines-belong]
- Open-data providers store locations as coordinates in a provider frame, and those frames differ in origin, axis direction and scale. [src-kloppy-coordinates-docs#kloppy-default-pitch]
- Event-data frames fix the penalty area at set coordinates, so the same coordinate can sit on different real distances from one stadium to the next. [src-mplsoccer-standardize-docs#fixed-penalty-area]

## Must teach

### Law 1 dimensions

- Touchline length may be 90 m to 120 m. [src-ifab-laws-2026-27#law1-touchline-length]
- Goal line length may be 45 m to 90 m. [src-ifab-laws-2026-27#law1-goal-line-length]
- For international matches the touchline is 100 m to 110 m. [src-ifab-laws-2026-27#law1-intl-touchline]
- For international matches the goal line is 64 m to 75 m. [src-ifab-laws-2026-27#law1-intl-goal-line]
- Every line has the same width, at most 12 cm. [src-ifab-laws-2026-27#law1-line-width]
- Measurements run from the outside edge of each line. [src-ifab-laws-2026-27#law1-measure-outside]

### Markings

- The halfway line joins the midpoints of the touchlines. [src-ifab-laws-2026-27#law1-halfway-line]
- The centre circle has a radius of 9.15 m. [src-ifab-laws-2026-27#law1-centre-circle]
- The goal area reaches 5.5 m from the inside of each goalpost and 5.5 m into the field. [src-ifab-laws-2026-27#law1-goal-area]
- The penalty area reaches 16.5 m from the inside of each goalpost and 16.5 m into the field. [src-ifab-laws-2026-27#law1-penalty-area]
- The penalty mark is 11 m from the midpoint between the goalposts. [src-ifab-laws-2026-27#law1-penalty-mark]
- The 11 m is measured from the centre of the mark to the back edge of the goal line. [src-ifab-laws-2026-27#law1-penalty-mark-measure]
- The penalty arc has a 9.15 m radius from the penalty mark and is drawn outside the penalty area. [src-ifab-laws-2026-27#law1-penalty-arc]
- The corner area is a quarter circle of radius 1 m at each corner flagpost. [src-ifab-laws-2026-27#law1-corner-area]
- Corner flagposts are at least 1.5 m high with a non-pointed top. [src-ifab-laws-2026-27#law1-flagposts]
- The goal is 7.32 m wide inside the posts and 2.44 m high. [src-ifab-laws-2026-27#law1-goal-size]
- Where a seated area exists, the technical area extends 1 m either side of it and up to 1 m from the touchline. [src-ifab-laws-2026-27#law1-technical-area]
- Derived, not a Law line: areas are measured from the inside of the posts, so the penalty area is 40.32 m wide (7.32 m plus two 16.5 m), the figure kloppy's pitch table also lists. [src-ifab-laws-2026-27#law1-penalty-area][src-ifab-laws-2026-27#law1-goal-size][src-kloppy-coordinates-docs#markings-table-penalty-area]

### The 105 x 68 m convention and who sets it

- Premier League Rule K.17 says league matches use a pitch 105 m long and 68 m wide unless the Board permits otherwise. [src-pl-handbook-2026-27#rule-k17-pitch-size]
- The Board permits another size only when the stadium's construction makes 105 x 68 m impossible. [src-pl-handbook-2026-27#rule-k18-exception]
- Clubs register their pitch size before every season. [src-pl-handbook-2026-27#rule-k19-register]
- A club may not alter its pitch size mid-season without the Board's written consent. [src-pl-handbook-2026-27#rule-k21-no-alter]
- The same rule was K.18 in the 2025/26 Handbook, so cite rule numbers with the edition. [src-pl-handbook-2025-26#rule-k18-pitch-size][src-pl-pitch-standards-framework-2025#rule-numbers-change]
- FIFA recommends 105 x 68 m for stadium design. [src-fifa-stadium-guidelines-pitch#recommended-size]
- UEFA allows 100 m to 105 m by 64 m to 68 m in stadium categories 1 and 2. [src-uefa-stadium-infrastructure-2025#cat-1-2-field]
- UEFA requires exactly 105 m by 68 m in categories 3 and 4, in force since 1 June 2025. [src-uefa-stadium-infrastructure-2025#cat-3-4-field][src-uefa-stadium-infrastructure-2025#in-force-date]
- kloppy assumes 105 x 68 m when no pitch size is given. [src-kloppy-coordinate-systems-source#kloppy-default-system]
- Premier League grass stripes run straight and parallel across the width, perpendicular to the touchlines, with no circular or diagonal patterns. [src-pl-handbook-2026-27#rule-k22-mowing]

### Premier League pitch sizes, 2026/27 registered figures

- Fourteen of the twenty clubs register exactly 105 x 68 m. [src-pl-handbook-2026-27#clubs-standard-105x68]
- Chelsea register 103 x 67.5 m, and the 2025/26 Handbook showed the same. [src-pl-handbook-2026-27#club-chelsea-pitch][src-pl-handbook-2025-26#club-chelsea-pitch]
- Crystal Palace register 101.5 x 68 m, and the 2025/26 Handbook showed the same. [src-pl-handbook-2026-27#club-crystal-palace-pitch][src-pl-handbook-2025-26#club-crystal-palace-pitch]
- Fulham register 100 x 65 m, the smallest of the six on both sides. [src-pl-handbook-2026-27#club-fulham-pitch]
- Hull City register 104.8 x 67.2 m. [src-pl-handbook-2026-27#club-hull-pitch]
- Ipswich Town register 105 x 66 m. [src-pl-handbook-2026-27#club-ipswich-pitch]
- Liverpool register 101 x 68 m. [src-pl-handbook-2026-27#club-liverpool-pitch]
- These are registered figures from the Premier League's own club entries, not surveyed measurements. [src-pl-handbook-2026-27#rule-k19-register]

### Provider coordinate frames (encode from the specs, then test)

- StatsBomb: origin top left, y downward, x from 0 to 120 and y from 0 to 80. [src-kloppy-coordinate-systems-source#statsbomb-system]
- StatsBomb's own spec gives the field centre as (60, 40). [src-statsbomb-open-data-spec#location-centre]
- StatsBomb's Appendix 2 figure labels the penalty and goal-area corners in the same 120 by 80 grid. [src-statsbomb-open-data-spec#appendix-2-pitch-figure]
- StatsBomb 360 frames follow the linked event, with the acting team attacking from 0 to 120. [src-statsbomb-open-data-360-frames#attacking-direction]
- Opta: origin bottom left, y upward, both axes 0 to 100. [src-kloppy-coordinate-systems-source#opta-system]
- Wyscout in kloppy: origin top left, y downward, both axes 0 to 100. [src-kloppy-coordinate-systems-source#wyscout-system]
- Public Wyscout events are percentages from the attacking team's perspective. [src-nature-pappalardo-wyscout-events#coords-range]
- In the public set, x measures nearness to the opponent's goal and y nearness to the right side. [src-nature-pappalardo-wyscout-events#coords-axes]
- Wyscout's glossary puts the acting side's own goal at x = 0 percent and the attacking goal at x = 100 percent. [src-wyscout-data-glossary-pitch-coordinates#x-attack-100]
- Tracab tracking: origin at the centre, y upward, in centimetres. [src-kloppy-coordinate-systems-source#tracab-system]
- Sportec tracking: origin at the centre, y upward, in metres. [src-kloppy-coordinate-systems-source#sportec-tracking-system]
- kloppy's default frame is a 0 to 1 unit square. [src-kloppy-coordinates-docs#kloppy-default-pitch]
- On Opta's 100-unit pitch the penalty area is 57.8 units wide, but on Wyscout's it is 62.0 units. [src-kloppy-coordinates-docs#opta-wyscout-penalty-width]
- Standardised frames distort metric information, so distance work must map back to real pitch size. [src-kloppy-coordinates-docs#standardised-distorts-distance]
- mplsoccer's worked example uses Anfield, 68 m wide, against Craven Cottage, 65 m wide. [src-mplsoccer-standardize-docs#anfield-width][src-mplsoccer-standardize-docs#craven-cottage-width]

## Misconceptions

- "All pitches are the same size." Even inside the Premier League, six of twenty clubs register something other than 105 x 68 m. [src-pl-handbook-2026-27#clubs-standard-105x68][src-pl-handbook-2026-27#club-fulham-pitch]
- "105 x 68 m is a Law of the Game." Law 1 gives ranges, not one size. [src-ifab-laws-2026-27#law1-touchline-length][src-ifab-laws-2026-27#law1-goal-line-length]
- "The D is part of the penalty area." The arc is drawn outside the penalty area, and the Law calls it the penalty arc. [src-ifab-laws-2026-27#law1-penalty-arc]
- "Lines sit outside the area they enclose." Lines belong to the area, and measurements run to the outside edge. [src-ifab-laws-2026-27#law1-lines-belong][src-ifab-laws-2026-27#law1-measure-outside]
- "Opta, Wyscout and kloppy coordinates are metres." They are 0 to 100 or 0 to 1 scales. [src-kloppy-coordinate-systems-source#opta-system][src-kloppy-coordinate-systems-source#kloppy-default-system]
- "StatsBomb's 120 by 80 is the real pitch size." It is a fixed grid, and a 105 x 68 m pitch needs a different scale on each axis. [src-kloppy-coordinate-systems-source#statsbomb-system][src-kloppy-coordinate-systems-source#kloppy-default-system]
- "The Premier League rule number is stable." It moved from K.18 to K.17 between editions. [src-pl-handbook-2025-26#rule-k18-pitch-size][src-pl-handbook-2026-27#rule-k17-pitch-size]

## Contested points

Contested: Chelsea's pitch is 103 x 67.5 m in the 2026/27 Premier League Handbook but 103.3 x 67.7 m in FourFourTwo, which names no source for its figures, so teach the Handbook figure and flag the article. [src-pl-handbook-2026-27#club-chelsea-pitch][src-fourfourtwo-pl-pitch-sizes#chelsea-size]

Contested: Crystal Palace's pitch is 101.5 x 68 m in both recent Handbooks but 101 x 68 m in FourFourTwo, and no survey was found to settle the half metre. [src-pl-handbook-2026-27#club-crystal-palace-pitch][src-fourfourtwo-pl-pitch-sizes#palace-size]

Contested: Nottingham Forest's pitch is 105 x 68 m in the Handbook but 105 x 71 m in FourFourTwo, and the width stays unresolved because the Handbook gives only a registered figure. [src-pl-handbook-2026-27#club-nottingham-forest-pitch][src-fourfourtwo-pl-pitch-sizes#forest-size]

Contested: whether the canonical pitch should stay 105 x 68 m when Fulham register 100 x 65 m and kloppy warns that standardised pitches distort distances, a design call for Phase 3 with the trade-off shown to the learner. [src-pl-handbook-2026-27#club-fulham-pitch][src-kloppy-coordinates-docs#standardised-distorts-distance]

## Open questions

- No source found for surveyed stadium dimensions, only Handbook registered figures and a secondary article, so per-stadium numbers stay labelled registered. [src-pl-handbook-2026-27#rule-k19-register]
- Opta's own definitions page refused access (HTTP 403), so the Opta frame rests on kloppy's description alone. [src-kloppy-coordinate-systems-source#opta-system]
- Wyscout's glossary does not state the origin or the y direction. The kloppy description (top left, y downward) and the dataset paper (y toward the attacker's right) agree only when attack runs left to right, which is an inference to verify. [src-wyscout-data-glossary-pitch-coordinates#x-attack-100][src-kloppy-coordinate-systems-source#wyscout-system]
- kloppy docstrings were read from the master branch; recheck them against the pinned 3.19.1 tag before freezing the Pitch Standard. [src-kloppy-coordinate-systems-source#statsbomb-system]
- The UEFA stadium category of each Premier League ground was not researched. [src-uefa-stadium-infrastructure-2025#cat-1-2-field]
- The next IFAB edition (expected early 2027, assumed) could change Law 1, so recheck before Track 1 ships. [src-ifab-laws-2026-27#effective-date]
