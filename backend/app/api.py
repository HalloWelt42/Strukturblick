"""Eigene Endpunkte von Strukturblick (alle hinter der Anmeldung): die Ablage auf dem Server für die Oberfläche. Der
Server liest keine Dokumente; Parsen, Abfragen und Prüfen rechnet die Oberfläche (docs/ARCHITEKTUR.md, Leitgedanke 8)."""

from fastapi import APIRouter, HTTPException, Path, Response

from appkern.anmeldung.dienst import Konto
from appkern.app import Geruest

from .bestand import Bestand
from .modelle import KENNUNG, Arbeitsstand, Dokument, Dokumentkopf

#: Größtes Dokument, das die Ablage annimmt (Zeichen); darüber lehnt sie mit 413 ab
GROESSTES_DOKUMENT = 100 * 1024 * 1024


def router(geruest: Geruest, bestand: Bestand) -> APIRouter:
    r = APIRouter(prefix="/api/v1", tags=["strukturblick"])
    pflicht = geruest.pflicht

    @r.get("/dokumente", response_model=list[Dokumentkopf])
    async def liste(konto: Konto = pflicht) -> list[Dokumentkopf]:
        return await bestand.liste(konto.id)

    @r.get("/dokumente/{kennung}", response_model=Dokument)
    async def laden(kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Dokument:
        dok = await bestand.laden(konto.id, kennung)
        if dok is None:
            raise HTTPException(404, "Das Dokument gibt es in der Ablage nicht")
        return dok

    @r.put("/dokumente/{kennung}", status_code=204)
    async def speichern(dok: Dokument, kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Response:
        if dok.kennung != kennung:
            raise HTTPException(400, "Kennung im Pfad und im Dokument weichen ab")
        if len(dok.text) > GROESSTES_DOKUMENT:
            raise HTTPException(413, f"Das Dokument ist größer als {GROESSTES_DOKUMENT // 1048576} MB")
        await bestand.speichern(konto.id, dok)
        return Response(status_code=204)

    @r.delete("/dokumente/{kennung}", status_code=204)
    async def entfernen(kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Response:
        await bestand.entfernen(konto.id, kennung)
        return Response(status_code=204)

    @r.get("/arbeitsstand", response_model=Arbeitsstand)
    async def arbeitsstand(konto: Konto = pflicht) -> Arbeitsstand:
        return await bestand.arbeitsstand(konto.id)

    @r.put("/arbeitsstand", status_code=204)
    async def arbeitsstand_speichern(stand: Arbeitsstand, konto: Konto = pflicht) -> Response:
        await bestand.arbeitsstand_speichern(konto.id, stand)
        return Response(status_code=204)

    return r
