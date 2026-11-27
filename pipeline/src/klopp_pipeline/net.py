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
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
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

TIMEOUT_SECONDS = 30
TOKEN_HOST = "api.github.com"
USER_AGENT = f"klopp-pipeline/{__version__} (open-data coverage check)"

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
) -> bytes:
    """GET ``url`` (cached) and return at most ``max_bytes`` bytes, else raise FetchError."""
    host = check_url(url)
    body_path, meta_path = _cache_paths(cache_dir, url)

    if not refresh:
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
            data = response.read(max_bytes + 1)
    except FetchError:
        raise
    except urllib.error.HTTPError as exc:
        raise FetchError(f"HTTP {exc.code} for {url}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise FetchError(f"{type(exc).__name__} fetching {url}") from exc
    if len(data) > max_bytes:
        raise FetchError(f"response for {url} exceeds the {max_bytes} byte cap")

    meta = {"url": url, "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    _write_cache(cache_dir, body_path, meta_path, data, meta)
    return data
