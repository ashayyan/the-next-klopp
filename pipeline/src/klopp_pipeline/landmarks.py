"""Landmark parity fixture: provider coordinates converted to canonical metres by kloppy itself.

The TypeScript converters in ``src/pitch/coords.ts`` port kloppy 3.19.1's zone-warp algorithm.
This module asks kloppy for the expected values and writes them to
``src/pitch/fixtures/landmarks.json``; Vitest and pytest both check that one committed file, so
the two languages cannot drift (cross-language parity). An exact kloppy pin plus ``--check``
turns any behaviour change in a kloppy upgrade into a failing diff.

Only coordinate systems are built here. No kloppy loader or ``load_open_data`` is ever called:
nothing in this module touches the network.
"""

from __future__ import annotations

import json
import math
from importlib.metadata import version
from pathlib import Path
from typing import Any

from kloppy.domain import (
    CustomCoordinateSystem,
    DatasetType,
    Dimension,
    MetricPitchDimensions,
    Origin,
    Point,
    Provider,
    VerticalOrientation,
)
from kloppy.domain.models.common import build_coordinate_system
from kloppy.domain.services.transformers import DatasetTransformer

KLOPPY_VERSION = "3.19.1"
GENERATED_BY = "klopp-pipeline landmarks"

# provider id used by src/pitch/coords.ts -> (kloppy provider, dataset type)
PROVIDER_SYSTEMS: dict[str, tuple[Provider, DatasetType]] = {
    "statsbomb": (Provider.STATSBOMB, DatasetType.EVENT),
    "opta": (Provider.OPTA, DatasetType.EVENT),
    "wyscout": (Provider.WYSCOUT, DatasetType.EVENT),
    "tracab": (Provider.TRACAB, DatasetType.TRACKING),
    # Centre origin, metres, y up: Sportec/DFL tracking (also SkillCorner, PFF, Second Spectrum).
    "tracking-metres": (Provider.SPORTEC, DatasetType.TRACKING),
    "metrica": (Provider.METRICA, DatasetType.TRACKING),
}

STANDARD = (105.0, 68.0)

# (provider, case name, provider-native input) on the 105 x 68 target pitch.
LANDMARK_INPUTS: dict[str, list[tuple[str, tuple[float, float]]]] = {
    "statsbomb": [
        ("centre spot", (60, 40)),
        ("left penalty spot", (12, 40)),
        ("right penalty spot", (108, 40)),
        ("left penalty-area corner, top", (18, 18)),
        ("left penalty-area corner, bottom", (18, 62)),
        ("right penalty-area corner, top", (102, 18)),
        ("right penalty-area corner, bottom", (102, 62)),
        ("left goal-area corner, top", (6, 30)),
        ("left goal-area corner, bottom", (6, 50)),
        ("right goal-area corner, top", (114, 30)),
        ("right goal-area corner, bottom", (114, 50)),
        ("corner flag, top-left", (0, 0)),
        ("corner flag, bottom-left", (0, 80)),
        ("corner flag, top-right", (120, 0)),
        ("corner flag, bottom-right", (120, 80)),
        ("left goalpost, top", (0, 36)),
        ("left goalpost, bottom", (0, 44)),
    ],
    "opta": [
        ("centre spot", (50, 50)),
        ("left penalty spot", (11.5, 50)),
        ("right penalty spot", (88.5, 50)),
        ("left penalty-area corner, top", (17, 78.9)),
        ("left penalty-area corner, bottom", (17, 21.1)),
        ("right penalty-area corner, top", (83, 78.9)),
        ("right penalty-area corner, bottom", (83, 21.1)),
        ("left goal-area corner, top", (5.8, 63.2)),
        ("left goal-area corner, bottom", (5.8, 36.8)),
        ("right goal-area corner, top", (94.2, 63.2)),
        ("right goal-area corner, bottom", (94.2, 36.8)),
        ("corner flag, top-left", (0, 100)),
        ("corner flag, bottom-left", (0, 0)),
        ("corner flag, top-right", (100, 100)),
        ("corner flag, bottom-right", (100, 0)),
    ],
    "wyscout": [
        ("centre spot", (50, 50)),
        ("left penalty spot", (10, 50)),
        ("right penalty spot", (90, 50)),
        ("left penalty-area corner, top", (16, 19)),
        ("left penalty-area corner, bottom", (16, 81)),
        ("right penalty-area corner, top", (84, 19)),
        ("right penalty-area corner, bottom", (84, 81)),
        ("left goal-area corner, top", (6, 37)),
        ("left goal-area corner, bottom", (6, 63)),
        ("right goal-area corner, top", (94, 37)),
        ("right goal-area corner, bottom", (94, 63)),
        ("corner flag, top-left", (0, 0)),
        ("corner flag, bottom-left", (0, 100)),
        ("corner flag, top-right", (100, 0)),
        ("corner flag, bottom-right", (100, 100)),
    ],
    "tracab": [
        ("centre spot", (0, 0)),
        ("left penalty spot", (-4150, 0)),
        ("right penalty spot", (4150, 0)),
        ("left penalty-area corner, top", (-3600, 2016)),
        ("corner flag, bottom-left", (-5250, -3400)),
        ("corner flag, top-right", (5250, 3400)),
    ],
    "tracking-metres": [
        ("centre spot", (0, 0)),
        ("left penalty spot", (-41.5, 0)),
        ("right penalty spot", (41.5, 0)),
        ("left penalty-area corner, top", (-36, 20.16)),
        ("corner flag, bottom-left", (-52.5, -34)),
        ("corner flag, top-right", (52.5, 34)),
    ],
    "metrica": [
        ("centre spot", (0.5, 0.5)),
        ("left penalty spot", (11 / 105, 0.5)),
        ("corner flag, top-left", (0, 0)),
        ("corner flag, bottom-right", (1, 1)),
    ],
}

