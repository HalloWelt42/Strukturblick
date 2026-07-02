"""YAML-Engine: Round-Trip-Parsen mit ruamel.yaml, Positionskarte und Anker-Auflösung.

Der geladene ruamel-Baum wird einmal traversiert; dabei entstehen parallel der
normalisierte Wertebaum (Skalare zu JSON-Typen, Datum/Zeitstempel zu ISO-Text)
und die Positionskarte aus den ruamel-Zeileninformationen (.lc.data).

Heuristiken (bewusste Vereinfachungen):
- Endpositionen: ruamel liefert nur Startpositionen. Das Ende einer Wert-Spanne
  ist der Start des nächsten Geschwisters (bei Zeilenwechsel dessen Zeilenanfang),
  rückwärts um Leerraum gekürzt; ohne nächstes Geschwister gilt die Grenze des
  Elternknotens, notfalls das Zeilenende über den ZeilenIndex. Kommentare zwischen
  Geschwistern werden dadurch der davorliegenden Spanne zugeschlagen.
- Schlüssel-Spannen enden nach der Textlänge des Schlüssels; bei zitierten
  Schlüsseln fehlen die Anführungszeichen in der Spanne.
- Alias-Werte (*name) zeigen auf die Quelltext-Stelle des Ankers; liegt diese vor
  dem aktuellen Knoten, fällt die Endposition auf das Zeilenende zurück. Über
  Merge-Schlüssel (<<) eingemischte Einträge erhalten keine eigenen Positionen.
- Kommentar-Erkennung: Quelltext-Heuristik - ein '#' am Zeilenanfang oder nach
  Leerraum zählt als Kommentar, sofern es nicht in einem einfach oder doppelt
  zitierten Abschnitt der Zeile steht.

Serialisierung: Mit vorhandenem nativen Baum wird kommentar- und ankertreu über
ruamel gedumpt (die Einrückungs-Option greift dann nicht, das Original-Layout
bleibt). Beim Neuaufbau aus dem Wertebaum (kein nativ oder sortiere_schluessel)
gehen Kommentare und Anker verloren.
"""

from __future__ import annotations

import datetime
import io
import re
from dataclasses import dataclass, field
from typing import Any, ClassVar

from ruamel.yaml import YAML
from ruamel.yaml.error import YAMLError
from ruamel.yaml.scalarbool import ScalarBoolean

from app.fehler import ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer
from app.kern.positionen import ZeilenIndex
from app.modelle.dokument import (
    ErkennungsErgebnis,
    ParseOptionen,
    SerialisierungsErgebnis,
    SerialisierungsOptionen,
)
from app.modelle.gemeinsam import (
    FormatId,
    JsonWert,
    KnotenSpannen,
    QuellPosition,
    QuellSpanne,
    Verlustaspekt,
)
from app.modelle.system import FormatFaehigkeiten
from app.registry import format_engine

_ENDUNGEN = (".yaml", ".yml")
_PROBEPARSE_MAX_BYTES = 262_144
_ERKENNUNGS_ZEILEN = 30

# Zeile der Form "schluessel: wert" (Schlüssel ohne Kommentar-/Flow-Präfix) ...
_SCHLUESSEL_ZEILE = re.compile(r"^[ \t]*[^\s#{\[][^:\n]*:(?:[ \t]|$)")
# ... oder ein Block-Listeneintrag "- eintrag"
_LISTEN_ZEILE = re.compile(r"^[ \t]*-[ \t]+\S")


@dataclass(frozen=True)
class YamlNativ:
    """ruamel-Baum samt YAML-Instanz - Handle für den kommentartreuen Round-Trip."""

    baum: Any
    yaml: Any


@dataclass
class _Sammler:
    """Trägt beim Traversieren Positionskarte, Warnungen und genutzte Aspekte zusammen."""

    text: str
    index: ZeilenIndex
    positionen: dict[str, KnotenSpannen] = field(default_factory=dict)
    warnungen: list[str] = field(default_factory=list)
    aspekte: set[Verlustaspekt] = field(default_factory=set)
    gemeldete_anker: set[str] = field(default_factory=set)
    pfad_container: set[int] = field(default_factory=set)


