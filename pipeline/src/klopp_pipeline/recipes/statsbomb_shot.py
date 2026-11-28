"""Recipe ``statsbomb-shot``: one StatsBomb shot and its freeze frame as a local-only Scene.

StatsBomb open data may not be redistributed through this app (ADR 0008): the scene is written to
``data/statsbomb/<version>/`` with ``shippable: false`` and ``localOnly: true``, ``publish`` skips it,
and ``/dev/pitch`` reads it through ``import.meta.glob`` only when the file exists on this machine.

Pinned shot (03-RESEARCH): match 3754047 (Liverpool 1-0 Swansea City, 29 Nov 2015), event
``e6427836-c67b-4a24-8928-e0b81cbf2b24``, an off-target header by Swansea's number 17. The event
carries a freeze frame: where every visible player stood at the moment of the shot. kloppy parses it
into ``event.freeze_frame`` and warps it with the same 105 x 68 transform as the event itself.

Orientation is ``possession-ltr``: StatsBomb stores each event with the acting team attacking left to
right, so the shooter's team attacks ``ltr`` and the opponent ``rtl`` without a second transform.
Entity ids are the team prefix and the jersey number (``swa-17``); the player's full name is kept in
``name`` only.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from kloppy.domain import EventDataset, EventType, Ground

from klopp_pipeline import standardise
from klopp_pipeline.fetch import fetch_source
from klopp_pipeline.recipes.wyscout_goal import RecipeError, kebab
from klopp_pipeline.scene import Entity, Frame, Pitch, Point, Scene, ShotEvent, Source, Team

RECIPE_NAME = "statsbomb-shot"
SOURCE_ID = "statsbomb"
MATCH_ID = 3754047
SHOT_EVENT_ID = "e6427836-c67b-4a24-8928-e0b81cbf2b24"
EVENTS_FILE = f"events-{MATCH_ID}.json"
LINEUPS_FILE = f"lineups-{MATCH_ID}.json"
MATCHES_FILE = "matches-2-27.json"
SHOT_END_DELAY = 0.6  # seconds between the freeze frame and the frame that shows the shot's end point

SOURCE_IDS = ["src-statsbomb-open-data"]
LICENCE = "statsbomb-public-data-user-agreement"
LICENCE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/LICENSE.pdf"
ATTRIBUTION = "Data: StatsBomb open data (StatsBomb logo required)"

_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


@dataclass(frozen=True)
class StatsbombShotConfig:
    match_id: int = MATCH_ID
    shot_event_id: str = SHOT_EVENT_ID
    #: Short team name for the label ("Swansea shot ..."); the full team name when ``None``.
    shooter_short: str | None = "Swansea"


def _xy(point: Any) -> Point:
    return Point(x=round(float(point.x), 2), y=round(float(point.y), 2))


def _prefixes(names: list[str]) -> list[str]:
    """Three-letter team prefixes (``swa``, ``liv``); the whole kebab name if two would collide."""
    short = [kebab(n)[:3] or "tm" for n in names]
    return short if len(set(short)) == len(short) else [kebab(n) or f"tm{i}" for i, n in enumerate(names)]


def _date_label(iso_date: str | None) -> str:
    if not iso_date:
        return ""
    parsed = date.fromisoformat(iso_date)
    return f"{parsed.day} {_MONTHS[parsed.month - 1]} {parsed.year}"


def build_scene(
    dataset: EventDataset,
    match: dict[str, Any] | None = None,
    config: StatsbombShotConfig | None = None,
) -> Scene:
    """The recipe on one loaded match (pure: no network, no disk).

    ``match`` is the entry of ``matches-<competition>-<season>.json`` for the match (score, date and
    team names for the label); without it the label names only the shooter's team.
    """
    config = config or StatsbombShotConfig()
    shot = next((e for e in dataset.events if e.event_id == config.shot_event_id), None)
    if shot is None:
        raise RecipeError(f"shot event {config.shot_event_id} is not in match {config.match_id}")
    if shot.event_type != EventType.SHOT:
        raise RecipeError(f"event {config.shot_event_id} is not a shot")
    freeze = getattr(shot, "freeze_frame", None)
    if freeze is None or not freeze.players_data:
        raise RecipeError(f"shot {config.shot_event_id} carries no freeze frame")

    home, away = dataset.metadata.teams
    teams = [shot.team, away if shot.team is home else home]
    prefix = dict(zip((t.team_id for t in teams), _prefixes([t.name for t in teams]), strict=True))
    period = shot.period.id

    scene_teams = [
        Team(
            id=kebab(team.name),
            name=team.name,
            side="a" if index == 0 else "b",
            venue="home" if team.ground == Ground.HOME else "away",
            attack={str(period): "ltr" if index == 0 else "rtl"},
        )
        for index, team in enumerate(teams)
    ]
    team_scene_id = {t.team_id: kebab(t.name) for t in teams}

    entities: list[Entity] = []
    positions: dict[str, Point] = {}
    shooter_id: str | None = None
    for player, data in freeze.players_data.items():
        if player.jersey_no is None:
            raise RecipeError(f"player {player.player_id} has no jersey number")
        entity_id = f"{prefix[player.team.team_id]}-{player.jersey_no}"
        if entity_id in positions:
            raise RecipeError(f"two freeze-frame players share the id {entity_id}")
        position = player.starting_position
        is_keeper = position is not None and position.name == "Goalkeeper"
        entities.append(
            Entity(
                id=entity_id,
                type="goalkeeper" if is_keeper else "player",
                team=team_scene_id[player.team.team_id],
                number=player.jersey_no,
                name=(player.name or "").strip()[:80] or None,
                presence="always",
            )
        )
        positions[entity_id] = _xy(data.coordinates)
        if shot.player is not None and player.player_id == shot.player.player_id:
            shooter_id = entity_id
    if shooter_id is None:
        raise RecipeError("the shooter is not in the freeze frame")
    entities.append(Entity(id="ball", type="ball", presence="always"))

    start = _xy(shot.coordinates)
    result = shot.result_coordinates
    if result is None:
        raise RecipeError("the shot has no end point")
    end = _xy(result)
    positions["ball"] = start
    frames = [
        Frame(t=0, positions=positions, ballOwner=shooter_id),
        Frame(t=SHOT_END_DELAY, positions={"ball": end}),
    ]
    event = ShotEvent(
        id=f"ev-{shot.event_id}",
        type="shot",
        t=0,
        team=team_scene_id[shot.team.team_id],
        player=shooter_id,
        start=start,
        end=end,
        goal=getattr(shot.result, "name", "") == "GOAL",
        endApprox=False,
        ref=str(shot.event_id),
    )

    short = config.shooter_short or shot.team.name
    label = f"{short} shot with freeze frame (local only)"
    if match is not None:
        label = (
            f"{match['home_team']['home_team_name']} {match['home_score']}-{match['away_score']} "
            f"{match['away_team']['away_team_name']}, {_date_label(match.get('match_date'))}: {label}"
        )
    return Scene(
        id=f"statsbomb-{config.match_id}-{shooter_id}-shot",
        schemaVersion=1,
        kind="reconstruction",
        label=label,
        pitch=Pitch(length=105, width=68),
        teams=scene_teams,
        entities=entities,
        frames=frames,
        events=[event],
        annotations=[],
        source=Source(
            type="open-data",
            provider="statsbomb",
            sourceIds=SOURCE_IDS,
            licence=LICENCE,
            licenceUrl=LICENCE_URL,
            attribution=ATTRIBUTION,
            shippable=False,
            localOnly=True,
            logoRequired=True,
            matchId=str(config.match_id),
            recipe=RECIPE_NAME,
        ),
    )


def build(raw_root: Path, offline: bool) -> Scene:
    """Fetch (allow-listed, size-capped), standardise and build the pinned shot."""
    paths = fetch_source(SOURCE_ID, raw_root=raw_root, offline=offline)
    dataset = standardise.load_statsbomb_match(paths[EVENTS_FILE], paths[LINEUPS_FILE])
    matches = json.loads(Path(paths[MATCHES_FILE]).read_bytes())
    match = next((m for m in matches if m.get("match_id") == MATCH_ID), None)
    return build_scene(dataset, match)
