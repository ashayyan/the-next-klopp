# Feature Research

**Domain:** Single-learner, visual-first, interactive football (soccer) learning web app. The learner has ADHD, learns by seeing and touching, has variable energy, can no longer sit through matches, and must learn to write and speak analysis. Scope: Milestone 0 + 1.
**Researched:** 2026-11-27
**Confidence:** MEDIUM overall. Learning-science claims rest on well-established findings (Dunlosky 2013, Mayer, pretesting effect), but the ADHD-specific evidence is thin and mostly small studies or practitioner sources. Competitor feature lists come from marketing pages, vendor blogs and general knowledge, not hands-on use. Per the confidence seam, plain web search returns LOW, so each claim below carries its own tag.

**Evidence tags used below:** [E-HIGH] established, replicated finding. [E-MED] credible but small, secondary-sourced or domain-transferred. [E-LOW] practitioner/vendor claim or inference. Anything marked "design inference" is my reasoning, not a cited finding.

## What the research says (read this first)

1. **Practice testing and distributed practice are the two highest-utility learning techniques** in Dunlosky et al.'s 2013 review (rereading and highlighting rated low). The Lesson Loop's "Lock it in" step and the review queue are the evidence-backed core. [E-HIGH]
2. **Retrieval practice works for students with ADHD** in the small studies found (2023 unmedicated-college-student study; Stern and Halamish 2023 whole-text recall), though ADHD learners may need strategy support to match peers. **No ADHD-specific spaced-repetition trial was found.** The spacing benefit is assumed to transfer. [E-MED for retrieval, E-LOW for spacing in ADHD]
3. **Predict-before-reveal is backed by the pretesting effect** (Kornell et al. 2009; Richland et al. 2009): guessing before instruction improves later memory even when guesses are wrong. Caveat from the reviews: the benefit is mostly for the directly pretested information. So the prediction must target the concept you want remembered, not a side detail. [E-HIGH for effect, E-MED for the caveat]
4. **Multimedia design rules have solid effect sizes:** coherence (cut extraneous material, d about 0.86), signaling (d about 0.70), segmenting (user-paced chunks, d about 0.77), pretraining of key terms (d about 0.75, weakest support, 13 of 15 tests). These justify the 60-word screen cap, one idea per screen, glossary pretraining and visual signaling. Figures come from secondary summaries of Mayer's reviews. [E-MED]
5. **Video-based anticipation and decision training works for footballers** (systematic review of 10 studies, 8 showed pre-post gains, mainly response accuracy). Reviewers flagged that broadcast footage is low-fidelity and that retention/transfer tests are lacking. This supports Watch Gym as a training method, not just a content format. It also says tactical-view or reconstructed stimuli are acceptable and arguably better. [E-MED, small evidence base]
6. **For ADHD, working-memory load is the practical design constraint.** Chunking, single-step instructions, immediate specific feedback, visual reminders of steps, and imposed pauses in video all help low-working-memory learners. Most sources are teacher/practitioner pages. The best-grounded item is the pause-in-video finding (Pinelli and Cojean, cited in a 2026 arXiv preprint, not peer reviewed). [E-LOW to E-MED]
7. **Streaks are an engagement tool built on loss aversion.** Duolingo itself says overly strict streaks backfire and can make learners avoid challenges to dodge disappointment. Its own fixes were freezes (two freezes: +0.38% DAU, company-reported) and a lower bar. There is no peer-reviewed measurement of streak anxiety. For this learner, the ADHD plus "guilt after gaps" profile in the brief is reason enough to drop streaks entirely. This is a product decision, not a measured result. [E-LOW, vendor-reported]
8. **Gamification effects are small and conditional** (2023 meta-analysis of 35 interventions, about 2,500 students: g = 0.257). Leaderboards that stress constant peer comparison can hurt self-efficacy of lower-ranked students unless framed around personal progress. Whether badges crowd out intrinsic motivation long-term is unresolved. Take: personal-progress feedback only, no social comparison (there is no other user anyway). [E-MED]
9. **Fading scaffolds beats permanent scaffolds** (expertise reversal effect; Nückles et al. journal-writing study: permanent prompts gave worse end-of-term outcomes than faded prompts). This is the evidence behind the brief's Report Writer "fill-in-the-blanks to blank page" idea. Writing-specific evidence comes from one research group. [E-MED]
10. **Anki-style backlogs are the dominant churn cause in SRS products.** Community advice is to cut new cards and/or cap daily reviews (one guide argues for caps of 10-20, others 100-200 depending on load). No source recommends abandoning a deck; an ADHD-focused guide names a large overdue queue as a barrier. This directly supports "cap what is shown, quietly reschedule the rest". [E-LOW to E-MED, forum/blog sources]
11. **Brilliant's pattern** is problem before procedure, guided (not unguided) discovery, short lessons, instant feedback and retrieval-based adaptive practice. This is Brilliant's own description with no independent evaluation. The "6x more effective" marketing claim is unsourced and should be ignored. Explorable-explanation critics add a real warning: widgets that dump the learner in a sandbox with no guidance are not explanations. [E-LOW, self-described]

