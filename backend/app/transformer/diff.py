"""Struktureller Diff zweier Dokumente über deepdiff.

Verglichen werden die normalisierten Wertebäume (dok.wurzel) beider Seiten.
Je Unterschied entsteht ein DiffEintrag mit JSON-Pointer (aus den
deepdiff-Pfadsegmenten), Art, den alten/neuen Werten und - soweit die
jeweilige Seite eine Position für den Pointer kennt - den Quelltext-Spannen.
"""

from __future__ import annotations

from deepdiff import DeepDiff
from deepdiff.helper import notpresent

from app.kern.dokument import GeparstesDokument
from app.kern.pfade import pointer_aus_segmenten
from app.modelle.gemeinsam import JsonWert, QuellSpanne
from app.modelle.transform import DiffAntwort, DiffArt, DiffEintrag

# Abbildung deepdiff-Änderungstyp -> unsere DiffArt.
_ART_JE_TYP: dict[str, DiffArt] = {
    "values_changed": "geaendert",
    "type_changes": "typ_geaendert",
    "dictionary_item_added": "hinzugefuegt",
    "iterable_item_added": "hinzugefuegt",
    "dictionary_item_removed": "entfernt",
    "iterable_item_removed": "entfernt",
}


def _wert_oder_none(roh: object) -> JsonWert | None:
    """deepdiff nutzt bei nicht vorhandenen Seiten einen Sentinel - der wird zu None."""
    if roh is notpresent:
        return None
    return roh  # type: ignore[return-value]  # deepdiff-Werte sind hier bereits normalisierte JsonWert


def _position(dok: GeparstesDokument, pfad: str) -> QuellSpanne | None:
    spannen = dok.positionen.get(pfad)
    return spannen.wert if spannen is not None else None


def berechne_diff(
    dok_links: GeparstesDokument, dok_rechts: GeparstesDokument, ignoriere_reihenfolge: bool
) -> DiffAntwort:
    """Vergleicht beide Wertebäume strukturell und sortiert die Funde nach Pfad."""
    unterschiede = DeepDiff(
        dok_links.wurzel,
        dok_rechts.wurzel,
        view="tree",
        ignore_order=ignoriere_reihenfolge,
    )

    eintraege: list[DiffEintrag] = []
    for aenderungstyp, menge in unterschiede.items():
        art = _ART_JE_TYP.get(aenderungstyp)
        if art is None:
            continue  # unbekannter Änderungstyp - defensiv überspringen
        for change in menge:
            pfad = pointer_aus_segmenten(change.path(output_format="list"))
            eintraege.append(
                DiffEintrag(
                    art=art,
                    pfad=pfad,
                    position_links=_position(dok_links, pfad),
                    position_rechts=_position(dok_rechts, pfad),
                    wert_links=_wert_oder_none(getattr(change, "t1", None)),
                    wert_rechts=_wert_oder_none(getattr(change, "t2", None)),
                )
            )

    eintraege.sort(key=lambda eintrag: eintrag.pfad)
    return DiffAntwort(eintraege=eintraege, anzahl=len(eintraege))
