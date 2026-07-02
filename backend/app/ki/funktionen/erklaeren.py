"""KI-Funktion: den Aufbau eines Dokuments verständlich erklären."""

from __future__ import annotations

from app.ki.adapter import Nachricht, OpenAiKompatiblerAdapter
from app.ki.prompts import lade_system_prompt
from app.kern.dokument import GeparstesDokument
from app.kern.skelett import baue_auszug
from app.modelle.ki import ErklaerenAnfrage, Erklaerung


async def erklaere_dokument(
    adapter: OpenAiKompatiblerAdapter,
    anfrage: ErklaerenAnfrage,
    dokument: GeparstesDokument,
) -> Erklaerung:
    """Baut den Auszug, fragt die KI und liefert die validierte Erklärung."""
    auszug = baue_auszug(dokument.wurzel)
    system = lade_system_prompt(
        "erklaeren",
        skelett=auszug.skelett_text,
        stichprobe=auszug.stichprobe_text,
        schwerpunkt=anfrage.schwerpunkt or "(kein besonderer Schwerpunkt)",
    )
    return await adapter.strukturierte_antwort(
        anfrage.ki,
        [Nachricht(rolle="system", inhalt=system)],
        Erklaerung,
    )
