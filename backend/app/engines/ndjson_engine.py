"""NDJSON-Engine: zeilenweises JSON (eine JSON-Einheit je Zeile) mit Zeilen-Positionen.

Jede nicht-leere Zeile wird einzeln strikt geparst; die Wurzel ist die Liste der
Zeilenwerte. Defekte Zeilen brechen das Parsen nicht ab, sondern werden mit einer
Warnung übersprungen - erst wenn keine einzige Zeile gültiges JSON ist, entsteht
ein ParseFehler. Der Pointer "/i" (0-basierter Datenindex der geparsten Zeilen)
trägt die Spanne der physischen Zeile; die inneren Positionen je Zeile stammen aus
json-source-map und werden mit dem "/i"-Präfix sowie dem Zeilen- und Offset-Versatz
der physischen Zeile (über den ZeilenIndex) verschoben.
"""

from __future__ import annotations

import json
from typing import ClassVar

from json_source_map import calculate  # type: ignore[import-untyped]
from json_source_map.types import Entry, Location  # type: ignore[import-untyped]

from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.positionen import ZeilenIndex, nur_wert, spanne
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

_ENDUNGEN = (".ndjson", ".jsonl")
_ERKENNUNGS_ZEILEN = 20


def _dekodiere(roh: bytes) -> str:
    """Dekodiert UTF-8 (inkl. BOM); nicht lesbare Bytes werden zum ParseFehler."""
    try:
        return roh.decode("utf-8-sig")
    except UnicodeDecodeError as fehler:
        raise ParseFehler(
            "Der Inhalt ist nicht als UTF-8 lesbar - bitte die Zeichenkodierung prüfen."
        ) from fehler


def _dekodiere_still(roh: bytes) -> str | None:
    try:
        return roh.decode("utf-8-sig")
    except UnicodeDecodeError:
        return None


def _verschobene_position(ort: Location, zeilen_nr: int, zeilen_start: int) -> QuellPosition:
    """json-source-map ist 0-basiert und zeilenlokal; verschiebt in das Gesamtdokument."""
    return QuellPosition(
        zeile=zeilen_nr + ort.line,
        spalte=ort.column + 1,
        offset=zeilen_start + ort.position,
    )


def _verschobene_spannen(eintrag: Entry, zeilen_nr: int, zeilen_start: int) -> KnotenSpannen:
    wert = QuellSpanne(
        start=_verschobene_position(eintrag.value_start, zeilen_nr, zeilen_start),
        ende=_verschobene_position(eintrag.value_end, zeilen_nr, zeilen_start),
    )
    schluessel: QuellSpanne | None = None
    if eintrag.key_start is not None and eintrag.key_end is not None:
        schluessel = QuellSpanne(
            start=_verschobene_position(eintrag.key_start, zeilen_nr, zeilen_start),
            ende=_verschobene_position(eintrag.key_end, zeilen_nr, zeilen_start),
        )
    return KnotenSpannen(schluessel=schluessel, wert=wert)


def _innere_positionen(
    inhalt: str, datenindex: int, zeilen_nr: int, zeilen_start: int
) -> dict[str, KnotenSpannen]:
    """Positionskarte innerhalb einer Zeile, unter dem Präfix "/{datenindex}" verschoben."""
    positionen: dict[str, KnotenSpannen] = {}
    for zeiger, eintrag in calculate(inhalt).items():
        if zeiger == "":
            continue  # die Zeile selbst trägt bereits die Spanne der physischen Zeile
        positionen[f"/{datenindex}{zeiger}"] = _verschobene_spannen(
            eintrag, zeilen_nr, zeilen_start
        )
    return positionen


def _zeilen_spanne(inhalt: str, zeilen_nr: int, zeilen_start: int) -> KnotenSpannen:
    return nur_wert(
        spanne(
            start_zeile=zeilen_nr,
            start_spalte=1,
            start_offset=zeilen_start,
            ende_zeile=zeilen_nr,
            ende_spalte=len(inhalt) + 1,
            ende_offset=zeilen_start + len(inhalt),
        )
    )


