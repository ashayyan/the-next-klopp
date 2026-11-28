"""The allow-list file and the sha256-pinned fetcher (no network: a fake fetcher, tmp raw roots)."""

from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from klopp_pipeline import net
from klopp_pipeline.fetch import fetch_source
from klopp_pipeline.net import FetchError
from klopp_pipeline.sources import AllowListFile, Source, load_allow_list

BODY = b'{"hello": "world"}\n'
BODY_SHA = hashlib.sha256(BODY).hexdigest()
URL = "https://ndownloader.figshare.com/files/1"
COMMIT_URL = "https://raw.githubusercontent.com/o/r/4b73468fc5b0f1950f9f66fada70ad3a4f9327cb/a.json"


def allow(files: list[dict[str, Any]] | None = None, *, source_id: str = "demo") -> AllowListFile:
    default = [{"name": "a.json", "url": URL, "maxBytes": 1000, "sha256": BODY_SHA}]
    return AllowListFile.model_validate(
        {
            "schemaVersion": 1,
            "sources": [
                {
                    "id": source_id,
                    "licence": "CC-BY-4.0",
                    "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
                    "shippable": True,
                    "attribution": "Data: demo",
                    "files": default if files is None else files,
                }
            ],
        }
    )


class FakeFetcher:
    """Stands in for ``net.fetch_bytes`` and records every call."""

    def __init__(self, body: bytes | Exception = BODY) -> None:
        self.body = body
        self.calls: list[tuple[str, int, dict[str, Any]]] = []

    def __call__(self, url: str, max_bytes: int, **kwargs: Any) -> bytes:
        self.calls.append((url, max_bytes, kwargs))
        if isinstance(self.body, Exception):
            raise self.body
        return self.body


# --- the committed allow-list ------------------------------------------------------------------


def test_the_committed_allow_list_has_six_sources() -> None:
    assert len(load_allow_list().sources) == 6


def test_the_committed_allow_list_follows_adr_0008() -> None:
    shippable = {s.id: s.shippable for s in load_allow_list().sources}
    assert shippable == {
        "wyscout": True,
        "dfl": True,
        "statsbomb": False,
        "last-row": False,
        "metrica": False,
        "skillcorner": False,
    }
    by_id = {s.id: s for s in load_allow_list().sources}
    assert by_id["statsbomb"].logoRequired is True
    assert by_id["statsbomb"].licence == "statsbomb-public-data-user-agreement"
    assert by_id["wyscout"].licence == "CC-BY-4.0"


def test_the_wyscout_files_are_pinned() -> None:
    wyscout = next(s for s in load_allow_list().sources if s.id == "wyscout")
    assert [f.name for f in wyscout.files] == [
        "events.zip",
        "matches.zip",
        "players.json",
        "teams.json",
    ]
    assert all(f.sha256 and len(f.sha256) == 64 for f in wyscout.files)
    assert wyscout.files[0].sha256 == "877e015b716ffdeea18f04418e3f24fed307ed03c37ff305cabe1f47c4822a45"
    assert wyscout.files[0].maxBytes == 100_000_000
    assert all(f.maxBytes == 5_000_000 for f in wyscout.files[1:])


def test_statsbomb_files_are_commit_pinned_not_hash_pinned() -> None:
    statsbomb = next(s for s in load_allow_list().sources if s.id == "statsbomb")
    assert len(statsbomb.files) == 3
    assert all("/4b73468fc5b0f1950f9f66fada70ad3a4f9327cb/" in f.url for f in statsbomb.files)
    assert all(f.sha256 is None for f in statsbomb.files)


def test_sources_without_files_stay_listed_for_the_licence_record() -> None:
    by_id = {s.id: s for s in load_allow_list().sources}
    assert all(by_id[i].files == [] for i in ("dfl", "last-row", "metrica", "skillcorner"))


# --- allow-list validation ---------------------------------------------------------------------


