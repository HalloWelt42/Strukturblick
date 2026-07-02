"""JSONPath (RFC 9535) ueber jsonpath_rfc9535 auf dem normalisierten Wertebaum.

finditer liefert je Treffer eine location (Tupel aus str/int-Segmenten) und den
Wert. Aus der location wird ueber pointer_aus_segmenten der JSON-Pointer gebaut,
der zugleich Schluessel in die Positionskarte des Dokuments ist. Syntaxfehler des
Ausdrucks werden als AbfrageSyntaxFehler mit deutscher Meldung weitergereicht.
"""

from __future__ import annotations

from typing import cast

import jsonpath_rfc9535 as jp

from app.analyzer.abfrage.kontext import kontext_bilden
from app.fehler import AbfrageSyntaxFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import pointer_aus_segmenten
from app.modelle.abfrage import Treffer
from app.modelle.gemeinsam import JsonWert


def fuehre_jsonpath(dok: GeparstesDokument, ausdruck: str, max_treffer: int) -> list[Treffer]:
    """Wertet einen JSONPath-Ausdruck aus; liefert bis zu max_treffer + 1 Treffer.

    Ein Treffer mehr als max_treffer wird bewusst zugelassen, damit der Dispatcher
    das Abschneiden erkennen kann.
    """
    try:
        knoten_iter = jp.finditer(ausdruck, dok.wurzel)
    except jp.JSONPathError as fehler:
        raise _syntaxfehler(fehler) from fehler

    treffer: list[Treffer] = []
    try:
        for knoten in knoten_iter:
            pfad = pointer_aus_segmenten(list(knoten.location))
            # value ist in der Bibliothek als object typisiert; unsere Wurzel ist JsonWert,
            # also sind auch alle Treffer JsonWert.
            wert = cast(JsonWert, knoten.value)
            spannen = dok.positionen.get(pfad)
            treffer.append(
                Treffer(
                    pfad=pfad,
                    position=spannen.wert if spannen is not None else None,
                    wert=wert,
                    kontext=kontext_bilden(pfad, wert),
                )
            )
            if len(treffer) > max_treffer:
                break
    except jp.JSONPathError as fehler:  # Auswertungsfehler treten teils erst beim Iterieren auf
        raise _syntaxfehler(fehler) from fehler
    return treffer


def _syntaxfehler(fehler: jp.JSONPathError) -> AbfrageSyntaxFehler:
    return AbfrageSyntaxFehler(
        f"Der JSONPath-Ausdruck ist ungueltig: {fehler}",
        details={"technisch": str(fehler)},
    )
