"""CSV-Engine: Trennzeichen-, Kopfzeilen- und Encoding-Erkennung mit Zell-Positionen.

Die Engine normalisiert CSV zu einer Liste von Zeilen-Objekten (Spaltenname -> Text
oder None bei leeren Feldern) und liefert je Zelle eine Quelltext-Spanne.

Vereinfachung bei mehrzeiligen Feldern (Zeilenumbruch innerhalb von
Anführungszeichen): Enthält eine physische Zeile Anführungszeichen oder erstreckt
sich ein Datensatz über mehrere Zeilen, bekommen alle Zellen des Datensatzes die
Spanne der ganzen Zeile bzw. des ganzen Zeilenbereichs statt exakter Feld-Offsets.
Korrektheit vor Präzision: Die Zuordnung bleibt richtig, nur gröber.
"""

from __future__ import annotations

import codecs
import csv
import io
from dataclasses import dataclass
from statistics import fmean, pvariance
from typing import ClassVar, cast

from charset_normalizer import from_bytes

from app.fehler import KonvertierungUnmoeglich, ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer, pointer_aus_segmenten
from app.kern.positionen import ZeilenIndex, nur_wert, position, spanne
from app.modelle.dokument import (
    DialektInfo,
    ErkennungsErgebnis,
    ParseOptionen,
    SerialisierungsErgebnis,
    SerialisierungsOptionen,
)
from app.modelle.gemeinsam import FormatId, JsonWert, KnotenSpannen, QuellSpanne
from app.modelle.system import FormatFaehigkeiten
from app.registry import format_engine

ANFUEHRUNGSZEICHEN = '"'
TRENNZEICHEN_KANDIDATEN = (",", ";", "\t", "|")
PROBE_ZEILEN = 50


@dataclass(frozen=True)
class CsvDialekt:
    """Erkannter Dialekt als natives Handle für den Round-Trip."""

    trennzeichen: str
    anfuehrungszeichen: str
    encoding: str
    hat_kopfzeile: bool
    spaltennamen: tuple[str, ...]


@dataclass(frozen=True)
class _RohSatz:
    """Ein gelesener CSV-Datensatz samt physischem Zeilenbereich (1-basiert)."""

    felder: list[str]
    start_zeile: int
    ende_zeile: int


def _encoding_anzeigename(codec_name: str) -> str:
    """Formt einen Python-Codec-Namen in einen Anzeigenamen wie "UTF-8" um."""
    try:
        normalisiert = codecs.lookup(codec_name).name
    except LookupError:
        normalisiert = codec_name
    if normalisiert in ("utf-8", "utf-8-sig"):
        return "UTF-8"
    if normalisiert.startswith("iso8859-"):
        return "ISO-8859-" + normalisiert.removeprefix("iso8859-")
    return normalisiert.upper()


def _dekodieren(roh: bytes, gewuenschtes_encoding: str | None) -> tuple[str, str]:
    """Dekodiert die Rohbytes und liefert (Text, Encoding-Anzeigename).

    Reihenfolge: explizite Vorgabe, BOM-Erkennung, striktes UTF-8,
    zuletzt automatische Erkennung per charset_normalizer.
    """
    if gewuenschtes_encoding is not None:
        try:
            return roh.decode(gewuenschtes_encoding), _encoding_anzeigename(gewuenschtes_encoding)
        except LookupError as fehler:
            raise ParseFehler(
                f"Die Zeichenkodierung '{gewuenschtes_encoding}' ist unbekannt."
            ) from fehler
        except UnicodeDecodeError as fehler:
            raise ParseFehler(
                f"Der Inhalt lässt sich nicht als '{gewuenschtes_encoding}' dekodieren - "
                "bitte eine andere Zeichenkodierung wählen."
            ) from fehler
    try:
        if roh.startswith(codecs.BOM_UTF8):
            return roh.decode("utf-8-sig"), "UTF-8"
        if roh.startswith(codecs.BOM_UTF16_LE):
            return roh.decode("utf-16"), "UTF-16-LE"
        if roh.startswith(codecs.BOM_UTF16_BE):
            return roh.decode("utf-16"), "UTF-16-BE"
    except UnicodeDecodeError as fehler:
        raise ParseFehler(
            "Der Inhalt trägt eine BOM, lässt sich aber nicht entsprechend dekodieren."
        ) from fehler
    try:
        return roh.decode("utf-8"), "UTF-8"
    except UnicodeDecodeError:
        bestes = from_bytes(roh).best()
        if bestes is None or bestes.encoding is None:
            raise ParseFehler(
                "Die Zeichenkodierung des Dokuments wurde nicht erkannt - "
                "bitte unter csv_encoding eine Kodierung angeben."
            ) from None
        return str(bestes), _encoding_anzeigename(bestes.encoding)