@pytest.mark.parametrize(
    "bad_url",
    [
        "http://ndownloader.figshare.com/files/1",
        "https://example.com/files/1",
        "https://ndownloader.figshare.com:8443/files/1",
        "ftp://ndownloader.figshare.com/files/1",
    ],
)
def test_a_url_off_the_host_allow_list_is_refused(bad_url: str) -> None:
    with pytest.raises(ValidationError):
        allow([{"name": "a.json", "url": bad_url, "maxBytes": 10, "sha256": BODY_SHA}])


def test_a_file_without_sha256_needs_a_commit_pinned_url() -> None:
    with pytest.raises(ValidationError, match="sha256"):
        allow([{"name": "a.json", "url": URL, "maxBytes": 10, "sha256": None}])
    pinned = allow([{"name": "a.json", "url": COMMIT_URL, "maxBytes": 10, "sha256": None}])
    assert pinned.sources[0].files[0].sha256 is None


@pytest.mark.parametrize("name", ["../x.json", "a/b.json", "a\\b.json", "", ".."])
def test_a_file_name_cannot_leave_its_folder(name: str) -> None:
    with pytest.raises(ValidationError):
        allow([{"name": name, "url": URL, "maxBytes": 10, "sha256": BODY_SHA}])


def test_a_malformed_sha256_and_a_zero_cap_are_refused() -> None:
    with pytest.raises(ValidationError):
        allow([{"name": "a.json", "url": URL, "maxBytes": 10, "sha256": "abc"}])
    with pytest.raises(ValidationError):
        allow([{"name": "a.json", "url": URL, "maxBytes": 0, "sha256": BODY_SHA}])


def test_an_unknown_field_is_refused() -> None:
    doc = json.loads(allow().model_dump_json())
    doc["sources"][0]["surprise"] = 1
    with pytest.raises(ValidationError):
        AllowListFile.model_validate(doc)
    assert isinstance(allow().sources[0], Source)


# --- fetch_source ------------------------------------------------------------------------------


def test_an_unknown_source_names_the_allow_list(tmp_path: Path) -> None:
    with pytest.raises(FetchError, match="allow-list"):
        fetch_source("nope", allow=allow(), raw_root=tmp_path, fetcher=FakeFetcher())


def test_a_source_with_no_files_is_refused(tmp_path: Path) -> None:
    with pytest.raises(FetchError, match="no files to fetch"):
        fetch_source("demo", allow=allow([]), raw_root=tmp_path, fetcher=FakeFetcher())


def test_a_download_is_verified_and_written_under_the_source_folder(tmp_path: Path) -> None:
    fetcher = FakeFetcher()
    paths = fetch_source("demo", allow=allow(), raw_root=tmp_path, fetcher=fetcher)
    assert paths == {"a.json": tmp_path / "demo" / "a.json"}
    assert paths["a.json"].read_bytes() == BODY
    assert len(fetcher.calls) == 1
    url, cap, kwargs = fetcher.calls[0]
    assert (url, cap) == (URL, 1000)
    assert kwargs["cache"] is False
    assert kwargs["total_timeout_seconds"] == 900
    assert sorted(p.name for p in (tmp_path / "demo").iterdir()) == ["a.json"]  # no .tmp left


def test_a_cached_file_with_the_pinned_hash_skips_the_fetcher(tmp_path: Path) -> None:
    (tmp_path / "demo").mkdir()
    (tmp_path / "demo" / "a.json").write_bytes(BODY)
    fetcher = FakeFetcher()
    paths = fetch_source("demo", allow=allow(), raw_root=tmp_path, fetcher=fetcher)
    assert paths["a.json"].read_bytes() == BODY
    assert fetcher.calls == []


def test_a_cached_file_with_a_wrong_hash_is_deleted_and_offline_raises(tmp_path: Path) -> None:
    cached = tmp_path / "demo" / "a.json"
    cached.parent.mkdir()
    cached.write_bytes(b"tampered")
    fetcher = FakeFetcher()
    with pytest.raises(FetchError, match="sha256"):
        fetch_source("demo", allow=allow(), raw_root=tmp_path, offline=True, fetcher=fetcher)
    assert not cached.exists()
    assert fetcher.calls == []


