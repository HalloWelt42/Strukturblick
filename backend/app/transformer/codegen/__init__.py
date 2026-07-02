"""Codegen: aus einem Dokument Typdefinitionen für Zielsysteme erzeugen.

Der Kern ist ein neutrales Zwischenmodell (schema_modell) aus benannten Typen;
darauf arbeiten die einzelnen Emitter (TypeScript, Pydantic v2, dataclasses,
PHP 8.4+). Der Dispatcher wählt den Emitter zum gewünschten Ziel.
"""

from __future__ import annotations

from app.transformer.codegen.dispatcher import codegen_ziele, erzeuge_code
from app.transformer.codegen.schema_modell import (
    BenannterTyp,
    Feld,
    FeldTyp,
    SchemaModell,
    baue_schema_modell,
)

__all__ = [
    "BenannterTyp",
    "Feld",
    "FeldTyp",
    "SchemaModell",
    "baue_schema_modell",
    "codegen_ziele",
    "erzeuge_code",
]
