"""Unit-Tests des Dokument-Caches: ablegen/holen, leeren, TTL, Verdrängung."""

from __future__ import annotations

import time

from app.kern.cache import CacheEintrag, DokumentCache
from app.kern.dokument import GeparstesDokument
from app.modelle.gemeinsam import FormatId


def _eintrag(roh: bytes) -> CacheEintrag:
    dokument = GeparstesDokument(format_id=FormatId.JSON, wurzel=roh.decode("latin-1"))
    return CacheEintrag(roh=roh, dokument=dokument)


def test_ablegen_und_holen() -> None:
    cache = DokumentCache(max_bytes=1024, ttl_sekunden=60)

    cache.lege_ab("hash-a", _eintrag(b"abc"))

    geholt = cache.hole("hash-a")
    assert geholt is not None
    assert geholt.roh == b"abc"
    assert cache.enthaelt("hash-a") is True
    assert cache.hole("unbekannt") is None
    assert cache.enthaelt("unbekannt") is False


def test_leeren_entfernt_alle_eintraege() -> None:
    cache = DokumentCache(max_bytes=1024, ttl_sekunden=60)
    cache.lege_ab("hash-a", _eintrag(b"abc"))
    cache.lege_ab("hash-b", _eintrag(b"def"))

    cache.leeren()

    assert cache.hole("hash-a") is None
    assert cache.hole("hash-b") is None


def test_ttl_null_laesst_eintraege_sofort_verfallen() -> None:
    cache = DokumentCache(max_bytes=1024, ttl_sekunden=0)

    cache.lege_ab("hash-a", _eintrag(b"abc"))

    time.sleep(0.01)  # die monotone Uhr muss sicher weitergelaufen sein
    assert cache.hole("hash-a") is None
    assert cache.enthaelt("hash-a") is False


def test_verdraengung_ueber_max_bytes() -> None:
    cache = DokumentCache(max_bytes=10, ttl_sekunden=60)

    cache.lege_ab("hash-a", _eintrag(b"123456"))  # 6 Bytes
    cache.lege_ab("hash-b", _eintrag(b"abcdef"))  # 6 Bytes -> verdrängt hash-a

    assert cache.hole("hash-a") is None
    geholt = cache.hole("hash-b")
    assert geholt is not None
    assert geholt.roh == b"abcdef"


def test_uebergrosser_eintrag_wird_still_verworfen() -> None:
    cache = DokumentCache(max_bytes=10, ttl_sekunden=60)

    cache.lege_ab("hash-gross", _eintrag(b"x" * 32))

    assert cache.hole("hash-gross") is None
