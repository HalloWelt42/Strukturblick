"""Zentrale Konfiguration: Ports, Grenzen, Cache - alles per Umgebungsvariable übersteuerbar."""

from __future__ import annotations

import json
import os
from pathlib import Path

PROJEKT_WURZEL = Path(__file__).resolve().parents[2]
VERSIONSDATEI = PROJEKT_WURZEL / "version.json"


def _lies_version() -> str:
    try:
        daten = json.loads(VERSIONSDATEI.read_text(encoding="utf-8"))
        version = daten.get("version")
        return version if isinstance(version, str) else "0.0.0"
    except (OSError, ValueError):
        return "0.0.0"


def _env_int(name: str, standard: int) -> int:
    wert = os.environ.get(name)
    if wert is None:
        return standard
    try:
        return int(wert)
    except ValueError:
        return standard


APP_VERSION: str = _lies_version()

# Grenzen (im Capabilities-Endpunkt ausgeliefert, damit das Frontend sie kennt)
MAX_DOKUMENT_BYTES: int = _env_int("STRUKTURBLICK_MAX_DOKUMENT_BYTES", 25 * 1024 * 1024)

# Flüchtiger Parse-Cache (reine Optimierung - Verlust kostet nur einen Round-Trip)
CACHE_TTL_SEKUNDEN: int = _env_int("STRUKTURBLICK_CACHE_TTL_SEKUNDEN", 30 * 60)
CACHE_MAX_BYTES: int = _env_int("STRUKTURBLICK_CACHE_MAX_BYTES", 200 * 1024 * 1024)

# CORS: der Vite-Entwicklungs-Server
FRONTEND_URSPRUENGE: tuple[str, ...] = (
    "http://localhost:6001",
    "http://127.0.0.1:6001",
)
