"""Reparatur defekter, JSON-artiger Dokumente über json_repair.

Sinnvoll nur für JSON und NDJSON - andere Formate liefern reparierbar=False mit
einem Hinweis. Der Rohtext wird durch json_repair geschickt und - falls das
Ergebnis parsebar ist - zusätzlich schön formatiert. Damit reines Umformatieren
eines bereits gültigen Dokuments nicht als Änderung zählt, wird auch das
Original vor dem Vergleich schön formatiert.
"""

from __future__ import annotations

import difflib
import json

import json_repair

from app.modelle.gemeinsam import FormatId
from app.modelle.transform import ReparaturAntwort

_REPARIERBARE_FORMATE = frozenset({FormatId.JSON, FormatId.NDJSON})


def _schoen_formatieren(text: str) -> str | None:
    """Formatiert gültiges JSON einheitlich; None, wenn der Text kein gültiges JSON ist."""
    try:
        wert = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None
    return json.dumps(wert, indent=2, ensure_ascii=False) + "\n"


def _ist_gueltiges_json(text: str) -> bool:
    try:
        json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return False
    return True


def _unified_diff(original: str, repariert: str) -> str:
    zeilen = difflib.unified_diff(
        original.splitlines(keepends=True),
        repariert.splitlines(keepends=True),
        fromfile="original",
        tofile="repariert",
    )
    return "".join(zeilen)


def _aenderungs_uebersicht(original: str, repariert: str) -> list[str]:
    """Kurze, heuristische Übersicht: gezählte geänderte Zeilen als eine Meldung."""
    geaendert = sum(
        1
        for zeile in difflib.ndiff(original.splitlines(), repariert.splitlines())
        if zeile.startswith(("+ ", "- "))
    )
    if geaendert == 0:
        return []
    return [f"{geaendert} Zeilen geändert"]


def repariere(format_id: FormatId, roh_text: str) -> ReparaturAntwort:
    """Repariert JSON-artige Dokumente; für andere Formate ein klarer Hinweis.

    Bekommt nur das erkannte Format und den Rohtext - kein geparstes Dokument,
    denn defekte Eingaben lassen sich per Definition nicht erfolgreich parsen.
    """
    if format_id not in _REPARIERBARE_FORMATE:
        return ReparaturAntwort(
            reparierbar=False,
            veraendert=False,
            ergebnis_text=roh_text,
            diff_unified="",
            aenderungen=[
                f"Format '{format_id.value}' lässt sich nicht wie JSON reparieren - "
                "die Reparatur ist nur für JSON und NDJSON verfügbar."
            ],
        )

    repariert_roh: str = json_repair.repair_json(roh_text, return_objects=False)
    ergebnis_text = _schoen_formatieren(repariert_roh) or repariert_roh
    vergleichs_original = _schoen_formatieren(roh_text) or roh_text

    veraendert = ergebnis_text.strip() != vergleichs_original.strip()
    diff_unified = _unified_diff(vergleichs_original, ergebnis_text) if veraendert else ""
    aenderungen = _aenderungs_uebersicht(vergleichs_original, ergebnis_text) if veraendert else []

    return ReparaturAntwort(
        reparierbar=_ist_gueltiges_json(ergebnis_text),
        veraendert=veraendert,
        ergebnis_text=ergebnis_text,
        diff_unified=diff_unified,
        aenderungen=aenderungen,
    )
