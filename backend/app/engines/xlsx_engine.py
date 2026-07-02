"""XLSX-Engine: Import von Tabellenblättern (read-only, ohne Formeln).

Die Engine liest die erste Zeile jedes Blatts als Spaltenköpfe und projiziert die
Datenzeilen in Zeilen-Objekte (Spaltenname -> Zellwert). Bei genau einem Blatt ist
die Wurzel eine flache Liste von Zeilen-Objekten (wie bei CSV); bei mehreren
Blättern ist die Wurzel ein Objekt Blattname -> Liste von Zeilen-Objekten (Aspekt
MEHRERE_TABELLEN plus Warnung).

Typen: openpyxl liefert bei data_only=True die zwischengespeicherten Werte als
int, float, bool, datetime, str oder None. Datums- und Zeitwerte werden zu
ISO-8601-Strings normalisiert (Aspekt TYPPRAEZISION plus Warnung), weil der
JSON-Wertebaum keinen eigenen Datentyp dafür kennt.

Positionen (Genauigkeit "zelle"): Je Zelle trägt der Pointer eine Spanne, deren
zeile die 1-basierte Tabellenzeile (Kopfzeile = 1, erste Datenzeile = 2) und deren
spalte den 1-basierten Spaltenindex nennt. Der Offset bleibt unbekannt (-1), weil
XLSX ein binäres ZIP-Format ohne Zeichenoffsets ist. Bei einem Blatt lauten die
Pointer "/{zeilenindex}" und "/{zeilenindex}/{spaltenname}", bei mehreren Blättern
"/{blattname}" und "/{blattname}/{zeilenindex}/{spaltenname}".

Grenzen: Formeln werden nicht ausgewertet, sondern liefern (data_only=True) den
zuletzt von der Tabellenkalkulation gespeicherten Wert - fehlt dieser, ist die
Zelle None. Zellformate (Zahlenformat, Farbe, Formatierung) werden verworfen
(Aspekt ZELLFORMATE). Verbundene Zellen tragen ihren Wert nur in der oberen
linken Zelle. Leere Blätter ergeben eine leere Liste. Schreiben wird nicht
unterstützt.
"""

from __future__ import annotations

import io
from datetime import date, datetime, time, timedelta
from typing import ClassVar, cast

import openpyxl  # type: ignore[import-untyped]  # kein py.typed / keine Stubs verfügbar

from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer, pointer_aus_segmenten
from app.kern.positionen import nur_wert
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

_ENDUNG = ".xlsx"
_ZIP_MAGIC = b"PK\x03\x04"
_WORKBOOK_MARKER = b"xl/workbook"

# Zellwerte, wie openpyxl sie bei data_only=True liefert.
type _Zellwert = None | bool | int | float | str | datetime | date | time | timedelta


def _zell_spanne(zeile: int, spalte: int) -> QuellSpanne:
    """Spanne einer einzelnen Zelle - Zeile/Spalte bekannt, Offset unbekannt (binär)."""
    stelle = QuellPosition(zeile=zeile, spalte=spalte, offset=-1)
    return QuellSpanne(start=stelle, ende=stelle)


def _wert_normalisieren(
    wert: _Zellwert, aspekte: set[Verlustaspekt], warnungen: list[str], warn_pfad: str
) -> JsonWert:
    """Projiziert einen openpyxl-Zellwert in den JSON-Wertebaum.

    Datums- und Zeitwerte werden zu ISO-Strings; das kostet Typpräzision, weil der
    Wertebaum keinen eigenen Datentyp dafür hat.
    """
    if wert is None or isinstance(wert, bool | int | float | str):
        return wert
    if isinstance(wert, datetime | date | time):
        aspekte.add(Verlustaspekt.TYPPRAEZISION)
        warnungen.append(
            f"Der Datums-/Zeitwert an '{warn_pfad}' wurde zu einem ISO-Text - der "
            "Wertebaum kennt keinen eigenen Datentyp dafür (typpraezision)"
        )
        return wert.isoformat()
    if isinstance(wert, timedelta):
        aspekte.add(Verlustaspekt.TYPPRAEZISION)
        warnungen.append(
            f"Die Zeitdauer an '{warn_pfad}' wurde zu Sekunden (Zahl) - der "
            "Wertebaum kennt keinen eigenen Datentyp dafür (typpraezision)"
        )
        return wert.total_seconds()
    # Unerwarteter Typ - defensiv zu Text, damit der Wertebaum JSON-fähig bleibt.
    warnungen.append(f"Unerwarteter Zelltyp an '{warn_pfad}' wurde zu Text")
    return str(wert)


