"""API-Tests des Feld-Profil-Analyzers: vollständige Pfad-Liste mit Kennzahlen."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient


def _profil(
    client: TestClient, inhalt: str, dateiname: str | None = None
) -> dict[str, dict[str, Any]]:
    """Ruft /analyse/profil und liefert die Felder als Abbildung Pfad-Muster -> Feld."""
    dokument: dict[str, str] = {"inhalt_text": inhalt}
    if dateiname is not None:
        dokument["dateiname"] = dateiname
    antwort = client.post("/api/analyse/profil", json={"dokument": dokument})
    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["anzahl_felder"] == len(daten["felder"])
    return {feld["pfad_muster"]: feld for feld in daten["felder"]}


def _typ_anzahl(feld: dict[str, Any], typ: str) -> int:
    for eintrag in feld["typen"]:
        if eintrag["typ"] == typ:
            return int(eintrag["anzahl"])
    return 0


def test_profil_typisch_json_enthaelt_wurzel_und_felder(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    felder = _profil(client, inhalt)

    # Die Wurzel ist ein Container-Feld und steht als erstes in der sortierten Liste.
    assert list(felder) == sorted(felder)
    assert "" in felder
    wurzel = felder[""]
    assert wurzel["vorkommen"] == 1
    assert _typ_anzahl(wurzel, "objekt") == 1
    assert wurzel["kind_min"] == 2
    assert wurzel["kind_max"] == 2

    # summe: reine Zahlen mit Minimum und Maximum.
    summe = felder["/bestellungen/*/summe"]
    assert summe["vorkommen"] == 3
    assert _typ_anzahl(summe, "zahl") == 3
    assert summe["zahl_minimum"] == 68.3
    assert summe["zahl_maximum"] == 129.0
    assert summe["text_min_laenge"] is None

    # kunde/name: Textwerte mit kürzester und längster Länge.
    name = felder["/bestellungen/*/kunde/name"]
    assert _typ_anzahl(name, "text") == 3
    assert name["text_min_laenge"] == 13
    assert name["text_max_laenge"] == 16
    assert name["zahl_minimum"] is None

    # id: UUIDs sind alle verschieden - verschiedene == vorkommen.
    kennung = felder["/bestellungen/*/id"]
    assert _typ_anzahl(kennung, "text") == 3
    assert kennung["verschiedene"] == kennung["vorkommen"] == 3
    assert len(kennung["beispielwerte"]) == 3


def test_profil_typisch_json_null_anteil_und_beispiele(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    felder = _profil(client, inhalt)

    lieferdatum = felder["/bestellungen/*/lieferdatum"]
    assert lieferdatum["vorkommen"] == 3
    assert _typ_anzahl(lieferdatum, "null") == 2
    assert lieferdatum["null_anteil"] > 0
    assert round(lieferdatum["null_anteil"], 3) == round(2 / 3, 3)

    # Container-Felder liefern eine kompakte Beispiel-Kurzdarstellung.
    liste = felder["/bestellungen"]
    assert liste["kind_min"] == liste["kind_max"] == 3
    assert liste["beispielwerte"] == ["[3 Einträge]"]

    # Beispielliste je Feld ist auf höchstens fünf Einträge begrenzt.
    for feld in felder.values():
        assert len(feld["beispielwerte"]) <= 5


def test_profil_typisch_csv_spalten(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("csv/typisch.csv").decode("utf-8")

    felder = _profil(client, inhalt, dateiname="typisch.csv")

    # Je Spalte ein Feld "/*/<spalte>" mit Text-Kennzahlen; vorkommen == Zeilenzahl.
    name = felder["/*/name"]
    assert name["vorkommen"] == 6
    assert _typ_anzahl(name, "text") == 6
    assert name["text_min_laenge"] is not None
    assert name["text_max_laenge"] is not None

    kundennummer = felder["/*/kundennummer"]
    assert kundennummer["vorkommen"] == 6
    assert kundennummer["verschiedene"] == 6

    # Eine Spalte mit leeren Zellen hat einen null_anteil größer null.
    umsatz = felder["/*/umsatz"]
    assert umsatz["vorkommen"] == 6
    assert _typ_anzahl(umsatz, "null") == 1
    assert umsatz["null_anteil"] > 0


def test_capabilities_enthaelt_profil_analyzer(client: TestClient) -> None:
    antwort = client.get("/api/capabilities")

    assert antwort.status_code == 200
    analyzer = {eintrag["id"]: eintrag for eintrag in antwort.json()["analyzer"]}
    assert "profil" in analyzer
    assert analyzer["profil"]["name"] == "Feld-Profil"
