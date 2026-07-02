"""API-Tests der KI-Schicht: Status, Abfrage-Vorschlag, Schema, Fallback, Fehler.

Das lokale Sprachmodell wird nicht gebraucht: ein httpx.MockTransport wird in
den Adapter eingeschleust, sodass die Tests ohne echtes Modell laufen. Der
prozessweite Adapter aus app.ki wird dafür je Test durch einen Mock-Adapter
ersetzt (monkeypatch).
"""

from __future__ import annotations

import json
from collections.abc import Callable

import httpx
import pytest
from fastapi.testclient import TestClient

from app.ki.adapter import OpenAiKompatiblerAdapter
from app.ki.prompts import KI_FUNKTIONEN, prompt_pfad

BASIS_URL = "http://localhost:1234"


def _chat_antwort(inhalt: str) -> httpx.Response:
    """Baut eine OpenAI-kompatible Chat-Completion-Antwort mit gegebenem Textinhalt."""
    return httpx.Response(
        200,
        json={"choices": [{"message": {"role": "assistant", "content": inhalt}}]},
    )


def _modelle_antwort(ids: list[str]) -> httpx.Response:
    return httpx.Response(200, json={"data": [{"id": kennung} for kennung in ids]})


def _adapter_mit_handler(
    handler: Callable[[httpx.Request], httpx.Response],
) -> OpenAiKompatiblerAdapter:
    """Adapter mit eingeschleustem MockTransport - kein echtes Modell nötig."""
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return OpenAiKompatiblerAdapter(client=client)


@pytest.fixture()
def setze_adapter(monkeypatch: pytest.MonkeyPatch) -> Callable[[OpenAiKompatiblerAdapter], None]:
    """Ersetzt den prozessweiten Adapter in allen Nutzungsstellen durch den Mock."""

    def _setzen(mock: OpenAiKompatiblerAdapter) -> None:
        import app.ki as ki_paket
        import app.routers.ki as router_modul

        monkeypatch.setattr(ki_paket, "adapter", mock)
        monkeypatch.setattr(router_modul, "adapter", mock)

    return _setzen


def _dokument(beispiel: Callable[[str], bytes]) -> dict[str, str]:
    return {"inhalt_text": beispiel("json/typisch.json").decode("utf-8")}


def _ki_kontext() -> dict[str, object]:
    return {"basis_url": BASIS_URL, "modell": "test-modell", "temperatur": 0.1}


# --- Status --------------------------------------------------------------