## Feature Landscape

### Table Stakes (Learner leaves, or stops trusting the product, if missing)

Scope tags: **M0** = app shell/platform work, **M1** = Track 0/1/Watch Gym content and components.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Lesson Loop engine** (Hook, See, Touch, Predict-reveal, Do, Lock-in, Connect) | The core promise in PROJECT.md. Without a real engine, every lesson becomes bespoke code. | HIGH | Content-as-data (MDX + JSON spec) rendered as a stepper. Validator must enforce 60 words max per screen, one idea per screen, required stages, source IDs, prerequisites. Resumable checkpoints and a visible time estimate are part of the engine, not extras. |
| **One-idea-per-screen stepper with progressive disclosure** | Mayer segmenting/coherence; ADHD working-memory load. | MEDIUM | Back/forward, keyboard nav, user-paced (never auto-advance). Progress shown as "step 3 of 7", not as a scroll length. |
| **Resumable checkpoints** | ADHD sessions get interrupted constantly. Losing place is a leave-the-app event. | MEDIUM | Persist step position and in-progress interactions (for example the formation the learner built) locally on every step. |
| **Tappable glossary cards (visual)** | Brief: never assume vocabulary; learner "sometimes doesn't understand football". Also pretraining (Mayer). | MEDIUM | Every defined term tappable, card = mini pitch diagram + one-line definition + "see it in action". Terms defined visually on first use. Data-driven (glossary JSON), not hand-linked. Haiku-tier authoring. |
| **Tap-on-pitch / arrange-the-shape question types** | The brief insists on visual answers, not only MCQ. One primitive serves placement, Lock-in and Watch Gym. | MEDIUM | Build once on the Pitch Standard. Must have a keyboard and non-pointer fallback (accessibility). Highest-reuse component in M1. |
| **Canonical pitch renderer + notation legend** | Every visual depends on it; legend "appears everywhere" per brief. | MEDIUM | SVG first. Coordinate converters can be stubbed in M1 (only needed once real data arrives), but the pitch API must be data-ready. |
| **Local persistence + JSON export/import** | The learner owns their data; localhost-first; progress must survive browser clears. | MEDIUM | IndexedDB or SQLite-WASM. Export/import is cheap insurance and is a PROJECT.md requirement. |
| **Progress system: mastery rings, track badges, "eye improving" history, "days learned this month"** | Learners need to see they are getting somewhere. PROJECT.md requires honest gamification. | MEDIUM | Rings per concept/track. "Eye improving" is a Watch Gym chart (see Differentiators). Never display zeros as failure (see Pitfalls). |
| **Spaced-repetition queue with a hard cap** | Practice testing and spacing are the highest-utility techniques [E-HIGH]. Lock-in questions need somewhere to go. | MEDIUM | Use a proven scheduler rather than inventing one (FSRS, open-source, is the modern default; verify the library in STACK.md). Cap items shown per session (suggest 5 in low-energy, about 10-15 normal; tune with the learner). Quiet reschedule of everything else. No "due" counter shown. |
| **Focus mode** | Brief requirement; reduces distraction for ADHD. | LOW | Hides nav, glossary chrome, progress furniture. Only current step plus a minimal exit. Implemented as a layout state, not a separate page set. |
| **Low-energy mode (one tap, 3-5 min, counts as a full day)** | Brief requirement and the learner's stated need. | MEDIUM | Needs a "small win" selector: one Watch Gym clip, one question, or up to 5 review cards. Needs content tagged with duration and effort. Must be reachable from the first screen. |
| **Welcome-back flow** | Brief requirement. Returning after a gap is the highest-risk moment for abandonment. | MEDIUM | Warm recap of where they were + exactly one easy next step. Never mentions missed days. Quietly caps reviews. Depends on persistence and the review queue. |
| **"I'm confused here" button on every screen** | Brief requirement; it is the feedback loop for the build agents. | LOW-MEDIUM | Captures route, lesson ID, step ID and an optional note (voice or text is a nice-to-have). Writes to a local `/feedback` file the agents read. Must be one tap, no modal essay. The file-writing path from a browser to disk needs a design decision (dev server endpoint vs export). |
| **Home screen with one obvious next action** | ADHD: decision paralysis. Duolingo, Brilliant and Khan all lead with one "continue" action. | LOW | "Continue" (resume), "Low-energy mode", and "Pick something" as the only three primary choices. |
| **Keyboard nav, reduced-motion mode, colour-blind-safe palette, captions** | Brief accessibility requirement; also the quality bar. | MEDIUM | Reduced motion must still convey meaning (state changes, not animation, carry information). Captions apply once Watch Gym clips with audio exist. |
| **Placement diagnostic (basics, not skip-ahead)** | Brief Track 0; PFSA baseline is "Intro + Level 1, rusty". | MEDIUM-HIGH | See "Placement diagnostic design" below. Maps answers to concept-map nodes. Output is a *provisional* map ("probably known", "shaky", "new") that review cards later confirm. |
| **Role Map (overview level)** | Brief calls it a core feature and Track 0 deliverable. | MEDIUM | M1 scope: role cards (purpose, responsibilities, reporting lines, KPIs), the learner picks interest weights. Path highlighting over the concept map can come later. Readiness meter, role exam and portfolio are later milestones (they need competencies mapped to lessons). |
| **Personal goals page** | Brief Track 0 deliverable. | LOW | Few fields: target role(s), weekly-feel (not "streak goal"), available minutes. Used to tune suggestions, never to scold. |
| **App tour and learning-loop explainer (Track 0)** | Brief Track 0. | LOW-MEDIUM | Should itself be a Lesson Loop lesson (eat your own cooking). |
| **Track 1 content: laws, pitch geometry, positions/numbering, formations, history-of-tactics timeline** | Brief Track 1 and the learner starts here. | MEDIUM per chapter (HIGH for the first, because it forces every component) | Needs these components: Pitch, interactive laws demos (offside is the canonical one), Tactics Board (drag + formation morph), Timeline scrubber for the tactics history. |
| **Watch Gym Level 1** (10-30 s clip, one question, answered on a pitch) | Brief Milestone 1 deliverable. The learner's biggest problem, and the reason they study at all. | HIGH | See "Watch Gym Level 1 design notes" below. Footage legality is the main risk. |
| **Source traceability visible in the lesson** | Brief rule: every claim traceable; contested topics labelled. | MEDIUM | A small per-screen "sources" drawer fed by source IDs in the lesson spec. Also needed so the verifier agent has something to check. |
| **Honest, immediate feedback on answers** | Immediate, specific feedback is the most-cited ADHD-friendly practice [E-LOW to E-MED]. | LOW-MEDIUM | Show why, on the pitch, in under about 30 words. Wrong answers show the correct picture, not a red X and score. |
| **Golden lesson** | Brief quality bar. | HIGH | One fully polished lesson that exercises the whole engine. Should be the Track 1 formations lesson or an offside lesson, so it pays for itself. |
| **"What's new" changelog page** | Brief rolling-release requirement. | LOW | Static page from release notes. |

