"""Dispatcher der Codegenerierung: wählt den Emitter zum Zielsystem.

Aus einem geparsten Dokument entsteht zunächst das neutrale Zwischenmodell
(schema_modell), das dann vom passenden Emitter in Quelltext übersetzt wird.
"""

from __future__ import annotations

from collections.abc import Callable

from app.kern.dokument import GeparstesDokument
from app.modelle.gemeinsam import JsonWert
from app.modelle.generieren import CodegenAntwort, CodegenZiel, CodegenZielInfo
from app.transformer.codegen.dataclass_gen import emittiere_dataclasses
from app.transformer.codegen.php_gen import emittiere_php
from app.transformer.codegen.pydantic_gen import emittiere_pydantic
from app.transformer.codegen.schema_modell import SchemaModell, baue_schema_modell
from app.transformer.codegen.typescript import emittiere_typescript

_EMITTER: dict[CodegenZiel, Callable[[SchemaModell], str]] = {
    "typescript": emittiere_typescript,
    "pydantic_v2": emittiere_pydantic,
    "dataclasses": emittiere_dataclasses,
    "php_84": emittiere_php,
}

_DATEIENDUNG: dict[CodegenZiel, str] = {
    "typescript": "ts",
    "pydantic_v2": "py",
    "dataclasses": "py",
    "php_84": "php",
}

_ANZEIGENAME: dict[CodegenZiel, str] = {
    "typescript": "TypeScript-Interfaces",
    "pydantic_v2": "Pydantic v2",
    "dataclasses": "Python dataclasses",
    "php_84": "PHP 8.4+",
}


def codegen_ziele() -> list[CodegenZielInfo]:
    """Selbstauskunft aller Codegen-Ziele für den Capabilities-Endpunkt."""
    return [
        CodegenZielInfo(id=ziel, name=_ANZEIGENAME[ziel], dateiendung=_DATEIENDUNG[ziel])
        for ziel in _EMITTER
    ]


def _beispiel_anzahl(wurzel: JsonWert) -> int:
    """Zahl der Beispiele, aus denen die Wurzel abgeleitet wurde."""
    if isinstance(wurzel, list):
        return len(wurzel)
    return 1


def erzeuge_code(
    dok: GeparstesDokument, ziel: CodegenZiel, wurzelname: str = "Wurzel"
) -> CodegenAntwort:
    """Leitet das Zwischenmodell ab und erzeugt Quelltext für das Zielsystem."""
    modell = baue_schema_modell(dok.wurzel, wurzelname)
    modell.beispiel_anzahl = _beispiel_anzahl(dok.wurzel)
    emittiere = _EMITTER[ziel]
    code = emittiere(modell)
    return CodegenAntwort(
        ziel=ziel,
        code=code,
        dateiendung=_DATEIENDUNG[ziel],
        warnungen=modell.warnungen,
    )
