"""Unit-Tests der JSON-Engine: Positionen, Fehler, Toleranz, Duplikate, Round-Trip."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.engines.json_engine import JsonEngine
from app.fehler import ParseFehler
from app.modelle.dokument import ParseOptionen, SerialisierungsOptionen
from app.modelle.gemeinsam import FormatId, Verlustaspekt

BEISPIELE = Path(__file__).resolve().parents[1] / "beispiele" / "json"


def _lade(name: str) -> bytes:
    return (BEISPIELE / name).read_bytes()


def test_positionsgenauigkeit_typisch() -> None:
    """Wert-Spanne von /bestellungen/0/kunde/name exakt gegen die Datei geprüft.

    Ableitung aus typisch.json: Zeile 12 lautet
    '        "name": "Erika Musterfrau",' - der Wert beginnt nach 8 Spalten
    Einrückung, 6 Zeichen '"name"', ':' und Leerzeichen in Spalte 17 und
    endet (exklusiv) in Spalte 35. Der Zeichenoffset des öffnenden
    Anführungszeichens im Gesamttext ist 275, das Ende 293.
    """
    engine = JsonEngine()
    dokument = engine.parsen(_lade("typisch.json"), ParseOptionen())

    assert dokument.format_id == FormatId.JSON
    spannen = dokument.positionen["/bestellungen/0/kunde/name"]

    assert spannen.wert.start.zeile == 12
    assert spannen.wert.start.spalte == 17
    assert spannen.wert.start.offset == 275
    assert spannen.wert.ende.zeile == 12
    assert spannen.wert.ende.spalte == 35
    assert spannen.wert.ende.offset == 293
    assert spannen.schluessel is not None


def test_fehlerposition_fehlendes_komma() -> None:
    """kaputte/fehlendes_komma.json: Komma nach '"aktiv": true' fehlt.

    json meldet den Fehler am nächsten Token '"anzahl"' in Zeile 4, Spalte 3.
    """
    engine = JsonEngine()
    with pytest.raises(ParseFehler) as fehler_info:
        engine.parsen(_lade("kaputte/fehlendes_komma.json"), ParseOptionen())

    position = fehler_info.value.position
    assert position is not None
    assert position.start.zeile == 4
    assert position.start.spalte == 3


def test_tolerant_jsonc_mit_warnung_und_kommentar_aspekt() -> None:
    engine = JsonEngine()
    dokument = engine.parsen(_lade("tolerant.jsonc"), ParseOptionen())

    assert dokument.wurzel == {"name": "Prüfstand", "stufen": [1, 2, 3]}
    assert dokument.positionen == {}
    assert any("Tolerant geparst" in warnung for warnung in dokument.warnungen)
    assert Verlustaspekt.KOMMENTARE in dokument.genutzte_aspekte


def test_tolerant_false_wirft_parse_fehler() -> None:
    engine = JsonEngine()
    with pytest.raises(ParseFehler):
        engine.parsen(_lade("tolerant.jsonc"), ParseOptionen(tolerant=False))


def test_duplikat_schluessel_warnung_und_aspekt() -> None:
    engine = JsonEngine()
    dokument = engine.parsen(b'{"a": 1, "a": 2}', ParseOptionen())

    assert dokument.wurzel == {"a": 2}
    assert Verlustaspekt.DUPLIKAT_SCHLUESSEL in dokument.genutzte_aspekte
    assert any("Doppelter Schlüssel 'a'" in warnung for warnung in dokument.warnungen)


def test_round_trip_erhaelt_wertebaum() -> None:
    engine = JsonEngine()
    original = engine.parsen(_lade("typisch.json"), ParseOptionen())

    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())
    assert ergebnis.inhalt_text is not None
    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())

    assert erneut.wurzel == original.wurzel


def test_serialisieren_minify_und_sortierung() -> None:
    engine = JsonEngine()
    original = engine.parsen(_lade("typisch.json"), ParseOptionen())

    minify = engine.serialisieren(original, SerialisierungsOptionen(einrueckung=0))
    assert minify.inhalt_text is not None
    assert minify.inhalt_text.endswith("\n")
    assert "\n" not in minify.inhalt_text.rstrip("\n")
    assert ": " not in minify.inhalt_text
    assert json.loads(minify.inhalt_text) == original.wurzel

    sortiert = engine.serialisieren(
        original, SerialisierungsOptionen(sortiere_schluessel=True)
    )
    assert sortiert.inhalt_text is not None
    wurzel_sortiert = json.loads(sortiert.inhalt_text)
    assert wurzel_sortiert == original.wurzel
    assert list(wurzel_sortiert.keys()) == sorted(wurzel_sortiert.keys())


def test_erkennen_typisch_und_csv() -> None:
    engine = JsonEngine()

    treffer = engine.erkennen(_lade("typisch.json"), None)
    assert treffer is not None
    assert treffer.konfidenz >= 0.9

    csv_text = b"name;ort\nErika;Hamburg\nJuergen;Luebeck\n"
    assert engine.erkennen(csv_text, None) is None
