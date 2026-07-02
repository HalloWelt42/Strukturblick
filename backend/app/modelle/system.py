"""Modelle für Health und Capabilities - die eine Quelle, aus der das Frontend Menüs baut."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.modelle.gemeinsam import FormatId, Positionsgenauigkeit, Verlustaspekt


class HealthAntwort(BaseModel):
    status: str = "ok"
    version: str


class FormatFaehigkeiten(BaseModel):
    """Selbstauskunft einer Format-Engine - wird 1:1 im Capabilities-Endpunkt ausgeliefert."""

    format_id: FormatId
    name: str
    dateiendungen: tuple[str, ...]
    mime_typen: tuple[str, ...] = ()
    kann_lesen: bool = True
    kann_schreiben: bool = True
    ist_tabellarisch: bool = False
    ist_binaer: bool = False
    positionsgenauigkeit: Positionsgenauigkeit = "keine"
    traegt: frozenset[Verlustaspekt] = frozenset()


class ModulInfo(BaseModel):
    """Selbstauskunft eines Analyse-Moduls - wird im Capabilities-Endpunkt ausgeliefert."""

    id: str
    name: str


class KonvertierungsPaar(BaseModel):
    von: FormatId
    nach: FormatId
    moegliche_verluste: list[Verlustaspekt] = Field(default_factory=list)


class Limits(BaseModel):
    max_dokument_bytes: int
    cache_ttl_sekunden: int


class CapabilitiesAntwort(BaseModel):
    version: str
    formate: list[FormatFaehigkeiten]
    konvertierungsmatrix: list[KonvertierungsPaar]
    analyzer: list[ModulInfo] = Field(default_factory=list)
    limits: Limits
