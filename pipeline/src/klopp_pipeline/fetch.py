"""Hash-verified fetch of allow-listed source files (stub, filled in with the GREEN step)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

RAW_ROOT = Path(__file__).resolve().parents[2] / "data" / "raw"


def fetch_source(source_id: str, **kwargs: Any) -> dict[str, Path]:
    raise NotImplementedError(source_id)
