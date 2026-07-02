"""Markdown-Tabellen-Engine: GFM-Pipe-Tabellen lesen und schreiben.

Ein eigener Mini-Parser erkennt die erste GFM-Tabelle: eine Kopfzeile mit
Pipe-Zeichen, eine Trennzeile aus Bindestrichen und Doppelpunkten (etwa
"---|:--:|--:") und darunter zusammenhängende Datenzeilen. Die Wurzel ist eine
flache Liste von Zeilen-Objekten (Spaltenname -> Zelltext, leere Zelle -> None).

Positionen (Genauigkeit "zelle"): Der Zeilen-Pointer "/{i}" trägt die Spanne der
ganzen Datenzeile, der Zell-Pointer "/{i}/{spalte}" die exakte Spanne des
getrimmten Zellinhalts. Die Spaltengrenzen ergeben sich aus den Positionen der
nicht maskierten Pipe-Zeichen; Offsets rechnet der ZeilenIndex aus.

Grenzen: Nur die erste Tabelle wird gelesen. Verschachtelte Strukturen kann das
Format nicht abbilden (Aspekt VERSCHACHTELUNG). Zellinhalt bleibt roher
Markdown-Text (Formatierung wird nicht interpretiert). Beim Schreiben werden
Pipe-Zeichen im Wert mit "\\|" maskiert und echte Zeilenumbrüche zu Leerzeichen,
damit die Tabellenstruktur erhalten bleibt.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import ClassVar, cast

from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer, pointer_aus_segmenten
from app.kern.positionen import ZeilenIndex, nur_wert, spanne
from app.modelle.dokument import (
    ErkennungsErgebnis,
    ParseOptionen,
    SerialisierungsErgebnis,
    SerialisierungsOptionen,
)
from app.modelle.gemeinsam import FormatId, JsonWert, KnotenSpannen, QuellSpanne, Verlustaspekt
from app.modelle.system import FormatFaehigkeiten
from app.registry import format_engine

_ENDUNGEN = (".md", ".markdown")
# Trennzeile: nur Pipes, Bindestriche, Doppelpunkte und Leerraum, mindestens ein Bindestrich.
_TRENNZEILE = re.compile(r"^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$")


@dataclass(frozen=True)
class _Zelle:
    """Getrimmter Zelltext samt exakter Spalten-Spanne (1-basiert) in der Quellzeile."""

    text: str
    start_spalte: int
    ende_spalte: int


def _zellen_zerlegen(zeile: str) -> list[_Zelle]:
    """Zerlegt eine Tabellenzeile an nicht maskierten Pipes in getrimmte Zellen.

    Führende und schließende Pipe-Zeichen (falls vorhanden) begrenzen die Zeile und
    erzeugen keine leeren Randzellen. Die Spalten sind 1-basiert und beziehen sich
    auf die Originalzeile (nach dem Trimmen des Zellinhalts).
    """
    grenzen = _pipe_positionen(zeile)
    segmente: list[tuple[int, int]] = []  # (start, ende) je Zelle, 0-basiert, ende exklusiv
    voriges_ende = 0
    for grenze in grenzen:
        segmente.append((voriges_ende, grenze))
        voriges_ende = grenze + 1
    segmente.append((voriges_ende, len(zeile)))

    # Ist die Zeile von Pipes umschlossen, sind erstes und letztes Segment leer -> weg.
    zellen: list[_Zelle] = []
    for nummer, (start, ende) in enumerate(segmente):
        roh = zeile[start:ende]
        ist_rand = nummer == 0 or nummer == len(segmente) - 1
        if ist_rand and not roh.strip() and grenzen:
            continue
        zellen.append(_getrimmte_zelle(roh, start))
    return zellen


def _pipe_positionen(zeile: str) -> list[int]:
    """0-basierte Positionen der nicht maskierten Pipe-Zeichen."""
    positionen: list[int] = []
    for index, zeichen in enumerate(zeile):
        if zeichen == "|" and (index == 0 or zeile[index - 1] != "\\"):
            positionen.append(index)
    return positionen


def _getrimmte_zelle(roh: str, start_offset: int) -> _Zelle:
    """Trimmt einen Zell-Rohtext und rechnet die 1-basierten Spalten des Kerns aus."""
    links = len(roh) - len(roh.lstrip())
    kern = roh.strip()
    start_spalte = start_offset + links + 1
    return _Zelle(text=kern, start_spalte=start_spalte, ende_spalte=start_spalte + len(kern))


@dataclass(frozen=True)
class _TabellenZeile:
    """Eine physische Tabellenzeile: 1-basierte Zeilennummer, Rohtext und Zellen."""

    nummer: int
    text: str
    zellen: list[_Zelle]


def _tabelle_finden(zeilen: list[str]) -> tuple[_TabellenZeile, list[_TabellenZeile]] | None:
    """Sucht die erste GFM-Tabelle und liefert (Kopfzeile, Datenzeilen) oder None."""
    for index in range(len(zeilen) - 1):
        kopf = zeilen[index]
        trenn = zeilen[index + 1]
        if "|" not in kopf or not _TRENNZEILE.match(trenn) or "-" not in trenn:
            continue
        kopf_zeile = _tabellen_zeile(index + 1, kopf)
        if not kopf_zeile.zellen:
            continue
        daten: list[_TabellenZeile] = []
        for versatz in range(index + 2, len(zeilen)):
            roh = zeilen[versatz]
            if "|" not in roh or not roh.strip():
                break
            daten.append(_tabellen_zeile(versatz + 1, roh))
        return kopf_zeile, daten
    return None


def _tabellen_zeile(nummer: int, text: str) -> _TabellenZeile:
    return _TabellenZeile(nummer=nummer, text=text, zellen=_zellen_zerlegen(text))


def _eindeutige_spaltennamen(kopf: _TabellenZeile, warnungen: list[str]) -> list[str]:
    """Kopf-Zellen zu eindeutigen, nicht-leeren Spaltennamen (mit Warnung bei Konflikt)."""
    vergeben: set[str] = set()
    zaehler: dict[str, int] = {}
    ergebnis: list[str] = []
    for spaltenindex, zelle in enumerate(kopf.zellen, start=1):
        if not zelle.text:
            basis = f"spalte_{spaltenindex}"
            warnungen.append(f"Leerer Spaltenname in Spalte {spaltenindex} wurde zu '{basis}'")
        else:
            basis = zelle.text
        eindeutig = basis
        while eindeutig in vergeben:
            zaehler[basis] = zaehler.get(basis, 1) + 1
            eindeutig = f"{basis}_{zaehler[basis]}"
        if eindeutig != basis and zelle.text:
            warnungen.append(f"Doppelter Spaltenname '{basis}' wurde zu '{eindeutig}' umbenannt")
        vergeben.add(eindeutig)
        ergebnis.append(eindeutig)
    return ergebnis


def _zell_spanne(zeile: _TabellenZeile, zelle: _Zelle, index: ZeilenIndex) -> QuellSpanne:
    start_offset = index.zu_offset(zeile.nummer, zelle.start_spalte)
    return spanne(
        start_zeile=zeile.nummer,
        start_spalte=zelle.start_spalte,
        start_offset=start_offset,
        ende_zeile=zeile.nummer,
        ende_spalte=zelle.ende_spalte,
        ende_offset=start_offset + len(zelle.text),
    )


def _zeilen_spanne(zeile: _TabellenZeile, index: ZeilenIndex) -> QuellSpanne:
    inhalt = zeile.text.rstrip("\r")
    start_offset = index.zu_offset(zeile.nummer, 1)
    return spanne(
        start_zeile=zeile.nummer,
        start_spalte=1,
        start_offset=start_offset,
        ende_zeile=zeile.nummer,
        ende_spalte=len(inhalt) + 1,
        ende_offset=start_offset + len(inhalt),
    )


def _wert_escapen(wert: JsonWert) -> str:
    """Skalar zu Zelltext: Pipes maskieren, Zeilenumbrüche zu Leerzeichen, None -> leer."""
    if wert is None:
        return ""
    if isinstance(wert, bool):
        text = "true" if wert else "false"
    else:
        text = str(wert)
    text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    return text.replace("|", "\\|")


@format_engine
class MdTabelleEngine:
    """Format-Engine für Markdown-Pipe-Tabellen (GFM)."""

    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.MD_TABELLE,
        name="Markdown-Tabelle",
        dateiendungen=_ENDUNGEN,
        mime_typen=("text/markdown",),
        kann_lesen=True,
        kann_schreiben=True,
        ist_tabellarisch=True,
        positionsgenauigkeit="zelle",
        traegt=frozenset({Verlustaspekt.VERSCHACHTELUNG}),
    )

    def erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        try:
            return self._erkennen(roh, dateiname)
        except Exception:
            return None

    def _erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        hat_endung = dateiname is not None and any(
            dateiname.lower().endswith(e) for e in _ENDUNGEN
        )
        if not hat_endung:
            return None
        try:
            text = roh.decode("utf-8-sig")
        except UnicodeDecodeError:
            return None
        if not self._hat_tabellen_trennzeile(text):
            return None  # .md ohne Tabelle ist nicht Sache dieser Engine
        return ErkennungsErgebnis(
            format_id=FormatId.MD_TABELLE,
            konfidenz=0.8,
            hinweise=["Markdown mit Tabellen-Trennzeile"],
        )

    @staticmethod
    def _hat_tabellen_trennzeile(text: str) -> bool:
        zeilen = text.split("\n")
        for index in range(len(zeilen) - 1):
            if "|" in zeilen[index] and _TRENNZEILE.match(zeilen[index + 1]) and "-" in zeilen[index + 1]:
                return True
        return False

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        try:
            text = roh.decode("utf-8-sig")
        except UnicodeDecodeError as fehler:
            raise ParseFehler(
                "Der Inhalt ist nicht als UTF-8 lesbar - bitte die Zeichenkodierung prüfen."
            ) from fehler
        zeilen = text.split("\n")
        gefunden = _tabelle_finden(zeilen)
        if gefunden is None:
            raise ParseFehler("Keine Markdown-Tabelle gefunden.")
        kopf, datenzeilen = gefunden

        warnungen: list[str] = []
        spaltennamen = _eindeutige_spaltennamen(kopf, warnungen)
        index = ZeilenIndex(text)
        wurzel, positionen = self._zeilen_aufbauen(
            datenzeilen, spaltennamen, index, warnungen
        )
        return GeparstesDokument(
            format_id=FormatId.MD_TABELLE,
            wurzel=cast("JsonWert", wurzel),
            positionen=positionen,
            warnungen=warnungen,
        )

    def _zeilen_aufbauen(
        self,
        datenzeilen: list[_TabellenZeile],
        spaltennamen: list[str],
        index: ZeilenIndex,
        warnungen: list[str],
    ) -> tuple[list[dict[str, str | None]], dict[str, KnotenSpannen]]:
        wurzel: list[dict[str, str | None]] = []
        positionen: dict[str, KnotenSpannen] = {}
        for daten_index, zeile in enumerate(datenzeilen):
            if len(zeile.zellen) != len(spaltennamen):
                warnungen.append(
                    f"Zeile {zeile.nummer} hat {len(zeile.zellen)} "
                    f"statt {len(spaltennamen)} Zellen"
                )
            zeilen_pointer = pointer_aus_segmenten([daten_index])
            positionen[zeilen_pointer] = nur_wert(_zeilen_spanne(zeile, index))
            objekt: dict[str, str | None] = {}
            for spalten_index, name in enumerate(spaltennamen):
                if spalten_index < len(zeile.zellen):
                    zelle = zeile.zellen[spalten_index]
                    objekt[name] = zelle.text or None
                    positionen[kind_pointer(zeilen_pointer, name)] = nur_wert(
                        _zell_spanne(zeile, zelle, index)
                    )
                else:
                    objekt[name] = None  # fehlende Zelle hat keine Quellposition
            wurzel.append(objekt)
        return wurzel, positionen

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        tabelle = _als_tabelle(dok.wurzel)
        spaltennamen = _spaltennamen_vereinigen(tabelle, optionen.sortiere_schluessel)
        if not spaltennamen:
            return SerialisierungsErgebnis(inhalt_text="")

        zeilen = [
            "| " + " | ".join(spaltennamen) + " |",
            "| " + " | ".join("---" for _ in spaltennamen) + " |",
        ]
        for datensatz in tabelle:
            felder = [_wert_escapen(datensatz.get(name)) for name in spaltennamen]
            zeilen.append("| " + " | ".join(felder) + " |")
        return SerialisierungsErgebnis(inhalt_text="\n".join(zeilen) + "\n")


def _als_tabelle(wurzel: JsonWert) -> list[dict[str, JsonWert]]:
    fehlertext = (
        "Der Inhalt lässt sich nicht als Markdown-Tabelle schreiben: nötig ist eine "
        "flache Tabelle, also eine Liste von Zeilen-Objekten mit einfachen Werten."
    )
    if not isinstance(wurzel, list):
        raise KonvertierungUnmoeglich(fehlertext)
    zeilen: list[dict[str, JsonWert]] = []
    for zeile in wurzel:
        if not isinstance(zeile, dict):
            raise KonvertierungUnmoeglich(fehlertext)
        zeilen.append(zeile)
    return zeilen


def _spaltennamen_vereinigen(
    tabelle: list[dict[str, JsonWert]], sortieren: bool
) -> list[str]:
    """Vereinigung aller Schlüssel in Erst-Auftreten-Reihenfolge (oder sortiert)."""
    namen: list[str] = []
    for zeile in tabelle:
        for name in zeile:
            if name not in namen:
                namen.append(name)
    return sorted(namen) if sortieren else namen
