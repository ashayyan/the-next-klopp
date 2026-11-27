"""Offline tests: every provider parses its recorded index to the research golden counts."""

from __future__ import annotations

import io
import json
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

import pytest

from klopp_pipeline import coverage, net
from klopp_pipeline.models import CoverageMatrix, CoverageRow
from klopp_pipeline.net import FetchError

FIXTURES = json.loads(
    (Path(__file__).parent / "fixtures" / "coverage_responses.json").read_text(encoding="utf-8")
)
NOW = "2026-11-27T12:00:00Z"


def fake_fetch(url: str, max_bytes: int) -> bytes:
    """Serve a recorded body for ``url``; an unrecorded URL behaves like an unreachable host."""
    entry = FIXTURES.get(url)
    if entry is None:
        raise FetchError(f"no fixture for {url}")
    kind, body = entry["kind"], entry["body"]
    if kind == "json":
        data = json.dumps(body).encode("utf-8")
    elif kind == "text":
        data = body.encode("utf-8")
    elif kind == "zip":
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for name, member in body.items():
                zf.writestr(name, json.dumps(member))
        data = buf.getvalue()
    else:  # pragma: no cover
        raise AssertionError(kind)
    if len(data) > max_bytes:
        raise FetchError(f"fixture for {url} exceeds {max_bytes}")
    return data


def rows_for(provider: str, rows: list[CoverageRow]) -> list[CoverageRow]:
    return [r for r in rows if r.provider == provider]


# --- StatsBomb (tracer) -------------------------------------------------------------------------
def test_statsbomb_pl_event_matches_are_418() -> None:
    rows = coverage.statsbomb_rows(fake_fetch, NOW)
    pl_events = [r for r in rows if r.data_type == "event" and r.competition_id == "2"]
    assert sorted(r.season for r in pl_events) == ["2003/2004", "2015/2016"]
    assert sorted(r.pl_matches for r in pl_events) == [38, 380]
    assert sum(r.pl_matches or 0 for r in pl_events) == 418


def test_statsbomb_pl_360_rows_have_zero_pl_matches() -> None:
    rows = coverage.statsbomb_rows(fake_fetch, NOW)
    pl_360 = [r for r in rows if r.data_type == "360" and r.competition_id == "2"]
    assert len(pl_360) == 2
    assert all(r.pl_matches == 0 and r.matches_total == 0 for r in pl_360)


def test_statsbomb_non_pl_360_season_counts_available_matches() -> None:
    rows = coverage.statsbomb_rows(fake_fetch, NOW)
    other_360 = [r for r in rows if r.data_type == "360" and r.competition_id != "2"]
    assert len(other_360) == 1
    row = other_360[0]
    assert row.pl_matches == 0
    assert row.matches_total is not None and row.matches_total > 0
    event = next(
        r
        for r in rows
        if r.data_type == "event"
        and (r.competition_id, r.season) == (row.competition_id, row.season)
    )
    assert row.matches_total <= (event.matches_total or 0)


def test_statsbomb_season_2003_notes_name_the_single_club() -> None:
    rows = coverage.statsbomb_rows(fake_fetch, NOW)
    row = next(r for r in rows if r.season == "2003/2004" and r.data_type == "event")
    assert "Arsenal" in row.notes


def test_pl_is_matched_by_id_and_exact_name_not_the_word_premier() -> None:
    comps = [
        {"competition_id": 99, "season_id": 1, "competition_name": "Premier League 2", "season_name": "x"}
    ]
    matches = [
        {
            "match_id": 1,
            "home_team": {"home_team_name": "A"},
            "away_team": {"away_team_name": "B"},
            "match_status_360": None,
        }
    ]

    def fetch(url: str, max_bytes: int) -> bytes:
        return json.dumps(comps if url.endswith("competitions.json") else matches).encode()

    (row,) = [r for r in coverage.statsbomb_rows(fetch, NOW) if r.data_type == "event"]
    assert row.pl_matches == 0


def test_run_coverage_and_write_outputs_round_trip(tmp_path: Path) -> None:
    matrix = coverage.run_coverage(fake_fetch, NOW, ["statsbomb"])
    json_path, md_path = coverage.write_outputs(matrix, tmp_path)
    reloaded = CoverageMatrix.model_validate_json(json_path.read_text(encoding="utf-8"))
    assert len(reloaded.rows) == len(matrix.rows)
    assert json_path.read_bytes().endswith(b"}\n")
    assert b"\r\n" not in json_path.read_bytes()
    markdown = md_path.read_text(encoding="utf-8")
    assert "As of 2026-11-27T12:00:00Z" in markdown
    assert "StatsBomb" in markdown


