"""run-all end to end on synthetic Wyscout files: fetch (cache only), recipe, publish, idempotence."""

from __future__ import annotations

import hashlib
import json
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest
import synthetic as syn
from typer.testing import CliRunner

from klopp_pipeline import cli, standardise
from klopp_pipeline.recipes import Recipe
from klopp_pipeline.recipes.wyscout_goal import RecipeError, WyscoutGoalConfig, build_scene
from klopp_pipeline.sources import AllowListFile, load_allow_list

BODIES = {
    "events.zip": syn.events_zip(),
    "matches.zip": syn.matches_zip(),
    "players.json": json.dumps(syn.players()).encode("utf-8"),
    "teams.json": json.dumps(syn.teams()).encode("utf-8"),
}


def write_allow(tmp_path: Path) -> Path:
    doc = {
        "schemaVersion": 1,
        "sources": [
            {
                "id": "wyscout",
                "licence": "CC-BY-4.0",
                "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
                "shippable": True,
                "attribution": "Pappalardo et al. (synthetic test data)",
                "files": [
                    {
                        "name": name,
                        "url": f"https://ndownloader.figshare.com/files/{i}",
                        "maxBytes": 10_000_000,
                        "sha256": hashlib.sha256(body).hexdigest(),
                    }
                    for i, (name, body) in enumerate(BODIES.items(), start=1)
                ],
            }
        ],
    }
    path = tmp_path / "allow.json"
    path.write_text(json.dumps(doc), encoding="utf-8")
    return path


def seed_raw(raw: Path) -> None:
    (raw / "wyscout").mkdir(parents=True)
    for name, body in BODIES.items():
        (raw / "wyscout" / name).write_bytes(body)


@pytest.fixture
def synthetic_recipe(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    allow_path = write_allow(tmp_path)

    def build(raw_root: Path, offline: bool, allow: AllowListFile | None = None) -> Any:
        # Only the allow-list the CLI hands down is used, so a run that dropped --sources would fail.
        extract = standardise.wyscout_match_extract(
            syn.MATCH_ID, raw_root=raw_root, offline=offline, allow=allow
        )
        return build_scene(
            extract, WyscoutGoalConfig(syn.MATCH_ID, str(syn.SHOT_EVENT_ID), "possession-ltr")
        )

    recipe = Recipe(
        name="wyscout-goal",
        source_id="wyscout",
        dataset="wyscout",
        build=build,
        extract_ids=(syn.MATCH_ID,),
    )
    monkeypatch.setattr(cli, "RECIPES", {"wyscout-goal": recipe})
    return allow_path


def args(tmp_path: Path, allow_path: Path, *extra: str) -> list[str]:
    return [
        "run-all",
        "--offline",
        "--sources",
        str(allow_path),
        "--raw-dir",
        str(tmp_path / "raw"),
        "--data-dir",
        str(tmp_path / "data"),
        "--public-dir",
        str(tmp_path / "public"),
        *extra,
    ]


def test_run_all_writes_one_version_publishes_it_and_lists_it(
    tmp_path: Path, synthetic_recipe: Path
) -> None:
    seed_raw(tmp_path / "raw")
    result = CliRunner().invoke(cli.app, args(tmp_path, synthetic_recipe))
    assert result.exit_code == 0, result.output
    versions = list((tmp_path / "data" / "wyscout").iterdir())
    assert len(versions) == 1 and versions[0].name.startswith("v1-")
    published = tmp_path / "public" / "wyscout" / versions[0].name
    assert (published / "manifest.json").is_file()
    catalog = json.loads((tmp_path / "public" / "catalog.json").read_bytes())
    assert [d["version"] for d in catalog["datasets"]] == [versions[0].name]
    assert catalog["datasets"][0]["scenes"][0]["id"] == "wyscout-777-sane-goal"
    assert "new file" in result.output


def test_a_second_run_reports_no_new_files_and_changes_nothing(
    tmp_path: Path, synthetic_recipe: Path
) -> None:
    seed_raw(tmp_path / "raw")
    runner = CliRunner()
    assert runner.invoke(cli.app, args(tmp_path, synthetic_recipe)).exit_code == 0

    def snapshot() -> dict[str, bytes]:
        return {
            str(p.relative_to(tmp_path)): p.read_bytes()
            for sub in ("data", "public")
            for p in (tmp_path / sub).rglob("*")
            if p.is_file()
        }

    before = snapshot()
    second = runner.invoke(cli.app, args(tmp_path, synthetic_recipe))
    assert second.exit_code == 0, second.output
    assert "no new files" in second.output
    assert snapshot() == before


def test_run_all_offline_with_an_empty_raw_dir_names_the_missing_file(
    tmp_path: Path, synthetic_recipe: Path
) -> None:
    (tmp_path / "raw").mkdir()
    result = CliRunner().invoke(cli.app, args(tmp_path, synthetic_recipe))
    assert result.exit_code != 0
    assert "events.zip" in result.output
    assert not (tmp_path / "data").exists()


def test_run_all_skips_sources_without_a_recipe(tmp_path: Path, synthetic_recipe: Path) -> None:
    # A source that lists files but has no registered recipe is not fetched (nothing needs it).
    doc = json.loads(synthetic_recipe.read_bytes())
    doc["sources"].append(
        {
            "id": "statsbomb",
            "licence": "statsbomb-public-data-user-agreement",
            "licenceUrl": "https://raw.githubusercontent.com/statsbomb/open-data/master/LICENSE.pdf",
            "shippable": False,
            "logoRequired": True,
            "attribution": "Data: StatsBomb open data (StatsBomb logo required)",
            "files": [
                {
                    "name": "m.json",
                    "url": "https://raw.githubusercontent.com/statsbomb/open-data/"
                    "4b73468fc5b0f1950f9f66fada70ad3a4f9327cb/data/matches/2/27.json",
                    "maxBytes": 100,
                    "sha256": None,
                }
            ],
        }
    )
    synthetic_recipe.write_text(json.dumps(doc), encoding="utf-8")
    seed_raw(tmp_path / "raw")
    result = CliRunner().invoke(cli.app, args(tmp_path, synthetic_recipe))
    assert result.exit_code == 0, result.output
    assert "statsbomb" not in result.output


def test_the_committed_allow_list_and_default_paths_resolve_from_the_repo_root() -> None:
    assert cli.DEFAULT_DATA == cli.REPO_ROOT / "data"
    assert cli.DEFAULT_PUBLIC == cli.REPO_ROOT / "public" / "data"
    assert load_allow_list().sources


def test_a_recipe_error_is_one_clean_line_not_a_traceback(
    tmp_path: Path, synthetic_recipe: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(raw_root: Path, offline: bool, allow: AllowListFile | None = None) -> Any:
        raise RecipeError("shot event 1 is not in match 2")

    seed_raw(tmp_path / "raw")
    recipe = cli.RECIPES["wyscout-goal"]
    monkeypatch.setattr(cli, "RECIPES", {"wyscout-goal": replace(recipe, build=broken)})
    result = CliRunner().invoke(cli.app, args(tmp_path, synthetic_recipe))
    assert result.exit_code == 1
    assert "run-all failed: shot event 1 is not in match 2" in result.output
    assert not isinstance(result.exception, RecipeError)
