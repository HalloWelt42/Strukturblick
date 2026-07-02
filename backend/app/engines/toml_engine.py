"""TOML-Engine: korrekte Werte über tomllib, Zeilen-Positionen über einen leichten Scanner.

Die Werte kommen aus tomllib (korrekt, aber positionslos). Datums- und
Zeitwerte werden zu ISO-Strings normalisiert (Verlustaspekt TYPPRAEZISION mit
Warnung). Für kommentartreues Schreiben wird der Text zusätzlich mit tomlkit
geparst und als natives Handle abgelegt.

Positionen liefert ein eigener Zeilen-Scanner (Genauigkeit "nur_zeile"):
Zeilen der Form "[tabelle]" bzw. "[[tabelle]]" setzen den aktuellen
Pfad-Präfix, Zeilen der Form "schluessel = ..." ergeben den Pointer
Präfix + /schluessel mit der Spanne der ganzen Zeile. Gepunktete Schlüssel
("a.b = 1") werden in Segmente zerlegt. Jeder gefundene Pointer wird gegen
den geparsten Wertebaum geprüft, damit Zeilen aus mehrzeiligen Strings keine
falschen Einträge erzeugen.

Grenzen des Scanners: Inline-Tabellen und Arrays (auch mehrzeilige) bekommen
nur den Pointer der Zeile ihres Schlüssels - ihre inneren Werte haben keine
eigenen Positionen. Sieht eine Zeile innerhalb eines mehrzeiligen Strings
zufällig wie eine echte, existierende Zuweisung aus, kann sie deren Position
überschreiben. Die Kommentar-Erkennung ('#' außerhalb von Anführungszeichen)
ist eine einfache Heuristik ohne Escape- und Mehrzeiler-Behandlung.
"""

from __future__ import annotations

import datetime
import re
import tomllib
from typing import ClassVar

import tomlkit
from tomlkit import TOMLDocument
from tomlkit.items import Item

from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer, pointer_aus_segmenten
from app.kern.positionen import ZeilenIndex, nur_wert, position, spanne
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
    QuellSpanne,
    Verlustaspekt,
)
from app.modelle.system import FormatFaehigkeiten
from app.registry import format_engine

_ENDUNG = ".toml"
_PROBEPARSE_MAX_BYTES = 262_144
_PROBE_ZEILEN = 30

_SCHLUESSEL_TEIL = r"(?:[A-Za-z0-9_-]+|\"[^\"]*\"|'[^']*')"
_TABELLEN_KOPF = re.compile(
    rf"^\s*\[(?P<doppelt>\[)?\s*(?P<name>{_SCHLUESSEL_TEIL}(?:\s*\.\s*{_SCHLUESSEL_TEIL})*)\s*\]\]?\s*(?:#.*)?$"
)
_SCHLUESSEL_ZEILE = re.compile(
    rf"^\s*(?P<schluessel>{_SCHLUESSEL_TEIL}(?:\s*\.\s*{_SCHLUESSEL_TEIL})*)\s*="
)
_FEHLER_POSITION = re.compile(r"at line (\d+), column (\d+)")


def _dekodiere(roh: bytes) -> str:
    """Dekodiert UTF-8 (inkl. BOM) - TOML ist laut Spezifikation immer UTF-8."""
    try:
        return roh.decode("utf-8-sig")
    except UnicodeDecodeError as fehler:
        raise ParseFehler(
            "Der Inhalt ist nicht als UTF-8 lesbar - TOML-Dokumente müssen UTF-8-kodiert sein."
        ) from fehler