def test_row_model_rejects_a_guessed_count_for_an_unreachable_provider() -> None:
    base: dict[str, Any] = {
        "provider": "X",
        "dataset": "X",
        "competition": "n/a",
        "competition_id": None,
        "season": "n/a",
        "data_type": "event",
        "status": "unreachable",
        "method": "index",
        "licence_id": "MIT",
        "licence_url": None,
        "source_url": "https://example.org/",
        "fetched_at": NOW,
    }
    with pytest.raises(ValueError):
        CoverageRow(**base, matches_total=None, pl_matches=0)
    ok = CoverageRow(**base, matches_total=None, pl_matches=None)
    assert ok.pl_matches is None
    with pytest.raises(ValueError):
        CoverageRow(**{**base, "status": "ok"}, matches_total=None, pl_matches=None)


# --- other providers ----------------------------------------------------------------------------
def test_wyscout_england_is_380_premier_league_matches() -> None:
    rows = coverage.wyscout_rows(fake_fetch, NOW)
    assert len(rows) == 7
    assert all(r.data_type == "event" and r.licence_id == "CC-BY-4.0" for r in rows)
    england = [r for r in rows if r.matches_total == 380 and r.pl_matches == 380]
    assert len(england) == 1
    assert england[0].competition_id == "364"
    assert "Burnley" in england[0].notes
    assert all(r.pl_matches == 0 for r in rows if r is not england[0])


def test_wyscout_refuses_an_oversized_archive_member() -> None:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("matches_England.json", "[" + " " * (5 * 1024 * 1024 + 10) + "]")
    with pytest.raises(ValueError):
        coverage.wyscout_rows(lambda url, max_bytes: buf.getvalue(), NOW)


def test_skillcorner_has_20_matches_and_no_premier_league() -> None:
    (row,) = coverage.skillcorner_rows(fake_fetch, NOW)
    assert (row.matches_total, row.pl_matches) == (20, 0)
    assert row.data_type == "broadcast-tracking"
    assert row.licence_id == "MIT"
    assert "not_started" in row.notes


def test_dfl_has_7_matches_for_events_and_tracking() -> None:
    rows = coverage.dfl_rows(fake_fetch, NOW)
    for data_type in ("event", "tracking"):
        mine = [r for r in rows if r.data_type == data_type]
        assert sum(r.matches_total or 0 for r in mine) == 7
    assert all(r.pl_matches == 0 and r.licence_id == "CC-BY-4.0" for r in rows)


def test_metrica_has_3_anonymised_games() -> None:
    rows = coverage.metrica_rows(fake_fetch, NOW)
    assert {r.data_type for r in rows} == {"event", "tracking"}
    for r in rows:
        assert (r.matches_total, r.pl_matches) == (3, 0)
        assert r.licence_id == "none-stated-informal-credit"
        assert "anonymised" in r.notes


def test_last_row_has_13_premier_league_goals_of_19() -> None:
    (row,) = coverage.lastrow_rows(fake_fetch, NOW)
    assert (row.matches_total, row.pl_matches) == (19, 13)
    assert row.unit == "play"
    assert "19 goals, 13 in the Premier League, 6 in the Champions League" in row.notes
    assert row.method == "manual"
    assert row.licence_id == "none-stated-informal-credit"
    assert row.data_type == "tracking"


def test_last_row_deep_recount_agrees_with_the_manual_count() -> None:
    (row,) = coverage.lastrow_rows(fake_fetch, NOW, deep=True)
    assert (row.matches_total, row.pl_matches) == (19, 13)
    assert "recounted" in row.notes


def test_last_row_deep_falls_back_when_the_download_is_refused() -> None:
    def fetch(url: str, max_bytes: int) -> bytes:
        if url == coverage.LASTROW_CSV_URL:
            raise FetchError("refused")
        return fake_fetch(url, max_bytes)

    (row,) = coverage.lastrow_rows(fetch, NOW, deep=True)
    assert (row.matches_total, row.pl_matches) == (19, 13)
    assert "manual count kept" in row.notes


def test_pff_is_a_documented_request_only_row() -> None:
    (row,) = coverage.pff_rows(fake_fetch, NOW)
    assert row.status == "request-only" and row.method == "documented"
    assert (row.matches_total, row.pl_matches) == (64, 0)
    assert row.licence_id == "request-form-no-terms-stated"


