"""Open-data coverage matrix: which providers hold Premier League matches (RSCH-02).

Every provider function takes an injected ``fetch(url, max_bytes) -> bytes`` so tests run on
recorded fixtures and the CLI injects the allow-listed, cached fetcher from ``net``. A provider that
cannot be read yields one honest ``unreachable`` row; counts are never guessed.
"""

from __future__ import annotations

import csv
import io
import json
import re
import zipfile
from collections.abc import Callable
from pathlib import Path
from typing import Any

from klopp_pipeline import __version__
from klopp_pipeline.models import CoverageMatrix, CoverageRow
from klopp_pipeline.net import FetchError

Fetch = Callable[[str, int], bytes]

MB = 1024 * 1024

# --- other providers: index URLs ------------------------------------------------------------------
WYSCOUT_ZIP_URL = "https://ndownloader.figshare.com/files/14464622"
WYSCOUT_COLLECTION_URL = "https://api.figshare.com/v2/collections/4415000"
SKILLCORNER_MATCHES_URL = (
    "https://raw.githubusercontent.com/SkillCorner/opendata/master/data/matches.json"
)
DFL_ARTICLE_URL = "https://api.figshare.com/v2/articles/28196177"
METRICA_URL = "https://api.github.com/repos/metrica-sports/sample-data/contents/data"
LASTROW_URL = (
    "https://api.github.com/repos/Friends-of-Tracking-Data-FoTD/Last-Row/contents/datasets/positional_data"
)
LASTROW_CSV_URL = (
    "https://raw.githubusercontent.com/Friends-of-Tracking-Data-FoTD/Last-Row/master/datasets/"
    "positional_data/liverpool_2019.csv"
)
PFF_URL = "https://www.blog.fc.pff.com/blog/pff-fc-release-2022-world-cup-data"

# --- StatsBomb ----------------------------------------------------------------------------------
SB_RAW = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
SB_COMPETITIONS_URL = f"{SB_RAW}/competitions.json"
SB_LICENCE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/LICENSE.pdf"
SB_LICENCE_ID = "statsbomb-public-data-user-agreement"


def _load_json(raw: bytes) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON: {exc.msg}") from exc


def statsbomb_rows(fetch: Fetch, now: str) -> list[CoverageRow]:
    """One ``event`` row per competition-season plus ``360`` rows (always for PL seasons)."""
    competitions = _load_json(fetch(SB_COMPETITIONS_URL, 2 * MB))
    rows: list[CoverageRow] = []
    for comp in competitions:
        cid, sid = comp["competition_id"], comp["season_id"]
        url = f"{SB_RAW}/matches/{cid}/{sid}.json"
        matches = _load_json(fetch(url, 12 * MB))
        is_pl = cid == 2 and comp["competition_name"] == "Premier League"
        total = len(matches)
        available_360 = sum(1 for m in matches if m.get("match_status_360") == "available")
        notes = ""
        if is_pl:
            common = _common_clubs(matches)
            notes = (
                f"All {total} matches involve {', '.join(sorted(common))}."
                if common and total
                else f"{total} Premier League matches."
            )
        base = {
            "provider": "StatsBomb",
            "dataset": "StatsBomb open data",
            "competition": comp["competition_name"],
            "competition_id": str(cid),
            "season": comp["season_name"],
            "status": "ok",
            "method": "index",
            "licence_id": SB_LICENCE_ID,
            "licence_url": SB_LICENCE_URL,
            "source_url": url,
            "fetched_at": now,
        }
        rows.append(
            CoverageRow(
                **base,
                data_type="event",
                matches_total=total,
                pl_matches=total if is_pl else 0,
                notes=notes,
            )
        )
        if available_360 > 0 or is_pl:
            rows.append(
                CoverageRow(
                    **base,
                    data_type="360",
                    matches_total=available_360,
                    pl_matches=available_360 if is_pl else 0,
                    notes="Matches with match_status_360 == available.",
                )
            )
    return rows


