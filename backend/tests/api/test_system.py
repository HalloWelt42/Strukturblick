"""API-Tests der System-Endpunkte: Health und Capabilities."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

PROJEKT_WURZEL = Path(__file__).resolve().parents[3]


def _erwartete_version() -> str:
    daten = json.loads((PROJEKT_WURZEL / "version.json").read_text(encoding="utf-8"))
    version = daten["version"]
    assert isinstance(version, str)
    return version


def test_health_liefert_version_aus_versionsdatei(client: TestClient) -> None:
    antwort = client.get("/api/health")

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["status"] == "ok"
    assert daten["version"] == _erwartete_version()
    assert antwort.headers.get("X-Request-Id")


def test_capabilities_formate_matrix_und_limits(client: TestClient) -> None:
    antwort = client.get("/api/capabilities")

    assert antwort.status_code == 200
    daten = antwort.json()

    formate = {eintrag["format_id"]: eintrag for eintrag in daten["formate"]}
    assert "json" in formate
    assert "csv" in formate
    assert formate["csv"]["ist_tabellarisch"] is True
    assert formate["csv"]["kann_lesen"] is True
    assert formate["csv"]["kann_schreiben"] is True
    assert formate["json"]["ist_tabellarisch"] is False
    assert formate["json"]["kann_lesen"] is True
    assert formate["json"]["kann_schreiben"] is True

    paare = {(eintrag["von"], eintrag["nach"]) for eintrag in daten["konvertierungsmatrix"]}
    assert ("json", "csv") in paare
    assert ("csv", "json") in paare

    limits = daten["limits"]
    assert limits["max_dokument_bytes"] > 0
    assert limits["cache_ttl_sekunden"] > 0

    assert antwort.headers.get("X-Request-Id")
