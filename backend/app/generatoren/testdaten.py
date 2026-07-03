"""Spezifikations-getriebener Testdaten-Generator: ableiten und erzeugen.

Zwei Aufgaben, sauber getrennt:

- leite_spezifikation_ab: geht das Dokument in einem profil-artigen Durchlauf ab
  (Statistiken je Pfad-Muster) und leitet je Blatt-Pfad heuristisch einen
  Erzeuger samt Parametern ab. Ist die Wurzel eine Liste, ist der Datensatz das
  (über alle Elemente gemergte) Element; sonst ist der Datensatz die Wurzel.
- erzeuge_datensaetze: seedet je Datensatz-Index random und Faker deterministisch
  (basis_seed + index, blockstabil) und ersetzt jedes Blatt der Schablone durch
  den passenden Erzeuger. Verschachtelte Listen in der Schablone bestimmen die
  Zahl der zu erzeugenden Elemente.

Deutsche Faker-Lokalisierung (de_DE) wie im Beispieldaten-Generator.
"""

from __future__ import annotations

import random
import re
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal

from faker import Faker

from app.fehler import ParseFehler
from app.kern.dokument import GeparstesDokument
from app.kern.pfade import kind_pointer
from app.modelle.gemeinsam import JsonWert
from app.modelle.testdaten import (
    ErzeugerArt,
    ErzeugerArtInfo,
    FeldErzeuger,
    Spezifikation,
)

# Prozessweites Faker mit deutschem Gebietsschema; vor jedem Datensatz frisch geseedet.
_faker = Faker("de_DE")

# Grenzen der Kardinalitäts-Heuristik für die Kategorie-Ableitung.
_KATEGORIE_MAX_VERSCHIEDENE = 12
_KATEGORIE_MAX_ANTEIL = 0.5
# Ab dieser Textlänge (Median-nah über die Maximallänge geschätzt) gilt Text als Satz.
_SATZ_AB_LAENGE = 25

_ISO_DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ISO_DATUMZEIT = re.compile(r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}")
_UUID = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
# Code-artig: Buchstaben und Ziffern, dazwischen Trenner wie - _ / . - und beide Zeichenarten vertreten.
_CODE = re.compile(r"^[A-Za-z0-9]+(?:[-_/.][A-Za-z0-9]+)+$")

_STANDARD_DATUM_VON = "2000-01-01"


# --- Erzeuger-Selbstauskunft -------------------------------------------------

# id -> (Anzeigename, Parameternamen). Reihenfolge = Anzeigereihenfolge im Frontend.
_ERZEUGER_META: tuple[tuple[ErzeugerArt, str, tuple[str, ...]], ...] = (
    ("personenname", "Personenname", ()),
    ("vorname", "Vorname", ()),
    ("nachname", "Nachname", ()),
    ("email", "E-Mail", ("aus_feld",)),
    ("firma", "Firma", ()),
    ("stadt", "Stadt", ()),
    ("strasse", "Straße", ()),
    ("land", "Land", ()),
    ("telefonnummer", "Telefonnummer", ()),
    ("ganzzahl", "Ganzzahl", ("min", "max")),
    ("dezimalzahl", "Dezimalzahl", ("min", "max", "nachkommastellen")),
    ("wahrheitswert", "Wahrheitswert", ()),
    ("datum", "Datum", ("von", "bis")),
    ("datumzeit", "Datum und Zeit", ("von", "bis")),
    ("uuid", "UUID", ()),
    ("muster", "Muster", ("vorlage",)),
    ("wort", "Wort", ()),
    ("satz", "Satz", ()),
    ("kategorie", "Kategorie/Auswahl", ("werte",)),
    ("konstant", "Konstant", ("wert",)),
)


def erzeuger_arten_infos() -> list[ErzeugerArtInfo]:
    """Liefert die Selbstauskunft aller Erzeuger-Arten für den Capabilities-Endpunkt."""
    return [
        ErzeugerArtInfo(id=eid, name=name, parameter=list(parameter))
        for eid, name, parameter in _ERZEUGER_META
    ]


# --- Statistik-Durchlauf (profil-artig, aber nur je Pfad, was wir brauchen) --


