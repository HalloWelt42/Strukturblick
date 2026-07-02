"""Validierung: Dokumente gegen JSON Schema (Draft 2020-12) oder XSD prüfen.

JSON Schema: alle Fehler über iter_errors, nach Pfad sortiert. Jeder Fehler trägt
eine deutsch formulierte Meldung, den JSON-Pointer, die Quelltext-Position aus
der Positionskarte und den Pfad ins Schema.

XSD: nur für XML-Dokumente (natives lxml-Handle). Der Elementpfad des Fehlers
(XPath aus xmlschema) wird am Wertebaum entlang in eine JSON-Pointer-Näherung
übersetzt; die Position kommt aus der sourceline des betroffenen Elements.
"""

from __future__ import annotations

import json
import re
from typing import Any, ClassVar

import xmlschema
from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError
from lxml import etree

from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import pointer_aus_segmenten
from app.kern.positionen import position
from app.modelle.analyse import ValidierungsAntwort, ValidierungsFehler
from app.modelle.gemeinsam import FormatId, JsonWert, QuellSpanne
from app.registry import analyzer

_TYP_NAMEN = {
    "object": "Objekt",
    "array": "Liste",
    "string": "Text",
    "number": "Zahl",
    "integer": "Ganzzahl",
    "boolean": "Wahrheitswert",
    "null": "Null",
}

_PFLICHTFELD_MUSTER = re.compile(r"'(.*)' is a required property")
_UNERWARTET_MUSTER = re.compile(r"\((.*) (?:was|were) unexpected\)")
_XPATH_SEGMENT_MUSTER = re.compile(r"^([^\[\]]+)(?:\[(\d+)\])?$")


def _typ_name_von(wert: object) -> str:
    if wert is None:
        return "Null"
    if isinstance(wert, bool):
        return "Wahrheitswert"
    if isinstance(wert, int):
        return "Ganzzahl"
    if isinstance(wert, float):
        return "Zahl"
    if isinstance(wert, str):
        return "Text"
    if isinstance(wert, list):
        return "Liste"
    if isinstance(wert, dict):
        return "Objekt"
    return type(wert).__name__


def _erwartete_typen(vorgabe: object) -> str:
    namen = [vorgabe] if isinstance(vorgabe, str) else list(vorgabe)  # type: ignore[call-overload]
    return " oder ".join(_TYP_NAMEN.get(str(name), str(name)) for name in namen)


def _deutsche_meldung(fehler: Any) -> str:
    """Übersetzt die wichtigsten jsonschema-Fehlerarten; sonst bleibt die Originalmeldung."""
    art = fehler.validator
    meldung = str(fehler.message)
    if art == "type":
        gefunden = _typ_name_von(fehler.instance)
        return f"{gefunden} gefunden, {_erwartete_typen(fehler.validator_value)} erwartet"
    if art == "required":
        treffer = _PFLICHTFELD_MUSTER.match(meldung)
        if treffer is not None:
            return f"Pflichtfeld '{treffer.group(1)}' fehlt"
        return meldung
    if art == "enum":
        werte = ", ".join(json.dumps(wert, ensure_ascii=False) for wert in fehler.validator_value)
        return f"Der Wert ist nicht erlaubt - zulässig: {werte}"
    if art == "minimum":
        return f"Der Wert {fehler.instance} unterschreitet das Minimum {fehler.validator_value}"
    if art == "maximum":
        return f"Der Wert {fehler.instance} überschreitet das Maximum {fehler.validator_value}"
    if art == "pattern":
        return f"Der Wert entspricht nicht dem Muster '{fehler.validator_value}'"
    if art == "additionalProperties":
        treffer = _UNERWARTET_MUSTER.search(meldung)
        zusatz = f": {treffer.group(1)}" if treffer is not None else ""
        return f"Zusätzliche Eigenschaften sind nicht erlaubt{zusatz}"
    return meldung


def _pointer_sortier_schluessel(fehler: Any) -> str:
    return pointer_aus_segmenten(list(fehler.absolute_path))


def _wert_spanne(dok: GeparstesDokument, pfad: str) -> QuellSpanne | None:
    spannen = dok.positionen.get(pfad)
    return spannen.wert if spannen is not None else None


