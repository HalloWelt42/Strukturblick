"""KI-Funktion: ein Dokument in Alltagssprache beschreiben (umgekehrter Weg)."""

from __future__ import annotations

from app.ki.adapter import Nachricht, OpenAiKompatiblerAdapter
from app.ki.prompts import lade_system_prompt
from app.kern.dokument import GeparstesDokument
from app.kern.skelett import baue_auszug
from app.modelle.ki import TextAusSchema, TextAusSchemaAnfrage


async def text_aus_schema(
    adapter: OpenAiKompatiblerAdapter,
    anfrage: TextAusSchemaAnfrage,
    dokument: GeparstesDokument,
) -> TextAusSchema:
    """Baut den Auszug, fragt die KI und liefert die verständliche Beschreibung."""
    auszug = baue_auszug(dokument.wurzel)
    system = lade_system_prompt(
        "text_aus_schema",
        skelett=auszug.skelett_text,
        stichprobe=auszug.stichprobe_text,
    )
    return await adapter.strukturierte_antwort(
        anfrage.ki,
        [Nachricht(rolle="system", inhalt=system)],
        TextAusSchema,
    )