@dataclass
class _Statistik:
    """Kennzahlen aller Werte an genau einem Pfad-Muster - Grundlage der Heuristik."""

    vorkommen: int = 0
    typen: set[str] = field(default_factory=set)
    zahl_minimum: float | None = None
    zahl_maximum: float | None = None
    text_max_laenge: int = 0
    ist_ganzzahlig: bool = True
    werte: list[JsonWert] = field(default_factory=list)
    verschiedene: set[str] = field(default_factory=set)

    def erfasse(self, wert: JsonWert) -> None:
        self.vorkommen += 1
        if len(self.werte) < 50:
            self.werte.append(wert)
        if wert is None:
            self.typen.add("null")
            return
        if isinstance(wert, bool):
            self.typen.add("wahrheitswert")
            self.verschiedene.add("true" if wert else "false")
            return
        if isinstance(wert, int):
            self.typen.add("zahl")
            self._zahl(float(wert))
            self.verschiedene.add(str(wert))
            return
        if isinstance(wert, float):
            self.typen.add("zahl")
            self.ist_ganzzahlig = False
            self._zahl(wert)
            self.verschiedene.add(str(wert))
            return
        if isinstance(wert, str):
            self.typen.add("text")
            self.text_max_laenge = max(self.text_max_laenge, len(wert))
            if len(self.verschiedene) < 1000:
                self.verschiedene.add(wert)
            return
        self.typen.add("liste" if isinstance(wert, list) else "objekt")

    def _zahl(self, zahl: float) -> None:
        self.zahl_minimum = zahl if self.zahl_minimum is None else min(self.zahl_minimum, zahl)
        self.zahl_maximum = zahl if self.zahl_maximum is None else max(self.zahl_maximum, zahl)


def _sammle(wert: JsonWert, pfad: str, stat: dict[str, _Statistik]) -> None:
    """Erfasst den Wert an seinem Pfad-Muster und steigt in Container hinab."""
    stat.setdefault(pfad, _Statistik()).erfasse(wert)
    if isinstance(wert, dict):
        for schluessel, kind in wert.items():
            _sammle(kind, kind_pointer(pfad, schluessel), stat)
    elif isinstance(wert, list):
        for kind in wert:
            _sammle(kind, f"{pfad}/*", stat)


# --- Schablone (vorlage) ableiten -------------------------------------------


def _merge_liste_element(elemente: list[JsonWert]) -> JsonWert:
    """Verschmilzt die Elemente einer Liste zu einer repräsentativen Schablone.

    Objekte werden über alle Elemente zu einem Schlüssel-Union gemergt (erstes
    beobachtetes Kind je Schlüssel), damit die Schablone alle Felder trägt.
    """
    objekte = [e for e in elemente if isinstance(e, dict)]
    if objekte:
        gemergt: dict[str, JsonWert] = {}
        for obj in objekte:
            for schluessel, kind in obj.items():
                if schluessel not in gemergt:
                    gemergt[schluessel] = kind
        return {s: _vorlage_aus_wert(k) for s, k in gemergt.items()}
    nicht_null = [e for e in elemente if e is not None]
    grundlage = nicht_null[0] if nicht_null else (elemente[0] if elemente else None)
    return _vorlage_aus_wert(grundlage)


def _vorlage_aus_wert(wert: JsonWert) -> JsonWert:
    """Baut aus einem Beispielwert die Schablone: Container behalten, Blätter als Platzhalter."""
    if isinstance(wert, dict):
        return {schluessel: _vorlage_aus_wert(kind) for schluessel, kind in wert.items()}
    if isinstance(wert, list):
        if not wert:
            return []
        return [_merge_liste_element(wert)]
    return wert


def _datensatz_schablone(wurzel: JsonWert) -> JsonWert:
    """Bestimmt die Schablone genau eines Datensatzes.

    Ist die Wurzel eine Liste, ist der Datensatz das (gemergte) Element; sonst
    ist der Datensatz die Wurzel selbst.
    """
    if isinstance(wurzel, list):
        if not wurzel:
            return {}
        return _merge_liste_element(wurzel)
    return _vorlage_aus_wert(wurzel)


# --- Erzeuger je Blatt heuristisch ableiten ---------------------------------


def _feldname(pfad: str) -> str:
    """Letztes benanntes Segment eines Pfad-Musters (Sternchen überspringend)."""
    for segment in reversed(pfad.split("/")):
        if segment and segment != "*":
            return segment.lower()
    return ""


def _stat_fuer(basis_pfad: str, feld_pfad: str, stat: dict[str, _Statistik]) -> _Statistik | None:
    """Findet die Statistik zum Blatt-Pfad (relativ zur Datensatz-Basis)."""
    return stat.get(feld_pfad) or stat.get(basis_pfad + feld_pfad)


