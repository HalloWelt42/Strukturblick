"""API-Tests des Typmodell-Endpunkts (neutrales Modell für das Schema-Diagramm)."""

from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def _typmodell(client: TestClient, inhalt: str, wurzelname: str) -> dict[str, object]:
    antwort = client.post(
        "/api/analyse/typmodell",
        json={"dokument": {"inhalt_text": inhalt}, "wurzelname": wurzelname},
    )
    assert antwort.status_code == 200
    daten: dict[str, object] = antwort.json()
    return daten


def _typ_nach_name(daten: dict[str, object], name: str) -> dict[str, object]:
    typen = daten["typen"]
    assert isinstance(typen, list)
    for typ in typen:
        assert isinstance(typ, dict)
        if typ["name"] == name:
            return typ
    raise AssertionError(f"Typ '{name}' fehlt im Typmodell")


def _feld_nach_name(typ: dict[str, object], name: str) -> dict[str, object]:
    felder = typ["felder"]
    assert isinstance(felder, list)
    for feld in felder:
        assert isinstance(feld, dict)
        if feld["name"] == name:
            return feld
    raise AssertionError(f"Feld '{name}' fehlt im Typ '{typ['name']}'")


def test_typmodell_enthaelt_alle_benannten_typen(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    daten = _typmodell(client, inhalt, "Bestellungen")

    assert daten["wurzel_name"] == "Bestellungen"
    typen = daten["typen"]
    assert isinstance(typen, list)
    namen = {typ["name"] for typ in typen if isinstance(typ, dict)}
    assert {"Bestellungen", "Geschaeft", "Bestellung", "Kunde", "Position"} <= namen


def test_typmodell_liste_von_objekten_hat_referenz(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    daten = _typmodell(client, inhalt, "Bestellungen")

    wurzel = _typ_nach_name(daten, "Bestellungen")
    feld = _feld_nach_name(wurzel, "bestellungen")
    assert feld["ist_liste"] is True
    assert feld["referenz"] == "Bestellung"
    assert feld["typ_anzeige"] == "Liste (Bestellung)"


def test_typmodell_objekt_referenz(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    daten = _typmodell(client, inhalt, "Bestellungen")

    bestellung = _typ_nach_name(daten, "Bestellung")
    kunde = _feld_nach_name(bestellung, "kunde")
    assert kunde["referenz"] == "Kunde"
    assert kunde["ist_liste"] is False
    assert kunde["typ_anzeige"] == "Objekt (Kunde)"


def test_typmodell_primitiv_ohne_referenz(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    daten = _typmodell(client, inhalt, "Bestellungen")

    bestellung = _typ_nach_name(daten, "Bestellung")
    summe = _feld_nach_name(bestellung, "summe")
    assert summe["referenz"] is None
    assert summe["ist_liste"] is False
    assert summe["typ_anzeige"] == "Zahl"