def _parse_fehler_aus(fehler: tomllib.TOMLDecodeError) -> ParseFehler:
    """Formt einen tomllib-Fehler um; Zeile/Spalte stehen im Meldungstext ("at line X, column Y")."""
    meldung = str(fehler)
    treffer = _FEHLER_POSITION.search(meldung)
    if treffer is not None:
        zeile, spalte = int(treffer.group(1)), int(treffer.group(2))
        text = f"Ungültiges TOML: Syntaxfehler in Zeile {zeile}, Spalte {spalte}."
    else:
        zeile, spalte = 1, 0
        text = "Ungültiges TOML - das Dokument konnte nicht gelesen werden."
    stelle = position(zeile, spalte)
    return ParseFehler(
        text,
        position=QuellSpanne(start=stelle, ende=stelle),
        details={"technisch": meldung},
    )


def _normalisiere_werte(wert: object) -> tuple[JsonWert, bool]:
    """Formt tomllib-Werte in JsonWert um; Datum/Zeit werden ISO-Strings (2. Wert: gefunden)."""
    if isinstance(wert, dict):
        tabelle: dict[str, JsonWert] = {}
        gefunden = False
        for schluessel, teil in wert.items():
            tabelle[str(schluessel)], teil_gefunden = _normalisiere_werte(teil)
            gefunden = gefunden or teil_gefunden
        return tabelle, gefunden
    if isinstance(wert, list):
        liste: list[JsonWert] = []
        gefunden = False
        for teil in wert:
            eintrag, teil_gefunden = _normalisiere_werte(teil)
            liste.append(eintrag)
            gefunden = gefunden or teil_gefunden
        return liste, gefunden
    if isinstance(wert, datetime.datetime | datetime.date | datetime.time):
        return wert.isoformat(), True
    if isinstance(wert, bool | int | float | str):
        return wert, False
    raise ParseFehler(f"Unerwarteter TOML-Werttyp '{type(wert).__name__}'.")


def _schluessel_segmente(rohschluessel: str) -> list[str]:
    """Zerlegt einen (ggf. gepunkteten) TOML-Schlüssel in Segmente, Anführungszeichen fallen weg."""
    segmente: list[str] = []
    aktuell: list[str] = []
    anfuehrung: str | None = None
    for zeichen in rohschluessel:
        if anfuehrung is not None:
            if zeichen == anfuehrung:
                anfuehrung = None
            else:
                aktuell.append(zeichen)
        elif zeichen in ('"', "'"):
            anfuehrung = zeichen
        elif zeichen == ".":
            segmente.append("".join(aktuell))
            aktuell = []
        elif not zeichen.isspace():
            aktuell.append(zeichen)
    segmente.append("".join(aktuell))
    return segmente


def _pointer_existiert(wurzel: JsonWert, segmente: list[str | int]) -> bool:
    """Prüft, ob der Pfad im Wertebaum wirklich existiert (Schutz vor Scanner-Fehltreffern)."""
    aktuell: JsonWert = wurzel
    for segment in segmente:
        if isinstance(segment, int):
            if not isinstance(aktuell, list) or segment >= len(aktuell):
                return False
            aktuell = aktuell[segment]
        else:
            if not isinstance(aktuell, dict) or segment not in aktuell:
                return False
            aktuell = aktuell[segment]
    return True


def _zeilen_spanne(zeilen_nummer: int, inhalt: str, index: ZeilenIndex) -> QuellSpanne:
    """Spanne über die ganze Zeile: Spalte 1 bis Zeilenende, Offsets über den ZeilenIndex."""
    start_offset = index.zu_offset(zeilen_nummer, 1)
    return spanne(
        start_zeile=zeilen_nummer,
        start_spalte=1,
        start_offset=start_offset,
        ende_zeile=zeilen_nummer,
        ende_spalte=len(inhalt) + 1,
        ende_offset=start_offset + len(inhalt),
    )


