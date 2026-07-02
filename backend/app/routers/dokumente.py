"""Dokument-Endpunkte: erkennen, parsen (füllt den Cache), Cache-Status."""

from __future__ import annotations

import base64
import binascii

from fastapi import APIRouter

from app import config
from app.fehler import DokumentNichtImCache, FormatUnbekannt, LimitUeberschritten, ParseFehler
from app.kern.cache import CacheEintrag, dokument_cache
from app.kern.dokument import GeparstesDokument, dokument_hash
from app.kern.erkennung import erkenne
from app.modelle.dokument import (
    CacheStatusAntwort,
    DokumentReferenz,
    ErkennungsAntwort,
    ParseAntwort,
)
from app.modelle.gemeinsam import FormatId
from app.registry import engine_fuer

router = APIRouter(tags=["Dokumente"])


def _roh_aus_referenz(referenz: DokumentReferenz) -> bytes:
    """Löst eine DokumentReferenz in Rohbytes auf (Cache-Miss wird zum 410)."""
    if referenz.dokument_hash is not None:
        eintrag = dokument_cache.hole(referenz.dokument_hash)
        if eintrag is None:
            raise DokumentNichtImCache(
                "Das Dokument liegt nicht mehr im Cache - bitte den Inhalt erneut senden."
            )
        return eintrag.roh
    if referenz.inhalt_base64 is not None:
        try:
            roh = base64.b64decode(referenz.inhalt_base64, validate=True)
        except (binascii.Error, ValueError) as fehler:
            raise ParseFehler(f"Base64-Inhalt ist ungültig: {fehler}") from fehler
    else:
        roh = (referenz.inhalt_text or "").encode("utf-8")
    if len(roh) > config.MAX_DOKUMENT_BYTES:
        grenze_mb = config.MAX_DOKUMENT_BYTES // (1024 * 1024)
        raise LimitUeberschritten(f"Das Dokument ist größer als die Grenze von {grenze_mb} MB.")
    return roh


def _format_bestimmen(roh: bytes, referenz: DokumentReferenz) -> FormatId:
    if referenz.format_id is not None:
        return referenz.format_id
    kandidaten = erkenne(roh, referenz.dateiname)
    if not kandidaten:
        raise FormatUnbekannt(
            "Das Format wurde nicht erkannt - bitte format_id angeben.",
            details={"dateiname": referenz.dateiname},
        )
    return kandidaten[0].format_id


def roh_und_dokument(referenz: DokumentReferenz) -> tuple[bytes, str, GeparstesDokument]:
    """Zentrale Auflösung: Referenz -> (Rohbytes, Hash, geparstes Dokument), mit Cache-Pflege.

    Wie parse_mit_cache, liefert aber zusätzlich die Rohbytes - nötig überall dort,
    wo der ursprüngliche Text gebraucht wird (etwa für die Reparatur).
    """
    roh = _roh_aus_referenz(referenz)
    hash_wert = dokument_hash(roh)

    eintrag = dokument_cache.hole(hash_wert)
    if eintrag is not None and referenz.format_id in (None, eintrag.dokument.format_id):
        return eintrag.roh, hash_wert, eintrag.dokument

    format_id = _format_bestimmen(roh, referenz)
    engine = engine_fuer(format_id)
    dokument = engine.parsen(roh, referenz.parse_optionen)
    dokument_cache.lege_ab(hash_wert, CacheEintrag(roh=roh, dokument=dokument))
    return roh, hash_wert, dokument


def parse_mit_cache(referenz: DokumentReferenz) -> tuple[str, GeparstesDokument]:
    """Zentrale Auflösung: Referenz -> (Hash, geparstes Dokument), mit Cache-Pflege."""
    _, hash_wert, dokument = roh_und_dokument(referenz)
    return hash_wert, dokument


def roh_und_format(referenz: DokumentReferenz) -> tuple[bytes, FormatId]:
    """Löst Rohbytes und Format auf, ohne zu parsen - nötig für defekte Eingaben (Reparatur)."""
    roh = _roh_aus_referenz(referenz)
    return roh, _format_bestimmen(roh, referenz)


@router.post("/dokumente/erkennen")
def dokument_erkennen(referenz: DokumentReferenz) -> ErkennungsAntwort:
    roh = _roh_aus_referenz(referenz)
    return ErkennungsAntwort(kandidaten=erkenne(roh, referenz.dateiname))


@router.post("/dokumente/parsen")
def dokument_parsen(referenz: DokumentReferenz) -> ParseAntwort:
    hash_wert, dokument = parse_mit_cache(referenz)
    return ParseAntwort(
        dokument_hash=hash_wert,
        format_id=dokument.format_id,
        wurzel=dokument.wurzel,
        positionen=dokument.positionen,
        genutzte_aspekte=sorted(dokument.genutzte_aspekte),
        warnungen=dokument.warnungen,
        dialekt_info=dokument.dialekt_info,
    )


@router.get("/dokumente/{hash_wert}/status")
def dokument_status(hash_wert: str) -> CacheStatusAntwort:
    return CacheStatusAntwort(im_cache=dokument_cache.enthaelt(hash_wert))
