"""Golden-Konvertierungsmatrix: prüft die Selbstauskunft der Registry gegen echtes Verhalten.

Zwei datengetriebene Blöcke:

1. MATRIX-Durchlauf über jedes Paar (von -> nach) der Konvertierungsmatrix aus
   /api/capabilities. Für wandelbare Paare wird konvertiert und geprüft, dass
   die tatsächlich gemeldeten Verluste eine Teilmenge der in der Matrix
   deklarierten möglichen Verluste sind - die Matrix darf also nichts
   verschweigen. Paare, deren Quellform strukturell nicht zur Zielform passt
   (z. B. verschachteltes Objekt -> CSV), sind strukturell unmöglich; für sie
   wird die erwartete Fehlermeldung (400 konvertierung_unmoeglich) belegt, damit
   auch diese Matrix-Aussage nicht ungeprüft bleibt.

2. RUNDREISE je schreibfähigem Format: ein typisches Beispiel parsen, in DASSELBE
   Format zurückwandeln, erneut parsen - die beiden Wurzelbäume müssen
   strukturell gleich sein.

Die Testdaten werden passend zum Ziel gewählt: für tabellarische bzw.
zeilenweise Ziele eine homogene Objektliste, für strukturelle Ziele ein
verschachteltes Objekt mit genau einem Wurzelschlüssel.
"""

from __future__ import annotations

import base64
import io
from collections.abc import Callable
from typing import TypedDict, cast

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook  # type: ignore[import-untyped]  # kein py.typed / keine Stubs verfügbar

from app.main import create_app

# --- Formklassen -----------------------------------------------------------
#
# Jede Engine erzeugt beim Parsen entweder eine bare Liste (Tabellenform) oder
# genau ein Wurzel-Objekt. Und jedes Zielformat verlangt beim Schreiben eine
# bestimmte Form. Aus diesen beiden Klassifikationen ergibt sich, ob ein Paar
# ueberhaupt wandelbar ist.

# Zielformate, die beim Schreiben eine bare Liste (Zeilen/Eintraege) verlangen.
ZIEL_BRAUCHT_LISTE = {"csv", "md_tabelle", "html_tabelle", "ndjson"}

# Zielformate, die beim Schreiben genau ein Wurzel-Objekt (Dict) verlangen.
ZIEL_BRAUCHT_DICT = {"xml", "toml"}

# Quellformate, deren Parse-Ergebnis eine bare Liste sein kann (Tabellenform).
QUELLE_LIEFERT_LISTE = {"json", "yaml", "ndjson", "csv", "md_tabelle", "html_tabelle", "xlsx"}

# Quellformate, deren Parse-Ergebnis ein Wurzel-Objekt (Dict) sein kann.
QUELLE_LIEFERT_DICT = {"json", "yaml", "toml", "xml"}


# --- Quelldokumente je Quellformat -----------------------------------------
#
# "liste": homogene Objektliste (für tabellarische/zeilenweise Ziele)
# "dict":  verschachteltes Objekt mit genau einem Wurzelschlüssel (für XML/TOML)

_LISTE_TEXT: dict[str, str] = {
    "json": '[{"name":"Erika","stadt":"Kiel"},{"name":"Sönke","stadt":"Flensburg"}]',
    "ndjson": '{"name":"Erika","stadt":"Kiel"}\n{"name":"Sönke","stadt":"Flensburg"}\n',
    "yaml": "- name: Erika\n  stadt: Kiel\n- name: Sönke\n  stadt: Flensburg\n",
    "csv": "name;stadt\nErika;Kiel\nSönke;Flensburg\n",
    "md_tabelle": "| name | stadt |\n| --- | --- |\n| Erika | Kiel |\n| Sönke | Flensburg |\n",
    "html_tabelle": (
        "<table><thead><tr><th>name</th><th>stadt</th></tr></thead>"
        "<tbody><tr><td>Erika</td><td>Kiel</td></tr>"
        "<tr><td>Sönke</td><td>Flensburg</td></tr></tbody></table>"
    ),
}

_DICT_TEXT: dict[str, str] = {
    "json": '{"wurzel":{"titel":"Buch","kapitel":{"nummer":"1","name":"Start"}}}',
    "yaml": 'wurzel:\n  titel: Buch\n  kapitel:\n    nummer: "1"\n    name: Start\n',
    "toml": '[wurzel]\ntitel = "Buch"\n\n[wurzel.kapitel]\nnummer = "1"\nname = "Start"\n',
    "xml": "<wurzel><titel>Buch</titel><kapitel><nummer>1</nummer><name>Start</name></kapitel></wurzel>",
}


