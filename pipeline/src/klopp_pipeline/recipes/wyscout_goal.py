"""Recipe ``wyscout-goal``: a Wyscout goal and the possession chain behind it as a Scene.

Pinned goal (03-RESEARCH Pattern 8): match 2499754, shot event 185704194, Manchester City against
Liverpool, 2017-09-09, second half. The recipe walks back from the shot over same-team, same-period
events, keeps passes and the shot, skips same-team duels and touches, and stops at the first
opponent event or stoppage. Frames come from event starts (the actor and the ball, plus the previous
actor still at his own start), so an event-derived reconstruction never shows a player frozen where
he last touched the ball.

Orientation (``orient``): ``possession-ltr`` keeps kloppy's ACTION_EXECUTING_TEAM frame, which puts
the team in possession left to right without a transform (the chain must hold one team only);
``static`` transforms to STATIC_HOME_AWAY and reads each team's attack direction from that frame.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from kloppy.domain import EventDataset, EventType, Ground, Orientation, PassResult

from klopp_pipeline import standardise
from klopp_pipeline.scene import (
    Annotation,
    Clock,
    Entity,
    Event,
    Frame,
    Pitch,
    PassEvent,
    Point,
    Scene,
    SequenceAnnotation,
    ShotEvent,
    Source,
    Team,
)

RECIPE_NAME = "wyscout-goal"
MATCH_ID = 2499754
SHOT_EVENT_ID = "185704194"
ORIENT: Literal["static", "possession-ltr"] = "possession-ltr"

# Wyscout event ids that end a possession: 2 Foul, 5 Interruption, 6 Offside.
STOPPAGE_EVENT_IDS = frozenset({2, 5, 6})
STOPPAGE_KLOPPY = frozenset({EventType.FOUL_COMMITTED, EventType.BALL_OUT, EventType.CARD})
SHOT_FRAME_DELAY = 0.6  # seconds between the shot and the final frame that shows its end point

_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

# Source block per the allow-list entry for Wyscout (src ids from the source registry).
SOURCE_IDS = ["src-wyscout-public-dataset", "src-nature-pappalardo-wyscout-events"]
LICENCE = "CC-BY-4.0"
LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/"
ATTRIBUTION = (
    "Pappalardo, L. et al. A public data set of spatio-temporal match events in soccer "
    "competitions. Sci Data 6, 236 (2019). doi:10.1038/s41597-019-0247-7"
)


class RecipeError(ValueError):
    """The recipe's input does not describe a usable chain."""


@dataclass(frozen=True)
class WyscoutGoalConfig:
    match_id: int = MATCH_ID
    shot_event_id: str = SHOT_EVENT_ID
    orient: Literal["static", "possession-ltr"] = ORIENT


def kebab(text: str) -> str:
    """ASCII kebab-case with diacritics stripped (``Sané`` becomes ``sane``)."""
    folded = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", folded.lower()).strip("-")


def walk_chain(events: list[Any], shot_index: int) -> list[Any]:
    """Events of the shot's possession, oldest first, ending with the shot.

    Walks backwards over same-team, same-period events. Stops at the first opponent event, a period
    change, or a stoppage (Wyscout Foul, Interruption, Offside, or a kloppy foul, ball-out or card
    event, or a pass that ended out of play or offside). Passes are kept; duels, touches and other
    same-team events are skipped without breaking the chain.
    """
    shot = events[shot_index]
    chain = [shot]
    for event in reversed(events[:shot_index]):
        if event.period.id != shot.period.id:
            break
        if event.team.team_id != shot.team.team_id:
            break
        raw_id = event.raw_event.get("eventId") if isinstance(event.raw_event, dict) else None
        if raw_id in STOPPAGE_EVENT_IDS or event.event_type in STOPPAGE_KLOPPY:
            break
        if event.event_type == EventType.PASS:
            if event.result in (PassResult.OFFSIDE, PassResult.OUT):
                break
            chain.append(event)
    chain.reverse()
    return chain


