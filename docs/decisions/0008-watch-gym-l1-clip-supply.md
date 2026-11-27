# 0008. Watch Gym Level 1 clip supply: open-data reconstructions first, local files second, YouTube link-out only

Date: 2026-11-28

## Status

Accepted

The learner settled the route in Phase 2 CONTEXT ("Watch Gym L1 clip-supply decision" and "Post-research decisions"). This record adds the licence evidence and the numbers from the coverage matrix.

## Context

What Watch Gym Level 1 needs:
- A short clip, far under six minutes, with the learner choosing to lengthen [src-acm-guo-mooc-video-engagement#segment-under-6min].
- One question per clip, asked before it plays [src-jarmac-pan-pretesting-video#pretest-reduced-mw].
- An answer given on a pitch panel, for example a tap where the space is [src-mdpi-pct-team-sports-meta].
- A wide view that keeps off-ball players in shot for shape questions [src-arxiv-crang-broadcast-tracking#tactical-feed-20-outfield].

What the open data holds for the Premier League (`research/pl-data-sources/coverage-matrix.json`, as of 2026-11-27):
- StatsBomb: 418 PL event matches (all 380 of 2015/16 plus 38 Arsenal matches of 2003/04), with shot freeze frames but 0 matches with 360 data [src-statsbomb-open-data].
- Wyscout: 380 PL event matches for 2017/18, events only, under CC BY 4.0 [src-wyscout-public-dataset#figshare-article-license-field].
- PL tracking: only Last Row, 13 Liverpool PL goals out of 19, with an informal licence and self-described as too inaccurate for research [src-fot-last-row#readme-credit-request][src-fot-last-row#readme-accuracy-caveat].
- Real tracking exists only for non-PL leagues: DFL/Sportec, 7 Bundesliga and 2. Bundesliga matches under CC BY 4.0 [src-dfl-idsse-open-data#figshare-article-license-field]; SkillCorner, 20 A-League matches under an MIT file that names software, not data [src-skillcorner-opendata#readme-credit-request].

Licence evidence:
- StatsBomb agreement 1.2.1: the data may not be provided to any external or third party [src-statsbomb-open-data#agreement-1-2-1-no-third-party].
- StatsBomb agreement 1.2.2: no commercial use of the data or of analysis derived from it [src-statsbomb-open-data#agreement-1-2-2-no-commercial].
- StatsBomb agreement 1.4: published analysis must credit StatsBomb with its logo [src-statsbomb-open-data#agreement-1-4-logo-credit].
- CC BY 4.0 allows sharing and adapting for any purpose, on condition of credit and a licence link [src-creativecommons-by-4-0#cc-by-share-adapt][src-creativecommons-by-4-0#cc-by-attribution].
- YouTube Terms: no downloading of content and no automated access, except as the Service allows [src-youtube-terms#tos-no-download][src-youtube-terms#tos-no-automated-access]. Showing videos through the embeddable player is allowed [src-youtube-terms#tos-embeddable-player].
- YouTube API Services Required Minimum Functionality: no overlays, frames or other visual elements in front of any part of an embedded player [src-youtube-api-rmf#rmf-no-overlays].

## Decision

- Primary supply: animated reconstructions from open event, 360 and tracking data, drawn on the canonical pitch (Phase 3 Pitch Standard).
- Secondary supply: the learner's own local clip files, opened from disk. They are never committed and never uploaded.
- YouTube: link-out only. No embed with an overlay, no download, no automated access.
- Every clip spec declares a reconstruction fallback. A clip that has no reconstruction cannot be authored.
- StatsBomb-derived artifacts and Last Row clips are generated locally by the pipeline for the learner's local study build only. They carry the StatsBomb attribution and logo where StatsBomb data is used (agreement 1.4) and a source credit for Last Row. They never enter the Vercel bundle.
- Only CC BY sources may ship in the Vercel bundle: Wyscout PL 2017/18 events and DFL/Sportec data, each with attribution and a licence link.
- SkillCorner and Metrica stay local with credit until their data licence is settled [src-metrica-sample-data#readme-legal-stuff].
- Every clip states its dataset and league on screen. A clip built from non-PL data never uses PL wording.

Reversibility: costly - the Watch Gym data model, the Phase 3 pipeline licence gate and Phase 8 all depend on this route.

## Consequences

- Good: every Watch Gym Level 1 clip can be shown without footage rights.
- Bad: PL reconstructions of off-ball movement are thin, so many shape clips use labelled non-PL tracking.

## Alternatives

- YouTube embed with question overlays: rejected. Overlays in front of the player are barred [src-youtube-api-rmf#rmf-no-overlays].
- Downloading broadcast clips: rejected. Downloading is barred [src-youtube-terms#tos-no-download].
