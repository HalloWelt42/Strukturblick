"""Modelle der Ablage auf dem Server. Sie spiegeln die Schnittstelle `Ablage` der Oberfläche
(frontend/src/lib/dienste/ablage.ts); der Server prüft nur Form und Größe, den Inhalt liest allein die Oberfläche."""

from typing import Literal

from pydantic import BaseModel, Field

#: Kennungen sind UUIDs der Oberfläche
KENNUNG = r"^[0-9a-fA-F-]{36}$"

Leseoption = str | int | float | bool


class Platz(BaseModel):
    art: Literal["ansicht", "werkzeug"]
    kennung: str = Field(max_length=60)


class Verlauf(BaseModel):
    """Verlauf eines Dokuments, wie die Sitzung der Oberfläche ihn führt (Einträge bleiben ungeprüft)."""

    eintraege: list[dict[str, object]] = Field(default_factory=list)
    zeiger: int = Field(0, ge=0)


class Dokument(BaseModel):
    kennung: str = Field(pattern=KENNUNG)
    name: str = Field(min_length=1, max_length=255)
    ordner: str = Field("", max_length=80)
    formatWahl: Literal["json", "ndjson", "csv", "yaml"] | None = None
    optionen: dict[str, Leseoption] = Field(default_factory=dict)
    text: str
    verlauf: Verlauf = Field(default_factory=Verlauf)
    platz: Platz | None = None
    geaendert: str = Field(max_length=40)


class Dokumentkopf(BaseModel):
    kennung: str
    name: str
    ordner: str
    groesse: int
    geaendert: str


class Papierkorbeintrag(Dokumentkopf):
    geloescht: str


#: Ordnernamen: eine Ebene, 1 bis 80 Zeichen, ohne Schrägstriche
ORDNER = r"^[^/\\]{1,80}$"


class Aenderung(BaseModel):
    """Name oder Ordner eines Dokuments ändern, ohne den Inhalt zu übertragen."""

    name: str | None = Field(None, min_length=1, max_length=255)
    ordner: str | None = Field(None, pattern=r"^[^/\\]{0,80}$")


class Ordnername(BaseModel):
    name: str = Field(pattern=ORDNER)


class Arbeitsstand(BaseModel):
    offen: list[str] = Field(default_factory=list, max_length=200)
    aktiv: str | None = None