### Differentiators (Where this product beats Brilliant, Duolingo, Anki, tactics boards and video tools)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Predict-then-reveal on a pitch as the default interaction** | Combines the pretesting effect [E-HIGH] with football anticipation training [E-MED]. Nothing in the football-explainer space does this as a structured loop. | MEDIUM | The prediction must target the taught concept (pretesting benefit is mostly for directly tested info). Record every prediction: it is the raw data for "eye improving". |
| **"My eye is improving" difficulty-adjusted history** | Gives the learner honest proof they are getting better at *seeing*, which is the exact thing they feel they lost. Compares old and new answers to the same kind of clip. | MEDIUM | Needs per-skill tagging of clips and a difficulty rating, otherwise harder clips make the curve dip and demoralise. Show per-skill trends; never a single global score. |
| **Watch Gym as a graded ladder (clip, sequence, block, half, match)** | Rebuilds attention in steps the learner chooses to lengthen. No other product treats "learning to watch" as the product. | HIGH overall (L1 is MEDIUM-HIGH) | M1 only ships L1, but the data model (mission card, answer type, skill tag) must anticipate L2-L5. |
| **Closed-loop confusion feedback to the build agents** | The product improves from the learner's own confusion. The learner is also the only user, so it is high-signal. | LOW-MEDIUM | Differentiating because it feeds the roadmap (read `/feedback` before planning each phase). Needs an agent-readable format (JSON lines with route, step ID, timestamp, note). |
| **3-5 minute "full day" that counts honestly** | Directly addresses low-energy days without gamifying them. Brilliant and Duolingo have short sessions but still push streak pressure. | LOW (once low-energy mode exists) | The "count" is days learned this month. Do not add a "you did the minimum" label. |
| **Capped, quietly rescheduled review after any gap** | Eliminates the Anki failure mode that ends most SRS use. | MEDIUM | Scheduler must support "defer without penalty" and still show an accurate mastery state. Trade-off: the schedule is no longer optimal for retention, which is acceptable for sustainability. |
| **Role-linked everything** (every lesson tagged to the roles that need it) | Connects football basics to the learner's career goal; no football learning app does this. | MEDIUM | M1 can ship the tags and the Role Map view without readiness scoring. Tags are cheap now and expensive to retrofit. Coverage-rule check (lesson + practice + assessment per competency) is a later audit. |
| **Concept map with "Connect it" links** | Shows why a lesson matters and what it unlocks; supports non-linear study (the brief says order follows the concept map, not track numbers). | MEDIUM | M1 can ship a minimal graph (Track 0-1 nodes, prerequisites, mastery state) and expand. Depends on lesson spec `prerequisites`. |
| **"Explain it back" mastery checks by drawing or arranging** | Stronger than MCQ; produces a visible artifact; reduces recognition-only learning. | MEDIUM-HIGH | Needs rubric-free self-check in M1 (compare with a model answer). Automatic grading is out of scope. |
| **Tactics Board with formation morphing** (Track 1) | Matches what TacticalPad/Tactics Manager do for coaches, but wired to the lesson loop with guided tasks and checks. | MEDIUM-HIGH | Reuse everywhere later (Track 2, 5, 6). Save/load scenes in M1 is good scope control (local only). |
| **Offside/laws demos as manipulable diagrams** | The laws are the standard place a casual fan is unsure. "Drag the attacker, see the line move" beats text. | MEDIUM | Offside line is also a standard tool in Metrica Play, so the visual language is established. Use current IFAB wording, date-stamped. |
| **Interactive history-of-tactics timeline** | Gives the learner a mental scaffold that later tactical tracks hang on. Tifo-style animated explainers exist but are passive. | MEDIUM | Scrubbable timeline with formation morphs per era. Facts must be sourced; many tactical-history claims are contested and should be labelled. |
| **Source and contested-claim labelling in the UI** | Rare in learning apps. Builds trust and fits a senior-role career (analysts get challenged). | LOW-MEDIUM | Depends on source registry. A "contested" chip with a two-sided popover. |
| **Faded scaffolding for Write and Speak** (later, but design the lesson spec for it now) | Evidence-backed [E-MED]; turns "I can't write analysis" into a ladder. | HIGH (later) | Out of M0/M1 build scope, but Track 1 lessons can include a first tiny "write one sentence" task to seed the thread. |