def test_a_cached_file_with_a_wrong_hash_is_downloaded_again_online(tmp_path: Path) -> None:
    cached = tmp_path / "demo" / "a.json"
    cached.parent.mkdir()
    cached.write_bytes(b"tampered")
    fetcher = FakeFetcher()
    fetch_source("demo", allow=allow(), raw_root=tmp_path, fetcher=fetcher)
    assert cached.read_bytes() == BODY
    assert len(fetcher.calls) == 1


def test_a_body_that_differs_from_the_pin_raises_and_leaves_no_file(tmp_path: Path) -> None:
    with pytest.raises(FetchError, match="sha256"):
        fetch_source("demo", allow=allow(), raw_root=tmp_path, fetcher=FakeFetcher(b"changed upstream"))
    assert not (tmp_path / "demo" / "a.json").exists()
    assert not list((tmp_path / "demo").glob("*.tmp"))


def test_offline_with_no_cache_raises_without_calling_the_fetcher(tmp_path: Path) -> None:
    fetcher = FakeFetcher()
    with pytest.raises(FetchError, match="offline"):
        fetch_source("demo", allow=allow(), raw_root=tmp_path, offline=True, fetcher=fetcher)
    assert fetcher.calls == []


def test_a_fetcher_error_for_an_oversize_body_propagates(tmp_path: Path) -> None:
    boom = FetchError("response declares 9 bytes, cap is 5")
    with pytest.raises(FetchError, match="cap is 5"):
        fetch_source("demo", allow=allow(), raw_root=tmp_path, fetcher=FakeFetcher(boom))
    assert not (tmp_path / "demo" / "a.json").exists()


def test_a_commit_pinned_file_without_a_hash_is_accepted_as_downloaded(tmp_path: Path) -> None:
    files = [{"name": "a.json", "url": COMMIT_URL, "maxBytes": 1000, "sha256": None}]
    paths = fetch_source("demo", allow=allow(files), raw_root=tmp_path, fetcher=FakeFetcher())
    assert paths["a.json"].read_bytes() == BODY


# --- net.fetch_bytes keywords ------------------------------------------------------------------


class _Response(io.BytesIO):
    headers: dict[str, str] = {}

    def __enter__(self) -> _Response:
        return self

    def __exit__(self, *exc: object) -> None:
        return None


class _Opener:
    def open(self, request: Any, timeout: float) -> _Response:  # noqa: A003
        self.user_agent = request.get_header("User-agent")
        return _Response(BODY)


def test_cache_false_writes_no_cache_entry(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    opener = _Opener()
    monkeypatch.setattr(net, "build_opener", lambda: opener)
    data = net.fetch_bytes(URL, 1000, cache_dir=tmp_path, cache=False)
    assert data == BODY
    assert list(tmp_path.iterdir()) == []
    assert opener.user_agent.endswith("(open-data pipeline)")


def test_the_default_still_caches(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(net, "build_opener", lambda: _Opener())
    net.fetch_bytes(URL, 1000, cache_dir=tmp_path)
    assert len(list(tmp_path.iterdir())) == 2  # body and meta


def test_total_timeout_is_a_keyword_and_defaults_to_120(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[float] = []
    real = net._read_capped

    def spy(response: Any, max_bytes: int, url: str, total_timeout_seconds: float) -> bytes:
        seen.append(total_timeout_seconds)
        return real(response, max_bytes, url, total_timeout_seconds)

    monkeypatch.setattr(net, "_read_capped", spy)
    monkeypatch.setattr(net, "build_opener", lambda: _Opener())
    net.fetch_bytes(URL, 1000, cache_dir=tmp_path / "a")
    net.fetch_bytes(URL, 1000, cache_dir=tmp_path / "b", total_timeout_seconds=900)
    assert seen == [120, 900]