def test_status_erreichbar(
    client: TestClient, setze_adapter: Callable[[OpenAiKompatiblerAdapter], None]
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/models"
        return _modelle_antwort(["chat-modell", "text-embedding-klein"])

    setze_adapter(_adapter_mit_handler(handler))

    antwort = client.get("/api/ki/status", params={"basis_url": BASIS_URL})

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["erreichbar"] is True
    assert daten["modelle"] == ["chat-modell", "text-embedding-klein"]
    assert daten["fehler"] is None


def test_status_nicht_erreichbar(
    client: TestClient, setze_adapter: Callable[[OpenAiKompatiblerAdapter], None]
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("keine Verbindung")

    setze_adapter(_adapter_mit_handler(handler))

    antwort = client.get("/api/ki/status", params={"basis_url": BASIS_URL})

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["erreichbar"] is False
    assert daten["fehler"] is not None


# --- Abfrage-Vorschlag mit Probelauf ------------------------------------


def test_abfrage_vorschlag_setzt_ausdruck_und_probelauf(
    client: TestClient,
    beispiel: Callable[[str], bytes],
    setze_adapter: Callable[[OpenAiKompatiblerAdapter], None],
) -> None:
    vorschlag = {
        "sprache": "jsonpath",
        "ausdruck": "$.bestellungen[*].summe",
        "erklaerung": "Alle Bestellsummen.",
        "probelauf_treffer": None,
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/models":
            return _modelle_antwort(["test-modell"])
        return _chat_antwort(json.dumps(vorschlag))

    setze_adapter(_adapter_mit_handler(handler))

    antwort = client.post(
        "/api/ki/abfrage-vorschlag",
        json={"ki": _ki_kontext(), "dokument": _dokument(beispiel), "frage": "Zeig alle Summen"},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["ausdruck"] == "$.bestellungen[*].summe"
    assert daten["sprache"] == "jsonpath"
    # Drei Bestellungen -> drei Summen im Probelauf.
    assert daten["probelauf_treffer"] == 3


def test_abfrage_vorschlag_syntaxfehler_setzt_treffer_none(
    client: TestClient,
    beispiel: Callable[[str], bytes],
    setze_adapter: Callable[[OpenAiKompatiblerAdapter], None],
) -> None:
    vorschlag = {
        "sprache": "jsonpath",
        "ausdruck": "$.[[[",
        "erklaerung": "Ein kaputter Ausdruck.",
        "probelauf_treffer": None,
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/models":
            return _modelle_antwort(["test-modell"])
        return _chat_antwort(json.dumps(vorschlag))

    setze_adapter(_adapter_mit_handler(handler))

    antwort = client.post(
        "/api/ki/abfrage-vorschlag",
        json={"ki": _ki_kontext(), "dokument": _dokument(beispiel), "frage": "Unsinn"},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["probelauf_treffer"] is None
    assert "Probelauf" in daten["erklaerung"]


# --- Schema aus Text -----------------------------------------------------


def test_schema_aus_text_liefert_gueltiges_schema(
    client: TestClient, setze_adapter: Callable[[OpenAiKompatiblerAdapter], None]
) -> None:
    ergebnis = {
        "schema": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        },
        "annahmen": ["name ist Pflicht"],
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/models":
            return _modelle_antwort(["test-modell"])
        return _chat_antwort(json.dumps(ergebnis))

    setze_adapter(_adapter_mit_handler(handler))

    antwort = client.post(
        "/api/ki/schema-aus-text",
        json={"ki": _ki_kontext(), "beschreibung": "Ein Objekt mit einem Namen."},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["schema"]["type"] == "object"
    assert daten["annahmen"] == ["name ist Pflicht"]


# --- Fallback json_object bei HTTP 400 des ersten Versuchs ---------------


def test_fallback_json_object_bei_http_400(
    client: TestClient,
    beispiel: Callable[[str], bytes],
    setze_adapter: Callable[[OpenAiKompatiblerAdapter], None],
) -> None:
    zustand = {"chat_aufrufe": 0}
    erklaerung = {"zusammenfassung": "Kurz.", "abschnitte": []}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/models":
            return _modelle_antwort(["test-modell"])
        zustand["chat_aufrufe"] += 1
        rumpf = json.loads(request.content)
        format_typ = rumpf.get("response_format", {}).get("type")
        if format_typ == "json_schema":
            # Erster Versuch: Server lehnt json_schema ab.
            return httpx.Response(400, json={"error": "json_schema nicht unterstützt"})
        # Zweiter Versuch (json_object) gelingt.
        assert format_typ == "json_object"
        return _chat_antwort(json.dumps(erklaerung))

    setze_adapter(_adapter_mit_handler(handler))

    antwort = client.post(
        "/api/ki/erklaeren",
        json={"ki": _ki_kontext(), "dokument": _dokument(beispiel)},
    )

    assert antwort.status_code == 200
    assert antwort.json()["zusammenfassung"] == "Kurz."
    assert zustand["chat_aufrufe"] >= 2


# --- Verbindungsfehler -> 502 -------------------------------------------


def test_verbindungsfehler_ist_502(
    client: TestClient,
    beispiel: Callable[[str], bytes],
    setze_adapter: Callable[[OpenAiKompatiblerAdapter], None],
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/models":
            return _modelle_antwort(["test-modell"])
        raise httpx.ConnectError("keine Verbindung")

    setze_adapter(_adapter_mit_handler(handler))

    antwort = client.post(
        "/api/ki/erklaeren",
        json={"ki": _ki_kontext(), "dokument": _dokument(beispiel)},
    )

    assert antwort.status_code == 502
    assert antwort.json()["fehler"]["code"] == "ki_nicht_erreichbar"


# --- Jede Funktion hat eine Prompt-Datei --------------------------------


def test_jede_funktion_hat_system_prompt() -> None:
    for funktion in KI_FUNKTIONEN:
        pfad = prompt_pfad(funktion)
        assert pfad.is_file(), f"System-Prompt fehlt: {pfad}"
        assert pfad.read_text(encoding="utf-8").strip(), f"System-Prompt leer: {pfad}"
