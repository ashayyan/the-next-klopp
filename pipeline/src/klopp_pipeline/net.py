"""Allow-listed, size-capped, cached https fetch for read-only open-data metadata.

Rules (threats T-02-04 to T-02-07): https only; host must be on ALLOWED_HOSTS on the first request
and on every redirect; 30 s timeout; the body is capped; responses are cached under
``pipeline/data/raw/`` (git-ignored). ``GITHUB_TOKEN`` is read from the environment, sent only to
api.github.com and never logged or written.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from klopp_pipeline import __version__

ALLOWED_HOSTS = frozenset(
    {
        "raw.githubusercontent.com",
        "api.github.com",
        "api.figshare.com",
        "ndownloader.figshare.com",
        "huggingface.co",
        # figshare file downloads redirect here (Cloudflare R2 bucket figshare-com-storage,
        # seen in the live run of 2026-11-27). Exact host, nothing broader.
        "44c1cec316ec56bca76dfd65d2882b20.r2.cloudflarestorage.com",
    }
)

TIMEOUT_SECONDS = 30  # per socket operation
TOTAL_TIMEOUT_SECONDS = 120  # wall-clock budget for the whole body, so a slow drip cannot hang a run
CHUNK_BYTES = 64 * 1024
HTTPS_PORT = 443
TOKEN_HOST = "api.github.com"
USER_AGENT = f"klopp-pipeline/{__version__} (open-data pipeline)"

# pipeline/src/klopp_pipeline/net.py -> parents[2] is the pipeline/ folder
DEFAULT_CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "coverage"


class FetchError(Exception):
    """A fetch was refused or failed. Never carries a secret."""


def check_url(url: str) -> str:
    """Return the host of an acceptable URL or raise FetchError."""
    parts = urlsplit(url)
    if parts.scheme != "https":
        raise FetchError(f"refused non-https URL scheme {parts.scheme!r}")
    host = (parts.hostname or "").lower()
    try:
        port = parts.port
    except ValueError as exc:
        raise FetchError("refused URL with an invalid port") from exc
    if port not in (None, HTTPS_PORT):
        raise FetchError(f"refused port {port}: only the default https port is allowed")
    if host not in ALLOWED_HOSTS:
        raise FetchError(f"refused host {host!r}: not on the allow-list")
    return host


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Refuses redirects to non-https or non-allow-listed hosts and strips the token elsewhere."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        host = check_url(newurl)
        new = super().redirect_request(req, fp, code, msg, headers, newurl)
        if new is not None and host != TOKEN_HOST:
            new.remove_header("Authorization")
        return new


def build_opener() -> urllib.request.OpenerDirector:
    return urllib.request.build_opener(_SafeRedirectHandler())


def _cache_paths(cache_dir: Path, url: str) -> tuple[Path, Path]:
    key = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return cache_dir / f"{key}.bin", cache_dir / f"{key}.meta.json"


def _read_capped(
    response: Any, max_bytes: int, url: str, total_timeout_seconds: float = TOTAL_TIMEOUT_SECONDS
) -> bytes:
    """Read at most ``max_bytes + 1`` bytes in chunks under a total wall-clock budget."""
    deadline = time.monotonic() + total_timeout_seconds
    chunks: list[bytes] = []
    size = 0
    while size <= max_bytes:
        chunk = response.read(min(CHUNK_BYTES, max_bytes + 1 - size))
        if not chunk:
            break
        chunks.append(chunk)
        size += len(chunk)
        if time.monotonic() > deadline:
            raise FetchError(f"response for {url} took longer than {total_timeout_seconds} s")
    return b"".join(chunks)


def _read_cache(body_path: Path, max_bytes: int, *, offline: bool, ttl_hours: float) -> bytes | None:
    """Return a usable cached body, or None. An unreadable cache entry counts as a miss."""
    try:
        if not body_path.exists():
            return None
        age_hours = (time.time() - body_path.stat().st_mtime) / 3600
        if not (offline or age_hours <= ttl_hours):
            return None
        data = body_path.read_bytes()
    except OSError:
        return None
    return data if len(data) <= max_bytes else None


def _atomic_write(path: Path, content: bytes) -> None:
    """Write beside the target, then ``os.replace``: a crash never leaves a truncated target."""
    tmp = path.with_name(path.name + ".tmp")
    try:
        tmp.write_bytes(content)
        os.replace(tmp, path)
    except OSError:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def _write_cache(
    cache_dir: Path, body_path: Path, meta_path: Path, data: bytes, meta: dict[str, str]
) -> None:
    """Body first, then meta, each atomic. A cache I/O error becomes a FetchError, not a crash."""
    try:
        cache_dir.mkdir(parents=True, exist_ok=True)
        _atomic_write(body_path, data)
        _atomic_write(meta_path, (json.dumps(meta, indent=2) + "\n").encode("utf-8"))
    except OSError as exc:
        raise FetchError(f"{type(exc).__name__} writing the cache for {meta['url']}") from exc


def fetch_bytes(
    url: str,
    max_bytes: int,
    *,
    cache_dir: Path = DEFAULT_CACHE_DIR,
    refresh: bool = False,
    offline: bool = False,
    ttl_hours: float = 24,
    cache: bool = True,
    total_timeout_seconds: float = TOTAL_TIMEOUT_SECONDS,
) -> bytes:
    """GET ``url`` and return at most ``max_bytes`` bytes, else raise FetchError.

    With ``cache=False`` nothing is read from or written to the cache (``fetch.py`` keeps its own
    hash-verified copy); ``total_timeout_seconds`` is the wall-clock budget for the whole body.
    """
    host = check_url(url)
    body_path, meta_path = _cache_paths(cache_dir, url)

    if cache and not refresh:
        cached = _read_cache(body_path, max_bytes, offline=offline, ttl_hours=ttl_hours)
        if cached is not None:
            return cached
    if offline:
        raise FetchError(f"offline mode and no usable cache entry for {url}")

    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    token = os.environ.get("GITHUB_TOKEN")
    if token and host == TOKEN_HOST:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with build_opener().open(request, timeout=TIMEOUT_SECONDS) as response:
            declared = response.headers.get("Content-Length")
            if declared is not None and declared.isdigit() and int(declared) > max_bytes:
                raise FetchError(f"response for {url} declares {declared} bytes, cap is {max_bytes}")
            data = _read_capped(response, max_bytes, url, total_timeout_seconds)
    except FetchError:
        raise
    except urllib.error.HTTPError as exc:
        raise FetchError(f"HTTP {exc.code} for {url}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise FetchError(f"{type(exc).__name__} fetching {url}") from exc
    if len(data) > max_bytes:
        raise FetchError(f"response for {url} exceeds the {max_bytes} byte cap")

    if cache:
        meta = {"url": url, "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
        _write_cache(cache_dir, body_path, meta_path, data, meta)
    return data


_UTC_Z = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")


def cache_fetched_at(url: str, cache_dir: Path = DEFAULT_CACHE_DIR) -> str | None:
    """UTC time the cached body for ``url`` was really downloaded, or None without a cache entry.

    Reads ``*.meta.json``; falls back to the body file's modification time when the meta file is
    missing or damaged (a crash between the two writes).
    """
    body_path, meta_path = _cache_paths(cache_dir, url)
    try:
        stamp = json.loads(meta_path.read_text(encoding="utf-8")).get("fetched_at")
        if isinstance(stamp, str) and _UTC_Z.fullmatch(stamp):
            return stamp
    except (OSError, ValueError, AttributeError):
        pass
    try:
        mtime = body_path.stat().st_mtime
    except OSError:
        return None
    return datetime.fromtimestamp(mtime, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class RecordingFetch:
    """``fetch_bytes`` that remembers when each body it served was really downloaded.

    A cached body can be days old (``--offline`` never expires). The coverage matrix labels every
    row with the oldest download time behind it, not with the time of the run.
    """

    def __init__(
        self,
        *,
        cache_dir: Path = DEFAULT_CACHE_DIR,
        refresh: bool = False,
        offline: bool = False,
        ttl_hours: float = 24,
    ) -> None:
        self.cache_dir = cache_dir
        self.refresh = refresh
        self.offline = offline
        self.ttl_hours = ttl_hours
        self._stamps: list[str] = []

    def __call__(self, url: str, max_bytes: int) -> bytes:
        data = fetch_bytes(
            url,
            max_bytes,
            cache_dir=self.cache_dir,
            refresh=self.refresh,
            offline=self.offline,
            ttl_hours=self.ttl_hours,
        )
        stamp = cache_fetched_at(url, self.cache_dir)
        if stamp is not None:
            self._stamps.append(stamp)
        return data

    def take_oldest(self) -> str | None:
        """Oldest download time seen since the last call (then forget), or None."""
        oldest = min(self._stamps) if self._stamps else None
        self._stamps.clear()
        return oldest
