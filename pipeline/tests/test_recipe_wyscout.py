"""The wyscout-goal recipe on synthetic Wyscout-shaped data (no provider records, no network)."""

from __future__ import annotations

import json
import unicodedata
import zipfile
from typing import Any

import pytest
import synthetic as syn
from kloppy.domain import Orientation

from klopp_pipeline import standardise
from klopp_pipeline.recipes import RECIPES
from klopp_pipeline.recipes.wyscout_goal import (
    RecipeError,
    WyscoutGoalConfig,
    attack_direction,
    build_scene,
    chain_to_scene,
    walk_chain,
)
from klopp_pipeline.scene import Scene, dump_scene


def extract(**event_kwargs: bool) -> dict[str, Any]:
    return standardise.build_extract(
        syn.MATCH_ID,
        events_zip=syn.events_zip(**event_kwargs),
        matches_zip=syn.matches_zip(),
        players_json=json.dumps(syn.players()).encode("utf-8"),
        teams_json=json.dumps(syn.teams()).encode("utf-8"),
    )


CONFIG = WyscoutGoalConfig(match_id=syn.MATCH_ID, shot_event_id=str(syn.SHOT_EVENT_ID))


def scene(**event_kwargs: bool) -> Scene:
    return build_scene(extract(**event_kwargs), CONFIG)


def test_names_are_decoded_once_from_the_double_escaped_text() -> None:
    assert standardise.decode_name("San\\u00e9") == "Sané"
    wrapper_names = [
        p["player"]["lastName"] for p in extract()["players"][str(syn.HOME_ID)]
    ]
    assert "Sané" in wrapper_names
    assert not any("\\u" in name for name in wrapper_names)
    shooter = next(e for e in scene().entities if e.name and e.name.endswith("Sané"))
    assert shooter.name == "Leroy Sané"
    assert unicodedata.normalize("NFC", shooter.name) == shooter.name
    assert shooter.id == "sane"
    assert shooter.label == "LS"


def test_extract_keeps_only_the_requested_match() -> None:
    ex = extract()
    assert {e["matchId"] for e in ex["events"]} == {syn.MATCH_ID}
    assert list(ex["teams"]) == [str(syn.HOME_ID), str(syn.AWAY_ID)]  # home first


def test_chain_stops_at_the_opponent_event_and_skips_the_duel_and_touch() -> None:
    s = scene()
    assert [e.ref for e in s.events] == ["5002", "5004", "5006", str(syn.SHOT_EVENT_ID)]
    assert [e.type for e in s.events] == ["pass", "pass", "pass", "shot"]


def test_chain_stops_at_a_period_change_when_there_is_no_opponent_event() -> None:
    s = scene(include_opponent=False, include_first_half=True)
    assert [e.ref for e in s.events][0] == "5002"  # the 1H event 4998 is not in the chain


def test_frames_start_at_zero_and_strictly_increase() -> None:
    times = [f.t for f in scene().frames]
    assert times[0] == 0
    assert all(b > a for a, b in zip(times, times[1:]))
    assert times[-1] == pytest.approx(times[-2] + 0.6)


def test_frame_rule_actor_ball_and_previous_actor() -> None:
    s = scene()
    first, second = s.frames[0], s.frames[1]
    assert set(first.positions) == {"lindgren", "ball"}
    assert first.ballOwner == "lindgren"
    assert set(second.positions) == {"da-costa", "ball", "lindgren"}
    assert second.positions["lindgren"] == first.positions["lindgren"]  # still at his own start
    final = s.frames[-1]
    assert final.ballOwner is None
    assert set(final.positions) == {"sane", "ball"}


def test_shot_is_last_goal_and_approximate() -> None:
    s = scene()
    shot = s.events[-1]
    assert shot.type == "shot"
    assert shot.goal is True
    assert shot.endApprox is True
    assert (shot.end.x, shot.end.y) == (105.0, 30.95)  # kloppy's goal-zone estimate, not (0, 0)


