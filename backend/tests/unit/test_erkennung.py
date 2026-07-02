"""Unit-Tests der Formaterkennung: Kandidaten-Reihenfolge und Binärmüll."""

from __future__ import annotations

import pytest

from app.kern.erkennung import erkenne
from app.modelle.gemeinsam import FormatId
from app.registry import entdecke_module


@pytest.fixture(autouse=True)
def _engines_registrieren() -> None:
    entdecke_module()


def test_json_text_liefert_json_als_ersten_kandidaten() -> None:
    kandidaten = erkenne(b'{"name": "Wert", "stufen": [1, 2, 3]}', None)

    assert kandidaten
    assert kandidaten[0].format_id == FormatId.JSON


def test_json_text_gewinnt_gegen_irrefuehrende_csv_endung() -> None:
    """Beide Engines liefern Kandidaten - JSON steht dank Probeparse vor CSV."""
    kandidaten = erkenne(b'{"name": "Wert"}', "irrefuehrend.csv")

    format_ids = [kandidat.format_id for kandidat in kandidaten]
    assert FormatId.JSON in format_ids
    assert FormatId.CSV in format_ids
    assert format_ids.index(FormatId.JSON) < format_ids.index(FormatId.CSV)


def test_binaermuell_liefert_keine_kandidaten() -> None:
    roh = bytes([0, 159, 146, 150, 255, 254, 250, 1, 2, 3])

    assert erkenne(roh, None) == []
