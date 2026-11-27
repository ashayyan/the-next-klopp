# Formations: findings

## Key concepts

- A formation number counts outfield players per line, read from the back line forward, so the goalkeeper is never in the string. [src-frontiers-formation-id-survey][src-fourfourtwo-formations-in-football]
- Extra digits split the midfield: 4-2-3-1 is four defenders, two holding midfielders, three attacking midfielders and one striker. [src-coachesvoice-formations-explained][src-fourfourtwo-formations-in-football]
- The label abstracts a team's average spatial shape, so it leaves out rotations and individual movement. [src-frontiers-formation-id-survey][src-theanalyst-shape-analysis]
- One team uses different shapes in phases: in possession, out of possession and transition. Analysts therefore segment a match by phase before naming a shape. [src-frontiers-formation-id-survey][src-theanalyst-shape-analysis]
- Formation is the base label (often the starting or defensive shape). Structure is what the team actually looks like in a phase. [src-planetfootball-formations-whiteboard][src-skysports-arteta-tactics-2023]

## Must teach

### Notation and the common shapes

- 4-4-2 gives two flat lines of four. Its two forwards occupy both centre-backs and it stays compact, but one pass can bypass a whole line and a midfield three can outnumber the central pair. [src-pl-442-explained][src-coachesvoice-formations-explained]
- 4-3-3 adds a third central midfielder for build-up superiority and wingers who pin full-backs. The lone centre-forward can be isolated and space opens behind advancing full-backs. [src-coachesvoice-formations-explained]
- 4-2-3-1 gives a double pivot for security and a number 10 who can drop to create overloads. It can be thin in the centre and exposed wide after quick switches. [src-coachesvoice-formations-explained][src-fourfourtwo-formations-in-football]
- 4-1-4-1 (also written 4-5-1) uses one screening midfielder and a flat midfield four. It is compact and flexible but can strand the lone striker. [src-fourfourtwo-formations-in-football][src-pl-451-explained]
- 3-5-2 gives a back three that creates a build-up overload, with wing-backs as the width. Wing-backs need huge range and wide midfield space opens once the line becomes a five. [src-coachesvoice-formations-explained][src-pl-352-explained]
- 3-4-3 can push wide forwards into midfield for central overloads. It has the same wing-back demands as 3-5-2 and concedes wide midfield spaces. [src-coachesvoice-formations-explained]
- 5-3-2 is the deeper cousin of 3-5-2: a stable low block and counter-attack threat, with space on the flanks and only two forwards to support. Pushing the wing-backs up turns it into 3-5-2. [src-jobsinfootball-532]
- A box midfield is four central players: two pivots and two number 10s. It is strong centrally but narrow and easy to block. [src-pl-box-midfield-explained]

### Formation versus structure (Premier League examples)

