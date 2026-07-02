"""Flüchtiger Dokument-Cache: TTL- und Byte-begrenzt, Schlüssel ist der Inhalts-Hash.

Der Cache ist eine reine Optimierung. Ein Verlust (Neustart, TTL, Verdrängung)
kostet das Frontend nur einen erneuten Upload - der Inhalt liegt im Browser.
"""

from __future__ import annotations

from dataclasses import dataclass

from cachetools import TTLCache

from app import config
from app.kern.dokument import GeparstesDokument


@dataclass
class CacheEintrag:
    roh: bytes
    dokument: GeparstesDokument


def _groesse(eintrag: CacheEintrag) -> int:
    return max(len(eintrag.roh), 1)


class DokumentCache:
    def __init__(self, max_bytes: int | None = None, ttl_sekunden: int | None = None) -> None:
        self._eintraege: TTLCache[str, CacheEintrag] = TTLCache(
            maxsize=max_bytes if max_bytes is not None else config.CACHE_MAX_BYTES,
            ttl=ttl_sekunden if ttl_sekunden is not None else config.CACHE_TTL_SEKUNDEN,
            getsizeof=_groesse,
        )

    def lege_ab(self, hash_wert: str, eintrag: CacheEintrag) -> None:
        try:
            self._eintraege[hash_wert] = eintrag
        except ValueError:
            # Eintrag größer als der ganze Cache - dann eben nicht cachen.
            pass

    def hole(self, hash_wert: str) -> CacheEintrag | None:
        return self._eintraege.get(hash_wert)

    def enthaelt(self, hash_wert: str) -> bool:
        return hash_wert in self._eintraege

    def leeren(self) -> None:
        self._eintraege.clear()


# Prozessweiter Cache - bewusst der einzige veränderliche Zustand des Backends.
dokument_cache = DokumentCache()
