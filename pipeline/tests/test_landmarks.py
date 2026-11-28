"""Cross-language parity: kloppy's own conversions equal the committed landmark fixture.

The same file drives the TypeScript converter tests (src/pitch/coords.test.ts), so Python and
TypeScript agree on every landmark through one fixture. No test here touches the network.
"""

from __future__ import annotations

import json
import socket
from importlib.metadata import version
from pathlib import Path

import pytest

from klopp_pipeline import landmarks

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE = REPO_ROOT / "src" / "pitch" / "fixtures" / "landmarks.json"


def test_network_is_blocked() -> None:
    with pytest.raises(RuntimeError, match="network access is blocked in tests"):
        socket.create_connection(("127.0.0.1", 9), timeout=0.5)
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        with pytest.raises(RuntimeError, match="network access is blocked in tests"):
            sock.connect(("127.0.0.1", 9))
    finally:
        sock.close()


def test_generate_equals_committed_fixture() -> None:
    committed = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert landmarks._equal(committed, landmarks.generate())  # noqa: SLF001
    assert landmarks.check(FIXTURE)


def test_fixture_is_pinned_to_installed_kloppy() -> None:
    committed = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert committed["kloppyVersion"] == "3.19.1"
    assert committed["kloppyVersion"] == version("kloppy")


def test_spot_values() -> None:
    x, y = landmarks.convert("statsbomb", (12, 40))
    assert x == pytest.approx(11, abs=1e-12)
    assert y == pytest.approx(34, abs=1e-12)
    x, y = landmarks.convert("wyscout", (90, 50))
    assert x == pytest.approx(94, abs=1e-12)
    assert y == pytest.approx(34, abs=1e-12)


def test_check_rejects_a_changed_value(tmp_path: Path) -> None:
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    data["cases"][1]["expected"][0] += 0.001
    altered = tmp_path / "landmarks.json"
    altered.write_text(json.dumps(data, indent=2), encoding="utf-8")
    assert not landmarks.check(altered)
    summary = landmarks.diff_summary(altered)
    assert summary is not None
    assert "case 1" in summary


def test_check_ignores_formatting(tmp_path: Path) -> None:
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    compact = tmp_path / "landmarks.json"
    compact.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    assert landmarks.check(compact)
