"""Eigene Endpunkte von Strukturblick (alle hinter der Anmeldung): die Ablage auf dem Server für die Oberfläche. Der
Server liest keine Dokumente; Parsen, Abfragen und Prüfen rechnet die Oberfläche (docs/ARCHITEKTUR.md, Leitgedanke 8)."""

from fastapi import APIRouter, HTTPException, Path, Response

from appkern.anmeldung.dienst import Konto
from appkern.app import Geruest

from .bestand import Ablagefehler, Bestand
from .modelle import KENNUNG, ORDNER, Aenderung, Arbeitsstand, Dokument, Dokumentkopf, Ordnername, Papierkorbeintrag, Rezept

#: Größtes Dokument, das die Ablage annimmt (Zeichen); darüber lehnt sie mit 413 ab
GROESSTES_DOKUMENT = 100 * 1024 * 1024

#: Größtes Rezept (Zeichen als JSON); Rezepte sind klein, auch mit langen Ersetzungslisten
GROESSTES_REZEPT = 1024 * 1024


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

    @r.patch("/dokumente/{kennung}", status_code=204)
    async def aendern(teil: Aenderung, kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Response:
        if not await bestand.aendern(konto.id, kennung, teil.name, teil.ordner):
            raise HTTPException(404, "Das Dokument gibt es in der Ablage nicht")
        return Response(status_code=204)

    @r.delete("/dokumente/{kennung}", status_code=204)
    async def entfernen(kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Response:
        """In den Papierkorb (endgültig nach 30 Tagen oder über den Papierkorb)."""
        if not await bestand.entfernen(konto.id, kennung):
            raise HTTPException(404, "Das Dokument gibt es in der Ablage nicht")
        return Response(status_code=204)

    @r.get("/papierkorb", response_model=list[Papierkorbeintrag])
    async def papierkorb(konto: Konto = pflicht) -> list[Papierkorbeintrag]:
        return await bestand.papierkorb(konto.id)

    @r.post("/papierkorb/{kennung}/wiederherstellen", status_code=204)
    async def wiederherstellen(kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Response:
        if not await bestand.wiederherstellen(konto.id, kennung):
            raise HTTPException(404, "Das Dokument liegt nicht im Papierkorb")
        return Response(status_code=204)

    @r.delete("/papierkorb/{kennung}", status_code=204)
    async def endgueltig(kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Response:
        if not await bestand.endgueltig_entfernen(konto.id, kennung):
            raise HTTPException(404, "Das Dokument liegt nicht im Papierkorb")
        return Response(status_code=204)

    @r.get("/ordner", response_model=list[str])
    async def ordner(konto: Konto = pflicht) -> list[str]:
        return await bestand.ordner(konto.id)

    @r.post("/ordner", status_code=204)
    async def ordner_anlegen(neu: Ordnername, konto: Konto = pflicht) -> Response:
        try:
            await bestand.ordner_anlegen(konto.id, neu.name.strip())
        except Ablagefehler as f:
            raise HTTPException(409, str(f)) from f
        return Response(status_code=204)

    @r.patch("/ordner/{name}", status_code=204)
    async def ordner_umbenennen(neu: Ordnername, name: str = Path(pattern=ORDNER), konto: Konto = pflicht) -> Response:
        try:
            await bestand.ordner_umbenennen(konto.id, name, neu.name.strip())
        except Ablagefehler as f:
            raise HTTPException(409, str(f)) from f
        return Response(status_code=204)

    @r.delete("/ordner/{name}", status_code=204)
    async def ordner_entfernen(name: str = Path(pattern=ORDNER), konto: Konto = pflicht) -> Response:
        try:
            await bestand.ordner_entfernen(konto.id, name)
        except Ablagefehler as f:
            raise HTTPException(409, str(f)) from f
        return Response(status_code=204)

    @r.get("/arbeitsstand", response_model=Arbeitsstand)
    async def arbeitsstand(konto: Konto = pflicht) -> Arbeitsstand:
        return await bestand.arbeitsstand(konto.id)

    @r.put("/arbeitsstand", status_code=204)
    async def arbeitsstand_speichern(stand: Arbeitsstand, konto: Konto = pflicht) -> Response:
        await bestand.arbeitsstand_speichern(konto.id, stand)
        return Response(status_code=204)

    @r.get("/rezepte", response_model=list[Rezept])
    async def rezepte(konto: Konto = pflicht) -> list[Rezept]:
        return await bestand.rezepte(konto.id)

    @r.put("/rezepte/{kennung}", status_code=204)
    async def rezept_speichern(rezept: Rezept, kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Response:
        if rezept.kennung != kennung:
            raise HTTPException(400, "Kennung im Pfad und im Rezept weichen ab")
        if len(rezept.model_dump_json()) > GROESSTES_REZEPT:
            raise HTTPException(413, f"Das Rezept ist größer als {GROESSTES_REZEPT // 1048576} MB")
        try:
            await bestand.rezept_speichern(konto.id, rezept)
        except Ablagefehler as f:
            raise HTTPException(409, str(f)) from f
        return Response(status_code=204)

    @r.delete("/rezepte/{kennung}", status_code=204)
    async def rezept_entfernen(kennung: str = Path(pattern=KENNUNG), konto: Konto = pflicht) -> Response:
        if not await bestand.rezept_entfernen(konto.id, kennung):
            raise HTTPException(404, "Das Rezept gibt es nicht")
        return Response(status_code=204)

    return r
