"""Formatkonvertierung mit Verlustbericht.

Der Verlust einer Konvertierung ergibt sich aus den vom Quell-Dokument
tatsächlich genutzten Aspekten minus der Tragfähigkeit des Zielformats. Beim
reinen Umformatieren (gleiches Format) entsteht höchstens Verlust der
Schlüsselreihenfolge, wenn der Nutzer die Schlüssel sortieren lässt.
"""

from __future__ import annotations

from app.fehler import KonvertierungUnmoeglich
from app.kern.dokument import GeparstesDokument
from app.modelle.dokument import SerialisierungsOptionen
from app.modelle.gemeinsam import FormatId, Verlustaspekt
from app.modelle.transform import KonvertierAntwort, VerlustHinweis
from app.registry import engine_fuer

_VERLUST_MELDUNGEN: dict[Verlustaspekt, str] = {
    Verlustaspekt.KOMMENTARE: "Kommentare gehen verloren",
    Verlustaspekt.ANKER_REFERENZEN: "Anker und Aliasse werden aufgelöst",
    Verlustaspekt.ATTRIBUTE: "XML-Attribute können nicht abgebildet werden",
    Verlustaspekt.MIXED_CONTENT: "Gemischter Inhalt geht verloren",
    Verlustaspekt.TYPPRAEZISION: "Typpräzision kann verloren gehen",
    Verlustaspekt.SCHLUESSELREIHENFOLGE: "Die Schlüsselreihenfolge ist nicht garantiert",
    Verlustaspekt.DUPLIKAT_SCHLUESSEL: "Doppelte Schlüssel werden zusammengeführt",
    Verlustaspekt.VERSCHACHTELUNG: "Verschachtelte Strukturen gehen verloren",
    Verlustaspekt.MEHRERE_TABELLEN: "Mehrere Tabellen können nicht abgebildet werden",
    Verlustaspekt.ZELLFORMATE: "Zellformate gehen verloren",
}


def _meldung(aspekt: Verlustaspekt) -> str:
    return _VERLUST_MELDUNGEN.get(aspekt, f"Aspekt '{aspekt.value}' geht verloren")


def _verluste_ermitteln(dok: GeparstesDokument, ziel_format: FormatId) -> list[VerlustHinweis]:
    """Verlorene Aspekte = genutzte Aspekte der Quelle minus Tragfähigkeit des Ziels."""
    ziel_engine = engine_fuer(ziel_format)
    if ziel_format == dok.format_id:
        # Reines Umformatieren/Minifizieren/Sortieren - kein struktureller Verlust.
        return []
    verlorene = dok.genutzte_aspekte - ziel_engine.faehigkeiten.traegt
    return [
        VerlustHinweis(aspekt=aspekt, meldung=_meldung(aspekt))
        for aspekt in sorted(verlorene)
    ]


def konvertiere(
    dok: GeparstesDokument, ziel_format: FormatId, optionen: SerialisierungsOptionen
) -> KonvertierAntwort:
    """Serialisiert dok ins Zielformat und meldet die entstehenden Verluste.

    Kann das Zielformat nicht schreiben oder passt die Struktur nicht zu einem
    tabellarischen Ziel, wirft die Ziel-Engine KonvertierungUnmoeglich - der
    Fehler wird nach oben gereicht (der Router formt ihn in eine 400 um).
    """
    ziel_engine = engine_fuer(ziel_format)
    if not ziel_engine.faehigkeiten.kann_schreiben:
        raise KonvertierungUnmoeglich(
            f"Das Format '{ziel_format.value}' kann nicht geschrieben werden."
        )

    verluste = _verluste_ermitteln(dok, ziel_format)
    ergebnis = ziel_engine.serialisieren(dok, optionen)
    return KonvertierAntwort(ergebnis=ergebnis, verluste=verluste, ziel_format=ziel_format)