def _eindeutige_spaltennamen(rohe_namen: list[_Zellwert], warnungen: list[str]) -> list[str]:
    """Macht Spaltennamen zu eindeutigen, nicht-leeren Strings (mit Warnung bei Konflikt)."""
    vergeben: set[str] = set()
    zaehler: dict[str, int] = {}
    ergebnis: list[str] = []
    for spaltenindex, roh in enumerate(rohe_namen, start=1):
        if roh is None or (isinstance(roh, str) and not roh.strip()):
            basis = f"spalte_{spaltenindex}"
            warnungen.append(f"Leerer Spaltenname in Spalte {spaltenindex} wurde zu '{basis}'")
        else:
            basis = str(roh)
        eindeutig = basis
        while eindeutig in vergeben:
            zaehler[basis] = zaehler.get(basis, 1) + 1
            eindeutig = f"{basis}_{zaehler[basis]}"
        if eindeutig != basis and roh is not None:
            warnungen.append(f"Doppelter Spaltenname '{basis}' wurde zu '{eindeutig}' umbenannt")
        vergeben.add(eindeutig)
        ergebnis.append(eindeutig)
    return ergebnis


def _blatt_zeilen(
    zeilen: list[tuple[_Zellwert, ...]],
    pointer_praefix: str,
    aspekte: set[Verlustaspekt],
    warnungen: list[str],
) -> tuple[list[dict[str, JsonWert]], dict[str, KnotenSpannen]]:
    """Baut Zeilen-Objekte und Zell-Positionen eines Blatts auf.

    pointer_praefix ist "" bei einem einzelnen Blatt und "/{blattname}" bei mehreren.
    """
    if not zeilen:
        return [], {}
    spaltennamen = _eindeutige_spaltennamen(list(zeilen[0]), warnungen)

    wurzel: list[dict[str, JsonWert]] = []
    positionen: dict[str, KnotenSpannen] = {}
    for daten_index, roh_zeile in enumerate(zeilen[1:]):
        tabellen_zeile = daten_index + 2  # Kopfzeile = 1, erste Datenzeile = 2
        if pointer_praefix:
            zeilen_pointer = kind_pointer(pointer_praefix, str(daten_index))
        else:
            zeilen_pointer = pointer_aus_segmenten([daten_index])
        objekt: dict[str, JsonWert] = {}
        for spalten_index, name in enumerate(spaltennamen):
            roh_wert = roh_zeile[spalten_index] if spalten_index < len(roh_zeile) else None
            zell_pointer = kind_pointer(zeilen_pointer, name)
            objekt[name] = _wert_normalisieren(roh_wert, aspekte, warnungen, zell_pointer)
            positionen[zell_pointer] = nur_wert(_zell_spanne(tabellen_zeile, spalten_index + 1))
        wurzel.append(objekt)
        positionen[zeilen_pointer] = nur_wert(_zell_spanne(tabellen_zeile, 1))
    return wurzel, positionen


