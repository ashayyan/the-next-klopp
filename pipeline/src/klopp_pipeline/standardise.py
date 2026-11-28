"""Standardise raw provider files into kloppy datasets (PIPE-01).

Wyscout (Pappalardo et al., CC BY 4.0): read ``events_England.json`` straight out of the cached zip
(no extraction, so no zip-slip), keep one match, build kloppy's V2 per-match wrapper with decoded
names, and let kloppy convert coordinates to 105 x 68 canonical metres with a single warp.

kloppy receives ``BytesIO`` only, never a URL (threat T-03-13), and the tests run with the network
blocked.
"""

from __future__ import annotations

import io
import json
import os
import re
import zipfile
from pathlib import Path
from typing import Any

from kloppy import wyscout
from kloppy.domain import Dimension, EventDataset, MetricPitchDimensions, Orientation

from klopp_pipeline import net
from klopp_pipeline.fetch import RAW_ROOT, Fetcher, fetch_source, sha256_of
from klopp_pipeline.sources import AllowListFile

# T-03-11: the England events member is 189 MB uncompressed; anything above this cap is refused.
MEMBER_CAP_BYTES = 250 * 1024 * 1024
EVENTS_MEMBER = "events_England.json"
MATCHES_MEMBER = "matches_England.json"
CHUNK = 1024 * 1024

# players.json stores names double-escaped: the text "Sané", not the letter.
_UNICODE_ESCAPE = re.compile(r"\\u([0-9a-fA-F]{4})")

PITCH_LENGTH = 105
PITCH_WIDTH = 68


class StandardiseError(Exception):
    """A raw file could not be read or did not hold what the recipe needs."""


def decode_name(text: str) -> str:
    """Turn literal ``\\uXXXX`` text into the character, once (``San\\u00e9`` becomes ``Sané``)."""
    return _UNICODE_ESCAPE.sub(lambda m: chr(int(m.group(1), 16)), text)


def read_zip_json(source: bytes | Path, member: str, *, max_bytes: int = MEMBER_CAP_BYTES) -> Any:
    """Parse one JSON member of a zip held in memory or on disk, never extracting it.

    The member is refused when its declared size is above ``max_bytes`` and again while reading
    (a lying header cannot get past the cap).
    """
    archive: Any = io.BytesIO(source) if isinstance(source, bytes) else source
    with zipfile.ZipFile(archive) as zf:
        try:
            info = zf.getinfo(member)
        except KeyError as exc:
            raise StandardiseError(f"{member} is not in the zip") from exc
        if info.file_size > max_bytes:
            raise StandardiseError(
                f"{member} declares {info.file_size} bytes, above the {max_bytes} byte cap"
            )
        chunks: list[bytes] = []
        total = 0
        with zf.open(info) as handle:
            while True:
                chunk = handle.read(CHUNK)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise StandardiseError(f"{member} is larger than the {max_bytes} byte cap")
                chunks.append(chunk)
    body = b"".join(chunks)
    del chunks
    return json.loads(body)


def _read_json_file(source: bytes | Path) -> Any:
    return json.loads(source if isinstance(source, bytes) else Path(source).read_bytes())


