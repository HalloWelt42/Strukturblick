"""JSON-Engine: striktes Parsen mit Positionskarte, toleranter JSON5/JSONC-Fallback.

Strikt geparste Dokumente erhalten eine vollständige Positionskarte
(JSON-Pointer -> Quelltext-Spannen) über json-source-map. Schlägt das strikte
Parsen fehl und ist tolerant erlaubt, wird pyjson5 versucht - dann ohne
Positionen, aber mit klarer Warnung.
"""

from __future__ import annotations

import json
from typing import ClassVar

import pyjson5
from json_source_map import calculate  # type: ignore[import-untyped]
from json_source_map.types import Entry, Location  # type: ignore[import-untyped]

from app.fehler import ParseFehler
from app.kern.dokument import GeparstesDokument
from app.modelle.dokument import (
    ErkennungsErgebnis,
    ParseOptionen,
    SerialisierungsErgebnis,
    SerialisierungsOptionen,
)
from app.modelle.gemeinsam import (
    FormatId,
    JsonWert,
    KnotenSpannen,
    QuellPosition,
    QuellSpanne,
    Verlustaspekt,
)
from app.modelle.system import FormatFaehigkeiten
from app.registry import format_engine

_ENDUNGEN = (".json", ".jsonc", ".json5")
_PROBEPARSE_MAX_BYTES = 262_144


def _dekodiere(roh: bytes) -> str:
    """Dekodiert UTF-8 (inkl. BOM); nicht lesbare Bytes werden zum ParseFehler."""
    try:
        return roh.decode("utf-8-sig")
    except UnicodeDecodeError as fehler:
        raise ParseFehler(
            "Der Inhalt ist nicht als UTF-8 lesbar - bitte die Zeichenkodierung prüfen."
        ) from fehler


def _position_aus(ort: Location) -> QuellPosition:
    """json-source-map liefert 0-basierte Zeile/Spalte; wir sind 1-basiert."""
    return QuellPosition(zeile=ort.line + 1, spalte=ort.column + 1, offset=ort.position)


def _knoten_spannen(eintrag: Entry) -> KnotenSpannen:
    wert = QuellSpanne(start=_position_aus(eintrag.value_start), ende=_position_aus(eintrag.value_end))
    schluessel: QuellSpanne | None = None
    if eintrag.key_start is not None and eintrag.key_end is not None:
        schluessel = QuellSpanne(start=_position_aus(eintrag.key_start), ende=_position_aus(eintrag.key_end))
    return KnotenSpannen(schluessel=schluessel, wert=wert)


def _positionskarte(text: str) -> dict[str, KnotenSpannen]:
    return {pointer: _knoten_spannen(eintrag) for pointer, eintrag in calculate(text).items()}


def _lade_mit_duplikat_pruefung(text: str) -> tuple[JsonWert, list[str]]:
    """Striktes json.loads; doppelte Objektschlüssel werden als Warnungen gesammelt."""
    warnungen: list[str] = []

    def paare_zu_dict(paare: list[tuple[str, JsonWert]]) -> dict[str, JsonWert]:
        ergebnis: dict[str, JsonWert] = {}
        for schluessel, wert in paare:
            if schluessel in ergebnis:
                warnungen.append(
                    f"Doppelter Schlüssel '{schluessel}' - nur der letzte Wert wird übernommen"
                )
            ergebnis[schluessel] = wert
        return ergebnis

    wurzel: JsonWert = json.loads(text, object_pairs_hook=paare_zu_dict)
    return wurzel, warnungen


def _parse_fehler_aus(fehler: json.JSONDecodeError) -> ParseFehler:
    stelle = QuellPosition(zeile=fehler.lineno, spalte=fehler.colno, offset=fehler.pos)
    return ParseFehler(
        f"Ungültiges JSON: Syntaxfehler in Zeile {fehler.lineno}, Spalte {fehler.colno}.",
        position=QuellSpanne(start=stelle, ende=stelle),
        details={"technisch": fehler.msg},
    )


def _strikt_parsen(text: str) -> GeparstesDokument:
    wurzel, warnungen = _lade_mit_duplikat_pruefung(text)
    aspekte = frozenset({Verlustaspekt.DUPLIKAT_SCHLUESSEL}) if warnungen else frozenset()
    return GeparstesDokument(
        format_id=FormatId.JSON,
        wurzel=wurzel,
        positionen=_positionskarte(text),
        genutzte_aspekte=aspekte,
        warnungen=warnungen,
    )