@format_engine
class XlsxEngine:
    """Format-Engine für den Import von XLSX-Tabellenblättern (nur Lesen)."""

    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.XLSX,
        name="XLSX (Tabellenblatt-Import)",
        dateiendungen=(_ENDUNG,),
        mime_typen=("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",),
        kann_lesen=True,
        kann_schreiben=False,
        ist_tabellarisch=True,
        ist_binaer=True,
        positionsgenauigkeit="zelle",
        traegt=frozenset(
            {
                Verlustaspekt.VERSCHACHTELUNG,
                Verlustaspekt.MEHRERE_TABELLEN,
                Verlustaspekt.ZELLFORMATE,
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
        if dateiname is not None and dateiname.lower().endswith(_ENDUNG):
            return ErkennungsErgebnis(
                format_id=FormatId.XLSX,
                konfidenz=0.95,
                hinweise=[f"Dateiendung {_ENDUNG}"],
            )
        if roh[:4] == _ZIP_MAGIC and _WORKBOOK_MARKER in roh[:4000]:
            return ErkennungsErgebnis(
                format_id=FormatId.XLSX,
                konfidenz=0.8,
                hinweise=["ZIP-Container mit Arbeitsmappen-Eintrag"],
            )
        return None

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        try:
            mappe = openpyxl.load_workbook(io.BytesIO(roh), read_only=True, data_only=True)
        except Exception as fehler:  # openpyxl wirft diverse Fehlertypen bei defekten Mappen
            raise ParseFehler(
                "Die Arbeitsmappe lässt sich nicht öffnen - "
                "sie ist beschädigt oder kein gültiges XLSX."
            ) from fehler
        try:
            return self._aus_mappe(mappe)
        finally:
            mappe.close()

    def _aus_mappe(self, mappe: object) -> GeparstesDokument:
        blaetter = list(cast("list[object]", mappe.worksheets))  # type: ignore[attr-defined]
        aspekte: set[Verlustaspekt] = set()
        warnungen: list[str] = []

        if len(blaetter) <= 1:
            zeilen = self._zeilen_lesen(blaetter[0]) if blaetter else []
            wurzel_liste, positionen = _blatt_zeilen(zeilen, "", aspekte, warnungen)
            return GeparstesDokument(
                format_id=FormatId.XLSX,
                wurzel=cast("JsonWert", wurzel_liste),
                positionen=positionen,
                genutzte_aspekte=frozenset(aspekte),
                warnungen=warnungen,
            )

        aspekte.add(Verlustaspekt.MEHRERE_TABELLEN)
        warnungen.append(
            f"Die Arbeitsmappe hat {len(blaetter)} Blätter - die Wurzel ist ein Objekt "
            "Blattname -> Tabelle (mehrere_tabellen)"
        )
        wurzel_dict: dict[str, JsonWert] = {}
        positionen = {}
        blattnamen = _eindeutige_blattnamen(blaetter, warnungen)
        for blatt, name in zip(blaetter, blattnamen, strict=True):
            zeilen = self._zeilen_lesen(blatt)
            blatt_pointer = kind_pointer("", name)
            blatt_zeilen, blatt_positionen = _blatt_zeilen(zeilen, blatt_pointer, aspekte, warnungen)
            wurzel_dict[name] = cast("JsonWert", blatt_zeilen)
            positionen.update(blatt_positionen)
        return GeparstesDokument(
            format_id=FormatId.XLSX,
            wurzel=wurzel_dict,
            positionen=positionen,
            genutzte_aspekte=frozenset(aspekte),
            warnungen=warnungen,
        )

    @staticmethod
    def _zeilen_lesen(blatt: object) -> list[tuple[_Zellwert, ...]]:
        """Liest alle Zeilen eines Blatts als Wert-Tupel (values_only)."""
        roh_zeilen = cast(
            "list[tuple[_Zellwert, ...]]",
            list(blatt.iter_rows(values_only=True)),  # type: ignore[attr-defined]
        )
        # Vollständig leere Zeilen am Ende (openpyxl-Artefakt) beschneiden.
        while roh_zeilen and all(zelle is None for zelle in roh_zeilen[-1]):
            roh_zeilen.pop()
        return roh_zeilen

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        raise KonvertierungUnmoeglich("XLSX kann derzeit nur gelesen werden.")


def _eindeutige_blattnamen(blaetter: list[object], warnungen: list[str]) -> list[str]:
    """Blattnamen als eindeutige Strings (openpyxl garantiert das bereits, defensiv)."""
    vergeben: set[str] = set()
    zaehler: dict[str, int] = {}
    ergebnis: list[str] = []
    for index, blatt in enumerate(blaetter, start=1):
        roh = cast("object", blatt.title)  # type: ignore[attr-defined]
        basis = str(roh) if roh else f"Tabelle{index}"
        eindeutig = basis
        while eindeutig in vergeben:
            zaehler[basis] = zaehler.get(basis, 1) + 1
            eindeutig = f"{basis}_{zaehler[basis]}"
        if eindeutig != basis:
            warnungen.append(f"Doppelter Blattname '{basis}' wurde zu '{eindeutig}' umbenannt")
        vergeben.add(eindeutig)
        ergebnis.append(eindeutig)
    return ergebnis