def attack_direction(dataset: EventDataset, ground: Ground, period: int) -> Literal["ltr", "rtl"]:
    """Attack direction of a team in a period, in the dataset's orientation."""
    orientation = dataset.metadata.orientation
    if orientation == Orientation.ACTION_EXECUTING_TEAM:
        return "ltr"
    if orientation == Orientation.STATIC_HOME_AWAY:
        return "ltr" if ground == Ground.HOME else "rtl"
    if orientation == Orientation.STATIC_AWAY_HOME:
        return "rtl" if ground == Ground.HOME else "ltr"
    raise RecipeError(f"no attack direction is defined for orientation {orientation}")


def _xy(point: Any) -> Point:
    return Point(x=round(float(point.x), 2), y=round(float(point.y), 2))


def _surname(player: Any) -> str:
    return (player.last_name or player.first_name or str(player.player_id)).strip()


def _initials(player: Any) -> str:
    first = (player.first_name or "").strip()
    last = (player.last_name or "").strip()
    return ((first[:1] + last[:1]) or str(player.player_id)[:2]).upper()


def _entities(chain: list[Any], team_id: str) -> tuple[list[Entity], dict[str, str]]:
    """Player entities in order of first appearance, and a wyscout player id to entity id map."""
    players: dict[str, Any] = {}
    for event in chain:
        if event.player is not None:
            players.setdefault(event.player.player_id, event.player)

    ids: dict[str, str] = {}
    used: set[str] = {"ball"}
    for pid, player in players.items():
        base = kebab(_surname(player)) or f"player-{pid}"
        candidate = base
        if candidate in used:
            candidate = kebab(f"{_surname(player)} {player.first_name or ''}") or f"{base}-{pid}"
        if candidate in used:
            candidate = f"{base}-{pid}"
        used.add(candidate)
        ids[pid] = candidate

    initials = {pid: _initials(player) for pid, player in players.items()}
    for pid, player in players.items():
        if list(initials.values()).count(initials[pid]) > 1:
            initials[pid] = _surname(player)[:2].capitalize()

    entities = [
        Entity(
            id=ids[pid],
            type="player",
            team=team_id,
            label=initials[pid],
            name=" ".join(part for part in (player.first_name, player.last_name) if part).strip()
            or None,
        )
        for pid, player in players.items()
    ]
    entities.append(Entity(id="ball", type="ball"))
    return entities, ids


def _date_label(date_utc: str | None) -> str:
    if not date_utc:
        return ""
    parsed = datetime.strptime(date_utc, "%Y-%m-%d %H:%M:%S")
    return f"{parsed.day} {_MONTHS[parsed.month - 1]} {parsed.year}"


def _half(period: int) -> str:
    return {1: "first half", 2: "second half"}.get(period, "extra time")