def _trennzeichen_heuristik(zeilen: list[str]) -> str:
    """Eigene Konsistenz-Heuristik: geringste Spaltenzahl-Varianz gewinnt.

    Kandidaten mit konstanter Spaltenzahl > 1 haben Varianz 0 und gewinnen damit;
    bei Gleichstand entscheidet die höhere Spaltenzahl. Fallback ist das Komma.
    """
    bestes = ","
    beste_bewertung: tuple[float, float] | None = None
    for kandidat in TRENNZEICHEN_KANDIDATEN:
        spaltenzahlen = [zeile.count(kandidat) + 1 for zeile in zeilen]
        if not spaltenzahlen or fmean(spaltenzahlen) <= 1.0:
            continue
        bewertung = (pvariance(spaltenzahlen), -fmean(spaltenzahlen))
        if beste_bewertung is None or bewertung < beste_bewertung:
            beste_bewertung = bewertung
            bestes = kandidat
    return bestes


def _konstantes_trennzeichen(zeilen: list[str]) -> str | None:
    """Liefert einen Kandidaten mit konstanter Spaltenzahl >= 2, sonst None."""
    bestes: tuple[int, str] | None = None
    for kandidat in TRENNZEICHEN_KANDIDATEN:
        spaltenzahlen = {zeile.count(kandidat) + 1 for zeile in zeilen}
        if len(spaltenzahlen) == 1 and (breite := spaltenzahlen.pop()) >= 2:
            if bestes is None or breite > bestes[0]:
                bestes = (breite, kandidat)
    return None if bestes is None else bestes[1]


def _trennzeichen_erkennen(probe: str) -> str:
    try:
        return csv.Sniffer().sniff(probe, delimiters="".join(TRENNZEICHEN_KANDIDATEN)).delimiter
    except csv.Error:
        zeilen = [zeile for zeile in probe.splitlines() if zeile.strip()]
        return _trennzeichen_heuristik(zeilen[:PROBE_ZEILEN])


def _kopfzeile_erkennen(probe: str) -> bool:
    try:
        return csv.Sniffer().has_header(probe)
    except (csv.Error, StopIteration):
        return True


def _eindeutige_spaltennamen(rohe_namen: list[str], warnungen: list[str]) -> list[str]:
    """Macht doppelte Spaltennamen eindeutig ("name", "name_2", ...) mit Warnung."""
    vergeben: set[str] = set()
    zaehler: dict[str, int] = {}
    ergebnis: list[str] = []
    for name in rohe_namen:
        eindeutig = name
        while eindeutig in vergeben:
            zaehler[name] = zaehler.get(name, 1) + 1
            eindeutig = f"{name}_{zaehler[name]}"
        if eindeutig != name:
            warnungen.append(f"Doppelter Spaltenname '{name}' wurde zu '{eindeutig}' umbenannt")
        vergeben.add(eindeutig)
        ergebnis.append(eindeutig)
    return ergebnis


def _saetze_lesen(text: str, trennzeichen: str) -> list[_RohSatz]:
    """Liest alle Datensätze und merkt sich je Satz den physischen Zeilenbereich."""
    leser = csv.reader(
        io.StringIO(text, newline=""), delimiter=trennzeichen, quotechar=ANFUEHRUNGSZEICHEN
    )
    saetze: list[_RohSatz] = []
    letzte_zeilennummer = 0
    try:
        for felder in leser:
            start_zeile = letzte_zeilennummer + 1
            letzte_zeilennummer = leser.line_num
            if felder:
                saetze.append(_RohSatz(felder=felder, start_zeile=start_zeile, ende_zeile=leser.line_num))
    except csv.Error as fehler:
        fehler_zeile = max(leser.line_num, 1)
        raise ParseFehler(
            f"CSV-Syntaxfehler in Zeile {fehler_zeile}: {fehler}",
            position=QuellSpanne(start=position(fehler_zeile), ende=position(fehler_zeile)),
        ) from fehler
    return saetze


def _zeilentext(zeilen: list[str], zeilen_nummer: int) -> str:
    """Physische Zeile (1-basiert) ohne Zeilenende-Zeichen."""
    if not 1 <= zeilen_nummer <= len(zeilen):
        return ""
    return zeilen[zeilen_nummer - 1].rstrip("\r")


def _bereich_spanne(satz: _RohSatz, zeilen: list[str], index: ZeilenIndex) -> QuellSpanne:
    """Spanne über den ganzen Zeilenbereich eines Datensatzes (Spalte 1 bis Zeilenende)."""
    ende_inhalt = _zeilentext(zeilen, satz.ende_zeile)
    return spanne(
        start_zeile=satz.start_zeile,
        start_spalte=1,
        start_offset=index.zu_offset(satz.start_zeile, 1),
        ende_zeile=satz.ende_zeile,
        ende_spalte=len(ende_inhalt) + 1,
        ende_offset=index.zu_offset(satz.ende_zeile, 1) + len(ende_inhalt),
    )


