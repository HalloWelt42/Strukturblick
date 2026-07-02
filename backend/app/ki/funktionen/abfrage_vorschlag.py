"""KI-Funktion: aus einer Frage in Alltagssprache einen Abfrage-Ausdruck vorschlagen.

Nach der KI-Antwort führt diese Funktion einen echten Probelauf über den
Abfrage-Dispatcher aus (dieselbe Engine wie /api/abfrage) und setzt daraus
probelauf_treffer. Scheitert der Ausdruck syntaktisch, bleibt probelauf_treffer
leer und die Erklärung wird um einen Hinweis ergänzt.
"""

from __future__ import annotations

from app.analyzer.abfrage.dispatcher import fuehre_abfrage
from app.fehler import AbfrageSyntaxFehler, KonvertierungUnmoeglich
from app.ki.adapter import Nachricht, OpenAiKompatiblerAdapter
from app.ki.prompts import lade_system_prompt
from app.kern.dokument import GeparstesDokument
from app.kern.skelett import baue_auszug
from app.modelle.abfrage import AbfrageAnfrage, AbfrageSprache
from app.modelle.dokument import DokumentReferenz
from app.modelle.ki import AbfrageVorschlag, AbfrageVorschlagAnfrage

_PROBELAUF_SPRACHEN: frozenset[str] = frozenset({"jsonpath", "xpath", "volltext", "regex"})


async def schlage_abfrage_vor(
    adapter: OpenAiKompatiblerAdapter,
    anfrage: AbfrageVorschlagAnfrage,
    referenz: DokumentReferenz,
    dokument: GeparstesDokument,
) -> AbfrageVorschlag:
    """Fragt die KI nach einem Ausdruck und prüft ihn mit einem Probelauf."""
    auszug = baue_auszug(dokument.wurzel)
    system = lade_system_prompt(
        "abfrage_vorschlag",
        skelett=auszug.skelett_text,
        stichprobe=auszug.stichprobe_text,
        frage=anfrage.frage,
        ziel_sprache=anfrage.ziel_sprache,
    )
    vorschlag = await adapter.strukturierte_antwort(
        anfrage.ki,
        [Nachricht(rolle="system", inhalt=system)],
        AbfrageVorschlag,
    )
    return _mit_probelauf(vorschlag, referenz, dokument)


def _mit_probelauf(
    vorschlag: AbfrageVorschlag, referenz: DokumentReferenz, dokument: GeparstesDokument
) -> AbfrageVorschlag:
    """Führt den vorgeschlagenen Ausdruck einmal aus und setzt probelauf_treffer."""
    sprache = vorschlag.sprache.lower()
    if sprache not in _PROBELAUF_SPRACHEN:
        # z. B. "spaltenfilter" - keine ausführbare Engine, also kein Probelauf.
        return vorschlag.model_copy(update={"probelauf_treffer": None})

    abfrage = AbfrageAnfrage(
        dokument=referenz,
        sprache=_als_abfrage_sprache(sprache),
        ausdruck=vorschlag.ausdruck,
    )
    try:
        ergebnis = fuehre_abfrage(dokument, abfrage)
    except (AbfrageSyntaxFehler, KonvertierungUnmoeglich) as fehler:
        ergaenzte = (
            f"{vorschlag.erklaerung}\n\nHinweis: Der Probelauf schlug fehl "
            f"({fehler.meldung}) - der Ausdruck ließ sich nicht ausführen."
        )
        return vorschlag.model_copy(update={"probelauf_treffer": None, "erklaerung": ergaenzte})
    return vorschlag.model_copy(update={"probelauf_treffer": ergebnis.anzahl})


def _als_abfrage_sprache(sprache: str) -> AbfrageSprache:
    if sprache == "jsonpath":
        return "jsonpath"
    if sprache == "xpath":
        return "xpath"
    if sprache == "regex":
        return "regex"
    return "volltext"