# A point near the left mark must not land near the right one (and top must not land bottom).
ASYMMETRY_INPUTS: list[tuple[str, str, tuple[float, float]]] = [
    ("statsbomb", "asymmetry: near left spot", (14, 40)),
    ("statsbomb", "asymmetry: near right spot", (106, 40)),
    ("opta", "asymmetry: left, top (y flips)", (20, 80)),
    ("opta", "asymmetry: left, bottom (y flips)", (20, 20)),
    ("wyscout", "asymmetry: left, bottom (no y flip)", (20, 80)),
    ("wyscout", "asymmetry: left, top (no y flip)", (20, 20)),
    ("tracab", "asymmetry: left half, top", (-3000, 2000)),
]

FULHAM = (100.0, 65.0)

# Non-standard scene pitch (Fulham, registered 100 x 65 m).
FULHAM_INPUTS: list[tuple[str, str, tuple[float, float]]] = [
    ("statsbomb", "fulham: left penalty spot", (12, 40)),
    ("statsbomb", "fulham: right penalty spot", (108, 40)),
    ("statsbomb", "fulham: left penalty-area corner, top", (18, 18)),
    ("statsbomb", "fulham: right penalty-area corner, bottom", (102, 62)),
    ("statsbomb", "fulham: corner flag, bottom-right", (120, 80)),
    ("opta", "fulham: left penalty spot", (11.5, 50)),
    ("opta", "fulham: right penalty spot", (88.5, 50)),
    ("opta", "fulham: left penalty-area corner, top", (17, 78.9)),
    ("wyscout", "fulham: left penalty spot", (10, 50)),
    ("wyscout", "fulham: right penalty spot", (90, 50)),
    ("wyscout", "fulham: left penalty-area corner, top", (16, 19)),
]

# Tracking from a 100 x 65 m pitch placed in a 105 x 68 m scene: zone warp on both sides.
SOURCE_PITCH_INPUTS: list[tuple[str, str, tuple[float, float]]] = [
    ("tracking-metres", "100x65 source: centre spot", (0, 0)),
    ("tracking-metres", "100x65 source: left penalty spot", (-39, 0)),
    ("tracking-metres", "100x65 source: corner flag, bottom-left", (-50, -32.5)),
    ("tracking-metres", "100x65 source: corner flag, top-right", (50, 32.5)),
]

# Run-off points outside the provider range fall back to kloppy's global per-axis scale.
RUNOFF_INPUTS: list[tuple[str, str, tuple[float, float]]] = [
    ("statsbomb", "run-off: before top-left", (-2, -2)),
    ("statsbomb", "run-off: beyond bottom-right", (122, 82)),
    ("opta", "run-off: before bottom-left", (-2, -2)),
    ("opta", "run-off: beyond top-right", (102, 102)),
    ("wyscout", "run-off: before top-left", (-2, -2)),
    ("wyscout", "run-off: beyond bottom-right", (102, 102)),
    ("tracking-metres", "run-off: behind the left goal line", (-55.5, 0)),
]