def _muster_vorlage(beispiel: str) -> str:
    """Leitet aus einem Code-artigen Beispiel eine Muster-Vorlage ab (Ziffer->#, Buchstabe->?)."""
    zeichen: list[str] = []
    for z in beispiel:
        if z.isdigit():
            zeichen.append("#")
        elif z.isalpha():
            zeichen.append("?")
        else:
            zeichen.append(z)
    return "".join(zeichen)


def _erzeuger_fuer_zahl(stat: _Statistik) -> tuple[ErzeugerArt, dict[str, JsonWert]]:
    minimum = stat.zahl_minimum if stat.zahl_minimum is not None else 0.0
    maximum = stat.zahl_maximum if stat.zahl_maximum is not None else 100.0
    if maximum < minimum:
        maximum = minimum
    if stat.ist_ganzzahlig:
        return "ganzzahl", {"min": int(minimum), "max": int(maximum)}
    return "dezimalzahl", {"min": minimum, "max": maximum, "nachkommastellen": 2}


def _erzeuger_fuer_text(
    feldname: str, stat: _Statistik
) -> tuple[ErzeugerArt, dict[str, JsonWert]]:
    """Leitet für ein Textblatt einen Erzeuger ab - Format schlägt Feldname schlägt Länge."""
    beispiele = [w for w in stat.werte if isinstance(w, str) and w]
    erstes = beispiele[0] if beispiele else ""

    if _UUID.match(erstes):
        return "uuid", {}
    if _ISO_DATUMZEIT.match(erstes):
        return "datumzeit", _datum_spanne(beispiele, mit_zeit=True)
    if _ISO_DATUM.match(erstes):
        return "datum", _datum_spanne(beispiele, mit_zeit=False)

    kategorie = _vielleicht_kategorie(stat)
    if kategorie is not None:
        return "kategorie", {"werte": kategorie}

    if _CODE.match(erstes) and any(c.isdigit() for c in erstes):
        return "muster", {"vorlage": _muster_vorlage(erstes)}

    if "email" in feldname or "mail" in feldname:
        return "email", {}
    if "vorname" in feldname:
        return "vorname", {}
    if "nachname" in feldname:
        return "nachname", {}
    if "name" in feldname:
        return "personenname", {}
    if "firma" in feldname or "company" in feldname:
        return "firma", {}
    if "stadt" in feldname or "ort" in feldname or "city" in feldname:
        return "stadt", {}
    if "strasse" in feldname or "street" in feldname:
        return "strasse", {}
    if "land" in feldname or "country" in feldname:
        return "land", {}
    if "telefon" in feldname or "phone" in feldname:
        return "telefonnummer", {}

    if stat.text_max_laenge >= _SATZ_AB_LAENGE:
        return "satz", {}
    return "wort", {}


def _vielleicht_kategorie(stat: _Statistik) -> list[JsonWert] | None:
    """Niedrige Kardinalität ggü. Vorkommen -> Auswahl aus den beobachteten Werten."""
    verschiedene = len(stat.verschiedene)
    if verschiedene < 2 or verschiedene > _KATEGORIE_MAX_VERSCHIEDENE:
        return None
    if stat.vorkommen < 2 * verschiedene:
        return None
    if verschiedene / stat.vorkommen > _KATEGORIE_MAX_ANTEIL:
        return None
    werte: list[JsonWert] = list(sorted(stat.verschiedene))
    return werte


def _datum_spanne(beispiele: list[str], *, mit_zeit: bool) -> dict[str, JsonWert]:
    """Spannt von/bis aus den beobachteten Datumswerten (Fallback: Standardspanne bis heute)."""
    gesehen = sorted(w[: 10 if not mit_zeit else 19] for w in beispiele)
    von = gesehen[0] if gesehen else _STANDARD_DATUM_VON + ("T00:00:00" if mit_zeit else "")
    bis = gesehen[-1] if gesehen else date.today().isoformat() + ("T00:00:00" if mit_zeit else "")
    if not mit_zeit:
        return {"von": von[:10], "bis": bis[:10]}
    return {"von": von, "bis": bis}


