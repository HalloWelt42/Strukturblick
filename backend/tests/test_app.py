"""Strukturblick gegen eine nachgestellte Kellerwolke: einrichten, anmelden, Ablage je Konto."""

import json
from pathlib import Path

import httpx
import pytest

from app.main import app_bauen


def kellerwolke(request: httpx.Request) -> httpx.Response:
    pfad = request.url.path
    if pfad == "/api/v1/ablage/ich":
        return httpx.Response(200, json={"app": "Strukturblick", "konto": "probe", "rechte": []})
    if pfad == "/api/v1/auth/login":
        if json.loads(request.content)["passwort"] != "geheim":
            return httpx.Response(401, json={"detail": "Anmeldung fehlgeschlagen"})
        return httpx.Response(200, json={"token": "t1", "benutzer": {"id": "1", "name": "probe", "rolle": "mitglied", "aktiv": True}})
    if pfad == "/api/v1/auth/status":
        ok = request.headers.get("x-kellerwolke-sitzung") == "t1"
        return httpx.Response(200, json={"angemeldet": ok, "benutzer": {"id": "1", "name": "probe", "rolle": "mitglied", "aktiv": True} if ok else None})
    return httpx.Response(404, json={"detail": "nicht da"})


@pytest.fixture
async def client(tmp_path: Path):
    app = app_bauen(tmp_path / "daten", transport=httpx.MockTransport(kellerwolke))
    await app.state.geruest.starten()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c
    await app.state.geruest.stoppen()


KENNUNG = "0b6f3a52-2a52-4a7e-9a52-1c2d3e4f5a6b"


def dokument(text: str = '{"a": 1}') -> dict:
    return {"kennung": KENNUNG, "name": "probe.json", "formatWahl": None, "optionen": {"trennzeichen": ";"},
            "text": text, "verlauf": {"eintraege": [{"aufruf": {"befehl": "text.aendern"}}], "zeiger": 1},
            "platz": {"art": "ansicht", "kennung": "tabelle"}, "geaendert": "2026-11-11T21:00:00+01:00"}


async def anmelden(client) -> dict[str, str]:
    assert (await client.get("/api/v1/app")).json()["einrichtung_noetig"]
    r = await client.post("/api/v1/einrichtung", json={"kellerwolke_adresse": "http://kw.test", "kellerwolke_schluessel": "kw_app_x"})
    assert r.json()["besitzer"] == "probe"
    return {"X-Kellerwolke-Sitzung": (await client.post("/api/v1/anmeldung", json={"kennung": "probe", "passwort": "geheim"})).json()["token"]}


async def test_ablage_nur_angemeldet(client):
    await anmelden(client)
    assert (await client.get("/api/v1/dokumente")).status_code == 401
    assert (await client.put(f"/api/v1/dokumente/{KENNUNG}", json=dokument())).status_code == 401


async def test_dokument_speichern_laden_entfernen(client):
    h = await anmelden(client)
    assert (await client.get("/api/v1/dokumente", headers=h)).json() == []
    assert (await client.put(f"/api/v1/dokumente/{KENNUNG}", headers=h, json=dokument())).status_code == 204
    assert (await client.put(f"/api/v1/dokumente/{KENNUNG}", headers=h, json=dokument('{"a": 2}'))).status_code == 204
    liste = (await client.get("/api/v1/dokumente", headers=h)).json()
    assert liste == [{"kennung": KENNUNG, "name": "probe.json", "ordner": "", "groesse": 8, "geaendert": "2026-11-11T21:00:00+01:00"}]
    geladen = (await client.get(f"/api/v1/dokumente/{KENNUNG}", headers=h)).json()
    assert geladen["text"] == '{"a": 2}' and geladen["optionen"] == {"trennzeichen": ";"} and geladen["platz"]["kennung"] == "tabelle"
    assert geladen["verlauf"]["zeiger"] == 1
    assert (await client.delete(f"/api/v1/dokumente/{KENNUNG}", headers=h)).status_code == 204
    assert (await client.get(f"/api/v1/dokumente/{KENNUNG}", headers=h)).status_code == 404


async def test_kennung_muss_passen(client):
    h = await anmelden(client)
    anders = "1b6f3a52-2a52-4a7e-9a52-1c2d3e4f5a6b"
    assert (await client.put(f"/api/v1/dokumente/{anders}", headers=h, json=dokument())).status_code == 400
    assert (await client.get("/api/v1/dokumente/kein-uuid", headers=h)).status_code == 422


async def test_arbeitsstand(client):
    h = await anmelden(client)
    assert (await client.get("/api/v1/arbeitsstand", headers=h)).json() == {"offen": [], "aktiv": None}
    assert (await client.put("/api/v1/arbeitsstand", headers=h, json={"offen": [KENNUNG], "aktiv": KENNUNG})).status_code == 204
    assert (await client.get("/api/v1/arbeitsstand", headers=h)).json() == {"offen": [KENNUNG], "aktiv": KENNUNG}


ZWEITE = "2b6f3a52-2a52-4a7e-9a52-1c2d3e4f5a6b"


