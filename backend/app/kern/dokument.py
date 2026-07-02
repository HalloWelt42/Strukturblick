"""Das interne Dokumentmodell: normalisierter Wertebaum plus Positions-Sidecar."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

from app.modelle.dokument import DialektInfo
from app.modelle.gemeinsam import FormatId, JsonWert, KnotenSpannen, Verlustaspekt


def dokument_hash(roh: bytes) -> str:
    """SHA-256 des Rohinhalts - deterministische, deduplizierende Dokument-Adresse."""
    return hashlib.sha256(roh).hexdigest()


@dataclass
class GeparstesDokument:
    """Ergebnis des Parsens - lebt im Cache, geht nie roh über die API.

    wurzel ist der normalisierte JSON-Wertebaum, positionen die PositionsKarte
    (JSON-Pointer -> Spannen), nativ das Original-Handle für verlustfreie
    Rückserialisierung (z. B. erkannter CSV-Dialekt, später ruamel-/lxml-Bäume).
    """

    format_id: FormatId
    wurzel: JsonWert
    positionen: dict[str, KnotenSpannen] = field(default_factory=dict)
    genutzte_aspekte: frozenset[Verlustaspekt] = frozenset()
    nativ: object | None = None
    warnungen: list[str] = field(default_factory=list)
    dialekt_info: DialektInfo | None = None
