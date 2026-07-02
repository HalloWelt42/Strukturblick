"""Unit-Tests der NDJSON-Engine: Zeilen-Positionen, defekte Zeilen, Round-Trip, Erkennung."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.engines.ndjson_engine import NdjsonEngine
from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.erkennung import erkenne
from app.modelle.dokument import ParseOptionen, SerialisierungsOptionen
from app.modelle.gemeinsam import FormatId
from app.registry import entdecke_module

BEISPIELE = Path(__file__).resolve().parents[1] / "beispiele" / "ndjson"


@pytest.fixture()
def engine() -> NdjsonEngine:
    return NdjsonEngine()


def _lade(name: str) -> bytes:
    return (BEISPIELE / name).read_bytes()


def test_parsen_typisch_wurzel_und_zeilen_spanne(engine: NdjsonEngine) -> None:
    """Der Pointer /1 trägt die Spanne der zweiten physischen Zeile."""
    roh = _lade("typisch.ndjson")
    dokument = engine.parsen(roh, ParseOptionen())

    assert dokument.format_id == FormatId.NDJSON
    assert isinstance(dokument.wurzel, list)
    assert len(dokument.wurzel) == 3
    zweite = dokument.wurzel[1]
    assert isinstance(zweite, dict)
    kunde = zweite["kunde"]
    assert isinstance(kunde, dict)
    assert kunde["name"] == "Jürgen Schäfer"
    assert dokument.warnungen == []

    zeilen = roh.decode("utf-8").split("\n")
    spannen = dokument.positionen["/1"]
    assert spannen.wert.start.zeile == 2
    assert spannen.wert.start.spalte == 1
    assert spannen.wert.start.offset == len(zeilen[0]) + 1
    assert spannen.wert.ende.zeile == 2
    assert spannen.wert.ende.spalte == len(zeilen[1]) + 1
    assert spannen.wert.ende.offset == len(zeilen[0]) + 1 + len(zeilen[1])


def test_innere_positionen_mit_zeilen_versatz(engine: NdjsonEngine) -> None:
    """Innere Pointer werden mit /1-Präfix und dem Versatz der physischen Zeile verschoben.

    Ableitung aus der Datei: Der Wert von /1/nummer ist die Zeichenkette
    '"B-2026-0413"' (mit Anführungszeichen) in physischer Zeile 2.
    """
    roh = _lade("typisch.ndjson")
    dokument = engine.parsen(roh, ParseOptionen())

    zeilen = roh.decode("utf-8").split("\n")
    wert_text = '"B-2026-0413"'
    spalte = zeilen[1].index(wert_text) + 1
    offset = len(zeilen[0]) + 1 + spalte - 1

    spannen = dokument.positionen["/1/nummer"]
    assert spannen.wert.start.zeile == 2
    assert spannen.wert.start.spalte == spalte
    assert spannen.wert.start.offset == offset
    assert spannen.wert.ende.zeile == 2
    assert spannen.wert.ende.spalte == spalte + len(wert_text)
    assert spannen.wert.ende.offset == offset + len(wert_text)
    assert spannen.schluessel is not None
    assert spannen.schluessel.start.zeile == 2


def test_defekte_zeile_warnung_und_rest_geparst(engine: NdjsonEngine) -> None:
    """Die defekte mittlere Zeile wird übersprungen, die übrigen Zeilen bleiben nutzbar."""
    dokument = engine.parsen(_lade("kaputte/zeile_defekt.ndjson"), ParseOptionen())

    assert isinstance(dokument.wurzel, list)
    assert len(dokument.wurzel) == 2
    erste = dokument.wurzel[0]
    zweite = dokument.wurzel[1]
    assert isinstance(erste, dict)
    assert isinstance(zweite, dict)
    assert erste["nummer"] == "B-2026-0412"
    assert zweite["nummer"] == "B-2026-0414"

    assert any(warnung.startswith("Zeile 2:") for warnung in dokument.warnungen)
    assert "1 von 3 Zeilen übersprungen" in dokument.warnungen

    # Der Datenindex 1 zeigt auf die dritte physische Zeile
    assert dokument.positionen["/1"].wert.start.zeile == 3


def test_alle_zeilen_defekt_wirft_parse_fehler(engine: NdjsonEngine) -> None:
    with pytest.raises(ParseFehler) as fehler_info:
        engine.parsen(b"kaputt\nauch kaputt\n", ParseOptionen())

    position = fehler_info.value.position
    assert position is not None
    assert position.start.zeile == 1


def test_round_trip_erhaelt_wertebaum(engine: NdjsonEngine) -> None:
    original = engine.parsen(_lade("typisch.ndjson"), ParseOptionen())

    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())
    assert ergebnis.inhalt_text is not None
    assert ergebnis.inhalt_text.endswith("\n")
    assert ergebnis.inhalt_text.count("\n") == 3
    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())

    assert erneut.wurzel == original.wurzel


def test_serialisieren_ohne_liste_unmoeglich(engine: NdjsonEngine) -> None:
    dokument = GeparstesDokument(format_id=FormatId.NDJSON, wurzel={"a": 1})

    with pytest.raises(KonvertierungUnmoeglich):
        engine.serialisieren(dokument, SerialisierungsOptionen())


def test_erkennen_endung_einzelzeile_und_inhalt(engine: NdjsonEngine) -> None:
    treffer = engine.erkennen(b"irgendwas", "daten.jsonl")
    assert treffer is not None
    assert treffer.konfidenz == pytest.approx(0.9)

    # Eine einzelne Zeile ist gewöhnliches JSON - die NDJSON-Engine hält sich zurück
    assert engine.erkennen(b'{"a": 1}', None) is None

    inhalt = engine.erkennen(_lade("typisch.ndjson"), None)
    assert inhalt is not None
    assert inhalt.konfidenz == pytest.approx(0.75)


def test_erkennungs_rangfolge_ndjson_vor_json() -> None:
    """Für eine echte NDJSON-Probe liegt die NDJSON-Engine vor der JSON-Engine."""
    entdecke_module()
    kandidaten = erkenne(_lade("typisch.ndjson"), None)

    format_ids = [kandidat.format_id for kandidat in kandidaten]
    assert format_ids[0] == FormatId.NDJSON
    assert FormatId.JSON in format_ids
