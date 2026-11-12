"""Einstellungen von Strukturblick. Kellerwolke, Leitstelle und weitere Konten bringt das Gerüst mit; eigene Felder kommen
hier dazu (mit `Field(title=..., description=...)`, Auswahl über `Literal`, Geheimnisse als `SecretStr`). Die Seite
Einstellungen der Oberfläche entsteht daraus von selbst."""

from pydantic import Field, field_validator

from appkern.app import Grundeinstellungen

KI = {"gruppe": "KI"}

#: Vorgabe für das Sprachmodell: das gründlichste allgemeine Modell der Leitstelle (Zweitname, jede Schreibweise des
#: Läufers gilt); die Leitstelle wählt nie selbst ein Modell
TEXTMODELL = "qwen/qwen3-next-80b"


class AppEinstellungen(Grundeinstellungen):
    ki_an: bool = Field(True, title="KI-Funktionen anbieten", json_schema_extra=KI,
                        description="Jedes KI-Ergebnis erscheint zuerst als Vorschau. Ohne KI bleibt alles andere gleich.")
    ki_modell: str = Field(TEXTMODELL, title="Sprachmodell", json_schema_extra=KI,
                           description="Für Erklären, Abfragen schreiben, Schemas und Testdaten. Die Auswahl kommt von "
                                       "der Leitstelle; leer gilt die Vorgabe Qwen3 Next 80B.")

    @field_validator("ki_modell", mode="before")
    @classmethod
    def _modell_nie_leer(cls, wert: object) -> object:
        """Leer heißt die Vorgabe: ohne Modell lehnt die Leitstelle ab."""
        return TEXTMODELL if isinstance(wert, str) and not wert.strip() else wert
