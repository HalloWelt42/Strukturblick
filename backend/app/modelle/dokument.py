"""Modelle rund um Dokumente: Referenz, Erkennung, Parsen, Serialisierung."""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from app.modelle.gemeinsam import FormatId, JsonWert, KnotenSpannen, Verlustaspekt


class ParseOptionen(BaseModel):
    """Vom Nutzer übersteuerbare Parse-Einstellungen (z. B. erkannten CSV-Dialekt korrigieren)."""

    tolerant: bool = Field(default=True, description="Bei JSON: nach striktem Fehlschlag tolerant versuchen")
    csv_trennzeichen: str | None = Field(default=None, min_length=1, max_length=1)
    csv_encoding: str | None = None
    csv_hat_kopfzeile: bool | None = None


class DokumentReferenz(BaseModel):
    """Dokument per Wert (Text oder Base64) oder per Inhalts-Hash aus dem Cache."""

    inhalt_text: str | None = None
    inhalt_base64: str | None = None
    dokument_hash: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    format_id: FormatId | None = None
    dateiname: str | None = None
    parse_optionen: ParseOptionen = Field(default_factory=ParseOptionen)

    @model_validator(mode="after")
    def _genau_eine_quelle(self) -> "DokumentReferenz":
        quellen = [q for q in (self.inhalt_text, self.inhalt_base64, self.dokument_hash) if q is not None]
        if len(quellen) != 1:
            raise ValueError("Genau eine Quelle angeben: inhalt_text, inhalt_base64 oder dokument_hash")
        return self


class ErkennungsErgebnis(BaseModel):
    format_id: FormatId
    konfidenz: float = Field(ge=0.0, le=1.0)
    hinweise: list[str] = Field(default_factory=list)


class ErkennungsAntwort(BaseModel):
    kandidaten: list[ErkennungsErgebnis]


class DialektInfo(BaseModel):
    """Erkannter CSV-Dialekt - wird in der UI angezeigt und ist dort korrigierbar."""

    trennzeichen: str
    anfuehrungszeichen: str
    encoding: str
    hat_kopfzeile: bool


class ParseAntwort(BaseModel):
    dokument_hash: str
    format_id: FormatId
    wurzel: JsonWert
    positionen: dict[str, KnotenSpannen] = Field(
        default_factory=dict, description="JSON-Pointer -> Quelltext-Spannen"
    )
    genutzte_aspekte: list[Verlustaspekt] = Field(default_factory=list)
    warnungen: list[str] = Field(default_factory=list)
    dialekt_info: DialektInfo | None = None


class CacheStatusAntwort(BaseModel):
    im_cache: bool


class SerialisierungsOptionen(BaseModel):
    einrueckung: int = Field(default=2, ge=0, le=8)
    sortiere_schluessel: bool = False
    csv_trennzeichen: str = Field(default=";", min_length=1, max_length=1)


class SerialisierungsErgebnis(BaseModel):
    inhalt_text: str | None = None
    inhalt_base64: str | None = None
    warnungen: list[str] = Field(default_factory=list)
