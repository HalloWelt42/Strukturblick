"""Unit-Tests der XML-Engine: Projektion, Positionen, Aspekte, Fehler, Round-Trip, Sicherheit."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.engines.xml_engine import XmlEngine
from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.erkennung import erkenne
from app.modelle.dokument import ParseOptionen, SerialisierungsOptionen
from app.modelle.gemeinsam import FormatId, Verlustaspekt
from app.registry import entdecke_module

BEISPIELE = Path(__file__).resolve().parents[1] / "beispiele" / "xml"


@pytest.fixture()
def engine() -> XmlEngine:
    return XmlEngine()


def _lade(name: str) -> bytes:
    return (BEISPIELE / name).read_bytes()


def test_wertebaum_typisch(engine: XmlEngine) -> None:
    dokument = engine.parsen(_lade("typisch.xml"), ParseOptionen())

    assert dokument.format_id == FormatId.XML
    assert isinstance(dokument.wurzel, dict)
    buecherei = dokument.wurzel["buecherei"]
    assert isinstance(buecherei, dict)
    assert buecherei["@eroeffnet"] == "1998"

    buecher = buecherei["buch"]
    assert isinstance(buecher, list)
    assert len(buecher) >= 2
    erstes = buecher[0]
    assert isinstance(erstes, dict)
    assert erstes["@isbn"] == "978-3-16-148410-0"
    assert erstes["titel"] == "Der Datenbaum"

    preis = erstes["preis"]
    assert isinstance(preis, dict)
    assert preis["#text"] == "24.90"
    assert preis["@waehrung"] == "EUR"


def test_positionen_zeilen_heuristik(engine: XmlEngine) -> None:
    """Zeilen-Positionen exakt gegen typisch.xml geprüft.

    Ableitung aus der Datei: <buecherei> beginnt in Zeile 2, das erste
    <buch> in Zeile 4, das zweite in Zeile 9 und dessen <titel> in Zeile 10.
    Spalte 0 bedeutet unbekannt (Genauigkeit nur_zeile), der Offset zeigt
    auf den Zeilenanfang.
    """
    roh = _lade("typisch.xml")
    dokument = engine.parsen(roh, ParseOptionen())

    zeilen = roh.decode("utf-8").split("\n")

    wurzel_spannen = dokument.positionen["/buecherei"]
    assert wurzel_spannen.wert.start.zeile == 2
    assert wurzel_spannen.wert.start.spalte == 0
    assert wurzel_spannen.wert.start.offset == len(zeilen[0]) + 1

    erstes_buch = dokument.positionen["/buecherei/buch/0"]
    assert erstes_buch.wert.start.zeile == 4
    assert erstes_buch.wert.start.offset == sum(len(zeile) + 1 for zeile in zeilen[:3])

    assert dokument.positionen["/buecherei/buch/1"].wert.start.zeile == 9
    assert dokument.positionen["/buecherei/buch/1/titel"].wert.start.zeile == 10
    assert dokument.positionen["/buecherei/@eroeffnet"].wert.start.zeile == 2
    # Die Wiederholliste selbst spannt vom ersten bis zum letzten <buch>
    assert dokument.positionen["/buecherei/buch"].wert.start.zeile == 4


def test_aspekte_typisch(engine: XmlEngine) -> None:
    dokument = engine.parsen(_lade("typisch.xml"), ParseOptionen())

    assert Verlustaspekt.ATTRIBUTE in dokument.genutzte_aspekte
    assert Verlustaspekt.KOMMENTARE in dokument.genutzte_aspekte
    assert Verlustaspekt.DUPLIKAT_SCHLUESSEL in dokument.genutzte_aspekte
    assert Verlustaspekt.MIXED_CONTENT not in dokument.genutzte_aspekte


def test_mixed_content_zusammengefasst_mit_warnung(engine: XmlEngine) -> None:
    dokument = engine.parsen(_lade("mixed.xml"), ParseOptionen())

    assert Verlustaspekt.MIXED_CONTENT in dokument.genutzte_aspekte
    assert (
        "Gemischter Inhalt in /hinweis/absatz - Textteile wurden zusammengefasst"
        in dokument.warnungen
    )
    assert dokument.wurzel == {
        "hinweis": {"absatz": {"betont": "vor", "#text": "Bitte dem Import sichern."}}
    }


def test_fehlerposition_ungeschlossenes_element(engine: XmlEngine) -> None:
    """kaputte/ungeschlossen.xml: <buch> aus Zeile 2 wird nie geschlossen.

    lxml meldet den Tag-Konflikt beim schließenden </buecherei> in Zeile 4.
    """
    with pytest.raises(ParseFehler) as fehler_info:
        engine.parsen(_lade("kaputte/ungeschlossen.xml"), ParseOptionen())

    assert "Ungültiges XML" in fehler_info.value.meldung
    position = fehler_info.value.position
    assert position is not None
    assert position.start.zeile == 4


def test_round_trip_erhaelt_wertebaum(engine: XmlEngine) -> None:
    original = engine.parsen(_lade("typisch.xml"), ParseOptionen())

    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())
    assert ergebnis.inhalt_text is not None
    assert "<!--" in ergebnis.inhalt_text  # Kommentar überlebt den nativen Round-Trip

    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert erneut.wurzel == original.wurzel


def test_neuaufbau_ohne_nativ_mit_typwarnung(engine: XmlEngine) -> None:
    dokument = GeparstesDokument(
        format_id=FormatId.JSON,
        wurzel={"wurzel": {"@nr": 7, "wert": 12.5, "aktiv": True}},
    )

    ergebnis = engine.serialisieren(dokument, SerialisierungsOptionen())
    assert ergebnis.inhalt_text is not None
    assert any("typpraezision" in warnung for warnung in ergebnis.warnungen)

    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert erneut.wurzel == {"wurzel": {"@nr": "7", "wert": "12.5", "aktiv": "true"}}


def test_neuaufbau_mehrere_wurzelschluessel_konvertierung_unmoeglich(engine: XmlEngine) -> None:
    dokument = GeparstesDokument(format_id=FormatId.JSON, wurzel={"a": 1, "b": 2})

    with pytest.raises(KonvertierungUnmoeglich) as fehler_info:
        engine.serialisieren(dokument, SerialisierungsOptionen())
    assert "Wurzelelement" in fehler_info.value.meldung


def test_neuaufbau_nicht_dict_wurzel_konvertierung_unmoeglich(engine: XmlEngine) -> None:
    dokument = GeparstesDokument(format_id=FormatId.JSON, wurzel=[1, 2])

    with pytest.raises(KonvertierungUnmoeglich):
        engine.serialisieren(dokument, SerialisierungsOptionen())


def test_erkennen_endung_probeparse_und_html_ablehnung(engine: XmlEngine) -> None:
    mit_endung = engine.erkennen(_lade("typisch.xml"), "typisch.xml")
    assert mit_endung is not None
    assert mit_endung.konfidenz == pytest.approx(0.85)

    nur_inhalt = engine.erkennen(_lade("typisch.xml"), None)
    assert nur_inhalt is not None
    assert nur_inhalt.konfidenz == pytest.approx(0.9)

    assert engine.erkennen(b"<!DOCTYPE html><html><body>Hallo</body></html>", None) is None
    assert engine.erkennen(b"<html><body>Hallo</body></html>", None) is None
    assert engine.erkennen(b'{"a": 1}', None) is None


def test_erkennen_rangfolge_xml_zuerst() -> None:
    entdecke_module()
    kandidaten = erkenne(_lade("typisch.xml"), None)

    assert kandidaten
    assert kandidaten[0].format_id == FormatId.XML
    assert all(k.format_id == FormatId.XML or k.konfidenz < 0.9 for k in kandidaten)


def test_xxe_entity_wird_nie_aufgeloest(engine: XmlEngine) -> None:
    """Sicherheitstest: Eine externe Entity (XXE-Muster) darf nie Dateiinhalt einlesen.

    Der gehärtete Parser (resolve_entities=False) lässt die Entity unaufgelöst -
    der Wert bleibt leer. Ein ParseFehler wäre ebenfalls akzeptabel, nur eine
    Auflösung nicht.
    """
    roh = (
        b'<?xml version="1.0"?>\n'
        b'<!DOCTYPE wurzel [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>\n'
        b"<wurzel>&xxe;</wurzel>\n"
    )
    try:
        dokument = engine.parsen(roh, ParseOptionen())
    except ParseFehler:
        return  # Ablehnen ist ebenfalls sicher
    assert dokument.wurzel == {"wurzel": None}
