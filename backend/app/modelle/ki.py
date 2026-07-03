"""Modelle der KI-Schicht: ein Adapter, N Funktionen gegen ein lokales Sprachmodell.

Jede KI-Anfrage trägt einen KiKontext (Basis-URL, Modellwahl, Temperatur). Die
Antwortmodelle (AbfrageVorschlag, Erklaerung, SchemaAusText, TextAusSchema,
Testdaten) dienen zugleich als json_schema für strukturierte Antworten - das
Modell wird gezwungen, genau diese Form zu liefern; danach wird nachvalidiert.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modelle.dokument import DokumentReferenz
from app.modelle.gemeinsam import JsonWert

# Ziel-Abfragesprache eines Vorschlags. "auto" überlässt der KI die Wahl.
type ZielSprache = Literal["jsonpath", "xpath", "spaltenfilter", "auto"]


class KiKontext(BaseModel):
    """Verbindungs- und Modelldaten - Pflichtteil jeder KI-Anfrage.

    basis_url zeigt auf einen OpenAI-kompatiblen Server (z. B. ein lokal
    laufendes Sprachmodell). modell wählt eine Modell-Id aus /v1/models;
    ohne Angabe entscheidet der Adapter (erstes Nicht-Embedding-Modell).
    """

    basis_url: str = Field(description="Basis-URL des OpenAI-kompatiblen Servers, z. B. http://localhost:1234")
    modell: str | None = Field(default=None, description="Modell-Id aus /v1/models; leer = automatisch")
    temperatur: float = Field(default=0.2, ge=0.0, le=2.0)


class KiStatus(BaseModel):
    """Erreichbarkeit und verfügbare Modelle eines KI-Servers."""

    erreichbar: bool
    basis_url: str
    modelle: list[str] = Field(default_factory=list)
    fehler: str | None = None


# --- Abfrage-Vorschlag: Alltagssprache -> Ausdruck in einer Abfragesprache ---


class AbfrageVorschlagAnfrage(BaseModel):
    """Bitte an die KI, aus einer Frage in Alltagssprache einen Abfrage-Ausdruck zu bauen."""

    ki: KiKontext
    dokument: DokumentReferenz
    frage: str = Field(min_length=1, description="Was gesucht wird, in Alltagssprache")
    ziel_sprache: ZielSprache = "auto"


class AbfrageVorschlag(BaseModel):
    """Vorschlag der KI samt Erklärung und Ergebnis eines Probelaufs.

    Zugleich das json_schema für die strukturierte Antwort des Modells.
    probelauf_treffer wird erst nach der KI-Antwort vom Backend gesetzt.
    """

    sprache: str = Field(description="Gewählte Abfragesprache, z. B. jsonpath oder xpath")
    ausdruck: str = Field(description="Der fertige Abfrage-Ausdruck")
    erklaerung: str = Field(description="Kurze Erläuterung des Ausdrucks in Alltagssprache")
    probelauf_treffer: int | None = Field(
        default=None, description="Anzahl Treffer eines Probelaufs; leer, wenn kein Probelauf möglich war"
    )


# --- Erklären: Aufbau und Auffälligkeiten eines Dokuments ---


class ErklaerenAnfrage(BaseModel):
    """Bitte an die KI, den Aufbau eines Dokuments verständlich zu erklären."""

    ki: KiKontext
    dokument: DokumentReferenz
    schwerpunkt: str | None = Field(default=None, description="Optionaler thematischer Fokus der Erklärung")


class ErklaerenAbschnitt(BaseModel):
    """Ein Abschnitt der Erklärung mit Titel und Fließtext."""

    titel: str
    text: str


class Erklaerung(BaseModel):
    """Verständliche Erklärung eines Dokuments: Zusammenfassung plus Abschnitte."""

    zusammenfassung: str
    abschnitte: list[ErklaerenAbschnitt] = Field(default_factory=list)


# --- Schema aus Text: Prosa-Beschreibung -> JSON Schema ---


class SchemaAusTextAnfrage(BaseModel):
    """Bitte an die KI, aus einer Prosa-Beschreibung ein JSON Schema zu erzeugen."""

    ki: KiKontext
    beschreibung: str = Field(min_length=1, description="Beschreibung der gewünschten Struktur in Alltagssprache")


class SchemaAusText(BaseModel):
    """Erzeugtes JSON Schema (Draft 2020-12) samt getroffener Annahmen.

    Über die API heißt das Feld 'schema' - intern schema_wert, weil der Name
    auf BaseModel bereits vergeben ist (wie bei BeispieldatenAnfrage).
    """

    model_config = ConfigDict(populate_by_name=True)

    schema_wert: JsonWert = Field(alias="schema", description="Das erzeugte JSON Schema")
    annahmen: list[str] = Field(default_factory=list, description="Annahmen, die die KI treffen musste")


class TextAusSchemaAnfrage(BaseModel):
    """Bitte an die KI, ein Dokument in Alltagssprache zu beschreiben (umgekehrter Weg)."""

    ki: KiKontext
    dokument: DokumentReferenz


class TextAusSchema(BaseModel):
    """Verständliche Beschreibung eines Dokuments in Alltagssprache."""

    beschreibung: str


# --- Testdaten: zur Struktur passende Beispiel-Datensätze ---


class TestdatenAnfrage(BaseModel):
    """Bitte an die KI, realistische Beispiel-Datensätze passend zur Struktur zu erzeugen."""

    ki: KiKontext
    dokument: DokumentReferenz
    anzahl: int = Field(default=3, ge=1, le=50)


class Testdaten(BaseModel):
    """Die erzeugten Beispiel-Datensätze."""

    dokumente: list[JsonWert] = Field(default_factory=list)


# --- Testdaten-Spezifikation: KI schlägt Erzeuger/Parameter vor --------------


class TestdatenSpezifikationAnfrage(BaseModel):
    """Bitte an die KI, für ein Dokument eine Generator-Spezifikation vorzuschlagen.

    Antwortmodell ist Spezifikation aus app.modelle.testdaten; das deterministische
    Ableiten bleibt der Standard, dies ist die optionale zweite Option.
    """

    ki: KiKontext
    dokument: DokumentReferenz
