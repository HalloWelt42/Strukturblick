"""API-Tests der Dokument-Endpunkte: parsen, Cache-Zyklus, erkennen, Fehlerfälle."""

from __future__ import annotations

import base64
import re
from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app import config
from app.kern.cache import dokument_cache

HASH_MUSTER = re.compile(r"^[0-9a-f]{64}$")


def test_parsen_json_und_der_410_retry_zyklus(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    # 1. Parsen mit Inhalt fuellt den Cache
    erste = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})
    assert erste.status_code == 200
    daten = erste.json()
    assert HASH_MUSTER.match(daten["dokument_hash"])
    assert daten["format_id"] == "json"
    assert daten["positionen"]
    assert "/bestellungen/0" in daten["positionen"]
    hash_wert = daten["dokument_hash"]

    # 2. Folgeaufruf nur mit dem Hash trifft den Cache
    zweite = client.post("/api/dokumente/parsen", json={"dokument_hash": hash_wert})
    assert zweite.status_code == 200
    assert zweite.json()["dokument_hash"] == hash_wert
    assert zweite.json()["wurzel"] == daten["wurzel"]

    # 3. Nach dem Leeren des Caches ist der Hash weg -> 410 mit stabilem Code
    dokument_cache.leeren()
    dritte = client.post("/api/dokumente/parsen", json={"dokument_hash": hash_wert})
    assert dritte.status_code == 410
    assert dritte.json()["fehler"]["code"] == "dokument_nicht_im_cache"

    # 4. Retry mit dem Inhalt liefert wieder 200 und denselben Hash
    vierte = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})
    assert vierte.status_code == 200
    assert vierte.json()["dokument_hash"] == hash_wert


def test_erkennen_json_text(client: TestClient, beispiel: Callable[[str], bytes]) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post("/api/dokumente/erkennen", json={"inhalt_text": inhalt})

    assert antwort.status_code == 200
    kandidaten = antwort.json()["kandidaten"]
    assert kandidaten
    assert kandidaten[0]["format_id"] == "json"


def test_erkennen_csv_text(client: TestClient, beispiel: Callable[[str], bytes]) -> None:
    inhalt = beispiel("csv/typisch.csv").decode("utf-8")

    antwort = client.post("/api/dokumente/erkennen", json={"inhalt_text": inhalt})

    assert antwort.status_code == 200
    kandidaten = antwort.json()["kandidaten"]
    assert kandidaten
    assert kandidaten[0]["format_id"] == "csv"


def test_format_unbekannt_bei_binaermuell(client: TestClient) -> None:
    roh = bytes([0, 159, 146, 150, 255, 254, 250, 1, 2, 3])

    antwort = client.post(
        "/api/dokumente/parsen",
        json={"inhalt_base64": base64.b64encode(roh).decode("ascii")},
    )

    assert antwort.status_code == 400
    assert antwort.json()["fehler"]["code"] == "format_unbekannt"


def test_eingabe_ungueltig_bei_doppelter_quelle(client: TestClient) -> None:
    antwort = client.post(
        "/api/dokumente/parsen",
        json={"inhalt_text": "{}", "dokument_hash": "a" * 64},
    )

    assert antwort.status_code == 422
    assert antwort.json()["fehler"]["code"] == "eingabe_ungueltig"


def test_limit_ueberschritten_bei_kleiner_grenze(
    client: TestClient, beispiel: Callable[[str], bytes], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(config, "MAX_DOKUMENT_BYTES", 16)
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})

    assert antwort.status_code == 413
    assert antwort.json()["fehler"]["code"] == "limit_ueberschritten"


def test_parsen_csv_base64_meldet_encoding(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    roh = beispiel("csv/latin1.csv")

    antwort = client.post(
        "/api/dokumente/parsen",
        json={
            "inhalt_base64": base64.b64encode(roh).decode("ascii"),
            "dateiname": "latin1.csv",
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["format_id"] == "csv"
    assert daten["dialekt_info"] is not None
    assert daten["dialekt_info"]["encoding"]
    assert daten["dialekt_info"]["encoding"] != "UTF-8"


def test_parse_fehler_mit_position_bei_kaputtem_json(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/kaputte/fehlendes_komma.json").decode("utf-8")

    antwort = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})

    assert antwort.status_code == 400
    fehler = antwort.json()["fehler"]
    assert fehler["code"] == "parse_fehler"
    assert fehler["position"] is not None
    assert fehler["position"]["start"]["zeile"] == 4
