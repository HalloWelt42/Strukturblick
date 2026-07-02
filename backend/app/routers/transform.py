"""Transformations-Endpunkte: konvertieren, strukturell diffen, JSON reparieren."""

from __future__ import annotations

from fastapi import APIRouter

from app.modelle.transform import (
    DiffAnfrage,
    DiffAntwort,
    KonvertierAnfrage,
    KonvertierAntwort,
    ReparaturAnfrage,
    ReparaturAntwort,
)
from app.routers.dokumente import parse_mit_cache, roh_und_format
from app.transformer import berechne_diff, konvertiere, repariere

router = APIRouter(tags=["Transformation"])


@router.post("/transform/konvertieren")
def transform_konvertieren(anfrage: KonvertierAnfrage) -> KonvertierAntwort:
    _, dokument = parse_mit_cache(anfrage.dokument)
    return konvertiere(dokument, anfrage.ziel_format, anfrage.optionen)


@router.post("/transform/diff")
def transform_diff(anfrage: DiffAnfrage) -> DiffAntwort:
    _, dok_links = parse_mit_cache(anfrage.links)
    _, dok_rechts = parse_mit_cache(anfrage.rechts)
    return berechne_diff(dok_links, dok_rechts, anfrage.ignoriere_reihenfolge)


@router.post("/transform/reparatur")
def transform_reparatur(anfrage: ReparaturAnfrage) -> ReparaturAntwort:
    # Ohne Parsen auflösen - eine defekte Eingabe soll gerade nicht am Parser scheitern.
    roh, format_id = roh_und_format(anfrage.dokument)
    return repariere(format_id, roh.decode("utf-8", errors="replace"))
