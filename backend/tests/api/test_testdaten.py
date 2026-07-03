"""API-Tests des Testdaten-Generators: Spezifikation ableiten, Datensätze erzeugen.

Die KI-Endpunkt-Tests schleusen wie in test_ki.py einen httpx.MockTransport ein,
sodass kein echtes Sprachmodell nötig ist.
"""

from __future__ import annotations

import json
from collections.abc import Callable

import httpx
import pytest
from fastapi.testclient import TestClient

from app.ki.adapter import OpenAiKompatiblerAdapter

BASIS_URL = "http://localhost:1234"

_DOKUMENT = json.dumps(
    [
        {
            "nummer": "B-2026-0412",
            "kunde": {"name": "Erika Musterfrau", "email": "erika@beispiel.de"},
            "summe": 68.3,
        },
        {
            "nummer": "B-2026-0099",
            "kunde": {"name": "Max Mustermann", "email": "max@beispiel.de"},
            "summe": 12.0,
        },
    ]
)


def _spezifikation(client: TestClient) -> dict:
    antwort = client.post(
        "/api/generieren/testdaten/spezifikation",
        json={"dokument": {"inhalt_text": _DOKUMENT}},
    )
    assert antwort.status_code == 200
    return antwort.json()


# --- Spezifikation ableiten -------------------------------------------------


def test_spezifikation_leitet_plausible_erzeuger_ab(client: TestClient) -> None:
    spez = _spezifikation(client)
    je_pfad = {f["pfad_muster"]: f["erzeuger"] for f in spez["felder"]}

    assert je_pfad["/nummer"] == "muster"
    assert je_pfad["/kunde/name"] == "personenname"
    assert je_pfad["/kunde/email"] == "email"
    assert je_pfad["/summe"] == "dezimalzahl"


def test_spezifikation_hat_beispiele_und_vorlage(client: TestClient) -> None:
    spez = _spezifikation(client)

    assert isinstance(spez["vorlage"], dict)
    assert set(spez["vorlage"]) == {"nummer", "kunde", "summe"}
    for feld in spez["felder"]:
        assert "beispiel" in feld


# --- Datensätze erzeugen ----------------------------------------------------


def test_erzeugung_liefert_gewuenschte_anzahl(client: TestClient) -> None:
    spez = _spezifikation(client)
    antwort = client.post(
        "/api/generieren/testdaten",
        json={"spezifikation": spez, "anzahl": 5, "seed": 42, "offset": 0},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["anzahl"] == 5
    assert daten["offset"] == 0
    assert len(daten["datensaetze"]) == 5


def test_erzeugung_ist_deterministisch(client: TestClient) -> None:
    spez = _spezifikation(client)
    rumpf = {"spezifikation": spez, "anzahl": 5, "seed": 42, "offset": 0}

    erst = client.post("/api/generieren/testdaten", json=rumpf).json()
    zweit = client.post("/api/generieren/testdaten", json=rumpf).json()

    assert erst["datensaetze"] == zweit["datensaetze"]


def test_erzeugung_bloecke_sind_stabil(client: TestClient) -> None:
    spez = _spezifikation(client)

    def block(anzahl: int, offset: int) -> list:
        rumpf = {"spezifikation": spez, "anzahl": anzahl, "seed": 42, "offset": offset}
        return client.post("/api/generieren/testdaten", json=rumpf).json()["datensaetze"]

    assert block(3, 0) + block(3, 3) == block(6, 0)


def test_erzeugte_datensaetze_sind_strukturgleich(client: TestClient) -> None:
    spez = _spezifikation(client)
    daten = client.post(
        "/api/generieren/testdaten",
        json={"spezifikation": spez, "anzahl": 4, "seed": 42, "offset": 0},
    ).json()["datensaetze"]

    for datensatz in daten:
        assert set(datensatz) == {"nummer", "kunde", "summe"}
        assert set(datensatz["kunde"]) == {"name", "email"}
        assert datensatz["kunde"]["email"].endswith("@beispiel.de")


# --- Capabilities-Selbstauskunft --------------------------------------------


def test_capabilities_enthaelt_erzeuger_arten(client: TestClient) -> None:
    antwort = client.get("/api/capabilities")

    assert antwort.status_code == 200
    erzeuger = antwort.json()["testdaten_erzeuger"]
    ids = {e["id"] for e in erzeuger}
    assert {"personenname", "muster", "dezimalzahl", "kategorie", "konstant"} <= ids
    muster = next(e for e in erzeuger if e["id"] == "muster")
    assert muster["parameter"] == ["vorlage"]


# --- KI-Endpunkt (mit Mock-Adapter) -----------------------------------------


def _chat_antwort(inhalt: str) -> httpx.Response:
    return httpx.Response(
        200, json={"choices": [{"message": {"role": "assistant", "content": inhalt}}]}
    )


def _modelle_antwort(ids: list[str]) -> httpx.Response:
    return httpx.Response(200, json={"data": [{"id": kennung} for kennung in ids]})


@pytest.fixture()
def setze_adapter(
    monkeypatch: pytest.MonkeyPatch,
) -> Callable[[OpenAiKompatiblerAdapter], None]:
    def _setzen(mock: OpenAiKompatiblerAdapter) -> None:
        import app.ki as ki_paket
        import app.routers.ki as router_modul

        monkeypatch.setattr(ki_paket, "adapter", mock)
        monkeypatch.setattr(router_modul, "adapter", mock)

    return _setzen


def test_ki_spezifikation_uebernimmt_felder(
    client: TestClient,
    setze_adapter: Callable[[OpenAiKompatiblerAdapter], None],
) -> None:
    vorschlag = {
        "felder": [
            {"pfad_muster": "/nummer", "erzeuger": "muster", "parameter": {"vorlage": "B-####"}},
            {"pfad_muster": "/kunde/name", "erzeuger": "personenname", "parameter": {}},
            {"pfad_muster": "/kunde/email", "erzeuger": "email", "parameter": {}},
            {"pfad_muster": "/summe", "erzeuger": "ganzzahl", "parameter": {"min": 1, "max": 9}},
        ],
        "vorlage": None,
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/models":
            return _modelle_antwort(["test-modell"])
        return _chat_antwort(json.dumps(vorschlag))

    client_mit = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    setze_adapter(OpenAiKompatiblerAdapter(client=client_mit))

    antwort = client.post(
        "/api/ki/testdaten-spezifikation",
        json={
            "ki": {"basis_url": BASIS_URL, "modell": "test-modell"},
            "dokument": {"inhalt_text": _DOKUMENT},
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    je_pfad = {f["pfad_muster"]: f["erzeuger"] for f in daten["felder"]}
    assert je_pfad["/summe"] == "ganzzahl"
    # Die Schablone stammt aus der Heuristik, nicht aus der (null-)KI-Antwort.
    assert isinstance(daten["vorlage"], dict)
    assert set(daten["vorlage"]) == {"nummer", "kunde", "summe"}
