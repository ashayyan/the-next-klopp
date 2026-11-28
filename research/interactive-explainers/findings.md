# Interactive explainers: inspiration audit

Technique notes in our own words. Nothing here is copied; every explainer is read-only inspiration.

## Key concepts

### Football explainers

- Karun Singh's xT article opens with one concrete Arsenal goal and asks the reader to split the credit with a slider before it shows the model's answer, which is a predict-then-reveal move. [src-karun-expected-threat]
- The same article builds xT in small steps: the weakness of assists and chain metrics, then a value for each pitch zone, then a simple move-or-shoot model, then iteration. [src-karun-expected-threat]
- A slider steps through the iterations of the value surface, and zones can be clicked or hovered to inspect numbers, so the learner manipulates the model rather than reading its result. [src-karun-expected-threat]
- Per-team surfaces and an opponent danger map end the piece by applying the metric to Premier League questions the reader can switch between. [src-karun-expected-threat]
- The Soccermatics pitch control lesson goes intuition, then a real Messi passing moment, then passing triangles, then a Voronoi picture, then a pointer to the code. [src-soccermatics-pitch-control]
- That lesson is mostly static and has no exercises, which marks the gap our lessons should fill with touch and predict steps. [src-soccermatics-pitch-control]
- The Fútbolismo career essay pairs a guided tour of player categories with a free explorer, so a beginner follows a path and an expert searches. [src-iib-futbolismo-legends]
- The FiveThirtyEight lookalike graphic summarises each player as a fingerprint and lets readers search for similar players, which turns a similarity metric into a question the reader asks. [src-iib-538-doppelgangers]
- American Soccer Analysis pairs interactive tables and a viz hub with written explainers for each metric, so a number can be looked up and then explained. [src-asa-home]
- The StatsBomb blog archive keeps a dedicated category for metric explainers, which shows a metric needs its own short written page next to the analysis. [src-statsbomb-blog-archive]
- A chart vendor's football guide recommends a draw-the-line chart where readers guess a value before the real answer appears, plus annotations that give context. [src-flourish-pl-visualisation]

### General interactive explainers

- Bret Victor defines an explorable explanation as an argument whose claims are backed by models the reader can inspect and change. [src-victor-explorable-explanations]
- He names three families: reactive documents with adjustable assumptions, explorable examples for building intuition, and contextual information in place. [src-victor-explorable-explanations]
- Nicky Case's polygons piece lets the learner play first, then names the lesson, then adds a bias slider and an open sandbox at the end. [src-ncase-polygons]
- Nicky Case's spaced repetition comic teaches by using the method: recall prompts return later, and the reader guesses which spacing pattern works best before testing it. [src-ncase-remember]
- The same comic gives a forgetting-curve simulator and timing sliders, which makes an abstract curve something to manipulate. [src-ncase-remember]
- Nicky Case states that the work on the home page is released under a public domain waiver. [src-ncase-home]
- Bartosz Ciechanowski's Moon article starts with a simple two-body sandbox and adds one layer at a time, reusing earlier controls. [src-ciechanowski-moon]
- It shows the same scene from several viewpoints, which helps the reader link a diagram to what they would see. [src-ciechanowski-moon]
- Red Blob Games teaches A* by growing one idea into the next, with a step-through control, draggable start and goal markers and a side-by-side comparison of algorithms. [src-redblobgames-astar]
- Each concept on that page is paired with a small piece of pseudocode, so the visual and the logic reinforce each other. [src-redblobgames-astar]
- Setosa's Markov chain explainer starts from a familiar example, then a two-state diagram, then a transition matrix the reader can edit. [src-setosa-markov-chains]
- Its editable matrix turns red when a row is invalid, so the rule is learned from feedback, and presets and a random button lower the cost of exploring. [src-setosa-markov-chains]
- The Markov idea matters here because xT is built on a Markov model of possession. [src-setosa-markov-chains][src-karun-expected-threat]
- Seeing Theory orders statistics from basic probability up through regression, so each interactive chapter has prerequisites inside the site. [src-seeing-theory]
- Distill argued for reactive diagrams and playgrounds as the web's advantage over a static document; the journal is now on hiatus. [src-distill-about]
- The Setosa index shows a catalogue of single-concept explainers, each small enough to finish in one sitting. [src-setosa-explained-visually]
- The explorables hub shows a community norm of open, playful, make-it-yourself learning. [src-explorables-hub]

## Must teach

### Techniques the course must use

