# MASTER PROMPT: "THE NEXT KLOPP": Become a Data- and AI-Powered Football Mind, A→Z (Localhost Web App)

> **Project name:** The Next Klopp (repo slug: `the-next-klopp`).
> **Mission:** a learner who combines a top coach's understanding of the game with data and AI, and who **by the end knows it all**: the game, tactics, coaching, scouting, data, transfers, money and club strategy. This is serious. Treat "complete mastery" as the real target, not a slogan.

> **How to use this file:** Start a new project folder, open Claude Code, install GSD Core (Section 4), run `/gsd-new-project`, and paste this whole file as the project brief. Everything below is written for the AI agent building the project.

---

## 0. YOUR ROLE

You are the **lead architect, head of curriculum, and engineering lead** for a project that will take months, possibly years. You are not writing one course document. You are building a **living, interactive learning web app** that teaches one learner football from A to Z. "Football" here means the game, tactics, coaching, training, data, analytics, scouting, transfers, money, club strategy and governance. The goal is that the learner is ready for **any senior football role**: sporting director, head coach, head of performance analysis, head of data science, head of recruitment/scouting, academy director, and club CEO/GM (Section 7.1). The **Premier League is the main reference league** for the whole course, because it has the most free data, writing, video analysis and official documents.

You will run many sub-agents in parallel. You will **research first and write later**. You will ship in chapters, so the learner can study Chapter 1 while you build Chapter 2 and later chapters.

The learner said: *"I don't joke about it."* Treat this as a serious professional education, not a hobby site.

---

## 1. WHO THE LEARNER IS (design everything around this)

- **Location / ambition:** Lives in Saudi Arabia, and wants a career with real impact in football (club, league, federation, or a data/recruitment role) in Saudi Arabia or abroad. The long-term target is **sporting director** level.
- **Main league:** the **Premier League (PL)**. Use PL teams, matches, players, clubs, finances and rules as the **default examples, case studies and datasets** everywhere. Use other leagues only when they teach something the PL can't, such as a different tactical school, a different selling-club model, or open data that only exists for another competition.
- **Background:**
  - Data science graduate, but says their **practical basics of data science, ML and statistics are weak**. A separate course covers general data science, so this course teaches only the stats/ML needed for football, **just in time**, inside the football lessons.
  - Has taken **PFSA** courses (Professional Football Scouts Association, UK) in scouting and talent ID, football data analysis, tactical analysis, **opposition analysis**, and data analysis in football. Treat the PFSA pathway as a **baseline to go beyond, not repeat**. Its free public pages describe that pathway: Introduction → Level 1 → Level 2 Talent ID → Level 3 Advanced Reporting, plus Opposition, Performance, Technical Scouting and Data Analysis courses. Ask the learner which PFSA levels they finished, and use any notes or certificates they share to calibrate the placement test. Do not copy PFSA's paid course material.
  - Has worked with **event data** before.
  - Has their own football datasets on their **Windows PC** (event data for the big-5 European leagues for the 2023 and 2024 seasons, possibly StatsBomb/Opta, and Wyscout data from about 5 earlier seasons). They also have a related side project: a **player-role / scouting model**. **Ask the learner for the local paths** before using any of it. Never commit this data to GitHub.
  - Passionate about football, but says *"sometimes I don't understand football"*. So **never assume tactical vocabulary**. Define everything visually the first time it appears.
- **How they learn (critical):**
  - Has **ADHD**. Learns by **doing, seeing, and touching**: visuals, shapes, motion, interaction. Does **not** learn well from long reading or passive video.
  - So every concept must be **shown, then manipulated, then practiced**. Text supports the visual; the visual is never decoration.
- **Watching football is a core problem to solve, not a side topic.** The learner used to watch full 90-minute matches easily. Now they **can't sit through a match**: they lose interest, and they aren't entertained. When they do watch, **they don't understand what they're seeing** the way analysts do. When they rewatch a match, **they don't know how to turn it into a tactical analysis, an opposition report, or a spoken talk about the game.** The course must rebuild this step by step: first short clips with one clear task, then longer sequences, then halves, then full matches with a purpose. It must also teach exactly how to write and speak analysis (Track 4 and Track 14 in Section 7).
- **Energy and motivation vary a lot from day to day.** Design for low-energy days. Always offer a 3–5 minute "small win" option. Returning after days or weeks away must feel welcoming: no lost streaks, no guilt, no piled-up backlog. Celebrate small progress honestly, without hype. Never shame or pressure. This is a learning tool, not a therapy tool, so don't add mental-health content.
- **Language:** English only. No translation layer is needed.
- **Machine:** Windows PC. The app must run on **localhost on Windows** with one command.

---

## 2. NON-NEGOTIABLE RULES

1. **Research before writing.** No lesson content, no curriculum lock, and no DESIGN.md before Phase 0 (research) is finished and its outputs are reviewed. See Section 6.
2. **Free and legal sources only.** Use everything that is legitimately free: open data, open-source repos, free courses, free books and papers published by their authors, official regulations, public reports, YouTube, blogs, public X/Twitter threads.
   - **Paid or copyrighted books:** do NOT download pirated PDFs. Record the bibliographic reference and the key ideas **in your own words**, and point the learner to the book.
   - **Never copy long passages** from any source. Paraphrase, credit the source, and link it.
   - Respect each dataset's **license and ToS**. For example, StatsBomb open data requires attribution, and some sites forbid scraping. Record the license of every source in the source registry.
3. **Private GitHub repo.** Create it with `gh repo create <name> --private`. Push often. Never commit secrets (`.env`), large raw datasets, or licensed data. Use download/preprocess scripts plus `.gitignore` instead.
4. **Localhost first, Vercel for viewing.** The app runs on localhost. It also deploys to the learner's **Vercel** account so they can open it on their phone. Turn on **Vercel Deployment Protection** (the deployment must not be public), and never ship licensed raw data in the deployed bundle.
5. **Study while you build (rolling release).** Never wait for the whole course to finish. Ship playable chapters one after another, keep at least **2 chapters ahead** of the learner's progress, and never break a shipped chapter (see Section 11).
6. **No AI-slop design.** No generic gradient hero, no default card grids, no emoji bullets, no "lorem ipsum vibes". Use the design skills in Section 4 and follow DESIGN.md strictly.
7. **Every factual claim is traceable** to a source in the registry. Contested topics must be labeled as contested, with both sides shown. Examples: the acute:chronic workload ratio, how predictive xG is, how stable some metrics are.
8. **Required tools are mandatory:** GSD Core, agentmemory (rohitg00), and K-Dense Scientific Agent Skills. See Section 4.
9. **Model routing** follows Section 5.

---

## 3. THE END GOAL (Definition of "A→Z done")

After finishing the course, the learner can:

- **Enjoy and focus on a full 90-minute match again**, because they watch with a purpose and know what to look for.
- **Write professional analysis from a match:** a tactical analysis, an opposition report, a post-match report and a scouting report, using club-standard structure, clips and visuals.
- **Talk about a game clearly:** a 60-second verbal summary, a 5-minute presentation to a coach, a pre-match opposition briefing, and a half-time "3 key points" talk.
- **Scout like a professional:** live and video scouting, talent ID, technical scouting, player reports with a clear grade and recommendation, and data-led shortlists.
- **Read a match:** name the shape in and out of possession, the build-up structure, the pressing scheme, the rest-defence, the transition behaviour and set-piece routines, live or on video.
- **Explain any tactic visually** on a tactics board: positional play, relational/functional play, gegenpressing, low/mid/high blocks, overloads, the third man, and so on.
- **Design a game model** and the training sessions that build it (tactical periodization, constraints-led approach).
- **Work with any football data:** event, tracking, broadcast tracking, physical/GPS, 360 freeze-frames, market and financial data. Load it, clean it, model it and visualise it in Python.
- **Understand and critique every major metric** (xG, xA, xT, VAEP, OBV, EPV, pitch control, PPDA, field tilt, packing, PSxG, and more): how it is built, when it lies, and how much sample it needs.
- **Run recruitment:** squad mapping, role profiles, data shortlists, video and live scouting, reports, similarity search, league-strength adjustment, age curves, and risk.
- **Do a transfer end-to-end:** valuation, negotiation structure (fee, add-ons, sell-on, buy-back, loans with obligation), wages, agent rules, FIFA RSTP, solidarity and training compensation, amortisation and its P&L impact, and squad-cost rules.
- **Build a club strategy:** philosophy, staff structure, an academy pathway, a data department, multi-club context, and board communication.
- **Know the Premier League inside out:** its governance and the PL Handbook rules, squad and homegrown rules, the **new financial system (Squad Cost Ratio and Sustainability and Systemic Resilience, which replaced PSR from 2026/27)**, UEFA squad-cost rules for clubs in Europe, EPPP academy categories, the broadcasting and commercial model, the transfer market, and the strategy of each club type (giant, overachiever, selling club, newly promoted). **Verify everything with current official sources.** These rules change often.
- **Apply it at home:** a short closing module translates the PL knowledge to the Saudi Pro League context, where the learner lives.
- **Do every senior job in the building** (Section 7.1):
  - **As head coach:** plan the week, build a game plan, manage match day and substitutions, give team talks, lead a dressing room, and handle the media.
  - **As head of performance analysis:** run the full analysis cycle and lead an analysis department.
  - **As head of data science:** build football ML/AI models, run the data infrastructure, and get analytics adopted by coaches.
  - **As head of recruitment:** run a scouting network and the recruitment process.
  - **As academy director:** run the development pathway.
  - **As CEO/GM:** understand the whole club business.
