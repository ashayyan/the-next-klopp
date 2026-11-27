"""Offline tests: every provider parses its recorded index to the research golden counts."""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from typing import Any

import pytest

from klopp_pipeline import coverage
from klopp_pipeline.models import CoverageMatrix, CoverageRow
from klopp_pipeline.net import FetchError

FIXTURES = json.loads(
    (Path(__file__).parent / "fixtures" / "coverage_responses.json").read_text(encoding="utf-8")
)
NOW = "2026-11-27T12:00:00Z"


def fake_fetch(url: str, max_bytes: int) -> bytes:
    """Serve a recorded body for ``url``; an unrecorded URL behaves like an unreachable host."""
    entry = FIXTURES.get(url)
    if entry is None:
        raise FetchError(f"no fixture for {url}")
    kind, body = entry["kind"], entry["body"]
    if kind == "json":
        data = json.dumps(body).encode("utf-8")
    elif kind == "text":
        data = body.encode("utf-8")
    elif kind == "zip":
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for name, member in body.items():
                zf.writestr(name, json.dumps(member))
        data = buf.getvalue()
    else:  # pragma: no cover
        raise AssertionError(kind)
    if len(data) > max_bytes:
        raise FetchError(f"fixture for {url} exceeds {max_bytes}")
    return data


def rows_for(provider: str, rows: list[CoverageRow]) -> list[CoverageRow]:
    return [r for r in rows if r.provider == provider]


# --- StatsBomb (tracer) -------------------------------------------------------------------------
def test_statsbomb_pl_event_matches_are_418() -> None:
    rows = coverage.statsbomb_rows(fake_fetch, NOW)
    pl_events = [r for r in rows if r.data_type == "event" and r.competition_id == "2"]
    assert sorted(r.season for r in pl_events) == ["2003/2004", "2015/2016"]
    assert sorted(r.pl_matches for r in pl_events) == [38, 380]
    assert sum(r.pl_matches or 0 for r in pl_events) == 418


def test_statsbomb_pl_360_rows_have_zero_pl_matches() -> None:
    rows = coverage.statsbomb_rows(fake_fetch, NOW)
    pl_360 = [r for r in rows if r.data_type == "360" and r.competition_id == "2"]
    assert len(pl_360) == 2
    assert all(r.pl_matches == 0 and r.matches_total == 0 for r in pl_360)


def test_statsbomb_non_pl_360_season_counts_available_matches() -> None:
    rows = coverage.statsbomb_rows(fake_fetch, NOW)
    other_360 = [r for r in rows if r.data_type == "360" and r.competition_id != "2"]
    assert len(other_360) == 1
    row = other_360[0]
    assert row.pl_matches == 0
    assert row.matches_total is not None and row.matches_total > 0
    event = next(
        r
        for r in rows
        if r.data_type == "event"
        and (r.competition_id, r.season) == (row.competition_id, row.season)
    )
    assert row.matches_total <= (event.matches_total or 0)


def test_statsbomb_season_2003_notes_name_the_single_club() -> None:
    rows = coverage.statsbomb_rows(fake_fetch, NOW)
    row = next(r for r in rows if r.season == "2003/2004" and r.data_type == "event")
    assert "Arsenal" in row.notes


def test_pl_is_matched_by_id_and_exact_name_not_the_word_premier() -> None:
    comps = [
        {"competition_id": 99, "season_id": 1, "competition_name": "Premier League 2", "season_name": "x"}
    ]
    matches = [
        {
            "match_id": 1,
            "home_team": {"home_team_name": "A"},
            "away_team": {"away_team_name": "B"},
            "match_status_360": None,
        }
    ]

    def fetch(url: str, max_bytes: int) -> bytes:
        return json.dumps(comps if url.endswith("competitions.json") else matches).encode()

    (row,) = [r for r in coverage.statsbomb_rows(fetch, NOW) if r.data_type == "event"]
    assert row.pl_matches == 0


def test_run_coverage_and_write_outputs_round_trip(tmp_path: Path) -> None:
    matrix = coverage.run_coverage(fake_fetch, NOW, ["statsbomb"])
    json_path, md_path = coverage.write_outputs(matrix, tmp_path)
    reloaded = CoverageMatrix.model_validate_json(json_path.read_text(encoding="utf-8"))
    assert len(reloaded.rows) == len(matrix.rows)
    assert json_path.read_bytes().endswith(b"}\n")
    assert b"\r\n" not in json_path.read_bytes()
    markdown = md_path.read_text(encoding="utf-8")
    assert "As of 2026-11-27T12:00:00Z" in markdown
    assert "StatsBomb" in markdown


def test_row_model_rejects_a_guessed_count_for_an_unreachable_provider() -> None:
    base: dict[str, Any] = {
        "provider": "X",
        "dataset": "X",
        "competition": "n/a",
        "competition_id": None,
        "season": "n/a",
        "data_type": "event",
        "status": "unreachable",
        "method": "index",
        "licence_id": "MIT",
        "licence_url": None,
        "source_url": "https://example.org/",
        "fetched_at": NOW,
    }
    with pytest.raises(ValueError):
        CoverageRow(**base, matches_total=None, pl_matches=0)
    ok = CoverageRow(**base, matches_total=None, pl_matches=None)
    assert ok.pl_matches is None
    with pytest.raises(ValueError):
        CoverageRow(**{**base, "status": "ok"}, matches_total=None, pl_matches=None)