### Anti-Features (Deliberately do NOT build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Losable streaks** (including freezes, repair, "streak society") | Proven engagement driver; Duolingo does it. | Built on loss aversion; Duolingo's own writing says too-strict streaks cause avoidance and disappointment. A freeze economy still keeps the streak object alive. The brief explicitly bans losable streaks. | "Days learned this month" count plus all-time total; nothing can be lost. |
| **A monthly counter that resets to zero and looks like failure** | Natural way to "count days learned this month". | Design inference: a 1st-of-the-month "0" recreates the lost-streak feeling. | Show monthly count beside a persistent all-time count and a calendar of dots that only ever add. A new month starts a fresh page, not a zero. |
| **Hearts/lives, energy meters, "out of hearts" blockers** | Limits spamming; monetisation hook. | Blocks learning when the learner finally has energy; punishes errors, which are the learning event. | Unlimited attempts; wrong answers are teaching moments. |
| **Red overdue counters, "N cards due", review backlog numbers** | Standard SRS UI. | Backlog numbers are the leading cause of SRS abandonment [E-LOW to E-MED] and are a guilt mechanic. | Cap and hide the true size; show only "today's 5". |
| **"You missed X days" or any gap messaging** | Reminder emails and apps do it. | Brief forbids it; guilt on return is the abandonment moment. | Welcome-back flow with one easy step. |
| **Push or email nudges with guilt tone ("Duo is sad")** | Re-engagement. | Guilt mechanic. Also not needed for a single motivated learner. | No notifications in M0/M1. Optional, learner-set reminder later with neutral tone. |
| **Leaderboards, social comparison, public profiles** | Common gamification pillar. | Single learner; peer comparison can hurt self-efficacy for lower-ranked users [E-MED]. | Compare the learner only to their past self ("eye improving"). |
| **XP, gems, coins, shops, loot** | Rewards loop. | Extrinsic overreliance risk [E-MED]; irrelevant to the Core Value. | Mastery rings and track badges tied to real competence. |
| **Timed quizzes and countdown pressure on answers** | Feels game-like. | Time pressure adds working-memory and anxiety load for ADHD (design inference). | Untimed answers. A timer is only an optional opt-in for later Watch Gym "block timers", never on correctness. |
| **Hard locks / forced linear unlocking** | Keeps the learner on path; common in courses. | The learner needs non-linear access (brief: order follows the concept map). Locks create friction on a day the learner wants a specific topic. | Soft recommendations: "Suggested next" and "You may want X first", never a gate. |
| **Placement test that gates content or ends in a score** | Convenient routing. | PFSA baseline is rusty; a score shames; a test that skips content risks gaps. | Provisional map, short and resumable, with "not sure yet" as a first-class answer (see below). |
| **Long reading, walls of text, video-only lessons** | Easy content production. | Brief and Mayer coherence/segmenting. | 60-word screens, visuals carry the content. |
| **Autoplay video or auto-advance** | Passive consumption feels smooth. | Removes learner pacing; breaks segmenting (user-paced) benefit. | Explicit tap to play and to continue. |
| **Infinite feed / "next video" recommendations** | Retention hack. | The learner cannot watch long; short clips must end before attention drops. | Fixed-size sessions that end cleanly with a "done" state. |
| **Unguided sandbox widgets** ("play with it, figure it out") | Impressive demos, cheap to ship. | Explorable-explanation critics: this is not an explanation. | Guided Touch step with a stated goal, constraint and feedback. |
| **AI chat tutor in M0/M1** | Fashionable. | Hallucination risk against the traceability rule; large scope; not needed to validate the Lesson Loop. | Defer. The AI Scout Assistant Lab and any tutor come after the source registry exists. |
| **Accounts, auth, cloud sync, multi-user** | Standard SaaS. | One learner, localhost-first, Vercel protected. Adds security surface for no value. | Local storage + JSON export/import. |
| **Full-match watching in Level 1** | The learner's ultimate goal. | The learner cannot sit through matches; starting there repeats the failure. | Watch Gym ladder; lengthen only when the learner chooses. |
| **Embedded copyrighted video files or downloaded broadcast clips in the repo** | Easiest Watch Gym content. | Brief and licensing rule. | YouTube embeds with start/end times, learner's local files, official highlights, or reconstructions from open event/tracking data. |
| **Mental-health or therapy content, "mindfulness" breaks** | Adjacent to ADHD design. | Out of scope per PROJECT.md. | Keep energy-aware design only. |
| **Confetti, hype copy, "You're crushing it!"** | Reward feel. | Brief: celebrate small progress honestly, without hype. | Quiet factual confirmation ("You spotted the trigger. Here is why it counts."). |
| **Fake or inflated progress bars** | Encouragement. | Erodes trust. | Mastery only moves on retrieval success over time. |

