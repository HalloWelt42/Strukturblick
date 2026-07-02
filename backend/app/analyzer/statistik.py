"""Statistik: Kennzahlen zu Struktur und Werten in einem einzigen rekursiven Durchlauf.

Gezählt werden Knoten, maximale Tiefe, Typverteilung, Schlüsselhäufigkeit und
Zahlwerte je Pfad-Muster (Listenindizes als *). Aus den Zahlensammlungen entstehen
Histogramme, aus den direkten Kindern der Wurzel die Größenanteile.
"""

from __future__ import annotations

import time
from collections import Counter
from dataclasses import dataclass, field
from typing import ClassVar

from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer
from app.modelle.analyse import (
    HistogrammEimer,
    SchluesselStat,
    StatistikAntwort,
    TeilbaumGroesse,
    ZahlenHistogramm,
)
from app.modelle.gemeinsam import JsonWert
from app.registry import analyzer

_TOP_SCHLUESSEL = 12
_TOP_TEILBAEUME = 8
_HISTOGRAMM_ANZAHL = 3
_EIMER_JE_HISTOGRAMM = 12
_HISTOGRAMM_MINDEST_WERTE = 2


@dataclass
class _Sammler:
    """Zwischenspeicher des rekursiven Durchlaufs."""

    knoten_gesamt: int = 0
    max_tiefe: int = 0
    typverteilung: Counter[str] = field(default_factory=Counter)
    schluessel: Counter[str] = field(default_factory=Counter)
    zahlen: dict[str, list[float]] = field(default_factory=dict)
    wurzel_teilbaeume: list[tuple[str, int]] = field(default_factory=list)


def _typ_name(wert: JsonWert) -> str:
    if wert is None:
        return "null"
    if isinstance(wert, bool):
        return "wahrheitswert"
    if isinstance(wert, int | float):
        return "zahl"
    if isinstance(wert, str):
        return "text"
    if isinstance(wert, list):
        return "liste"
    return "objekt"


def _besuche(wert: JsonWert, tiefe: int, pfad_muster: str, sammler: _Sammler) -> int:
    """Zählt Knoten, Typen, Schlüssel und Zahlen; liefert die Knotenzahl des Teilbaums."""
    sammler.knoten_gesamt += 1
    sammler.max_tiefe = max(sammler.max_tiefe, tiefe)
    sammler.typverteilung[_typ_name(wert)] += 1
    anzahl = 1
    if isinstance(wert, dict):
        for schluessel, kind in wert.items():
            sammler.schluessel[schluessel] += 1
            kind_anzahl = _besuche(kind, tiefe + 1, kind_pointer(pfad_muster, schluessel), sammler)
            if tiefe == 0:
                sammler.wurzel_teilbaeume.append((kind_pointer("", schluessel), kind_anzahl))
            anzahl += kind_anzahl
    elif isinstance(wert, list):
        for index, kind in enumerate(wert):
            kind_anzahl = _besuche(kind, tiefe + 1, f"{pfad_muster}/*", sammler)
            if tiefe == 0:
                sammler.wurzel_teilbaeume.append((f"/{index}", kind_anzahl))
            anzahl += kind_anzahl
    elif isinstance(wert, bool):
        pass
    elif isinstance(wert, int | float):
        sammler.zahlen.setdefault(pfad_muster, []).append(float(wert))
    return anzahl


def _histogramm(pfad_muster: str, werte: list[float]) -> ZahlenHistogramm:
    """12 gleich breite Eimer zwischen Minimum und Maximum; ein Eimer, wenn beide gleich sind."""
    minimum = min(werte)
    maximum = max(werte)
    if minimum == maximum:
        eimer = [HistogrammEimer(von=minimum, bis=maximum, anzahl=len(werte))]
    else:
        breite = (maximum - minimum) / _EIMER_JE_HISTOGRAMM
        anzahlen = [0] * _EIMER_JE_HISTOGRAMM
        for wert in werte:
            index = min(int((wert - minimum) / breite), _EIMER_JE_HISTOGRAMM - 1)
            anzahlen[index] += 1
        eimer = [
            HistogrammEimer(
                von=minimum + nummer * breite,
                bis=minimum + (nummer + 1) * breite,
                anzahl=anzahl,
            )
            for nummer, anzahl in enumerate(anzahlen)
        ]
    return ZahlenHistogramm(pfad_muster=pfad_muster, minimum=minimum, maximum=maximum, eimer=eimer)


def _zahlen_histogramme(zahlen: dict[str, list[float]]) -> list[ZahlenHistogramm]:
    kandidaten = [
        (pfad_muster, werte)
        for pfad_muster, werte in zahlen.items()
        if len(werte) >= _HISTOGRAMM_MINDEST_WERTE
    ]
    kandidaten.sort(key=lambda paar: (-len(paar[1]), paar[0]))
    return [_histogramm(pfad_muster, werte) for pfad_muster, werte in kandidaten[:_HISTOGRAMM_ANZAHL]]


def _groessenanteile(teilbaeume: list[tuple[str, int]], knoten_gesamt: int) -> list[TeilbaumGroesse]:
    sortiert = sorted(teilbaeume, key=lambda paar: (-paar[1], paar[0]))
    return [
        TeilbaumGroesse(pfad=pfad, knoten=knoten, prozent=round(knoten / knoten_gesamt * 100, 1))
        for pfad, knoten in sortiert[:_TOP_TEILBAEUME]
    ]


def berechne_statistik(dok: GeparstesDokument, groesse_bytes: int) -> StatistikAntwort:
    start = time.perf_counter()
    sammler = _Sammler()
    _besuche(dok.wurzel, 0, "", sammler)
    haeufigste = sorted(sammler.schluessel.items(), key=lambda paar: (-paar[1], paar[0]))
    schluessel_stat = [
        SchluesselStat(schluessel=name, anzahl=anzahl) for name, anzahl in haeufigste[:_TOP_SCHLUESSEL]
    ]
    histogramme = _zahlen_histogramme(sammler.zahlen)
    anteile = _groessenanteile(sammler.wurzel_teilbaeume, sammler.knoten_gesamt)
    dauer_ms = (time.perf_counter() - start) * 1000
    return StatistikAntwort(
        knoten_gesamt=sammler.knoten_gesamt,
        max_tiefe=sammler.max_tiefe,
        groesse_bytes=groesse_bytes,
        typverteilung=dict(sammler.typverteilung),
        schluessel_haeufigkeit=schluessel_stat,
        zahlen_histogramme=histogramme,
        groessenanteile=anteile,
        dauer_ms=dauer_ms,
    )


@analyzer
class StatistikAnalyzer:
    """Registrierung für Discovery und Capabilities."""

    analyzer_id: ClassVar[str] = "statistik"
    name: ClassVar[str] = "Statistik"

    def unterstuetzt(self, dok: GeparstesDokument) -> bool:
        return True