def test_known_coordinate_through_the_single_warp() -> None:
    # Raw Wyscout (20, 60) after kloppy's single zone warp to 105 x 68 metres.
    first = scene().events[0]
    assert (first.start.x, first.start.y) == (22.39, 40.8)


def test_every_coordinate_is_inside_the_run_off_bounds() -> None:
    s = scene()
    points = [p for f in s.frames for p in f.positions.values()]
    points += [e.start for e in s.events] + [e.end for e in s.events]
    assert all(-3 <= p.x <= 108 and -3 <= p.y <= 71 for p in points)


def test_scene_round_trips_through_the_model_and_the_canonical_bytes() -> None:
    s = scene()
    blob = dump_scene(s)
    assert blob.endswith(b"\n") and b"\r" not in blob
    assert Scene.model_validate_json(blob) == s
    assert dump_scene(Scene.model_validate_json(blob)) == blob  # stable bytes


def test_scene_metadata() -> None:
    s = scene()
    assert s.kind == "reconstruction"
    assert s.id == "wyscout-777-sane-goal"
    assert s.label == "Alpha City 5-0 Beta United, 9 Sep 2017: Sané goal, second half"
    assert s.source.shippable is True and s.source.provider == "wyscout"
    assert s.source.clock is not None and s.source.clock.period == 2
    assert s.source.clock.offsetSec == pytest.approx(101.5)
    assert [(t.id, t.attack) for t in s.teams] == [("alpha-city", {"2": "ltr"})]
    assert [a.type for a in s.annotations] == ["sequence"]


def test_a_member_above_the_cap_is_refused_by_size() -> None:
    data = syn.events_zip()
    with pytest.raises(standardise.StandardiseError, match="cap"):
        standardise.read_zip_json(data, syn.EVENTS_MEMBER, max_bytes=100)


def test_a_header_that_declares_a_huge_size_is_refused_before_reading(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    real = zipfile.ZipFile.getinfo

    def faked(self: zipfile.ZipFile, name: str) -> zipfile.ZipInfo:
        info = real(self, name)
        info.file_size = standardise.MEMBER_CAP_BYTES + 1
        return info

    monkeypatch.setattr(zipfile.ZipFile, "getinfo", faked)
    with pytest.raises(standardise.StandardiseError, match="declares"):
        standardise.read_zip_json(syn.events_zip(), syn.EVENTS_MEMBER)


def test_static_orientation_takes_attack_from_the_match_frame() -> None:
    home = build_scene(extract(), WyscoutGoalConfig(CONFIG.match_id, CONFIG.shot_event_id, "static"))
    assert home.teams[0].attack == {"2": "ltr"}  # home team, static home-away

    # The same chain built for the away team: its events are mirrored and it attacks right to left.
    ex = extract()
    dataset = standardise.load_wyscout_match(ex, orientation=Orientation.STATIC_HOME_AWAY)
    away_chain = [e for e in dataset.events if e.team.team_id == str(syn.AWAY_ID)]
    shot_like = away_chain[0]
    assert shot_like.team.ground.name == "AWAY"
    assert attack_direction(dataset, shot_like.team.ground, 2) == "rtl"


def test_a_two_team_chain_is_refused_with_possession_ltr() -> None:
    ex = extract()
    dataset = standardise.load_wyscout_match(ex)
    events = list(dataset.events)
    shot_index = next(i for i, e in enumerate(events) if e.event_id == str(syn.SHOT_EVENT_ID))
    chain = walk_chain(events, shot_index)
    opponent = next(e for e in events if e.team.team_id == str(syn.AWAY_ID))
    with pytest.raises(RecipeError, match="one team"):
        chain_to_scene(dataset, ex, [opponent, *chain], CONFIG)


def test_an_unknown_shot_event_is_refused() -> None:
    with pytest.raises(RecipeError, match="not in match"):
        build_scene(extract(), WyscoutGoalConfig(syn.MATCH_ID, "999999", "possession-ltr"))


def test_the_recipe_is_registered() -> None:
    recipe = RECIPES["wyscout-goal"]
    assert (recipe.source_id, recipe.dataset) == ("wyscout", "wyscout")