- Arsenal 2022/23: Sky described a 2-3-5 with the full-backs stepping inside, and a block of central players once possession was lost. [src-skysports-arteta-tactics-2023]
- Manchester City 2022/23: John Stones stepped into midfield to make a 3-2-4-1 with the ball, then dropped back so City defended as a 4-4-2. [src-theanalyst-stones-hybrid-role]
- Chelsea 2016/17: Conte's back three and wing-backs dropped into a back five without the ball, and Tottenham beat it by matching the shape and pressing. [src-skysports-conte-343-2017]
- Liverpool 2024/25: Slot moved Klopp's 4-3-3 to a 4-2-3-1 and a mid-block with more patient build-up. [src-pl-slot-liverpool-shape-2024]
- Chelsea under Tuchel used a 3-4-3 with a box midfield, while Klopp moved a right-back into midfield. [src-pl-box-midfield-explained]
- Chelsea v Wolves (Tuchel's first match): averaged positions made Wolves' three forwards look static, but shape analysis showed them rotating. [src-theanalyst-shape-analysis]
- Premier League 2024/25: 4-2-3-1 was the most used formation, 3-4-2-1 was the biggest climber and 4-3-3 declined. The article does not say how a match is assigned a formation. [src-pl-formation-trends-2024-25]

### How open data encodes formations

- StatsBomb Starting XI and Tactical Shift events carry a tactics object holding a formation string, such as 343, and a lineup list. [src-statsbomb-events-spec-v4#tactics-formation-field]
- Each team gets a tactics and lineup record at the start of the match, so the opening shape is always available. [src-statsbomb-events-spec-v4#lineups-at-kickoff]
- A Tactical Shift event records an in-match change with its new formation and positions, so a formation can change within a match. [src-statsbomb-events-spec-v4]
- Each lineup entry holds a shirt number, a player and a numbered position from the StatsBomb tactical positions guide. [src-statsbomb-events-spec-v4]
- The mplsoccer gallery draws a starting XI from the formation string and position ids. It warns that this is the starting setup, since two players had swapped places early in the example match. [src-mplsoccer-plot-formations]
- The public Wyscout data stores lineup, bench and substitutions per team and a flag for whether they exist, not a ready-made shape string. [src-nature-wyscout-soccer-logs-paper]
- kloppy models a formation-change event with a formation type and optional player positions. [src-kloppy-docs]
- Average position is the simplest data-derived shape but averaging makes teams look more compact than they are, for example a winger who swaps flanks shows up centrally. [src-frontiers-formation-id-survey]
- Opta's shape analysis splits a match into possession intervals, clusters shapes (17 in possession, 13 out of possession) and matches each interval to a template. [src-theanalyst-shape-analysis]
- Tracking research can learn a formation template and align players to roles frame by frame. [src-ieee-bialkowski-team-structures]

## Misconceptions

- "A formation is fixed for the whole match." Teams change shape by phase, and substitutions and score also change it. [src-frontiers-formation-id-survey][src-theanalyst-stones-hybrid-role]
- "More defenders means more defensive." A back three can be the platform for attack, and Arsenal's back two sat under five attackers. [src-pl-352-explained][src-skysports-arteta-tactics-2023]
- "A back three defends with three." Wing-backs or midfielders drop to form a line of five out of possession. [src-pl-352-explained][src-skysports-conte-343-2017]
- "The published line-up graphic is official." Teams do not announce formations, so published starting formations are an analyst's reading. [src-frontiers-formation-id-survey]
- "There is one correct label for a shape." Two industry providers agreed on starting formations for a recent World Cup only about 65% of the time. [src-frontiers-formation-id-survey#provider-agreement-65]
- "4-4-2 means two flat banks all match." A mid-block 4-4-2 is a defensive shape, and the same team can attack in another structure. [src-pl-442-explained][src-theanalyst-stones-hybrid-role]

## Contested points

Contested: whether formations are meaningful or just "telephone numbers". Guardiola calls the grid nothing more than phone numbers because his players move so much. [src-coachesvoice-formations-explained][src-yahoo-keble-formations-2016] Klopp says in possession a formation can be almost meaningless because almost anyone could fill the positions, while Cox says defensive structure is still clear (a back three differs from a back four) and Hunter says Guardiola's Barcelona had a visible shape that changed in build-up. [src-planetfootball-formations-whiteboard]

Contested: whether neighbouring labels differ in practice. Cox suggests 4-2-3-1 is partly a label that lets a forward accept a wide role and often looks like a 4-4-1-1 or 4-2-4, and Keble calls the 4-2-3-1 versus 4-3-3 debate outdated because top teams blend both. [src-planetfootball-formations-whiteboard][src-yahoo-keble-formations-2016] Other guides give each label distinct strengths and weak spots, such as the 4-2-3-1 double pivot versus the 4-3-3 third midfielder. [src-coachesvoice-formations-explained][src-fourfourtwo-formations-in-football]

Contested: who owns the label. Provider formation labels come from a subjective, manual process and the survey says there is no ground truth. [src-frontiers-formation-id-survey#provider-agreement-65] Opta's data-first approach produces clusters not tied to traditional labels, and position identifiers also differ between providers. [src-theanalyst-shape-analysis][src-mplsoccer-plot-formations]

## Open questions

- Does kloppy's StatsBomb loader fill formation and player position fields for Tactical Shift events? The docs table was ambiguous.
- Which open dataset gives a full Premier League season of Starting XI formations to show real shapes? The seed registry lists 2015/16 StatsBomb events.
- Is 3-2-5 or 2-3-5 the better teaching label for Arsenal's build-up? Writers differ and a lesson should show both.
- How should the app define a phase (in possession, out of possession) in event data without tracking? Segment rules are subjective.
- Which Premier League shape claims need a second source before they ship in a lesson? Several rely on a single analysis.
