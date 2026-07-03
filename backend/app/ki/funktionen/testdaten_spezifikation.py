"""KI-Funktion: eine Generator-Spezifikation vorschlagen lassen.

Das deterministische Ableiten (leite_spezifikation_ab) bleibt der Standard. Diese
Funktion ist die optionale zweite Option: das Sprachmodell bekommt die heuristisch
abgeleitete Spezifikation und einen Dokument-Auszug und darf Erzeuger und Parameter
verfeinern. Die vorlage (Schablone) wird bewusst aus der heuristischen Ableitung
übernommen - die Struktur steht fest, das Modell entscheidet nur über die Erzeuger.
"""

from __future__ import annotations

import json

from app.generatoren.testdaten import erzeuger_arten_infos, leite_spezifikation_ab
from app.ki.adapter import Nachricht, OpenAiKompatiblerAdapter
from app.ki.prompts import lade_system_prompt
from app.kern.dokument import GeparstesDokument
from app.kern.skelett import baue_auszug
from app.modelle.ki import KiKontext
from app.modelle.testdaten import Spezifikation


def _erzeuger_uebersicht() -> str:
    """Kompakte Liste der Erzeuger-Arten mit Parametern für den Prompt."""
    zeilen = []
    for info in erzeuger_arten_infos():
        parameter = ", ".join(info.parameter) if info.parameter else "keine"
        zeilen.append(f"- {info.id} ({info.name}); Parameter: {parameter}")
    return "\n".join(zeilen)


async def schlage_testdaten_spezifikation_vor(
    adapter: OpenAiKompatiblerAdapter,
    ki: KiKontext,
    dokument: GeparstesDokument,
) -> Spezifikation:
    """Fragt das Modell nach einer Spezifikation; fällt bei Bedarf auf die Heuristik zurück.

    Die vom Modell gelieferten felder werden übernommen; die Schablone (vorlage)
    stammt stets aus der deterministischen Ableitung, damit die Struktur passt.
    """
    heuristik = leite_spezifikation_ab(dokument)
    auszug = baue_auszug(dokument.wurzel)
    system = lade_system_prompt(
        "testdaten_spezifikation",
        erzeuger=_erzeuger_uebersicht(),
        skelett=auszug.skelett_text,
        stichprobe=auszug.stichprobe_text,
        vorschlag=json.dumps(
            heuristik.model_dump(mode="json"), ensure_ascii=False, indent=2
        ),
    )
    vorschlag = await adapter.strukturierte_antwort(
        ki, [Nachricht(rolle="system", inhalt=system)], Spezifikation
    )
    # Die Schablone bleibt die heuristische - nur die Erzeuger übernimmt das Modell.
    if not vorschlag.felder:
        return heuristik
    return Spezifikation(felder=vorschlag.felder, vorlage=heuristik.vorlage)