def _feld_spannen(
    zeilentext: str, zeilen_nummer: int, trennzeichen: str, index: ZeilenIndex
) -> list[QuellSpanne]:
    """Exakte Feld-Offsets per Split - nur gültig für Zeilen ohne Anführungszeichen."""
    spannen: list[QuellSpanne] = []
    spalte = 1
    for feld in zeilentext.split(trennzeichen):
        start_offset = index.zu_offset(zeilen_nummer, spalte)
        spannen.append(
            spanne(
                start_zeile=zeilen_nummer,
                start_spalte=spalte,
                start_offset=start_offset,
                ende_zeile=zeilen_nummer,
                ende_spalte=spalte + len(feld),
                ende_offset=start_offset + len(feld),
            )
        )
        spalte += len(feld) + len(trennzeichen)
    return spannen


def _zell_spannen(
    satz: _RohSatz, zeilen: list[str], index: ZeilenIndex, trennzeichen: str
) -> list[QuellSpanne] | None:
    """Exakte Zell-Spannen, sofern der Satz einzeilig und frei von Anführungszeichen ist."""
    if satz.start_zeile != satz.ende_zeile:
        return None
    zeilentext = _zeilentext(zeilen, satz.start_zeile)
    if ANFUEHRUNGSZEICHEN in zeilentext:
        return None
    return _feld_spannen(zeilentext, satz.start_zeile, trennzeichen, index)


def _zellen_wert(felder: list[str], feld_index: int) -> str | None:
    """Feldwert einer Zelle - leere und fehlende Felder werden None."""
    if feld_index >= len(felder):
        return None
    return felder[feld_index] or None