def _target(length: float, width: float) -> CustomCoordinateSystem:
    """Canonical frame: metres, origin top-left, y down, IFAB landmarks on the scene pitch."""
    return CustomCoordinateSystem(
        Origin.TOP_LEFT,
        VerticalOrientation.TOP_TO_BOTTOM,
        MetricPitchDimensions(
            x_dim=Dimension(0, length),
            y_dim=Dimension(0, width),
            pitch_length=length,
            pitch_width=width,
            standardized=False,
        ),
    )


def convert(
    provider: str,
    point: tuple[float, float],
    target: tuple[float, float] = STANDARD,
    source: tuple[float, float] | None = None,
) -> tuple[float, float]:
    """Convert one provider-native point to canonical metres with kloppy's own transformer.

    ``source`` is the real pitch size for pitch-sized providers (tracking, Metrica); fixed-axis
    event providers take the target size as their real pitch, as kloppy does on load.
    """
    kloppy_provider, dataset_type = PROVIDER_SYSTEMS[provider]
    length, width = source if source is not None else target
    transformer = DatasetTransformer(
        from_coordinate_system=build_coordinate_system(
            kloppy_provider, dataset_type=dataset_type, pitch_length=length, pitch_width=width
        ),
        to_coordinate_system=_target(*target),
    )
    # The point conversion is name-mangled in kloppy 3.19.1 (03-RESEARCH Pattern 3).
    out = transformer._DatasetTransformer__change_point_coordinate_system(Point(*point))  # noqa: SLF001
    return (float(out.x), float(out.y))


def _case(
    provider: str,
    name: str,
    point: tuple[float, float],
    target: tuple[float, float] = STANDARD,
    source: tuple[float, float] | None = None,
) -> dict[str, Any]:
    case: dict[str, Any] = {
        "provider": provider,
        "name": name,
        "targetPitch": {"length": target[0], "width": target[1]},
    }
    if source is not None:
        case["sourcePitch"] = {"length": source[0], "width": source[1]}
    case["input"] = [float(point[0]), float(point[1])]
    case["expected"] = list(convert(provider, point, target, source))
    return case


def generate() -> dict[str, Any]:
    """Every parity case, with kloppy's full-precision expected values."""
    installed = version("kloppy")
    if installed != KLOPPY_VERSION:
        raise RuntimeError(f"kloppy {installed} installed; the fixture is pinned to {KLOPPY_VERSION}")
    cases: list[dict[str, Any]] = []
    for provider, inputs in LANDMARK_INPUTS.items():
        cases.extend(_case(provider, name, point) for name, point in inputs)
    cases.extend(_case(p, name, point) for p, name, point in ASYMMETRY_INPUTS)
    cases.extend(_case(p, name, point, target=FULHAM) for p, name, point in FULHAM_INPUTS)
    cases.extend(_case(p, name, point, source=FULHAM) for p, name, point in SOURCE_PITCH_INPUTS)
    cases.extend(_case(p, name, point) for p, name, point in RUNOFF_INPUTS)
    return {"kloppyVersion": KLOPPY_VERSION, "generatedBy": GENERATED_BY, "cases": cases}


def write(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(generate(), indent=2, ensure_ascii=False) + "\n"
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def _equal(a: Any, b: Any) -> bool:
    """Parsed-value equality; floats within 1e-12 so JSON formatting never matters."""
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(float(a), float(b), rel_tol=0, abs_tol=1e-12)
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_equal(a[k], b[k]) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_equal(x, y) for x, y in zip(a, b, strict=True))
    return a == b


def diff_summary(path: Path) -> str | None:
    """None when the committed file equals a fresh kloppy run, else a one-line summary."""
    if not path.exists():
        return f"{path} does not exist"
    committed = json.loads(path.read_text(encoding="utf-8"))
    fresh = generate()
    if _equal(committed, fresh):
        return None
    c_cases = committed.get("cases", []) if isinstance(committed, dict) else []
    f_cases = fresh["cases"]
    if len(c_cases) != len(f_cases):
        return f"case count differs: committed {len(c_cases)}, kloppy {len(f_cases)}"
    for i, (c, f) in enumerate(zip(c_cases, f_cases, strict=True)):
        if not _equal(c, f):
            return f"case {i} ({f['provider']}: {f['name']}) differs"
    return "header fields differ"


def check(path: Path) -> bool:
    return diff_summary(path) is None
