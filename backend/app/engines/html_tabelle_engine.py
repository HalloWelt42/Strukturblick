"""HTML-Tabellen-Engine: die erste <table> lesen und schreiben.

Gelesen wird die erste Tabelle des Dokuments: Die Spaltenköpfe stammen aus dem
thead (bzw. den th-Zellen) oder, fehlen diese, aus der ersten Zeile. Datenzeilen
kommen aus dem tbody (bzw. allen weiteren tr). Die Wurzel ist eine flache Liste
von Zeilen-Objekten (Spaltenname -> Zelltext, leere Zelle -> None).

Positionen (Genauigkeit "nur_zeile"): Je Datenzeile liefert lxml über
element.sourceline die 1-basierte Zeile des tr; die Zellen erben diese Zeile
(Spalte 0 = unbekannt). HTML kennt in der Projektion keine Zeichenoffsets, daher
bleibt der Offset unbekannt (-1).

Grenzen: Nur die erste Tabelle wird gelesen, verschachtelte Tabellen und
verschachtelte Strukturen kann das Format nicht abbilden (Aspekt VERSCHACHTELUNG).
Zellinhalt wird als getrimmter Text zusammengezogen (Markup innerhalb einer Zelle
geht verloren). colspan/rowspan werden nicht ausgewertet. Beim Schreiben entsteht
eine schlichte Tabelle mit thead/tbody, deren Werte HTML-escaped werden.
"""

from __future__ import annotations

from html import escape as html_escape
from typing import ClassVar, cast

from lxml import html as lxml_html
from lxml.etree import LxmlError

from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer, pointer_aus_segmenten
from app.kern.positionen import nur_wert, position
from app.modelle.dokument import (
    ErkennungsErgebnis,
    ParseOptionen,
    SerialisierungsErgebnis,
    SerialisierungsOptionen,
)
from app.modelle.gemeinsam import FormatId, JsonWert, KnotenSpannen, QuellSpanne, Verlustaspekt
from app.modelle.system import FormatFaehigkeiten
from app.registry import format_engine

_ENDUNGEN = (".html", ".htm")
_TABELLEN_MARKER = "<table"


def _zeilen_spanne(zeile: int) -> QuellSpanne:
    """Spanne einer Tabellenzeile - nur die Zeile ist bekannt, Spalte/Offset nicht."""
    stelle = position(zeile, 0, -1)
    return QuellSpanne(start=stelle, ende=stelle)


def _zellentext(zelle: object) -> str:
    """Sichtbarer Text einer Zelle, getrimmt und mit Leerzeichen normalisiert."""
    roh = cast("str", zelle.text_content())  # type: ignore[attr-defined]
    return " ".join(roh.split())


def _sourceline(element: object) -> int:
    """lxml-sourceline ist untypisiert - zur Laufzeit int | None (1-basiert)."""
    zeile = cast("object", element.sourceline)  # type: ignore[attr-defined]
    return zeile if isinstance(zeile, int) and zeile >= 1 else 1


def _erste_tabelle(baum: object) -> object | None:
    """Erste Tabelle - auch dann, wenn die Wurzel selbst schon ein <table> ist.

    lxml.html.fromstring liefert bei einem reinen "<table>...</table>"-Fragment das
    table-Element als Wurzel; der Descendant-Ausdruck ".//table" fände es nicht, weil
    er die Wurzel selbst nicht einschließt. Das "self::table"-Glied deckt diesen Fall ab.
    """
    tabellen = cast(
        "list[object]", baum.xpath("self::table | .//table")  # type: ignore[attr-defined]
    )
    return tabellen[0] if tabellen else None


def _kopf_und_daten(tabelle: object) -> tuple[list[object], list[object]]:
    """Bestimmt Kopf-th-Zellen und die Daten-tr einer Tabelle.

    Kopf ist bevorzugt die erste tr mit th-Zellen (typisch im thead); fehlt diese,
    dient die erste tr als Kopf. Alle übrigen tr sind Datenzeilen.
    """
    alle_tr = cast("list[object]", tabelle.xpath(".//tr"))  # type: ignore[attr-defined]
    if not alle_tr:
        return [], []
    kopf_tr = next((tr for tr in alle_tr if _th_zellen(tr)), alle_tr[0])
    kopf_zellen = _th_zellen(kopf_tr) or _td_zellen(kopf_tr)
    daten = [tr for tr in alle_tr if tr is not kopf_tr]
    return kopf_zellen, daten


def _th_zellen(tr: object) -> list[object]:
    return cast("list[object]", tr.xpath("./th"))  # type: ignore[attr-defined]


def _td_zellen(tr: object) -> list[object]:
    return cast("list[object]", tr.xpath("./td | ./th"))  # type: ignore[attr-defined]


def _eindeutige_spaltennamen(kopf_zellen: list[object], warnungen: list[str]) -> list[str]:
    vergeben: set[str] = set()
    zaehler: dict[str, int] = {}
    ergebnis: list[str] = []
    for spaltenindex, zelle in enumerate(kopf_zellen, start=1):
        roh = _zellentext(zelle)
        if not roh:
            basis = f"spalte_{spaltenindex}"
            warnungen.append(f"Leerer Spaltenname in Spalte {spaltenindex} wurde zu '{basis}'")
        else:
            basis = roh
        eindeutig = basis
        while eindeutig in vergeben:
            zaehler[basis] = zaehler.get(basis, 1) + 1
            eindeutig = f"{basis}_{zaehler[basis]}"
        if eindeutig != basis and roh:
            warnungen.append(f"Doppelter Spaltenname '{basis}' wurde zu '{eindeutig}' umbenannt")
        vergeben.add(eindeutig)
        ergebnis.append(eindeutig)
    return ergebnis