## Specific Design Notes for the Hard Features

### Placement diagnostic design
- Runs in 3-4 short, resumable chunks (design inference: roughly 8-10 questions per chunk, all tap-on-pitch or arrange-the-shape). Can be paused and left at any time.
- "Not sure yet" is a first-class answer and is not scored as wrong. The learner's own confidence rating is recorded alongside correctness. Confidence plus correctness sorts known/shaky/new better than correctness alone.
- Output is provisional: "probably known" nodes are not skipped, they are *deprioritised* and retested through the review queue. This respects the brief ("test basics, do not skip them").
- Asks once whether any specialist PFSA course was started (brief section 16). Never loops on it.
- Content comes from Track 0/1 concept nodes only in M1. Later tracks add their own diagnostics when they ship.

### Watch Gym Level 1 design notes
- **Answer on a schematic pitch panel next to the video, not over the video pixels.** Overlaying a tap layer on broadcast footage needs camera homography, which is a research problem (the Computer Vision Demo is a later milestone). A side-by-side clip and top-down pitch is feasible now. (Design inference; verify when specifying the component.)
- **Clip source priority:** (1) animated reconstructions from open event data, which are fully legal, deterministic, controllable and tactical-camera-style; (2) legal YouTube embeds with start/end timestamps; (3) learner's local files. A video-based training review found broadcast stimuli low-fidelity and suggested more realistic presentation, so reconstructions are not a compromise [E-MED].
- **Open-data caveat for Premier League default:** free event data with PL coverage is limited and tracking data is mostly non-PL or anonymised (to be verified in STACK/source registry before locking Level 1 content). If PL reconstructions are not available, label the clip's league honestly and keep the PL default for text examples.
- **Mission card:** one question, one pitch answer, one feedback screen that shows the correct moment on the pitch with a "where to look" toggle. No score, no timer.
- **Pause-and-predict** is the core of L1. Video pause is also independently supported as beneficial for low-working-memory learners [E-LOW to E-MED].
- **Data model for later levels:** clip or sequence ID, skill tag, difficulty, mission type, expected answer shape, so L2-L5 and "eye improving" do not force a rewrite.

### Review queue behaviour (capped and quiet)
- Default session limit: 5 items in low-energy, about 10-15 otherwise (to tune). Everything else is rescheduled silently on session end.
- No count of how many are overdue is ever shown.
- New cards enter only through completed lessons, 2-4 per lesson (matches "Lock it in"). This limits new-card growth, which is the most commonly recommended Anki fix.
- A "weekly review from weak spots" is generated, not a debt tracker.

### Welcome-back flow
- Shows: last lesson thumbnail, one sentence of recap, one easy next step (usually a single Watch Gym clip or three review cards), and the low-energy button. Never shows days missed.
- Adjusts the review cap down for the first session back.

### Progress presentation guardrails
- Mastery rings only fill from retrieval success, never from time spent or page views.
- "Eye improving" shows per-skill trend lines with difficulty adjustment, minimum-sample threshold before drawing a line, and a "not enough clips yet" state instead of a flat line.
- No daily goal, no "daily progress" bar, no countdown to a lost state.

## Feature Dependencies