def _common_clubs(matches: list[dict[str, Any]]) -> set[str]:
    """Clubs that appear in every match (a single club for a one-club season such as 2003/2004)."""
    common: set[str] | None = None
    for match in matches:
        teams = {match["home_team"]["home_team_name"], match["away_team"]["away_team_name"]}
        common = teams if common is None else common & teams
    return common or set()


# --- Wyscout (Pappalardo et al., figshare) ----------------------------------------------------------
CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/"
WY_PL_COMPETITION_ID = 364  # "English first division", the 2017/18 Premier League
MAX_ZIP_MEMBER_BYTES = 5 * MB
WY_COMPETITIONS = {
    "England": ("English first division", "2017/2018"),
    "France": ("French first division", "2017/2018"),
    "Germany": ("German first division", "2017/2018"),
    "Italy": ("Italian first division", "2017/2018"),
    "Spain": ("Spanish first division", "2017/2018"),
    "European_Championship": ("European Championship", "2016"),
    "World_Cup": ("World Cup", "2018"),
}


def wyscout_rows(fetch: Fetch, now: str) -> list[CoverageRow]:
    """Read matches.zip in memory (never extracted); one event row per competition."""
    data = fetch(WYSCOUT_ZIP_URL, 5 * MB)
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise ValueError("Wyscout archive is not a zip file") from exc
    rows: list[CoverageRow] = []
    with archive:
        for info in sorted(archive.infolist(), key=lambda i: i.filename):
            found = re.fullmatch(r"matches_([A-Za-z_]+)\.json", info.filename)
            if not found:
                continue
            if info.file_size > MAX_ZIP_MEMBER_BYTES:
                raise ValueError(f"{info.filename} is larger than {MAX_ZIP_MEMBER_BYTES} bytes")
            with archive.open(info) as member:
                raw = member.read(MAX_ZIP_MEMBER_BYTES + 1)
            if len(raw) > MAX_ZIP_MEMBER_BYTES:
                raise ValueError(f"{info.filename} expands beyond {MAX_ZIP_MEMBER_BYTES} bytes")
            matches = _load_json(raw)
            stem = found.group(1)
            name, season = WY_COMPETITIONS.get(stem, (stem.replace("_", " "), "unknown"))
            competition_id = matches[0]["competitionId"] if matches else None
            is_pl = competition_id == WY_PL_COMPETITION_ID
            notes = ""
            if is_pl:
                notes = (
                    f'Labelled "{name}" (wyId {competition_id}); events only, coordinates 0-100; '
                    f'first match in the file is "{matches[0].get("label", "unknown")}".'
                )
            rows.append(
                CoverageRow(
                    provider="Wyscout",
                    dataset="Wyscout public soccer-logs dataset",
                    competition=name,
                    competition_id=None if competition_id is None else str(competition_id),
                    season=season,
                    data_type="event",
                    matches_total=len(matches),
                    pl_matches=len(matches) if is_pl else 0,
                    status="ok",
                    method="index",
                    licence_id="CC-BY-4.0",
                    licence_url=CC_BY_URL,
                    source_url=WYSCOUT_ZIP_URL,
                    fetched_at=now,
                    notes=notes,
                )
            )
    if not rows:
        raise ValueError("Wyscout archive holds no matches_*.json member")
    return rows


# --- SkillCorner ----------------------------------------------------------------------------------
SC_LICENCE_URL = "https://raw.githubusercontent.com/SkillCorner/opendata/master/LICENSE"
SC_COMPETITIONS = {61: "A-League"}
SC_SEASONS = {95: "2024/2025"}


