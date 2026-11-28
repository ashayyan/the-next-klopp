"""Hash-verified download of allow-listed source files into the git-ignored raw cache.

URLs come only from ``pipeline/sources.allow.json`` (validated: https, allow-listed host, pinned).
A file is written only after its sha256 matches the pin, so a half-finished or tampered download
never sits in ``pipeline/data/raw/``. A cached file is trusted only while it still hashes to the pin
(threat T-03-12); a bad one is deleted.
"""

from __future__ import annotations

import hashlib
import os
from collections.abc import Callable
from pathlib import Path

from klopp_pipeline import net
from klopp_pipeline.net import FetchError
from klopp_pipeline.sources import AllowListFile, SourceFile, get_source, load_allow_list

# pipeline/src/klopp_pipeline/fetch.py -> parents[1] is the pipeline/ folder
RAW_ROOT = Path(__file__).resolve().parents[2] / "data" / "raw"

DOWNLOAD_TIMEOUT_SECONDS = 900  # a 77 MB figshare file on a slow line

Fetcher = Callable[..., bytes]


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _cached_ok(path: Path, spec: SourceFile) -> bool:
    """True when a file is already cached and still matches its pin.

    A pinned file whose hash differs is deleted. An unpinned (commit-pinned) file is trusted as
    long as it is within the size cap, because the commit in the URL fixes its content on first
    download only; a later change on disk would go unnoticed. The shipped allow-list therefore
    carries a sha256 for every file, and the commit-only form is kept for new sources whose hash
    is not known yet.
    """
    if not path.is_file():
        return False
    if spec.sha256 is not None:
        if sha256_of(path) == spec.sha256:
            return True
        path.unlink()
        return False
    return path.stat().st_size <= spec.maxBytes


def _atomic_write(path: Path, content: bytes) -> None:
    tmp = path.with_name(path.name + ".tmp")
    try:
        tmp.write_bytes(content)
        os.replace(tmp, path)
    except OSError:
        tmp.unlink(missing_ok=True)
        raise


def fetch_source(
    source_id: str,
    *,
    allow: AllowListFile | None = None,
    raw_root: Path = RAW_ROOT,
    offline: bool = False,
    fetcher: Fetcher = net.fetch_bytes,
) -> dict[str, Path]:
    """Make sure every file of ``source_id`` is in ``raw_root/<source_id>/``, verified.

    Returns ``{file name: path}``. Raises ``FetchError`` for an unknown source, a source with no
    files, a hash mismatch, a failed or oversize download, or ``offline`` with a missing file.
    """
    source = get_source(allow if allow is not None else load_allow_list(), source_id)
    if not source.files:
        raise FetchError(f"source {source_id!r} has no files to fetch")

    folder = raw_root / source.id
    paths: dict[str, Path] = {}
    for spec in source.files:
        target = folder / spec.name
        existed = target.exists()
        if _cached_ok(target, spec):
            paths[spec.name] = target
            continue
        if offline:
            reason = "its sha256 did not match the pin and it was deleted" if existed else "it is not cached"
            raise FetchError(f"offline mode and {spec.name} cannot be used: {reason}")
        body = fetcher(
            spec.url,
            spec.maxBytes,
            cache=False,
            total_timeout_seconds=DOWNLOAD_TIMEOUT_SECONDS,
        )
        if spec.sha256 is not None:
            actual = hashlib.sha256(body).hexdigest()
            if actual != spec.sha256:
                raise FetchError(
                    f"sha256 mismatch for {spec.name}: expected {spec.sha256}, got {actual}"
                )
        folder.mkdir(parents=True, exist_ok=True)
        _atomic_write(target, body)
        paths[spec.name] = target
    return paths