def _wert_als_text(wert: JsonWert) -> str:
    if wert is None:
        return ""
    if isinstance(wert, bool):
        return "true" if wert else "false"
    return str(wert)


@format_engine
class HtmlTabelleEngine:
    """Format-Engine für HTML-Tabellen (erste <table>)."""

    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.HTML_TABELLE,
        name="HTML-Tabelle",
        dateiendungen=_ENDUNGEN,
        mime_typen=("text/html",),
        kann_lesen=True,
        kann_schreiben=True,
        ist_tabellarisch=True,
        positionsgenauigkeit="nur_zeile",
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
        try:
            text = roh.decode("utf-8-sig", errors="replace")
        except UnicodeDecodeError:
            return None
        hat_table = _TABELLEN_MARKER in text.lower()
        if hat_endung and hat_table:
            return ErkennungsErgebnis(
                format_id=FormatId.HTML_TABELLE,
                konfidenz=0.75,
                hinweise=["HTML-Dateiendung mit <table>"],
            )
        if hat_table:
            return ErkennungsErgebnis(
                format_id=FormatId.HTML_TABELLE,
                konfidenz=0.5,
                hinweise=["<table> im Inhalt"],
            )
        return None

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        # Bytes erst selbst zu Text dekodieren (UTF-8, BOM tolerant): lxml würde ein
        # Fragment ohne <meta charset> sonst als latin-1 lesen und Umlaute verstümmeln.
        try:
            text = roh.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = roh.decode("utf-8", errors="replace")
        if not text.strip():
            raise ParseFehler(
                "Der HTML-Inhalt ist leer - es gibt keine Tabelle zum Lesen."
            )
        try:
            baum = lxml_html.fromstring(text)
        except (LxmlError, ValueError) as fehler:
            raise ParseFehler(
                "Der HTML-Inhalt lässt sich nicht auswerten - "
                "er ist leer oder kein verarbeitbares HTML."
            ) from fehler
        tabelle = _erste_tabelle(baum)
        if tabelle is None:
            raise ParseFehler("Keine HTML-Tabelle gefunden.")

        warnungen: list[str] = []
        kopf_zellen, datenzeilen = _kopf_und_daten(tabelle)
        if not kopf_zellen:
            raise ParseFehler("Keine HTML-Tabelle gefunden.")
        spaltennamen = _eindeutige_spaltennamen(kopf_zellen, warnungen)
        wurzel, positionen = self._zeilen_aufbauen(datenzeilen, spaltennamen, warnungen)
        return GeparstesDokument(
            format_id=FormatId.HTML_TABELLE,
            wurzel=cast("JsonWert", wurzel),
            positionen=positionen,
            warnungen=warnungen,
        )

    def _zeilen_aufbauen(
        self,
        datenzeilen: list[object],
        spaltennamen: list[str],
        warnungen: list[str],
    ) -> tuple[list[dict[str, str | None]], dict[str, KnotenSpannen]]:
        wurzel: list[dict[str, str | None]] = []
        positionen: dict[str, KnotenSpannen] = {}
        for daten_index, tr in enumerate(datenzeilen):
            zellen = _td_zellen(tr)
            if len(zellen) != len(spaltennamen):
                warnungen.append(
                    f"Zeile {_sourceline(tr)} hat {len(zellen)} "
                    f"statt {len(spaltennamen)} Zellen"
                )
            zeilen_pointer = pointer_aus_segmenten([daten_index])
            zeilen_spanne = nur_wert(_zeilen_spanne(_sourceline(tr)))
            positionen[zeilen_pointer] = zeilen_spanne
            objekt: dict[str, str | None] = {}
            for spalten_index, name in enumerate(spaltennamen):
                if spalten_index < len(zellen):
                    text = _zellentext(zellen[spalten_index])
                    objekt[name] = text or None
                    positionen[kind_pointer(zeilen_pointer, name)] = zeilen_spanne
                else:
                    objekt[name] = None  # fehlende Zelle hat keine Quellposition
            wurzel.append(objekt)
        return wurzel, positionen

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        tabelle = _als_tabelle(dok.wurzel)
        spaltennamen = _spaltennamen_vereinigen(tabelle, optionen.sortiere_schluessel)
        einrueckung = " " * optionen.einrueckung

        teile: list[str] = ["<table>"]
        teile.append(f"{einrueckung}<thead>")
        teile.append(f"{einrueckung}{einrueckung}<tr>")
        for name in spaltennamen:
            teile.append(f"{einrueckung}{einrueckung}{einrueckung}<th>{html_escape(name)}</th>")
        teile.append(f"{einrueckung}{einrueckung}</tr>")
        teile.append(f"{einrueckung}</thead>")
        teile.append(f"{einrueckung}<tbody>")
        for datensatz in tabelle:
            teile.append(f"{einrueckung}{einrueckung}<tr>")
            for name in spaltennamen:
                inhalt = html_escape(_wert_als_text(datensatz.get(name)))
                teile.append(f"{einrueckung}{einrueckung}{einrueckung}<td>{inhalt}</td>")
            teile.append(f"{einrueckung}{einrueckung}</tr>")
        teile.append(f"{einrueckung}</tbody>")
        teile.append("</table>")
        return SerialisierungsErgebnis(inhalt_text="\n".join(teile) + "\n")


def _als_tabelle(wurzel: JsonWert) -> list[dict[str, JsonWert]]:
    fehlertext = (
        "Der Inhalt lässt sich nicht als HTML-Tabelle schreiben: nötig ist eine flache "
        "Tabelle, also eine Liste von Zeilen-Objekten mit einfachen Werten."
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
    namen: list[str] = []
    for zeile in tabelle:
        for name in zeile:
            if name not in namen:
                namen.append(name)
    return sorted(namen) if sortieren else namen