def _xlsx_tabelle_base64() -> str:
    """Erzeugt eine kleine XLSX-Mappe (homogene Tabelle) und gibt sie base64-kodiert zurück.

    XLSX ist ein reines Importformat (binär), darum wird die Quelle hier
    aufgebaut statt aus einer Textkonstante zu stammen.
    """
    mappe = Workbook()
    blatt = mappe.active
    blatt.append(["name", "stadt"])
    blatt.append(["Erika", "Kiel"])
    blatt.append(["Sönke", "Flensburg"])
    puffer = io.BytesIO()
    mappe.save(puffer)
    return base64.b64encode(puffer.getvalue()).decode("ascii")


def _quell_referenz(von: str, form: str) -> dict[str, str]:
    """Baut die DokumentReferenz-Nutzlast für ein Quellformat in der gewünschten Form.

    form ist "liste" oder "dict". XLSX kommt als base64, alle anderen als Text.
    Gibt {} zurück, wenn das Quellformat diese Form gar nicht liefern kann.
    """
    if von == "xlsx":
        # XLSX liefert stets eine Tabellenform (Liste) - eine Dict-Form gibt es nicht.
        if form != "liste":
            return {}
        return {"inhalt_base64": _xlsx_tabelle_base64(), "format_id": von}
    text = (_LISTE_TEXT if form == "liste" else _DICT_TEXT).get(von)
    if text is None:
        return {}
    return {"inhalt_text": text, "format_id": von}


def _quell_form(von: str, nach: str) -> str:
    """Waehlt die Wurzelform des Quelldokuments passend zum Ziel und zur Quelle.

    Zielformate mit fester Formvorgabe (Liste bzw. Dict) bekommen genau diese
    Form, sofern die Quelle sie liefern kann. Kann die Quelle die geforderte Form
    nicht liefern (strukturell unmöglich) oder gibt das Ziel keine Form vor
    (json/yaml), wird die natürliche Form der Quelle genommen: Liste, wenn die
    Quelle listenfaehig ist, sonst Dict.
    """
    if nach in ZIEL_BRAUCHT_LISTE and von in QUELLE_LIEFERT_LISTE:
        return "liste"
    if nach in ZIEL_BRAUCHT_DICT and von in QUELLE_LIEFERT_DICT:
        return "dict"
    return "liste" if von in QUELLE_LIEFERT_LISTE else "dict"


def _ist_wandelbar(von: str, nach: str) -> bool:
    """Kann die Quelle die vom Ziel verlangte Wurzelform ueberhaupt liefern?"""
    if nach in ZIEL_BRAUCHT_LISTE:
        return von in QUELLE_LIEFERT_LISTE
    if nach in ZIEL_BRAUCHT_DICT:
        return von in QUELLE_LIEFERT_DICT
    # json/yaml als Ziel: jede Quelle taugt (Liste bevorzugt, sonst Dict).
    return von in QUELLE_LIEFERT_LISTE or von in QUELLE_LIEFERT_DICT


# --- Matrix zur Sammelzeit laden -------------------------------------------
#
# Fuer die Parametrisierung wird die Matrix einmal beim Import geholt (eigener
# Client), damit pytest je Paar einen eigenen Testfall mit sprechender Id anlegt.


class MatrixPaar(TypedDict):
    """Ein Eintrag der Konvertierungsmatrix, wie /api/capabilities ihn liefert."""

    von: str
    nach: str
    moegliche_verluste: list[str]


def _matrix_paare() -> list[MatrixPaar]:
    with TestClient(create_app()) as client:
        antwort = client.get("/api/capabilities")
        antwort.raise_for_status()
        matrix: list[MatrixPaar] = antwort.json()["konvertierungsmatrix"]
        return matrix


_MATRIX = _matrix_paare()
_PAAR_IDS = [f"{p['von']}__{p['nach']}" for p in _MATRIX]

# Schreibfähige Formate für die Rundreise samt typischem Beispiel.
_RUNDREISE_FAELLE: dict[str, str] = {
    "json": "json/typisch.json",
    "yaml": "yaml/typisch.yaml",
    "toml": "toml/typisch.toml",
    "xml": "xml/typisch.xml",
    "csv": "csv/typisch.csv",
    "ndjson": "ndjson/typisch.ndjson",
    "md_tabelle": "md/typisch.md",
    "html_tabelle": "html/typisch.html",
}


