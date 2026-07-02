"""XPath über lxml auf dem nativen XML-Baum - nur für XML-Dokumente.

Zuständigkeit: Nur wenn das Dokument als XML geparst wurde und ein lxml-Baum als
natives Handle vorliegt. Sonst KonvertierungUnmoeglich.

Rückabbildung auf unsere Pfade: lxml liefert je Element eine Position (getpath
mit 1-basierten Predikaten). Wir bilden daraus den JSON-Pointer in der
xmltodict-Konvention des Projekts (siehe xml_engine): Elementname als Segment,
wiederholte gleichnamige Geschwister als 0-basierte Liste, einzelne Kinder ohne
Index. So findet der Pointer die Position in dok.positionen wieder.

Grenzen: XPath kann auch Nicht-Element-Ergebnisse liefern (Attribut- und
Textknoten sowie Skalare wie count()). Für Attribut- und Textknoten wird der
Pointer des tragenden Elements genutzt (bei Attributen mit "@name"-Segment, bei
Text mit "#text"), die Position erbt das Element. Skalare Ergebnisse (Zahl,
Wahrheitswert, String ohne Herkunftsknoten) haben keinen Pfad - pfad bleibt leer
und der Kontext trägt den Wert. Die exakte Rückabbildung greift nur, solange
der Ausdruck auf Knoten des Original-Baums zeigt; berechnete Knoten sind nicht
adressierbar.
"""

from __future__ import annotations

from lxml import etree

from app.analyzer.abfrage.kontext import kontext_bilden
from app.fehler import AbfrageSyntaxFehler, KonvertierungUnmoeglich
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer
from app.modelle.abfrage import Treffer
from app.modelle.gemeinsam import FormatId, KnotenSpannen, QuellSpanne


def fuehre_xpath(dok: GeparstesDokument, ausdruck: str, max_treffer: int) -> list[Treffer]:
    """Wertet einen XPath-Ausdruck auf dem nativen lxml-Baum aus."""
    wurzel_element = _xml_wurzel(dok)
    try:
        ergebnis = wurzel_element.xpath(ausdruck, smart_strings=True)
    except etree.XPathError as fehler:
        raise AbfrageSyntaxFehler(
            f"Der XPath-Ausdruck ist ungültig: {fehler}",
            details={"technisch": str(fehler)},
        ) from fehler

    knoten = ergebnis if isinstance(ergebnis, list) else [ergebnis]
    treffer: list[Treffer] = []
    for eintrag in knoten:
        treffer.append(_treffer_aus(dok, eintrag))
        if len(treffer) > max_treffer:
            break
    return treffer


def _xml_wurzel(dok: GeparstesDokument) -> etree._Element:
    if dok.format_id != FormatId.XML or not isinstance(dok.nativ, etree._Element):
        raise KonvertierungUnmoeglich("XPath ist nur für XML-Dokumente verfügbar.")
    return dok.nativ


def _treffer_aus(dok: GeparstesDokument, eintrag: object) -> Treffer:
    if isinstance(eintrag, etree._Element):
        return _element_treffer(dok, eintrag)
    if isinstance(eintrag, etree._ElementUnicodeResult):
        return _string_treffer(dok, eintrag)
    return _skalar_treffer(eintrag)


def _element_treffer(dok: GeparstesDokument, element: etree._Element) -> Treffer:
    pfad = _element_pointer(element)
    wert = element.text if element.text is not None else ""
    return Treffer(
        pfad=pfad,
        position=_position(dok, pfad),
        wert=wert,
        kontext=_element_kontext(element),
    )


def _attributname(name: str | bytes | None) -> str:
    """attrname ist in den lxml-Stubs str | bytes | None; zur Laufzeit ein str."""
    if isinstance(name, bytes):
        return name.decode("utf-8")
    return name if name is not None else ""


def _string_treffer(dok: GeparstesDokument, ergebnis: etree._ElementUnicodeResult) -> Treffer:
    eltern = ergebnis.getparent()
    eltern_pfad = _element_pointer(eltern) if eltern is not None else ""
    wert = str(ergebnis)
    if ergebnis.is_attribute and eltern is not None:
        name = _attributname(ergebnis.attrname)
        pfad = kind_pointer(eltern_pfad, f"@{name}")
        return Treffer(
            pfad=pfad, position=_position(dok, pfad), wert=wert, kontext=f"@{name}: {wert}"
        )
    pfad = kind_pointer(eltern_pfad, "#text") if eltern_pfad else ""
    return Treffer(pfad=pfad, position=_position(dok, pfad), wert=wert, kontext=wert)


def _skalar_treffer(eintrag: object) -> Treffer:
    if isinstance(eintrag, bool):
        wert: str | float | bool = eintrag
        kontext = "true" if eintrag else "false"
    elif isinstance(eintrag, float):
        # XPath rechnet mit Gleitkomma; ganze Zahlen werden ohne Nachkomma dargestellt.
        wert = int(eintrag) if eintrag.is_integer() else eintrag
        kontext = str(wert)
    else:
        wert = str(eintrag)
        kontext = wert
    return Treffer(pfad="", position=None, wert=wert, kontext=kontext)


def _position(dok: GeparstesDokument, pfad: str) -> QuellSpanne | None:
    spannen: KnotenSpannen | None = dok.positionen.get(pfad)
    return spannen.wert if spannen is not None else None


def _element_kontext(element: etree._Element) -> str:
    name = element.tag if isinstance(element.tag, str) else "?"
    text = element.text.strip() if element.text is not None and element.text.strip() else None
    return kontext_bilden(f"/{name}", text if text is not None else f"<{name}>")


def _element_pointer(element: etree._Element) -> str:
    """Baut den JSON-Pointer eines Elements in der xmltodict-Konvention des Projekts.

    Vom Wurzelelement absteigend: je Element sein Tag als Segment und - nur wenn es
    unter seinem Eltern-Element gleichnamige Geschwister gibt - der 0-basierte Index
    unter diesen Geschwistern.
    """
    kette: list[etree._Element] = []
    aktuell: etree._Element | None = element
    while aktuell is not None and isinstance(aktuell.tag, str):
        kette.append(aktuell)
        aktuell = aktuell.getparent()
    kette.reverse()

    pointer = ""
    for knoten in kette:
        tag = knoten.tag
        assert isinstance(tag, str)  # durch die while-Bedingung sichergestellt
        pointer = kind_pointer(pointer, tag)
        index = _index_unter_geschwistern(knoten, tag)
        if index is not None:
            pointer = kind_pointer(pointer, index)
    return pointer


def _index_unter_geschwistern(element: etree._Element, tag: str) -> int | None:
    """0-basierter Index unter gleichnamigen Geschwistern; None, wenn das Tag einmalig ist."""
    eltern = element.getparent()
    if eltern is None:
        return None
    gleiche = [kind for kind in eltern if kind.tag == tag]
    if len(gleiche) < 2:
        return None
    return gleiche.index(element)
