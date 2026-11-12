"""Datenmodelle der KI über die Leitstelle (STB-60): Auftrag der Oberfläche, Vorschlag zurück, Stand für die Anzeige."""

from typing import Literal

from pydantic import BaseModel, Field

#: Was die KI tun kann; dieselben Kennungen kennt die Oberfläche (analyse/ki/aufgaben.ts)
Aufgabe = Literal["erklaeren", "abfrage", "schema", "beschreibung", "testdaten"]

#: Sprachen, in die eine Frage übersetzt wird
Zielsprache = Literal["sql", "jq", "jsonpath", "xpath"]

#: Größter Auszug (Zeichen): Metadaten und 20 Beispieleinträge, nie das ganze Dokument; darüber lehnt der Server ab
AUSZUG_HOECHSTENS = 60_000

#: Längste Frage (Zeichen)
FRAGE_HOECHSTENS = 2_000


class Auftrag(BaseModel):
    """Was die Oberfläche schickt. `auszug` baut sie selbst (der Server liest keine Dokumente, Leitgedanke 8)."""

    aufgabe: Aufgabe
    frage: str = Field("", max_length=FRAGE_HOECHSTENS)
    auszug: str = Field("", max_length=AUSZUG_HOECHSTENS)
    sprache: Zielsprache | None = None
    #: Der vorige Vorschlag, wenn der Nutzer "Anders vorschlagen" wählt
    vorher: str | None = Field(None, max_length=AUSZUG_HOECHSTENS)


class Verbrauch(BaseModel):
    eingabe: int = 0
    ausgabe: int = 0


class Vorschlag(BaseModel):
    """Antwort der KI als Vorschau: nichts davon ist übernommen, bis der Nutzer es tut."""

    ergebnis: str
    erklaerung: list[str]
    #: Kennung des Modells, das gerechnet hat (den lesbaren Namen kennt der Stand)
    modell: str
    rechner: str | None = None
    dauer_ms: int
    verbrauch: Verbrauch | None = None
    auftrag: str | None = None


class Modellwahl(BaseModel):
    """Ein Sprachmodell, das die Leitstelle Strukturblick anbietet."""

    id: str
    name: str
    zweck: str = ""
    geladen: bool = False
    rechner: str | None = None
    extern: bool = False


class KiStand(BaseModel):
    """Für die Oberfläche: ist KI an, ist die Leitstelle da, welches Modell gilt, welche gibt es."""

    an: bool
    eingerichtet: bool
    bereit: bool
    meldung: str = ""
    modell: str
    modellname: str
    modelle: list[Modellwahl] = Field(default_factory=list)