def build_extract(
    match_id: int,
    *,
    events_zip: bytes | Path,
    matches_zip: bytes | Path,
    players_json: bytes | Path,
    teams_json: bytes | Path,
    max_member_bytes: int = MEMBER_CAP_BYTES,
) -> dict[str, Any]:
    """Build the per-match extract: kloppy's V2 wrapper plus the match facts a recipe labels with.

    Parses the full events list once, keeps the match immediately and drops the rest (about 1.4 GB
    peak on the real England file, see 03-RESEARCH Pitfall 3).
    """
    all_events = read_zip_json(events_zip, EVENTS_MEMBER, max_bytes=max_member_bytes)
    events = [e for e in all_events if e.get("matchId") == match_id]
    del all_events
    if not events:
        raise StandardiseError(f"match {match_id} has no events in {EVENTS_MEMBER}")

    matches = read_zip_json(matches_zip, MATCHES_MEMBER, max_bytes=max_member_bytes)
    match = next((m for m in matches if m.get("wyId") == match_id), None)
    if match is None or not match.get("teamsData"):
        raise StandardiseError(f"match {match_id} is not in {MATCHES_MEMBER}")
    players = {p["wyId"]: p for p in _read_json_file(players_json)}
    teams = {t["wyId"]: t for t in _read_json_file(teams_json)}

    # kloppy takes "home_team_id, away_team_id = raw_events['teams'].keys()", so home goes first.
    team_ids = sorted(match["teamsData"], key=lambda k: 0 if match["teamsData"][k]["side"] == "home" else 1)
    wrapper: dict[str, Any] = {"events": events, "teams": {}, "players": {}}
    meta_teams: dict[str, Any] = {}
    for tid in team_ids:
        data = match["teamsData"][tid]
        team = teams[int(tid)]
        formation = data.get("formation") or {}
        ids = [p["playerId"] for p in formation.get("lineup", []) + formation.get("bench", [])]
        ids += [e["playerId"] for e in events if str(e["teamId"]) == tid and e["playerId"] != 0]
        unique = list(dict.fromkeys(ids))
        wrapper["teams"][tid] = {"team": {"officialName": team["officialName"]}}
        wrapper["players"][tid] = [
            {
                "player": {
                    "wyId": pid,
                    "firstName": decode_name(players[pid]["firstName"]),
                    "lastName": decode_name(players[pid]["lastName"]),
                }
            }
            for pid in unique
            if pid in players
        ]
        meta_teams[tid] = {
            "name": team["name"],
            "officialName": team["officialName"],
            "side": data["side"],
            "score": data.get("score"),
        }

    return {
        **wrapper,
        "match": {
            "matchId": str(match_id),
            "label": match.get("label"),
            "dateUtc": match.get("dateutc"),
            "teams": meta_teams,
        },
    }


def load_wyscout_match(
    extract: dict[str, Any], *, orientation: Orientation | None = None
) -> EventDataset:
    """Load an extract with kloppy and convert it to 105 x 68 metres, origin top-left, y down.

    ``coordinates="wyscout"`` keeps provider units so the one ``to_pitch_dimensions`` transform is
    the only warp. Without ``orientation`` events stay ``ACTION_EXECUTING_TEAM`` (the team in
    possession attacks left to right); ``Orientation.STATIC_HOME_AWAY`` pins each team to a side.
    """
    wrapper = {key: extract[key] for key in ("events", "teams", "players")}
    dataset = wyscout.load(
        event_data=io.BytesIO(json.dumps(wrapper).encode("utf-8")),
        data_version="V2",
        coordinates="wyscout",
    )
    metric = MetricPitchDimensions(
        x_dim=Dimension(0, PITCH_LENGTH),
        y_dim=Dimension(0, PITCH_WIDTH),
        pitch_length=PITCH_LENGTH,
        pitch_width=PITCH_WIDTH,
        standardized=False,
    )
    if orientation is None:
        return dataset.transform(to_pitch_dimensions=metric)
    return dataset.transform(to_pitch_dimensions=metric, to_orientation=orientation)


def wyscout_match_extract(
    match_id: int,
    *,
    raw_root: Path = RAW_ROOT,
    offline: bool = False,
    allow: AllowListFile | None = None,
    fetcher: Fetcher = net.fetch_bytes,
) -> dict[str, Any]:
    """The per-match extract, built from the verified raw files and cached beside them.

    ``fetch_source`` makes sure the four Wyscout files are present and match their sha256 pins. The
    extract is cached at ``raw_root/wyscout/extract/<matchId>.json`` together with the sha256 of
    each input, and rebuilt whenever an input hash differs (so a changed pin never serves a stale
    extract). The cache lives in the git-ignored raw folder.
    """
    paths = fetch_source("wyscout", allow=allow, raw_root=raw_root, offline=offline, fetcher=fetcher)
    inputs = {name: sha256_of(path) for name, path in sorted(paths.items())}
    cache = raw_root / "wyscout" / "extract" / f"{match_id}.json"
    try:
        cached = json.loads(cache.read_bytes())
        if cached.get("inputs") == inputs and isinstance(cached.get("extract"), dict):
            return cached["extract"]
    except (OSError, ValueError, AttributeError):
        pass  # missing or damaged cache: rebuild
    extract = build_extract(
        match_id,
        events_zip=paths["events.zip"],
        matches_zip=paths["matches.zip"],
        players_json=paths["players.json"],
        teams_json=paths["teams.json"],
    )
    cache.parent.mkdir(parents=True, exist_ok=True)
    tmp = cache.with_name(cache.name + ".tmp")
    try:
        tmp.write_bytes(json.dumps({"inputs": inputs, "extract": extract}).encode("utf-8"))
        os.replace(tmp, cache)
    except OSError:
        tmp.unlink(missing_ok=True)
        raise
    return extract
