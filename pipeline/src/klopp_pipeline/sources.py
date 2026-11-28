"""The source allow-list (stub, filled in with the GREEN step)."""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel

ALLOW_PATH = Path(__file__).resolve().parents[2] / "sources.allow.json"


class SourceFile(BaseModel):
    name: str
    url: str
    maxBytes: int
    sha256: str | None = None


class Source(BaseModel):
    id: str
    licence: str
    licenceUrl: str
    shippable: bool
    attribution: str
    logoRequired: bool = False
    files: list[SourceFile] = []


class AllowListFile(BaseModel):
    schemaVersion: int = 1
    sources: list[Source] = []


def load_allow_list(path: Path = ALLOW_PATH) -> AllowListFile:
    return AllowListFile()
