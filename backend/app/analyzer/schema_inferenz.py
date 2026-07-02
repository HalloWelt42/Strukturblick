"""Schema-Inferenz: JSON Schema über genson, Tabellen-Schema über eigene Wertanalyse.

json_schema funktioniert für jeden Wertebaum (genson, Draft 2020-12).
table_schema ist nur für tabellarische Wurzeln (Liste von Objekten) sinnvoll:
Je Feld wird aus den tatsächlichen Werten ein Typ abgeleitet (integer, number,
boolean, date, string); kommt None vor, trägt der Typ den Zusatz "(leer erlaubt)".
"""

from __future__ import annotations

import re
from typing import ClassVar

from genson import SchemaBuilder  # type: ignore[import-untyped]

from app.analyzer.muster import ist_iso_datum
from app.fehler import KonvertierungUnmoeglich
from app.kern.dokument import GeparstesDokument
from app.modelle.analyse import SchemaAntwort, SchemaArt
from app.modelle.gemeinsam import JsonWert
from app.registry import analyzer

_SCHEMA_DRAFT = "https://json-schema.org/draft/2020-12/schema"
_GANZZAHL_MUSTER = re.compile(r"^[+-]?\d+$")
_KOMMAZAHL_MUSTER = re.compile(r"^[+-]?\d+\.\d+$")
_WAHRHEITSWERTE = frozenset({"true", "false", "ja", "nein"})


def _json_schema_ableiten(wurzel: JsonWert) -> SchemaAntwort:
    builder = SchemaBuilder(schema_uri=_SCHEMA_DRAFT)
    builder.add_object(wurzel)
    schema: JsonWert = builder.to_schema()
    return SchemaAntwort(
        art="json_schema",
        schema=schema,
        hinweise=["Automatisch aus dem Dokumentinhalt abgeleitet"],
    )


def _tabellen_zeilen(wurzel: JsonWert) -> list[dict[str, JsonWert]]:
    if not isinstance(wurzel, list) or not wurzel:
        raise KonvertierungUnmoeglich(
            "Ein Tabellen-Schema braucht eine tabellarische Wurzel (nicht-leere Liste "
            "von Objekten) - die Wurzel dieses Dokuments ist keine solche Liste."
        )
    zeilen: list[dict[str, JsonWert]] = []
    for nummer, zeile in enumerate(wurzel):
        if not isinstance(zeile, dict):
            raise KonvertierungUnmoeglich(
                "Ein Tabellen-Schema braucht eine Liste von Objekten - "
                f"Eintrag {nummer} ist keines."
            )
        zeilen.append(zeile)
    return zeilen


def _text_typ(text: str) -> str:
    """Typ eines Textwerts (z. B. aus CSV): Zahl, Wahrheitswert oder Datum erkennen."""
    kern = text.strip()
    if kern.lower() in _WAHRHEITSWERTE:
        return "boolean"
    if _GANZZAHL_MUSTER.match(kern) is not None:
        return "integer"
    if _KOMMAZAHL_MUSTER.match(kern) is not None:
        return "number"
    if ist_iso_datum(kern):
        return "date"
    return "string"


def _wert_typ(wert: JsonWert, feld: str) -> str | None:
    """Typname eines Zellwerts; None bedeutet leer (null)."""
    if wert is None:
        return None
    if isinstance(wert, bool):
        return "boolean"
    if isinstance(wert, int):
        return "integer"
    if isinstance(wert, float):
        return "number"
    if isinstance(wert, str):
        return _text_typ(wert)
    raise KonvertierungUnmoeglich(
        f"Das Feld '{feld}' trägt verschachtelte Strukturen - für ein Tabellen-Schema "
        "müssen alle Felder einfache Werte tragen."
    )


def _typen_kombinieren(typen: set[str]) -> str:
    if not typen:
        return "string"
    if len(typen) == 1:
        return next(iter(typen))
    if typen <= {"integer", "number"}:
        return "number"
    return "string"


def _feld_namen(zeilen: list[dict[str, JsonWert]]) -> list[str]:
    namen: list[str] = []
    for zeile in zeilen:
        for name in zeile:
            if name not in namen:
                namen.append(name)
    return namen


def _tabellen_schema_ableiten(wurzel: JsonWert) -> SchemaAntwort:
    zeilen = _tabellen_zeilen(wurzel)
    felder: list[JsonWert] = []
    for name in _feld_namen(zeilen):
        typen: set[str] = set()
        leer_erlaubt = False
        for zeile in zeilen:
            typ = _wert_typ(zeile.get(name), name)
            if typ is None:
                leer_erlaubt = True
            else:
                typen.add(typ)
        typ_text = _typen_kombinieren(typen)
        if leer_erlaubt:
            typ_text += " (leer erlaubt)"
        felder.append({"name": name, "typ": typ_text})
    return SchemaAntwort(
        art="table_schema",
        schema={"felder": felder},
        hinweise=[f"Aus {len(zeilen)} Datensätzen abgeleitet"],
    )


def leite_schema_ab(dok: GeparstesDokument, art: SchemaArt) -> SchemaAntwort:
    if art == "json_schema":
        return _json_schema_ableiten(dok.wurzel)
    return _tabellen_schema_ableiten(dok.wurzel)


@analyzer
class SchemaInferenzAnalyzer:
    """Registrierung für Discovery und Capabilities."""

    analyzer_id: ClassVar[str] = "schema_inferenz"
    name: ClassVar[str] = "Schema-Inferenz"

    def unterstuetzt(self, dok: GeparstesDokument) -> bool:
        return True