def skillcorner_rows(fetch: Fetch, now: str) -> list[CoverageRow]:
    """Trust matches.json, not the README (which says 10 matches while the index lists 20)."""
    matches = _load_json(fetch(SKILLCORNER_MATCHES_URL, 2 * MB))
    groups: dict[tuple[int, int], list[dict[str, Any]]] = {}
    for match in matches:
        groups.setdefault((match["competition_id"], match["season_id"]), []).append(match)
    rows: list[CoverageRow] = []
    for (cid, sid), entries in sorted(groups.items()):
        statuses: dict[str, int] = {}
        for entry in entries:
            statuses[entry["status"]] = statuses.get(entry["status"], 0) + 1
        rows.append(
            CoverageRow(
                provider="SkillCorner",
                dataset="SkillCorner open data",
                competition=SC_COMPETITIONS.get(cid, f"competition {cid}"),
                competition_id=str(cid),
                season=SC_SEASONS.get(sid, f"season {sid}"),
                data_type="broadcast-tracking",
                matches_total=len(entries),
                pl_matches=0,
                status="ok",
                method="index",
                licence_id="MIT",
                licence_url=SC_LICENCE_URL,
                source_url=SKILLCORNER_MATCHES_URL,
                fetched_at=now,
                notes=(
                    "Index entries by status: "
                    + ", ".join(f"{n} {s}" for s, n in sorted(statuses.items()))
                    + ". The README says 10 matches; the index is the source of truth."
                ),
            )
        )
    if not rows:
        raise ValueError("SkillCorner matches.json is empty")
    return rows


# --- DFL / Sportec IDSSE ----------------------------------------------------------------------------
DFL_COMPETITIONS = {"DFL-COM-000001": "Bundesliga", "DFL-COM-000002": "2. Bundesliga"}
DFL_FILE = re.compile(
    r"^DFL_\d+_\d+_(matchinformation|events_raw|positions_raw_observed)_(DFL-COM-\d+)_(DFL-MAT-\w+)\.xml$"
)


def dfl_rows(fetch: Fetch, now: str) -> list[CoverageRow]:
    """Count matches per competition and data kind from the figshare file list."""
    article = _load_json(fetch(DFL_ARTICLE_URL, 2 * MB))
    kinds = {"events_raw": "event", "positions_raw_observed": "tracking"}
    counts: dict[tuple[str, str], set[str]] = {}
    for file in article["files"]:
        found = DFL_FILE.match(file["name"])
        if found and found.group(1) in kinds:
            counts.setdefault((found.group(2), kinds[found.group(1)]), set()).add(found.group(3))
    if not counts:
        raise ValueError("DFL figshare article lists no recognised match files")
    rows: list[CoverageRow] = []
    for (com, data_type), mats in sorted(counts.items()):
        rows.append(
            CoverageRow(
                provider="DFL",
                dataset="DFL / Sportec IDSSE open data",
                competition=DFL_COMPETITIONS.get(com, com),
                competition_id=com,
                season="2022/2023",
                data_type=data_type,  # type: ignore[arg-type]
                matches_total=len(mats),
                pl_matches=0,
                status="ok",
                method="index",
                licence_id="CC-BY-4.0",
                licence_url=CC_BY_URL,
                source_url=DFL_ARTICLE_URL,
                fetched_at=now,
                notes=(
                    "Match counts come from the figshare file list; the competition name is mapped "
                    "from the DFL competition id and the season from the DFL data paper."
                ),
            )
        )
    return rows


# --- Metrica sample data ------------------------------------------------------------------------------
def metrica_rows(fetch: Fetch, now: str) -> list[CoverageRow]:
    listing = _load_json(fetch(METRICA_URL, MB))
    games = [e for e in listing if e["type"] == "dir" and e["name"].startswith("Sample_Game_")]
    if not games:
        raise ValueError("Metrica listing holds no Sample_Game folder")
    rows: list[CoverageRow] = []
    for data_type in ("event", "tracking"):
        rows.append(
            CoverageRow(
                provider="Metrica",
                dataset="Metrica Sports sample data",
                competition="unnamed (anonymised)",
                competition_id=None,
                season="unknown",
                data_type=data_type,  # type: ignore[arg-type]
                matches_total=len(games),
                pl_matches=0,
                status="ok",
                method="index",
                licence_id="none-stated-informal-credit",
                licence_url=None,
                source_url=METRICA_URL,
                fetched_at=now,
                notes=(
                    "The games are anonymised: teams and competition are not named, so no Premier League "
                    "match can be identified. Games 1-2 are CSV, game 3 is EPTS FIFA plus JSON events."
                ),
            )
        )
    return rows


