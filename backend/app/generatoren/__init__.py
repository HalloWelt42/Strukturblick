"""Generatoren: aus einem Schema Beispieldaten erzeugen (Gegenrichtung zum Codegen)."""

from __future__ import annotations

from app.generatoren.beispieldaten import erzeuge_beispieldaten
from app.generatoren.testdaten import (
    erzeuge_datensaetze,
    erzeuger_arten_infos,
    leite_spezifikation_ab,
)

__all__ = [
    "erzeuge_beispieldaten",
    "erzeuge_datensaetze",
    "erzeuger_arten_infos",
    "leite_spezifikation_ab",
]