def _tolerant_parsen(text: str) -> GeparstesDokument | None:
    """Zweiter Versuch mit pyjson5 (JSON5/JSONC); None bei Misserfolg."""
    try:
        wurzel: JsonWert = pyjson5.decode(text)
    except Exception:
        return None
    hat_kommentare = "//" in text or "/*" in text
    aspekte = frozenset({Verlustaspekt.KOMMENTARE}) if hat_kommentare else frozenset()
    return GeparstesDokument(
        format_id=FormatId.JSON,
        wurzel=wurzel,
        genutzte_aspekte=aspekte,
        warnungen=["Tolerant geparst (JSON5/JSONC) - Sprungmarken sind nicht verfügbar"],
    )


def _passende_endung(dateiname: str) -> str | None:
    klein = dateiname.lower()
    for endung in _ENDUNGEN:
        if klein.endswith(endung):
            return endung
    return None


def _dekodiere_still(roh: bytes) -> str | None:
    try:
        return roh.decode("utf-8-sig")
    except UnicodeDecodeError:
        return None


def _inhalts_konfidenz(roh: bytes, kern: str) -> tuple[float, list[str]]:
    """Probeparse für kleine Inhalte; sonst zählt nur das JSON-typische Präfix."""
    if len(roh) <= _PROBEPARSE_MAX_BYTES:
        try:
            json.loads(kern)
        except json.JSONDecodeError:
            pass
        else:
            return 0.98, ["vollständiger Probeparse erfolgreich"]
    return 0.6, ["beginnt mit '{' oder '['"]


def _ist_json_objekt(zeile: str) -> bool:
    try:
        return isinstance(json.loads(zeile), dict)
    except json.JSONDecodeError:
        return False


def _sieht_nach_ndjson_aus(kern: str) -> bool:
    """Mehr als eine Zeile, und jede nicht-leere Zeile ist für sich ein JSON-Objekt."""
    zeilen = [zeile.strip() for zeile in kern.splitlines() if zeile.strip()]
    if len(zeilen) < 2 or not all(zeile.startswith("{") for zeile in zeilen):
        return False
    return all(_ist_json_objekt(zeile) for zeile in zeilen)


@format_engine
class JsonEngine:
    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.JSON,
        name="JSON (inkl. JSON5/JSONC-tolerant)",
        dateiendungen=_ENDUNGEN,
        mime_typen=("application/json",),
        kann_lesen=True,
        kann_schreiben=True,
        ist_tabellarisch=False,
        positionsgenauigkeit="zeile_spalte",
        traegt=frozenset(
            {
                Verlustaspekt.VERSCHACHTELUNG,
                Verlustaspekt.SCHLUESSELREIHENFOLGE,
                Verlustaspekt.TYPPRAEZISION,
            }
        ),
    )

    def erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        if dateiname is not None:
            endung = _passende_endung(dateiname)
            if endung is not None:
                return ErkennungsErgebnis(
                    format_id=FormatId.JSON,
                    konfidenz=0.9,
                    hinweise=[f"Dateiendung {endung}"],
                )
        text = _dekodiere_still(roh)
        if text is None:
            return None
        kern = text.strip()
        if not kern.startswith(("{", "[")):
            return None
        konfidenz, hinweise = _inhalts_konfidenz(roh, kern)
        if _sieht_nach_ndjson_aus(kern):
            konfidenz = 0.5
            hinweise.append("womöglich NDJSON")
        return ErkennungsErgebnis(format_id=FormatId.JSON, konfidenz=konfidenz, hinweise=hinweise)

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        text = _dekodiere(roh)
        try:
            return _strikt_parsen(text)
        except json.JSONDecodeError as strikt_fehler:
            if optionen.tolerant:
                dokument = _tolerant_parsen(text)
                if dokument is not None:
                    return dokument
            raise _parse_fehler_aus(strikt_fehler) from strikt_fehler

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        if optionen.einrueckung > 0:
            text = json.dumps(
                dok.wurzel,
                ensure_ascii=False,
                sort_keys=optionen.sortiere_schluessel,
                indent=optionen.einrueckung,
            )
        else:
            text = json.dumps(
                dok.wurzel,
                ensure_ascii=False,
                sort_keys=optionen.sortiere_schluessel,
                separators=(",", ":"),
            )
        return SerialisierungsErgebnis(inhalt_text=text + "\n")