def pruefe_gegen_json_schema(
    dok: GeparstesDokument, schema_dok: GeparstesDokument
) -> ValidierungsAntwort:
    """Validiert den Wertebaum gegen ein JSON Schema aus einem zweiten Dokument."""
    if schema_dok.format_id != FormatId.JSON:
        raise ParseFehler(
            "Das Schema selbst ist ungültig: schema_dokument muss ein JSON-Dokument "
            f"sein (erkannt: {schema_dok.format_id.value})."
        )
    schema = schema_dok.wurzel
    if not isinstance(schema, dict | bool):
        raise ParseFehler(
            "Das Schema selbst ist ungültig: ein JSON Schema muss ein Objekt "
            "oder ein Wahrheitswert sein."
        )
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError as schema_fehler:
        raise ParseFehler(
            f"Das Schema selbst ist ungültig: {schema_fehler.message}"
        ) from schema_fehler
    validator = Draft202012Validator(schema)
    fehler_liste: list[ValidierungsFehler] = []
    for fehler in sorted(validator.iter_errors(dok.wurzel), key=_pointer_sortier_schluessel):
        pfad = pointer_aus_segmenten(list(fehler.absolute_path))
        fehler_liste.append(
            ValidierungsFehler(
                meldung=_deutsche_meldung(fehler),
                pfad=pfad,
                position=_wert_spanne(dok, pfad),
                schema_pfad=pointer_aus_segmenten(list(fehler.absolute_schema_path)),
            )
        )
    return ValidierungsAntwort(gueltig=not fehler_liste, fehler=fehler_liste)


def _pointer_naeherung(xpath: str | None, wurzel: JsonWert) -> str | None:
    """Übersetzt einen XPath aus xmlschema in einen JSON-Pointer, geführt am Wertebaum."""
    if xpath is None or not xpath.startswith("/"):
        return None
    segmente: list[str | int] = []
    aktuell: JsonWert = wurzel
    for teil in xpath.strip("/").split("/"):
        treffer = _XPATH_SEGMENT_MUSTER.match(teil)
        if treffer is None or not isinstance(aktuell, dict) or treffer.group(1) not in aktuell:
            return None
        name = treffer.group(1)
        segmente.append(name)
        aktuell = aktuell[name]
        if isinstance(aktuell, list):
            index = int(treffer.group(2) or "1") - 1
            if not 0 <= index < len(aktuell):
                return None
            segmente.append(index)
            aktuell = aktuell[index]
    return pointer_aus_segmenten(segmente)


def _zeilen_spanne(elem: object) -> QuellSpanne | None:
    zeile = getattr(elem, "sourceline", None)
    if not isinstance(zeile, int) or zeile < 1:
        return None
    stelle = position(zeile)
    return QuellSpanne(start=stelle, ende=stelle)


def pruefe_gegen_xsd(dok: GeparstesDokument, xsd_text: str) -> ValidierungsAntwort:
    """Validiert das native lxml-Handle eines XML-Dokuments gegen ein XSD."""
    if dok.format_id != FormatId.XML or not isinstance(dok.nativ, etree._Element):
        raise KonvertierungUnmoeglich(
            "Die XSD-Validierung ist nur für XML-Dokumente möglich - "
            f"dieses Dokument ist {dok.format_id.value}."
        )
    try:
        schema = xmlschema.XMLSchema(xsd_text)
    except xmlschema.XMLSchemaException as xsd_fehler:
        raise ParseFehler(f"Das XSD ist ungültig: {xsd_fehler}") from xsd_fehler
    fehler_liste: list[ValidierungsFehler] = []
    for fehler in schema.iter_errors(dok.nativ):
        fehler_liste.append(
            ValidierungsFehler(
                meldung=str(fehler.reason or fehler),
                pfad=_pointer_naeherung(fehler.path, dok.wurzel),
                position=_zeilen_spanne(getattr(fehler, "elem", None)),
                schema_pfad=None,
            )
        )
    return ValidierungsAntwort(gueltig=not fehler_liste, fehler=fehler_liste)


@analyzer
class ValidierungsAnalyzer:
    """Registrierung für Discovery und Capabilities."""

    analyzer_id: ClassVar[str] = "validierung"
    name: ClassVar[str] = "Validierung"

    def unterstuetzt(self, dok: GeparstesDokument) -> bool:
        return True