```
Pitch Standard (renderer + legend)
    +--required by--> Tap-on-pitch / arrange-the-shape question primitive
    |                       +--required by--> Placement diagnostic
    |                       +--required by--> "Lock it in" retrieval questions
    |                       +--required by--> Watch Gym L1 mission answers
    +--required by--> Tactics Board (drag, morph, save scene)
    |                       +--required by--> Track 1 formations / positions lessons
    +--required by--> Offside / laws interactive demos
    +--required by--> Tactics timeline (formation morphs per era)

Lesson spec schema + validator (content-as-data)
    +--required by--> Lesson Loop engine (stepper, checkpoints, time estimate)
    |                       +--required by--> Golden lesson
    |                       +--required by--> Every Track 0 / Track 1 lesson
    +--required by--> Glossary cards (term IDs in spec)
    +--required by--> Source traceability drawer (source IDs in spec)
    +--required by--> Concept map (prerequisites in spec)
    +--required by--> Role tagging (role tags in spec)

Local persistence layer
    +--required by--> Resumable checkpoints
    +--required by--> Progress system (rings, days learned, history)
    +--required by--> Spaced-repetition queue
    |                       +--required by--> Welcome-back flow (reads queue to cap reviews)
    |                       +--required by--> Low-energy mode (review-cards option)
    +--required by--> Confusion button -> /feedback file path
    +--required by--> Export/import

Predict-reveal interaction (records predictions)
    +--required by--> "Eye improving" history
    +--enhances--> Watch Gym L1

Placement diagnostic
    +--requires--> Concept map nodes (to map answers onto)
    +--requires--> Tap-on-pitch primitive
    +--feeds--> Review queue (provisional "probably known" items)
    +--feeds--> Role Map suggestions

Role Map (overview) ---enhances---> Goals page, Concept map highlighting
Role tags on lessons ---required by---> Role readiness meter (later milestone)

Watch Gym L1 content
    +--requires--> Clip source decision (reconstruction vs embed vs local)
    +--requires--> Pitch answer panel + mission card component
    +--requires--> Progress system (to store attempts)

Low-energy mode ---requires---> content tagged with duration/effort (clips, questions, cards)
Focus mode ---independent--- (layout state; pairs with the stepper)

Anti-feature conflicts:
Losable streaks --conflicts--> Welcome-back flow / low-energy "counts as a full day"
Hard locks --conflicts--> Non-linear concept-map study and placement (provisional) output
Visible overdue counts --conflicts--> Capped, quiet review queue
```

### Dependency Notes

- **The Pitch Standard comes first.** Almost every M1 visual and question type rests on it. Build the tap-on-pitch primitive before placement or Watch Gym.
- **The lesson spec schema is the contract.** Glossary, sources, role tags, prerequisites, time estimates and low-energy tags all live in it. Getting it wrong costs a content migration later; adding tags now is cheap.
- **Watch Gym L1 content sourcing is the main external dependency.** It is not purely an engineering task: someone has to decide which clips (or reconstructions) are legal and available. Raise this at the Phase 0 research checkpoint, not at build time.
- **Placement depends on concept map nodes**, so the concept map (minimal) must exist before the diagnostic can be wired. Order: schema, concept map nodes, primitives, diagnostic.
- **Low-energy mode and welcome-back both depend on the review queue and content tagging.** Do not build them before the queue exists, or they will be rebuilt.
- **"Eye improving" depends on logging predictions from day one** of Watch Gym L1. Even if the chart ships later, record data now.

## MVP Definition

### Launch With (Milestone 0 + 1, the learner can start studying)

- [ ] Lesson spec schema + validator (60-word cap, required stages, source IDs, prerequisites, role tags, duration tags)
- [ ] Lesson Loop engine with stepper, checkpoints, time estimates, focus mode
- [ ] Pitch Standard renderer + notation legend + tap-on-pitch / arrange-the-shape primitives
- [ ] Local persistence + export/import
- [ ] Progress system: mastery rings, track badges, days-learned (non-resetting presentation), initial "eye improving" data capture
- [ ] Spaced-repetition queue with cap, quiet reschedule
- [ ] Glossary cards (visual, tappable)
- [ ] Low-energy mode and welcome-back flow
- [ ] "I'm confused here" button writing to the feedback path
- [ ] Home screen with one obvious next action
- [ ] Minimal concept map + "Connect it" links
- [ ] Placement diagnostic (provisional output, "not sure yet" answers)
- [ ] Role Map (overview level) + goals page + app tour
- [ ] Golden lesson (also a Track 1 lesson)
- [ ] Track 1 content: laws, pitch geometry, positions/numbering, formations, tactics timeline
- [ ] Watch Gym L1: first batch of clips/reconstructions, mission card, pitch answer, feedback
- [ ] Accessibility baseline: keyboard nav, reduced motion, colour-blind-safe palette
- [ ] What's new page

### Add After Validation (M2-M4, v1.x)