- Predict then reveal (Lesson Loop step 4): ask for a guess or a slider setting before showing the answer, as the xT credit slider does. [src-karun-expected-threat][src-ncase-remember]
- Direct manipulation (Touch it): the learner drags, scrubs or edits a parameter and sees the effect update at once. [src-redblobgames-astar][src-setosa-markov-chains]
- Play first, name it second (See it, Touch it): let the learner act in a small world, then state the lesson in a sentence. [src-ncase-polygons]
- Progressive disclosure (rule: one idea per screen): add one layer at a time and reuse earlier controls. [src-ciechanowski-moon][src-redblobgames-astar]
- Step-through control (See it): a manual stepper beats an auto-playing animation for process lessons. [src-redblobgames-astar]
- Editable model with validation (Do it): rejecting a bad input with a visible cue teaches the rule. [src-setosa-markov-chains]
- Multiple viewpoints (See it): show the same situation from the pitch plan and from the player's view. [src-ciechanowski-moon]
- Guided path plus free explorer (Connect it): a tour for beginners and a search for the curious. [src-iib-futbolismo-legends]
- Retrieval built into the lesson (Lock it in): return to earlier ideas with recall prompts, as the spaced repetition comic does. [src-ncase-remember]
- Worked example before the formula: one real match moment, then the model, then the generalisation. [src-karun-expected-threat][src-soccermatics-pitch-control]
- Open sandbox at the end of a chapter for free play after the guided steps. [src-ncase-polygons]
- Annotations that give context on the chart itself rather than in a distant paragraph. [src-flourish-pl-visualisation]

### Accessibility rules (apply to every lesson)

- Colour must not be the only cue: pair every team or role colour with a shape, label or position. [src-w3c-wcag22#use-of-colour]
- Body text needs a contrast ratio of at least 4.5 to 1 and large text at least 3 to 1. [src-w3c-wcag22#contrast-minimum]
- Every interactive part needs a keyboard path, and motion needs a reduced-motion switch. [src-w3c-wcag22]
- Auto-playing movement needs a pause control. [src-w3c-wcag22]

### Colour-blind-safe palette (Okabe-Ito)

- The palette was proposed by Okabe and Ito as a set of colours that colour-blind and other viewers can tell apart. [src-okabe-ito-cud]
- Their design choices include vermilion instead of pure red and no colours between yellow and green. [src-okabe-ito-cud#vermilion-for-red][src-okabe-ito-cud#avoid-yellow-green]
- Orange is E69F00, sky blue is 56B4E9, bluish green is 009E73 and yellow is F0E442 (each as a hex colour code). [src-okabe-ito-cud][src-see-okabeito-colors#hex-seven]
- Blue is 0072B2, vermilion is D55E00 and reddish purple is CC79A7. [src-okabe-ito-cud][src-see-okabeito-colors#hex-seven]
- Black is 000000, which makes the eighth value. [src-see-okabeito-colors#hex-black]
- Okabe and Ito advise alternating warm and cool colours, and adding a brightness or saturation gap when two warm or two cool colours sit together. [src-okabe-ito-cud]
- Thin lines and small marks in sky blue or yellow are hard to read, so use darker blue or orange for them. [src-okabe-ito-cud]

## Misconceptions

- "More animation teaches more." Several of the strongest pieces rely on a manual stepper or slider the reader controls, not on playing motion. [src-redblobgames-astar][src-karun-expected-threat]
- "Interactive means gamified." The reviewed explorables use interaction to reveal a mechanism, such as a bias slider or an edit-the-matrix playground, not points or badges. [src-ncase-polygons][src-setosa-markov-chains]
- "A chart template is a lesson." Vendor chart guides show attractive formats but do not teach a concept in sequence. [src-flourish-pl-visualisation]
- "A static lesson with a video is enough." The Soccermatics pitch control page explains well but offers nothing to touch or answer. [src-soccermatics-pitch-control]
- "Red versus green is a fine team palette." Colour-blind viewers confuse such pairs, which is why the CUD palette uses vermilion and bluish green with different brightness. [src-okabe-ito-cud]

## Contested points

Contested: guided, step-by-step stories versus free exploration. Ciechanowski and Red Blob Games build one layer at a time so the reader meets ideas in order, while Victor argues readers should be able to change assumptions and test claims themselves, which leans toward open exploration. [src-ciechanowski-moon][src-victor-explorable-explanations]

Contested: play first versus explain first. Nicky Case's polygons piece lets the learner act before the lesson is named, while the Soccermatics lesson gives intuition and a worked case before any model. [src-ncase-polygons][src-soccermatics-pitch-control]

## Open questions

- Which guided-versus-free balance suits a learner with ADHD? Hand the question to the learning-science domain.
- Are the licences of the Ciechanowski and Red Blob Games footers permissive for any reuse? Assume no and keep notes only.
- Does the fetch tool miss interactive controls that load by script? Treat each audited page as read through text only.
- Which Premier League moment is the best hook for an xT slider, and which open data supports it?
