"""KI-Funktion: aus einer Prosa-Beschreibung ein JSON Schema (Draft 2020-12) bauen.

Das gelieferte Schema wird mit dem Draft-2020-12-Metaschema geprüft. Ist es
ungültig, wird die KI mit dem konkreten Fehler zu einer Korrektur aufgefordert.
"""

from __future__ import annotations

from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError

from app.fehler import KiAntwortUngueltig
from app.ki.adapter import Nachricht, OpenAiKompatiblerAdapter
from app.ki.prompts import lade_system_prompt
from app.modelle.ki import SchemaAusText, SchemaAusTextAnfrage

_MAX_KORREKTUREN = 2


async def schema_aus_text(
    adapter: OpenAiKompatiblerAdapter,
    anfrage: SchemaAusTextAnfrage,
) -> SchemaAusText:
    """Fragt die KI nach einem Schema und lässt es bei Bedarf korrigieren."""
    system = lade_system_prompt("schema_aus_text", beschreibung=anfrage.beschreibung)
    verlauf = [Nachricht(rolle="system", inhalt=system)]

    letzter_fehler: str | None = None
    for _ in range(_MAX_KORREKTUREN + 1):
        ergebnis = await adapter.strukturierte_antwort(anfrage.ki, verlauf, SchemaAusText)
        try:
            Draft202012Validator.check_schema(ergebnis.schema_wert)  # type: ignore[arg-type]
        except SchemaError as fehler:
            letzter_fehler = str(fehler)
            verlauf = verlauf + [
                Nachricht(
                    rolle="user",
                    inhalt=(
                        "Das gelieferte Schema ist kein gültiges JSON Schema (Draft 2020-12). "
                        f"Fehler: {letzter_fehler}\nKorrigiere das Schema und antworte erneut."
                    ),
                )
            ]
            continue
        return ergebnis

    raise KiAntwortUngueltig(
        "Die KI lieferte kein gültiges JSON Schema (Draft 2020-12).",
        details={"technisch": letzter_fehler},
    )
