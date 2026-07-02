"""XML-Engine: gehärtetes Parsen über lxml, Projektion in die xmltodict-Konvention.

Sicherheit: Der Parser ist bewusst gehärtet. resolve_entities=False verhindert
XXE-Angriffe - externe wie interne Entities werden nie aufgelöst, es wird also
niemals Dateiinhalt oder Netzressource in den Wertebaum gezogen. load_dtd=False
lädt keine DTDs, no_network=True unterbindet jeden Netzwerkzugriff und
huge_tree=False begrenzt die Baumgröße gegen Entity-Expansions-Angriffe
(Billion Laughs).

Projektion (xmltodict-Konvention, selbst implementiert): Attribute werden zu
"@name"-Schlüsseln, wiederholte gleichnamige Kindelemente zu Listen. Reiner
Elementtext wird nur dann zu "#text", wenn daneben Attribute oder Kindelemente
stehen - sonst direkt der Stringwert. Bei gemischtem Inhalt (Text zwischen
Kindelementen) werden die Textteile getrimmt und mit Leerzeichen verbunden
(Aspekt MIXED_CONTENT plus Warnung). Der Wurzelelement-Name wird der oberste
Schlüssel des Wertebaums.

Positions-Heuristik (Genauigkeit "nur_zeile"): Je Element zählt
element.sourceline als Startzeile (Spalte 0 = unbekannt, Offset =
Zeilenanfang über den ZeilenIndex). Die Endzeile ist die sourceline des
nächsten Elements in Dokumentreihenfolge - das kann das eigene erste Kind
sein - bzw. die letzte Zeile des Dokuments. Attribute und "#text" erben die
Zeile ihres Elements. Für nicht-UTF-8-Dokumente sind die Offsets nur eine
Näherung (Ersatzzeichen-Dekodierung für den ZeilenIndex).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import ClassVar

from lxml import etree

from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer
from app.kern.positionen import ZeilenIndex, nur_wert, position
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

_ENDUNG = ".xml"
_PROBEPARSE_MAX_BYTES = 262_144
_HTML_PRAEFIXE = ("<!doctype html", "<html")


def _gehaerteter_parser() -> etree.XMLParser:
    """Frischer, gehärteter Parser je Aufruf (Begründung im Modul-Docstring)."""
    return etree.XMLParser(
        resolve_entities=False,
        load_dtd=False,
        no_network=True,
        huge_tree=False,
    )


def _parse_fehler_aus(fehler: etree.XMLSyntaxError) -> ParseFehler:
    """lxml liefert lineno und offset (0-basierte Spalte) - beides wird 1-basiert gemeldet."""
    zeile = max(fehler.lineno or 1, 1)
    spalte = max((fehler.offset or 0) + 1, 1)
    stelle = position(zeile, spalte)
    return ParseFehler(
        f"Ungültiges XML: Syntaxfehler in Zeile {zeile}, Spalte {spalte}.",
        position=QuellSpanne(start=stelle, ende=stelle),
        details={"technisch": fehler.msg or str(fehler)},
    )


def _text_fuer_index(roh: bytes) -> str:
    """Bester Text für den ZeilenIndex; bei Fremd-Encodings nur eine Näherung."""
    try:
        return roh.decode("utf-8-sig")
    except UnicodeDecodeError:
        return roh.decode("utf-8", errors="replace")


def _quellzeile(element: etree._Element) -> int:
    """sourceline ist in lxml-stubs untypisiert - zur Laufzeit int | None (1-basiert)."""
    zeile: object = element.sourceline
    return zeile if isinstance(zeile, int) else 1


def _als_str(wert: str | bytes) -> str:
    """lxml liefert bei Textdokumenten str; der bytes-Zweig existiert nur für die Stubs."""
    return wert.decode("utf-8") if isinstance(wert, bytes) else wert


@dataclass
class _Projektion:
    """Sammelt Positionen, Aspekte und Warnungen während des rekursiven Abstiegs."""

    index: ZeilenIndex
    letzte_zeile: int
    ende_zeilen: dict[int, int]
    positionen: dict[str, KnotenSpannen] = field(default_factory=dict)
    aspekte: set[Verlustaspekt] = field(default_factory=set)
    warnungen: list[str] = field(default_factory=list)

    def element_spanne(self, element: etree._Element) -> QuellSpanne:
        start_zeile = self._begrenzt(_quellzeile(element))
        ende_zeile = self._begrenzt(self.ende_zeilen.get(id(element), self.letzte_zeile))
        return QuellSpanne(
            start=position(start_zeile, 0, self.index.zu_offset(start_zeile, 1)),
            ende=position(max(ende_zeile, start_zeile), 0, self.index.zu_offset(ende_zeile, 1)),
        )

    def _begrenzt(self, zeile: int) -> int:
        return min(max(zeile, 1), self.letzte_zeile)


def _projektion_vorbereiten(wurzel_element: etree._Element, text: str) -> _Projektion:
    """Baut den ZeilenIndex und die Endzeilen-Heuristik (nächstes Element in Dokumentreihenfolge)."""
    elemente = [element for element in wurzel_element.iter() if isinstance(element.tag, str)]
    ende_zeilen: dict[int, int] = {}
    for aktuelles, naechstes in zip(elemente, elemente[1:], strict=False):
        ende_zeilen[id(aktuelles)] = _quellzeile(naechstes)
    letzte_zeile = max(text.count("\n") + 1, 1)
    return _Projektion(index=ZeilenIndex(text), letzte_zeile=letzte_zeile, ende_zeilen=ende_zeilen)


def _text_teile(element: etree._Element) -> list[str]:
    """Alle nicht-leeren Textteile eines Elements (Text vor und zwischen/nach allen Knoten)."""
    teile: list[str] = []
    if element.text is not None and element.text.strip():
        teile.append(element.text.strip())
    for knoten in element:
        if knoten.tail is not None and knoten.tail.strip():
            teile.append(knoten.tail.strip())
    return teile


def _element_projizieren(
    element: etree._Element, pointer: str, projektion: _Projektion
) -> JsonWert:
    """Rekursive Projektion eines Elements in die xmltodict-Konvention."""
    element_spanne = projektion.element_spanne(element)
    projektion.positionen[pointer] = nur_wert(element_spanne)

    ergebnis: dict[str, JsonWert] = {}
    for name, attribut_wert in element.attrib.items():
        projektion.aspekte.add(Verlustaspekt.ATTRIBUTE)
        schluessel = f"@{_als_str(name)}"
        ergebnis[schluessel] = _als_str(attribut_wert)
        projektion.positionen[kind_pointer(pointer, schluessel)] = nur_wert(element_spanne)

    kinder = [kind for kind in element if isinstance(kind.tag, str)]
    gruppen: dict[str, list[etree._Element]] = {}
    for kind in kinder:
        gruppen.setdefault(kind.tag, []).append(kind)
    for tag, gruppe in gruppen.items():
        gruppen_pointer = kind_pointer(pointer, tag)
        if len(gruppe) == 1:
            ergebnis[tag] = _element_projizieren(gruppe[0], gruppen_pointer, projektion)
        else:
            projektion.aspekte.add(Verlustaspekt.DUPLIKAT_SCHLUESSEL)
            ergebnis[tag] = [
                _element_projizieren(kind, kind_pointer(gruppen_pointer, nummer), projektion)
                for nummer, kind in enumerate(gruppe)
            ]
            projektion.positionen[gruppen_pointer] = nur_wert(
                QuellSpanne(
                    start=projektion.element_spanne(gruppe[0]).start,
                    ende=projektion.element_spanne(gruppe[-1]).ende,
                )
            )

    teile = _text_teile(element)
    text = " ".join(teile) if teile else None
    if text is not None and kinder:
        projektion.aspekte.add(Verlustaspekt.MIXED_CONTENT)
        projektion.warnungen.append(
            f"Gemischter Inhalt in {pointer} - Textteile wurden zusammengefasst"
        )

    if not ergebnis:
        return text
    if text is not None:
        ergebnis["#text"] = text
        projektion.positionen[kind_pointer(pointer, "#text")] = nur_wert(element_spanne)
    return ergebnis


def _hat_kommentare(wurzel_element: etree._Element) -> bool:
    return any(True for _ in wurzel_element.iter(etree.Comment))


def _element_erzeugen(name: str) -> etree._Element:
    try:
        return etree.Element(name)
    except ValueError as fehler:
        raise KonvertierungUnmoeglich(
            f"'{name}' ist kein gültiger XML-Elementname - das Dokument lässt sich "
            "so nicht als XML schreiben."
        ) from fehler


def _unterelement(eltern: etree._Element, name: str) -> etree._Element:
    try:
        return etree.SubElement(eltern, name)
    except ValueError as fehler:
        raise KonvertierungUnmoeglich(
            f"'{name}' ist kein gültiger XML-Elementname - das Dokument lässt sich "
            "so nicht als XML schreiben."
        ) from fehler


def _als_text(wert: bool | int | float | str, pfad: str, warnungen: list[str]) -> str:
    """Skalar zu XML-Text; Zahlen und Wahrheitswerte verlieren ihren Typ (typpraezision)."""
    if isinstance(wert, str):
        return wert
    warnungen.append(
        f"Der Wert an '{pfad}' wurde zu Text - XML kennt keine Zahlen oder "
        "Wahrheitswerte (typpraezision)"
    )
    if isinstance(wert, bool):
        return "true" if wert else "false"
    return str(wert)


def _skalar_erwartet(wert: JsonWert, pfad: str) -> bool | int | float | str:
    if wert is None or isinstance(wert, dict | list):
        raise KonvertierungUnmoeglich(
            f"Der Wert an '{pfad}' braucht einen einfachen Wert (Text, Zahl oder "
            "Wahrheitswert) - Attribute und '#text' können keine Struktur tragen.",
            pfad=pfad,
        )
    return wert


def _attribut_setzen(element: etree._Element, name: str, wert: str, pfad: str) -> None:
    try:
        element.set(name, wert)
    except ValueError as fehler:
        raise KonvertierungUnmoeglich(
            f"'{name}' ist kein gültiger XML-Attributname (bei '{pfad}')."
        ) from fehler


def _element_fuellen(
    element: etree._Element, wert: JsonWert, pfad: str, sortieren: bool, warnungen: list[str]
) -> None:
    """Umkehrung der Projektion: "@"->Attribut, "#text"->Text, Listen->Wiederholung."""
    if wert is None:
        return
    if isinstance(wert, bool | int | float | str):
        element.text = _als_text(wert, pfad, warnungen)
        return
    if isinstance(wert, list):
        raise KonvertierungUnmoeglich(
            f"Die Liste in der Liste an '{pfad}' lässt sich nicht als XML abbilden - "
            "Wiederholungen brauchen benannte Elemente.",
            pfad=pfad,
        )
    schluessel_liste = sorted(wert) if sortieren else list(wert)
    for schluessel in schluessel_liste:
        teil = wert[schluessel]
        teil_pfad = kind_pointer(pfad, schluessel)
        if schluessel.startswith("@"):
            skalar = _skalar_erwartet(teil, teil_pfad)
            _attribut_setzen(element, schluessel[1:], _als_text(skalar, teil_pfad, warnungen), teil_pfad)
        elif schluessel == "#text":
            skalar = _skalar_erwartet(teil, teil_pfad)
            element.text = _als_text(skalar, teil_pfad, warnungen)
        elif isinstance(teil, list):
            for nummer, eintrag in enumerate(teil):
                kind = _unterelement(element, schluessel)
                _element_fuellen(kind, eintrag, kind_pointer(teil_pfad, nummer), sortieren, warnungen)
        else:
            kind = _unterelement(element, schluessel)
            _element_fuellen(kind, teil, teil_pfad, sortieren, warnungen)


def _wurzel_neu_aufbauen(
    wurzel: JsonWert, sortieren: bool, warnungen: list[str]
) -> etree._Element:
    """Neuaufbau aus dem Wertebaum - XML braucht genau ein benanntes Wurzelelement."""
    if not isinstance(wurzel, dict) or len(wurzel) != 1:
        raise KonvertierungUnmoeglich(
            "Der Inhalt lässt sich nicht als XML schreiben: XML braucht genau ein "
            "Wurzelelement - erwartet wird ein Objekt mit genau einem Schlüssel "
            "(dem Namen des Wurzelelements)."
        )
    name, inhalt = next(iter(wurzel.items()))
    if isinstance(inhalt, list):
        raise KonvertierungUnmoeglich(
            f"Der Inhalt lässt sich nicht als XML schreiben: '{name}' ist eine Liste, "
            "XML erlaubt aber nur ein einzelnes Wurzelelement."
        )
    element = _element_erzeugen(name)
    _element_fuellen(element, inhalt, kind_pointer("", name), sortieren, warnungen)
    return element


@format_engine
class XmlEngine:
    """Format-Engine für XML mit gehärtetem Parser und xmltodict-Projektion."""

    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.XML,
        name="XML (gehärteter Parser)",
        dateiendungen=(_ENDUNG,),
        mime_typen=("application/xml", "text/xml"),
        kann_lesen=True,
        kann_schreiben=True,
        ist_tabellarisch=False,
        positionsgenauigkeit="nur_zeile",
        traegt=frozenset(
            {
                Verlustaspekt.KOMMENTARE,
                Verlustaspekt.ATTRIBUTE,
                Verlustaspekt.MIXED_CONTENT,
                Verlustaspekt.VERSCHACHTELUNG,
                Verlustaspekt.SCHLUESSELREIHENFOLGE,
                Verlustaspekt.DUPLIKAT_SCHLUESSEL,
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
                format_id=FormatId.XML,
                konfidenz=0.85,
                hinweise=[f"Dateiendung {_ENDUNG}"],
            )
        kern = roh.removeprefix(b"\xef\xbb\xbf").lstrip()
        if not kern.startswith(b"<"):
            return None
        anfang = kern[:32].decode("ascii", errors="replace").lower()
        if anfang.startswith(_HTML_PRAEFIXE):
            return None  # HTML-Verdacht - dafür ist diese Engine nicht zuständig
        if len(kern) <= _PROBEPARSE_MAX_BYTES:
            try:
                etree.fromstring(kern, _gehaerteter_parser())
            except etree.XMLSyntaxError:
                pass
            else:
                return ErkennungsErgebnis(
                    format_id=FormatId.XML,
                    konfidenz=0.9,
                    hinweise=["vollständiger Probeparse erfolgreich"],
                )
        return ErkennungsErgebnis(
            format_id=FormatId.XML,
            konfidenz=0.5,
            hinweise=["beginnt mit '<'"],
        )

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        try:
            wurzel_element = etree.fromstring(roh, _gehaerteter_parser())
        except etree.XMLSyntaxError as fehler:
            raise _parse_fehler_aus(fehler) from fehler

        projektion = _projektion_vorbereiten(wurzel_element, _text_fuer_index(roh))
        if _hat_kommentare(wurzel_element):
            projektion.aspekte.add(Verlustaspekt.KOMMENTARE)

        wurzel_pointer = kind_pointer("", wurzel_element.tag)
        wurzel: JsonWert = {
            wurzel_element.tag: _element_projizieren(wurzel_element, wurzel_pointer, projektion)
        }
        return GeparstesDokument(
            format_id=FormatId.XML,
            wurzel=wurzel,
            positionen=projektion.positionen,
            genutzte_aspekte=frozenset(projektion.aspekte),
            nativ=wurzel_element,
            warnungen=projektion.warnungen,
        )

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        warnungen: list[str] = []
        if dok.format_id == FormatId.XML and isinstance(dok.nativ, etree._Element):
            element = dok.nativ
        else:
            element = _wurzel_neu_aufbauen(dok.wurzel, optionen.sortiere_schluessel, warnungen)
        text = etree.tostring(
            element,
            pretty_print=optionen.einrueckung > 0,
            encoding="unicode",
            xml_declaration=False,
        )
        if not text.endswith("\n"):
            text += "\n"
        return SerialisierungsErgebnis(inhalt_text=text, warnungen=warnungen)