def _erzeuger_fuer_blatt(
    feld_pfad: str, stat: _Statistik | None
) -> tuple[ErzeugerArt, dict[str, JsonWert]]:
    """Leitet für ein einzelnes Blatt Erzeuger und Parameter ab."""
    feldname = _feldname(feld_pfad)
    if stat is None or not stat.werte:
        return ("email" if "mail" in feldname else "wort"), {}

    if "wahrheitswert" in stat.typen:
        return "wahrheitswert", {}
    if "zahl" in stat.typen:
        return _erzeuger_fuer_zahl(stat)
    if "text" in stat.typen:
        return _erzeuger_fuer_text(feldname, stat)
    # Nur null gesehen: sinnvoller Standard nach Feldname.
    return ("email" if "mail" in feldname else "wort"), {}


def _blatt_pfade(vorlage: JsonWert, pfad: str, sammeln: list[str]) -> None:
    """Sammelt die Pfad-Muster aller Blätter der Schablone (Listen als /*)."""
    if isinstance(vorlage, dict):
        for schluessel, kind in vorlage.items():
            _blatt_pfade(kind, kind_pointer(pfad, schluessel), sammeln)
    elif isinstance(vorlage, list):
        for kind in vorlage:
            _blatt_pfade(kind, f"{pfad}/*", sammeln)
    else:
        sammeln.append(pfad)


def leite_spezifikation_ab(dok: GeparstesDokument) -> Spezifikation:
    """Leitet aus einem Dokument eine Generator-Spezifikation ab.

    Bestimmt die Datensatz-Schablone, sammelt Statistiken je Pfad und ordnet
    jedem Blatt heuristisch einen Erzeuger samt Parametern und Beispiel zu.
    """
    stat: dict[str, _Statistik] = {}
    _sammle(dok.wurzel, "", stat)

    # Basis-Pfad des Datensatzes: bei Listenwurzel steht die Statistik unter "/*".
    basis_pfad = "/*" if isinstance(dok.wurzel, list) else ""
    vorlage = _datensatz_schablone(dok.wurzel)

    blatt_pfade: list[str] = []
    _blatt_pfade(vorlage, "", blatt_pfade)

    felder: list[FeldErzeuger] = []
    for feld_pfad in blatt_pfade:
        feld_stat = _stat_fuer(basis_pfad, feld_pfad, stat)
        erzeuger, parameter = _erzeuger_fuer_blatt(feld_pfad, feld_stat)
        muster = feld_pfad if feld_pfad else "/"
        felder.append(
            FeldErzeuger(pfad_muster=muster, erzeuger=erzeuger, parameter=parameter)
        )

    _verknuepfe_email_mit_name(felder)
    _fuelle_beispiele(felder)
    return Spezifikation(felder=felder, vorlage=vorlage)


def _eltern_pfad(pfad_muster: str) -> str:
    """Elternpfad eines Blatt-Musters (alles bis zum letzten Segment)."""
    return pfad_muster.rsplit("/", 1)[0] if "/" in pfad_muster else ""


def _verknuepfe_email_mit_name(felder: list[FeldErzeuger]) -> None:
    """Setzt bei E-Mail-Feldern aus_feld auf ein Namensfeld desselben Objekts.

    So werden E-Mails aus dem erzeugten Namen abgeleitet (etwa
    "erika.musterfrau@beispiel.de") statt zufällig gewürfelt - wie in der Vorlage.
    """
    name_je_eltern: dict[str, str] = {}
    for feld in felder:
        if feld.erzeuger in ("personenname", "vorname", "nachname"):
            name_je_eltern.setdefault(_eltern_pfad(feld.pfad_muster), feld.pfad_muster)
    for feld in felder:
        if feld.erzeuger != "email" or feld.parameter.get("aus_feld"):
            continue
        quelle = name_je_eltern.get(_eltern_pfad(feld.pfad_muster))
        if quelle is not None:
            feld.parameter["aus_feld"] = quelle


def _fuelle_beispiele(felder: list[FeldErzeuger]) -> None:
    """Erzeugt je Feld einen Beispielwert (fester Seed, unabhängig von der späteren Erzeugung)."""
    random.seed(0)
    _faker.seed_instance(0)
    kontext: dict[str, JsonWert] = {}
    for feld in felder:
        try:
            wert = _erzeuge_wert(feld, kontext)
        except ParseFehler:
            wert = ""
        feld.beispiel = "" if wert is None else str(wert)


# --- Datensätze erzeugen -----------------------------------------------------


