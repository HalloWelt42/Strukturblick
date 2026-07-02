"""Unit-Tests der YAML-Engine: Positionen, Anker, Kommentare, Round-Trip, Fehler, Erkennung."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.engines.yaml_engine import YamlEngine
from app.fehler import ParseFehler
from app.modelle.dokument import ParseOptionen, SerialisierungsOptionen
from app.modelle.gemeinsam import FormatId, Verlustaspekt

BEISPIELE = Path(__file__).resolve().parents[1] / "beispiele" / "yaml"


@pytest.fixture()
def engine() -> YamlEngine:
    return YamlEngine()


def _lade(name: str) -> bytes:
    return (BEISPIELE / name).read_bytes()


def test_positionsgenauigkeit_typisch(engine: YamlEngine) -> None:
    """Wert-Spanne von /dienste/lager/port exakt gegen die Datei geprüft.

    Zeile und Spalten werden aus dem Dateitext abgeleitet: 'port: 8081' steht in
    typisch.yaml auf physischer Zeile 10, der Wert '8081' beginnt in Spalte 11.
    Die Endposition stammt aus der Geschwister-Heuristik (Start von 'versand:').
    """
    roh = _lade("typisch.yaml")
    dokument = engine.parsen(roh, ParseOptionen())

    assert dokument.format_id == FormatId.YAML

    zeilen = roh.decode("utf-8").split("\n")
    zeilen_nr = zeilen.index("    port: 8081") + 1  # physische Zeile, 1-basiert
    assert zeilen_nr == 10
    wert_spalte = zeilen[zeilen_nr - 1].index("8081") + 1
    wert_offset = sum(len(zeile) + 1 for zeile in zeilen[: zeilen_nr - 1]) + wert_spalte - 1

    spannen = dokument.positionen["/dienste/lager/port"]
    assert spannen.wert.start.zeile == zeilen_nr
    assert spannen.wert.start.spalte == wert_spalte
    assert spannen.wert.start.offset == wert_offset
    assert spannen.wert.ende.zeile == zeilen_nr
    assert spannen.wert.ende.spalte == wert_spalte + len("8081")
    assert spannen.wert.ende.offset == wert_offset + len("8081")

    assert spannen.schluessel is not None
    assert spannen.schluessel.start.zeile == zeilen_nr
    assert spannen.schluessel.start.spalte == zeilen[zeilen_nr - 1].index("port") + 1
    assert spannen.schluessel.ende.spalte == zeilen[zeilen_nr - 1].index("port") + 1 + len("port")


def test_anker_und_kommentare_in_genutzten_aspekten(engine: YamlEngine) -> None:
    """Anker werden erkannt und im Wertebaum aufgelöst, Kommentare als Aspekt gemeldet."""
    dokument = engine.parsen(_lade("typisch.yaml"), ParseOptionen())

    assert Verlustaspekt.ANKER_REFERENZEN in dokument.genutzte_aspekte
    assert Verlustaspekt.KOMMENTARE in dokument.genutzte_aspekte
    assert "Anker 'standard' wird bei Konvertierungen aufgelöst" in dokument.warnungen

    # Der Merge-Schlüssel <<: *standard ist im Wertebaum aufgelöst
    assert isinstance(dokument.wurzel, dict)
    dienste = dokument.wurzel["dienste"]
    assert isinstance(dienste, dict)
    lager = dienste["lager"]
    versand = dienste["versand"]
    assert isinstance(lager, dict)
    assert isinstance(versand, dict)
    assert lager["zeitlimit"] == 30
    assert lager["wiederholungen"] == 3
    assert lager["port"] == 8081
    assert versand["wiederholungen"] == 5  # lokale Übersteuerung schlägt den Anker


def test_typpraezision_datum_wird_iso_text(engine: YamlEngine) -> None:
    dokument = engine.parsen(b"stichtag: 2026-07-02\n", ParseOptionen())

    assert dokument.wurzel == {"stichtag": "2026-07-02"}
    assert Verlustaspekt.TYPPRAEZISION in dokument.genutzte_aspekte


def test_round_trip_erhaelt_wertebaum(engine: YamlEngine) -> None:
    original = engine.parsen(_lade("typisch.yaml"), ParseOptionen())

    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())
    assert ergebnis.inhalt_text is not None
    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())

    assert erneut.wurzel == original.wurzel


def test_kommentartreuer_round_trip(engine: YamlEngine) -> None:
    """Beim format-gleichen Round-Trip bleiben Kommentare und Anker im Text erhalten."""
    original = engine.parsen(_lade("typisch.yaml"), ParseOptionen())

    ergebnis = engine.serialisieren(original, SerialisierungsOptionen())
    assert ergebnis.inhalt_text is not None
    assert "# Dienstkonfiguration Werkzeugkiste Nord" in ergebnis.inhalt_text
    assert "# Interne Dienste" in ergebnis.inhalt_text
    assert "&standard" in ergebnis.inhalt_text
    assert "*standard" in ergebnis.inhalt_text


def test_neuaufbau_mit_sortierung_verliert_kommentare(engine: YamlEngine) -> None:
    original = engine.parsen(_lade("typisch.yaml"), ParseOptionen())

    ergebnis = engine.serialisieren(original, SerialisierungsOptionen(sortiere_schluessel=True))
    assert ergebnis.inhalt_text is not None
    assert "#" not in ergebnis.inhalt_text
    assert any("Kommentare und Anker" in warnung for warnung in ergebnis.warnungen)

    erneut = engine.parsen(ergebnis.inhalt_text.encode("utf-8"), ParseOptionen())
    assert erneut.wurzel == original.wurzel
    assert isinstance(erneut.wurzel, dict)
    assert list(erneut.wurzel.keys()) == sorted(erneut.wurzel.keys())


def test_fehlerposition_kaputte_einrueckung(engine: YamlEngine) -> None:
    """kaputte/einrueckung.yaml: Fehlerstelle laut Dateikommentar Zeile 6, Spalte 11."""
    with pytest.raises(ParseFehler) as fehler_info:
        engine.parsen(_lade("kaputte/einrueckung.yaml"), ParseOptionen())

    position = fehler_info.value.position
    assert position is not None
    assert position.start.zeile == 6
    assert position.start.spalte == 11
    assert "Zeile 6" in fehler_info.value.meldung


def test_erkennen_endung_inhalt_und_json_praefix(engine: YamlEngine) -> None:
    treffer = engine.erkennen(b"irgendwas", "konfiguration.yaml")
    assert treffer is not None
    assert treffer.konfidenz == pytest.approx(0.85)

    inhalt = engine.erkennen(_lade("minimal.yaml"), None)
    assert inhalt is not None
    assert inhalt.konfidenz == pytest.approx(0.6)

    # JSON ist auch gültiges YAML - bei '{'-Präfix hält sich die YAML-Engine zurück
    assert engine.erkennen(b'{"name": "Wert"}', None) is None
