"""Prompt-Verwaltung: lädt System-Prompts je KI-Funktion zur Laufzeit.

Die Prompt-Dateien liegen unter app/ki/prompts/<funktion>/system.md und werden
bei jedem Aufruf frisch gelesen - so sind sie ohne Neustart des Servers
anpassbar. Platzhalter der Form {name} werden mit den übergebenen Werten gefüllt.
"""

from __future__ import annotations

from pathlib import Path

# Die Funktionen, die je einen eigenen Prompt-Ordner mit system.md besitzen müssen.
KI_FUNKTIONEN: tuple[str, ...] = (
    "abfrage_vorschlag",
    "erklaeren",
    "schema_aus_text",
    "text_aus_schema",
    "testdaten",
    "testdaten_spezifikation",
)

_PROMPT_WURZEL = Path(__file__).resolve().parent


def prompt_pfad(funktion: str) -> Path:
    """Pfad zur system.md einer Funktion (ohne Prüfung auf Existenz)."""
    return _PROMPT_WURZEL / funktion / "system.md"


def lade_system_prompt(funktion: str, **platzhalter: str) -> str:
    """Liest die system.md einer Funktion und ersetzt die {platzhalter}.

    Fehlende Platzhalter im Text werden ignoriert (kein Fehler); übergebene
    Werte, die im Text nicht vorkommen, ebenfalls.
    """
    text = prompt_pfad(funktion).read_text(encoding="utf-8")
    for name, wert in platzhalter.items():
        text = text.replace("{" + name + "}", wert)
    return text
