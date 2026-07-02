"""Neutrales Zwischenmodell für die Codegenerierung.

Aus dem Wertebaum eines Dokuments (dok.wurzel) entsteht ein sprachneutrales
Modell aus benannten Typen. Verschachtelte Objekte werden zu eigenen benannten
Typen (Name aus dem Feldnamen in PascalCase, projektweit eindeutig), die Wurzel
trägt den übergebenen Wurzelnamen. Alle Emitter arbeiten ausschließlich auf
diesem Modell - sie kennen weder den ursprünglichen Wertebaum noch JSON.

Grundregeln der Ableitung:
- Ein Objekt (dict) wird ein benannter Typ mit einem Feld je Schlüssel.
- Eine Liste von Objekten wird zur Liste eines Elementtyps; dessen Felder
  ergeben sich aus der Vereinigung aller Objektschlüssel. Ein Feld ist optional,
  wenn es nicht in allen Elementen vorkommt oder in einem Element null ist.
- Gemischte oder leere Listen werden zu einer Liste von 'any'.
- Kommt für ein Feld null neben einem konkreten Typ vor, ist das Feld optional.
- Nicht auflösbare oder in sich gemischte Werte werden zu 'any'.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

from app.modelle.gemeinsam import JsonWert

# Primitive Typnamen des Zwischenmodells (sprachneutral).
Primitiv = str  # "string" | "number" | "integer" | "boolean" | "null" | "any"

PRIMITIVE: frozenset[str] = frozenset(
    {"string", "number", "integer", "boolean", "null", "any"}
)


@dataclass(frozen=True)
class FeldTyp:
    """Der Typ eines Feldes: ein Primitiv oder eine Referenz auf einen benannten Typ.

    ist_liste kennzeichnet, dass das Feld eine Liste des angegebenen Typs ist.
    referenz ist der Name eines benannten Typs oder None, wenn primitiv ist.
    """

    primitiv: str | None
    referenz: str | None = None
    ist_liste: bool = False

    @property
    def ist_referenz(self) -> bool:
        return self.referenz is not None


@dataclass(frozen=True)
class Feld:
    """Ein Feld eines benannten Typs."""

    name: str
    typ: FeldTyp
    optional: bool


@dataclass
class BenannterTyp:
    """Ein benannter Objekttyp mit geordneten Feldern."""

    name: str
    felder: list[Feld] = field(default_factory=list)


@dataclass
class SchemaModell:
    """Das Ergebnis der Ableitung: benannte Typen und Warnungen.

    Die Typen stehen in Definitionsreihenfolge; der Wurzeltyp ist der erste
    Eintrag, sofern die Wurzel ein Objekt (oder Liste von Objekten) ist.
    """

    typen: list[BenannterTyp] = field(default_factory=list)
    beispiel_anzahl: int = 0
    warnungen: list[str] = field(default_factory=list)


def _singular(name: str) -> str:
    """Bildet aus einem (meist pluralen) Feldnamen eine Einzahlform für Elementtypen.

    Der Elementtyp einer Liste heißt sinnvollerweise wie ein einzelnes Element,
    nicht wie die Liste ("bestellungen" -> "Bestellung", "positionen" ->
    "Position"). Behandelt werden die häufigen Endungen; im Zweifel bleibt der
    Name unverändert (Korrektheit vor Vollständigkeit).
    """
    kern = name.strip()
    if len(kern) <= 3:
        return kern
    niedrig = kern.lower()
    for endung, ersatz in (("ungen", "ung"), ("ionen", "ion"), ("innen", "in")):
        if niedrig.endswith(endung):
            return kern[: -len(endung)] + ersatz
    for endung in ("en", "n", "s"):
        if niedrig.endswith(endung) and len(kern) - len(endung) >= 3:
            return kern[: -len(endung)]
    return kern


def _pascal_case(name: str) -> str:
    """Formt einen Feldnamen in einen PascalCase-Typnamen um (nur Buchstaben/Ziffern)."""
    teile: list[str] = []
    aktuell: list[str] = []
    for zeichen in name:
        if zeichen.isalnum():
            aktuell.append(zeichen)
        elif aktuell:
            teile.append("".join(aktuell))
            aktuell = []
    if aktuell:
        teile.append("".join(aktuell))
    if not teile:
        return "Typ"
    pascal = "".join(wort[:1].upper() + wort[1:] for wort in teile)
    if pascal[:1].isdigit():
        pascal = "Typ" + pascal
    return pascal


class _Ableiter:
    """Sammelt beim Durchlauf des Wertebaums die benannten Typen ein."""

    def __init__(self, wurzelname: str) -> None:
        self._typen: list[BenannterTyp] = []
        self._vergebene_namen: set[str] = set()
        self._warnungen: list[str] = []
        self._wurzelname = _pascal_case(wurzelname) if wurzelname else "Wurzel"

    def _eindeutiger_name(self, vorschlag: str) -> str:
        name = vorschlag or "Typ"
        if name not in self._vergebene_namen:
            self._vergebene_namen.add(name)
            return name
        nummer = 2
        while f"{name}{nummer}" in self._vergebene_namen:
            nummer += 1
        eindeutig = f"{name}{nummer}"
        self._vergebene_namen.add(eindeutig)
        return eindeutig

    def _objekt_typ(self, name: str, objekte: list[dict[str, JsonWert]]) -> str:
        """Legt einen benannten Typ für eine Menge gleichartiger Objekte an."""
        typ = BenannterTyp(name=name)
        # Den Typ vor seinen Feldern eintragen, damit übergeordnete Typen (Wurzel
        # zuerst) vor ihren verschachtelten Typen stehen - lesbare Ausgabe.
        self._typen.append(typ)
        # Reihenfolge merken: erste Sicht eines Schlüssels bestimmt die Position.
        reihenfolge: list[str] = []
        for objekt in objekte:
            for schluessel in objekt:
                if schluessel not in reihenfolge:
                    reihenfolge.append(schluessel)
        for schluessel in reihenfolge:
            in_allen = all(schluessel in objekt for objekt in objekte)
            werte = [objekt[schluessel] for objekt in objekte if schluessel in objekt]
            feld_typ, feld_optional = self._feld_typ(schluessel, werte)
            typ.felder.append(
                Feld(name=schluessel, typ=feld_typ, optional=feld_optional or not in_allen)
            )
        return name

    def _feld_typ(self, feldname: str, werte: Sequence[JsonWert]) -> tuple[FeldTyp, bool]:
        """Bestimmt Typ und Optionalität eines Feldes aus seinen beobachteten Werten."""
        nicht_null = [wert for wert in werte if wert is not None]
        optional = len(nicht_null) != len(werte)
        if not nicht_null:
            return FeldTyp(primitiv="any"), optional

        if all(isinstance(wert, list) for wert in nicht_null):
            element_typ = self._listen_element_typ(feldname, nicht_null)
            return element_typ, optional

        objekte = [wert for wert in nicht_null if isinstance(wert, dict) and not isinstance(wert, bool)]
        if len(objekte) == len(nicht_null):
            typname = self._eindeutiger_name(_pascal_case(feldname))
            self._objekt_typ(typname, objekte)
            return FeldTyp(primitiv=None, referenz=typname), optional

        return FeldTyp(primitiv=self._primitiv(nicht_null, feldname)), optional

    def _listen_element_typ(self, feldname: str, listen: Sequence[JsonWert]) -> FeldTyp:
        """Bestimmt den Elementtyp einer Feldliste (Liste von Listen zusammengefasst)."""
        elemente: list[JsonWert] = []
        for liste in listen:
            if isinstance(liste, list):
                elemente.extend(liste)
        if not elemente:
            return FeldTyp(primitiv="any", ist_liste=True)

        objekte = [e for e in elemente if isinstance(e, dict) and not isinstance(e, bool)]
        if objekte and len(objekte) == len(elemente):
            typname = self._eindeutiger_name(_pascal_case(_singular(feldname)))
            self._objekt_typ(typname, objekte)
            return FeldTyp(primitiv=None, referenz=typname, ist_liste=True)

        return FeldTyp(primitiv=self._primitiv(elemente, feldname), ist_liste=True)

    def _primitiv(self, werte: Sequence[JsonWert], feldname: str) -> str:
        """Ermittelt einen gemeinsamen primitiven Typnamen für nicht-null-Werte."""
        typen: set[str] = set()
        for wert in werte:
            if isinstance(wert, bool):
                typen.add("boolean")
            elif isinstance(wert, int):
                typen.add("integer")
            elif isinstance(wert, float):
                typen.add("number")
            elif isinstance(wert, str):
                typen.add("string")
            else:
                # Liste oder Objekt in gemischter Umgebung -> nicht darstellbar.
                typen.add("any")
        if len(typen) == 1:
            return next(iter(typen))
        if typen <= {"integer", "number"}:
            return "number"
        self._warnungen.append(
            f"Feld '{feldname}' trägt gemischte Typen ({', '.join(sorted(typen))}) - als 'any' abgebildet"
        )
        return "any"

    def _wurzel_verarbeiten(self, wurzel: JsonWert) -> None:
        if isinstance(wurzel, dict) and not isinstance(wurzel, bool):
            name = self._eindeutiger_name(self._wurzelname)
            self._objekt_typ(name, [wurzel])
            return
        if isinstance(wurzel, list):
            objekte = [e for e in wurzel if isinstance(e, dict) and not isinstance(e, bool)]
            if objekte and len(objekte) == len(wurzel):
                name = self._eindeutiger_name(self._wurzelname)
                self._objekt_typ(name, objekte)
                return
            self._warnungen.append(
                "Die Wurzel ist keine Liste von Objekten - es wurde kein Wurzeltyp erzeugt."
            )
            return
        self._warnungen.append(
            "Die Wurzel ist kein Objekt und keine Liste von Objekten - "
            "es wurde kein Wurzeltyp erzeugt."
        )

    def ableiten(self, wurzel: JsonWert) -> SchemaModell:
        self._wurzel_verarbeiten(wurzel)
        return SchemaModell(typen=self._typen, warnungen=self._warnungen)


def baue_schema_modell(wurzel: JsonWert, wurzelname: str = "Wurzel") -> SchemaModell:
    """Leitet aus einem Wertebaum das neutrale Zwischenmodell ab.

    Der Wurzeltyp erhält den übergebenen Namen (PascalCase), verschachtelte
    Objekttypen ihren Feldnamen. Die Typen stehen in der Reihenfolge, in der sie
    beim Durchlauf des Baums entstehen (Wurzel zuerst).
    """
    return _Ableiter(wurzelname).ableiten(wurzel)
