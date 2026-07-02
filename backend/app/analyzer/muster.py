"""Mustererkennung: findet Wertemuster (UUID, E-Mail, URL, Datum, ...) je Pfad-Muster.

Textwerte werden je Pfad-Muster gesammelt (Listenindizes als *) und gegen
konservative Prüfungen gehalten. Gemeldet wird nur ab 90 Prozent Abdeckung und
mindestens zwei Werten, um Fehlalarme zu vermeiden. Zusätzlich werden Felder mit
wenigen verschiedenen Werten als Aufzählungs-Kandidaten (enum_kandidat) gemeldet.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from datetime import date, datetime
from typing import ClassVar

from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer
from app.modelle.analyse import MusterAntwort, MusterArt, MusterFund
from app.modelle.gemeinsam import JsonWert
from app.registry import analyzer

_MINDEST_ABDECKUNG = 0.9
_MINDEST_WERTE = 2
# Ein Aufzaehlungs-Kandidat verlangt WIEDERHOLUNG: eine kleine Menge verschiedener
# Werte, die sich ueber genuegend Vorkommen wiederholen. Ohne die Wiederholungs-
# Bedingung wuerden z. B. sechs unterschiedliche Artikelnamen faelschlich als
# Aufzaehlung gemeldet (jeder Wert genau einmal - keine Aufzaehlung).
_ENUM_MINDEST_WERTE = 8
_ENUM_MIN_VERSCHIEDEN = 2
_ENUM_MAX_VERSCHIEDEN = 12
_ENUM_MAX_ANTEIL_VERSCHIEDEN = 0.5
_BASE64_MINDEST_LAENGE = 16

_UUID_MUSTER = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_EMAIL_MUSTER = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s.]+$")
_URL_MUSTER = re.compile(r"^https?://[^\s/]+\S*$")
_ISO_DATUM_MUSTER = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ISO_ZEITSTEMPEL_MUSTER = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$"
)
_BASE64_ALPHABET_MUSTER = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")


def ist_iso_datum(text: str) -> bool:
    """YYYY-MM-DD mit Plausibilitätsprüfung über date.fromisoformat."""
    if _ISO_DATUM_MUSTER.match(text) is None:
        return False
    try:
        date.fromisoformat(text)
    except ValueError:
        return False
    return True


def _ist_iso_zeitstempel(text: str) -> bool:
    if _ISO_ZEITSTEMPEL_MUSTER.match(text) is None:
        return False
    try:
        datetime.fromisoformat(text)
    except ValueError:
        return False
    return True


def _ist_base64(text: str) -> bool:
    """Konservativ: Alphabet, Länge und zusätzlich Sonderzeichen oder Groß-klein-Mix."""
    if len(text) < _BASE64_MINDEST_LAENGE or len(text) % 4 != 0:
        return False
    if _BASE64_ALPHABET_MUSTER.match(text) is None:
        return False
    hat_sonderzeichen = any(zeichen in "+/=" for zeichen in text)
    hat_klein = any(zeichen.islower() for zeichen in text)
    hat_gross = any(zeichen.isupper() for zeichen in text)
    return hat_sonderzeichen or (hat_klein and hat_gross)


_PRUEFUNGEN: tuple[tuple[MusterArt, Callable[[str], bool]], ...] = (
    ("uuid", lambda text: _UUID_MUSTER.match(text) is not None),
    ("email", lambda text: _EMAIL_MUSTER.match(text) is not None),
    ("url", lambda text: _URL_MUSTER.match(text) is not None),
    ("iso_datum", ist_iso_datum),
    ("iso_zeitstempel", _ist_iso_zeitstempel),
    ("base64", _ist_base64),
)


def _sammle_textwerte(wert: JsonWert, pfad_muster: str, sammlung: dict[str, list[str]]) -> None:
    """Sammelt alle Textwerte je Pfad-Muster (Listenindizes als *), in Dokumentreihenfolge."""
    if isinstance(wert, dict):
        for schluessel, kind in wert.items():
            _sammle_textwerte(kind, kind_pointer(pfad_muster, schluessel), sammlung)
    elif isinstance(wert, list):
        for kind in wert:
            _sammle_textwerte(kind, f"{pfad_muster}/*", sammlung)
    elif isinstance(wert, str):
        sammlung.setdefault(pfad_muster, []).append(wert)


def _format_funde(pfad_muster: str, werte: list[str], max_beispiele: int) -> list[MusterFund]:
    funde: list[MusterFund] = []
    for art, pruefung in _PRUEFUNGEN:
        treffer = [wert for wert in werte if pruefung(wert)]
        abdeckung = len(treffer) / len(werte)
        if abdeckung >= _MINDEST_ABDECKUNG:
            funde.append(
                MusterFund(
                    pfad_muster=pfad_muster,
                    muster=art,
                    abdeckung=round(abdeckung, 3),
                    anzahl_werte=len(werte),
                    beispiele=treffer[:max_beispiele],
                )
            )
    return funde


def _enum_fund(pfad_muster: str, werte: list[str], max_beispiele: int) -> MusterFund | None:
    if len(werte) < _ENUM_MINDEST_WERTE:
        return None
    verschiedene = sorted(set(werte))
    if not _ENUM_MIN_VERSCHIEDEN <= len(verschiedene) <= _ENUM_MAX_VERSCHIEDEN:
        return None
    # Entscheidend: die verschiedenen Werte muessen sich wiederholen. Sind fast
    # alle Werte einzigartig, ist es keine Aufzaehlung, sondern ein freies Feld.
    if len(verschiedene) > len(werte) * _ENUM_MAX_ANTEIL_VERSCHIEDEN:
        return None
    # Abdeckung = mittlere Haeufigkeit je verschiedenem Wert, normiert auf 0..1
    # (viele Wiederholungen -> nahe 1). Nur informativ fuer die Anzeige.
    abdeckung = round(1.0 - len(verschiedene) / len(werte), 3)
    return MusterFund(
        pfad_muster=pfad_muster,
        muster="enum_kandidat",
        abdeckung=abdeckung,
        anzahl_werte=len(werte),
        beispiele=werte[:max_beispiele],
        enum_werte=verschiedene,
    )


def erkenne_muster(dok: GeparstesDokument, max_beispiele: int) -> MusterAntwort:
    """Prüft alle Textwert-Sammlungen des Dokuments gegen die bekannten Muster."""
    sammlung: dict[str, list[str]] = {}
    _sammle_textwerte(dok.wurzel, "", sammlung)
    funde: list[MusterFund] = []
    for pfad_muster, werte in sammlung.items():
        if len(werte) < _MINDEST_WERTE:
            continue
        funde.extend(_format_funde(pfad_muster, werte, max_beispiele))
        aufzaehlung = _enum_fund(pfad_muster, werte, max_beispiele)
        if aufzaehlung is not None:
            funde.append(aufzaehlung)
    return MusterAntwort(funde=funde)


@analyzer
class MusterAnalyzer:
    """Registrierung für Discovery und Capabilities."""

    analyzer_id: ClassVar[str] = "muster"
    name: ClassVar[str] = "Mustererkennung"

    def unterstuetzt(self, dok: GeparstesDokument) -> bool:
        return True
