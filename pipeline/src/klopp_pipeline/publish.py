"""Copy shippable dataset versions into ``public/data`` and keep ``catalog.json`` in step (PIPE-02).

A version is copied only when its own manifest and the allow-list entry for its source both say
``shippable: true`` (threat T-03-16); anything else, including every local-only provider, never
reaches ``public/``. Copies are byte for byte and follow the same immutability rule as the writer:
an existing public version must already hold the same bytes. ``catalog.json`` is the only mutable
file under ``public/data``; it lists every shipped file with sha256 and byte count, carries no
timestamp, and is rewritten only when its content changes.
"""

from __future__ import annotations

import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from klopp_pipeline.manifest import (
    MANIFEST_NAME,
    ImmutableVersionError,
    ManifestError,
    check_name,
    inside,
    read_version,
    sha256_hex,
)
from klopp_pipeline.sources import AllowListFile

CATALOG_NAME = "catalog.json"
SCENE_PREFIX = "scene-"


@dataclass(frozen=True)
class PublishResult:
    catalog: Path
    copied: list[Path]  # version directories newly copied
    skipped: list[str]  # "<dataset>/<version>" refused because they are not shippable
    catalog_written: bool


def _versions(root: Path) -> list[Path]:
    """Version directories ``root/<dataset>/<version>`` that hold a manifest, sorted."""
    if not root.is_dir():
        return []
    found: list[Path] = []
    for dataset_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for version_dir in sorted(p for p in dataset_dir.iterdir() if p.is_dir()):
            if (version_dir / MANIFEST_NAME).is_file():
                found.append(version_dir)
    return found


def _copy_version(target: Path, files: dict[str, bytes], manifest_bytes: bytes) -> bool:
    """Copy one version byte for byte. Returns True when it was newly created."""
    expected = {**files, MANIFEST_NAME: manifest_bytes}
    if target.exists():
        same = target.is_dir() and {p.name for p in target.iterdir()} == set(expected)
        if same and all((target / n).read_bytes() == d for n, d in expected.items()):
            return False
        raise ImmutableVersionError(f"public/{target.parent.name}/{target.name} already exists with different content")
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = target.parent / f".{target.name}.tmp"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir()
    try:
        for name, data in expected.items():
            (staging / name).write_bytes(data)
        os.replace(staging, target)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    return True


def build_catalog(public_root: Path) -> bytes:
    """The catalog for every version currently under ``public_root`` (no timestamps)."""
    datasets: list[dict[str, Any]] = []
    for version_dir in _versions(public_root):
        manifest, files = read_version(version_dir)
        rel = f"{manifest.dataset}/{manifest.version}"
        entries = [{"path": f"{rel}/{MANIFEST_NAME}", "sha256": sha256_hex((version_dir / MANIFEST_NAME).read_bytes()), "bytes": (version_dir / MANIFEST_NAME).stat().st_size}]
        entries += [
            {"path": f"{rel}/{f.path}", "sha256": f.sha256, "bytes": f.bytes} for f in manifest.files
        ]
        scenes = []
        for name, data in sorted(files.items()):
            if name.startswith(SCENE_PREFIX):
                doc = json.loads(data)
                scenes.append({"id": doc["id"], "label": doc["label"], "path": f"{rel}/{name}"})
        datasets.append(
            {
                "dataset": manifest.dataset,
                "version": manifest.version,
                "license": manifest.license,
                "licenceUrl": manifest.licenceUrl,
                "attribution": manifest.attribution,
                "manifest": f"{rel}/{MANIFEST_NAME}",
                "files": sorted(entries, key=lambda e: e["path"]),
                "scenes": scenes,
            }
        )
    datasets.sort(key=lambda d: (d["dataset"], d["version"]))
    doc = {"schemaVersion": 1, "datasets": datasets}
    return (json.dumps(doc, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def publish(*, data_root: Path, public_root: Path, allow: AllowListFile) -> PublishResult:
    """Copy every shippable version from ``data_root`` to ``public_root`` and refresh the catalog."""
    shippable_sources = {s.id for s in allow.sources if s.shippable}
    copied: list[Path] = []
    skipped: list[str] = []
    for version_dir in _versions(data_root):
        manifest, files = read_version(version_dir)  # verifies hashes before anything is copied
        label = f"{manifest.dataset}/{manifest.version}"
        if not manifest.shippable or manifest.sourceId not in shippable_sources:
            skipped.append(label)
            continue
        check_name("dataset", manifest.dataset)
        check_name("version", manifest.version)
        target = inside(public_root, public_root / manifest.dataset / manifest.version)
        if _copy_version(target, files, (version_dir / MANIFEST_NAME).read_bytes()):
            copied.append(target)

    catalog_path = public_root / CATALOG_NAME
    catalog_bytes = build_catalog(public_root)
    written = False
    if not catalog_path.is_file() or catalog_path.read_bytes() != catalog_bytes:
        public_root.mkdir(parents=True, exist_ok=True)
        tmp = catalog_path.with_name(CATALOG_NAME + ".tmp")
        try:
            tmp.write_bytes(catalog_bytes)
            os.replace(tmp, catalog_path)
        except OSError as exc:
            tmp.unlink(missing_ok=True)
            raise ManifestError(f"could not write {catalog_path}: {exc}") from exc
        written = True
    return PublishResult(catalog_path, copied, skipped, written)