- [ ] "Eye improving" chart (needs enough attempts; trigger: about 20+ clip attempts across 2+ skills)
- [ ] Weekly review from weak spots (trigger: queue has real history)
- [ ] Watch Gym L2 (2-5 minute sequences) and block timer (trigger: learner chooses longer sessions, L1 completion without drop-off)
- [ ] Write and Speak seed: first Report Writer template (scaffold fade) and Speak-It recorder (trigger: Track 2-3 content exists)
- [ ] Role Map path highlighting and readiness meter (trigger: role competencies mapped to shipped lessons)
- [ ] "Explain it back" with model-answer comparison (trigger: first mastery-check chapter)
- [ ] Saved scenes and notes search (trigger: learner reports needing them)

### Future Consideration (v2+)

- [ ] Role exams and portfolio pieces (needs competency matrix coverage)
- [ ] Python Cell, ML Model Lab, Pitch Control, xG/xT labs (data-pipeline milestones)
- [ ] Negotiation / Transfer / Matchday simulators
- [ ] AI Scout Assistant Lab and any LLM tutor features (after the source registry exists)
- [ ] Watch Gym L3-L5 and Live Watch Notebook

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Lesson spec + validator | HIGH | MEDIUM | P1 |
| Lesson Loop engine + checkpoints | HIGH | HIGH | P1 |
| Pitch Standard + tap-on-pitch primitive | HIGH | MEDIUM | P1 |
| Local persistence + export/import | HIGH | MEDIUM | P1 |
| Review queue (capped, quiet) | HIGH | MEDIUM | P1 |
| Low-energy mode | HIGH | MEDIUM | P1 |
| Welcome-back flow | HIGH | MEDIUM | P1 |
| Confused button + feedback file | HIGH | LOW-MEDIUM | P1 |
| Focus mode | MEDIUM | LOW | P1 |
| Glossary cards | HIGH | MEDIUM | P1 |
| Watch Gym L1 | HIGH | HIGH | P1 |
| Track 1 content + Tactics Board | HIGH | MEDIUM-HIGH | P1 |
| Placement diagnostic | MEDIUM-HIGH | MEDIUM-HIGH | P1 |
| Golden lesson | HIGH | HIGH | P1 |
| Home "one next action" screen | HIGH | LOW | P1 |
| Progress rings / days learned | MEDIUM | MEDIUM | P1 |
| Role Map overview + goals page | MEDIUM | MEDIUM | P2 (M1 late) |
| Minimal concept map | MEDIUM | MEDIUM | P1/P2 (needed by placement and "Connect it") |
| Source drawer / contested chips | MEDIUM | LOW-MEDIUM | P2 |
| "Eye improving" chart | HIGH (later) | MEDIUM | P2 (capture data P1) |
| What's new | LOW | LOW | P3 |
| Role readiness meter | MEDIUM | MEDIUM | P3 (post-M1) |

**Priority key:**
- P1: Must have for the learner to start studying
- P2: Should have, add when possible within M1 or immediately after
- P3: Nice to have, future consideration

## Competitor Feature Analysis

Observations for competitors are general product knowledge and marketing-page descriptions, tagged accordingly. Treat as MEDIUM or LOW.