def _positionen_scannen(text: str, wurzel: JsonWert) -> dict[str, KnotenSpannen]:
    """Leichter Zeilen-Scanner: Tabellen-Köpfe setzen den Präfix, Zuweisungen ergeben Pointer."""
    index = ZeilenIndex(text)
    positionen: dict[str, KnotenSpannen] = {}
    praefix: list[str | int] = []
    aot_zaehler: dict[str, int] = {}
    for nummer, zeilentext in enumerate(text.split("\n"), start=1):
        inhalt = zeilentext.rstrip("\r")
        kopf = _TABELLEN_KOPF.match(inhalt)
        if kopf is not None:
            segmente: list[str | int] = list(_schluessel_segmente(kopf.group("name")))
            if kopf.group("doppelt") is not None:
                tabellen_pfad = pointer_aus_segmenten(segmente)
                eintrag_nummer = aot_zaehler.get(tabellen_pfad, 0)
                aot_zaehler[tabellen_pfad] = eintrag_nummer + 1
                segmente.append(eintrag_nummer)
            if _pointer_existiert(wurzel, segmente):
                praefix = segmente
                positionen[pointer_aus_segmenten(praefix)] = nur_wert(
                    _zeilen_spanne(nummer, inhalt, index)
                )
            continue
        zuweisung = _SCHLUESSEL_ZEILE.match(inhalt)
        if zuweisung is None:
            continue
        segmente = praefix + list(_schluessel_segmente(zuweisung.group("schluessel")))
        if not _pointer_existiert(wurzel, segmente):
            continue
        positionen[pointer_aus_segmenten(segmente)] = nur_wert(_zeilen_spanne(nummer, inhalt, index))
    return positionen


def _zeile_hat_kommentar(zeile: str) -> bool:
    """Einfache Heuristik: '#' außerhalb von Anführungszeichen gilt als Kommentar."""
    anfuehrung: str | None = None
    for zeichen in zeile:
        if anfuehrung is not None:
            if zeichen == anfuehrung:
                anfuehrung = None
        elif zeichen in ('"', "'"):
            anfuehrung = zeichen
        elif zeichen == "#":
            return True
    return False


def _hat_kommentare(text: str) -> bool:
    return any(_zeile_hat_kommentar(zeile) for zeile in text.split("\n"))


def _sortiert_oder_original(tabelle: dict[str, JsonWert], sortieren: bool) -> list[str]:
    return sorted(tabelle) if sortieren else list(tabelle)


def _toml_wert(wert: JsonWert, pfad: str, sortieren: bool, inline: bool) -> Item:
    """Baut einen tomlkit-Wert aus dem Wertebaum; innerhalb von Arrays entstehen Inline-Tabellen."""
    if wert is None:
        raise KonvertierungUnmoeglich(
            "Der Inhalt lässt sich nicht als TOML schreiben: TOML kennt keinen "
            f"Null-Wert, aber der Wert an '{pfad}' ist null.",
            pfad=pfad,
        )
    if isinstance(wert, dict):
        tabelle = tomlkit.inline_table() if inline else tomlkit.table()
        for schluessel in _sortiert_oder_original(wert, sortieren):
            tabelle[schluessel] = _toml_wert(
                wert[schluessel], kind_pointer(pfad, schluessel), sortieren, inline
            )
        return tabelle
    if isinstance(wert, list):
        if not inline and wert and all(isinstance(eintrag, dict) for eintrag in wert):
            aot = tomlkit.aot()
            for nummer, eintrag in enumerate(wert):
                tabellen_eintrag = _toml_wert(eintrag, kind_pointer(pfad, nummer), sortieren, False)
                aot.append(tabellen_eintrag)
            return aot
        feld = tomlkit.array()
        for nummer, eintrag in enumerate(wert):
            feld.append(_toml_wert(eintrag, kind_pointer(pfad, nummer), sortieren, True))
        return feld
    return tomlkit.item(wert)


