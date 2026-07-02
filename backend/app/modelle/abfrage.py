"""Modelle der Abfrage-Schicht: eine Anfrage, ein Endpunkt, vier Abfragesprachen.

Die Abfrage sucht Knoten in einem geparsten Dokument und liefert je Treffer den
JSON-Pointer-Pfad, die Quelltext-Position (falls bekannt) sowie eine kurze
Textdarstellung als Kontext.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.modelle.dokument import DokumentReferenz
from app.modelle.gemeinsam import JsonWert, QuellSpanne

type AbfrageSprache = Literal["jsonpath", "xpath", "volltext", "regex"]


class AbfrageAnfrage(BaseModel):
    """Eine Abfrage gegen ein Dokument. nur_schluessel gilt nur für volltext/regex."""

    dokument: DokumentReferenz
    sprache: AbfrageSprache
    ausdruck: str
    max_treffer: int = Field(default=500, ge=1)
    nur_schluessel: bool = Field(
        default=False,
        description="Nur bei volltext/regex: Schlüsselnamen statt Werte durchsuchen",
    )


class Treffer(BaseModel):
    """Ein einzelner Fundort: Pfad, Position, Wert und eine kurze Textdarstellung."""

    pfad: str
    position: QuellSpanne | None = None
    wert: JsonWert
    kontext: str


class AbfrageAntwort(BaseModel):
    treffer: list[Treffer]
    anzahl: int
    abgeschnitten: bool
    sprache: AbfrageSprache
