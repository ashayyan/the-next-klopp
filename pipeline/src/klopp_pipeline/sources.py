"""The source allow-list (``pipeline/sources.allow.json``): the only URLs the pipeline may download.

Every file is https, on a host in ``net.ALLOWED_HOSTS``, and pinned: either by a sha256 or by a
40-hex git commit id inside the URL (a commit fixes the content). ``shippable`` records ADR 0008:
only Wyscout and DFL may ever reach the deployed bundle.
"""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from klopp_pipeline.net import ALLOWED_HOSTS, HTTPS_PORT, FetchError

# pipeline/src/klopp_pipeline/sources.py -> parents[1] is the pipeline/ folder
ALLOW_PATH = Path(__file__).resolve().parents[2] / "sources.allow.json"

_SHA256 = re.compile(r"[0-9a-f]{64}")
_COMMIT_IN_URL = re.compile(r"/[0-9a-f]{40}/")
_SAFE_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceFile(_Strict):
    name: str
    url: str
    bytes: int | None = Field(default=None, gt=0)  # expected size, informational
    maxBytes: int = Field(gt=0)  # download cap
    sha256: str | None = None
    figshareMd5: str | None = None  # the provider's own checksum, recorded for the audit trail

    @field_validator("name")
    @classmethod
    def _name_stays_in_its_folder(cls, name: str) -> str:
        if not _SAFE_NAME.fullmatch(name) or ".." in name:
            raise ValueError(f"file name {name!r} must be a plain file name")
        return name

    @field_validator("url")
    @classmethod
    def _url_is_allow_listed(cls, url: str) -> str:
        parts = urlsplit(url)
        if parts.scheme != "https":
            raise ValueError(f"{url!r} is not https")
        if parts.port not in (None, HTTPS_PORT):
            raise ValueError(f"{url!r} uses a port other than {HTTPS_PORT}")
        if (parts.hostname or "").lower() not in ALLOWED_HOSTS:
            raise ValueError(f"host of {url!r} is not in net.ALLOWED_HOSTS")
        return url

    @field_validator("sha256")
    @classmethod
    def _sha256_is_hex(cls, value: str | None) -> str | None:
        if value is not None and not _SHA256.fullmatch(value):
            raise ValueError("sha256 must be 64 lowercase hex characters")
        return value

    @model_validator(mode="after")
    def _is_pinned(self) -> SourceFile:
        if self.sha256 is None and not _COMMIT_IN_URL.search(self.url):
            raise ValueError(
                f"{self.name}: needs a sha256, or a url pinned to a 40-hex commit id"
            )
        return self


class Source(_Strict):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    licence: str
    licenceUrl: str
    shippable: bool
    attribution: str
    logoRequired: bool = False
    files: list[SourceFile] = Field(default_factory=list)

    @model_validator(mode="after")
    def _file_names_are_unique(self) -> Source:
        names = [f.name for f in self.files]
        if len(set(names)) != len(names):
            raise ValueError(f"{self.id}: duplicate file names")
        return self


class AllowListFile(_Strict):
    schemaVersion: int
    sources: list[Source]

    @model_validator(mode="after")
    def _ids_are_unique(self) -> AllowListFile:
        ids = [s.id for s in self.sources]
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate source ids")
        return self


def load_allow_list(path: Path = ALLOW_PATH) -> AllowListFile:
    return AllowListFile.model_validate_json(Path(path).read_bytes())


def get_source(allow: AllowListFile, source_id: str) -> Source:
    for source in allow.sources:
        if source.id == source_id:
            return source
    known = ", ".join(s.id for s in allow.sources)
    raise FetchError(f"{source_id!r} is not in the source allow-list (known: {known})")
