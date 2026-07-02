"""Grundtypen, die überall gebraucht werden: Werte, Formate, Positionen, Fehler."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

type JsonWert = None | bool | int | float | str | list["JsonWert"] | dict[str, "JsonWert"]


class FormatId(StrEnum):
    JSON = "json"
    NDJSON = "ndjson"
    YAML = "yaml"
    TOML = "toml"
    XML = "xml"
    CSV = "csv"
    XLSX = "xlsx"
    MD_TABELLE = "md_tabelle"
    HTML_TABELLE = "html_tabelle"


class Verlustaspekt(StrEnum):
    """Was ein Format ausdrücken kann bzw. ein Dokument tatsächlich nutzt.

    Konvertierungsverlust = genutzte Aspekte der Quelle minus Tragfähigkeit des Ziels.
    """

    KOMMENTARE = "kommentare"
    ANKER_REFERENZEN = "anker"
    ATTRIBUTE = "attribute"
    MIXED_CONTENT = "mixed_content"
    TYPPRAEZISION = "typpraezision"
    SCHLUESSELREIHENFOLGE = "reihenfolge"
    DUPLIKAT_SCHLUESSEL = "duplikate"
    VERSCHACHTELUNG = "verschachtelung"
    MEHRERE_TABELLEN = "mehrere_tabellen"
    ZELLFORMATE = "zellformate"


type Positionsgenauigkeit = Literal["zeile_spalte", "nur_zeile", "zelle", "keine"]


class QuellPosition(BaseModel):
    """Position im Quelltext. spalte 0 bzw. offset -1 bedeutet: unbekannt."""

    zeile: int = Field(ge=1, description="1-basierte Zeile")
    spalte: int = Field(default=0, ge=0, description="1-basierte Spalte, 0 = unbekannt")
    offset: int = Field(default=-1, ge=-1, description="0-basierter Zeichenoffset, -1 = unbekannt")


class QuellSpanne(BaseModel):
    start: QuellPosition
    ende: QuellPosition


class KnotenSpannen(BaseModel):
    """Positionen eines Knotens (Konvention wie json-source-map)."""

    schluessel: QuellSpanne | None = None
    wert: QuellSpanne


class FehlerDetail(BaseModel):
    """Einheitliches Fehlermodell aller Endpunkte."""

    code: str
    meldung: str
    pfad: str | None = None
    position: QuellSpanne | None = None
    details: dict[str, JsonWert] = Field(default_factory=dict)
    request_id: UUID = Field(default_factory=uuid4)


class FehlerAntwort(BaseModel):
    fehler: FehlerDetail