def _neue_yaml_instanz() -> Any:
    yaml = YAML(typ="rt")
    yaml.preserve_quotes = True
    yaml.width = 4096  # lange Zeilen beim Dump nicht umbrechen
    return yaml


def _dekodiere(roh: bytes) -> str:
    """Dekodiert UTF-8 (inkl. BOM); nicht lesbare Bytes werden zum ParseFehler."""
    try:
        return roh.decode("utf-8-sig")
    except UnicodeDecodeError as fehler:
        raise ParseFehler(
            "Der Inhalt ist nicht als UTF-8 lesbar - bitte die Zeichenkodierung prüfen."
        ) from fehler


def _dekodiere_still(roh: bytes) -> str | None:
    try:
        return roh.decode("utf-8-sig")
    except UnicodeDecodeError:
        return None


def _enthaelt_kommentar(text: str) -> bool:
    """Heuristik: '#' am Zeilenanfang oder nach Leerraum außerhalb von Zitaten."""
    for zeile in text.splitlines():
        in_einfach = False
        in_doppelt = False
        for stelle, zeichen in enumerate(zeile):
            if zeichen == "'" and not in_doppelt:
                in_einfach = not in_einfach
            elif zeichen == '"' and not in_einfach:
                in_doppelt = not in_doppelt
            elif zeichen == "#" and not in_einfach and not in_doppelt:
                if stelle == 0 or zeile[stelle - 1] in " \t":
                    return True
    return False


def _parse_fehler_aus(fehler: YAMLError) -> ParseFehler:
    """Formt einen ruamel-Fehler (problem_mark ist 0-basiert) in einen ParseFehler um."""
    marke = getattr(fehler, "problem_mark", None) or getattr(fehler, "context_mark", None)
    technisch = str(getattr(fehler, "problem", None) or fehler)
    if marke is None:
        return ParseFehler(
            "Ungültiges YAML: Das Dokument lässt sich nicht einlesen.",
            details={"technisch": technisch},
        )
    zeile = int(marke.line) + 1
    spalte = int(marke.column) + 1
    offset = getattr(marke, "index", None)
    stelle = QuellPosition(
        zeile=zeile, spalte=spalte, offset=offset if isinstance(offset, int) else -1
    )
    return ParseFehler(
        f"Ungültiges YAML: Syntaxfehler in Zeile {zeile}, Spalte {spalte}.",
        position=QuellSpanne(start=stelle, ende=stelle),
        details={"technisch": technisch},
    )


def _lc_daten(knoten: Any) -> dict[Any, Any]:
    """Zeileninfos eines ruamel-Containers; leere Container tragen data=None."""
    daten = getattr(getattr(knoten, "lc", None), "data", None)
    return daten if isinstance(daten, dict) else {}


def _anker_pruefen(knoten: object, sammler: _Sammler) -> None:
    name = getattr(getattr(knoten, "anchor", None), "value", None)
    if isinstance(name, str) and name:
        sammler.aspekte.add(Verlustaspekt.ANKER_REFERENZEN)
        if name not in sammler.gemeldete_anker:
            sammler.gemeldete_anker.add(name)
            sammler.warnungen.append(f"Anker '{name}' wird bei Konvertierungen aufgelöst")


def _schluessel_text(schluessel: object) -> str:
    """Nicht-Zeichenketten-Schlüssel werden für den JSON-Wertebaum zu Text."""
    if isinstance(schluessel, str):
        return schluessel
    if isinstance(schluessel, bool):
        return "true" if schluessel else "false"
    return str(schluessel)