def chain_to_scene(
    dataset: EventDataset, extract: dict[str, Any], chain: list[Any], config: WyscoutGoalConfig
) -> Scene:
    """Turn a chain (oldest first, ending in a shot) into a reconstruction Scene."""
    if config.orient == "possession-ltr" and len({e.team.team_id for e in chain}) != 1:
        raise RecipeError("a possession-ltr chain must hold one team only")
    shot = chain[-1]
    if shot.event_type != EventType.SHOT:
        raise RecipeError("the chain must end with a shot")

    team = shot.team
    meta = extract["match"]["teams"]
    team_meta = meta[team.team_id]
    team_id = kebab(team_meta["name"])
    period = shot.period.id
    first_seconds = chain[0].timestamp.total_seconds()

    entities, ids = _entities(chain, team_id)
    pitch_scene_teams = [
        Team(
            id=team_id,
            name=team_meta["name"],
            side="a",
            venue="home" if team.ground == Ground.HOME else "away",
            attack={str(period): attack_direction(dataset, team.ground, period)},
        )
    ]

    def t_of(event: Any) -> float:
        return round(event.timestamp.total_seconds() - first_seconds, 2)

    actor = {e.event_id: ids[e.player.player_id] for e in chain if e.player is not None}
    events: list[Event] = []
    frames: list[Frame] = []
    previous: tuple[str, Point] | None = None
    for index, event in enumerate(chain):
        start = _xy(event.coordinates)
        who = actor.get(event.event_id)
        eid = f"ev-{event.event_id}"
        if event.event_type == EventType.SHOT:
            result = event.result_coordinates
            end = _xy(result) if result is not None else Point(x=float(dataset.metadata.pitch_dimensions.pitch_length or 105), y=34.0)
            events.append(
                ShotEvent(
                    id=eid,
                    type="shot",
                    t=t_of(event),
                    team=team_id,
                    player=who,
                    start=start,
                    end=end,
                    goal=getattr(event.result, "name", "") == "GOAL",
                    endApprox=True,
                    ref=str(event.event_id),
                )
            )
        else:
            receiver_point = event.receiver_coordinates
            end = _xy(receiver_point) if receiver_point is not None else start
            next_actor = actor.get(chain[index + 1].event_id) if index + 1 < len(chain) else None
            events.append(
                PassEvent(
                    id=eid,
                    type="pass",
                    t=t_of(event),
                    team=team_id,
                    player=who,
                    receiver=next_actor if next_actor != who else None,
                    start=start,
                    end=end,
                    ref=str(event.event_id),
                )
            )
        if event.event_type != EventType.SHOT:
            positions = {"ball": start}
            if who is not None:
                positions[who] = start
            if previous is not None and previous[0] != who:
                positions[previous[0]] = previous[1]
            frames.append(Frame(t=t_of(event), positions=positions, ballOwner=who))
            if who is not None:
                previous = (who, start)

    shot_t = t_of(shot)
    shot_who = actor.get(shot.event_id)
    last = events[-1]
    shot_start = last.start
    # Frame at the shot itself (the shooter has the ball), then one after it at the end point.
    shot_positions = {"ball": shot_start}
    if shot_who is not None:
        shot_positions[shot_who] = shot_start
    if previous is not None and previous[0] != shot_who:
        shot_positions[previous[0]] = previous[1]
    frames.append(Frame(t=shot_t, positions=shot_positions, ballOwner=shot_who))
    final_positions = {"ball": last.end}
    if shot_who is not None:
        final_positions[shot_who] = shot_start
    frames.append(Frame(t=round(shot_t + SHOT_FRAME_DELAY, 2), positions=final_positions))

    sequence = SequenceAnnotation(id="sequence-chain", type="sequence", events=[e.id for e in events])
    annotations: list[Annotation] = [sequence]

    home_id = next(tid for tid, m in meta.items() if m["side"] == "home")
    away_id = next(tid for tid, m in meta.items() if m["side"] == "away")
    shooter = _surname(shot.player) if shot.player is not None else "Shot"
    label = (
        f"{meta[home_id]['name']} {meta[home_id]['score']}-{meta[away_id]['score']} "
        f"{meta[away_id]['name']}, {_date_label(extract['match'].get('dateUtc'))}: "
        f"{shooter} goal, {_half(period)}"
    )
    return Scene(
        id=f"wyscout-{config.match_id}-{kebab(shooter)}-goal",
        schemaVersion=1,
        kind="reconstruction",
        label=label,
        pitch=Pitch(length=105, width=68),
        teams=pitch_scene_teams,
        entities=entities,
        frames=frames,
        events=events,
        annotations=annotations,
        source=Source(
            type="open-data",
            provider="wyscout",
            sourceIds=SOURCE_IDS,
            licence=LICENCE,
            licenceUrl=LICENCE_URL,
            attribution=ATTRIBUTION,
            shippable=True,
            matchId=str(config.match_id),
            clock=Clock(period=period, offsetSec=round(first_seconds, 2)),
            recipe=RECIPE_NAME,
        ),
    )


def build_scene(extract: dict[str, Any], config: WyscoutGoalConfig | None = None) -> Scene:
    """The recipe on one match extract (pure: no network, no disk)."""
    config = config or WyscoutGoalConfig()
    orientation = Orientation.STATIC_HOME_AWAY if config.orient == "static" else None
    dataset = standardise.load_wyscout_match(extract, orientation=orientation)
    events = list(dataset.events)
    index = next((i for i, e in enumerate(events) if e.event_id == config.shot_event_id), None)
    if index is None:
        raise RecipeError(f"shot event {config.shot_event_id} is not in match {config.match_id}")
    chain = walk_chain(events, index)
    return chain_to_scene(dataset, extract, chain, config)


def build(raw_root: Path, offline: bool) -> Scene:
    """Fetch (allow-listed, hash-pinned), standardise and build the pinned goal."""
    extract = standardise.wyscout_match_extract(MATCH_ID, raw_root=raw_root, offline=offline)
    return build_scene(extract)
