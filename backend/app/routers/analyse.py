"""Analyse-Endpunkte: Schema-Inferenz, Validierung, Statistik, Mustererkennung."""

from __future__ import annotations

from fastapi import APIRouter

from app.analyzer.muster import erkenne_muster
from app.analyzer.profil import erzeuge_profil
from app.analyzer.schema_inferenz import leite_schema_ab
from app.analyzer.statistik import berechne_statistik
from app.analyzer.validierung import pruefe_gegen_json_schema, pruefe_gegen_xsd
from app.fehler import ParseFehler
from app.kern.cache import dokument_cache
from app.modelle.analyse import (
    MusterAnfrage,
    MusterAntwort,
    ProfilAnfrage,
    ProfilAntwort,
    SchemaAnfrage,
    SchemaAntwort,
    StatistikAnfrage,
    StatistikAntwort,
    ValidierungsAnfrage,
    ValidierungsAntwort,
)
from app.routers.dokumente import parse_mit_cache

router = APIRouter(tags=["Analyse"])


@router.post("/analyse/schema")
def schema_ableiten(anfrage: SchemaAnfrage) -> SchemaAntwort:
    _, dokument = parse_mit_cache(anfrage.dokument)
    return leite_schema_ab(dokument, anfrage.art)


@router.post("/analyse/validieren")
def dokument_validieren(anfrage: ValidierungsAnfrage) -> ValidierungsAntwort:
    _, dokument = parse_mit_cache(anfrage.dokument)
    if anfrage.schema_art == "json_schema":
        if anfrage.schema_dokument is None:  # durch den Modell-Validator bereits ausgeschlossen
            raise ParseFehler("Für schema_art 'json_schema' wird schema_dokument benötigt.")
        _, schema_dokument = parse_mit_cache(anfrage.schema_dokument)
        return pruefe_gegen_json_schema(dokument, schema_dokument)
    if anfrage.xsd_text is None:  # durch den Modell-Validator bereits ausgeschlossen
        raise ParseFehler("Für schema_art 'xsd' wird xsd_text benötigt.")
    return pruefe_gegen_xsd(dokument, anfrage.xsd_text)


@router.post("/analyse/statistik")
def statistik_berechnen(anfrage: StatistikAnfrage) -> StatistikAntwort:
    hash_wert, dokument = parse_mit_cache(anfrage.dokument)
    eintrag = dokument_cache.hole(hash_wert)
    groesse_bytes = len(eintrag.roh) if eintrag is not None else 0
    return berechne_statistik(dokument, groesse_bytes)


@router.post("/analyse/muster")
def muster_erkennen(anfrage: MusterAnfrage) -> MusterAntwort:
    _, dokument = parse_mit_cache(anfrage.dokument)
    return erkenne_muster(dokument, anfrage.max_beispiele)


@router.post("/analyse/profil")
def profil_erzeugen(anfrage: ProfilAnfrage) -> ProfilAntwort:
    _, dokument = parse_mit_cache(anfrage.dokument)
    return erzeuge_profil(dokument)