# --- Last Row (Friends of Tracking) -------------------------------------------------------------------
LASTROW_REPO_URL = "https://github.com/Friends-of-Tracking-Data-FoTD/Last-Row"
LASTROW_MANUAL_TOTAL = 19
LASTROW_MANUAL_PL = 13
# Premier League opponents among the 19 Liverpool goals (the other 6 are Champions League).
LASTROW_PL_OPPONENTS = (
    "Bournemouth",
    "Fulham",
    "Southampton",
    "Wolves",
    "Norwich",
    "Chelsea",
    "Newcastle",
    "Man City",
    "Everton",
    "Watford",
    "Leicester",
)


def lastrow_rows(fetch: Fetch, now: str, deep: bool = False) -> list[CoverageRow]:
    """19 Liverpool goals in 2019, 13 of them Premier League: a manual count unless ``deep``."""
    listing = _load_json(fetch(LASTROW_URL, MB))
    entry = next((e for e in listing if e["name"] == "liverpool_2019.csv"), None)
    if entry is None:
        raise ValueError("liverpool_2019.csv is missing from the Last Row listing")
    total, pl = LASTROW_MANUAL_TOTAL, LASTROW_MANUAL_PL
    notes = (
        f"Manual count from the CSV play labels (file is {entry['size']} bytes): {total} goals, "
        f"{pl} in the Premier League, {total - pl} in the Champions League. The counts are plays "
        "(one per goal), not matches: two goals in one match are two plays. Tracking only, no "
        "events. Self-described as too inaccurate for research; no licence file, informal request "
        "to credit the source."
    )
    if deep:
        try:
            raw = fetch(LASTROW_CSV_URL, 16 * MB).decode("utf-8")
            reader = csv.DictReader(io.StringIO(raw))
            plays = list(dict.fromkeys(row["play"] for row in reader))
            total = len(plays)
            pl = sum(1 for p in plays if any(o.lower() in p.lower() for o in LASTROW_PL_OPPONENTS))
            notes = (
                f"Distinct plays recounted from the CSV play labels ({total}, of which {pl} Premier League); "
                "the counts are plays, not matches. Premier League opponents matched against a "
                "hand-written club list. Tracking only, no events; self-described as too inaccurate "
                "for research; informal request to credit the source."
            )
        except (FetchError, ValueError, KeyError, csv.Error) as exc:
            notes += f" Deep recount failed ({type(exc).__name__}); manual count kept."
    return [
        CoverageRow(
            provider="Last Row",
            dataset="Last Row: Liverpool 2019 positional data",
            competition="Liverpool goals (Premier League and Champions League)",
            competition_id=None,
            season="2019",
            data_type="tracking",
            matches_total=total,
            pl_matches=pl,
            unit="play",
            status="ok",
            method="manual",
            licence_id="none-stated-informal-credit",
            licence_url=None,
            source_url=LASTROW_REPO_URL,
            fetched_at=now,
            notes=notes,
        )
    ]


# --- PFF FC (request form, documented only) -----------------------------------------------------------
def pff_rows(fetch: Fetch, now: str) -> list[CoverageRow]:
    return [
        CoverageRow(
            provider="PFF FC",
            dataset="PFF FC World Cup 2022",
            competition="FIFA World Cup",
            competition_id=None,
            season="2022",
            data_type="broadcast-tracking",
            matches_total=64,
            pl_matches=0,
            status="request-only",
            method="documented",
            licence_id="request-form-no-terms-stated",
            licence_url=None,
            source_url=PFF_URL,
            fetched_at=now,
            notes=(
                "Access is a request form and there is no machine-readable index. The release posts "
                "document 64 matches with broadcast tracking, events, grades and rosters; no terms are "
                "stated on the pages read."
            ),
        )
    ]


