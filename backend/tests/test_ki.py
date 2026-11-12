"""KI über die Leitstelle (STB-60) gegen eine nachgestellte Leitstelle: Stand, Vorschlag, Modell immer genannt,
Ablehnungen mit Satz. Nie gegen die echte Leitstelle."""

import json
from pathlib import Path

import httpx
import pytest

from app.main import app_bauen

from .test_app import anmelden, kellerwolke

MODELLE = {"data": [
    {"id": "qwen/qwen3-next-80b", "x-leitstelle": {"name": "Qwen3 Next 80B", "geladen": True, "knoten": "k1", "knoten_name": "MacBook",
                                                   "faehigkeiten": ["text"], "steckbrief": {"zweck": "Allgemein"}}},
    {"id": "whisper", "x-leitstelle": {"name": "Whisper", "faehigkeiten": ["hoeren"]}},
]}


class Leitstelle:
    """Nachgestellte Fassade: merkt sich die Anfragen, antwortet wie eingestellt."""

    def __init__(self) -> None:
        self.anfragen: list[dict] = []
        self.antwort: httpx.Response | None = None

    def __call__(self, request: httpx.Request) -> httpx.Response:
        if request.url.host != "leitstelle.test":
            return kellerwolke(request)
        assert request.headers["authorization"] == "Bearer ls_probe"
        if request.url.path == "/v1/models":
            return httpx.Response(200, json=MODELLE)
        if request.url.path == "/v1/chat/completions":
            self.anfragen.append({"koerper": json.loads(request.content), "titel": request.headers.get("x-leitstelle-titel")})
            if self.antwort is not None:
                return self.antwort
            inhalt = json.dumps({"ergebnis": ".kunden[] | select(.ort == \"Leipzig\")", "erklaerung": ["Liest " + chr(0x201E) + "ort" + chr(0x201C) + " genau."]})
            return httpx.Response(200, json={"model": "qwen/qwen3-next-80b", "choices": [{"message": {"content": inhalt}, "finish_reason": "stop"}],
                                             "usage": {"prompt_tokens": 900, "completion_tokens": 40, "total_tokens": 940}},
                                  headers={"x-leitstelle-modell": "qwen/qwen3-next-80b", "x-leitstelle-knoten": "k1",
                                           "x-leitstelle-auftrag": "a1"})
        return httpx.Response(404, json={"detail": "nicht da"})


@pytest.fixture
def leitstelle() -> Leitstelle:
    return Leitstelle()


@pytest.fixture
async def client(tmp_path: Path, monkeypatch, leitstelle):
    monkeypatch.setenv("STRUKTURBLICK_LEITSTELLE_ADRESSE", "http://leitstelle.test/v1")
    monkeypatch.setenv("STRUKTURBLICK_LEITSTELLE_SCHLUESSEL", "ls_probe")
    app = app_bauen(tmp_path / "daten", transport=httpx.MockTransport(leitstelle))
    await app.state.geruest.starten()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c
    await app.state.geruest.stoppen()


AUFTRAG = {"aufgabe": "abfrage", "frage": "Kunden aus Leipzig", "auszug": "Dokument: kunden.csv", "sprache": "jq"}


async def test_nur_angemeldet(client):
    await anmelden(client)
    assert (await client.get("/api/v1/ki/stand")).status_code == 401
    assert (await client.post("/api/v1/ki/vorschlag", json=AUFTRAG)).status_code == 401


async def test_stand_nennt_nur_sprachmodelle(client):
    h = await anmelden(client)
    s = (await client.get("/api/v1/ki/stand", headers=h)).json()
    assert s["an"] and s["bereit"] and s["modellname"] == "Qwen3 Next 80B"
    assert [m["id"] for m in s["modelle"]] == ["qwen/qwen3-next-80b"]
    assert s["modelle"][0]["rechner"] == "MacBook" and s["modelle"][0]["zweck"] == "Allgemein"


async def test_vorschlag_mit_modell_und_antwortform(client, leitstelle):
    h = await anmelden(client)
    r = await client.post("/api/v1/ki/vorschlag", headers=h, json=AUFTRAG)
    assert r.status_code == 200, r.text
    v = r.json()
    assert v["ergebnis"] == '.kunden[] | select(.ort == "Leipzig")'
    assert v["erklaerung"] == ['Liest "ort" genau.']          # Prosa auf gerade Zeichen gebracht
    assert v["rechner"] == "MacBook" and v["verbrauch"] == {"eingabe": 900, "ausgabe": 40}
    k = leitstelle.anfragen[0]["koerper"]
    assert k["model"] == "qwen/qwen3-next-80b"                   # die App nennt ihr Modell immer
    assert k["response_format"]["type"] == "json_schema"
    assert "jq 1.7" in k["messages"][0]["content"] and "Kunden aus Leipzig" in k["messages"][1]["content"]
    assert "Frage%20in%20Abfrage" in leitstelle.anfragen[0]["titel"]


async def test_anders_vorschlagen_nennt_den_vorigen(client, leitstelle):
    h = await anmelden(client)
    await client.post("/api/v1/ki/vorschlag", headers=h, json={**AUFTRAG, "vorher": ".alt"})
    k = leitstelle.anfragen[0]["koerper"]
    assert ".alt" in k["messages"][1]["content"] and k["temperature"] == 0.7


async def test_ablehnungen_mit_satz(client, leitstelle):
    h = await anmelden(client)
    assert (await client.post("/api/v1/ki/vorschlag", headers=h, json={**AUFTRAG, "sprache": None})).status_code == 400
    leitstelle.antwort = httpx.Response(503, json={"error": {"message": "Hauptregler steht auf Halt", "code": "halt"}})
    r = await client.post("/api/v1/ki/vorschlag", headers=h, json=AUFTRAG)
    assert r.status_code == 503 and "Halt" in r.json()["detail"]
    leitstelle.antwort = httpx.Response(200, json={"choices": [{"message": {"content": "kein JSON"}}]})
    r = await client.post("/api/v1/ki/vorschlag", headers=h, json=AUFTRAG)
    assert r.status_code == 502 and "nicht lesen" in r.json()["detail"]


async def test_ausgeschaltet(client, leitstelle):
    h = await anmelden(client)
    assert (await client.patch("/api/v1/einstellungen", headers=h, json={"werte": {"ki_an": False}})).status_code == 200
    r = await client.post("/api/v1/ki/vorschlag", headers=h, json=AUFTRAG)
    assert r.status_code == 409 and not leitstelle.anfragen


async def test_auszug_hat_eine_grenze(client):
    h = await anmelden(client)
    r = await client.post("/api/v1/ki/vorschlag", headers=h, json={**AUFTRAG, "auszug": "x" * 60_001})
    assert r.status_code == 422
