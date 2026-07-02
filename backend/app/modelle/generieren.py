"""Modelle für Codegen (Typdefinitionen aus einem Dokument) und Beispieldaten.

Codegen erzeugt aus dem Wertebaum eines Dokuments Quelltext für ein Zielsystem
(TypeScript, Pydantic v2, dataclasses, PHP 8.4+). Der Beispieldaten-Generator
geht den umgekehrten Weg: aus einem JSON Schema entstehen deterministische
Beispieldokumente.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modelle.dokument import DokumentReferenz
from app.modelle.gemeinsam import JsonWert

CodegenZiel = Literal["typescript", "pydantic_v2", "dataclasses", "php_84"]


class CodegenAnfrage(BaseModel):
    """Anfrage zur Codegenerierung aus einem Dokument."""

    dokument: DokumentReferenz
    ziel: CodegenZiel
    wurzelname: str = "Wurzel"


class CodegenAntwort(BaseModel):
    """Erzeugter Quelltext samt passender Dateiendung und Warnungen."""

    ziel: CodegenZiel
    code: str
    dateiendung: str
    warnungen: list[str] = Field(default_factory=list)


class BeispieldatenAnfrage(BaseModel):
    """Anfrage zur Erzeugung von Beispieldokumenten aus einem JSON Schema.

    Über die API heißt das Schema-Feld 'schema' - intern schema_wert,
    weil der Name auf BaseModel bereits vergeben ist.
    """

    model_config = ConfigDict(populate_by_name=True)

    schema_wert: JsonWert = Field(alias="schema")
    anzahl: int = 1
    seed: int = 42


class BeispieldatenAntwort(BaseModel):
    """Die erzeugten Beispieldokumente."""

    dokumente: list[JsonWert] = Field(default_factory=list)


class CodegenZielInfo(BaseModel):
    """Selbstauskunft eines Codegen-Ziels - speist den Capabilities-Endpunkt."""

    id: CodegenZiel
    name: str
    dateiendung: str
