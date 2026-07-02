"""Hilfen rund um Quelltext-Positionen und -Spannen."""

from __future__ import annotations

from bisect import bisect_right

from app.modelle.gemeinsam import KnotenSpannen, QuellPosition, QuellSpanne


def position(zeile: int, spalte: int = 0, offset: int = -1) -> QuellPosition:
    return QuellPosition(zeile=zeile, spalte=spalte, offset=offset)


def spanne(
    start_zeile: int,
    start_spalte: int,
    start_offset: int,
    ende_zeile: int,
    ende_spalte: int,
    ende_offset: int,
) -> QuellSpanne:
    return QuellSpanne(
        start=position(start_zeile, start_spalte, start_offset),
        ende=position(ende_zeile, ende_spalte, ende_offset),
    )


def nur_wert(wert_spanne: QuellSpanne) -> KnotenSpannen:
    return KnotenSpannen(wert=wert_spanne)


class ZeilenIndex:
    """Rechnet Zeichenoffsets in 1-basierte Zeile/Spalte um (und zurück)."""

    def __init__(self, text: str) -> None:
        self._zeilen_anfaenge: list[int] = [0]
        for index, zeichen in enumerate(text):
            if zeichen == "\n":
                self._zeilen_anfaenge.append(index + 1)

    def zu_position(self, offset: int) -> QuellPosition:
        zeile = bisect_right(self._zeilen_anfaenge, offset)
        spalte = offset - self._zeilen_anfaenge[zeile - 1] + 1
        return QuellPosition(zeile=zeile, spalte=spalte, offset=offset)

    def zu_offset(self, zeile: int, spalte: int) -> int:
        if zeile < 1 or zeile > len(self._zeilen_anfaenge):
            raise ValueError(f"Zeile {zeile} liegt außerhalb des Textes")
        return self._zeilen_anfaenge[zeile - 1] + max(spalte, 1) - 1
