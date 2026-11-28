"""pydantic mirror of the Scene v1 format (schemas/scene.schema.json, src/scene/schema.ts).

The JSON Schema is the language-neutral source of truth. This module lets the pipeline build and
validate scenes in Python; ``tests/test_scene_parity.py`` proves the two agree (every committed
fixture round-trips, and the property and required sets of both schemas are equal). Semantic rules
JSON Schema cannot express (frame order, references, pitch-relative bounds, licence rules) live in
``src/scene/validate.ts`` and run in Vitest over every committed pipeline output.

Presence rule (frozen): an entity's effective presence is ``presence`` if set, else ``sampled`` for
kind ``reconstruction`` and ``always`` otherwise.
"""

from __future__ import annotations

import json
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

KEBAB = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
HTTP_URL = r"^https?://[^\s/$.?#][^\s]*$"
SOURCE_ID = r"^src-[a-z0-9]+(?:-[a-z0-9]+)*(?:#[a-z0-9]+(?:-[a-z0-9]+)*)?$"

KebabId = Annotated[str, Field(pattern=KEBAB, max_length=80)]
Seconds = Annotated[float, Field(ge=0)]


class _Strict(BaseModel):
    """additionalProperties: false everywhere."""

    model_config = ConfigDict(extra="forbid")


class Point(_Strict):
    x: Annotated[float, Field(ge=-10, le=130)]
    y: Annotated[float, Field(ge=-10, le=100)]


class Pitch(_Strict):
    length: Annotated[float, Field(ge=90, le=120)]
    width: Annotated[float, Field(ge=45, le=90)]


class Team(_Strict):
    id: KebabId
    name: Annotated[str, Field(min_length=1, max_length=60)]
    side: Literal["a", "b"]
    venue: Literal["home", "away"] | None = None
    # Period "1".."5" to the attacking direction of that team in that period.
    attack: Annotated[
        dict[Annotated[str, Field(pattern=r"^[1-5]$")], Literal["ltr", "rtl"]],
        Field(min_length=1, max_length=5),
    ]


class Entity(_Strict):
    id: KebabId
    type: Literal["player", "goalkeeper", "ball"]
    team: KebabId | None = None
    number: Annotated[int, Field(ge=1, le=99)] | None = None
    label: Annotated[str, Field(min_length=1, max_length=40)] | None = None
    name: Annotated[str, Field(min_length=1, max_length=80)] | None = None
    role: Annotated[str, Field(min_length=1, max_length=40)] | None = None
    presence: Literal["always", "sampled"] | None = None


class Frame(_Strict):
    t: Annotated[float, Field(ge=0, le=10800)]
    positions: Annotated[dict[KebabId, Point], Field(max_length=64)]
    ballOwner: KebabId | None = None


Ref = Annotated[str, Field(min_length=1, max_length=64)]


class PassEvent(_Strict):
    id: KebabId
    type: Literal["pass"]
    t: Seconds
    tEnd: Seconds | None = None
    team: KebabId
    player: KebabId | None = None
    start: Point
    end: Point
    ref: Ref | None = None
    receiver: KebabId | None = None


class CarryEvent(_Strict):
    id: KebabId
    type: Literal["carry"]
    t: Seconds
    tEnd: Seconds | None = None
    team: KebabId
    player: KebabId
    start: Point
    end: Point
    ref: Ref | None = None


class RunEvent(_Strict):
    id: KebabId
    type: Literal["run"]
    t: Seconds
    tEnd: Seconds | None = None
    team: KebabId
    player: KebabId
    start: Point
    end: Point
    ref: Ref | None = None


class ShotEvent(_Strict):
    id: KebabId
    type: Literal["shot"]
    t: Seconds
    tEnd: Seconds | None = None
    team: KebabId
    player: KebabId | None = None
    start: Point
    end: Point
    ref: Ref | None = None
    goal: bool
    endApprox: bool | None = None


