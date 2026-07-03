"""KI-Funktionen: je Aufgabe eine Funktion, die Prompt füllt, Adapter ruft, nachbearbeitet."""

from __future__ import annotations

from app.ki.funktionen.abfrage_vorschlag import schlage_abfrage_vor
from app.ki.funktionen.erklaeren import erklaere_dokument
from app.ki.funktionen.schema_aus_text import schema_aus_text
from app.ki.funktionen.testdaten import erzeuge_testdaten
from app.ki.funktionen.testdaten_spezifikation import (
    schlage_testdaten_spezifikation_vor,
)
from app.ki.funktionen.text_aus_schema import text_aus_schema

__all__ = [
    "erklaere_dokument",
    "erzeuge_testdaten",
    "schema_aus_text",
    "schlage_abfrage_vor",
    "schlage_testdaten_spezifikation_vor",
    "text_aus_schema",
]
