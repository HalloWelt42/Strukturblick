"""Verbund: Strukturblick gegen eine echte Kellerwolke (Entwicklungsinstanz), mit einem eigenen Testzugang (Lehre 20):
`backend/.env.test` (nie im Repo) mit KELLERWOLKE_ADRESSE, KELLERWOLKE_SCHLUESSEL (App-Schlüssel nur für Tests, nicht
der der Entwicklungsinstanz), KELLERWOLKE_KENNUNG und KELLERWOLKE_PASSWORT des Kontos, dem der Schlüssel gehört; ohne
wird übersprungen. Am Ende: Aktionen des Testzugangs zurückziehen,
Sitzung beenden. Tests gehen nur Wege, die auch die Oberfläche geht (Lehre 19)."""

import uuid
from pathlib import Path

import httpx
import pytest

from appkern.testen import aktionen_zurueckziehen, hat_kellerwolke, werte

from app.main import app_bauen

W = werte(Path(__file__).resolve().parents[1] / ".env.test")
pytestmark = pytest.mark.skipif(not hat_kellerwolke(W), reason="kein eigener Testzugang eingerichtet (backend/.env.test)")


async def test_einrichten_anmelden_ablage(tmp_path: Path):
    app = app_bauen(tmp_path / "daten")
    geruest = app.state.geruest
    await geruest.starten()
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/einrichtung", json={"kellerwolke_adresse": W["KELLERWOLKE_ADRESSE"],
                                                          "kellerwolke_schluessel": W["KELLERWOLKE_SCHLUESSEL"]})
            assert r.status_code == 200, r.text
            r = await c.post("/api/v1/anmeldung", json={"kennung": W["KELLERWOLKE_KENNUNG"], "passwort": W["KELLERWOLKE_PASSWORT"]})
            assert r.status_code == 200, r.text
            h = {"X-Kellerwolke-Sitzung": r.json()["token"]}
            try:
                # wie die Oberfläche nach der Anmeldung: die App meldet ihre Adresse (für Öffnen aus der Kellerwolke)
                assert (await c.post("/api/v1/adresse", headers=h, json={"adresse": "http://t"})).status_code == 200
                verbindungen = {v["name"]: v for v in (await c.get("/api/v1/verbindungen", headers=h)).json()}
                assert verbindungen["Kellerwolke"]["ok"]
                # Ablage der App: ein Dokument speichern, lesen, entfernen (wie die Oberfläche)
                kennung = str(uuid.uuid4())
                dok = {"kennung": kennung, "name": "probe.json", "text": "{}", "geaendert": "2026-11-11T21:00:00+01:00"}
                assert (await c.put(f"/api/v1/dokumente/{kennung}", headers=h, json=dok)).status_code == 204
                assert (await c.get(f"/api/v1/dokumente/{kennung}", headers=h)).json()["text"] == "{}"
                assert (await c.delete(f"/api/v1/dokumente/{kennung}", headers=h)).status_code == 204
            finally:
                await c.post("/api/v1/anmeldung/abmelden", headers=h)
    finally:
        await geruest.stoppen()
        await aktionen_zurueckziehen(W["KELLERWOLKE_ADRESSE"], W["KELLERWOLKE_SCHLUESSEL"])
