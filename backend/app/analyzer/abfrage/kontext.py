"""Gemeinsame Kontext-Darstellung fuer Treffer aller Abfragesprachen.

Der Kontext ist eine kurze, menschenlesbare Zeile - fuer skalare Werte der Wert
selbst, fuer Objekte und Listen eine knappe Typangabe. Der letzte Pfadschluessel
dient als Beschriftung (z. B. "summe: 68.3").
"""

from __future__ import annotations

from app.kern.pfade import segmente_aus_pointer
from app.modelle.gemeinsam import JsonWert

_MAX_KONTEXT_LAENGE = 120


def _letzter_schluessel(pfad: str) -> str:
    segmente = segmente_aus_pointer(pfad)
    return segmente[-1] if segmente else ""


def _wert_darstellung(wert: JsonWert) -> str:
    if isinstance(wert, dict):
        return f"{{Objekt mit {len(wert)} Schluesseln}}"
    if isinstance(wert, list):
        return f"[Liste mit {len(wert)} Elementen]"
    if isinstance(wert, bool):
        return "true" if wert else "false"
    if wert is None:
        return "null"
    return str(wert)


def kontext_bilden(pfad: str, wert: JsonWert) -> str:
    """Kurze Textdarstellung eines Treffers, optional mit Schluessel als Praefix."""
    darstellung = _wert_darstellung(wert)
    schluessel = _letzter_schluessel(pfad)
    text = f"{schluessel}: {darstellung}" if schluessel else darstellung
    if len(text) > _MAX_KONTEXT_LAENGE:
        text = text[: _MAX_KONTEXT_LAENGE - 1] + "…"
    return text
