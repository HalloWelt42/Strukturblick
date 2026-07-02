"""Modelle der Transformationsschicht: Konvertierung, struktureller Diff, Reparatur."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.modelle.dokument import (
    DokumentReferenz,
    SerialisierungsErgebnis,
    SerialisierungsOptionen,
)
from app.modelle.gemeinsam import FormatId, JsonWert, QuellSpanne, Verlustaspekt


class VerlustHinweis(BaseModel):
    """Ein bei der Konvertierung verlorener Aspekt samt verständlicher Meldung."""

    aspekt: Verlustaspekt
    meldung: str
    betroffene_pfade: list[str] = Field(default_factory=list)


class KonvertierAnfrage(BaseModel):
    dokument: DokumentReferenz
    ziel_format: FormatId
    optionen: SerialisierungsOptionen = Field(default_factory=SerialisierungsOptionen)


class KonvertierAntwort(BaseModel):
    ergebnis: SerialisierungsErgebnis
    verluste: list[VerlustHinweis] = Field(default_factory=list)
    ziel_format: FormatId


class DiffAnfrage(BaseModel):
    links: DokumentReferenz
    rechts: DokumentReferenz
    ignoriere_reihenfolge: bool = False


DiffArt = Literal["hinzugefuegt", "entfernt", "geaendert", "typ_geaendert"]


class DiffEintrag(BaseModel):
    art: DiffArt
    pfad: str
    position_links: QuellSpanne | None = None
    position_rechts: QuellSpanne | None = None
    wert_links: JsonWert | None = None
    wert_rechts: JsonWert | None = None


class DiffAntwort(BaseModel):
    eintraege: list[DiffEintrag] = Field(default_factory=list)
    anzahl: int


class ReparaturAnfrage(BaseModel):
    dokument: DokumentReferenz


class ReparaturAntwort(BaseModel):
    reparierbar: bool
    veraendert: bool
    ergebnis_text: str
    diff_unified: str
    aenderungen: list[str] = Field(default_factory=list)
