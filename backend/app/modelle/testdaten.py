"""Modelle des spezifikations-getriebenen Testdaten-Generators.

Anders als der jsf-basierte Beispieldaten-Generator (der aus einem JSON Schema
Dokumente würfelt) arbeitet dieser Generator spezifikations-getrieben: eine
Spezifikation ordnet jedem Blatt-Pfad einen benannten Erzeuger mit Parametern zu
und trägt eine Schablone (vorlage) für die Struktur genau eines Datensatzes -
inklusive Verschachtelung und Listenlängen. Aus Spezifikation, Anzahl und Seed
entstehen deterministisch, blockweise stabil beliebig viele Datensätze.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.modelle.dokument import DokumentReferenz
from app.modelle.gemeinsam import JsonWert

# Die ASCII-Ids der Erzeuger-Arten - zugleich API-Vertrag. Die deutschen
# Anzeigenamen und die Parameterlisten liefert erzeuger_arten_infos().
ErzeugerArt = Literal[
    "personenname",
    "vorname",
    "nachname",
    "email",
    "firma",
    "stadt",
    "strasse",
    "land",
    "telefonnummer",
    "ganzzahl",
    "dezimalzahl",
    "wahrheitswert",
    "datum",
    "datumzeit",
    "uuid",
    "muster",
    "wort",
    "satz",
    "kategorie",
    "konstant",
]


class FeldErzeuger(BaseModel):
    """Bindet einen Blatt-Pfad an einen Erzeuger samt Parametern.

    pfad_muster adressiert das Blatt in der Schablone (Listenindizes als *, wie
    im Feld-Profil). parameter trägt die erzeuger-spezifischen Einstellungen
    (etwa min/max, vorlage, werte). beispiel zeigt einen erzeugten Wert.
    """

    pfad_muster: str = Field(description="Pfad-Muster des Blatts, Listenindizes als *")
    erzeuger: ErzeugerArt
    parameter: dict[str, JsonWert] = Field(default_factory=dict)
    beispiel: str = Field(default="", description="Ein beispielhaft erzeugter Wert")


class Spezifikation(BaseModel):
    """Vollständige Bauanleitung für Datensätze: Feld-Erzeuger plus Schablone.

    vorlage ist die Struktur genau eines Datensatzes mit Platzhalter-Werten; sie
    legt Verschachtelung und Listenlängen fest. Beim Erzeugen werden ihre Blätter
    über die passenden FeldErzeuger (nach Pfad-Muster) ersetzt.
    """

    felder: list[FeldErzeuger] = Field(default_factory=list)
    vorlage: JsonWert = None


class SpezifikationAnfrage(BaseModel):
    """Bitte, aus einem Dokument eine Generator-Spezifikation abzuleiten."""

    dokument: DokumentReferenz


class TestdatenAnfrage(BaseModel):
    """Bitte, aus einer Spezifikation deterministisch Datensätze zu erzeugen.

    offset erlaubt blockweises Nachladen: (offset, offset+anzahl) ist der Block;
    gleicher Seed liefert stets dieselben Datensätze je Index.
    """

    spezifikation: Spezifikation
    anzahl: int = Field(default=100, ge=0, le=100000)
    seed: int = 42
    offset: int = Field(default=0, ge=0)


class TestdatenAntwort(BaseModel):
    """Die erzeugten Datensätze eines Blocks samt Block-Grenzen."""

    datensaetze: list[JsonWert] = Field(default_factory=list)
    offset: int = 0
    anzahl: int = 0


class ErzeugerArtInfo(BaseModel):
    """Selbstauskunft einer Erzeuger-Art - speist die Erzeuger-Auswahl im Frontend."""

    id: ErzeugerArt
    name: str
    parameter: list[str] = Field(default_factory=list)
