"""Abfrage-Endpunkt: sucht Knoten in einem Dokument (JSONPath, XPath, Volltext, Regex)."""

from __future__ import annotations

from fastapi import APIRouter

from app.analyzer.abfrage.dispatcher import fuehre_abfrage
from app.modelle.abfrage import AbfrageAnfrage, AbfrageAntwort
from app.routers.dokumente import parse_mit_cache

router = APIRouter(tags=["Abfrage"])


@router.post("/abfrage")
def abfrage_ausfuehren(anfrage: AbfrageAnfrage) -> AbfrageAntwort:
    _, dokument = parse_mit_cache(anfrage.dokument)
    return fuehre_abfrage(dokument, anfrage)