def _skalar_normalisieren(knoten: object, sammler: _Sammler) -> JsonWert:
    """Normalisiert ruamel-Skalare auf reine JSON-Typen (str/int/float/bool/None)."""
    if knoten is None:
        return None
    if isinstance(knoten, bool):
        return bool(knoten)
    if isinstance(knoten, ScalarBoolean):  # int-Unterklasse - vor dem int-Zweig prüfen
        return bool(knoten)
    if isinstance(knoten, int):
        return int(knoten)
    if isinstance(knoten, float):
        return float(knoten)
    if isinstance(knoten, str):
        return str(knoten)
    if isinstance(knoten, datetime.date):  # deckt auch datetime und ruamel-TimeStamp ab
        sammler.aspekte.add(Verlustaspekt.TYPPRAEZISION)
        return knoten.isoformat()
    sammler.aspekte.add(Verlustaspekt.TYPPRAEZISION)
    sammler.warnungen.append(
        f"Wert vom Typ '{type(knoten).__name__}' wurde als Text übernommen"
    )
    return str(knoten)


def _zeilen_ende(offset: int, text: str) -> int:
    """Offset des Zeilenendes (ohne Zeilenumbruch und Leerraum am Zeilenschluss)."""
    ende = text.find("\n", offset)
    ende = len(text) if ende == -1 else ende
    while ende > offset and text[ende - 1] in " \t\r":
        ende -= 1
    return ende


def _obere_grenze(naechster_offset: int, start_offset: int, sammler: _Sammler) -> int:
    """Grenze vor dem nächsten Geschwister: bei Zeilenwechsel dessen Zeilenanfang."""
    stelle = sammler.index.zu_position(naechster_offset)
    zeilen_anfang = naechster_offset - (stelle.spalte - 1)
    return zeilen_anfang if zeilen_anfang > start_offset else naechster_offset


def _ende_offset(start_offset: int, grenze: int, sammler: _Sammler) -> int:
    """Endoffset heuristisch: Grenze rückwärts um Leerraum kürzen, sonst Zeilenende."""
    if grenze > start_offset:
        ende = grenze
        while ende > start_offset and sammler.text[ende - 1] in " \t\r\n":
            ende -= 1
        if ende > start_offset:
            return ende
    return _zeilen_ende(start_offset, sammler.text)


def _spanne_aus_offsets(start: int, ende: int, index: ZeilenIndex) -> QuellSpanne:
    return QuellSpanne(start=index.zu_position(start), ende=index.zu_position(max(ende, start)))


def _wert_normalisieren(
    knoten: object, pointer: str, grenze: int | None, sammler: _Sammler
) -> JsonWert:
    """Traversiert den ruamel-Baum; grenze=None unterdrückt Positionsaufzeichnung."""
    _anker_pruefen(knoten, sammler)
    if isinstance(knoten, dict):
        return _map_normalisieren(knoten, pointer, grenze, sammler)
    if isinstance(knoten, list):
        return _liste_normalisieren(knoten, pointer, grenze, sammler)
    return _skalar_normalisieren(knoten, sammler)


def _geschwister_grenzen(lc_daten: dict[Any, Any], sammler: _Sammler) -> dict[Any, int]:
    """Je Kind der Startoffset des nächsten Geschwisters (Quelltext-Reihenfolge)."""
    reihenfolge = sorted(lc_daten, key=lambda kind: (lc_daten[kind][0], lc_daten[kind][1]))
    grenzen: dict[Any, int] = {}
    for aktuelles, naechstes in zip(reihenfolge, reihenfolge[1:], strict=False):
        daten = lc_daten[naechstes]
        grenzen[aktuelles] = sammler.index.zu_offset(daten[0] + 1, daten[1] + 1)
    return grenzen


