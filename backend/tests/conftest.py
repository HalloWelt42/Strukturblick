"""Übergreifende Test-Fixtures: API-Client, Cache-Reset, Beispieldateien."""

from __future__ import annotations

from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.kern.cache import dokument_cache
from app.main import create_app

BEISPIELE_WURZEL = Path(__file__).resolve().parent / "beispiele"


@pytest.fixture()
def client() -> Iterator[TestClient]:
    """Frischer Test-Client über die App-Fabrik."""
    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _dokument_cache_leeren() -> None:
    """Leert den prozessweiten Dokument-Cache vor jedem Test."""
    dokument_cache.leeren()


@pytest.fixture()
def beispiel() -> Callable[[str], bytes]:
    """Lädt eine Beispieldatei als Bytes; Pfad relativ zu tests/beispiele."""

    def _laden(relativer_pfad: str) -> bytes:
        return (BEISPIELE_WURZEL / relativer_pfad).read_bytes()

    return _laden
