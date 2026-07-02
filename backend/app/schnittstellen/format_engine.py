"""Vertrag für Format-Engines: erkennen, parsen, serialisieren.

Eine Engine je Format, registriert per Dekorator (siehe app.registry).
Die Fähigkeiten-Selbstauskunft speist den Capabilities-Endpunkt und die
Konvertierungsmatrix mit Verlustwarnung.
"""

from __future__ import annotations

from typing import ClassVar, Protocol

from app.kern.dokument import GeparstesDokument
from app.modelle.dokument import (
    ErkennungsErgebnis,
    ParseOptionen,
    SerialisierungsErgebnis,
    SerialisierungsOptionen,
)
from app.modelle.system import FormatFaehigkeiten


class FormatEngine(Protocol):
    faehigkeiten: ClassVar[FormatFaehigkeiten]

    def erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        """Schnelle Prüfung (Präfix/Heuristik). None = sicher nicht dieses Format."""
        ...

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        """Wirft app.fehler.ParseFehler mit Position bei Syntaxfehlern."""
        ...

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        """Nutzt dok.nativ bei passendem Format (Round-Trip), sonst dok.wurzel."""
        ...
