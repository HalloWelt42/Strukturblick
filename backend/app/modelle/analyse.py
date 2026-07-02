"""Modelle der Analyse-Endpunkte: Schema-Inferenz, Validierung, Statistik, Muster."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modelle.dokument import DokumentReferenz
from app.modelle.gemeinsam import JsonWert, QuellSpanne

type SchemaArt = Literal["json_schema", "table_schema"]
type SchemaQuellArt = Literal["json_schema", "xsd"]
type MusterArt = Literal[
    "uuid", "email", "url", "iso_datum", "iso_zeitstempel", "base64", "enum_kandidat"
]


class SchemaAnfrage(BaseModel):
    dokument: DokumentReferenz
    art: SchemaArt = "json_schema"


class SchemaAntwort(BaseModel):
    """Über die API heißt das Schema-Feld 'schema' - intern schema_wert,
    weil der Name auf BaseModel bereits vergeben ist."""

    model_config = ConfigDict(populate_by_name=True)

    art: SchemaArt
    schema_wert: JsonWert = Field(alias="schema")
    hinweise: list[str] = Field(default_factory=list)


class ValidierungsAnfrage(BaseModel):
    dokument: DokumentReferenz
    schema_art: SchemaQuellArt
    schema_dokument: DokumentReferenz | None = None
    xsd_text: str | None = None

    @model_validator(mode="after")
    def _schema_quelle_pruefen(self) -> "ValidierungsAnfrage":
        if self.schema_art == "json_schema" and self.schema_dokument is None:
            raise ValueError("Für schema_art 'json_schema' wird schema_dokument benötigt")
        if self.schema_art == "xsd" and self.xsd_text is None:
            raise ValueError("Für schema_art 'xsd' wird xsd_text benötigt")
        return self


class ValidierungsFehler(BaseModel):
    meldung: str
    pfad: str | None = None
    position: QuellSpanne | None = None
    schema_pfad: str | None = None


class ValidierungsAntwort(BaseModel):
    gueltig: bool
    fehler: list[ValidierungsFehler] = Field(default_factory=list)


class StatistikAnfrage(BaseModel):
    dokument: DokumentReferenz


class SchluesselStat(BaseModel):
    schluessel: str
    anzahl: int


class HistogrammEimer(BaseModel):
    von: float
    bis: float
    anzahl: int


class ZahlenHistogramm(BaseModel):
    pfad_muster: str
    minimum: float
    maximum: float
    eimer: list[HistogrammEimer]


class TeilbaumGroesse(BaseModel):
    pfad: str
    knoten: int
    prozent: float


class StatistikAntwort(BaseModel):
    knoten_gesamt: int
    max_tiefe: int
    groesse_bytes: int
    typverteilung: dict[str, int]
    schluessel_haeufigkeit: list[SchluesselStat]
    zahlen_histogramme: list[ZahlenHistogramm]
    groessenanteile: list[TeilbaumGroesse]
    dauer_ms: float


class MusterAnfrage(BaseModel):
    dokument: DokumentReferenz
    max_beispiele: int = Field(default=3, ge=1)


class MusterFund(BaseModel):
    pfad_muster: str
    muster: MusterArt
    abdeckung: float
    anzahl_werte: int
    beispiele: list[str]
    enum_werte: list[str] | None = None


class MusterAntwort(BaseModel):
    funde: list[MusterFund] = Field(default_factory=list)


class ProfilAnfrage(BaseModel):
    dokument: DokumentReferenz


class FeldTypAnteil(BaseModel):
    """Wie oft an einem Pfad ein bestimmter Werttyp vorkommt."""

    typ: str  # objekt / liste / text / zahl / wahrheitswert / null
    anzahl: int


class FeldProfil(BaseModel):
    """Kennzahlen aller Werte an genau einem Pfad-Muster (Listenindizes als *)."""

    pfad_muster: str  # z. B. "/bestellungen/*/summe" oder "" für die Wurzel
    vorkommen: int  # wie oft dieser Pfad im Dokument auftritt
    typen: list[FeldTypAnteil]  # Typverteilung der Werte an diesem Pfad
    null_anteil: float  # Anteil null/fehlend (0..1)
    verschiedene: int  # Anzahl verschiedener Werte (für Skalare)
    text_min_laenge: int | None = None  # kürzeste Zeichenkette (nur wenn Textwerte vorkommen)
    text_max_laenge: int | None = None  # längste Zeichenkette (nur wenn Textwerte vorkommen)
    zahl_minimum: float | None = None  # kleinster Zahlenwert (nur wenn Zahlen vorkommen)
    zahl_maximum: float | None = None  # größter Zahlenwert (nur wenn Zahlen vorkommen)
    kind_min: int | None = None  # min Anzahl direkter Unterelemente (nur für Container-Pfade)
    kind_max: int | None = None  # max Anzahl direkter Unterelemente (nur für Container-Pfade)
    beispielwerte: list[str]  # bis zu 5 Beispiel-Kurzdarstellungen der Werte


class ProfilAntwort(BaseModel):
    felder: list[FeldProfil]
    anzahl_felder: int


class TypFeld(BaseModel):
    """Ein Feld eines benannten Typs, aufbereitet für das Schema-Diagramm.

    typ_anzeige ist eine menschenlesbare Beschreibung des Feldtyps auf Deutsch
    (z. B. "Text", "Zahl", "Liste (Text)", "Objekt (Kunde)"). referenz nennt den
    Namen des referenzierten benannten Typs (bei einer Liste benannter Typen der
    Elementtyp), sonst null - daraus lassen sich die Kanten des Diagramms bilden.
    """

    name: str
    typ_anzeige: str
    referenz: str | None = None
    ist_liste: bool = False
    optional: bool = False


class TypDefinition(BaseModel):
    """Ein benannter Typ des neutralen Typmodells mit seinen Feldern."""

    name: str
    felder: list[TypFeld] = Field(default_factory=list)


class TypModellAnfrage(BaseModel):
    """Anfrage für das neutrale Typmodell eines Dokuments (Schema-Diagramm)."""

    dokument: DokumentReferenz
    wurzelname: str = "Wurzel"


class TypModellAntwort(BaseModel):
    """Das neutrale Typmodell: der Wurzeltyp und alle benannten Typen."""

    wurzel_name: str
    typen: list[TypDefinition] = Field(default_factory=list)
