"""Recipes turn standardised provider data into Scenes. Recipes are additive and registered by name."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from klopp_pipeline.scene import Scene


@dataclass(frozen=True)
class Recipe:
    """A named, reproducible way to build one Scene from an allow-listed source."""

    name: str
    source_id: str  # an id in pipeline/sources.allow.json
    dataset: str  # output folder under data/<dataset>/ (used by the versioned writer)
    build: Callable[[Path, bool], Scene]  # (raw_root, offline) -> Scene


def _registry() -> dict[str, Recipe]:
    # Imported here so the recipe modules can import klopp_pipeline.scene without a cycle.
    from klopp_pipeline.recipes import wyscout_goal

    return {
        wyscout_goal.RECIPE_NAME: Recipe(
            name=wyscout_goal.RECIPE_NAME,
            source_id="wyscout",
            dataset="wyscout",
            build=wyscout_goal.build,
        )
    }


RECIPES: dict[str, Recipe] = _registry()
