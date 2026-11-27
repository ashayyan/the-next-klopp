"""Hand-run helper (not collected by pytest) that records trimmed live indexes as test fixtures.

    uv run --project pipeline python pipeline/tests/record_fixtures.py statsbomb [more providers]

It fetches through ``klopp_pipeline.net.fetch_bytes`` (allow-listed hosts only, cached under the
git-ignored pipeline/data/raw/) and merges the trimmed bodies into
``pipeline/tests/fixtures/coverage_responses.json`` as
``{ "<url>": { "kind": "json" | "text" | "zip", "body": ... } }``. Only the fields the parsers read
are kept, so the fixture stays small and carries no licensed payload.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from klopp_pipeline import coverage, net

FIXTURE_PATH = Path(__file__).resolve().parent / "fixtures" / "coverage_responses.json"


def _fetch(url: str, max_bytes: int) -> bytes:
    return net.fetch_bytes(url, max_bytes)


def _load() -> dict[str, Any]:
    if FIXTURE_PATH.exists():
        return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return {}


def _save(fixtures: dict[str, Any]) -> None:
    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_PATH.write_text(
        json.dumps(fixtures, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def _trim_sb_match(m: dict[str, Any]) -> dict[str, Any]:
    return {
        "match_id": m["match_id"],
        "competition": {
            "competition_id": m["competition"]["competition_id"],
            "competition_name": m["competition"]["competition_name"],
        },
        "season": {"season_id": m["season"]["season_id"], "season_name": m["season"]["season_name"]},
        "home_team": {"home_team_name": m["home_team"]["home_team_name"]},
        "away_team": {"away_team_name": m["away_team"]["away_team_name"]},
        "match_status_360": m.get("match_status_360"),
    }


def record_statsbomb(fixtures: dict[str, Any]) -> None:
    """Four competition-seasons: PL 2015/16, PL 2003/04, the smallest 360 season, one small other."""
    comps = json.loads(_fetch(coverage.SB_COMPETITIONS_URL, 2 * coverage.MB))

    def matches_of(c: dict[str, Any]) -> list[dict[str, Any]]:
        url = f"{coverage.SB_RAW}/matches/{c['competition_id']}/{c['season_id']}.json"
        return json.loads(_fetch(url, 12 * coverage.MB))

    chosen: list[dict[str, Any]] = [
        c for c in comps if c["competition_id"] == 2 and c["season_id"] in (27, 44)
    ]
    with_360 = [c for c in comps if c["match_available_360"] is not None]
    other = [c for c in comps if c["competition_id"] != 2 and c["match_available_360"] is None]
    for pool in (with_360, other):
        pool.sort(key=lambda c: len(matches_of(c)))
        chosen.append(pool[0])
    fixtures[coverage.SB_COMPETITIONS_URL] = {
        "kind": "json",
        "body": [
            {k: c[k] for k in ("competition_id", "season_id", "competition_name", "season_name")}
            for c in chosen
        ],
    }
    for c in chosen:
        url = f"{coverage.SB_RAW}/matches/{c['competition_id']}/{c['season_id']}.json"
        fixtures[url] = {"kind": "json", "body": [_trim_sb_match(m) for m in matches_of(c)]}


RECORDERS = {"statsbomb": record_statsbomb}


def main(argv: list[str]) -> int:
    names = argv or list(RECORDERS)
    unknown = [n for n in names if n not in RECORDERS]
    if unknown:
        print(f"unknown provider(s): {unknown}; choose from {list(RECORDERS)}", file=sys.stderr)
        return 2
    fixtures = _load()
    for name in names:
        RECORDERS[name](fixtures)
        print(f"recorded {name}")
    _save(fixtures)
    print(f"{FIXTURE_PATH} is {FIXTURE_PATH.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
