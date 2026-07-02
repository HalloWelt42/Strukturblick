"""Feld-Profil: vollständige Liste ALLER Pfad-Muster eines Dokuments mit Kennzahlen.

Ein einziger rekursiver Durchlauf über den Wertebaum aggregiert je Pfad-Muster
(Listenindizes als *, wie in muster.py): wie oft der Pfad vorkommt, welche Typen
seine Werte haben, der Anteil null/fehlend, die Anzahl verschiedener Werte sowie -
sofern zutreffend - Längen von Textwerten, Spannweiten von Zahlen und die Zahl
direkter Unterelemente bei Containern.

Zur Bedeutung von "verschiedene": Für Pfade, an denen Skalare (Text, Zahl,
Wahrheitswert) vorkommen, ist es die Anzahl verschiedener Skalarwerte (per set,
zum Speicherschutz bei _MAX_DISTINCT gekappt). Für reine Container-Pfade (nur
dict/list) ist es die Anzahl verschiedener Kinderzahlen - ein Skalar-distinct
wäre dort nicht sinnvoll. Enthält ein Pfad nur null-Werte, ist es 0.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import ClassVar

from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer
from app.modelle.analyse import FeldProfil, FeldTypAnteil, ProfilAntwort
from app.modelle.gemeinsam import JsonWert
from app.registry import analyzer

_MAX_BEISPIELE = 5
# Zum Speicherschutz gekappte Menge verschiedener Werte je Pfad. Reicht weit über
# jede sinnvolle Kardinalität hinaus; darüber ist die genaue Zahl ohnehin belanglos.
_MAX_DISTINCT = 10000
# Reihenfolge der Typen in der Ausgabe (stabil, unabhängig vom Auftreten).
_TYP_REIHENFOLGE = ("objekt", "liste", "text", "zahl", "wahrheitswert", "null")


def _typ_name(wert: JsonWert) -> str:
    if wert is None:
        return "null"
    if isinstance(wert, bool):
        return "wahrheitswert"
    if isinstance(wert, int | float):
        return "zahl"
    if isinstance(wert, str):
        return "text"
    if isinstance(wert, list):
        return "liste"
    return "objekt"


def _kurzdarstellung(wert: JsonWert) -> str:
    """Kompakte Darstellung eines Werts für die Beispielliste."""
    if isinstance(wert, dict):
        anzahl = len(wert)
        return f"{{{anzahl} Schlüssel}}" if anzahl != 1 else "{1 Schlüssel}"
    if isinstance(wert, list):
        anzahl = len(wert)
        return f"[{anzahl} Einträge]" if anzahl != 1 else "[1 Eintrag]"
    if wert is None:
        return "null"
    if isinstance(wert, bool):
        return "true" if wert else "false"
    return str(wert)


@dataclass
class _FeldSammler:
    """Inkrementelle Kennzahlen aller Werte an genau einem Pfad-Muster."""

    vorkommen: int = 0
    null_anzahl: int = 0
    typen: dict[str, int] = field(default_factory=dict)
    # Verschiedene Skalarwerte (Text/Zahl/Wahrheitswert), gekappt bei _MAX_DISTINCT.
    skalar_distinct: set[str] = field(default_factory=set)
    skalar_distinct_gekappt: bool = False
    # Verschiedene Kinderzahlen reiner Container - Grundlage für "verschiedene",
    # wenn an diesem Pfad keine Skalare vorkommen.
    kinderzahl_distinct: set[int] = field(default_factory=set)
    text_min_laenge: int | None = None
    text_max_laenge: int | None = None
    zahl_minimum: float | None = None
    zahl_maximum: float | None = None
    kind_min: int | None = None
    kind_max: int | None = None
    beispiele: list[str] = field(default_factory=list)
    beispiele_gesehen: set[str] = field(default_factory=set)

    def erfasse(self, wert: JsonWert) -> None:
        self.vorkommen += 1
        typ = _typ_name(wert)
        self.typen[typ] = self.typen.get(typ, 0) + 1
        self._erfasse_beispiel(wert)
        if wert is None:
            self.null_anzahl += 1
            return
        if isinstance(wert, dict | list):
            self._erfasse_container(len(wert))
            return
        if isinstance(wert, bool):
            self._erfasse_skalar("true" if wert else "false")
            return
        if isinstance(wert, int | float):
            zahl = float(wert)
            self.zahl_minimum = zahl if self.zahl_minimum is None else min(self.zahl_minimum, zahl)
            self.zahl_maximum = zahl if self.zahl_maximum is None else max(self.zahl_maximum, zahl)
            self._erfasse_skalar(str(wert))
            return
        # ab hier: Textwert
        laenge = len(wert)
        self.text_min_laenge = (
            laenge if self.text_min_laenge is None else min(self.text_min_laenge, laenge)
        )
        self.text_max_laenge = (
            laenge if self.text_max_laenge is None else max(self.text_max_laenge, laenge)
        )
        self._erfasse_skalar(wert)

    def _erfasse_beispiel(self, wert: JsonWert) -> None:
        if len(self.beispiele) >= _MAX_BEISPIELE:
            return
        kurz = _kurzdarstellung(wert)
        if kurz in self.beispiele_gesehen:
            return
        self.beispiele_gesehen.add(kurz)
        self.beispiele.append(kurz)

    def _erfasse_container(self, kinderzahl: int) -> None:
        self.kind_min = kinderzahl if self.kind_min is None else min(self.kind_min, kinderzahl)
        self.kind_max = kinderzahl if self.kind_max is None else max(self.kind_max, kinderzahl)
        if len(self.kinderzahl_distinct) < _MAX_DISTINCT:
            self.kinderzahl_distinct.add(kinderzahl)

    def _erfasse_skalar(self, darstellung: str) -> None:
        if len(self.skalar_distinct) < _MAX_DISTINCT:
            self.skalar_distinct.add(darstellung)
        else:
            self.skalar_distinct_gekappt = True

    @property
    def hat_skalare(self) -> bool:
        return bool(self.skalar_distinct) or self.skalar_distinct_gekappt

    @property
    def verschiedene(self) -> int:
        """Verschiedene Skalarwerte, sonst verschiedene Kinderzahlen, sonst 0."""
        if self.hat_skalare:
            return len(self.skalar_distinct)
        return len(self.kinderzahl_distinct)


def _typ_anteile(typen: dict[str, int]) -> list[FeldTypAnteil]:
    return [
        FeldTypAnteil(typ=typ, anzahl=typen[typ]) for typ in _TYP_REIHENFOLGE if typ in typen
    ]


def _zu_profil(pfad_muster: str, sammler: _FeldSammler) -> FeldProfil:
    null_anteil = sammler.null_anzahl / sammler.vorkommen if sammler.vorkommen else 0.0
    return FeldProfil(
        pfad_muster=pfad_muster,
        vorkommen=sammler.vorkommen,
        typen=_typ_anteile(sammler.typen),
        null_anteil=round(null_anteil, 4),
        verschiedene=sammler.verschiedene,
        text_min_laenge=sammler.text_min_laenge,
        text_max_laenge=sammler.text_max_laenge,
        zahl_minimum=sammler.zahl_minimum,
        zahl_maximum=sammler.zahl_maximum,
        kind_min=sammler.kind_min,
        kind_max=sammler.kind_max,
        beispielwerte=sammler.beispiele,
    )


def _besuche(wert: JsonWert, pfad_muster: str, sammlung: dict[str, _FeldSammler]) -> None:
    """Erfasst den Wert an seinem Pfad-Muster und steigt in Container hinab."""
    sammlung.setdefault(pfad_muster, _FeldSammler()).erfasse(wert)
    if isinstance(wert, dict):
        for schluessel, kind in wert.items():
            _besuche(kind, kind_pointer(pfad_muster, schluessel), sammlung)
    elif isinstance(wert, list):
        for kind in wert:
            _besuche(kind, f"{pfad_muster}/*", sammlung)


def erzeuge_profil(dok: GeparstesDokument) -> ProfilAntwort:
    """Erstellt das vollständige Feld-Profil in einem rekursiven Durchlauf.

    Sortiert die Felder stabil nach Pfad-Muster; die Wurzel ("") steht zuerst.
    """
    sammlung: dict[str, _FeldSammler] = {}
    _besuche(dok.wurzel, "", sammlung)
    felder = [
        _zu_profil(pfad_muster, sammlung[pfad_muster]) for pfad_muster in sorted(sammlung)
    ]
    return ProfilAntwort(felder=felder, anzahl_felder=len(felder))


@analyzer
class ProfilAnalyzer:
    """Registrierung für Discovery und Capabilities."""

    analyzer_id: ClassVar[str] = "profil"
    name: ClassVar[str] = "Feld-Profil"

    def unterstuetzt(self, dok: GeparstesDokument) -> bool:
        return True
