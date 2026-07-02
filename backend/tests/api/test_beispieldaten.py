"""API-Tests des Beispieldaten-Generators und der Codegen-Fähigkeiten."""

from __future__ import annotations

from typing import Any

import jsonschema
from fastapi.testclient import TestClient

_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "alter": {"type": "integer"},
        "aktiv": {"type": "boolean"},
    },
    "required": ["name", "alter", "aktiv"],
}


def _erzeuge(client: TestClient, anzahl: int, seed: int) -> list[Any]:
    antwort = client.post(
        "/api/generieren/beispieldaten",
        json={"schema": _SCHEMA, "anzahl": anzahl, "seed": seed},
    )
    assert antwort.status_code == 200
    dokumente: list[Any] = antwort.json()["dokumente"]
    return dokumente


def test_beispieldaten_gleicher_seed_gleiches_ergebnis(client: TestClient) -> None:
    erst = _erzeuge(client, 2, 7)
    zweit = _erzeuge(client, 2, 7)

    assert erst == zweit


def test_beispieldaten_anzahl_drei_liefert_drei(client: TestClient) -> None:
    dokumente = _erzeuge(client, 3, 42)

    assert len(dokumente) == 3


def test_beispieldaten_validiert_gegen_schema(client: TestClient) -> None:
    dokumente = _erzeuge(client, 3, 42)

    for dokument in dokumente:
        jsonschema.validate(instance=dokument, schema=_SCHEMA)


def test_beispieldaten_ungueltiges_schema_ist_parse_fehler(client: TestClient) -> None:
    antwort = client.post(
        "/api/generieren/beispieldaten",
        json={"schema": {"type": "unbekannt"}, "anzahl": 1},
    )

    assert antwort.status_code == 400
    daten = antwort.json()
    assert daten["fehler"]["code"] == "parse_fehler"
    assert "ungültig" in daten["fehler"]["meldung"]


def test_capabilities_enthaelt_codegen_ziele(client: TestClient) -> None:
    antwort = client.get("/api/capabilities")

    assert antwort.status_code == 200
    ziele = antwort.json()["codegen_ziele"]
    ids = {ziel["id"] for ziel in ziele}
    assert ids == {"typescript", "pydantic_v2", "dataclasses", "php_84"}
    for ziel in ziele:
        assert ziel["name"]
        assert ziel["dateiendung"]
