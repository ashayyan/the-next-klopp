"""The statsbomb-shot recipe on synthetic StatsBomb-shaped data (no provider records, no network).

Every fixture here is generated in code (tests/synthetic.py): StatsBomb open data may not be
redistributed (ADR 0008), so no real match, player or event is copied into the repository. One
gated test runs the recipe on the real cached files when they exist on this machine.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
import synthetic as syn

from klopp_pipeline import publish as publish_mod
from klopp_pipeline import standardise
from klopp_pipeline.manifest import ManifestError, write_scene_version
from klopp_pipeline.recipes import RECIPES
from klopp_pipeline.recipes.statsbomb_shot import (
    RecipeError,
    StatsbombShotConfig,
    build_scene,
)
from klopp_pipeline.scene import Scene, dump_scene
from klopp_pipeline.sources import get_source, load_allow_list

CONFIG = StatsbombShotConfig(
    match_id=syn.SB_MATCH_ID, shot_event_id=syn.SB_SHOT_ID, shooter_short="Alpha"
)

MATCH_ROW: dict[str, Any] = {
    "match_id": syn.SB_MATCH_ID,
    "match_date": "2020-01-05",
    "home_team": {"home_team_id": syn.SB_ALPHA_ID, "home_team_name": "Alpha City"},
    "away_team": {"away_team_id": syn.SB_BETA_ID, "away_team_name": "Beta United"},
    "home_score": 1,
    "away_score": 0,
}


def dataset(**event_kwargs: bool):
    return standardise.load_statsbomb_match(
        json.dumps(syn.statsbomb_events(**event_kwargs)).encode("utf-8"),
        json.dumps(syn.statsbomb_lineups()).encode("utf-8"),
    )


def scene(**event_kwargs: bool) -> Scene:
    return build_scene(dataset(**event_kwargs), MATCH_ROW, CONFIG)


def test_the_scene_is_valid_and_round_trips() -> None:
    built = scene()
    assert Scene.model_validate_json(dump_scene(built)) == built
    assert built.kind == "reconstruction"
    assert (built.pitch.length, built.pitch.width) == (105, 68)


def test_entity_ids_are_team_prefix_and_jersey_number() -> None:
    built = scene()
    players = [e for e in built.entities if e.type != "ball"]
    assert len(players) == 10  # nine in the freeze frame plus the shooter
    assert {e.id for e in players} >= {"alp-9", "alp-7", "bet-1", "bet-9"}
    for e in players:
        assert e.id == f"{e.id.split('-')[0]}-{e.number}"
        assert e.presence == "always"
    assert len({e.id for e in built.entities}) == len(built.entities)


def test_full_names_live_in_name_only() -> None:
    built = scene()
    shooter = next(e for e in built.entities if e.id == "alp-9")
    assert shooter.name == "Zoë Møller"
    assert shooter.label is None
    assert not any("zoe" in e.id or "moller" in e.id for e in built.entities)


def test_the_opponent_keeper_is_a_goalkeeper_and_the_ball_is_one_ball() -> None:
    built = scene()
    keeper = next(e for e in built.entities if e.id == "bet-1")
    assert keeper.type == "goalkeeper"
    assert [e.type for e in built.entities].count("ball") == 1
    assert [e.type for e in built.entities].count("goalkeeper") == 1


def test_the_shooters_team_is_side_a_attacking_left_to_right() -> None:
    built = scene()
    alpha, beta = built.teams
    assert (alpha.name, alpha.side, alpha.venue, alpha.attack) == (
        "Alpha City",
        "a",
        "home",
        {"1": "ltr"},
    )
    assert (beta.name, beta.side, beta.venue, beta.attack) == (
        "Beta United",
        "b",
        "away",
        {"1": "rtl"},
    )


def test_two_frames_freeze_then_shot_end() -> None:
    built = scene()
    first, last = built.frames
    assert first.t == 0 and last.t == pytest.approx(0.6)
    assert set(first.positions) == {e.id for e in built.entities}
    assert first.ballOwner == "alp-9"
    assert first.positions["ball"] == first.positions["alp-9"]
    assert set(last.positions) == {"ball"}
    shot = built.events[0]
    assert shot.type == "shot" and shot.goal is True
    assert last.positions["ball"] == shot.end
    assert shot.start == first.positions["ball"]


def test_freeze_frame_and_shot_share_the_kloppy_warp() -> None:
    built = scene()
    raw_shot = next(e for e in dataset().events if e.event_id == syn.SB_SHOT_ID)
    start = built.events[0].start
    assert (start.x, start.y) == (round(raw_shot.coordinates.x, 2), round(raw_shot.coordinates.y, 2))
    # Left to right: a player nearer the goal line has a larger x.
    pos = built.frames[0].positions
    assert pos["bet-1"].x > pos["bet-3"].x > pos["alp-7"].x
    assert all(0 <= p.x <= 105 and 0 <= p.y <= 68 for p in pos.values())


def test_the_source_block_is_local_only_and_never_shippable() -> None:
    src = scene().source
    assert src.provider == "statsbomb" and src.type == "open-data"
    assert src.shippable is False and src.localOnly is True and src.logoRequired is True
    assert "StatsBomb" in src.attribution
    assert src.matchId == str(syn.SB_MATCH_ID)
    assert src.recipe == "statsbomb-shot"


def test_the_label_names_the_match_and_says_local_only() -> None:
    expected = "Alpha City 1-0 Beta United, 5 Jan 2020: Alpha shot with freeze frame (local only)"
    assert scene().label == expected
    assert build_scene(dataset(), None, CONFIG).label == "Alpha shot with freeze frame (local only)"


def test_a_shot_without_a_freeze_frame_is_refused() -> None:
    with pytest.raises(RecipeError, match="no freeze frame"):
        scene(with_freeze_frame=False)


def test_an_unknown_event_is_refused() -> None:
    with pytest.raises(RecipeError, match="not in match"):
        build_scene(dataset(), MATCH_ROW, StatsbombShotConfig(syn.SB_MATCH_ID, "no-such-event"))


def test_a_non_shot_event_is_refused() -> None:
    start_xi = syn.statsbomb_events()[0]["id"]
    with pytest.raises(RecipeError):
        build_scene(dataset(), MATCH_ROW, StatsbombShotConfig(syn.SB_MATCH_ID, start_xi))


def test_the_recipe_is_registered_for_the_statsbomb_dataset() -> None:
    recipe = RECIPES["statsbomb-shot"]
    assert (recipe.source_id, recipe.dataset) == ("statsbomb", "statsbomb")
    assert RECIPES["wyscout-goal"].dataset == "wyscout"


def test_the_version_is_written_local_only_and_publish_skips_it(tmp_path: Path) -> None:
    allow = load_allow_list()
    data_root, public_root = tmp_path / "data", tmp_path / "public" / "data"
    result = write_scene_version(
        scene(),
        source=get_source(allow, "statsbomb"),
        recipe="statsbomb-shot",
        dataset="statsbomb",
        raw_root=tmp_path / "raw",
        data_root=data_root,
    )
    assert result.created and result.path.parent == data_root / "statsbomb"
    manifest = json.loads((result.path / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["shippable"] is False and manifest["logoRequired"] is True

    outcome = publish_mod.publish(data_root=data_root, public_root=public_root, allow=allow)
    assert outcome.copied == []
    assert outcome.skipped == [f"statsbomb/{result.path.name}"]
    assert not (public_root / "statsbomb").exists()
    assert "statsbomb" not in outcome.catalog.read_text(encoding="utf-8")


def test_a_scene_marked_shippable_is_refused_by_the_writer(tmp_path: Path) -> None:
    built = scene()
    shippable = built.model_copy(
        update={"source": built.source.model_copy(update={"shippable": True})}
    )
    with pytest.raises(ManifestError, match="shippable"):
        write_scene_version(
            shippable,
            source=get_source(load_allow_list(), "statsbomb"),
            recipe="statsbomb-shot",
            dataset="statsbomb",
            raw_root=tmp_path / "raw",
            data_root=tmp_path / "data",
        )


# --- the real pinned shot (gated: needs `klopp-pipeline fetch statsbomb` to have run on this machine) ---

REAL_RAW = Path(__file__).resolve().parents[1] / "data" / "raw" / "statsbomb"
REAL_FILES = ("matches-2-27.json", "events-3754047.json", "lineups-3754047.json")


@pytest.mark.skipif(
    not all((REAL_RAW / name).is_file() for name in REAL_FILES),
    reason="run `uv run --project pipeline klopp-pipeline fetch statsbomb` once to cache the real data",
)
def test_the_real_pinned_shot_comes_out_as_a_valid_local_only_scene() -> None:
    from klopp_pipeline.fetch import RAW_ROOT

    real = RECIPES["statsbomb-shot"].build(RAW_ROOT, True)  # offline: cached files only
    assert real.id == "statsbomb-3754047-swa-17-shot"
    shot = real.events[0]
    assert shot.type == "shot" and shot.player == "swa-17"
    assert abs(shot.start.x - 99.82) < 0.05 and abs(shot.start.y - 38.90) < 0.05
    players = [e for e in real.entities if e.type != "ball"]
    assert len(players) == 14
    assert real.frames[0].positions["ball"] == shot.start
    assert real.source.shippable is False and real.source.localOnly is True
    assert real.label.startswith("Liverpool 1-0 Swansea City, 29 Nov 2015:")
    assert Scene.model_validate_json(dump_scene(real)) == real