def _seed_setzen(seed: int) -> None:
    random.seed(seed)
    _faker.seed_instance(seed)


def _param_str(parameter: dict[str, JsonWert], name: str, standard: str) -> str:
    wert = parameter.get(name)
    return str(wert) if isinstance(wert, str) else standard


def _param_zahl(parameter: dict[str, JsonWert], name: str, standard: float) -> float:
    wert = parameter.get(name)
    if isinstance(wert, bool):
        return standard
    if isinstance(wert, (int, float)):
        return float(wert)
    if isinstance(wert, str):
        try:
            return float(wert)
        except ValueError as fehler:
            raise ParseFehler(
                f"Parameter '{name}' muss eine Zahl sein, war {wert!r}."
            ) from fehler
    return standard


def _erzeuge_muster(vorlage: str) -> str:
    """Ersetzt in der Vorlage # durch eine Ziffer und ? durch einen Großbuchstaben."""
    zeichen: list[str] = []
    for z in vorlage:
        if z == "#":
            zeichen.append(str(random.randint(0, 9)))
        elif z == "?":
            zeichen.append(chr(random.randint(ord("A"), ord("Z"))))
        else:
            zeichen.append(z)
    return "".join(zeichen)


def _parse_datum(text: str, standard: date) -> date:
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return standard


def _parse_datumzeit(text: str, standard: datetime) -> datetime:
    try:
        return datetime.fromisoformat(text.replace(" ", "T"))
    except ValueError:
        return standard


def _erzeuge_datum(parameter: dict[str, JsonWert]) -> str:
    von = _parse_datum(_param_str(parameter, "von", _STANDARD_DATUM_VON), date(2000, 1, 1))
    bis = _parse_datum(_param_str(parameter, "bis", date.today().isoformat()), date.today())
    if bis < von:
        bis = von
    tage = (bis - von).days
    versatz = random.randint(0, tage) if tage > 0 else 0
    return (von + timedelta(days=versatz)).isoformat()


def _erzeuge_datumzeit(parameter: dict[str, JsonWert]) -> str:
    von = _parse_datumzeit(
        _param_str(parameter, "von", _STANDARD_DATUM_VON + "T00:00:00"),
        datetime(2000, 1, 1),
    )
    bis = _parse_datumzeit(
        _param_str(parameter, "bis", datetime.now().replace(microsecond=0).isoformat()),
        datetime.now().replace(microsecond=0),
    )
    if bis < von:
        bis = von
    sekunden = int((bis - von).total_seconds())
    versatz = random.randint(0, sekunden) if sekunden > 0 else 0
    return (von + timedelta(seconds=versatz)).replace(microsecond=0).isoformat()


def _email_aus_kontext(parameter: dict[str, JsonWert], kontext: dict[str, JsonWert]) -> str:
    """E-Mail; optional aus einem zuvor erzeugten Namensfeld (Parameter aus_feld) abgeleitet."""
    aus_feld = parameter.get("aus_feld")
    quelle = kontext.get(aus_feld) if isinstance(aus_feld, str) else None
    if isinstance(quelle, str) and quelle.strip():
        return _email_aus_name(quelle)
    return _faker.email()


def _email_aus_name(name: str) -> str:
    """Baut aus einem Personennamen eine plausible E-Mail (Umlaute transliteriert)."""
    tabelle = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "Ä": "ae", "Ö": "oe", "Ü": "ue"})
    teile = [t for t in re.split(r"\s+", name.strip().lower().translate(tabelle)) if t]
    reine = ["".join(c for c in t if c.isalnum()) for t in teile]
    reine = [t for t in reine if t]
    lokal = ".".join(reine) if reine else "kontakt"
    return f"{lokal}@beispiel.de"


