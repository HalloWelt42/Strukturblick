"""Unit-Tests der CSV-Engine: Dialekt, Positionen, Encoding, Ragged Rows, Round-Trip."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.engines.csv_engine import CsvEngine
from app.modelle.dokument import ParseOptionen, SerialisierungsOptionen

BEISPIELE = Path(__file__).resolve().parents[1] / "beispiele" / "csv"


@pytest.fixture()
def engine() -> CsvEngine:
    return CsvEngine()


def _lade(name: str) -> bytes:
    return (BEISPIELE / name).read_bytes()


def test_dialekt_und_wurzel_typisch(engine: CsvEngine) -> None:
    dokument = engine.parsen(_lade("typisch.csv"), ParseOptionen())

    assert dokument.dialekt_info is not None
    assert dokument.dialekt_info.trennzeichen == ";"
    assert dokument.dialekt_info.hat_kopfzeile is True
    assert dokument.dialekt_info.encoding == "UTF-8"

    assert isinstance(dokument.wurzel, list)
    assert dokument.wurzel[0]["name"] == "Erika Musterfrau"
    assert dokument.wurzel[1]["name"] == "Sönke Matthiesen"
    assert dokument.wurzel[0]["umsatz"] == "4820,50"
    # K-1003 hat ein leeres umsatz-Feld -> None
    assert dokument.wurzel[2]["kundennummer"] == "K-1003"
    assert dokument.wurzel[2]["umsatz"] is None


def test_dialekt_minimal_komma(engine: CsvEngine) -> None:
    dokument = engine.parsen(_lade("minimal.csv"), ParseOptionen())

    assert dokument.dialekt_info is not None
    assert dokument.dialekt_info.trennzeichen == ","
    assert dokument.dialekt_info.hat_kopfzeile is True
    assert dokument.wurzel == [
        {"name": "Erika", "stadt": "Kiel"},
        {"name": "Sönke", "stadt": "Flensburg"},
    ]


def test_positionen_exakte_zell_offsets(engine: CsvEngine) -> None:
    roh = _lade("typisch.csv")
    dokument = engine.parsen(roh, ParseOptionen())

    text = roh.decode("utf-8")
    zeilen = text.split("\n")
    # Erste Datenzeile ist physische Zeile 2; die Datei enthält keine Anführungszeichen
    datenzeile = zeilen[1]
    wert = "Erika Musterfrau"
    spalte_start = datenzeile.index(wert) + 1  # 1-basiert
    offset_start = len(zeilen[0]) + 1 + datenzeile.index(wert)

    spannen = dokument.positionen["/0/name"]
    assert spannen.wert.start.zeile == 2
    assert spannen.wert.ende.zeile == 2
    assert spannen.wert.start.spalte == spalte_start
    assert spannen.wert.ende.spalte == spalte_start + len(wert)
    assert spannen.wert.start.offset == offset_start
    assert spannen.wert.ende.offset == offset_start + len(wert)

    # Zusätzlich trägt jede Zeile einen eigenen Pointer mit der Zeilen-Spanne
    zeilen_spannen = dokument.positionen["/0"]
    assert zeilen_spannen.wert.start.zeile == 2
    assert zeilen_spannen.wert.start.spalte == 1
    assert zeilen_spannen.wert.ende.spalte == len(datenzeile) + 1


def test_encoding_latin1_wird_erkannt(engine: CsvEngine) -> None:
    dokument = engine.parsen(_lade("latin1.csv"), ParseOptionen())

    assert dokument.dialekt_info is not None
    assert dokument.dialekt_info.encoding != "UTF-8"
    assert dokument.dialekt_info.encoding != ""
    assert isinstance(dokument.wurzel, list)
    assert dokument.wurzel[0]["name"] == "Sönke Öhlschläger"
    assert dokument.wurzel[1]["stadt"] == "Düsseldorf"


def test_trennzeichen_override_erzwingt_komma(engine: CsvEngine) -> None:
    dokument = engine.parsen(_lade("typisch.csv"), ParseOptionen(csv_trennzeichen=","))

    assert dokument.dialekt_info is not None
    assert dokument.dialekt_info.trennzeichen == ","
    # Die Semikolons werden nicht mehr als Trennzeichen gedeutet,
    # die Kopfzeile bleibt als eine einzige Spalte erhalten
    assert isinstance(dokument.wurzel, list)
    erste_spalte = next(iter(dokument.wurzel[0]))
    assert ";" in erste_spalte


def test_ragged_rows_warnungen_und_none(engine: CsvEngine) -> None:
    optionen = ParseOptionen(csv_trennzeichen=",", csv_hat_kopfzeile=True)
    dokument = engine.parsen(_lade("kaputte/ragged.csv"), optionen)

    assert isinstance(dokument.wurzel, list)
    # Zeile mit zu wenigen Feldern: fehlendes Feld wird None
    assert dokument.wurzel[1] == {"id": "2", "name": "Sönke", "stadt": None}
    # Zeile mit zu vielen Feldern: Überzähliges wird verworfen
    assert dokument.wurzel[2] == {"id": "3", "name": "Jürgen", "stadt": "Lübeck"}

    passende = [w for w in dokument.warnungen if "statt" in w and "Felder" in w]
    assert len(passende) == 2
    assert "Zeile 3 hat 2 statt 3 Felder" in dokument.warnungen
    assert "Zeile 4 hat 4 statt 3 Felder" in dokument.warnungen


def test_round_trip_erhaelt_wurzel(engine: CsvEngine) -> None:
    original = engine.parsen(_lade("typisch.csv"), ParseOptionen())
    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())

    assert ergebnis.inhalt_text is not None
    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert erneut.wurzel == original.wurzel


def test_erkennen_dateiendung_und_json_ablehnung(engine: CsvEngine) -> None:
    ergebnis = engine.erkennen(_lade("typisch.csv"), "typisch.csv")
    assert ergebnis is not None
    assert ergebnis.konfidenz >= 0.8

    assert engine.erkennen(b'{"kunden": [1, 2, 3]}', None) is None


def test_erkennen_inhalt_ohne_dateiname(engine: CsvEngine) -> None:
    ergebnis = engine.erkennen(_lade("typisch.csv"), None)
    assert ergebnis is not None
    assert ergebnis.konfidenz == pytest.approx(0.55)
