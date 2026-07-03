"""KI-Endpunkte: Status prüfen und die fünf KI-Funktionen anbieten.

Ein prozessweiter Adapter (Modul-Singleton aus app.ki) bedient alle Endpunkte.
Kein Streaming - jeder POST liefert die fertige, validierte Struktur-Antwort.
Dokument-Anfragen werden über parse_mit_cache aufgelöst.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.ki import adapter
from app.ki.funktionen import (
    erklaere_dokument,
    erzeuge_testdaten,
    schema_aus_text,
    schlage_abfrage_vor,
    schlage_testdaten_spezifikation_vor,
    text_aus_schema,
)
from app.modelle.ki import (
    AbfrageVorschlag,
    AbfrageVorschlagAnfrage,
    Erklaerung,
    ErklaerenAnfrage,
    KiStatus,
    SchemaAusText,
    SchemaAusTextAnfrage,
    Testdaten,
    TestdatenAnfrage,
    TestdatenSpezifikationAnfrage,
    TextAusSchema,
    TextAusSchemaAnfrage,
)
from app.modelle.testdaten import Spezifikation
from app.routers.dokumente import parse_mit_cache

router = APIRouter(tags=["KI"])


@router.get("/ki/status")
async def ki_status(
    basis_url: str = Query(description="Basis-URL des OpenAI-kompatiblen Servers"),
    modell: str | None = Query(default=None, description="Optionale Modell-Id (nur informativ)"),
) -> KiStatus:
    """Prüft, ob ein lokales Sprachmodell erreichbar ist. Wirft nie."""
    return await adapter.status(basis_url)


@router.post("/ki/abfrage-vorschlag")
async def ki_abfrage_vorschlag(anfrage: AbfrageVorschlagAnfrage) -> AbfrageVorschlag:
    """Schlägt einen Abfrage-Ausdruck vor und prüft ihn mit einem Probelauf."""
    _, dokument = parse_mit_cache(anfrage.dokument)
    return await schlage_abfrage_vor(adapter, anfrage, anfrage.dokument, dokument)


@router.post("/ki/erklaeren")
async def ki_erklaeren(anfrage: ErklaerenAnfrage) -> Erklaerung:
    """Erklärt den Aufbau eines Dokuments in Alltagssprache."""
    _, dokument = parse_mit_cache(anfrage.dokument)
    return await erklaere_dokument(adapter, anfrage, dokument)


@router.post("/ki/schema-aus-text")
async def ki_schema_aus_text(anfrage: SchemaAusTextAnfrage) -> SchemaAusText:
    """Erzeugt aus einer Prosa-Beschreibung ein JSON Schema (Draft 2020-12)."""
    return await schema_aus_text(adapter, anfrage)


@router.post("/ki/text-aus-schema")
async def ki_text_aus_schema(anfrage: TextAusSchemaAnfrage) -> TextAusSchema:
    """Beschreibt ein Dokument in Alltagssprache."""
    _, dokument = parse_mit_cache(anfrage.dokument)
    return await text_aus_schema(adapter, anfrage, dokument)


@router.post("/ki/testdaten")
async def ki_testdaten(anfrage: TestdatenAnfrage) -> Testdaten:
    """Erzeugt realistische, zur Struktur passende Beispiel-Datensätze."""
    _, dokument = parse_mit_cache(anfrage.dokument)
    return await erzeuge_testdaten(adapter, anfrage, dokument)


@router.post("/ki/testdaten-spezifikation")
async def ki_testdaten_spezifikation(
    anfrage: TestdatenSpezifikationAnfrage,
) -> Spezifikation:
    """Lässt das Sprachmodell eine Generator-Spezifikation vorschlagen."""
    _, dokument = parse_mit_cache(anfrage.dokument)
    return await schlage_testdaten_spezifikation_vor(adapter, anfrage.ki, dokument)
