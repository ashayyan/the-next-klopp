"""Wyscout-shaped synthetic data, generated in code (no provider records are committed).

One fictional match (id 777): Alpha City (home, team 1001) against Beta United (away, team 1002).
The second half holds an opponent pass, then a same-team chain: pass, a duel (skipped), pass, a touch
(skipped), a cross and a goal-tagged shot. A decoy match (id 888) sits in the same events list so the
filter by match id is exercised. The shooter's last name is stored double-escaped, as in the public
dataset (the literal text ``San\\u00e9``, not the letter).
"""

from __future__ import annotations

import io
import json
import zipfile
from typing import Any

MATCH_ID = 777
HOME_ID = 1001
AWAY_ID = 1002
SHOT_EVENT_ID = 5007
EVENTS_MEMBER = "events_England.json"
MATCHES_MEMBER = "matches_England.json"

# (wyId, firstName, lastName, team): lastName is the raw text as stored in players.json.
PLAYERS: list[tuple[int, str, str, int]] = [
    (2001, "Ari", "Lindgren", HOME_ID),
    (2002, "Bo", "da Costa", HOME_ID),
    (2003, "Cal", "De Vries", HOME_ID),
    (2004, "Leroy", "San\\u00e9", HOME_ID),  # literal backslash-u text, double-escaped
    (2005, "Dev", "Okoro", HOME_ID),
    (3001, "Eli", "Marsh", AWAY_ID),
    (3002, "Fox", "Quill", AWAY_ID),
]


def ev(
    event_id: int,
    team: int,
    player: int,
    name: str,
    sub: str,
    sub_id: str,
    sec: float,
    positions: list[tuple[int, int]],
    event_name_id: int,
    tags: list[int] | None = None,
    period: str = "2H",
    match: int = MATCH_ID,
) -> dict[str, Any]:
    """One raw event record in the Wyscout v2 shape (positions are x, y in 0..100)."""
    return {
        "eventId": event_name_id,
        "subEventName": sub,
        "tags": [{"id": t} for t in (tags or [])],
        "playerId": player,
        "positions": [{"y": y, "x": x} for (x, y) in positions],
        "matchId": match,
        "eventName": name,
        "teamId": team,
        "matchPeriod": period,
        "eventSec": sec,
        "subEventId": sub_id,
        "id": event_id,
    }


def match_events(*, include_opponent: bool = True, include_first_half: bool = False) -> list[dict[str, Any]]:
    """The match's events in order. ``include_first_half`` adds same-team 1H events before 2H."""
    events: list[dict[str, Any]] = []
    if include_first_half:
        events.append(
            ev(4998, HOME_ID, 2001, "Pass", "Simple pass", "85", 2400.0, [(30, 50), (40, 50)], 8, [1801], period="1H")
        )
    if include_opponent:
        events.append(
            ev(5001, AWAY_ID, 3001, "Pass", "Simple pass", "85", 100.0, [(30, 50), (40, 50)], 8, [1801])
        )
    events += [
        ev(5002, HOME_ID, 2001, "Pass", "Simple pass", "85", 101.5, [(20, 60), (30, 55)], 8, [1801]),
        ev(5003, HOME_ID, 2002, "Duel", "Ground attacking duel", "11", 103.0, [(30, 55), (32, 55)], 1),
        ev(5004, HOME_ID, 2002, "Pass", "Simple pass", "85", 104.0, [(32, 55), (55, 40)], 8, [1801]),
        ev(5005, HOME_ID, 2003, "Others on the ball", "Touch", "72", 106.0, [(55, 40), (56, 40)], 7),
        ev(5006, HOME_ID, 2003, "Pass", "Cross", "80", 107.5, [(56, 40), (88, 30)], 8, [1801]),
        # A shot: the raw end is the (0, 0) placeholder; tags 101 goal, 401 left foot, 201
        # opportunity, 1205 goal low left (kloppy turns the zone tag into an end point).
        ev(SHOT_EVENT_ID, HOME_ID, 2004, "Shot", "Shot", "100", 109.2, [(88, 30), (0, 0)], 10, [101, 401, 201, 1205, 1801]),
        ev(5008, AWAY_ID, 3002, "Pass", "Simple pass", "85", 112.0, [(20, 50), (30, 50)], 8, [1801]),
        # A decoy match in the same file.
        ev(6001, HOME_ID, 2001, "Pass", "Simple pass", "85", 5.0, [(10, 10), (20, 10)], 8, [1801], match=888),
    ]
    return events


def matches() -> list[dict[str, Any]]:
    def side(team: int, name: str, score: int) -> dict[str, Any]:
        mine = [p for p in PLAYERS if p[3] == team]
        return {
            "scoreET": 0,
            "coachId": 0,
            "side": name,
            "teamId": team,
            "score": score,
            "scoreP": 0,
            "hasFormation": 1,
            "formation": {
                "bench": [{"playerId": mine[-1][0], "goals": "0", "ownGoals": "0", "yellowCards": "0", "redCards": "0"}],
                "lineup": [
                    {"playerId": p[0], "goals": "0", "ownGoals": "0", "yellowCards": "0", "redCards": "0"}
                    for p in mine[:-1]
                ],
                "substitutions": [],
            },
            "scoreHT": 0,
        }

    return [
        {
            "status": "Played",
            "roundId": 1,
            "gameweek": 4,
            "teamsData": {str(HOME_ID): side(HOME_ID, "home", 5), str(AWAY_ID): side(AWAY_ID, "away", 0)},
            "seasonId": 1,
            "dateutc": "2017-09-09 11:30:00",
            "winner": HOME_ID,
            "venue": "Synthetic Ground",
            "wyId": MATCH_ID,
            "label": "Alpha City - Beta United, 5 - 0",
            "date": "September 9, 2017 at 1:30:00 PM GMT+2",
            "referees": [],
            "duration": "Regular",
            "competitionId": 1,
        },
        {"wyId": 888, "teamsData": {}, "dateutc": "2017-09-10 11:30:00", "label": "Decoy - Decoy, 0 - 0"},
    ]


def players() -> list[dict[str, Any]]:
    return [
        {
            "firstName": first,
            "middleName": "",
            "lastName": last,
            "currentTeamId": team,
            "wyId": pid,
            "shortName": f"{first[0]}. {last}",
            "role": {"code2": "MD", "code3": "MID", "name": "Midfielder"},
        }
        for pid, first, last, team in PLAYERS
    ]


def teams() -> list[dict[str, Any]]:
    return [
        {"name": "Alpha City", "wyId": HOME_ID, "officialName": "Alpha City FC", "type": "club"},
        {"name": "Beta United", "wyId": AWAY_ID, "officialName": "Beta United FC", "type": "club"},
    ]


def zip_of(member: str, payload: object) -> bytes:
    """A zip held in memory with one JSON member."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(member, json.dumps(payload))
    return buffer.getvalue()


def events_zip(**kwargs: bool) -> bytes:
    return zip_of(EVENTS_MEMBER, match_events(**kwargs))


def matches_zip() -> bytes:
    return zip_of(MATCHES_MEMBER, matches())
