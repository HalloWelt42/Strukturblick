"""Dokument-Auszug für die KI: Struktur statt Volldokument.

Ein Sprachmodell braucht die Form der Daten, nicht jeden Wert. baue_auszug
liefert deshalb zwei kompakte Texte:

- skelett_text: eine rekursive Strukturbeschreibung mit TYPEN statt Werten.
  Listen werden auf die Vereinigung ihrer Element-Struktur reduziert und mit
  "xN Einträge" annotiert. Tiefe und Schlüsselzahl je Objekt sind gekappt.
- stichprobe_text: je Blattpfad-Muster bis zu drei Beispielwerte (Strings
  gestutzt), damit die KI ein Gefühl für die tatsächlichen Werte bekommt.

Die Gesamtzeichenzahl wird auf KI_SKELETT_ZEICHEN begrenzt: erst werden die
Stichprobenwerte gekürzt, dann die Skeletttiefe reduziert.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app import config
from app.kern.pfade import kind_pointer
from app.modelle.gemeinsam import JsonWert

_MAX_TIEFE = 8
_MAX_SCHLUESSEL = 50
_MAX_STICHPROBEN = 3
_STRING_STUTZEN = 120


@dataclass
class DokumentAuszug:
    """Zwei Texte für den KI-Prompt: die Struktur und beispielhafte Werte."""

    skelett_text: str
    stichprobe_text: str


def _typ_name(wert: JsonWert) -> str:
    if wert is None:
        return "null"
    if isinstance(wert, bool):
        return "wahrheitswert"
    if isinstance(wert, int):
        return "ganzzahl"
    if isinstance(wert, float):
        return "kommazahl"
    if isinstance(wert, str):
        return "text"
    if isinstance(wert, list):
        return "liste"
    return "objekt"


def _stutzen(text: str) -> str:
    if len(text) <= _STRING_STUTZEN:
        return text
    return text[:_STRING_STUTZEN] + "…"


def _wert_kurz(wert: JsonWert) -> str:
    """Kompakte, einzeilige Darstellung eines Blattwerts für die Stichprobe."""
    if isinstance(wert, str):
        return _stutzen(wert)
    if isinstance(wert, bool):
        return "true" if wert else "false"
    if wert is None:
        return "null"
    return str(wert)


@dataclass
class _StichprobenSammler:
    """Sammelt je Blattpfad-Muster bis zu _MAX_STICHPROBEN Beispielwerte."""

    beispiele: dict[str, list[str]] = field(default_factory=dict)

    def merke(self, pfad_muster: str, wert: JsonWert) -> None:
        werte = self.beispiele.setdefault(pfad_muster, [])
        if len(werte) < _MAX_STICHPROBEN:
            text = _wert_kurz(wert)
            if text not in werte:
                werte.append(text)


def _vereinige_liste(elemente: list[JsonWert]) -> JsonWert:
    """Reduziert eine Liste auf ein einzelnes, repräsentatives Element.

    Bei Objekt-Listen wird die Vereinigung aller Schlüssel gebildet (erster
    beobachteter Wert je Schlüssel gewinnt), sonst das erste Element gewählt.
    """
    objekte = [e for e in elemente if isinstance(e, dict)]
    if objekte:
        vereint: dict[str, JsonWert] = {}
        for objekt in objekte:
            for schluessel, kind in objekt.items():
                vereint.setdefault(schluessel, kind)
        return vereint
    return elemente[0]


def _besuche_stichprobe(wert: JsonWert, pfad_muster: str, sammler: _StichprobenSammler) -> None:
    """Durchläuft den ganzen Baum und sammelt Blattwerte je Pfad-Muster."""
    if isinstance(wert, dict):
        for schluessel, kind in wert.items():
            _besuche_stichprobe(kind, kind_pointer(pfad_muster, schluessel), sammler)
    elif isinstance(wert, list):
        for kind in wert:
            _besuche_stichprobe(kind, f"{pfad_muster}/*", sammler)
    else:
        sammler.merke(pfad_muster, wert)


def _skelett_zeilen(wert: JsonWert, tiefe: int, max_tiefe: int, einzug: int) -> list[str]:
    """Baut die Skelett-Zeilen rekursiv; kappt Tiefe und Schlüsselzahl."""
    praefix = "  " * einzug
    if isinstance(wert, dict):
        if tiefe >= max_tiefe:
            return [f"{praefix}objekt {{ … {len(wert)} Schlüssel (Tiefe gekappt) }}"]
        zeilen = [f"{praefix}objekt {{"]
        schluessel = list(wert.items())
        for name, kind in schluessel[:_MAX_SCHLUESSEL]:
            kind_zeilen = _skelett_zeilen(kind, tiefe + 1, max_tiefe, einzug + 1)
            erste = kind_zeilen[0].lstrip()
            zeilen.append(f"{'  ' * (einzug + 1)}{name}: {erste}")
            zeilen.extend(kind_zeilen[1:])
        rest = len(schluessel) - _MAX_SCHLUESSEL
        if rest > 0:
            zeilen.append(f"{'  ' * (einzug + 1)}... {rest} weitere")
        zeilen.append(f"{praefix}}}")
        return zeilen
    if isinstance(wert, list):
        anzahl = len(wert)
        if anzahl == 0:
            return [f"{praefix}liste [ leer ]"]
        if tiefe >= max_tiefe:
            return [f"{praefix}liste [ x{anzahl} Einträge (Tiefe gekappt) ]"]
        muster = _vereinige_liste(list(wert))
        kind_zeilen = _skelett_zeilen(muster, tiefe + 1, max_tiefe, einzug + 1)
        erste = kind_zeilen[0].lstrip()
        zeilen = [f"{praefix}liste [ x{anzahl} Einträge, je: {erste}"]
        zeilen.extend(kind_zeilen[1:])
        zeilen.append(f"{praefix}]")
        return zeilen
    return [f"{praefix}{_typ_name(wert)}"]


def _skelett_text(wurzel: JsonWert, max_tiefe: int) -> str:
    return "\n".join(_skelett_zeilen(wurzel, 0, max_tiefe, 0))


def _stichprobe_text(sammler: _StichprobenSammler) -> str:
    if not sammler.beispiele:
        return "(keine Blattwerte)"
    zeilen = [
        f"{pfad_muster or '/'}: {', '.join(werte)}"
        for pfad_muster, werte in sorted(sammler.beispiele.items())
    ]
    return "\n".join(zeilen)


def baue_auszug(wurzel: JsonWert) -> DokumentAuszug:
    """Baut den zeichenbegrenzten Dokument-Auszug (Skelett + Stichprobe) für die KI."""
    sammler = _StichprobenSammler()
    _besuche_stichprobe(wurzel, "", sammler)
    stichprobe = _stichprobe_text(sammler)

    max_tiefe = _MAX_TIEFE
    skelett = _skelett_text(wurzel, max_tiefe)

    # Zeichenbudget wahren: erst die Stichprobe kürzen, dann die Skeletttiefe senken.
    while len(skelett) + len(stichprobe) > config.KI_SKELETT_ZEICHEN and len(stichprobe) > 200:
        stichprobe = stichprobe[: max(200, config.KI_SKELETT_ZEICHEN - len(skelett))]
        stichprobe = stichprobe.rsplit("\n", 1)[0] + "\n… (Stichprobe gekürzt)"
        break

    while len(skelett) + len(stichprobe) > config.KI_SKELETT_ZEICHEN and max_tiefe > 1:
        max_tiefe -= 1
        skelett = _skelett_text(wurzel, max_tiefe)

    if len(skelett) > config.KI_SKELETT_ZEICHEN:
        skelett = skelett[: config.KI_SKELETT_ZEICHEN] + "\n… (Skelett gekürzt)"

    return DokumentAuszug(skelett_text=skelett, stichprobe_text=stichprobe)