def _konvertiere(
    client: TestClient, referenz: dict[str, str], ziel: str
) -> tuple[int, dict[str, object]]:
    """Ruft den Konvertierungs-Endpunkt und gibt (Statuscode, JSON-Antwort) zurück."""
    antwort = client.post(
        "/api/transform/konvertieren",
        json={"dokument": referenz, "ziel_format": ziel},
    )
    daten: dict[str, object] = antwort.json()
    return antwort.status_code, daten


def _parse_wurzel(client: TestClient, inhalt: str, format_id: str) -> object:
    antwort = client.post(
        "/api/dokumente/parsen",
        json={"inhalt_text": inhalt, "format_id": format_id},
    )
    assert antwort.status_code == 200, antwort.text
    return antwort.json()["wurzel"]


# --- (a) Matrix-Durchlauf --------------------------------------------------


@pytest.mark.parametrize("paar", _MATRIX, ids=_PAAR_IDS)
def test_matrix_paar_haelt_seine_verlustzusage(client: TestClient, paar: MatrixPaar) -> None:
    """Jedes Matrix-Paar wird belegt: entweder saubere Wandlung mit ehrlicher
    Verlustliste oder - bei struktureller Unmoeglichkeit - die erwartete Absage."""
    von = paar["von"]
    nach = paar["nach"]
    deklarierte_verluste = set(paar["moegliche_verluste"])

    form = _quell_form(von, nach)
    referenz = _quell_referenz(von, form)
    assert referenz, f"Kein Quelldokument für {von} in Form {form}"

    status, daten = _konvertiere(client, referenz, nach)

    if not _ist_wandelbar(von, nach):
        # Strukturell unmöglich (z. B. Objekt-Wurzel -> CSV, Liste -> XML):
        # die Matrix-Aussage wird über die erwartete Fehlermeldung belegt.
        assert status == 400, daten
        fehler = cast("dict[str, str]", daten["fehler"])
        assert fehler["code"] == "konvertierung_unmoeglich"
        assert fehler["meldung"]
        return

    assert status == 200, daten
    assert daten["ziel_format"] == nach

    serialisierung = cast("dict[str, str | None]", daten["ergebnis"])
    inhalt = serialisierung.get("inhalt_text") or serialisierung.get("inhalt_base64")
    assert inhalt, "Das Ergebnis darf nicht leer sein"

    verluste = cast("list[dict[str, str]]", daten["verluste"])
    gemeldete_verluste = {v["aspekt"] for v in verluste}
    # Die Matrix darf nichts verschweigen: tatsaechliche Verluste sind Teilmenge der Zusage.
    assert gemeldete_verluste <= deklarierte_verluste, (
        f"{von}->{nach}: gemeldet {sorted(gemeldete_verluste)} "
        f"nicht in deklariert {sorted(deklarierte_verluste)}"
    )
    for verlust in verluste:
        assert verlust["meldung"], "Jeder Verlusthinweis traegt eine Meldung"


def test_matrix_ist_nicht_leer() -> None:
    """Absicherung, dass die Parametrisierung ueberhaupt Paare geladen hat."""
    assert _MATRIX, "Die Konvertierungsmatrix ist unerwartet leer"


# --- (b) Rundreise ---------------------------------------------------------


@pytest.mark.parametrize(("format_id", "beispiel_pfad"), sorted(_RUNDREISE_FAELLE.items()))
def test_rundreise_ist_strukturtreu(
    client: TestClient,
    beispiel: Callable[[str], bytes],
    format_id: str,
    beispiel_pfad: str,
) -> None:
    """Beispiel parsen -> in dasselbe Format wandeln -> erneut parsen: die
    Wurzelbäume müssen strukturell gleich sein (Werte- und Schlüsselgleichheit)."""
    quelle = beispiel(beispiel_pfad).decode("utf-8")

    wurzel_vorher = _parse_wurzel(client, quelle, format_id)

    status, daten = _konvertiere(client, {"inhalt_text": quelle, "format_id": format_id}, format_id)
    assert status == 200, daten
    serialisierung = cast("dict[str, str]", daten["ergebnis"])
    zwischenergebnis = serialisierung["inhalt_text"]
    assert zwischenergebnis, "Die Rueckwandlung darf nicht leer sein"

    wurzel_nachher = _parse_wurzel(client, zwischenergebnis, format_id)

    assert wurzel_nachher == wurzel_vorher, (
        f"{format_id}: Rundreise veraendert die Struktur"
    )