# --- orchestration ------------------------------------------------------------------------------
ProviderFn = Callable[..., list[CoverageRow]]

PROVIDER_META: dict[str, dict[str, Any]] = {
    "statsbomb": {
        "provider": "StatsBomb",
        "dataset": "StatsBomb open data",
        "data_type": "event",
        "licence_id": SB_LICENCE_ID,
        "licence_url": SB_LICENCE_URL,
        "source_url": SB_COMPETITIONS_URL,
    },
    "wyscout": {
        "provider": "Wyscout",
        "dataset": "Wyscout public soccer-logs dataset",
        "data_type": "event",
        "licence_id": "CC-BY-4.0",
        "licence_url": CC_BY_URL,
        "source_url": WYSCOUT_ZIP_URL,
    },
    "skillcorner": {
        "provider": "SkillCorner",
        "dataset": "SkillCorner open data",
        "data_type": "broadcast-tracking",
        "licence_id": "MIT",
        "licence_url": SC_LICENCE_URL,
        "source_url": SKILLCORNER_MATCHES_URL,
    },
    "dfl": {
        "provider": "DFL",
        "dataset": "DFL / Sportec IDSSE open data",
        "data_type": "event",
        "licence_id": "CC-BY-4.0",
        "licence_url": CC_BY_URL,
        "source_url": DFL_ARTICLE_URL,
    },
    "metrica": {
        "provider": "Metrica",
        "dataset": "Metrica Sports sample data",
        "data_type": "tracking",
        "licence_id": "none-stated-informal-credit",
        "licence_url": None,
        "source_url": METRICA_URL,
    },
    "lastrow": {
        "provider": "Last Row",
        "dataset": "Last Row: Liverpool 2019 positional data",
        "data_type": "tracking",
        "licence_id": "none-stated-informal-credit",
        "licence_url": None,
        "source_url": LASTROW_REPO_URL,
    },
    "pff": {
        "provider": "PFF FC",
        "dataset": "PFF FC World Cup 2022",
        "data_type": "broadcast-tracking",
        "licence_id": "request-form-no-terms-stated",
        "licence_url": None,
        "source_url": PFF_URL,
    },
}

PROVIDERS: dict[str, ProviderFn] = {
    "statsbomb": statsbomb_rows,
    "wyscout": wyscout_rows,
    "skillcorner": skillcorner_rows,
    "dfl": dfl_rows,
    "metrica": metrica_rows,
    "lastrow": lastrow_rows,
    "pff": pff_rows,
}


def _unreachable_row(name: str, now: str, error: Exception) -> CoverageRow:
    meta = PROVIDER_META[name]
    return CoverageRow(
        provider=meta["provider"],
        dataset=meta["dataset"],
        competition="n/a",
        competition_id=None,
        season="n/a",
        data_type=meta["data_type"],
        matches_total=None,
        pl_matches=None,
        status="unreachable",
        method="index",
        licence_id=meta["licence_id"],
        licence_url=meta["licence_url"],
        source_url=meta["source_url"],
        fetched_at=now,
        notes=f"{type(error).__name__}: provider could not be read this run; no counts recorded.",
    )


def run_coverage(
    fetch: Fetch,
    now: str,
    providers: list[str] | None = None,
    *,
    deep: bool = False,
) -> CoverageMatrix:
    """Run each provider in its own try/except; an unreadable provider becomes one unreachable row."""
    # A fetcher with ``take_oldest`` (net.RecordingFetch) reports when the bodies it served were
    # really downloaded; rows and the matrix then carry that time, never "now" for a cached body.
    take_oldest: Callable[[], str | None] | None = getattr(fetch, "take_oldest", None)
    rows: list[CoverageRow] = []
    for name in providers or list(PROVIDERS):
        if take_oldest:
            take_oldest()
        try:
            extra = {"deep": deep} if name == "lastrow" else {}
            new_rows = PROVIDERS[name](fetch, now, **extra)
        except Exception as exc:  # noqa: BLE001 - per-provider boundary: any failure is one honest row
            new_rows = [_unreachable_row(name, now, exc)]
        stamp = take_oldest() if take_oldest else None
        if stamp:
            new_rows = [r.model_copy(update={"fetched_at": stamp}) for r in new_rows]
        rows.extend(new_rows)
    generated_at = min((r.fetched_at for r in rows), default=now) if take_oldest else now
    return CoverageMatrix(generated_at=generated_at, script_version=__version__, rows=rows)


