"""Unit-Tests der HTML-Tabellen-Engine: Wurzel, Zeilen-Positionen, Round-Trip, Erkennung."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.engines.html_tabelle_engine import HtmlTabelleEngine
from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.erkennung import erkenne
from app.modelle.dokument import ParseOptionen, SerialisierungsOptionen
from app.modelle.gemeinsam import FormatId
from app.registry import entdecke_module

BEISPIELE = Path(__file__).resolve().parents[1] / "beispiele" / "html"


@pytest.fixture()
def engine() -> HtmlTabelleEngine:
    return HtmlTabelleEngine()


def _lade(name: str) -> bytes:
    return (BEISPIELE / name).read_bytes()


def test_wurzel_typisch(engine: HtmlTabelleEngine) -> None:
    dokument = engine.parsen(_lade("typisch.html"), ParseOptionen())

    assert dokument.format_id == FormatId.HTML_TABELLE
    assert isinstance(dokument.wurzel, list)
    assert len(dokument.wurzel) == 4
    assert dokument.wurzel[0] == {
        "kundennummer": "K-1001",
        "name": "Erika Musterfrau",
        "stadt": "Kiel",
        "umsatz": "4820,50",
    }
    # Umlaute überleben das Dekodieren.
    assert dokument.wurzel[1]["name"] == "Sönke Matthiesen"
    assert dokument.wurzel[3]["name"] == "Änne Großmann"
    # Leere Zelle -> None
    assert dokument.wurzel[2]["umsatz"] is None


def test_positionen_zeile_je_datenzeile(engine: HtmlTabelleEngine) -> None:
    """Genauigkeit nur_zeile: jede Datenzeile trägt die Quellzeile ihres <tr>."""
    roh = _lade("typisch.html")
    dokument = engine.parsen(roh, ParseOptionen())

    zeilen = roh.decode("utf-8").split("\n")

    # Quellzeile des <tr>, das die Zelle K-1001 enthält (das tr steht eine Zeile davor).
    td_nr = next(nr for nr, zeile in enumerate(zeilen, start=1) if "K-1001" in zeile)
    tr_nr = td_nr - 1

    erste = dokument.positionen["/0"]
    assert erste.wert.start.zeile == tr_nr
    assert erste.wert.start.spalte == 0  # nur_zeile: Spalte unbekannt
    assert erste.wert.start.offset == -1

    # Die Zellen erben die Zeile ihres <tr>.
    assert dokument.positionen["/0/name"].wert.start.zeile == tr_nr
    # Die zweite Datenzeile liegt weiter unten als die erste.
    assert dokument.positionen["/1"].wert.start.zeile > erste.wert.start.zeile


def test_keine_tabelle_wirft(engine: HtmlTabelleEngine) -> None:
    with pytest.raises(ParseFehler) as fehler_info:
        engine.parsen(_lade("kaputte/keine_tabelle.html"), ParseOptionen())

    assert "Keine HTML-Tabelle gefunden" in fehler_info.value.meldung


def test_kopf_aus_erster_zeile_ohne_thead(engine: HtmlTabelleEngine) -> None:
    roh = b"<table><tr><td>a</td><td>b</td></tr><tr><td>1</td><td>2</td></tr></table>"
    dokument = engine.parsen(roh, ParseOptionen())

    assert dokument.wurzel == [{"a": "1", "b": "2"}]


def test_round_trip_erhaelt_wurzel(engine: HtmlTabelleEngine) -> None:
    original = engine.parsen(_lade("typisch.html"), ParseOptionen())
    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())

    assert ergebnis.inhalt_text is not None
    assert "<thead>" in ergebnis.inhalt_text
    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert erneut.wurzel == original.wurzel


def test_serialisieren_escapet_html(engine: HtmlTabelleEngine) -> None:
    dokument = GeparstesDokument(
        format_id=FormatId.HTML_TABELLE,
        wurzel=[{"spalte": "<b>fett</b> & mehr"}],
    )
    ergebnis = engine.serialisieren(dokument, SerialisierungsOptionen())

    assert ergebnis.inhalt_text is not None
    assert "&lt;b&gt;fett&lt;/b&gt; &amp; mehr" in ergebnis.inhalt_text
    # Erneutes Parsen liefert den ursprünglichen Textinhalt zurück.
    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert isinstance(erneut.wurzel, list)
    assert erneut.wurzel[0]["spalte"] == "<b>fett</b> & mehr"


def test_serialisieren_nicht_tabellarisch_unmoeglich(engine: HtmlTabelleEngine) -> None:
    dokument = GeparstesDokument(format_id=FormatId.JSON, wurzel={"a": 1})

    with pytest.raises(KonvertierungUnmoeglich):
        engine.serialisieren(dokument, SerialisierungsOptionen())


def test_erkennen_konfidenz_endung_und_inhalt(engine: HtmlTabelleEngine) -> None:
    mit_endung = engine.erkennen(_lade("typisch.html"), "typisch.html")
    assert mit_endung is not None
    assert mit_endung.konfidenz == pytest.approx(0.75)

    nur_inhalt = engine.erkennen(_lade("typisch.html"), None)
    assert nur_inhalt is not None
    assert nur_inhalt.konfidenz == pytest.approx(0.5)

    # HTML ohne Tabelle liefert nichts (kein <table> im Inhalt).
    assert engine.erkennen(_lade("kaputte/keine_tabelle.html"), "keine_tabelle.html") is None


def test_erkennen_rangfolge_html_schlaegt_xml() -> None:
    """Eine .html-Datei mit <table> muss HTML höher bewerten als XML.

    XML gäbe für die Endung .html keinen Kandidaten (nur .xml); HTML gewinnt klar.
    """
    entdecke_module()
    kandidaten = erkenne(_lade("typisch.html"), "typisch.html")

    assert kandidaten
    assert kandidaten[0].format_id == FormatId.HTML_TABELLE
    ids = {kandidat.format_id for kandidat in kandidaten}
    if FormatId.XML in ids:
        html_konfidenz = next(k.konfidenz for k in kandidaten if k.format_id == FormatId.HTML_TABELLE)
        xml_konfidenz = next(k.konfidenz for k in kandidaten if k.format_id == FormatId.XML)
        assert html_konfidenz > xml_konfidenz


def test_xml_ohne_table_bleibt_xml() -> None:
    """Eine .xml-Datei ohne <table> darf nicht als HTML-Tabelle gelten."""
    entdecke_module()
    xml_beispiel = Path(__file__).resolve().parents[1] / "beispiele" / "xml" / "typisch.xml"
    kandidaten = erkenne(xml_beispiel.read_bytes(), "typisch.xml")

    assert kandidaten
    assert kandidaten[0].format_id == FormatId.XML
    assert all(kandidat.format_id != FormatId.HTML_TABELLE for kandidat in kandidaten)