class PressureEvent(_Strict):
    id: KebabId
    type: Literal["pressure"]
    t: Seconds
    tEnd: Seconds | None = None
    team: KebabId
    player: KebabId
    start: Point
    end: Point
    ref: Ref | None = None
    target: KebabId | None = None


Event = Annotated[
    Union[PassEvent, CarryEvent, RunEvent, ShotEvent, PressureEvent],
    Field(discriminator="type"),
]


class ZoneAnnotation(_Strict):
    id: KebabId
    type: Literal["zone"]
    points: Annotated[list[Point], Field(min_length=3, max_length=32)]
    label: Annotated[str, Field(min_length=1, max_length=40)] | None = None
    from_: Seconds | None = Field(default=None, alias="from")
    to: Seconds | None = None

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class ShapeAnnotation(_Strict):
    id: KebabId
    type: Literal["shape"]
    team: KebabId
    members: Annotated[list[KebabId], Field(min_length=2, max_length=11)]
    closed: bool | None = None
    from_: Seconds | None = Field(default=None, alias="from")
    to: Seconds | None = None

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class HighlightAnnotation(_Strict):
    id: KebabId
    type: Literal["highlight"]
    target: KebabId | None = None
    at: Point | None = None
    from_: Seconds | None = Field(default=None, alias="from")
    to: Seconds | None = None

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class NoteAnnotation(_Strict):
    id: KebabId
    type: Literal["note"]
    text: Annotated[str, Field(min_length=1, max_length=200)]
    at: Point
    anchor: Point | None = None
    from_: Seconds | None = Field(default=None, alias="from")
    to: Seconds | None = None

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class PointAnnotation(_Strict):
    id: KebabId
    type: Literal["point"]
    at: Point
    label: Annotated[str, Field(min_length=1, max_length=12)] | None = None
    from_: Seconds | None = Field(default=None, alias="from")
    to: Seconds | None = None

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class SequenceAnnotation(_Strict):
    id: KebabId
    type: Literal["sequence"]
    events: Annotated[list[KebabId], Field(min_length=1, max_length=100)]


Annotation = Annotated[
    Union[
        ZoneAnnotation,
        ShapeAnnotation,
        HighlightAnnotation,
        NoteAnnotation,
        PointAnnotation,
        SequenceAnnotation,
    ],
    Field(discriminator="type"),
]


class Clock(_Strict):
    period: Annotated[int, Field(ge=1, le=5)]
    offsetSec: Annotated[float, Field(ge=0)]


class Source(_Strict):
    type: Literal["authored", "open-data"]
    provider: Literal["wyscout", "statsbomb", "dfl", "metrica", "skillcorner", "last-row"] | None = (
        None
    )
    sourceIds: Annotated[list[Annotated[str, Field(pattern=SOURCE_ID)]], Field(max_length=20)]
    licence: Annotated[str, Field(min_length=1, max_length=80)]
    licenceUrl: Annotated[str, Field(pattern=HTTP_URL)] | None = None
    attribution: Annotated[str, Field(min_length=1, max_length=400)]
    shippable: bool
    localOnly: bool | None = None
    logoRequired: bool | None = None
    matchId: Annotated[str, Field(min_length=1, max_length=40)] | None = None
    clock: Clock | None = None
    recipe: KebabId | None = None


class Scene(_Strict):
    id: KebabId
    schemaVersion: Literal[1]
    kind: Literal["authored", "board", "quiz-answer", "reconstruction"]
    label: Annotated[str, Field(min_length=1, max_length=120)]
    pitch: Pitch
    teams: Annotated[list[Team], Field(max_length=2)]
    entities: Annotated[list[Entity], Field(max_length=64)]
    frames: Annotated[list[Frame], Field(min_length=1, max_length=5000)]
    events: Annotated[list[Event], Field(max_length=500)]
    annotations: Annotated[list[Annotation], Field(max_length=100)]
    source: Source


def dump_scene(scene: Scene) -> bytes:
    """Canonical bytes: sorted keys, two-space indent, UTF-8, LF line endings, trailing newline."""
    doc = scene.model_dump(mode="json", exclude_none=True, by_alias=True)
    return (json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")