# Erzeuger-Funktionen: nehmen (Parameter, Kontext) und liefern einen JsonWert.
_ERZEUGER: dict[ErzeugerArt, Callable[[dict[str, JsonWert], dict[str, JsonWert]], JsonWert]] = {
    "personenname": lambda p, k: _faker.name(),
    "vorname": lambda p, k: _faker.first_name(),
    "nachname": lambda p, k: _faker.last_name(),
    "email": _email_aus_kontext,
    "firma": lambda p, k: _faker.company(),
    "stadt": lambda p, k: _faker.city(),
    "strasse": lambda p, k: _faker.street_address(),
    "land": lambda p, k: _faker.country(),
    "telefonnummer": lambda p, k: _faker.phone_number(),
    "ganzzahl": lambda p, k: random.randint(
        int(_param_zahl(p, "min", 0.0)), int(_param_zahl(p, "max", 100.0))
    )
    if int(_param_zahl(p, "min", 0.0)) <= int(_param_zahl(p, "max", 100.0))
    else int(_param_zahl(p, "min", 0.0)),
    "dezimalzahl": lambda p, k: _erzeuge_dezimal(p),
    "wahrheitswert": lambda p, k: random.random() < 0.5,
    "datum": lambda p, k: _erzeuge_datum(p),
    "datumzeit": lambda p, k: _erzeuge_datumzeit(p),
    "uuid": lambda p, k: str(uuid.UUID(int=random.getrandbits(128), version=4)),
    "muster": lambda p, k: _erzeuge_muster(_param_str(p, "vorlage", "########")),
    "wort": lambda p, k: _faker.word(),
    "satz": lambda p, k: _faker.sentence(),
    "kategorie": lambda p, k: _waehle_kategorie(p),
    "konstant": lambda p, k: p.get("wert"),
}


def _erzeuge_dezimal(parameter: dict[str, JsonWert]) -> float:
    minimum = _param_zahl(parameter, "min", 0.0)
    maximum = _param_zahl(parameter, "max", 100.0)
    if maximum < minimum:
        maximum = minimum
    stellen_wert = parameter.get("nachkommastellen")
    stellen = int(stellen_wert) if isinstance(stellen_wert, (int, float)) and not isinstance(stellen_wert, bool) else 2
    stellen = max(0, min(stellen, 10))
    wert = random.uniform(minimum, maximum)
    return float(Decimal(str(wert)).quantize(Decimal(1).scaleb(-stellen)))


def _waehle_kategorie(parameter: dict[str, JsonWert]) -> JsonWert:
    werte = parameter.get("werte")
    if not isinstance(werte, list) or not werte:
        raise ParseFehler("Der Erzeuger 'kategorie' braucht eine nicht-leere Liste 'werte'.")
    return random.choice(werte)


def _erzeuge_wert(feld: FeldErzeuger, kontext: dict[str, JsonWert]) -> JsonWert:
    funktion = _ERZEUGER.get(feld.erzeuger)
    if funktion is None:
        raise ParseFehler(f"Unbekannte Erzeuger-Art: {feld.erzeuger!r}")
    return funktion(feld.parameter, kontext)


def _fuelle_schablone(
    vorlage: JsonWert,
    pfad: str,
    erzeuger_je_pfad: dict[str, FeldErzeuger],
    kontext: dict[str, JsonWert],
) -> JsonWert:
    """Ersetzt jedes Blatt der Schablone durch den passenden Erzeuger (nach Pfad-Muster)."""
    if isinstance(vorlage, dict):
        return {
            schluessel: _fuelle_schablone(
                kind, kind_pointer(pfad, schluessel), erzeuger_je_pfad, kontext
            )
            for schluessel, kind in vorlage.items()
        }
    if isinstance(vorlage, list):
        return [
            _fuelle_schablone(kind, f"{pfad}/*", erzeuger_je_pfad, kontext)
            for kind in vorlage
        ]
    schluessel = pfad if pfad else "/"
    feld = erzeuger_je_pfad.get(schluessel)
    if feld is None:
        return vorlage
    wert = _erzeuge_wert(feld, kontext)
    kontext[feld.pfad_muster] = wert
    kontext[_feldname(feld.pfad_muster)] = wert
    return wert


def erzeuge_datensaetze(
    spezifikation: Spezifikation, anzahl: int, seed: int, offset: int
) -> list[JsonWert]:
    """Erzeugt den Block [offset, offset+anzahl) deterministisch aus der Spezifikation.

    Je Datensatz-Index i werden random und Faker mit seed+i geseedet - dadurch
    ist die Erzeugung deterministisch und blockstabil (Block 0..99 plus 100..199
    ergibt exakt 0..199).
    """
    erzeuger_je_pfad = {feld.pfad_muster: feld for feld in spezifikation.felder}
    datensaetze: list[JsonWert] = []
    for i in range(offset, offset + max(anzahl, 0)):
        _seed_setzen(seed + i)
        kontext: dict[str, JsonWert] = {}
        datensaetze.append(
            _fuelle_schablone(spezifikation.vorlage, "", erzeuger_je_pfad, kontext)
        )
    return datensaetze