def _dokument_neu_aufbauen(wurzel: JsonWert, sortieren: bool) -> TOMLDocument:
    """Neuaufbau via tomlkit - nur eine Tabelle (dict) taugt als oberste Ebene."""
    if not isinstance(wurzel, dict):
        raise KonvertierungUnmoeglich(
            "Der Inhalt lässt sich nicht als TOML schreiben: TOML braucht auf oberster "
            "Ebene eine Tabelle mit Schlüssel-Wert-Paaren, keine Liste und keinen Einzelwert."
        )
    dokument = tomlkit.document()
    for schluessel in _sortiert_oder_original(wurzel, sortieren):
        dokument[schluessel] = _toml_wert(
            wurzel[schluessel], kind_pointer("", schluessel), sortieren, False
        )
    return dokument


@format_engine
class TomlEngine:
    """Format-Engine für TOML mit Zeilen-Positionen und kommentartreuem Round-Trip."""

    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.TOML,
        name="TOML (kommentartreues Schreiben)",
        dateiendungen=(_ENDUNG,),
        mime_typen=("application/toml",),
        kann_lesen=True,
        kann_schreiben=True,
        ist_tabellarisch=False,
        positionsgenauigkeit="nur_zeile",
        traegt=frozenset(
            {
                Verlustaspekt.KOMMENTARE,
                Verlustaspekt.VERSCHACHTELUNG,
                Verlustaspekt.TYPPRAEZISION,
                Verlustaspekt.SCHLUESSELREIHENFOLGE,
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
                format_id=FormatId.TOML,
                konfidenz=0.85,
                hinweise=[f"Dateiendung {_ENDUNG}"],
            )
        if len(roh) > _PROBEPARSE_MAX_BYTES:
            return None
        try:
            text = roh.decode("utf-8-sig")
        except UnicodeDecodeError:
            return None
        kern = text.strip()
        if not kern or kern[0] in "{<":
            return None
        zeilen = kern.splitlines()
        # Ein "["-Präfix ist nur als Tabellen-Kopf "[name]" erlaubt (sonst JSON-Verdacht)
        if kern[0] == "[" and _TABELLEN_KOPF.match(zeilen[0]) is None:
            return None
        hat_muster = any(
            _SCHLUESSEL_ZEILE.match(zeile) or _TABELLEN_KOPF.match(zeile)
            for zeile in zeilen[:_PROBE_ZEILEN]
        )
        if not hat_muster:
            return None
        tomllib.loads(text)  # Fehlschlag landet im Exception-Fang von erkennen()
        return ErkennungsErgebnis(
            format_id=FormatId.TOML,
            konfidenz=0.7,
            hinweise=["Schlüssel=Wert-Muster und erfolgreicher Probeparse"],
        )

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        text = _dekodiere(roh)
        try:
            rohwerte = tomllib.loads(text)
        except tomllib.TOMLDecodeError as fehler:
            raise _parse_fehler_aus(fehler) from fehler

        wurzel, datum_gefunden = _normalisiere_werte(rohwerte)
        warnungen: list[str] = []
        aspekte: set[Verlustaspekt] = set()
        if datum_gefunden:
            aspekte.add(Verlustaspekt.TYPPRAEZISION)
            warnungen.append("Datums- und Zeitwerte wurden zu ISO-Strings normalisiert")
        if _hat_kommentare(text):
            aspekte.add(Verlustaspekt.KOMMENTARE)

        try:
            nativ: TOMLDocument | None = tomlkit.parse(text)
        except Exception:
            nativ = None  # tomllib hat bereits validiert - ohne Handle nur kein Kommentar-Round-Trip

        return GeparstesDokument(
            format_id=FormatId.TOML,
            wurzel=wurzel,
            positionen=_positionen_scannen(text, wurzel),
            genutzte_aspekte=frozenset(aspekte),
            nativ=nativ,
            warnungen=warnungen,
        )

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        if dok.format_id == FormatId.TOML and isinstance(dok.nativ, TOMLDocument):
            return SerialisierungsErgebnis(inhalt_text=tomlkit.dumps(dok.nativ))
        dokument = _dokument_neu_aufbauen(dok.wurzel, optionen.sortiere_schluessel)
        return SerialisierungsErgebnis(inhalt_text=tomlkit.dumps(dokument))
