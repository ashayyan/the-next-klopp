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
- The project takes the strict reading of StatsBomb clause 1.2.1: derived clip extracts and small aggregates count as the data, so none of them ship [src-statsbomb-open-data#agreement-1-2-1-no-third-party].

### Deploy deny-manifest

The Phase 3/5 licence and bundle gates copy these patterns into the deny-manifest. The bundle gate must fail when any file in `dist/` matches one of them.
- `public/data/statsbomb/**` and `**/*statsbomb*`: StatsBomb-derived artifacts.
- `public/data/last-row/**` and `**/*last-row*`: Last Row clips.
- `public/data/metrica/**` and `public/data/skillcorner/**`: sources with no settled data licence.
- Only paths under `public/data/wyscout/**` and `public/data/dfl/**` may hold shipped data, each with its data credit.

Reversibility: costly - the Watch Gym data model, the Phase 3 pipeline licence gate and Phase 8 all depend on this route.

## Consequences

- Good: every Watch Gym Level 1 clip can be shown without footage rights or a footage download.
- Good: the deployed bundle carries only CC BY data, so the deploy needs no permission beyond attribution.
- Bad: PL reconstructions of off-ball movement are thin, so many shape clips use labelled non-PL tracking.
- Bad: the deployed build shows fewer PL clips than the local study build, because StatsBomb PL clips stay local.
- Phase 3 must build: pipeline recipes that write the data credit (provider, licence id, licence link, and the StatsBomb logo flag) into every artifact manifest, and the Scene/Frame format that holds a reconstruction.
- Phase 3/5 must build: the bundle gate that reads the deny-manifest patterns above and fails the build on a match in `dist/`.
- Phase 4/5 must build: a reusable data-credit element with a logo slot, shown on every clip and chart that uses open data.
- Phase 8 must build: clip specs with a required `fallback` field naming the reconstruction. A clip whose local file is missing plays its reconstruction fallback instead of an error.

### PL gaps

02-20 carries each gap into GAPS.md.
- No PL 360 data: StatsBomb has 0 PL matches with 360 frames, only shot freeze frames [src-statsbomb-open-data].
- PL tracking and off-ball movement only from Last Row: 13 Liverpool goals, informal licence, self-described as too inaccurate for research [src-fot-last-row#readme-accuracy-caveat]. Continuous off-ball reconstructions for PL topics use labelled non-PL tracking (DFL Bundesliga).
- No PL physical data from any open provider in the matrix [src-skillcorner-opendata].
- StatsBomb redistribution limits: StatsBomb PL clips cannot ship, so the deployed PL supply is Wyscout 2017/18 events only [src-statsbomb-open-data#agreement-1-2-1-no-third-party].
- The reusable data-credit element with a logo slot does not exist yet (Phase 4/5).

## Alternatives

- YouTube embed with question overlays: rejected. Overlays, frames or visual elements in front of the embedded player are barred [src-youtube-api-rmf#rmf-no-overlays].
- Downloading broadcast clips for a local overlay tool: rejected. Downloading content is barred, and embedding does not allow it [src-youtube-terms#tos-no-download][src-youtube-terms#tos-embeddable-player].
- Shipping StatsBomb-derived data publicly, even a minimal set of clip extracts with logo credit: rejected. The agreement bars providing the data to any third party and commercial use of derived analysis [src-statsbomb-open-data#agreement-1-2-1-no-third-party][src-statsbomb-open-data#agreement-1-2-2-no-commercial].
- Waiting for PFF FC form access to broadcast tracking: rejected. Access is a request form with no stated terms, and the 64 matches hold 0 PL matches [src-pff-fc-wc2022].
- YouTube embed beside a separate pitch panel: rejected for now. An adjacent panel is not an overlay, but CONTEXT locks YouTube to link-out and the Terms bar automated access [src-youtube-terms#tos-no-automated-access].
