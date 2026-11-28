## Key concepts

### Premier League coverage, read from coverage-matrix.json
The generated file coverage-matrix.json (plan 02-02, as of 2026-11-27) is the count source for this section [src-statsbomb-open-data][src-wyscout-public-dataset].
StatsBomb open data holds 418 Premier League event matches: all 380 of 2015/16 plus 38 Arsenal matches of 2003/04 [src-statsbomb-open-data].
The same matrix records 0 Premier League matches with StatsBomb 360 data, so no open PL freeze-frame tracking exists there [src-statsbomb-open-data].
Wyscout holds 380 England first-division matches for 2017/18, events only, with 0-100 pitch coordinates [src-wyscout-public-dataset].
DFL/Sportec covers only Bundesliga and 2. Bundesliga matches, so its Premier League count is 0 [src-dfl-idsse-open-data].
SkillCorner broadcast tracking is A-League only, so its Premier League count is 0 [src-skillcorner-opendata].
Metrica has three anonymised games that name no teams, so no identifiable Premier League match exists there [src-metrica-sample-data].
Last Row is the only open Premier League tracking: 13 Liverpool Premier League goals, tracking only, self-described as too inaccurate for research [src-fot-last-row#readme-accuracy-caveat].
PFF FC World Cup 2022 has 0 Premier League matches and is request-only [src-pff-fc-wc2022].
No open provider in the matrix offers Premier League physical data [src-skillcorner-opendata].

### Provider licences at a glance
StatsBomb data is under a bespoke user agreement, not an open licence [src-statsbomb-open-data].
Wyscout events and the DFL dataset carry CC BY 4.0 on their figshare records [src-wyscout-public-dataset#figshare-article-license-field][src-dfl-idsse-open-data#figshare-article-license-field].
CC BY allows copying and adapting for any purpose, even commercially, if credit is given [src-creativecommons-by-4-0#cc-by-share-adapt][src-creativecommons-by-4-0#cc-by-attribution].
SkillCorner ships an MIT licence file for its repository and separately asks users to credit SkillCorner [src-skillcorner-opendata#readme-credit-request].
Metrica states no licence, only a request to use the data responsibly and acknowledge the source [src-metrica-sample-data#readme-legal-stuff].
Last Row has no licence file and an informal invitation to use the data with credit [src-fot-last-row#readme-credit-request].
PFF FC publishes no terms on the pages read and gates access behind a request form [src-pff-fc-wc2022].

### Premier League stats sites
FBref advanced (Opta) statistics were removed on 2026-01-20, so they are recorded as a removed source and never cited as live free xG [src-fbref-advanced-stats][src-awfulannouncing-fbref-removal].
The official Premier League site terms bar commercial use, redistribution, database building and deep-linking without written approval [src-premierleague-stats-terms#terms-no-reuse-no-database].
Transfermarkt robots file points to a licence.xml that prohibits all AI usage, and its terms page was blocked to tools [src-transfermarkt-site#license-xml-prohibits-ai-all].
transfermarkt-datasets is a CC0 repository, but updates are paused and the data stops in July 2026 [src-transfermarkt-datasets#readme-updates-paused].
Capology robots file allows search, forbids AI training and limits AI use to reference [src-capology#robots-content-signal].
Understat showed only a returning-soon notice on 2026-11-27 and has no terms we could find [src-understat].
CIES Football Observatory offers report PDFs but states no reuse terms on the page read [src-cies-football-observatory].

### YouTube
YouTube terms bar downloading content and automated access except as the Service allows [src-youtube-terms#tos-no-download][src-youtube-terms#tos-no-automated-access].
The same terms allow showing videos through the embeddable player [src-youtube-terms#tos-embeddable-player].
The API policy bars overlays or frames in front of any part of an embedded player [src-youtube-api-rmf#rmf-no-overlays].

## Must teach

The StatsBomb agreement forbids providing the data to any external or third party, so the app cannot ship StatsBomb files or derived data to a deployed site [src-statsbomb-open-data#agreement-1-2-1-no-third-party].
The agreement also bars commercially exploiting the data or analysis derived from it, which keeps StatsBomb work in the local study build [src-statsbomb-open-data#agreement-1-2-2-no-commercial].
Any published analysis built on StatsBomb data must credit StatsBomb with its logo [src-statsbomb-open-data#agreement-1-4-logo-credit].
Only CC BY sources may ship in the deployed bundle: Wyscout 2017/18 Premier League events and DFL/Sportec data, each with attribution [src-wyscout-public-dataset][src-dfl-idsse-open-data][src-creativecommons-by-4-0#cc-by-attribution].
Last Row and Metrica stay local with credit, because their licence is unknown or informal [src-fot-last-row#readme-credit-request][src-metrica-sample-data#readme-legal-stuff].
SkillCorner stays local with credit until the MIT-versus-data question is settled [src-skillcorner-opendata#readme-credit-request].
Video work is link-out and embed only: the app never downloads YouTube footage and never draws overlays on the player [src-youtube-terms#tos-no-download][src-youtube-api-rmf#rmf-no-overlays].
FBref, Transfermarkt, Capology, Understat and Premier League pages are read by hand and never scraped [src-fbref-advanced-stats][src-transfermarkt-site#license-xml-prohibits-ai-all][src-premierleague-stats-terms#terms-no-reuse-no-database].

### Shipping implications per provider
StatsBomb-derived artifacts go on the deploy deny-manifest and stay local with StatsBomb credit and logo [src-statsbomb-open-data#agreement-1-2-1-no-third-party].
Wyscout and DFL artifacts may enter the deployed bundle with a data-credit element naming the provider and linking the licence [src-creativecommons-by-4-0#cc-by-attribution].
transfermarkt-datasets stays local only, because the CC0 repository licence does not clear the Transfermarkt terms [src-transfermarkt-datasets][src-transfermarkt-site].
Wage and valuation numbers in lessons are typed in by hand with a link, never pulled from Capology or Transfermarkt [src-capology][src-transfermarkt-site].

## Misconceptions

Public on GitHub does not mean free to redistribute: the StatsBomb repository is public yet its agreement bars providing the data to third parties [src-statsbomb-open-data#agreement-1-2-1-no-third-party].
An MIT file in a data repository does not clearly cover the data, because MIT names software and documentation files [src-skillcorner-opendata].
A CC0 dataset built from a website does not erase the website terms [src-transfermarkt-datasets][src-transfermarkt-site].
FBref is not a live source of free advanced stats: the Opta advanced data was removed in January 2026 [src-awfulannouncing-fbref-removal].
Embedding a YouTube video does not allow annotating it on top: overlays in front of the player are barred [src-youtube-api-rmf#rmf-no-overlays].
Being allowed to embed does not allow downloading a clip for a local overlay tool [src-youtube-terms#tos-embeddable-player][src-youtube-terms#tos-no-download].

## Contested points

Contested: whether a few derived clip extracts or small aggregates count as "the data" under the StatsBomb no-third-party clause. One reading says only raw files are covered [src-statsbomb-open-data#agreement-1-2-1-no-third-party]. The other says any reproduction of the data in any form is barred, and clause 1.2.2 also reaches analysis derived from it [src-statsbomb-open-data#agreement-1-2-2-no-commercial]. Unlike CC BY material, which may be shared in any format [src-creativecommons-by-4-0#cc-by-share-adapt], nothing in the agreement grants a sharing right. The project takes the strict reading and keeps all derived artifacts local.

Contested: whether the SkillCorner MIT licence covers its open data. The licence text grants broad rights over the software and its documentation files [src-skillcorner-opendata]. The CC BY deed, by contrast, plainly covers any material [src-creativecommons-by-4-0#cc-by-share-adapt]. The README separately asks for credit when using the data, which suggests the data is offered on goodwill terms [src-skillcorner-opendata#readme-credit-request]. The project treats the data as conditional and local.

Contested: whether a CC0 repository can republish Transfermarkt-derived data. The maintainer licenses the repository CC0 [src-transfermarkt-datasets#readme-updates-paused]. The Transfermarkt licence file prohibits AI usage of the site [src-transfermarkt-site#license-xml-prohibits-ai-all]. The project does not ship or train on this data.

## Open questions

Does the Transfermarkt terms page allow hand-copied valuations in teaching material [src-transfermarkt-site]?
Does the Capology terms page allow hand-quoted wage figures with credit [src-capology]?
Will Understat return, and under what terms [src-understat]?
Does CIES permit quoting its report figures with credit [src-cies-football-observatory]?
Does PFF FC allow local study use after a request-form approval [src-pff-fc-wc2022]?
Can a lawyer confirm whether MIT on the SkillCorner repository covers the data [src-skillcorner-opendata]?
