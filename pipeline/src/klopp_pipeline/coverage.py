"""Open-data coverage matrix: which providers hold Premier League matches (RSCH-02).

Every provider function takes an injected ``fetch(url, max_bytes) -> bytes`` so tests run on
recorded fixtures and the CLI injects the allow-listed, cached fetcher from ``net``. A provider that
cannot be read yields one honest ``unreachable`` row; counts are never guessed.
"""

from __future__ import annotations

import json
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
                f"All {total} matches involve {', '.join(sorted(common))} only."
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
}

PROVIDERS: dict[str, ProviderFn] = {
    "statsbomb": statsbomb_rows,
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
    rows: list[CoverageRow] = []
    for name in providers or list(PROVIDERS):
        try:
            extra = {"deep": deep} if name == "lastrow" else {}
            rows.extend(PROVIDERS[name](fetch, now, **extra))
        except (FetchError, ValueError, KeyError, TypeError) as exc:
            rows.append(_unreachable_row(name, now, exc))
    return CoverageMatrix(generated_at=now, script_version=__version__, rows=rows)


# --- output -------------------------------------------------------------------------------------
DATA_TYPES = ["event", "360", "tracking", "broadcast-tracking", "physical"]


def _headline_cell(rows: list[CoverageRow], provider: str, data_type: str) -> str:
    cell = [r for r in rows if r.provider == provider and r.data_type == data_type]
    if not cell:
        return "-"
    if any(r.status == "unreachable" for r in cell):
        return "unreachable"
    total = sum(r.pl_matches or 0 for r in cell)
    return f"{total} (request-only)" if any(r.status == "request-only" for r in cell) else str(total)


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
        "`request-only` means access is by request form.",
    ]
    for p in providers:
        mine = [r for r in rows if r.provider == p]
        relevant = [r for r in mine if (r.pl_matches or 0) > 0 or r.status != "ok"]
        rest = len(mine) - len(relevant)
        lines += ["", f"## {p}", ""]
        lines.append(f"Dataset: {mine[0].dataset}. Licence: `{mine[0].licence_id}`.")
        lines.append("")
        lines.append("| Competition | Season | Data type | Matches | PL matches | Status | Method | Source |")
        lines.append("|---|---|---|---|---|---|---|---|")
        for r in relevant or mine:
            total = "n/a" if r.matches_total is None else r.matches_total
            pl = "unreachable" if r.pl_matches is None else r.pl_matches
            lines.append(
                f"| {r.competition} | {r.season} | {r.data_type} | {total} | {pl} | {r.status} |"
                f" {r.method} | {r.source_url} |"
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