- **Use AI as a football professional:** machine learning models, computer vision, LLMs and AI agents, and know their limits.
- **Pass the capstone:** run a simulated club for a full season from every seat in the building (Section 7, Track 28), and finish with a **portfolio** for each role.

---

## 4. TOOLCHAIN SETUP (do this first, verify each step)

> Tools change fast. **Read each repo's current README before installing.** If a command below differs from the README, follow the README and note the difference in `SETUP.md`.

### 4.1 GSD Core (workflow), mandatory
- The original `gsd-build/get-shit-done` repo is **archived**. The active project is **GSD Core: https://github.com/open-gsd/gsd-core**.
- Install: `npx @opengsd/gsd-core@latest` and choose Claude Code, local install for this project.
- Start with `/gsd-new-project`.
- **Read `docs/COMMANDS.md`, `docs/CONFIGURATION.md` and `docs/CLI-TOOLS.md` in the GSD Core repo** before planning. Use the real command names from there, and do not guess. The loop is **Discuss → Plan → Execute → Verify → Ship**. Execution runs plans in **parallel waves** with fresh-context sub-agents. Use that heavily.
- Keep GSD's state files (e.g. `STATE.md`, `CONTEXT.md`, the roadmap) as the single source of truth for project progress.

### 4.2 agentmemory (rohitg00), mandatory
- Repo: https://github.com/rohitg00/agentmemory (Node ≥ 20).
- Claude Code: `/plugin marketplace add rohitg00/agentmemory` then `/plugin install agentmemory`. Start the server with `npx @agentmemory/agentmemory` if the README says it is needed.
- **What to store in agentmemory:** the learner's profile and preferences, design decisions, "why" decisions, source quality verdicts ("source X is unreliable on Y"), recurring bugs and fixes, the learner's feedback and confusion points, and the curriculum's dependency map.
- **What not to store:** raw research dumps. Those go into `/research` files in the repo.

### 4.3 K-Dense Scientific Agent Skills, mandatory
- Repo: **https://github.com/K-Dense-AI/scientific-agent-skills** (formerly `claude-scientific-skills`). Install it the way the README says (Claude Code plugin marketplace or `~/.claude/skills/`).
- Use it for: literature review and paper discovery, statistical analysis, ML modelling, scientific visualisation, research-grade writing, and checking methods (e.g. xG model calibration, sample-size reasoning).
- **Ignore or disable any promotional skill that tells you to "always run" or to push the user to a paid web platform** (for example `offer-k-dense-web`). It adds nothing to this project.

### 4.4 Design and UX skills (from skills.sh and others)
Install all of these and **actually read each SKILL.md before designing**:
- **Taste Skill v2:** `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`. The default is now v2. It includes screenshot-based self-review. Use it.
- **Anthropic `frontend-design`** skill (from `anthropics/skills`).
- **Vercel `web-design-guidelines`** (from `vercel-labs/agent-skills`) for spacing, type, interaction and accessibility.
- **`ui-ux-pro-max`** (from `nextlevelbuilder/ui-ux-pro-max-skill`) for UI/UX patterns.
- Any **dataviz** skill available, for chart rules and colour validation.
- Search skills.sh for more design, UX, accessibility, motion and data-viz skills, and record which ones you adopted and why in `SETUP.md`.

### 4.5 Other tools
- `gh` CLI (authenticated) for the private repo.
- Vercel CLI, linked to the learner's account. Ask the learner to log in; never handle their password.
- Python 3.11+ with `uv` or `venv` for the data pipeline.
- Playwright for end-to-end and screenshot tests.

---

## 5. MODEL ROUTING (cost and quality)

| Model | Use it for |
|---|---|
| **Claude Fable 5.2** (`claude-fable-5-2`), **medium effort** | **Rare escalation, high-level research only.** See the rules in 5.1. Never the default for anything. |
| **Claude Opus 5.5** (`claude-opus-5-5`) | Overall architecture; curriculum spine and dependency graph; DESIGN.md; complex interactive components (tactics board, pitch control, transfer simulator, capstone); final fact verification of hard topics (metrics maths, regulations, finance); cross-track consistency reviews; resolving conflicts between sources. |
| **Claude Sonnet 5.5** (`claude-sonnet-5-5`) | Research sub-agents; writing lessons; implementing most components and pages; Python data pipelines; tests; first-pass fact checks; screenshot design reviews. |
| **Claude Haiku 5.5** (`claude-haiku-5-5`) | Link checking; source-registry tagging; glossary entries; quiz and flashcard variants; metadata and front-matter; formatting; summarising single sources; file housekeeping. |

Configure this through GSD Core's model/profile settings (check `docs/CONFIGURATION.md`). If GSD can't route per task, set the model in each sub-agent's definition. Log the routing in `SETUP.md`.

### 5.1 Fable 5.2 rules (respect its usage limits and price)
Fable is the most expensive model and has tight usage limits. Use it **only where it makes a real difference that Opus 5.5 cannot achieve.**

**Fable may be used for (high-level research only):**
- The **final synthesis of the Phase 0 research**: merging all domain findings into the master concept map and curriculum, but only if Opus's synthesis was reviewed and found shallow, inconsistent, or missing major connections.
- **Deep contradictions Opus could not resolve**: for example, sources that disagree on how a model or metric works (EPV, pitch control, OBV, VAEP), or conflicting interpretations of complex regulations (FIFA RSTP, loans, solidarity, the PL SCR/SSR rules).
- **Hard research questions with no clear free source**, where Opus already tried and returned a weak or uncertain answer (logged in `/research/GAPS.md`).
- A **once-per-major-milestone "big picture" research review**: is the curriculum still complete and correctly ordered for the sporting-director goal?

**Fable is never used for:** writing code, building components, writing or editing lessons, design work, tests, data pipelines, routine research sub-agents, fact checks Opus can do, formatting, or any sub-agent fan-out. **Never run Fable in parallel waves.**

**The escalation protocol (all four steps are required):**
1. **Opus tries first.** Its output is saved.
2. A reviewer (Opus) writes **why it's not good enough**, in one paragraph, in `/docs/FABLE_LOG.md`.
3. The task is scoped tightly: one clear question, with only the inputs it needs (summaries, not raw dumps), to keep the cost low.
4. Fable runs **at medium effort**. Its result and a short verdict ("was it worth it?") go into `FABLE_LOG.md`.

**Budget cap:** at most **3 Fable tasks per milestone** by default. Going over requires the learner's approval first. If Fable's usage limit is reached, fall back to Opus, mark the item as "needs Fable later", and continue. Never block the build waiting for Fable.

---

## 6. PHASE 0: THE DEEP RESEARCH SPRINT (before any content)