def test_an_unreachable_provider_gives_one_honest_row_and_the_rest_continue() -> None:
    def fetch(url: str, max_bytes: int) -> bytes:
        if url == coverage.SKILLCORNER_MATCHES_URL:
            raise FetchError("host down")
        return fake_fetch(url, max_bytes)

    matrix = coverage.run_coverage(fetch, NOW)
    sc = rows_for("SkillCorner", matrix.rows)
    assert len(sc) == 1
    assert sc[0].status == "unreachable" and sc[0].pl_matches is None
    assert sc[0].matches_total is None
    others = [r for r in matrix.rows if r.provider != "SkillCorner"]
    assert others and all(r.status in ("ok", "request-only") for r in others)
    assert {r.provider for r in others} == {
        "StatsBomb",
        "Wyscout",
        "DFL",
        "Metrica",
        "Last Row",
        "PFF FC",
    }


def test_markdown_shows_unreachable_instead_of_zero() -> None:
    def fetch(url: str, max_bytes: int) -> bytes:
        if url == coverage.SKILLCORNER_MATCHES_URL:
            raise FetchError("host down")
        return fake_fetch(url, max_bytes)

    markdown = coverage.render_markdown(coverage.run_coverage(fetch, NOW))
    line = next(x for x in markdown.splitlines() if x.startswith("| SkillCorner |"))
    assert "unreachable" in line


# --- fetcher rules (threats T-02-04 to T-02-06) --------------------------------------------------
class FakeResponse:
    def __init__(self, body: bytes, headers: dict[str, str] | None = None) -> None:
        self._stream = io.BytesIO(body)
        self.headers = headers or {}

    def read(self, n: int = -1) -> bytes:
        return self._stream.read(n)

    def __enter__(self) -> FakeResponse:
        return self

    def __exit__(self, *exc: object) -> None:
        return None


class FakeOpener:
    def __init__(self, body: bytes = b"{}", headers: dict[str, str] | None = None) -> None:
        self.body = body
        self.headers = headers
        self.requests: list[Any] = []
        self.timeouts: list[float] = []

    def open(self, request: Any, timeout: float = 0) -> FakeResponse:
        self.requests.append(request)
        self.timeouts.append(timeout)
        return FakeResponse(self.body, self.headers)


def test_net_rejects_http_and_hosts_off_the_allow_list(tmp_path: Path) -> None:
    with pytest.raises(FetchError):
        net.fetch_bytes("http://raw.githubusercontent.com/x", 10, cache_dir=tmp_path)
    with pytest.raises(FetchError):
        net.fetch_bytes("https://example.org/x", 10, cache_dir=tmp_path)


def test_net_refuses_redirects_to_other_hosts() -> None:
    handler = net._SafeRedirectHandler()
    request = urllib.request.Request("https://api.figshare.com/v2/x")
    with pytest.raises(FetchError):
        handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example.org/x")
    with pytest.raises(FetchError):
        handler.redirect_request(request, None, 302, "Found", {}, "http://api.figshare.com/x")