@format_engine
class CsvEngine:
    """Format-Engine für CSV/TSV mit Dialekt-Erkennung und Zell-Positionen."""

    faehigkeiten: ClassVar[FormatFaehigkeiten] = FormatFaehigkeiten(
        format_id=FormatId.CSV,
        name="CSV (Trennzeichen-Erkennung)",
        dateiendungen=(".csv", ".tsv"),
        kann_lesen=True,
        kann_schreiben=True,
        ist_tabellarisch=True,
        positionsgenauigkeit="zelle",
        traegt=frozenset(),
    )

    def erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        try:
            return self._erkennen(roh, dateiname)
        except Exception:
            return None

    def _erkennen(self, roh: bytes, dateiname: str | None) -> ErkennungsErgebnis | None:
        if dateiname is not None:
            endung = next(
                (e for e in self.faehigkeiten.dateiendungen if dateiname.lower().endswith(e)), None
            )
            if endung is not None:
                return ErkennungsErgebnis(
                    format_id=FormatId.CSV,
                    konfidenz=0.85,
                    hinweise=[f"Dateiendung {endung}"],
                )
        try:
            text = roh.decode("utf-8-sig")
        except UnicodeDecodeError:
            return None
        if text.lstrip()[:1] in ("{", "[", "<"):
            return None
        zeilen = [zeile for zeile in text.splitlines() if zeile.strip()]
        if len(zeilen) < 2:
            return None
        kandidat = _konstantes_trennzeichen(zeilen[:PROBE_ZEILEN])
        if kandidat is None:
            return None
        return ErkennungsErgebnis(
            format_id=FormatId.CSV,
            konfidenz=0.55,
            hinweise=[f"Konstante Spaltenzahl mit Trennzeichen {kandidat!r}"],
        )

    def parsen(self, roh: bytes, optionen: ParseOptionen) -> GeparstesDokument:
        text, encoding_anzeige = _dekodieren(roh, optionen.csv_encoding)
        zeilen = text.split("\n")
        probe = "\n".join(zeilen[:PROBE_ZEILEN])

        trennzeichen = optionen.csv_trennzeichen or _trennzeichen_erkennen(probe)
        if optionen.csv_hat_kopfzeile is not None:
            hat_kopfzeile = optionen.csv_hat_kopfzeile
        else:
            hat_kopfzeile = _kopfzeile_erkennen(probe)

        warnungen: list[str] = []
        saetze = _saetze_lesen(text, trennzeichen)
        spaltennamen, datensaetze = self._spalten_bestimmen(saetze, hat_kopfzeile, warnungen)

        index = ZeilenIndex(text)
        wurzel, positionen = self._zeilen_aufbauen(
            datensaetze, spaltennamen, zeilen, index, trennzeichen, warnungen
        )

        return GeparstesDokument(
            format_id=FormatId.CSV,
            # list ist invariant - der präzise Zeilentyp wird erst an der Modellgrenze JsonWert
            wurzel=cast("JsonWert", wurzel),
            positionen=positionen,
            nativ=CsvDialekt(
                trennzeichen=trennzeichen,
                anfuehrungszeichen=ANFUEHRUNGSZEICHEN,
                encoding=encoding_anzeige,
                hat_kopfzeile=hat_kopfzeile,
                spaltennamen=tuple(spaltennamen),
            ),
            warnungen=warnungen,
            dialekt_info=DialektInfo(
                trennzeichen=trennzeichen,
                anfuehrungszeichen=ANFUEHRUNGSZEICHEN,
                encoding=encoding_anzeige,
                hat_kopfzeile=hat_kopfzeile,
            ),
        )

    def _spalten_bestimmen(
        self, saetze: list[_RohSatz], hat_kopfzeile: bool, warnungen: list[str]
    ) -> tuple[list[str], list[_RohSatz]]:
        """Trennt die Kopfzeile ab bzw. erzeugt künstliche Spaltennamen."""
        if not saetze:
            return [], []
        if hat_kopfzeile:
            return _eindeutige_spaltennamen(saetze[0].felder, warnungen), saetze[1:]
        spaltennamen = [f"spalte_{nummer}" for nummer in range(1, len(saetze[0].felder) + 1)]
        return spaltennamen, saetze

    def _zeilen_aufbauen(
        self,
        datensaetze: list[_RohSatz],
        spaltennamen: list[str],
        zeilen: list[str],
        index: ZeilenIndex,
        trennzeichen: str,
        warnungen: list[str],
    ) -> tuple[list[dict[str, str | None]], dict[str, KnotenSpannen]]:
        """Baut den Wertebaum (Liste von Zeilen-Objekten) und die Positionskarte auf."""
        wurzel: list[dict[str, str | None]] = []
        positionen: dict[str, KnotenSpannen] = {}
        for zeilen_index, satz in enumerate(datensaetze):
            if len(satz.felder) != len(spaltennamen):
                warnungen.append(
                    f"Zeile {satz.start_zeile} hat {len(satz.felder)} "
                    f"statt {len(spaltennamen)} Felder"
                )
            wurzel.append(
                {name: _zellen_wert(satz.felder, j) for j, name in enumerate(spaltennamen)}
            )

            zeilen_pointer = pointer_aus_segmenten([zeilen_index])
            bereich = _bereich_spanne(satz, zeilen, index)
            positionen[zeilen_pointer] = nur_wert(bereich)
            zell_spannen = _zell_spannen(satz, zeilen, index, trennzeichen)
            for j, name in enumerate(spaltennamen):
                if j >= len(satz.felder):
                    break  # fehlende Felder haben keine Quellposition
                genau = zell_spannen[j] if zell_spannen is not None and j < len(zell_spannen) else bereich
                positionen[kind_pointer(zeilen_pointer, name)] = nur_wert(genau)
        return wurzel, positionen

    def serialisieren(
        self, dok: GeparstesDokument, optionen: SerialisierungsOptionen
    ) -> SerialisierungsErgebnis:
        tabelle = self._als_tabelle(dok.wurzel)
        puffer = io.StringIO()
        schreiber = csv.writer(
            puffer,
            delimiter=optionen.csv_trennzeichen,
            quotechar=ANFUEHRUNGSZEICHEN,
            quoting=csv.QUOTE_MINIMAL,
            lineterminator="\n",
        )
        if tabelle:
            spaltennamen = list(tabelle[0].keys())
            schreiber.writerow(spaltennamen)
            for zeile in tabelle:
                schreiber.writerow(
                    ["" if (wert := zeile.get(name)) is None else str(wert) for name in spaltennamen]
                )
        return SerialisierungsErgebnis(inhalt_text=puffer.getvalue())

    @staticmethod
    def _als_tabelle(wurzel: JsonWert) -> list[dict[str, JsonWert]]:
        """Prüft, dass die Wurzel eine Liste von Zeilen-Objekten ist (Tabellenform)."""
        fehlertext = (
            "Der Inhalt lässt sich nicht als CSV schreiben: CSV braucht eine flache "
            "Tabelle, also eine Liste von Zeilen-Objekten mit gleichen Spalten."
        )
        if not isinstance(wurzel, list):
            raise KonvertierungUnmoeglich(fehlertext)
        zeilen_objekte: list[dict[str, JsonWert]] = []
        for zeile in wurzel:
            if not isinstance(zeile, dict):
                raise KonvertierungUnmoeglich(fehlertext)
            zeilen_objekte.append(zeile)
        return zeilen_objekte
