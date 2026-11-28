"""The pydantic Scene and schemas/scene.schema.json describe the same format (PITCH-04, PIPE-04).

No new dependency: a small walker compares property-name and required-name sets per object, with
union branches keyed by their ``type`` const and ``$ref`` resolved inside each file. Refs into other
schema files (common.schema.json) are leaves.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from klopp_pipeline.scene import Scene

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads((REPO_ROOT / "schemas" / "scene.schema.json").read_text(encoding="utf-8"))
FIXTURE_DIR = REPO_ROOT / "src" / "scene" / "fixtures"
FIXTURES = sorted(FIXTURE_DIR.glob("*.json"))

Shapes = dict[str, tuple[frozenset[str], frozenset[str]]]


def _resolve(node: dict[str, Any], root: dict[str, Any]) -> dict[str, Any] | None:
    """Follow in-file refs; return None for a ref into another file (a leaf)."""
    seen = 0
    while "$ref" in node:
        ref = node["$ref"]
        if not ref.startswith("#/"):
            return None
        target: Any = root
        for part in ref[2:].split("/"):
            target = target[part]
        node = target
        seen += 1
        if seen > 20:
            raise AssertionError(f"ref loop at {ref}")
    return node


def _branches(node: dict[str, Any]) -> list[dict[str, Any]] | None:
    for key in ("oneOf", "anyOf"):
        if key in node:
            return [b for b in node[key] if b.get("type") != "null"]
    return None


def _type_const(node: dict[str, Any], root: dict[str, Any]) -> str | None:
    resolved = _resolve(node, root)
    const = ((resolved or {}).get("properties", {}).get("type") or {}).get("const")
    return const if isinstance(const, str) else None


def shapes(node: dict[str, Any], root: dict[str, Any], path: str, out: Shapes) -> None:
    resolved = _resolve(node, root)
    if resolved is None:
        return
    branches = _branches(resolved)
    if branches is not None:
        if len(branches) == 1:  # Optional[X] is anyOf [X, null]
            shapes(branches[0], root, path, out)
            return
        for index, branch in enumerate(branches):
            key = _type_const(branch, root) or str(index)
            shapes(branch, root, f"{path}|{key}", out)
        return
    if "properties" in resolved:
        out[path] = (
            frozenset(resolved["properties"]),
            frozenset(resolved.get("required", [])),
        )
        for name, child in resolved["properties"].items():
            shapes(child, root, f"{path}.{name}", out)
    if "items" in resolved:
        shapes(resolved["items"], root, f"{path}[]", out)
    extra = resolved.get("additionalProperties")
    if isinstance(extra, dict):
        shapes(extra, root, f"{path}{{}}", out)
    # A map with constrained keys (pydantic writes patternProperties) counts like additionalProperties.
    for value_schema in resolved.get("patternProperties", {}).values():
        shapes(value_schema, root, f"{path}{{}}", out)


def schema_shapes(schema: dict[str, Any]) -> Shapes:
    out: Shapes = {}
    shapes(schema, schema, "$", out)
    return out


def test_the_walker_finds_the_known_objects() -> None:
    found = schema_shapes(SCHEMA)
    assert "$" in found and "$.pitch" in found and "$.source" in found
    assert any(p.startswith("$.events[]|pass") for p in found)
    assert any(p.startswith("$.annotations[]|") for p in found)
    assert len(found) >= 20  # a walker that silently stops early would pass an equality test


def test_property_and_required_sets_match_the_json_schema() -> None:
    expected = schema_shapes(SCHEMA)
    actual = schema_shapes(Scene.model_json_schema())
    assert sorted(actual) == sorted(expected)
    differences = {
        path: {"schema": expected[path], "pydantic": actual[path]}
        for path in expected
        if expected[path] != actual.get(path)
    }
    assert differences == {}


@pytest.mark.parametrize("fixture", FIXTURES, ids=lambda p: p.stem)
def test_every_fixture_validates_and_round_trips_exactly(fixture: Path) -> None:
    doc = json.loads(fixture.read_text(encoding="utf-8"))
    scene = Scene.model_validate(doc)
    assert scene.model_dump(mode="json", exclude_unset=True, by_alias=True) == doc


def test_there_are_fixtures_to_check() -> None:
    assert len(FIXTURES) >= 5


def _glyph_sheet() -> dict[str, Any]:
    return json.loads((FIXTURE_DIR / "glyph-sheet.json").read_text(encoding="utf-8"))


EXTRA_AT = [
    ("top level", lambda d: d),
    ("pitch", lambda d: d["pitch"]),
    ("team", lambda d: d["teams"][0]),
    ("entity", lambda d: d["entities"][0]),
    ("frame", lambda d: d["frames"][0]),
    ("position", lambda d: next(iter(d["frames"][0]["positions"].values()))),
    ("event", lambda d: d["events"][0]),
    ("annotation", lambda d: d["annotations"][0]),
    ("source", lambda d: d["source"]),
]


@pytest.mark.parametrize(("where", "pick"), EXTRA_AT, ids=[w for w, _ in EXTRA_AT])
def test_an_extra_property_is_rejected_everywhere(where: str, pick: Any) -> None:
    doc = copy.deepcopy(_glyph_sheet())
    Scene.model_validate(doc)  # the untouched sheet is valid
    pick(doc)["surprise"] = 1
    with pytest.raises(ValidationError, match="surprise"):
        Scene.model_validate(doc)