def test_net_rejects_a_body_over_the_cap(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(net, "build_opener", lambda: FakeOpener(b"x" * 11))
    with pytest.raises(FetchError):
        net.fetch_bytes("https://raw.githubusercontent.com/x", 10, cache_dir=tmp_path)


def test_net_offline_with_an_empty_cache_raises(tmp_path: Path) -> None:
    with pytest.raises(FetchError):
        net.fetch_bytes("https://raw.githubusercontent.com/x", 10, cache_dir=tmp_path, offline=True)


def test_net_caches_and_serves_the_second_call_from_disk(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    opener = FakeOpener(b"hello")
    monkeypatch.setattr(net, "build_opener", lambda: opener)
    url = "https://raw.githubusercontent.com/x"
    assert net.fetch_bytes(url, 100, cache_dir=tmp_path) == b"hello"
    assert net.fetch_bytes(url, 100, cache_dir=tmp_path) == b"hello"
    assert len(opener.requests) == 1
    assert net.fetch_bytes(url, 100, cache_dir=tmp_path, offline=True) == b"hello"
    metas = list(tmp_path.glob("*.meta.json"))
    assert len(metas) == 1 and "fetched_at" in metas[0].read_text(encoding="utf-8")


def test_github_token_is_sent_only_to_api_github_com(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GITHUB_TOKEN", "secret-token")
    opener = FakeOpener()
    monkeypatch.setattr(net, "build_opener", lambda: opener)
    net.fetch_bytes("https://api.github.com/repos/x", 100, cache_dir=tmp_path)
    net.fetch_bytes("https://raw.githubusercontent.com/y", 100, cache_dir=tmp_path)
    api, raw = opener.requests
    assert api.get_header("Authorization") == "Bearer secret-token"
    assert raw.get_header("Authorization") is None
    assert "klopp-pipeline" in raw.get_header("User-agent")
    for path in tmp_path.iterdir():
        assert b"secret-token" not in path.read_bytes()


def test_net_cache_write_is_atomic_and_leaves_no_temp_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(net, "build_opener", lambda: FakeOpener(b"hello"))
    net.fetch_bytes("https://raw.githubusercontent.com/x", 100, cache_dir=tmp_path)
    assert not list(tmp_path.glob("*.tmp"))
    assert len(list(tmp_path.glob("*.bin"))) == 1


def test_net_cache_write_error_is_a_fetch_error_and_cleans_up(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(net, "build_opener", lambda: FakeOpener(b"hello"))

    def boom(src: Any, dst: Any) -> None:
        raise PermissionError("locked")

    monkeypatch.setattr(net.os, "replace", boom)
    with pytest.raises(FetchError):
        net.fetch_bytes("https://raw.githubusercontent.com/x", 100, cache_dir=tmp_path)
    assert not list(tmp_path.glob("*.tmp"))
    assert not list(tmp_path.glob("*.bin"))


def test_net_unreadable_cache_entry_is_a_miss_not_a_crash(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    opener = FakeOpener(b"fresh")
    monkeypatch.setattr(net, "build_opener", lambda: opener)
    url = "https://raw.githubusercontent.com/x"
    net.fetch_bytes(url, 100, cache_dir=tmp_path)

    def locked(self: Path) -> bytes:
        raise PermissionError("locked")

    monkeypatch.setattr(Path, "read_bytes", locked)
    assert net.fetch_bytes(url, 100, cache_dir=tmp_path) == b"fresh"
    assert len(opener.requests) == 2


# --- provenance: rows carry the real download time, not the run time (WR-03) -----------------------
def test_cache_fetched_at_reads_the_meta_file_and_falls_back_to_the_body_mtime(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(net, "build_opener", lambda: FakeOpener(b"hello"))
    url = "https://raw.githubusercontent.com/x"
    assert net.cache_fetched_at(url, tmp_path) is None
    net.fetch_bytes(url, 100, cache_dir=tmp_path)
    (meta,) = tmp_path.glob("*.meta.json")
    meta.write_text(json.dumps({"url": url, "fetched_at": "2026-01-02T03:04:05Z"}), encoding="utf-8")
    assert net.cache_fetched_at(url, tmp_path) == "2026-01-02T03:04:05Z"
    meta.write_text("{not json", encoding="utf-8")
    stamp = net.cache_fetched_at(url, tmp_path)
    assert stamp is not None and stamp.endswith("Z")


def test_an_offline_run_stamps_rows_with_the_cached_download_time(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url = coverage.METRICA_URL
    listing = json.dumps([{"type": "dir", "name": "Sample_Game_1"}]).encode("utf-8")
    monkeypatch.setattr(net, "build_opener", lambda: FakeOpener(listing))
    net.fetch_bytes(url, coverage.MB, cache_dir=tmp_path)
    (meta,) = tmp_path.glob("*.meta.json")
    meta.write_text(json.dumps({"url": url, "fetched_at": "2026-10-01T08:00:00Z"}), encoding="utf-8")

    fetch = net.RecordingFetch(cache_dir=tmp_path, offline=True)
    matrix = coverage.run_coverage(fetch, NOW, ["metrica", "pff"])
    metrica = [r for r in matrix.rows if r.provider == "Metrica"]
    assert metrica and all(r.fetched_at == "2026-10-01T08:00:00Z" for r in metrica)
    (pff,) = [r for r in matrix.rows if r.provider == "PFF FC"]
    assert pff.fetched_at == NOW
    assert matrix.generated_at == "2026-10-01T08:00:00Z"


def test_a_plain_fetch_function_keeps_the_run_time() -> None:
    matrix = coverage.run_coverage(fake_fetch, NOW, ["metrica"])
    assert matrix.generated_at == NOW
    assert all(r.fetched_at == NOW for r in matrix.rows)


def test_headline_labels_play_counts_and_keeps_match_counts_plain() -> None:
    markdown = coverage.render_markdown(coverage.run_coverage(fake_fetch, NOW, ["wyscout", "lastrow"]))
    lastrow = next(x for x in markdown.splitlines() if x.startswith("| Last Row |"))
    wyscout = next(x for x in markdown.splitlines() if x.startswith("| Wyscout |"))
    assert "13 plays" in lastrow
    assert "plays" not in wyscout
    assert "| play | 19 | 13 |" in markdown


def test_malformed_provider_json_gives_an_unreachable_row_not_a_crash() -> None:
    def fetch(url: str, max_bytes: int) -> bytes:
        if url == coverage.METRICA_URL:
            return b'["not a dict"]'  # entries are strings: e["type"] raises TypeError
        if url == coverage.SKILLCORNER_MATCHES_URL:
            return b"[null]"  # None["competition_id"] raises TypeError
        if url == coverage.DFL_ARTICLE_URL:
            return b'{"files": "oops"}'  # str has no mapping access: TypeError
        return fake_fetch(url, max_bytes)

    matrix = coverage.run_coverage(fetch, NOW, ["metrica", "skillcorner", "dfl", "pff"])
    status = {r.provider: r.status for r in matrix.rows}
    assert status["Metrica"] == status["SkillCorner"] == status["DFL"] == "unreachable"
    assert status["PFF FC"] == "request-only"


def test_a_provider_bug_that_is_not_a_listed_error_is_still_one_unreachable_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def broken(fetch: Any, now: str) -> list[CoverageRow]:
        raise AttributeError("'list' object has no attribute 'get'")

    monkeypatch.setitem(coverage.PROVIDERS, "metrica", broken)
    matrix = coverage.run_coverage(fake_fetch, NOW, ["metrica", "pff"])
    (row,) = [r for r in matrix.rows if r.provider == "Metrica"]
    assert row.status == "unreachable" and "AttributeError" in row.notes
    assert any(r.provider == "PFF FC" for r in matrix.rows)


def test_last_row_deep_recount_survives_a_csv_error() -> None:
    def fetch(url: str, max_bytes: int) -> bytes:
        if url == coverage.LASTROW_CSV_URL:
            return b'play\n"' + b"x" * 200_000 + b'"\n'  # one field over csv's size limit
        return fake_fetch(url, max_bytes)

    (row,) = coverage.lastrow_rows(fetch, NOW, deep=True)
    assert (row.matches_total, row.pl_matches) == (19, 13)
    assert "manual count kept" in row.notes


# --- fetcher rules, second pass (WR-11) ---------------------------------------------------------
def test_net_strips_the_token_when_a_redirect_leaves_api_github_com() -> None:
    handler = net._SafeRedirectHandler()
    request = urllib.request.Request(
        "https://api.github.com/repos/x", headers={"Authorization": "Bearer secret-token"}
    )
    away = handler.redirect_request(
        request, None, 302, "Found", {}, "https://raw.githubusercontent.com/y"
    )
    assert away is not None and away.get_header("Authorization") is None
    same = handler.redirect_request(request, None, 302, "Found", {}, "https://api.github.com/z")
    assert same is not None and same.get_header("Authorization") == "Bearer secret-token"


def test_net_rejects_a_declared_content_length_over_the_cap(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    opener = FakeOpener(b"tiny", headers={"Content-Length": "999"})
    monkeypatch.setattr(net, "build_opener", lambda: opener)
    with pytest.raises(FetchError, match="declares 999"):
        net.fetch_bytes("https://raw.githubusercontent.com/x", 10, cache_dir=tmp_path)
    assert not list(tmp_path.iterdir())


def test_net_passes_the_timeout_to_every_request(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    opener = FakeOpener()
    monkeypatch.setattr(net, "build_opener", lambda: opener)
    net.fetch_bytes("https://raw.githubusercontent.com/x", 100, cache_dir=tmp_path)
    assert opener.timeouts == [net.TIMEOUT_SECONDS]


def test_net_stops_a_slow_drip_at_the_wall_clock_budget(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    clock = iter([0.0, 1.0, net.TOTAL_TIMEOUT_SECONDS + 5.0, net.TOTAL_TIMEOUT_SECONDS + 6.0])
    monkeypatch.setattr(net.time, "monotonic", lambda: next(clock))
    monkeypatch.setattr(net, "build_opener", lambda: FakeOpener(b"x" * 90, headers=None))
    monkeypatch.setattr(net, "CHUNK_BYTES", 10)
    with pytest.raises(FetchError, match="took longer"):
        net.fetch_bytes("https://raw.githubusercontent.com/x", 1000, cache_dir=tmp_path)
    assert not list(tmp_path.iterdir())


def test_net_rejects_a_non_default_port_and_an_invalid_port() -> None:
    for url in (
        "https://api.github.com:8443/x",
        "https://raw.githubusercontent.com:80/x",
        "https://api.github.com:notaport/x",
    ):
        with pytest.raises(FetchError):
            net.check_url(url)
    assert net.check_url("https://api.github.com:443/x") == "api.github.com"
