"""Endpunkte der KI (hinter der Anmeldung): Stand für Anzeige und Einstellungen, Vorschlag zu einem Auftrag."""

from fastapi import APIRouter, HTTPException

from appkern.anmeldung.dienst import Konto
from appkern.app import Geruest

from .dienst import KiDienst, KiFehler
from .modelle import Auftrag, KiStand, Vorschlag


def router(geruest: Geruest, dienst: KiDienst) -> APIRouter:
    r = APIRouter(prefix="/api/v1/ki", tags=["ki"])
    pflicht = geruest.pflicht

    @r.get("/stand", response_model=KiStand)
    async def stand(_: Konto = pflicht) -> KiStand:
        return await dienst.stand()

    @r.post("/vorschlag", response_model=Vorschlag)
    async def vorschlag(auftrag: Auftrag, _: Konto = pflicht) -> Vorschlag:
        try:
            return await dienst.vorschlagen(auftrag)
        except KiFehler as f:
            raise HTTPException(f.status, f.meldung) from f

    return r
