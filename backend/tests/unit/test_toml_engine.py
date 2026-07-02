"""Unit-Tests der TOML-Engine: Wertebaum, Positionen, Aspekte, Fehler, Round-Trip, Erkennung."""

from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

from app.engines.toml_engine import TomlEngine
from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.erkennung import erkenne
from app.modelle.dokument import ParseOptionen, SerialisierungsOptionen
from app.modelle.gemeinsam import FormatId, Verlustaspekt
from app.registry import entdecke_module

BEISPIELE = Path(__file__).resolve().parents[1] / "beispiele" / "toml"


@pytest.fixture()
def engine() -> TomlEngine:
    return TomlEngine()


def _lade(name: str) -> bytes:
    return (BEISPIELE / name).read_bytes()


def test_wertebaum_typisch(engine: TomlEngine) -> None:
    dokument = engine.parsen(_lade("typisch.toml"), ParseOptionen())

    assert dokument.format_id == FormatId.TOML
    assert isinstance(dokument.wurzel, dict)
    assert dokument.wurzel["titel"] == "Stadtbücherei Kiel"
    assert dokument.wurzel["plaetze"] == 120
    assert dokument.wurzel["adresse"] == {"strasse": "Holstenstraße 1", "ort": "Kiel"}
    medien = dokument.wurzel["medien"]
    assert isinstance(medien, list)
    assert len(medien) == 2
    assert medien[1] == {"titel": "Strukturen verstehen", "seiten": 208}


def test_datum_wird_iso_string_mit_aspekt_und_warnung(engine: TomlEngine) -> None:
    dokument = engine.parsen(_lade("typisch.toml"), ParseOptionen())

    assert isinstance(dokument.wurzel, dict)
    assert dokument.wurzel["eroeffnet"] == "1998-04-01"
    assert Verlustaspekt.TYPPRAEZISION in dokument.genutzte_aspekte
    assert any("ISO" in warnung for warnung in dokument.warnungen)


def test_kommentare_aspekt(engine: TomlEngine) -> None:
    typisch = engine.parsen(_lade("typisch.toml"), ParseOptionen())
    assert Verlustaspekt.KOMMENTARE in typisch.genutzte_aspekte

    minimal = engine.parsen(_lade("minimal.toml"), ParseOptionen())
    assert minimal.genutzte_aspekte == frozenset()


def test_positionen_zeilen_spannen(engine: TomlEngine) -> None:
    """Zeilen-Positionen exakt gegen typisch.toml geprüft.

    Ableitung aus der Datei: 'ort = "Kiel"' steht in Zeile 8, der Kopf
    '[adresse]' in Zeile 6, der zweite '[[medien]]'-Eintrag beginnt in
    Zeile 14 und dessen 'titel' steht in Zeile 15.
    """
    roh = _lade("typisch.toml")
    dokument = engine.parsen(roh, ParseOptionen())

    text = roh.decode("utf-8")
    zeilen = text.split("\n")

    ort = dokument.positionen["/adresse/ort"]
    assert ort.wert.start.zeile == 8
    assert ort.wert.ende.zeile == 8
    assert ort.wert.start.spalte == 1
    assert ort.wert.ende.spalte == len(zeilen[7]) + 1
    assert ort.wert.start.offset == sum(len(zeile) + 1 for zeile in zeilen[:7])
    assert ort.wert.ende.offset == ort.wert.start.offset + len(zeilen[7])

    assert dokument.positionen["/adresse"].wert.start.zeile == 6
    assert dokument.positionen["/medien/0"].wert.start.zeile == 10
    assert dokument.positionen["/medien/1"].wert.start.zeile == 14
    assert dokument.positionen["/medien/1/titel"].wert.start.zeile == 15


def test_fehlerposition_doppelter_schluessel(engine: TomlEngine) -> None:
    """kaputte/doppelt.toml: 'titel' wird in Zeile 2 erneut zugewiesen.

    tomllib meldet 'Cannot overwrite a value (at line 2, column 18)' - die
    Engine übernimmt Zeile 2 in die Fehlerposition.
    """
    with pytest.raises(ParseFehler) as fehler_info:
        engine.parsen(_lade("kaputte/doppelt.toml"), ParseOptionen())

    assert "Ungültiges TOML" in fehler_info.value.meldung
    position = fehler_info.value.position
    assert position is not None
    assert position.start.zeile == 2


def test_round_trip_kommentartreu(engine: TomlEngine) -> None:
    original = engine.parsen(_lade("typisch.toml"), ParseOptionen())

    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())
    assert ergebnis.inhalt_text is not None
    assert "# Stammdaten der Stadtbücherei" in ergebnis.inhalt_text

    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert erneut.wurzel == original.wurzel


def test_neuaufbau_ohne_nativ_mit_sortierung(engine: TomlEngine) -> None:
    """tomlkit stellt Tabellen hinter Skalare (gültiges TOML) - sortiert wird je Gruppe."""
    dokument = GeparstesDokument(
        format_id=FormatId.JSON,
        wurzel={"zebra": 1, "aal": 2, "adler": {"x": True}, "liste": [{"n": 1}, {"n": 2}]},
    )

    ergebnis = engine.serialisieren(dokument, SerialisierungsOptionen(sortiere_schluessel=True))
    assert ergebnis.inhalt_text is not None
    assert tomllib.loads(ergebnis.inhalt_text) == dokument.wurzel
    assert ergebnis.inhalt_text.index("aal") < ergebnis.inhalt_text.index("zebra")


def test_neuaufbau_nicht_dict_wurzel_konvertierung_unmoeglich(engine: TomlEngine) -> None:
    dokument = GeparstesDokument(format_id=FormatId.JSON, wurzel=[1, 2, 3])

    with pytest.raises(KonvertierungUnmoeglich) as fehler_info:
        engine.serialisieren(dokument, SerialisierungsOptionen())
    assert "Tabelle" in fehler_info.value.meldung


def test_neuaufbau_null_wert_konvertierung_unmoeglich(engine: TomlEngine) -> None:
    dokument = GeparstesDokument(format_id=FormatId.JSON, wurzel={"a": None})

    with pytest.raises(KonvertierungUnmoeglich) as fehler_info:
        engine.serialisieren(dokument, SerialisierungsOptionen())
    assert "Null" in fehler_info.value.meldung
    assert fehler_info.value.pfad == "/a"


def test_erkennen_endung_und_ablehnungen(engine: TomlEngine) -> None:
    ergebnis = engine.erkennen(_lade("typisch.toml"), "typisch.toml")
    assert ergebnis is not None
    assert ergebnis.konfidenz == pytest.approx(0.85)

    assert engine.erkennen(b'{"a": 1}', None) is None
    assert engine.erkennen(b"[1, 2, 3]", None) is None
    assert engine.erkennen(b"<wurzel/>", None) is None


def test_erkennen_rangfolge_toml_zuerst() -> None:
    entdecke_module()
    kandidaten = erkenne(_lade("typisch.toml"), None)

    assert kandidaten
    assert kandidaten[0].format_id == FormatId.TOML
    assert kandidaten[0].konfidenz == pytest.approx(0.7)