def _map_normalisieren(
    knoten: dict[Any, Any], pointer: str, grenze: int | None, sammler: _Sammler
) -> JsonWert:
    kennung = id(knoten)
    if kennung in sammler.pfad_container:
        sammler.warnungen.append("Zirkulärer Alias entdeckt - der Knoten wird zu null")
        return None
    sammler.pfad_container.add(kennung)
    try:
        lc_daten = _lc_daten(knoten)
        grenzen = _geschwister_grenzen(lc_daten, sammler)
        ergebnis: dict[str, JsonWert] = {}
        for schluessel, wert in knoten.items():
            name = _schluessel_text(schluessel)
            zeiger = kind_pointer(pointer, name)
            daten = lc_daten.get(schluessel)
            kind_grenze: int | None = None
            if grenze is not None and daten is not None and len(daten) >= 4:
                kind_grenze = _kind_position_aufzeichnen(
                    zeiger, name, daten, grenzen.get(schluessel, grenze), sammler
                )
            ergebnis[name] = _wert_normalisieren(wert, zeiger, kind_grenze, sammler)
        return ergebnis
    finally:
        sammler.pfad_container.discard(kennung)


def _kind_position_aufzeichnen(
    zeiger: str, name: str, daten: list[int], geschwister_grenze: int, sammler: _Sammler
) -> int:
    """Trägt Schlüssel- und Wert-Spanne eines Map-Eintrags ein; liefert das Wert-Ende."""
    schluessel_start = sammler.index.zu_offset(daten[0] + 1, daten[1] + 1)
    schluessel_spanne = _spanne_aus_offsets(
        schluessel_start, schluessel_start + len(name), sammler.index
    )
    wert_start = sammler.index.zu_offset(daten[2] + 1, daten[3] + 1)
    grenze_roh = _obere_grenze(geschwister_grenze, wert_start, sammler)
    wert_ende = _ende_offset(wert_start, grenze_roh, sammler)
    sammler.positionen[zeiger] = KnotenSpannen(
        schluessel=schluessel_spanne,
        wert=_spanne_aus_offsets(wert_start, wert_ende, sammler.index),
    )
    return wert_ende


def _liste_normalisieren(
    knoten: list[Any], pointer: str, grenze: int | None, sammler: _Sammler
) -> JsonWert:
    kennung = id(knoten)
    if kennung in sammler.pfad_container:
        sammler.warnungen.append("Zirkulärer Alias entdeckt - der Knoten wird zu null")
        return None
    sammler.pfad_container.add(kennung)
    try:
        lc_daten = _lc_daten(knoten)
        grenzen = _geschwister_grenzen(lc_daten, sammler)
        ergebnis: list[JsonWert] = []
        for nummer, wert in enumerate(knoten):
            zeiger = kind_pointer(pointer, nummer)
            daten = lc_daten.get(nummer)
            kind_grenze: int | None = None
            if grenze is not None and daten is not None and len(daten) >= 2:
                wert_start = sammler.index.zu_offset(daten[0] + 1, daten[1] + 1)
                grenze_roh = _obere_grenze(grenzen.get(nummer, grenze), wert_start, sammler)
                kind_grenze = _ende_offset(wert_start, grenze_roh, sammler)
                sammler.positionen[zeiger] = KnotenSpannen(
                    wert=_spanne_aus_offsets(wert_start, kind_grenze, sammler.index)
                )
            ergebnis.append(_wert_normalisieren(wert, zeiger, kind_grenze, sammler))
        return ergebnis
    finally:
        sammler.pfad_container.discard(kennung)


def _schluessel_sortieren(wert: JsonWert) -> JsonWert:
    if isinstance(wert, dict):
        return {name: _schluessel_sortieren(wert[name]) for name in sorted(wert)}
    if isinstance(wert, list):
        return [_schluessel_sortieren(eintrag) for eintrag in wert]
    return wert


def _dump(yaml: Any, wurzel: object) -> str:
    puffer = io.StringIO()
    yaml.dump(wurzel, puffer)
    text = puffer.getvalue()
    return text if text.endswith("\n") else text + "\n"


