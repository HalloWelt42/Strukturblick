"""Generierungs-Endpunkte: Codegen aus Dokument, Beispieldaten aus Schema."""

from __future__ import annotations

from fastapi import APIRouter

from app.generatoren import erzeuge_beispieldaten
from app.modelle.generieren import (
    BeispieldatenAnfrage,
    BeispieldatenAntwort,
    CodegenAnfrage,
    CodegenAntwort,
)
from app.routers.dokumente import parse_mit_cache
from app.transformer.codegen import erzeuge_code

router = APIRouter(tags=["Generierung"])


@router.post("/transform/codegen")
def transform_codegen(anfrage: CodegenAnfrage) -> CodegenAntwort:
    _, dokument = parse_mit_cache(anfrage.dokument)
    return erzeuge_code(dokument, anfrage.ziel, anfrage.wurzelname)


@router.post("/generieren/beispieldaten")
def generieren_beispieldaten(anfrage: BeispieldatenAnfrage) -> BeispieldatenAntwort:
    dokumente = erzeuge_beispieldaten(anfrage.schema_wert, anfrage.anzahl, anfrage.seed)
    return BeispieldatenAntwort(dokumente=dokumente)
