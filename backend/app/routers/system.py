"""System-Endpunkte: Health und Capabilities."""

from __future__ import annotations

from fastapi import APIRouter

from app import config, registry
from app.modelle.system import CapabilitiesAntwort, HealthAntwort

router = APIRouter(tags=["System"])


@router.get("/health")
def health() -> HealthAntwort:
    """Erreichbarkeit und Fassung; die Oberfläche vergleicht die Fassung mit ihrer eingebauten und lädt bei Abweichung neu."""
    return HealthAntwort(version=config.lies_version())


@router.get("/capabilities")
def capabilities() -> CapabilitiesAntwort:
    return registry.capabilities()
