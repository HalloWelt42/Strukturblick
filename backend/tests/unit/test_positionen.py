"""Unit-Tests des ZeilenIndex: Offset <-> Zeile/Spalte an Text mit Umlauten."""

from __future__ import annotations

import pytest

from app.kern.positionen import ZeilenIndex

# Mehrzeilig, mit Umlauten und einer Leerzeile - Offsets sind Zeichen-Offsets.
TEXT = "Käse: lecker\nBrötchen früh\n\nÜbermut tut selten gut"


def test_zu_position_bekannte_stellen() -> None:
    index = ZeilenIndex(TEXT)

    anfang = index.zu_position(0)
    assert (anfang.zeile, anfang.spalte) == (1, 1)

    zeile2 = index.zu_position(TEXT.index("Brötchen"))
    assert (zeile2.zeile, zeile2.spalte) == (2, 1)

    frueh = index.zu_position(TEXT.index("früh"))
    assert frueh.zeile == 2
    assert frueh.spalte == len("Brötchen ") + 1

    zeile4 = index.zu_position(TEXT.index("Übermut"))
    assert (zeile4.zeile, zeile4.spalte) == (4, 1)


def test_rundreise_offset_zeile_spalte() -> None:
    index = ZeilenIndex(TEXT)

    for offset in range(len(TEXT)):
        pos = index.zu_position(offset)
        assert pos.offset == offset
        assert index.zu_offset(pos.zeile, pos.spalte) == offset


def test_zu_offset_grenzen() -> None:
    index = ZeilenIndex(TEXT)

    # Spalte 0 (unbekannt) wird wie Spalte 1 behandelt
    assert index.zu_offset(1, 0) == 0

    with pytest.raises(ValueError):
        index.zu_offset(0, 1)
    with pytest.raises(ValueError):
        index.zu_offset(99, 1)
