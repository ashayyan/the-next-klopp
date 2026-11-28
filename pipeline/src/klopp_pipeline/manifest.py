"""Immutable, content-addressed dataset versions with a manifest (PIPE-02).

Layout: ``<data_root>/<dataset>/<version>/{scene-<id>.json, ..., manifest.json}``. The version is
``v1-`` plus 12 hex of a sha256 over the sorted ``path:sha256`` lines of the data files, so the same
inputs always give the same directory and a different byte can only ever land in a new directory.
``write_version`` never overwrites: an existing directory must already hold the same bytes (a no-op)
or the write is refused (threat T-03-15). Dataset, version and file names are validated before any
path is built, and the resolved target must stay under ``data_root`` (T-03-14).

Files are written as bytes (UTF-8, LF) so Windows never adds a carriage return.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import kloppy
from pydantic import BaseModel, ConfigDict, Field

from klopp_pipeline.fetch import sha256_of
from klopp_pipeline.scene import Scene, dump_scene
from klopp_pipeline.sources import Source

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9.-]*$")
FILE_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*\.json$")
MANIFEST_NAME = "manifest.json"
VERSION_PREFIX = "v1-"
MAX_SHIPPABLE_FILE_BYTES = 1024 * 1024  # 1 MB per shipped file


class ManifestError(Exception):
    """A dataset, version, file or manifest was refused."""


class ImmutableVersionError(ManifestError):
    """An existing version directory would have to change."""


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ManifestFile(_Strict):
    path: str
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    bytes: int = Field(ge=0)


class ManifestInput(_Strict):
    name: str
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")


class Manifest(_Strict):
    schemaVersion: int = 1
    dataset: str
    version: str
    sourceId: str
    recipe: str
    license: str
    licenceUrl: str
    attribution: str
    shippable: bool
    logoRequired: bool
    kloppyVersion: str
    generatedAt: str
    rowCounts: dict[str, int]
    files: list[ManifestFile]
    inputs: list[ManifestInput]


@dataclass(frozen=True)
class VersionMeta:
    """What the manifest says about a version besides its files."""

    source_id: str
    recipe: str
    license: str
    licence_url: str
    attribution: str
    shippable: bool
    logo_required: bool = False
    row_counts: dict[str, int] = field(default_factory=dict)
    inputs: dict[str, str] = field(default_factory=dict)  # input file name -> sha256


@dataclass(frozen=True)
class WriteResult:
    path: Path
    created: bool  # False when the identical version already existed


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check_name(kind: str, value: str) -> str:
    if not NAME_RE.fullmatch(value) or ".." in value:
        raise ManifestError(f"{kind} name {value!r} must match {NAME_RE.pattern}")
    return value


def check_file_name(name: str) -> str:
    if name == MANIFEST_NAME or not FILE_RE.fullmatch(name) or ".." in name:
        raise ManifestError(f"file name {name!r} must be a plain lower-case .json name")
    return name


def version_id(files: dict[str, bytes]) -> str:
    lines = "".join(f"{path}:{sha256_hex(data)}\n" for path, data in sorted(files.items()))
    return VERSION_PREFIX + hashlib.sha256(lines.encode("utf-8")).hexdigest()[:12]


def dump_manifest(manifest: Manifest) -> bytes:
    doc = manifest.model_dump(mode="json")
    return (json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")


def inside(root: Path, target: Path) -> Path:
    """Resolve ``target`` and require it to sit under ``root`` (no ``..`` or symlink escape)."""
    resolved_root = root.resolve()
    resolved = target.resolve()
    if resolved != resolved_root and resolved_root not in resolved.parents:
        raise ManifestError(f"{target} resolves outside {root}")
    return resolved


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _same_bytes(directory: Path, files: dict[str, bytes]) -> bool:
    """True when ``directory`` holds exactly ``files`` plus a manifest, byte for byte."""
    if not directory.is_dir():
        return False
    on_disk = {p.name for p in directory.iterdir()}
    if on_disk != set(files) | {MANIFEST_NAME}:
        return False
    return all((directory / name).read_bytes() == data for name, data in files.items())


def _licence_facts_differ(directory: Path, meta: VersionMeta) -> list[str]:
    """Names of the licence facts in the stored manifest that differ from ``meta``.

    The version id hashes file bytes only, so a changed licence, attribution, licence URL, source,
    ``shippable`` or logo flag would otherwise be dropped silently and the old facts would keep
    shipping. ``generatedAt``, ``kloppyVersion``, row counts and inputs may differ between runs.
    """
    try:
        stored = Manifest.model_validate_json((directory / MANIFEST_NAME).read_bytes())
    except (OSError, ValueError) as exc:
        raise ManifestError(f"{directory.name} has no readable manifest: {exc}") from exc
    wanted = {
        "sourceId": meta.source_id,
        "license": meta.license,
        "licenceUrl": meta.licence_url,
        "attribution": meta.attribution,
        "shippable": meta.shippable,
        "logoRequired": meta.logo_required,
    }
    return [name for name, value in wanted.items() if getattr(stored, name) != value]


def write_version(
    dataset: str,
    files: dict[str, bytes],
    meta: VersionMeta,
    *,
    data_root: Path,
    now: str | None = None,
) -> WriteResult:
    """Write ``files`` and a manifest into ``data_root/<dataset>/<version>/``, or confirm they exist."""
    check_name("dataset", dataset)
    if not files:
        raise ManifestError("a version needs at least one data file")
    for name, data in files.items():
        check_file_name(name)
        if meta.shippable and len(data) > MAX_SHIPPABLE_FILE_BYTES:
            raise ManifestError(
                f"{name} is {len(data)} bytes, above the {MAX_SHIPPABLE_FILE_BYTES} byte cap for shipped files"
            )
    version = check_name("version", version_id(files))
    target = inside(data_root, data_root / dataset / version)

    if target.exists():
        if _same_bytes(target, files):
            changed = _licence_facts_differ(target, meta)
            if changed:
                raise ImmutableVersionError(
                    f"{dataset}/{version} already exists with different licence facts "
                    f"({', '.join(changed)}); versions are immutable, so the stored manifest "
                    "would keep the old facts. Change the scene content for a new version, or "
                    "delete an unpublished local copy under data/ on purpose."
                )
            return WriteResult(target, created=False)
        raise ImmutableVersionError(
            f"{dataset}/{version} already exists with different content; versions are immutable"
        )

    manifest = Manifest(
        dataset=dataset,
        version=version,
        sourceId=meta.source_id,
        recipe=meta.recipe,
        license=meta.license,
        licenceUrl=meta.licence_url,
        attribution=meta.attribution,
        shippable=meta.shippable,
        logoRequired=meta.logo_required,
        kloppyVersion=kloppy.__version__,
        generatedAt=now or _now(),
        rowCounts=dict(sorted(meta.row_counts.items())),
        files=[
            ManifestFile(path=name, sha256=sha256_hex(data), bytes=len(data))
            for name, data in sorted(files.items())
        ],
        inputs=[ManifestInput(name=n, sha256=h) for n, h in sorted(meta.inputs.items())],
    )

    parent = target.parent
    parent.mkdir(parents=True, exist_ok=True)
    staging = parent / f".{version}.tmp"
    if staging.exists():
        shutil.rmtree(staging)  # our own leftover from a crashed run
    staging.mkdir()
    try:
        for name, data in files.items():
            (staging / name).write_bytes(data)
        (staging / MANIFEST_NAME).write_bytes(dump_manifest(manifest))
        os.replace(staging, target)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    return WriteResult(target, created=True)


def read_version(directory: Path) -> tuple[Manifest, dict[str, bytes]]:
    """Read a version directory and verify every file against its manifest and the version id."""
    manifest = Manifest.model_validate_json((directory / MANIFEST_NAME).read_bytes())
    files: dict[str, bytes] = {}
    for entry in manifest.files:
        check_file_name(entry.path)
        data = (directory / entry.path).read_bytes()
        if sha256_hex(data) != entry.sha256 or len(data) != entry.bytes:
            raise ManifestError(f"{directory.name}/{entry.path} does not match its manifest")
        files[entry.path] = data
    if version_id(files) != manifest.version or directory.name != manifest.version:
        raise ManifestError(f"{directory} does not match its version id")
    return manifest, files


def write_scene_version(
    scene: Scene,
    *,
    source: Source,
    recipe: str,
    dataset: str,
    raw_root: Path,
    data_root: Path,
    now: str | None = None,
) -> WriteResult:
    """Write one recipe scene as a version, with the licence facts taken from the allow-list.

    The scene's own ``source.shippable`` must agree with the allow-list entry, so a recipe cannot
    mark a local-only provider shippable. Input hashes are those of the raw files actually on disk.
    """
    if scene.source.shippable != source.shippable:
        raise ManifestError(
            f"scene {scene.id} says shippable={scene.source.shippable} but the allow-list says "
            f"{source.shippable} for {source.id}"
        )
    inputs = {
        spec.name: sha256_of(raw_root / source.id / spec.name)
        for spec in source.files
        if (raw_root / source.id / spec.name).is_file()
    }
    meta = VersionMeta(
        source_id=source.id,
        recipe=recipe,
        license=source.licence,
        licence_url=source.licenceUrl,
        attribution=source.attribution,
        shippable=source.shippable,
        logo_required=source.logoRequired,
        row_counts={
            "scenes": 1,
            "entities": len(scene.entities),
            "frames": len(scene.frames),
            "events": len(scene.events),
        },
        inputs=inputs,
    )
    return write_version(
        dataset, {f"scene-{scene.id}.json": dump_scene(scene)}, meta, data_root=data_root, now=now
    )
