"""Unit-Tests der Markdown-Tabellen-Engine: Wurzel, exakte Zell-Offsets, Round-Trip."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.engines.md_tabelle_engine import MdTabelleEngine
from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.erkennung import erkenne
from app.kern.positionen import ZeilenIndex
from app.modelle.dokument import ParseOptionen, SerialisierungsOptionen
from app.modelle.gemeinsam import FormatId
from app.registry import entdecke_module

BEISPIELE = Path(__file__).resolve().parents[1] / "beispiele" / "md"


@pytest.fixture()
def engine() -> MdTabelleEngine:
    return MdTabelleEngine()


def _lade(name: str) -> bytes:
    return (BEISPIELE / name).read_bytes()


def test_wurzel_typisch(engine: MdTabelleEngine) -> None:
    dokument = engine.parsen(_lade("typisch.md"), ParseOptionen())

    assert dokument.format_id == FormatId.MD_TABELLE
    assert isinstance(dokument.wurzel, list)
    assert len(dokument.wurzel) == 4
    assert dokument.wurzel[0] == {
        "kundennummer": "K-1001",
        "name": "Erika Musterfrau",
        "stadt": "Kiel",
        "umsatz": "4820,50",
    }
    assert dokument.wurzel[1]["name"] == "Sönke Matthiesen"
    # K-1003 hat eine leere umsatz-Zelle -> None
    assert dokument.wurzel[2]["kundennummer"] == "K-1003"
    assert dokument.wurzel[2]["umsatz"] is None


def test_positionen_exakte_spalten_offsets(engine: MdTabelleEngine) -> None:
    roh = _lade("typisch.md")
    dokument = engine.parsen(roh, ParseOptionen())

    text = roh.decode("utf-8")
    index = ZeilenIndex(text)
    zeilen = text.split("\n")

    # Physische Quellzeile der ersten Datenzeile (enthält K-1001) suchen.
    daten_nr = next(nr for nr, zeile in enumerate(zeilen, start=1) if "K-1001" in zeile)
    daten_zeile = zeilen[daten_nr - 1]

    wert = "Erika Musterfrau"
    erwartete_spalte = daten_zeile.index(wert) + 1  # 1-basiert
    erwarteter_offset = index.zu_offset(daten_nr, erwartete_spalte)

    spannen = dokument.positionen["/0/name"]
    assert spannen.wert.start.zeile == daten_nr
    assert spannen.wert.ende.zeile == daten_nr
    assert spannen.wert.start.spalte == erwartete_spalte
    assert spannen.wert.ende.spalte == erwartete_spalte + len(wert)
    assert spannen.wert.start.offset == erwarteter_offset
    assert spannen.wert.ende.offset == erwarteter_offset + len(wert)

    # Die Zeile selbst trägt die Spanne von Spalte 1 bis zum Zeilenende.
    zeilen_spannen = dokument.positionen["/0"]
    assert zeilen_spannen.wert.start.zeile == daten_nr
    assert zeilen_spannen.wert.start.spalte == 1
    assert zeilen_spannen.wert.ende.spalte == len(daten_zeile) + 1


def test_leere_zelle_hat_keine_position(engine: MdTabelleEngine) -> None:
    dokument = engine.parsen(_lade("typisch.md"), ParseOptionen())

    # K-1003 (Index 2) hat eine leere, aber vorhandene umsatz-Zelle:
    # der Pointer existiert, der Wert ist None.
    assert "/2/umsatz" in dokument.positionen
    assert isinstance(dokument.wurzel, list)
    assert dokument.wurzel[2]["umsatz"] is None


def test_keine_tabelle_wirft(engine: MdTabelleEngine) -> None:
    with pytest.raises(ParseFehler) as fehler_info:
        engine.parsen(_lade("kaputte/keine_tabelle.md"), ParseOptionen())

    assert "Keine Markdown-Tabelle gefunden" in fehler_info.value.meldung


def test_round_trip_erhaelt_wurzel(engine: MdTabelleEngine) -> None:
    original = engine.parsen(_lade("typisch.md"), ParseOptionen())
    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())

    assert ergebnis.inhalt_text is not None
    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert erneut.wurzel == original.wurzel


def test_serialisieren_maskiert_pipe(engine: MdTabelleEngine) -> None:
    dokument = GeparstesDokument(
        format_id=FormatId.MD_TABELLE,
        wurzel=[{"spalte": "links|rechts", "wert": "ok"}],
    )
    ergebnis = engine.serialisieren(dokument, SerialisierungsOptionen())

    assert ergebnis.inhalt_text is not None
    assert "links\\|rechts" in ergebnis.inhalt_text
    # Erneutes Parsen darf die maskierte Pipe nicht als Zellgrenze deuten.
    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert isinstance(erneut.wurzel, list)
    assert erneut.wurzel[0]["spalte"] == "links\\|rechts"


def test_serialisieren_nicht_tabellarisch_unmoeglich(engine: MdTabelleEngine) -> None:
    dokument = GeparstesDokument(format_id=FormatId.JSON, wurzel={"a": 1})

    with pytest.raises(KonvertierungUnmoeglich):
        engine.serialisieren(dokument, SerialisierungsOptionen())


def test_erkennen_mit_und_ohne_tabelle(engine: MdTabelleEngine) -> None:
    mit_tabelle = engine.erkennen(_lade("typisch.md"), "typisch.md")
    assert mit_tabelle is not None
    assert mit_tabelle.konfidenz == pytest.approx(0.8)

    # .md ohne Tabelle ist nicht Sache dieser Engine.
    assert engine.erkennen(_lade("kaputte/keine_tabelle.md"), "keine_tabelle.md") is None
    # Tabelleninhalt ohne passende Dateiendung liefert ebenfalls nichts.
    assert engine.erkennen(_lade("typisch.md"), None) is None


def test_erkennen_rangfolge_md_tabelle_zuerst() -> None:
    entdecke_module()
    kandidaten = erkenne(_lade("typisch.md"), "typisch.md")

    assert kandidaten
    assert kandidaten[0].format_id == FormatId.MD_TABELLE
