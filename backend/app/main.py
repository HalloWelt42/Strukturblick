"""Strukturblick: zeigt, prüft und baut Strukturdaten um. Backend auf dem Gerüst des Appkerns: Anmeldung über das
Konto der Kellerwolke, Ablage der Dokumente je Konto, Auslieferung der Oberfläche (Bauart "server").

    uvicorn app.main:app --port 8470
"""

import os
from pathlib import Path

import httpx
from fastapi import FastAPI

from appkern.app import Geruest
from appkern.app.begleiter import Begleiter

from .api import router
from .ki.api import router as ki_router
from .ki.dienst import KiDienst
from .bestand import Bestand
from .einstellungen import AppEinstellungen
from .fassung import FASSUNG, WURZEL


class Einrichtung(Begleiter):
    """Richtet beim Start das Schema der Ablage ein."""

    def __init__(self, bestand: Bestand) -> None:
        self.bestand = bestand

    async def starten(self) -> None:
        await self.bestand.einrichten()


def app_bauen(daten: Path, transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    """`transport` nur für Tests (Kellerwolke nachgestellt)."""
    geruest = Geruest(name="Strukturblick", kennung="strukturblick", rolle="zeigt, prüft und baut Strukturdaten um",
                      symbol="fa-sitemap", farbe="#4e6379", fassung=FASSUNG, daten=daten,
                      einstellungen=AppEinstellungen, oberflaeche=WURZEL / "frontend" / "dist",
                      leitstelle_wahlweise=True,      # ohne Leitstelle fehlt nur das Werkzeug Mit KI
                      transport=transport)
    bestand = Bestand(geruest.db)
    geruest.begleiter_anmelden(Einrichtung(bestand))
    app = geruest.fastapi()
    app.state.geruest = geruest
    app.include_router(router(geruest, bestand))
    geruest.einstellungen.anbieten("ki_modell", geruest.leitstelle_angebot("text"))
    app.include_router(ki_router(geruest, KiDienst(lambda: geruest.leitstelle, lambda: geruest.einstellungen.stand)))
    geruest.oberflaeche_ausliefern(app)
    return app


def daten_ordner() -> Path:
    """Wo die App ihre Daten hält: `STRUKTURBLICK_DATEN` (im Container /app/daten), sonst daten/ im Repo."""
    return Path(os.environ.get("STRUKTURBLICK_DATEN") or WURZEL / "daten")


app = app_bauen(daten_ordner())
