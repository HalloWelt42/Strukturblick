"""API-Tests der harten Anfragegrenze (Middleware) und des Cache-Verhaltens am Endpunkt.

Deckt Lücken, die der Cache-Unit-Test (tests/unit/test_cache.py) nicht abdeckt:
das Zusammenspiel von Grenze/Cache mit den echten HTTP-Endpunkten.
"""

from __future__ import annotations

import re
from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app import config
from app.kern.cache import dokument_cache

HASH_MUSTER = re.compile(r"^[0-9a-f]{64}$")


# --- (a) Harte Anfragegrenze der Middleware (content-length > MAX_DOKUMENT_BYTES * 2) ---


def test_uebergrosse_anfrage_liefert_413_aus_der_middleware(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Ein Body über der harten Grenze (MAX*2) wird von der Middleware vor dem Parsen mit 413 abgewiesen."""
    # Kleine Grenze: harte Schranke = 200 Bytes, wir schicken deutlich mehr.
    monkeypatch.setattr(config, "MAX_DOKUMENT_BYTES", 100)
    grosser_text = "x" * 5000  # Body-Länge liegt sicher über MAX_DOKUMENT_BYTES * 2 = 200

    antwort = client.post("/api/dokumente/parsen", json={"inhalt_text": grosser_text})

    assert antwort.status_code == 413
    fehler = antwort.json()["fehler"]
    assert fehler["code"] == "limit_ueberschritten"
    # FehlerAntwort-Form: request_id ist gesetzt, meldung vorhanden.
    assert fehler["meldung"]
    assert fehler["request_id"]


def test_uebergrosse_anfrage_wird_nicht_geparst_kein_cache_eintrag(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Die harte Grenze greift vor dem Router - der abgewiesene Inhalt landet nicht im Cache."""
    from app.kern.dokument import dokument_hash

    monkeypatch.setattr(config, "MAX_DOKUMENT_BYTES", 100)
    grosser_text = "y" * 5000

    antwort = client.post("/api/dokumente/parsen", json={"inhalt_text": grosser_text})
    assert antwort.status_code == 413

    # Der Grobfilter schlägt vor jeglicher Verarbeitung zu: nichts wurde abgelegt.
    hash_des_inhalts = dokument_hash(grosser_text.encode("utf-8"))
    assert dokument_cache.enthaelt(hash_des_inhalts) is False


def test_knapp_unter_der_harten_grenze_geht_durch(
    client: TestClient, beispiel: Callable[[str], bytes], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Ein Body unter der harten Grenze (und unter der weichen Router-Grenze) wird normal geparst."""
    inhalt = beispiel("json/typisch.json").decode("utf-8")
    # typisch.json ist ~1655 Bytes; als JSON-Body etwas mehr. Grenze grosszuegig setzen,
    # damit weder die harte Middleware-Schranke (MAX*2) noch die weiche Router-Schranke (MAX) greift.
    monkeypatch.setattr(config, "MAX_DOKUMENT_BYTES", 1024 * 1024)

    antwort = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})

    assert antwort.status_code == 200
    assert HASH_MUSTER.match(antwort.json()["dokument_hash"])


def test_body_zwischen_weicher_und_harter_grenze_passiert_middleware_scheitert_am_router(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Body > MAX aber < MAX*2: die Middleware laesst durch, die feine Router-Pruefung meldet 413.

    Zeigt, dass Middleware (hart, MAX*2) und Router (weich, MAX) getrennte Schranken sind.
    """
    monkeypatch.setattr(config, "MAX_DOKUMENT_BYTES", 2000)
    # Dokument-Bytes zwischen 2000 und 4000: passiert den Grobfilter, faellt an der feinen Pruefung.
    inhalt = "a" * 3000

    antwort = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})

    assert antwort.status_code == 413
    assert antwort.json()["fehler"]["code"] == "limit_ueberschritten"


# --- (b) Cache-Status-Endpunkt (/api/dokumente/{hash}/status) ---


def test_status_true_nach_dem_parsen(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    """Nach /parsen meldet /status für denselben Hash im_cache=true."""
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    geparst = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})
    assert geparst.status_code == 200
    hash_wert = geparst.json()["dokument_hash"]

    status = client.get(f"/api/dokumente/{hash_wert}/status")

    assert status.status_code == 200
    assert status.json() == {"im_cache": True}


def test_status_false_fuer_unbekannten_hash(client: TestClient) -> None:
    """Ein nie gesehener Hash meldet im_cache=false (keine 404, reine Statusauskunft)."""
    status = client.get(f"/api/dokumente/{'a' * 64}/status")

    assert status.status_code == 200
    assert status.json() == {"im_cache": False}


def test_status_false_nach_cache_leerung(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    """Nach dem Leeren des Caches meldet /status wieder im_cache=false."""
    inhalt = beispiel("json/typisch.json").decode("utf-8")
    geparst = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})
    hash_wert = geparst.json()["dokument_hash"]

    dokument_cache.leeren()

    status = client.get(f"/api/dokumente/{hash_wert}/status")
    assert status.status_code == 200
    assert status.json() == {"im_cache": False}


def test_neuschick_pfad_410_wenn_hash_nicht_im_cache(client: TestClient) -> None:
    """Referenz nur per dokument_hash ohne Cache-Eintrag: dokumentierter 410-Neuschick-Pfad."""
    unbekannter_hash = "b" * 64

    antwort = client.post("/api/dokumente/parsen", json={"dokument_hash": unbekannter_hash})

    assert antwort.status_code == 410
    assert antwort.json()["fehler"]["code"] == "dokument_nicht_im_cache"
