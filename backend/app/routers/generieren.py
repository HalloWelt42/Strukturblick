"""Generierungs-Endpunkte: Codegen aus Dokument, Beispieldaten aus Schema."""

from __future__ import annotations

from fastapi import APIRouter

from app.generatoren import (
    erzeuge_beispieldaten,
    erzeuge_datensaetze,
    leite_spezifikation_ab,
)
from app.modelle.generieren import (
    BeispieldatenAnfrage,
    BeispieldatenAntwort,
    CodegenAnfrage,
    CodegenAntwort,
)
from app.modelle.testdaten import (
    Spezifikation,
    SpezifikationAnfrage,
    TestdatenAnfrage,
    TestdatenAntwort,
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


@router.post("/generieren/testdaten/spezifikation")
def generieren_testdaten_spezifikation(anfrage: SpezifikationAnfrage) -> Spezifikation:
    """Leitet aus einem Dokument eine Generator-Spezifikation heuristisch ab."""
    _, dokument = parse_mit_cache(anfrage.dokument)
    return leite_spezifikation_ab(dokument)


@router.post("/generieren/testdaten")
def generieren_testdaten(anfrage: TestdatenAnfrage) -> TestdatenAntwort:
    """Erzeugt aus einer Spezifikation deterministisch einen Block von Datensätzen."""
    datensaetze = erzeuge_datensaetze(
        anfrage.spezifikation, anfrage.anzahl, anfrage.seed, anfrage.offset
    )
    return TestdatenAntwort(
        datensaetze=datensaetze, offset=anfrage.offset, anzahl=len(datensaetze)
    )
