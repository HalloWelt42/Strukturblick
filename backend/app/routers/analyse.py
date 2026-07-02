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
    TypDefinition,
    TypFeld,
    TypModellAnfrage,
    TypModellAntwort,
    ValidierungsAnfrage,
    ValidierungsAntwort,
)
from app.routers.dokumente import parse_mit_cache
from app.transformer.codegen.schema_modell import FeldTyp, baue_schema_modell

router = APIRouter(tags=["Analyse"])

# Menschenlesbare Anzeigenamen der primitiven Typen des neutralen Modells.
_PRIMITIV_ANZEIGE: dict[str, str] = {
    "string": "Text",
    "number": "Zahl",
    "integer": "Ganzzahl",
    "boolean": "Wahrheitswert",
    "null": "Nichts",
    "any": "Beliebig",
}


def _basis_anzeige(typ: FeldTyp) -> str:
    """Anzeigename des Grundtyps (ohne Listen-Hülle): Referenz oder Primitiv."""
    if typ.referenz is not None:
        return f"Objekt ({typ.referenz})"
    return _PRIMITIV_ANZEIGE.get(typ.primitiv or "any", "Beliebig")


def _typ_anzeige(typ: FeldTyp) -> str:
    """Vollständiger, menschenlesbarer Anzeigename eines Feldtyps auf Deutsch."""
    if typ.ist_liste:
        # Bei einer Liste benannter Typen genügt der Typname ("Liste (Bestellung)"),
        # nicht die verschachtelte Objekt-Hülle.
        element = typ.referenz if typ.referenz is not None else _basis_anzeige(typ)
        return f"Liste ({element})"
    return _basis_anzeige(typ)


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


@router.post("/analyse/typmodell")
def typmodell_ableiten(anfrage: TypModellAnfrage) -> TypModellAntwort:
    """Leitet das neutrale Typmodell für ein Schema-Diagramm ab.

    Nutzt dieselbe Ableitung wie die Codegenerierung (baue_schema_modell) und
    übersetzt jeden benannten Typ in eine TypDefinition mit menschenlesbaren
    Feldbeschreibungen. Aus den referenz-Feldern lassen sich die Diagramm-Kanten
    zwischen den Typen bilden.
    """
    _, dokument = parse_mit_cache(anfrage.dokument)
    modell = baue_schema_modell(dokument.wurzel, anfrage.wurzelname)
    typen = [
        TypDefinition(
            name=typ.name,
            felder=[
                TypFeld(
                    name=feld.name,
                    typ_anzeige=_typ_anzeige(feld.typ),
                    referenz=feld.typ.referenz,
                    ist_liste=feld.typ.ist_liste,
                    optional=feld.optional,
                )
                for feld in typ.felder
            ],
        )
        for typ in modell.typen
    ]
    wurzel_name = typen[0].name if typen else ""
    return TypModellAntwort(wurzel_name=wurzel_name, typen=typen)