### 6.1 How to run it
- Fan out **many parallel research sub-agents**, one per research domain below. Use Sonnet, and Opus for synthesis.
- Each sub-agent searches broadly: the web, GitHub, arXiv / Google Scholar / SSRN, the MIT Sloan Sports Analytics Conference, StatsBomb conference papers, YouTube, public X threads, blogs, official regulations, club and league reports.
- Each sub-agent writes to `/research/<domain>/`:
  - `findings.md`: the key concepts, the "must teach" list, common misconceptions, and contested points, **in your own words**.
  - `sources.json`: every source, with `title, url, type (data/repo/book/paper/video/blog/regulation/report/thread), free (yes/no), license, quality (1–5), recency, what it's best for, notes`.
  - `visual_ideas.md`: how this concept could be **shown and manipulated** (this feeds DESIGN.md).
- After that, an **Opus synthesis agent** merges everything into:
  - `/research/SOURCE_REGISTRY.json` (deduplicated master list),
  - `/research/CONCEPT_MAP.md` (every concept, its prerequisites, and which track teaches it),
  - `/research/CURRICULUM_DRAFT.md` (Section 7, refined by the research),
  - `/research/GAPS.md` (topics without good free sources, and how to cover them).
- **Checkpoint:** show the learner a short visual summary of the research (concept map and curriculum draft) and get approval before DESIGN.md.

