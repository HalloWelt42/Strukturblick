"""Vertrag für Analyzer: Selbstauskunft und Zuständigkeitsprüfung.

Ein Analyzer je Analyse-Art, registriert per Dekorator (siehe app.registry).
Die eigentliche Analyse-Logik lebt als Funktionen im jeweiligen Modul unter
app.analyzer - der Vertrag hier speist Discovery und Capabilities.
"""

from __future__ import annotations

from typing import ClassVar, Protocol

from app.kern.dokument import GeparstesDokument


class Analyzer(Protocol):
    analyzer_id: ClassVar[str]
    name: ClassVar[str]

    def unterstuetzt(self, dok: GeparstesDokument) -> bool:
        """Kann dieser Analyzer mit dem Dokument arbeiten?"""
        ...