@format_engine
class NdjsonEngine:
    """Format-Engine für NDJSON/JSON Lines."""

    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.NDJSON,
        name="NDJSON (JSON Lines)",
        dateiendungen=_ENDUNGEN,
        mime_typen=("application/x-ndjson",),
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
        try:
            return self._erkennen(roh, dateiname)
        except Exception:
            return None

    def _erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        if dateiname is not None:
            endung = next((e for e in _ENDUNGEN if dateiname.lower().endswith(e)), None)
            if endung is not None:
                return ErkennungsErgebnis(
                    format_id=FormatId.NDJSON,
                    konfidenz=0.9,
                    hinweise=[f"Dateiendung {endung}"],
                )
        text = _dekodiere_still(roh)
        if text is None:
            return None
        zeilen = [zeile.strip() for zeile in text.splitlines() if zeile.strip()]
        if len(zeilen) < 2:
            return None  # eine einzelne Zeile ist gewöhnliches JSON
        probe = zeilen[:_ERKENNUNGS_ZEILEN]
        for zeile in probe:
            try:
                json.loads(zeile)
            except json.JSONDecodeError:
                return None  # mehrzeilige JSON-Dokumente scheitern hier - JSON gewinnt
        if not any(zeile.startswith("{") for zeile in probe):
            return None
        return ErkennungsErgebnis(
            format_id=FormatId.NDJSON,
            konfidenz=0.75,
            hinweise=[f"{len(probe)} Zeilen einzeln als JSON lesbar"],
        )

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        text = _dekodiere(roh)
        index = ZeilenIndex(text)
        wurzel: list[JsonWert] = []
        positionen: dict[str, KnotenSpannen] = {}
        warnungen: list[str] = []
        defekte = 0
        erste_fehler_position: QuellSpanne | None = None

        for zeilen_nr, zeile in enumerate(text.split("\n"), start=1):
            inhalt = zeile.rstrip("\r")
            if not inhalt.strip():
                continue
            try:
                wert: JsonWert = json.loads(inhalt)
            except json.JSONDecodeError as fehler:
                defekte += 1
                warnungen.append(
                    f"Zeile {zeilen_nr}: ungültiges JSON ({fehler.msg} in Spalte {fehler.colno})"
                    " - Zeile wird übersprungen"
                )
                if erste_fehler_position is None:
                    stelle = QuellPosition(
                        zeile=zeilen_nr,
                        spalte=fehler.colno,
                        offset=index.zu_offset(zeilen_nr, fehler.colno),
                    )
                    erste_fehler_position = QuellSpanne(start=stelle, ende=stelle)
                continue
            datenindex = len(wurzel)
            zeilen_start = index.zu_offset(zeilen_nr, 1)
            positionen[f"/{datenindex}"] = _zeilen_spanne(inhalt, zeilen_nr, zeilen_start)
            positionen.update(_innere_positionen(inhalt, datenindex, zeilen_nr, zeilen_start))
            wurzel.append(wert)

        if defekte and not wurzel:
            raise ParseFehler(
                "Keine Zeile des Dokuments ist gültiges JSON - "
                "NDJSON erwartet eine JSON-Einheit je Zeile.",
                position=erste_fehler_position,
                details={"defekte_zeilen": defekte},
            )
        if defekte:
            warnungen.append(f"{defekte} von {defekte + len(wurzel)} Zeilen übersprungen")

        return GeparstesDokument(
            format_id=FormatId.NDJSON,
            wurzel=wurzel,
            positionen=positionen,
            warnungen=warnungen,
        )

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        if not isinstance(dok.wurzel, list):
            raise KonvertierungUnmoeglich(
                "Der Inhalt lässt sich nicht als NDJSON schreiben: NDJSON braucht eine "
                "Liste von Einträgen, die zeilenweise (eine JSON-Einheit je Zeile) "
                "abgelegt werden."
            )
        zeilen = [
            json.dumps(
                eintrag,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=optionen.sortiere_schluessel,
            )
            for eintrag in dok.wurzel
        ]
        text = "\n".join(zeilen) + "\n" if zeilen else ""
        return SerialisierungsErgebnis(inhalt_text=text)
