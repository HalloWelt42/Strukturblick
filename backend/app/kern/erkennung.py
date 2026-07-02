"""Formaterkennung: fragt jede registrierte Engine und sortiert nach Konfidenz."""

from __future__ import annotations

from app.modelle.dokument import ErkennungsErgebnis
from app.registry import engines


def erkenne(roh: bytes, dateiname: str | None = None) -> list[ErkennungsErgebnis]:
    kandidaten: list[ErkennungsErgebnis] = []
    for engine in engines.alle():
        ergebnis = engine.erkennen(roh, dateiname)
        if ergebnis is not None and ergebnis.konfidenz > 0:
            kandidaten.append(ergebnis)
    return sorted(kandidaten, key=lambda k: k.konfidenz, reverse=True)