# --- output -------------------------------------------------------------------------------------
DATA_TYPES = ["event", "360", "tracking", "broadcast-tracking", "physical"]
PL_COMPETITION_NAMES = ("Premier League", "English first division")


def _headline_cell(rows: list[CoverageRow], provider: str, data_type: str) -> str:
    cell = [r for r in rows if r.provider == provider and r.data_type == data_type]
    if not cell:
        return "-"
    if any(r.status == "unreachable" for r in cell):
        return "unreachable"
    total = sum(r.pl_matches or 0 for r in cell)
    text = f"{total} plays" if all(r.unit == "play" for r in cell) else str(total)
    return f"{text} (request-only)" if any(r.status == "request-only" for r in cell) else text


def render_markdown(matrix: CoverageMatrix) -> str:
    rows = matrix.rows
    providers = list(dict.fromkeys(r.provider for r in rows))
    lines = [
        "# Open-data coverage matrix (Premier League)",
        "",
        f"As of {matrix.generated_at}. Generated by `klopp-pipeline coverage` v{matrix.script_version};"
        " do not edit by hand.",
        "",
        "## Premier League matches by provider and data type",
        "",
        "| Provider | " + " | ".join(DATA_TYPES) + " |",
        "|" + "---|" * (len(DATA_TYPES) + 1),
    ]
    for p in providers:
        cells = [_headline_cell(rows, p, t) for t in DATA_TYPES]
        lines.append(f"| {p} | " + " | ".join(cells) + " |")
    lines += [
        "",
        "`unreachable` means the provider could not be read this run (no count is recorded). "
        "`request-only` means access is by request form. "
        "`N plays` means the provider's unit is a play (one per goal), not a match.",
    ]
    for p in providers:
        mine = [r for r in rows if r.provider == p]
        relevant = [
            r
            for r in mine
            if (r.pl_matches or 0) > 0 or r.status != "ok" or r.competition in PL_COMPETITION_NAMES
        ]
        rest = len(mine) - len(relevant)
        lines += ["", f"## {p}", ""]
        lines.append(f"Dataset: {mine[0].dataset}. Licence: `{mine[0].licence_id}`.")
        lines.append("")
        lines.append(
            "| Competition | Season | Data type | Unit | Total | PL | Status | Method | Source |"
        )
        lines.append("|---|---|---|---|---|---|---|---|---|")
        for r in relevant or mine:
            total = "n/a" if r.matches_total is None else r.matches_total
            pl = "unreachable" if r.pl_matches is None else r.pl_matches
            lines.append(
                f"| {r.competition} | {r.season} | {r.data_type} | {r.unit} | {total} | {pl} |"
                f" {r.status} | {r.method} | {r.source_url} |"
            )
        if relevant and rest:
            lines += ["", f"{rest} further row(s) with 0 Premier League matches are in the JSON."]
        notes = [f"- {r.competition} {r.season} ({r.data_type}): {r.notes}" for r in relevant if r.notes]
        if notes:
            lines += ["", *notes]
    return "\n".join(lines) + "\n"


def write_outputs(matrix: CoverageMatrix, out_dir: Path) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "coverage-matrix.json"
    md_path = out_dir / "coverage-matrix.md"
    json_path.write_text(
        json.dumps(matrix.model_dump(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    md_path.write_text(render_markdown(matrix), encoding="utf-8", newline="\n")
    return json_path, md_path
