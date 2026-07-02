"""Abfrage-Dispatcher: waehlt nach Sprache, kappt auf max_treffer, baut die Antwort.

Die einzelnen Verfahren liefern bis zu max_treffer + 1 Treffer. Liegt einer
darueber, gilt die Antwort als abgeschnitten und die Liste wird auf max_treffer
gekuerzt. anzahl bezieht sich auf die ausgelieferten Treffer.
"""

from __future__ import annotations

from app.analyzer.abfrage.jsonpath import fuehre_jsonpath
from app.analyzer.abfrage.volltext import fuehre_volltext
from app.analyzer.abfrage.xpath import fuehre_xpath
from app.kern.dokument import GeparstesDokument
from app.modelle.abfrage import AbfrageAnfrage, AbfrageAntwort, Treffer


def _treffer_ermitteln(dok: GeparstesDokument, anfrage: AbfrageAnfrage) -> list[Treffer]:
    grenze = anfrage.max_treffer
    if anfrage.sprache == "jsonpath":
        return fuehre_jsonpath(dok, anfrage.ausdruck, grenze)
    if anfrage.sprache == "xpath":
        return fuehre_xpath(dok, anfrage.ausdruck, grenze)
    regex = anfrage.sprache == "regex"
    return fuehre_volltext(dok, anfrage.ausdruck, grenze, regex, anfrage.nur_schluessel)


def fuehre_abfrage(dok: GeparstesDokument, anfrage: AbfrageAnfrage) -> AbfrageAntwort:
    """Fuehrt die Abfrage aus und formt sie in die AbfrageAntwort."""
    treffer = _treffer_ermitteln(dok, anfrage)
    abgeschnitten = len(treffer) > anfrage.max_treffer
    if abgeschnitten:
        treffer = treffer[: anfrage.max_treffer]
    return AbfrageAntwort(
        treffer=treffer,
        anzahl=len(treffer),
        abgeschnitten=abgeschnitten,
        sprache=anfrage.sprache,
    )