@format_engine
class YamlEngine:
    """Format-Engine für YAML mit Round-Trip über ruamel.yaml."""

    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.YAML,
        name="YAML",
        dateiendungen=_ENDUNGEN,
        mime_typen=("application/yaml",),
        kann_lesen=True,
        kann_schreiben=True,
        ist_tabellarisch=False,
        positionsgenauigkeit="zeile_spalte",
        traegt=frozenset(
            {
                Verlustaspekt.KOMMENTARE,
                Verlustaspekt.ANKER_REFERENZEN,
                Verlustaspekt.VERSCHACHTELUNG,
                Verlustaspekt.SCHLUESSELREIHENFOLGE,
                Verlustaspekt.TYPPRAEZISION,
            }
        ),
    )

    def erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        try:
            return self._erkennen(roh, dateiname)
        except Exception:
            return None

    def _erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        if dateiname is not None:
            endung = next((e for e in _ENDUNGEN if dateiname.lower().endswith(e)), None)
            if endung is not None:
                return ErkennungsErgebnis(
                    format_id=FormatId.YAML,
                    konfidenz=0.85,
                    hinweise=[f"Dateiendung {endung}"],
                )
        text = _dekodiere_still(roh)
        if text is None:
            return None
        kern = text.lstrip()
        # JSON ist auch gültiges YAML, XML sicher keins - dort gewinnen die anderen Engines
        if not kern or kern[0] in "{[<":
            return None
        erste_zeilen = text.splitlines()[:_ERKENNUNGS_ZEILEN]
        if not any(
            _SCHLUESSEL_ZEILE.match(zeile) or _LISTEN_ZEILE.match(zeile)
            for zeile in erste_zeilen
        ):
            return None
        if len(roh) > _PROBEPARSE_MAX_BYTES:
            return ErkennungsErgebnis(
                format_id=FormatId.YAML,
                konfidenz=0.6,
                hinweise=["YAML-typische Zeilen (Inhalt zu groß für einen Probeparse)"],
            )
        try:
            ergebnis = YAML(typ="safe").load(text)
        except Exception:
            return None
        if not isinstance(ergebnis, (dict, list)):
            return None
        return ErkennungsErgebnis(
            format_id=FormatId.YAML,
            konfidenz=0.6,
            hinweise=["YAML-typische Zeilen, Probeparse erfolgreich"],
        )

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        text = _dekodiere(roh)
        yaml = _neue_yaml_instanz()
        try:
            baum = yaml.load(text)
        except YAMLError as fehler:
            raise _parse_fehler_aus(fehler) from fehler

        sammler = _Sammler(text=text, index=ZeilenIndex(text))
        ende_gesamt = len(text)
        while ende_gesamt > 0 and text[ende_gesamt - 1] in " \t\r\n":
            ende_gesamt -= 1
        wurzel = _wert_normalisieren(baum, "", ende_gesamt, sammler)
        sammler.positionen[""] = KnotenSpannen(
            wert=_spanne_aus_offsets(0, ende_gesamt, sammler.index)
        )
        if _enthaelt_kommentar(text):
            sammler.aspekte.add(Verlustaspekt.KOMMENTARE)

        return GeparstesDokument(
            format_id=FormatId.YAML,
            wurzel=wurzel,
            positionen=sammler.positionen,
            genutzte_aspekte=frozenset(sammler.aspekte),
            nativ=YamlNativ(baum=baum, yaml=yaml),
            warnungen=sammler.warnungen,
        )

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        nativ = dok.nativ if isinstance(dok.nativ, YamlNativ) else None
        if nativ is not None and not optionen.sortiere_schluessel:
            return SerialisierungsErgebnis(inhalt_text=_dump(nativ.yaml, nativ.baum))

        yaml = _neue_yaml_instanz()
        einrueckung = max(optionen.einrueckung, 1)  # Einrückung 0 ist in YAML nicht darstellbar
        yaml.indent(mapping=einrueckung, sequence=einrueckung + 2, offset=einrueckung)
        wurzel = (
            _schluessel_sortieren(dok.wurzel) if optionen.sortiere_schluessel else dok.wurzel
        )
        warnungen: list[str] = []
        if nativ is not None:
            warnungen.append(
                "Neuaufbau wegen Schlüsselsortierung - Kommentare und Anker gehen verloren"
            )
        return SerialisierungsErgebnis(inhalt_text=_dump(yaml, wurzel), warnungen=warnungen)
