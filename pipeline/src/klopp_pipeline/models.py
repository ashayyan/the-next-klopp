"""Row and matrix models for the open-data coverage matrix (RSCH-02)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

DataType = Literal["event", "360", "tracking", "broadcast-tracking", "physical"]
Status = Literal["ok", "unreachable", "request-only"]
Method = Literal["index", "documented", "manual"]
LicenceId = Literal[
    "statsbomb-public-data-user-agreement",
    "CC-BY-4.0",
    "MIT",
    "none-stated-informal-credit",
    "request-form-no-terms-stated",
]

UTC_Z = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$"


class CoverageRow(BaseModel):
    """One provider x competition x season x data type cell.

    ``pl_matches`` and ``matches_total`` are ``None`` exactly when the provider was unreachable:
    an unreachable provider never gets a guessed count, and a reachable one never gets ``None``.
    """

    provider: str
    dataset: str
    competition: str
    competition_id: str | None
    season: str
    data_type: DataType
    matches_total: int | None = Field(ge=0)
    pl_matches: int | None = Field(ge=0)
    status: Status
    method: Method
    licence_id: LicenceId
    licence_url: str | None
    source_url: str = Field(pattern=r"^https?://\S+$")
    fetched_at: str = Field(pattern=UTC_Z)
    notes: str = ""

    @model_validator(mode="after")
    def _counts_null_iff_unreachable(self) -> CoverageRow:
        unreachable = self.status == "unreachable"
        for name in ("matches_total", "pl_matches"):
            value = getattr(self, name)
            if unreachable and value is not None:
                raise ValueError(f"{name} must be null when status is unreachable")
            if not unreachable and value is None:
                raise ValueError(f"{name} must be an integer unless status is unreachable")
        return self


class CoverageMatrix(BaseModel):
    schema_version: Literal[1] = 1
    generated_at: str = Field(pattern=UTC_Z)
    script_version: str
    rows: list[CoverageRow]