### 6.2 Research domains (one or more sub-agents each)
1. Laws of the Game (IFAB), pitch geometry, positions, history of tactics and formations
2. Principles of play, phases of play, the language of space (zones, half-spaces, channels, lines, superiorities)
3. Positional play (Juego de Posición), relationism/functional play, and other modern attacking models
4. Defending: blocks, pressing schemes, triggers, counter-pressing, rest-defence, compactness
5. Transitions (attacking and defensive)
6. Set pieces (attacking and defensive, routines, marking systems)
7. Player roles and profiles (position vs role, a role catalogue)
8. Coaching methodology: game models, tactical periodization, the constraints-led approach and ecological dynamics, session design, coach education (the FA and UEFA licences)
9. Training and sports science: physical demands (especially PL intensity), GPS/load, periodization, fixture congestion, injuries, recovery, psychology
10. Match and video analysis workflow: coding, opposition reports, post-match reviews, free tools
11. Football data types and providers: event, tracking, broadcast tracking, 360, physical; data models; coordinate systems
12. Football metrics and models: xG family, possession-value models, pitch control, pressing metrics, goalkeeper metrics, metric stability
12b. **Stats by position and role (top priority, several sub-agents, one per position group):** the KPIs per role and why, what good and elite benchmarks look like, how each number links to on-pitch actions, misleading and "fake" stats with real examples, stat repeatability research (which metrics are skill and which are luck, and the minutes needed), context and style adjustments, and how pro recruitment departments build role-specific profiles.
13. The Python football ecosystem: libraries, tutorials, open notebooks
14. Recruitment and scouting (**give this several sub-agents, it is a top priority**):
    - (a) talent ID and live scouting methods (what scouts look for by position and age, how to watch one player, scouting youth vs senior players, character and mentality, PFSA-style frameworks, EPPP context);
    - (b) technical and video scouting;
    - (c) scouting reports and grading scales (A–E, 1–10, "sign / monitor / reject"), and how clubs write and read them;
    - (d) data-led scouting (shortlists, similarity, league adjustment, age curves);
    - (e) recruitment department structure and workflow, from target list to signing;
    - (f) scouting networks and how PL clubs structure global recruitment (case studies: Brighton, Brentford, Liverpool's research department under FSG, and more).
14b. **How analysts actually watch football:** viewing methods (focus on one player, one unit or one phase; "watch in blocks"; tactical camera vs broadcast; watching with notes; condensed matches), the habits of professional analysts, and how to rebuild attention and enjoyment through purposeful watching.
14c. **Writing and speaking analysis:** real examples and templates of tactical analyses, opposition reports, post-match reports, scouting reports, coach briefings and media-style breakdowns. Cover structure, language, how to use clips and stills, the 3-key-points method, and common mistakes.
15. **The transfer market, player valuation and salaries (top priority, several sub-agents):**
    - (a) how clubs **set a price** for a player when buying and when selling: valuation models (market-value models, CIES methods, Transfermarkt's crowd values and their limits), comparable deals, age, contract length left, position, form, league, nationality and homegrown status, buyer demand, and the selling club's situation;
    - (b) **selling strategy:** when to sell (peak value vs peak performance), mapping buyers, creating competition between clubs, sell-on and buy-back clauses, 'profit on sale' vs book value, and PL selling-club models (e.g. Brighton, Brentford, Southampton history);
    - (c) **salaries:** wage structures and bands, base pay vs bonuses (appearance, goals, clean sheets, team success, loyalty), signing-on fees, image rights, wage escalators, contract length, wage-to-revenue ratios, and public wage data sources and their accuracy;
    - (d) **negotiation:** as a buyer and as a seller, with agents, and with players on renewals;
    - (e) the contract lifecycle: renewals, expiry risk, free agents (Bosman), and release clauses (where used);
    - (f) market dynamics: inflation, transfer windows, deadline-day effects, and how the PL's SCR rules change behaviour.
16. Contracts, agents and regulations: FIFA RSTP, loan rules, Football Agent Regulations, TMS, solidarity and training compensation
17. Club finance: revenue streams, wages, amortisation, P&L, squad-cost rules (UEFA), Deloitte/UEFA/FIFA reports
18. Club strategy and the sporting director role: structures, case studies, decision-making and biases
19. Youth development and talent ID: the relative age effect, development models, academy systems
20. **The Premier League ecosystem:**
    - governance and the PL Handbook (published free every season);
    - the SCR/SSR financial rules (premierleague.com explainers);
    - club accounts (free on UK Companies House);
    - squad and homegrown rules, and work-permit rules for foreign players (check the current GBE/FA rules);
    - EPPP;
    - broadcasting deals, the commercial model, and ownership types;
    - every PL club's data department and recruitment model where public;
    - the best free PL data (e.g. the StatsBomb open data 2015/16 PL season; check FBref, Understat and the official PL stats for current status and terms).
    - Also a short Saudi Pro League context pack (SPL, PACE, foreign-player rules) for the final "apply it at home" module.
20b. **The head coach / manager:** leadership and man-management, the weekly microcycle, game plans, match-day and in-game management (substitution research, game-state effects), team talks, media, coaching philosophies of top PL coaches (interviews, talks, documentaries, books as references).
20c. **Performance analysis departments:** the analysis cycle, live analysis, tools (pro and free), department structure, and how analysts get buy-in.
20d. **Football AI and ML:** player projection, valuation, injury and similarity models, deep learning on tracking data (GNNs, sequence models), computer vision for tracking (open-source repos), LLMs and agents in scouting and analysis, model evaluation, ethics and data law.
20e. **Club data departments:** infrastructure, buying data, team structure, stakeholder adoption, and public case studies.
20f. **Academy and player development:** EPPP, maturation and the relative age effect, development curricula, the pathway to the first team, and the academy business model.
20g. **The club CEO/GM and the business of football:** revenues, commercial deals, marketing and fan engagement, stadium operations, governance, the regulator, ownership.
20h. **Role definitions (feeds Section 7.1):** real job descriptions, competency frameworks, career paths and interviews for every role in Section 7.1. The output is `ROLE_COMPETENCIES.md`.
21. Learning science for ADHD and visual learners: retrieval practice, spaced repetition, dual coding, worked examples, interactive simulations, gamification without dark patterns, designing for low-motivation days, and rebuilding sustained attention gradually
22. **Inspiration audit for interactive explainers:** collect the best interactive football and data explainers on the web. Study how they teach, and do not copy their code or visuals.

### 6.3 Seed source list (starting points only; verify each one, check its license and current status, and expand it a lot)
- **Open data:** StatsBomb Open Data (`statsbomb/open-data`, including 360 freeze-frames), Metrica Sports sample tracking and event data (`metrica-sports/sample-data`), SkillCorner Open Data (`SkillCorner/opendata`, broadcast tracking with tutorials and a kloppy integration), the DFL/Sportec open event and tracking data (loadable via kloppy and databallpy), the Wyscout public event dataset (Pappalardo et al., figshare), Last Row Liverpool tracking clips, PFF FC open data (check availability), and the Transfermarkt datasets project (`dcaribou/transfermarkt-datasets`). Also check the current status of FBref and Understat data, wage sources like Capology (check the ToS), and CIES Football Observatory reports.
- **Libraries:** kloppy, mplsoccer, socceraction (VAEP/xT), statsbombpy, databallpy, floodlight, unravelsports, soccerdata, and the Friends of Tracking repos (e.g. Laurie Shaw's tracking tutorials).
- **Free courses and channels:** Soccermatics (David Sumpter's free online course), the Friends of Tracking YouTube channel, McKay Johns, PySport resources, American Soccer Analysis, StatsBomb conference papers and blog, Karun Singh's original xT article, and the MIT Sloan papers.
- **Tactics and coaching (free):** Spielverlagerung, The Coaches' Voice, Tifo-style YouTube explainers, public coaching articles, UEFA/FIFA technical reports, and the FIFA Training Centre (free).
- **Regulations and reports:** IFAB Laws of the Game, FIFA RSTP, FIFA Football Agent Regulations, the FIFA Global Transfer Report, the UEFA European Club Finance and Investment Landscape report, the Deloitte Football Money League (free summary), the **Premier League Handbook and its official explainers**, **club annual reports and accounts (Companies House)**, the House of Commons Library briefings on football governance, and the Independent Football Regulator documents (check current status).
- **Paid books (reference only, no PDFs):** e.g. *Inverting the Pyramid*, *The Numbers Game*, *Football Hackers*, *Net Gains*, *The Expected Goals Philosophy*, and tactical periodization texts. Summarise the ideas in your own words and link the publisher.
- **X/Twitter:** find the analysts, data companies, club data staff and coaches who post open threads and visuals. Store the thread URL and a summary in your own words.

---

## 7. CURRICULUM SPINE (draft; refine it after research)

Each **Track** contains **Chapters**. Each Chapter contains **micro-lessons of 5–12 minutes**. Every micro-lesson follows the **Lesson Loop** (Section 8). Every concept is taught with **Premier League examples first**: real PL matches, teams, players and deals. Track numbers are for reference only. **The study and build order follows the concept map**, not the numbers.

**Three threads run through the whole course** and are never "finished":
- **Watch Gym** (Track 4): every chapter ends with a watching mission that uses what was just learned.
- **Write and Speak** (Track 14): every chapter adds a small writing or speaking task.
- **Scouting** (Tracks 21–22): every tactical chapter ends with "what would a scout look for here?"

### PART A — FOUNDATIONS
- **Track 0 — Start here:** how the app works, a placement diagnostic (so the learner skips what they already know from PFSA and other courses), a personal goals page, the **Role Map** (Section 7.1), and the learning loop explained visually.
- **Track 1 — The game:** laws (visual), pitch geometry, positions and numbering, formations, and the history of tactics as an interactive timeline.
- **Track 2 — The language of space:** zones, 18-zone and 5-lane grids, half-spaces, lines and between-the-lines, width and depth, and the 4 superiorities (numerical, positional, qualitative, socio-affective).
- **Track 3 — Phases of play:** in possession, out of possession, attacking transition, defensive transition, and set pieces, plus how the phases connect.
- **Track 4 — Watch Gym (learning to watch football again):** a progressive programme that rebuilds attention, understanding and enjoyment.
  - **Level 1:** 10–30 second clips, each with **one question** (e.g. "Who triggered the press?"). The learner answers on a pitch overlay.
  - **Level 2:** 2–5 minute sequences that focus on one thing: one player, one unit, or one phase.
  - **Level 3:** condensed matches and 15-minute blocks with a "watch card" (3 things to track) and pause-and-predict moments.
  - **Level 4:** a full half, using the "watch in blocks" method (0–15, 15–30, 30–45) with a different focus per block.
  - **Level 5:** a full 90 minutes with a live note template, then a short debrief.
  - Each level teaches **how analysts watch**: a tactical-camera vs broadcast view, where to look when the ball is far away, watching off-ball movement, and spotting shape changes at restarts. It also covers **how to rewatch** a match (first pass for the story, second pass for structure, third pass for clips).
  - Make it **fun**: prediction streaks, "spot it first" challenges, matching clips to concepts, and a "my eye is improving" graph that compares old and new answers.
  - Footage: use the learner's local files, legal YouTube embeds and official highlight clips. Animated reconstructions from open tracking/event data are used where no footage is available. Never store copyrighted video in the repo.

### PART B — TACTICS, COACHING AND THE HEAD COACH
- **Track 5 — Attacking play:** build-up structures (2-3, 3-2, 3-1, box), progression, overloads and isolation, the third man, rotations, chance creation, and finishing patterns. Covers positional play and relational/functional play.
- **Track 6 — Defending:** blocks (low/mid/high), pressing schemes (man-oriented, zonal, hybrid), pressing traps and triggers, compactness, line height, and defending the box.
- **Track 7 — Transitions:** counter-pressing, rest-defence, counter-attacks, and how to measure each.
- **Track 8 — Set pieces:** corners, free kicks, throw-ins, marking systems, routine design, set-piece data, and the role of a set-piece coach.
- **Track 9 — Roles and profiles:** position vs role, and a full role catalogue (e.g. inverted full-back, false 9, regista, mezzala, ball-playing CB, sweeper keeper), each with a visual heat/action signature drawn from data.
- **Track 10 — Coaching and game models:** building a game model, tactical periodization, the constraints-led approach, session design, coaching methods (whole-part-whole, guided discovery, feedback styles), and the coach education pathways (the FA and UEFA).
- **Track 11 — The Head Coach / Manager (NEW, full track):** everything a head coach does beyond tactics.
  - **Chapter 1, the job:** the head coach vs the "manager" model in England, the staff they lead (assistants, analysts, GK, set-piece, fitness and medical staff), and the relationship with the sporting director and board.
  - **Chapter 2, the week:** the weekly microcycle for one game a week and for two, from the post-match review to MD-1, plus where opposition analysis, recovery and tactical sessions fit.
  - **Chapter 3, the game plan:** turning the game model into an opponent-specific plan, Plan B and Plan C, and presenting the plan to players.
  - **Chapter 4, match day:** the pre-match routine, the team talk, **in-game management** (reading the game live, when and how to change shape, substitution timing and logic, game-state management, using live data and analyst feedback from the stands), the half-time talk, and the post-match message.
  - **Chapter 5, leadership and man-management:** managing a squad of 25 egos, communication styles, handling dropped players, discipline, building culture, trust and psychological safety, managing star players, and dealing with conflict.
  - **Chapter 6, player development at the top level:** individual development plans (IDPs), position retraining, and integrating academy players.
  - **Chapter 7, the media and pressure:** press conferences, handling the board and fans, managing a losing run, and job security.
  - **Chapter 8, coaching philosophies (case studies):** how top PL coaches build teams (e.g. Klopp, Guardiola, Arteta, Mourinho, Ferguson, and coaches of smaller clubs). Each case shows their principles visually and what can be learned from them.
- **Track 12 — Training, sports science and medical:** physical demands by position, GPS/load monitoring (with its controversies), periodization, PL fixture congestion and squad rotation, injury risk, prevention and return-to-play, recovery, nutrition basics, sport psychology, and how the head of performance/sports science works with the coach and analysts.

### PART C — ANALYSIS AND COMMUNICATION
- **Track 13 — Performance Analysis and the Head of Performance Analysis (expanded, full track):**
  - **Chapter 1, the analysis cycle:** pre-match (opposition), in-match (live), post-match (own team), and long-term (trends, recruitment support), plus who receives which output and when.
  - **Chapter 2, opposition analysis:** build-up, pressing, transitions, set pieces, key players and weaknesses to exploit. Covers the opposition dossier timeline across the week, and turning analysis into a game plan the coach can use.
  - **Chapter 3, live analysis:** coding live, what to send to the bench or at half-time, tablets and communication, and the half-time clips package.
  - **Chapter 4, post-match analysis:** team and unit reviews, individual player clips and video sessions with players, choosing and tracking KPIs, and combining data with video.
  - **Chapter 5, tools of the trade:** professional tools (Hudl Sportscode, Nacsport, Metrica Play, Wyscout and others: what they do and how clubs use them, learned from free tutorials and demos) and free alternatives the learner can practise with (e.g. Kinovea and other free video tools; verify the current options). Also tactical cameras and drone footage.
  - **Chapter 6, running the department:** team structure (first team, academy, recruitment analysts), workflow and deadlines, building trust with the coaching staff, getting analysis adopted, and hiring and developing analysts.
- **Track 14 — Write and Speak football:** a full skill track that turns watching into professional output.
  - **Writing:** step-by-step templates with worked examples, sentence starters and checklists for a **tactical analysis**, an **opposition report**, a **post-match report**, a **scouting report**, a **board paper** and a **short social or media breakdown**.
  - **Scaffolding fades over time:** first fill in the blanks, then complete a half-written report, then write from a blank template, then write freely.
  - **Speaking:** the 60-second match summary, the "3 key points" half-time talk, a 5-minute coach presentation, a pre-match opposition briefing, a recruitment-meeting pitch, and presenting to a board. The learner records audio locally, and the agent's rubric gives feedback on structure.
  - **Visual support:** how to pick the right clip or still, how to annotate a frame, and how to build a one-page report graphic.
  - **Rubrics** for each output type (clarity, evidence, structure, actionability), with model answers to compare against.

### PART D — DATA, AI AND THE HEAD OF DATA SCIENCE
- **Track 15 — Football data:** data types, providers, data models, coordinates, kloppy standardisation, data quality and its traps.
- **Track 16 — Metrics and models:** per-90 and possession adjustment, xG (built from scratch), xA, xT, VAEP, OBV, EPV, pitch control, PPDA, field tilt, progressive actions, packing, PSxG and goalkeeper metrics, plus sample size, noise, regression to the mean, and metric stability.
- **Track 17 — The numbers that matter, by position and role (deep track):** what each stat actually tells you about each player type, and when it lies.
  - **For every position and role** (GK, CB types, full-back/wing-back types, the 6, the 8, the 10, wingers, strikers and their sub-roles):
    - the **key performance indicators** and why they matter for that job;
    - what a "good", "elite" and "worrying" number looks like (per-90 percentiles, adjusted for league and team style);
    - how each stat **shows up on the pitch**, with a visual or clip linking the number to the real action;
    - which stats are **secondary or misleading** for that role.
  - **Context adjustments:** possession-adjusted defending, team style effects (a CB in a low block vs a high line), league strength, game state (leading or trailing), and teammate effects.
  - **"Fake" and misleading stats (a whole chapter):**
    - tackles and interceptions inflated by bad positioning or by low-possession teams;
    - pass completion % inflated by safe passing;
    - assists vs xA, and goals vs xG (finishing luck);
    - clean sheets credited to one player;
    - dribble counts without end product;
    - "distance covered" myths;
    - per-90 numbers from tiny minutes;
    - stats that are just a product of the system;
    - cherry-picked radars and comparison pools.
  - **Stat stability and signal:** which stats are repeatable season to season (skill) and which are mostly noise (luck), and how many minutes you need before trusting each one.
  - **Comparing two players properly:** same role, same context, an honest comparison pool, and a "why is player A better than B?" exercise where the learner must argue with numbers **and** pitch evidence.
  - **From numbers to a verdict:** combining data and video for each role, building a role-specific scoring model, and knowing what the data cannot see (e.g. off-ball defensive organisation, communication, leadership).
  - Every lesson uses **real PL players** as worked examples.
- **Track 18 — Football Python lab:** in-browser Python. Load StatsBomb data, build shot maps, pass networks and radars/pizzas, build an xG model, compute xT, and build pitch control from tracking data. Uses the learner's own big-5 data locally if they provide it.
- **Track 19 — Football AI and machine learning (NEW, full track; this is the "AI" in The Next Klopp):**
  - **Chapter 1, the ML toolkit for football:** classification, regression, clustering and similarity, taught just in time with football examples (e.g. clustering players into roles, predicting a shot's xG, projecting a player's next season).
  - **Chapter 2, models clubs actually use:** player projection and ageing curves, league-strength translation, player valuation models, injury-risk models (and their limits), similarity search, and team-strength / match-outcome models.
  - **Chapter 3, tracking data and deep learning:** pitch control, EPV, off-ball run detection, pressing detection, graph neural networks on tracking data, and sequence models for event data. Each one is explained visually first.
  - **Chapter 4, computer vision:** how broadcast tracking works (player and ball detection, homography to pitch coordinates), and what open-source tools exist (verify current repos). Includes a hands-on lab on a few frames, precomputed if the browser can't run it.
  - **Chapter 5, LLMs and AI agents in football:** using LLMs to draft scouting and opposition reports from data, natural-language player search, video search, AI agents for recruitment workflows, and the **risks**: hallucinated stats, bias, and over-trust.
  - **Chapter 6, evaluating models honestly:** validation, leakage, calibration, uncertainty, and "is this model actually useful to a coach?"
  - **Chapter 7, ethics and law:** player data rights, GDPR, consent for wearable data, and fairness in scouting models.
  - Connects to the learner's scouting-model project, which becomes a real portfolio piece.
- **Track 20 — The Head of Data Science: building and running a club data department (NEW, full track):**
  - **Chapter 1, the role:** what a head of data science / head of analytics does, who they report to, and how the role differs at a giant club, a mid-table club and a selling club.
  - **Chapter 2, data infrastructure:** choosing and buying data providers (event, tracking, physical, market), contracts and costs, building a data warehouse and pipelines, APIs, internal dashboards, and the build vs buy decision.
  - **Chapter 3, the team:** hiring data scientists, engineers and analysts, the team structure, and the research vs operations balance.
  - **Chapter 4, stakeholders and adoption:** working with the coach, the sporting director, recruitment and the medical team. Covers translating models into decisions, earning trust, presenting uncertainty, and the reasons good analytics gets ignored and how to fix that.
  - **Chapter 5, the research agenda:** choosing problems that matter, quick wins vs long projects, and measuring the department's impact.
  - **Chapter 6, case studies:** public accounts of PL and other club data departments (e.g. Liverpool's research team, Brentford, Brighton, and others; verify what is public).

### PART E — RECRUITMENT AND MONEY
- **Track 21 — Scouting I: the scout's eye (top priority, deep track):**
  - Talent ID principles and what scouts look for **by position and by age group**.
  - Watching one player for 90 minutes: on-ball, off-ball, decisions, body shape, scanning, reactions to mistakes, and communication.
  - Technical, tactical, physical and psychological/character assessment.
  - Live scouting vs video scouting.
  - Youth scouting and the relative age effect.
  - **Grading scales and scouting report writing** (connects to Track 14).
  - Building a scouting diary, scouting trips and match selection.
  - Ethics and professional conduct.
- **Track 22 — Scouting II: the recruitment system and the Head of Recruitment:**
  - Squad mapping, role profiles and the club's "player DNA".
  - Data-led shortlists, player similarity, league-strength adjustment and age curves.
  - The recruitment workflow from data filter → video → live → references and character → medical → negotiation.
  - Scouting networks and regional coverage, using real PL recruitment models (where Brighton, Brentford and others find value) as case studies.
  - Risk assessment, and the recruitment meeting (presenting and defending a target).
  - **Leading the department (head of recruitment / head of scouting):** building and managing a scout network, coverage planning by market, scout KPIs and report quality control, the scouting budget, scouting platforms (e.g. Wyscout, TransferRoom and similar; verify), recruitment meeting cadence, the window calendar, succession planning for every squad position, and working with agents and intermediaries.
  - Connects to the learner's scouting-model project.
- **Track 23 — Transfers, salaries and player valuation (deep track):**
  - **Chapter 1, the transfer market:** how a transfer actually happens, step by step (target → approach → bid → negotiation → medical → registration), windows, TMS, the actors involved (sporting director, CEO, agent, player, selling club), and how the market moves.
  - **Chapter 2, setting the number:** how to put a price on a player. Covers valuation inputs (age, contract years left, position, performance data, minutes, league strength, injury record, homegrown status), comparable-deal analysis, market-value models and their errors, the "asking price" vs "walk-away price" vs "expected fee", and why the same player has different values to different clubs.
  - **Chapter 3, buying:** building a bid, fee structures (upfront, instalments, add-ons, appearance and success bonuses, sell-on), loans with options or obligations, and avoiding overpaying.
  - **Chapter 4, selling players:** when to sell (age curve vs value curve), sell-or-keep decisions, mapping likely buyers, creating competition, negotiating as the seller, protecting future value with sell-on and buy-back clauses, **profit on sale vs book value** (why selling an academy player is pure profit), and selling-club business models.
  - **Chapter 5, salaries:** wage structures and wage bands, base pay, bonuses, signing-on and loyalty payments, image rights, escalators, contract length strategy, renewals and expiry risk, free agents, wage-to-revenue control, and where public wage data comes from (and how wrong it can be).
  - **Chapter 6, agents and negotiation:** FIFA Football Agent Regulations, agent fees, negotiation tactics, and handling renewals and transfer requests.
  - **Chapter 7, rules:** FIFA RSTP, loan rules, solidarity and training compensation, and work permits.
  - **Chapter 8, the money:** **amortisation**, impairment, the P&L impact of each deal, cash flow vs accounting, and the **PL Squad Cost Ratio** (85% rule) and UEFA's squad-cost rules, worked with real PL clubs' accounts.
  - **Chapter 9, loans management:** loan strategy for development and for value, choosing the right loan club, monitoring loan players, and the loan manager role.
  - **Chapter 10, case studies:** great sales, bad buys, smart free transfers, contract-expiry disasters, and record deals, all PL-first.

### PART F — CLUB LEADERSHIP
- **Track 24 — Academy and player development and the Academy Director (NEW, full track):**
  - EPPP categories and rules, and the academy's structure by age phase (foundation, youth development, professional development).
  - Long-term player development, the relative age effect and biological maturation, and talent ID at youth level.
  - Individual development plans, the coaching curriculum by age group, and education and welfare.
  - The pathway from academy to first team (loans, the B team / U21s, "bridge" players), and measuring academy success (first-team minutes, sale value).
  - The academy as a business: homegrown rules, sales, and profit on academy graduates.
  - Case studies: academies that produce players and academies that sell them.
- **Track 25 — The Sporting Director / Director of Football (expanded, full track):**
  - **Chapter 1, the job:** sporting director vs director of football vs technical director, the remit, the reporting lines, and how it differs across club types.
  - **Chapter 2, club football philosophy:** defining the playing identity, the player profile and the coaching profile that every department follows.
  - **Chapter 3, hiring and firing the head coach:** coach profiling with data and video, the shortlist, interviews, contract structure, the relationship, and when and how to make a change.
  - **Chapter 4, the football department:** the org chart (first team, academy, recruitment, analysis, data, medical, performance, player care), hiring heads of departments, and the department budgets.
  - **Chapter 5, the multi-year squad plan:** a 3-year squad map, succession for every position, the contract-renewal strategy, the sell/keep/loan cycle, and the window strategy.
  - **Chapter 6, the money side:** the football budget, wage-structure governance, SCR compliance, and transfer budget vs wage budget.
  - **Chapter 7, decision-making:** decision frameworks, cognitive biases (sunk cost, recency, star power), pre-mortems, and using data in decisions without hiding behind it.
  - **Chapter 8, stakeholders:** owners and the board, the coach, players, agents, fans and the media. Covers communicating difficult decisions and crisis management.
  - **Chapter 9, multi-club ownership:** how club groups share players, data and staff, and its rules.
  - **Chapter 10, case studies:** PL first (e.g. Brighton, Brentford, Liverpool's data-led era under Klopp and FSG, Manchester City's structure, Arsenal's rebuild, plus cautionary tales), then a few outside the PL (e.g. Midtjylland, Benfica, Red Bull).
- **Track 26 — The Club CEO / General Manager: the business of a football club (NEW, full track):**
  - Revenue streams (broadcasting, commercial, matchday, player trading) and the PL central distribution model.
  - Commercial and sponsorship deals, brand, **marketing and fan engagement**, digital and social media strategy, and international growth.
  - Matchday and stadium operations, ticketing and pricing.
  - Budgeting, cash flow, debt, ownership models and investment, and reading the full annual accounts.
  - Governance: the board, the Independent Football Regulator (check current status), the PL owners' and directors' test, and fan engagement rules.
  - Leading the whole club, from HR and culture to working with the sporting director, and the football vs business balance.
- **Track 27 — The Premier League system, plus "apply it at home":**
  - PL governance and Handbook rules, SCR/SSR finance, squad, homegrown and work-permit rules, EPPP, broadcasting and commercial money, ownership models, and the regulator. Includes **reading a real PL club's annual accounts**.
  - The track closes with a short module that applies all of this to the Saudi Pro League (SPL structure, PACE, foreign-player rules) and to career paths.
  - **Verify everything with current sources and date-stamp it.**

### PART G — CAPSTONE
- **Track 28 — Capstone: The Club Simulator (every seat in the building).** One simulated PL club over a full season, where the learner sits in **each role's chair** in turn:
  - **Sporting director:** set the philosophy, hire the coach, run the windows inside the SCR rules, and present to the board.
  - **Head coach:** build the game plan, run match day, make in-game decisions, give team talks, and face the press.
  - **Head of performance analysis:** produce the opposition dossier, run live analysis, and deliver the post-match review.
  - **Head of data science:** build a model that answers a real club question, and convince the coach to use it.
  - **Head of recruitment:** run the shortlist, write and defend the scouting reports, and plan for succession.
  - **Academy director:** plan the pathway, and decide on loans and promotions.
  - **CEO:** set the budget, sign a commercial deal, and handle a crisis.
  - Every decision links back to the lessons that taught it. Each seat ends with a **portfolio piece** (Section 7.1).

### 7.1 ROLE PATHWAYS (the job map; build this as a core feature)

The course must prepare the learner for **every senior football role**, not just one. Before the curriculum is locked, research **real job descriptions** for each role (public job ads from clubs and football job boards, interviews and talks by people in these roles). Use them to build `/research/ROLE_COMPETENCIES.md`: a competency matrix for each role, where every competency maps to the lessons, practice tasks and assessments that cover it.

**Roles (minimum):**
1. **Sporting Director / Director of Football**
2. **Head Coach / Manager**
3. **Head of Performance Analysis**
4. **Head of Data Science / Head of Analytics**
5. **Head of Recruitment / Head of Scouting**
6. **Academy Director**
7. **Club CEO / General Manager**
8. **Head of Performance / Sports Science** (overview level, so the learner can lead and work with this role)
9. Supporting roles covered in less depth: assistant coach, set-piece coach, loan manager, chief scout, first-team analyst, recruitment analyst, and data engineer.

**Every role pathway in the app contains:**
- A **role card**: purpose, responsibilities, who they report to and who reports to them, and the decisions they own.
- **A week in the life**: an animated timeline of a real-style week in season and in a transfer window.
- **The KPIs they are judged by**, and how people in that role fail.
- **Their outputs** (reports, plans, models, briefings), each with a template and a model answer.
- **Required tracks and chapters**, as a highlighted path through the concept map.
- A **role readiness meter** that shows mastery of that role's competencies.
- A **role exam**: a simulation scenario plus a written or spoken deliverable, graded with a rubric.
- A **portfolio piece** the learner can show employers (e.g. a public-data opposition report, a recruitment shortlist with reports, an xG/role model write-up, a 3-year squad plan).
- **Career entry points**: how people actually get into this role, the typical career path, the qualifications that matter, and how to build a network.

**Coverage rule:** a role pathway is "complete" only when every competency in its matrix has at least **one lesson, one practice task and one assessment**. Check this at every milestone (a good use of the Fable milestone review in Section 5.1).


---

## 8. LEARNING DESIGN (ADHD-friendly, visual-first)

**The Lesson Loop (every micro-lesson):**
1. **Hook (≤15 s):** a real moment from a match, or a question shown on a pitch.
2. **See it:** an animated or interactive visual shows the concept, with **text of 60 words or fewer** per screen.
3. **Touch it:** the learner manipulates something (drags players, moves the ball, scrubs a timeline, changes a parameter) and watches the effect.
4. **Predict → reveal:** the learner predicts an outcome first, then sees the answer.
5. **Do it:** a micro-task (spot the pressing trigger, build the shape, compute the metric, judge the deal).
6. **Lock it in:** 2–4 retrieval questions, which feed a **spaced-repetition** queue.
7. **Connect it:** a "where this shows up next" link on the concept map.

**Rules:**
- One idea per screen. Progressive disclosure. No walls of text.
- Every term is tappable, opening a visual glossary card.
- A **focus mode** hides everything except the current step.
- Show a time estimate per lesson, and break long lessons into resumable checkpoints.
- Gamify honestly: mastery rings, track badges, and an "eye improving" history. **No streaks that can be lost**, so count "days learned this month" instead. No guilt mechanics, no red overdue counters, and no piled-up review backlog after a break: cap the reviews shown and quietly reschedule the rest.
- **Low-energy mode:** one tap on the home screen gives a 3–5 minute session (one clip, one question, or a few review cards). Finishing it counts as a full day.
- **Welcome-back flow:** after any gap, show a short, warm recap of where the learner was and one easy first step. Never "You missed X days".
- **Enjoyment first in watching:** Watch Gym sessions start short and end before attention drops. Lengthen them only when the learner chooses to.
- **Mastery checks** at the end of each chapter, with an "explain it back" task (the learner draws or arranges the answer).
- **Weekly review** generated from weak spots.
- A **"I'm confused here"** button on every screen. It saves the location and a note to a local feedback file that the build agents read (Section 11).
- Accessibility: keyboard navigation, reduced-motion mode, colour-blind-safe palettes, captions.

---

## 9. DESIGN.md (the presentation catalogue): write it after research, before building

DESIGN.md is the **constitution** for how everything looks and behaves. Use the taste skill v2, frontend-design, web-design-guidelines, ui-ux-pro-max and dataviz skills to write it. It must contain:

### 9.1 Design principles and anti-slop rules
Explicit **do/don't lists**, with banned patterns.

### 9.2 Visual directions checkpoint
Produce **2–3 distinct visual directions**, each with a real rendered sample screen (one tactics lesson and one data lesson). Take screenshots at 3 widths. **The learner picks one** before the system is locked.

### 9.3 Foundations
- Colour system: dark and light themes, team A/B colours, ball, zones, and data scales, all **validated for colour-blind safety**.
- Typography: a distinctive display family, a highly readable body family, and a mono font for code and numbers.
- Spacing, grid, radius, elevation and iconography.
- A **motion language**: durations, easing, and what motion *means* (e.g. a player run vs a ball path vs a pressing arrow).

### 9.4 The Pitch Standard
One canonical pitch renderer (SVG/Canvas) with:
- standard dimensions and coordinate systems (with converters for StatsBomb, Opta, Wyscout and tracking coordinates),
- standard glyphs for players, ball, passes, carries, runs, pressure, zones and shapes,
- a **notation legend that appears everywhere**.

### 9.5 Interaction Component Catalogue
For each component, specify its purpose, the inputs and controls, the learning goal, its states, the data it needs, and an accessibility fallback. At minimum:
- **Tactics Board:** drag players, morph between formations, draw runs and passing lanes, save and load scenes.
- **Phase Animator:** a timeline scrubber that plays a sequence frame by frame, with annotation layers you can toggle.
- **Zone Explorer:** hover or tap zones (18-zone, 5-lane, half-spaces) and see the definition plus real-data stats for that zone.
- **Shape Comparator:** in-possession vs out-of-possession shape overlay, line heights, and distances between lines.
- **Pressing Trigger Trainer:** a short sequence pauses; the learner taps the trigger moment and the correct pressing player.
- **Event Inspector:** raw event JSON ↔ pitch view ↔ table, all linked.
- **Shot Map and xG Playground:** move the shot location, angle, body part and pressure, and watch the xG change. Includes a calibration explainer.
- **xT Grid Lab:** hover a cell to see its threat; drag a pass to see the xT added.
- **Pitch Control Live:** real tracking frames from open data; drag players to see the control surface change.
- **Pass Network Builder:** pick a real match and team, filter by time window, and read the structure.
- **Radar/Pizza Builder:** percentile explainer, comparison set selection, and a "why the comparison pool matters" demo.
- **Metric Noise Lab:** a sample-size slider that shows how unstable metrics are with few minutes played.
- **Role Signature Explorer:** a role's action heatmap and profile, with a "find similar players" view.
- **Role KPI Explorer:** pick a role and see its key stats, each with a percentile scale (good / elite / worrying), a pitch animation showing what the stat looks like in play, and a "why it matters for this role" card.
- **Stat Lie Detector:** a player looks great or terrible on one stat. The learner investigates (context, team style, minutes, comparison pool) and decides whether it's real or misleading.
- **Player vs Player Court:** two players in the same role, side by side. The learner builds the case with numbers **and** pitch evidence, and a rubric judges the argument.
- **Signal vs Noise Meter:** shows each stat's repeatability across seasons and the minutes needed before trusting it.
- **Squad Planner:** depth chart by position and role, age curves, a contract-expiry timeline and a succession plan.
- **Scouting Report Builder:** a template that combines data, video notes and character.
- **Transfer Deal Builder:** fee, instalments, add-ons, sell-on, wage, contract length and agent fee → **year-by-year amortisation and P&L chart** → "can we afford it?" with an SCR check.
- **Player Price Lab ("set the number"):** pick a player (real data). Adjust age, contract years left, form, league and buyer type, and watch the estimated value range move. Compare it with similar past deals, set the asking and walk-away prices, and see the model's uncertainty.
- **Sell-or-Keep Simulator:** a player's age curve vs value curve over time, the contract-expiry countdown, replacement cost, and profit on sale vs book value → a decision and its consequences.
- **Wage Structure Builder:** design a squad wage structure (bands, bonuses, escalators), drop in a new signing, and see the dressing-room wage hierarchy and the effect on the wage-to-revenue ratio and SCR.
- **Negotiation Simulator:** role-play buying or selling against an AI club or agent with hidden limits. After the round, see what you left on the table.
- **Regulation Navigator:** visual flowcharts for RSTP, loans, solidarity and training compensation, and the PL SCR/SSR and squad rules.
- **Session Designer:** a drill canvas with constraints (space, numbers, touches, scoring rules) linked to game-model principles.
- **Load Monitor:** a weekly load chart with periodization overlays, showing the debated metrics as debated.
- **Decision Simulator:** branching sporting-director scenarios with consequences.
- **Concept Map:** an interactive knowledge graph of the whole course showing mastery status.
- **Python Cell:** in-browser Python (Pyodide) with preloaded football data, using the same visual style.
- **Video Note Player:** plays the learner's local clips or YouTube embeds, with time-stamped tags and drawings. Never download copyrighted footage into the repo.
- **Watch Gym Player:** clip or sequence playback with a mission card (1–3 things to watch), pause-and-predict prompts, tap-on-pitch answers, a "where to look" coaching overlay you can toggle, and a block timer for longer watches.
- **Live Watch Notebook:** a quick note template for watching full matches (time-stamped tags by phase: build-up, press, transition, set piece, key player), which turns into a report draft afterwards.
- **Report Writer:** templates for tactical analysis, opposition, post-match and scouting reports, with sentence starters, a checklist, scaffolding that fades (from fill-in-the-blanks to a blank page), drag-in clips and stills, rubric self-scoring, and comparison with a model answer.
- **Speak-It Coach:** a local audio recorder with structure prompts (60-second summary, 3 key points, coach briefing), a timer, and a rubric for checking structure afterwards.
- **Player Scout Card:** a one-player-for-90-minutes tracker (on-ball, off-ball, scanning, decisions, character signals) with a grading scale that feeds the Scouting Report Builder.
- **Role Map and Readiness Meter:** every role in Section 7.1, its highlighted path through the concept map, its competency mastery, and its portfolio status.
- **Matchday Command Centre (head coach):** a live simulated match (built from real event/tracking sequences) with momentum, fatigue and live data feeds. The learner makes shape changes and substitutions and sees the consequences, with an "expert choice" comparison afterwards.
- **Microcycle Planner:** plan a week (or a two-game week) of training loads, tactical sessions, analysis meetings and recovery.
- **Team Talk and Press Conference Simulator:** prompts based on a match scenario. The learner speaks or writes, an AI plays the journalist or the player, and a rubric gives feedback.
- **Analysis Department Workflow Board:** the pre/in/post-match deliverable timeline with deadlines and owners.
- **ML Model Lab:** train simple football models in the browser (clustering roles, an xG model, player projection) with visual explanations of features, validation and errors.
- **Computer Vision Demo:** detection boxes and the pitch homography on sample frames, from broadcast pixels to pitch coordinates.
- **AI Scout Assistant Lab:** an LLM drafts a report from data; the learner fact-checks it against the data and catches the hallucinations.
- **Data Department Builder:** pick providers, tools, hires and a budget, then see what questions the department can and can't answer.
- **Org Chart and Budget Builder (sporting director):** design the football department, staff costs, and reporting lines.
- **Coach Hiring Lab:** profile coach candidates with data (team style, results vs expected, player development) and run a structured interview.
- **Academy Pathway Planner:** age groups, player progression, loans and first-team minutes targets.
- **Club P&L Dashboard (CEO):** revenue streams, costs and SCR, with scenario sliders (relegation, a Europe run, a new sponsor).
- **Quiz / Flashcards / Spaced-Repetition Review:** visual question types (tap on pitch, arrange the shape, order the sequence), not only multiple choice.

### 9.6 Lesson templates
The page layouts for each lesson type: concept, simulation, data lab, case study (scrollytelling), regulation, review and capstone.

### 9.7 Data-viz standards
Chart choice rules, axis and label rules, annotation style, and uncertainty display.

### 9.8 Quality bar
How every screen is reviewed: screenshots at 3 widths, the taste-skill rubric, an accessibility check and a performance budget.

---

## 10. TECHNICAL ARCHITECTURE (propose it, justify it, then lock it in a decision record)

Suggested stack. You may improve it, but justify any change in `/docs/decisions/`:
- **App:** TypeScript, React, Next.js (or Vite), and Tailwind, with tokens generated from DESIGN.md.
- **Visuals:** SVG/Canvas with D3 or visx for pitch and data visuals, a motion library for animation, and WebGL only where needed (e.g. pitch-control surfaces).
- **Content as data:** each lesson is an **MDX file plus a JSON spec** (steps, components, data references, quiz items, sources, prerequisites), so lessons can be generated, validated and shipped one at a time.
- **In-browser data:** DuckDB-WASM and/or preprocessed Parquet/JSON, plus **Pyodide** for the Python lab.
- **Data pipeline:** a separate `/pipeline` Python package that downloads open data, standardises it with kloppy, computes derived datasets, and writes small, versioned outputs. **Raw data is git-ignored.** Write a `make data` (or equivalent) script that works on Windows.
- **Local state:** progress, spaced-repetition queue, notes and feedback stored locally (IndexedDB or local SQLite), with export and import as JSON.
- **Testing:** unit tests for metric calculations (checked against known values from sources), Playwright end-to-end tests for every shipped lesson, and visual screenshot tests.
- **Run:** one command on Windows (e.g. `npm run dev`), documented in the README.
- **Deploy:** Vercel with **Deployment Protection on**, preview deployments per PR, and no licensed raw data in the build.

**Repo layout (suggested):**
```
/app            web app
/content        tracks/chapters/lessons (MDX + JSON)
/components     interaction catalogue
/pipeline       Python data pipeline
/research       Phase 0 outputs + SOURCE_REGISTRY.json
/docs           DESIGN.md, decisions/, SETUP.md, CONTRIBUTING.md
/tests          unit, e2e, visual
/feedback       learner confusion notes (git-ignored or private)
```

---

## 11. ROLLING RELEASE: the learner studies while you build

- **Milestone 0:** setup, research sprint, concept map, design-direction checkpoint, DESIGN.md, design system, Pitch Standard, app shell, progress system, and **one fully polished sample lesson** (the "golden lesson" that sets the quality bar).
- **Milestone 1:** Track 0, Track 1 and **Watch Gym Level 1** shipped and playable. **The learner starts studying here.**
- **Early priority:** Watch Gym (Track 4), Write and Speak (Track 14), Scouting I (Track 21) and the Role Map (Section 7.1) start early and grow in parallel with the tactical tracks. Don't leave them until the end.
- **Then:** each milestone ships one chapter or track. Build order follows the concept-map prerequisites, with at least 2 chapters kept ahead of the learner. Components are built just before the first lesson that needs them, then reused.
- **Feedback loop:** before planning each new phase, read `/feedback` and the learner's progress and mastery data. Fix confusion points first. Adjust upcoming lessons to the learner's weak spots.
- **Never break shipped chapters.** E2E tests must pass before merging. Shipped content changes only through a reviewed PR.
- **Changelog in the app:** a "What's new" page so the learner sees new chapters arrive.

---

## 12. QUALITY GATES (every lesson must pass all of them before shipping)

1. **Facts:** every claim maps to sources in the registry. A **separate verifier sub-agent** checks the lesson. It must be a different agent from the writer, and it must not have seen the writing process. Use Opus for metrics, regulations and finance.
2. **Pedagogy:** follows the Lesson Loop, keeps text to 60 words or fewer per screen, has at least one meaningful interaction, and has retrieval questions.
3. **Design:** passes the taste-skill screenshot review at 3 widths, follows DESIGN.md, and has no slop patterns.
4. **Data:** numbers in the lesson are reproducible from the pipeline, and metric code has unit tests.
5. **Accessibility and performance:** keyboard, reduced motion, contrast, and the load budget.
6. **Regulation accuracy:** any PL, UEFA, FIFA or SPL rule or fact is date-stamped and comes from an official or recent reliable source.
7. **Licensing:** sources are credited, there are no long quotes, and no licensed data is exposed.
8. **Role coverage:** each lesson is tagged with the roles and competencies it serves, and the role coverage rule (Section 7.1) is checked at every milestone.

---

## 13. GIT AND GITHUB WORKFLOW

- `gh repo create the-next-klopp --private --source . --push`
- Use a branch per phase or plan, open a PR, run tests in CI (GitHub Actions), then merge. Use conventional commits.
- Protect `main`. No secrets in the repo; use `.env.example`. Large or licensed data stays out of git.
- Tag a release for each shipped milestone (e.g. `v0.1-track1`).

---

## 14. COMMUNICATING WITH THE LEARNER

- Ask questions **only at checkpoints**: research approval, design-direction choice, data paths, Vercel login, and any decision that can't be undone. Otherwise make a reasonable choice, log it in `/docs/decisions/`, and continue.
- After each milestone, send a **short visual digest**: what shipped, what's next, what needs their input, and their progress stats.
- Keep messages short: bullets, visuals, no essays (ADHD-friendly).

---

## 15. FIRST ACTIONS, IN ORDER

1. Read this whole brief. Read the GSD Core docs (COMMANDS, CONFIGURATION, CLI-TOOLS).
2. Install and verify GSD Core, agentmemory, K-Dense Scientific Agent Skills, and the design skills. Write `SETUP.md`.
3. Configure model routing (Section 5).
4. Create the private GitHub repo and push the skeleton.
5. Store the learner profile (Section 1) and these rules in agentmemory.
6. Ask the learner: which PFSA courses and levels did they complete, where is the local football data?
7. Launch the **Phase 0 research sprint** with parallel sub-agents (Section 6).
8. Synthesis → concept map → **role competency matrix** → curriculum → **learner checkpoint**.
9. Design directions → **learner picks** → DESIGN.md → design system → Pitch Standard → golden lesson.
10. Ship Milestone 1 (Tracks 0–1 + Watch Gym Level 1). The learner starts studying. Continue the rolling release.

**Begin with step 1. Do not write any lesson content until step 8 is approved.**


---

## 16. KICKOFF ANSWERS (collected 2026-11-27, before `/gsd-new-project`)

- **PFSA:** the learner finished only the **Introduction and Level 1**, and a long time ago. Treat it as rusty. This corrects Section 1: do not assume Level 2 Talent ID, Level 3, or the opposition/data/tactical courses were completed. The placement diagnostic must test basics, not skip them. At the placement step, ask once whether any specialist course was started.
- **Local football data paths:** not given yet. Ask at the data-pipeline checkpoint (before Track 15/18 work). Never commit this data.
- **Project folder:** `E:\To become new klop` on Windows. The original brief file sits next to this one, unchanged.
- **Toolchain note:** an earlier claude.ai session could not install GSD Core (its sandbox had no network). Install everything in Claude Code on Windows. `docs/CONFIGURATION.md` of GSD Core was not read in that session, so read it before configuring model routing.
- **How GSD is run:** `/gsd-new-project --auto @NEW_PROJECT_INPUT.md`. Skip GSD's interactive questioning; ask the learner only at the checkpoints in Section 14.
