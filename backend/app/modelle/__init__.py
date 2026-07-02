"""Pydantic-Modelle der API - nichts geht als rohes Dict über die Leitung."""

from app.modelle.dokument import (
    CacheStatusAntwort,
    DialektInfo,
    DokumentReferenz,
    ErkennungsAntwort,
    ErkennungsErgebnis,
    ParseAntwort,
    ParseOptionen,
    SerialisierungsErgebnis,
    SerialisierungsOptionen,
)
from app.modelle.gemeinsam import (
    FehlerAntwort,
    FehlerDetail,
    FormatId,
    JsonWert,
    KnotenSpannen,
    Positionsgenauigkeit,
    QuellPosition,
    QuellSpanne,
    Verlustaspekt,
)
from app.modelle.system import (
    CapabilitiesAntwort,
    FormatFaehigkeiten,
    HealthAntwort,
    KonvertierungsPaar,
    Limits,
)

__all__ = [
    "CacheStatusAntwort",
    "CapabilitiesAntwort",
    "DialektInfo",
    "DokumentReferenz",
    "ErkennungsAntwort",
    "ErkennungsErgebnis",
    "FehlerAntwort",
    "FehlerDetail",
    "FormatFaehigkeiten",
    "FormatId",
    "HealthAntwort",
    "JsonWert",
    "KnotenSpannen",
    "KonvertierungsPaar",
    "Limits",
    "ParseAntwort",
    "ParseOptionen",
    "Positionsgenauigkeit",
    "QuellPosition",
    "QuellSpanne",
    "SerialisierungsErgebnis",
    "SerialisierungsOptionen",
    "Verlustaspekt",
]