async def test_papierkorb_und_wiederherstellen(client):
    h = await anmelden(client)
    await client.put(f"/api/v1/dokumente/{KENNUNG}", headers=h, json=dokument())
    assert (await client.delete(f"/api/v1/dokumente/{KENNUNG}", headers=h)).status_code == 204
    assert (await client.get("/api/v1/dokumente", headers=h)).json() == []
    assert (await client.get(f"/api/v1/dokumente/{KENNUNG}", headers=h)).status_code == 404
    korb = (await client.get("/api/v1/papierkorb", headers=h)).json()
    assert [e["kennung"] for e in korb] == [KENNUNG] and korb[0]["geloescht"]
    assert (await client.post(f"/api/v1/papierkorb/{KENNUNG}/wiederherstellen", headers=h)).status_code == 204
    assert [d["kennung"] for d in (await client.get("/api/v1/dokumente", headers=h)).json()] == [KENNUNG]
    await client.delete(f"/api/v1/dokumente/{KENNUNG}", headers=h)
    assert (await client.delete(f"/api/v1/papierkorb/{KENNUNG}", headers=h)).status_code == 204
    assert (await client.get("/api/v1/papierkorb", headers=h)).json() == []


async def test_umbenennen_verschieben_ohne_inhalt(client):
    h = await anmelden(client)
    await client.put(f"/api/v1/dokumente/{KENNUNG}", headers=h, json=dokument())
    assert (await client.patch(f"/api/v1/dokumente/{KENNUNG}", headers=h, json={"name": "neu.json", "ordner": "Import"})).status_code == 204
    d = (await client.get(f"/api/v1/dokumente/{KENNUNG}", headers=h)).json()
    assert d["name"] == "neu.json" and d["ordner"] == "Import" and d["text"] == '{"a": 1}'
    assert (await client.get("/api/v1/ordner", headers=h)).json() == ["Import"]
    assert (await client.patch(f"/api/v1/dokumente/{ZWEITE}", headers=h, json={"name": "x"})).status_code == 404


async def test_ordner(client):
    h = await anmelden(client)
    assert (await client.post("/api/v1/ordner", headers=h, json={"name": "Kundenimport"})).status_code == 204
    assert (await client.post("/api/v1/ordner", headers=h, json={"name": "Kundenimport"})).status_code == 409
    assert (await client.post("/api/v1/ordner", headers=h, json={"name": "a/b"})).status_code == 422
    await client.put(f"/api/v1/dokumente/{KENNUNG}", headers=h, json={**dokument(), "ordner": "Kundenimport"})
    assert (await client.delete("/api/v1/ordner/Kundenimport", headers=h)).status_code == 409
    assert (await client.patch("/api/v1/ordner/Kundenimport", headers=h, json={"name": "Import"})).status_code == 204
    assert (await client.get(f"/api/v1/dokumente/{KENNUNG}", headers=h)).json()["ordner"] == "Import"
    await client.patch(f"/api/v1/dokumente/{KENNUNG}", headers=h, json={"ordner": ""})
    assert (await client.delete("/api/v1/ordner/Import", headers=h)).status_code == 204
    assert (await client.get("/api/v1/ordner", headers=h)).json() == []


def rezept(kennung: str = KENNUNG, geaendert: str = "2026-11-11T21:00:00+01:00") -> dict:
    return {"kennung": kennung, "name": "Kunden säubern", "geaendert": geaendert, "angelegt": geaendert, "quelle": "kunden.csv",
            "spalten": ["ort"], "zuletzt": [], "schritte": [{"art": "ersetzen", "spalte": "ort", "karte": [{"vorher": "lpz", "nachher": "Leipzig"}], "an": True}]}


async def test_rezepte(client):
    h = await anmelden(client)
    assert (await client.get("/api/v1/rezepte")).status_code == 401
    assert (await client.get("/api/v1/rezepte", headers=h)).json() == []
    assert (await client.put(f"/api/v1/rezepte/{KENNUNG}", headers=h, json=rezept())).status_code == 204
    assert (await client.put(f"/api/v1/rezepte/{ZWEITE}", headers=h, json=rezept(ZWEITE, "2026-11-12T08:00:00+01:00"))).status_code == 204
    liste = (await client.get("/api/v1/rezepte", headers=h)).json()
    assert [r["kennung"] for r in liste] == [ZWEITE, KENNUNG]
    # Felder, die nur die Oberfläche liest, reisen unverändert mit
    assert liste[1]["schritte"][0]["karte"] == [{"vorher": "lpz", "nachher": "Leipzig"}] and liste[1]["quelle"] == "kunden.csv"
    assert (await client.put(f"/api/v1/rezepte/{ZWEITE}", headers=h, json=rezept())).status_code == 400
    assert (await client.put(f"/api/v1/rezepte/{KENNUNG}", headers=h, json={**rezept(), "name": ""})).status_code == 422
    assert (await client.delete(f"/api/v1/rezepte/{ZWEITE}", headers=h)).status_code == 204
    assert (await client.delete(f"/api/v1/rezepte/{ZWEITE}", headers=h)).status_code == 404
    assert [r["kennung"] for r in (await client.get("/api/v1/rezepte", headers=h)).json()] == [KENNUNG]
