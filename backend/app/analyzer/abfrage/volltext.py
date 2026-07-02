"""Volltext- und Regex-Suche per rekursivem Durchlauf ueber den Wertebaum.

Wie in der Statistik wird der Wertebaum mit Pointer-Mitfuehrung durchlaufen. Je
nach nur_schluessel werden entweder die Objektschluessel oder die skalaren Werte
(in str() umgewandelt) geprueft. Bei regex=True wird der Ausdruck kompiliert
(re.error -> AbfrageSyntaxFehler), sonst case-insensitiv als Substring gesucht.
"""

from __future__ import annotations

import re
from collections.abc import Callable

from app.analyzer.abfrage.kontext import kontext_bilden
from app.fehler import AbfrageSyntaxFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer
from app.modelle.abfrage import Treffer
from app.modelle.gemeinsam import JsonWert

type _Prueffung = Callable[[str], bool]


def fuehre_volltext(
    dok: GeparstesDokument,
    ausdruck: str,
    max_treffer: int,
    regex: bool,
    nur_schluessel: bool,
) -> list[Treffer]:
    """Durchsucht Schluessel oder skalare Werte; liefert bis zu max_treffer + 1 Treffer."""
    passt = _regex_pruefung(ausdruck) if regex else _substring_pruefung(ausdruck)
    treffer: list[Treffer] = []
    _durchlaufe(dok, dok.wurzel, "", passt, nur_schluessel, max_treffer, treffer)
    return treffer


def _substring_pruefung(ausdruck: str) -> _Prueffung:
    nadel = ausdruck.casefold()
    return lambda text: nadel in text.casefold()


def _regex_pruefung(ausdruck: str) -> _Prueffung:
    try:
        muster = re.compile(ausdruck)
    except re.error as fehler:
        raise AbfrageSyntaxFehler(
            f"Der regulaere Ausdruck ist ungueltig: {fehler}",
            details={"technisch": str(fehler)},
        ) from fehler
    return lambda text: muster.search(text) is not None


def _treffer_anlegen(dok: GeparstesDokument, pfad: str, wert: JsonWert) -> Treffer:
    spannen = dok.positionen.get(pfad)
    return Treffer(
        pfad=pfad,
        position=spannen.wert if spannen is not None else None,
        wert=wert,
        kontext=kontext_bilden(pfad, wert),
    )


def _durchlaufe(
    dok: GeparstesDokument,
    wert: JsonWert,
    pfad: str,
    passt: _Prueffung,
    nur_schluessel: bool,
    max_treffer: int,
    treffer: list[Treffer],
) -> None:
    """Rekursiver Abstieg; bricht ab, sobald ein Treffer ueber max_treffer hinaus faellt."""
    if len(treffer) > max_treffer:
        return
    if isinstance(wert, dict):
        for schluessel, kind in wert.items():
            kind_pfad = kind_pointer(pfad, schluessel)
            if nur_schluessel and passt(schluessel):
                treffer.append(_treffer_anlegen(dok, kind_pfad, kind))
                if len(treffer) > max_treffer:
                    return
            _durchlaufe(dok, kind, kind_pfad, passt, nur_schluessel, max_treffer, treffer)
    elif isinstance(wert, list):
        for index, kind in enumerate(wert):
            _durchlaufe(
                dok, kind, kind_pointer(pfad, index), passt, nur_schluessel, max_treffer, treffer
            )
    elif not nur_schluessel and _skalar_passt(wert, passt):
        treffer.append(_treffer_anlegen(dok, pfad, wert))


def _skalar_passt(wert: JsonWert, passt: _Prueffung) -> bool:
    if isinstance(wert, bool):
        return passt("true" if wert else "false")
    if wert is None:
        return passt("null")
    return passt(str(wert))
