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


# --- StatsBomb-shaped data (fictional; no real match, player or event is copied) -------------------
#
# One fictional match (id 9001): Alpha City (home, id 501) against Beta United (away, id 502), one
# period. Alpha's number 9 shoots from inside the box and scores; the shot carries a freeze frame of
# three Alpha teammates and six Beta players, the goalkeeper among them. Both teams use jersey numbers
# 1 to 11, so the entity ids have to carry the team prefix to stay unique.

SB_MATCH_ID = 9001
SB_SHOT_ID = "a1b2c3d4-0000-4000-8000-000000000001"
SB_ALPHA_ID = 501
SB_BETA_ID = 502

# (position id, position name) for a 4-3-3 and a 4-4-2, goalkeeper first.
_SB_ALPHA_XI = [
    (1, "Goalkeeper"), (2, "Right Back"), (3, "Right Center Back"), (5, "Left Center Back"),
    (6, "Left Back"), (10, "Center Defensive Midfield"), (13, "Right Center Midfield"),
    (15, "Left Center Midfield"), (17, "Right Wing"), (23, "Center Forward"), (21, "Left Wing"),
]
_SB_BETA_XI = [
    (1, "Goalkeeper"), (2, "Right Back"), (3, "Right Center Back"), (5, "Left Center Back"),
    (6, "Left Back"), (12, "Right Midfield"), (13, "Right Center Midfield"),
    (15, "Left Center Midfield"), (16, "Left Midfield"), (22, "Right Center Forward"),
    (24, "Left Center Forward"),
]
_SB_NAMES = {
    SB_ALPHA_ID: ["Ari Lindgren", "Bo Da Costa", "Cal De Vries", "Dev Okoro", "Eli Marsh",
                  "Fox Quill", "Gil Ström", "Hal Moreau", "Zoë Møller", "Ian Rossi", "Kit Novak"],
    SB_BETA_ID: ["Lou Andersen", "Max Baker", "Ned Cole", "Oz Dunn", "Pia Evans", "Quin Faro",
                 "Rae Gray", "Sam Holt", "Tia Ivers", "Uli Jaeger", "Vic Kerr"],
}


def _sb_lineup(team: int) -> list[dict[str, Any]]:
    xi = _SB_ALPHA_XI if team == SB_ALPHA_ID else _SB_BETA_XI
    return [
        {
            "player": {"id": team * 100 + n, "name": _SB_NAMES[team][n - 1]},
            "position": {"id": pos_id, "name": pos_name},
            "jersey_number": n,
        }
        for n, (pos_id, pos_name) in enumerate(xi, start=1)
    ]


def statsbomb_lineups() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for team, name in ((SB_ALPHA_ID, "Alpha City"), (SB_BETA_ID, "Beta United")):
        out.append(
            {
                "team_id": team,
                "team_name": name,
                "lineup": [
                    {
                        "player_id": p["player"]["id"],
                        "player_name": p["player"]["name"],
                        "player_nickname": None,
                        "jersey_number": p["jersey_number"],
                        "country": {"id": 1, "name": "Testland"},
                        "cards": [],
                        "positions": [
                            {
                                "position_id": p["position"]["id"],
                                "position": p["position"]["name"],
                                "from": "00:00",
                                "to": None,
                                "from_period": 1,
                                "to_period": None,
                                "start_reason": "Starting XI",
                                "end_reason": "Final Whistle",
                            }
                        ],
                    }
                    for p in _sb_lineup(team)
                ],
            }
        )
    return out


def _sb_base(index: int, uid: str, type_id: int, type_name: str, team: int, team_name: str, ts: str) -> dict[str, Any]:
    return {
        "id": uid,
        "index": index,
        "period": 1,
        "timestamp": ts,
        "minute": int(ts[3:5]),
        "second": int(ts[6:8]),
        "type": {"id": type_id, "name": type_name},
        "possession": 1,
        "possession_team": {"id": SB_ALPHA_ID, "name": "Alpha City"},
        "play_pattern": {"id": 1, "name": "Regular Play"},
        "team": {"id": team, "name": team_name},
        "duration": 0.0,
    }


def statsbomb_events(*, with_freeze_frame: bool = True) -> list[dict[str, Any]]:
    """The match's events: two Starting XI, two Half Start, the shot, two Half End."""
    teams = ((SB_ALPHA_ID, "Alpha City"), (SB_BETA_ID, "Beta United"))
    events: list[dict[str, Any]] = []
    for i, (team, name) in enumerate(teams):
        e = _sb_base(i + 1, f"a1b2c3d4-0000-4000-8000-0000000001{i}0", 35, "Starting XI", team, name, "00:00:00.000")
        e["tactics"] = {"formation": 433 if team == SB_ALPHA_ID else 442, "lineup": _sb_lineup(team)}
        events.append(e)
    for i, (team, name) in enumerate(teams):
        events.append(_sb_base(i + 3, f"a1b2c3d4-0000-4000-8000-0000000002{i}0", 18, "Half Start", team, name, "00:00:00.000"))

    shot = _sb_base(5, SB_SHOT_ID, 16, "Shot", SB_ALPHA_ID, "Alpha City", "00:07:19.689")
    shot["player"] = {"id": SB_ALPHA_ID * 100 + 9, "name": _SB_NAMES[SB_ALPHA_ID][8]}
    shot["position"] = {"id": 23, "name": "Center Forward"}
    shot["location"] = [108.4, 36.4]
    shot["shot"] = {
        "statsbomb_xg": 0.31,
        "end_location": [120.0, 40.0, 1.5],
        "type": {"id": 87, "name": "Open Play"},
        "body_part": {"id": 40, "name": "Right Foot"},
        "technique": {"id": 93, "name": "Normal"},
        "outcome": {"id": 97, "name": "Goal"},
    }
    if with_freeze_frame:
        def ff(team: int, n: int, x: float, y: float, mate: bool) -> dict[str, Any]:
            pos_id, pos_name = (_SB_ALPHA_XI if team == SB_ALPHA_ID else _SB_BETA_XI)[n - 1]
            return {
                "location": [x, y],
                "player": {"id": team * 100 + n, "name": _SB_NAMES[team][n - 1]},
                "position": {"id": pos_id, "name": pos_name},
                "teammate": mate,
            }

        shot["shot"]["freeze_frame"] = [
            ff(SB_ALPHA_ID, 7, 100.2, 30.2, True),
            ff(SB_ALPHA_ID, 11, 104.2, 50.2, True),
            ff(SB_ALPHA_ID, 8, 96.2, 40.2, True),
            ff(SB_BETA_ID, 1, 118.2, 40.2, False),
            ff(SB_BETA_ID, 3, 112.2, 36.2, False),
            ff(SB_BETA_ID, 5, 111.2, 42.2, False),
            ff(SB_BETA_ID, 2, 110.2, 28.2, False),
            ff(SB_BETA_ID, 6, 109.2, 52.2, False),
            ff(SB_BETA_ID, 9, 100.2, 44.2, False),
        ]
    events.append(shot)
    for i, (team, name) in enumerate(teams):
        events.append(_sb_base(i + 6, f"a1b2c3d4-0000-4000-8000-0000000003{i}0", 34, "Half End", team, name, "00:45:10.000"))
    return events
