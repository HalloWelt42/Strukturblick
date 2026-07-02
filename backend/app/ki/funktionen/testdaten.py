"""KI-Funktion: realistische, zur Struktur passende Beispiel-Datensätze erzeugen."""

from __future__ import annotations

from app.ki.adapter import Nachricht, OpenAiKompatiblerAdapter
from app.ki.prompts import lade_system_prompt
from app.kern.dokument import GeparstesDokument
from app.kern.skelett import baue_auszug
from app.modelle.ki import Testdaten, TestdatenAnfrage


async def erzeuge_testdaten(
    adapter: OpenAiKompatiblerAdapter,
    anfrage: TestdatenAnfrage,
    dokument: GeparstesDokument,
) -> Testdaten:
    """Baut den Auszug, fragt die KI und liefert die Beispiel-Datensätze."""
    auszug = baue_auszug(dokument.wurzel)
    system = lade_system_prompt(
        "testdaten",
        skelett=auszug.skelett_text,
        stichprobe=auszug.stichprobe_text,
        anzahl=str(anfrage.anzahl),
    )
    return await adapter.strukturierte_antwort(
        anfrage.ki,
        [Nachricht(rolle="system", inhalt=system)],
        Testdaten,
    )