| Product | What they do well | What to copy | What to avoid or beat |
|---------|-------------------|--------------|-----------------------|
| **Brilliant** (interactive STEM) | Problem before procedure, guided discovery, short lessons, instant feedback, retrieval-based adaptive practice (own descriptions) | Predict-first, immediate feedback, a "continue" home | Unsourced effectiveness claims; streak/daily-goal pressure; no football or role context |
| **Duolingo** | Bite-sized sessions, strong re-entry hooks, low-bar streak mechanics, placement test | One clear next lesson, session end screen, short placement | Losable streak, hearts, guilt notifications, leaderboards; its own blog admits strict streaks backfire |
| **Anki / FSRS-based apps** | Evidence-backed scheduling, flexible daily limits | Use FSRS-style scheduler; cap new cards; filter/sort for catch-up | Overdue counters, huge default queues, settings-heavy UI (an ADHD barrier) |
| **Khan Academy-style mastery systems** | Visible per-skill mastery levels | Per-concept mastery rings | Linear gating; heavy dashboard |
| **Explorable explanations** (Victor, Ncase, Red Blob Games; Ciechanowski/The Pudding in the same genre) | Direct manipulation, "test your expectation against the behaviour", beautiful visuals | The Touch it and Predict steps; interaction with feedback | Unguided sandboxes; content that only helps people who already understand (critics' warning) |
| **Tifo / FourFourTwo / Total Football Analysis-style explainers** | Minimalist animations of tactics (Tifo), long-running glossary series (FourFourTwo, text-first) | Visual vocabulary of shapes and runs | Passive, one-way, no practice, no memory |
| **TacticalPad / Tactics Manager / Miro boards** | Drag-and-drop pitch diagrams, player/ball/cone/line placement | Direct-manipulation board and saved scenes | They are authoring tools, not teachers; no checks, no mastery |
| **Metrica Play / Kinovea / Hudl-type video tools** | Frame-by-frame, tagging, playlists; drawing tools such as line, arrow, circle, distance, offside line, player mark (Metrica); measurement and timeline markers (Kinovea, free) | Offside-line and distance tools as part of Watch Gym answer vocabulary; timestamp tagging for later Live Watch Notebook | Professional-tool complexity; they assume the user already knows what to look for |
| **StatsBomb IQ / Wyscout-style analytics platforms** | Interactive filtered heatmaps and event views | Event-to-pitch linked views later (Event Inspector) | Not teaching tools; paywalled; out of scope for M0/M1 |

**Our approach:** combine Brilliant's loop, Anki's scheduling honesty (with a quiet cap), explorable-explanation interactivity, tactics-board manipulation and a Metrica-style annotation vocabulary, wrapped in a design that never shames the learner and always ends before attention drops.

## Open Questions and Risks for Roadmap

- **Watch Gym L1 content sourcing** (legal clips vs reconstructions; whether PL open event data exists in sufficient volume). Needs a Phase 0 decision before building the component. Confidence: medium that reconstructions from open event data are feasible; PL-specific availability unverified here.
- **Feedback file write path from a browser** (dev-server endpoint vs download vs File System Access API). Technical decision for STACK/ARCHITECTURE.
- **Review cap numbers and scheduler choice** need tuning with the actual learner; defaults above are starting points, not findings.
- **No ADHD-specific evidence for spaced repetition** was found; the design relies on the general spacing literature plus the learner's own stated needs.
- **Placement diagnostic length and shape** should be tested with the learner early (a dry run in the golden-lesson stage) because a bad first experience ends the product.

## Sources

Search-derived (tagged by reliability):
- Frontiers in Education 2025 and Frontiers in Psychology 2023 (retrieval practice and ADHD; gamification/serious games reviews): https://www.frontiersin.org/articles/10.3389/feduc.2025.1668260 ; https://www.frontiersin.org/articles/10.3389/fpsyg.2023.1301726 [peer-reviewed, small studies]
- Stern and Halamish, free-recall retrieval for students with ADHD (PMC): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10715433/ [peer-reviewed]
- Dunlosky et al., Improving Students' Learning (Psychological Science in the Public Interest 2013): https://www.psychologicalscience.org/journals/pspi/1529100612453266/ [peer-reviewed review; consulted via summary pages]
- Mayer multimedia principles (secondary summaries): https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf ; https://my.chartered.college/?p=6958 [secondary]
- Pretesting effect (Kornell et al. 2009, Richland et al. 2009; later reviews): https://learninglab.uchicago.edu/Pre-Testing_files/RichlandKornellKao.pdf ; https://link.springer.com/doi/10.1007/s10648-023-09814-5 [peer-reviewed]
- Zhao et al. 2022, video-based training in football players, systematic review: https://pmc.ncbi.nlm.nih.gov/articles/PMC9686440 [peer-reviewed, 10 studies]
- Gamification meta-analyses (2023, 2025): https://link.springer.com/article/10.1007/s11423-023-10337-7 ; https://link.springer.com/article/10.1007/s10648-025-10108-1 [peer-reviewed]
- Nückles et al. and Salden et al. on fading and expertise reversal: https://link.springer.com/doi/10.1007/s11251-009-9106-9 ; https://link.springer.com/doi/10.1007/s11251-009-9107-8 [peer-reviewed]
- Duolingo streak research and blog (company-reported): https://blog.duolingo.com/duolingo-streak-research/ ; https://blog.duolingo.com/how-duolingo-streak-builds-habit [vendor, treat figures as unverified]
- Anki forum, LessWrong and ADHD-workflow guides on backlogs: https://forums.ankiweb.net/t/proposal-backlog-recovery-planner-to-prevent-user-churn-burnout/70487 ; https://www.lesswrong.com/api/post/an-opinionated-guide-to-using-anki-correctly ; https://www.iatrox.com/blog/anki-medical-students-adhd-revision-workflow [community/blog, LOW]
- Brilliant, how it teaches math: https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/ [vendor]
- Explorable Explanations (Bret Victor): https://worrydream.com/ExplorableExplanations/ [essay]
- Football tools: Metrica Sports Play listing and drawing toolset, Kinovea reviews, TacticalPad coverage (https://worldsoccertalk.com/2013/07/25/tacticalpad-helps-visualize-soccer-tactics-with-quick-and-easy-to-use-software/ ; https://www.sourceforge.net/software/product/SocrPro) [aggregator and press, LOW]
- ADHD instructional-design guidance (chunking, feedback, video pauses): https://chadd.org/?p=2632 ; https://arxiv.org/pdf/2607.24612 [practitioner and non-peer-reviewed preprint, LOW]

Not verified here and should be checked in later research: Metrica/Kinovea current feature lists from official sites, StatsBomb open-data Premier League coverage, SkillCorner/Metrica/DFL open tracking licences, YouTube embed terms for start/end clips, FSRS library maturity.

---
*Feature research for: interactive visual-first football learning app (single learner, ADHD)*
*Researched: 2026-11-27*
