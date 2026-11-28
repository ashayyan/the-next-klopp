"""Shared pytest setup: no pipeline test may open a network connection.

kloppy can fetch over the network on its own (fsspec, aiohttp), so every test runs with the
socket layer patched to refuse connections. Tests that need remote data use recorded fixtures
or an injected fake fetch (see test_coverage.py).
"""

from __future__ import annotations

import socket
from typing import NoReturn

import pytest


def _refuse(*_args: object, **_kwargs: object) -> NoReturn:
    raise RuntimeError("network access is blocked in tests")


@pytest.fixture(autouse=True)
def _no_network(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(socket.socket, "connect", _refuse)
    monkeypatch.setattr(socket, "create_connection", _refuse)
