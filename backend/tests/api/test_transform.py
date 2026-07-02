"""API-Tests der Transformationsschicht: Konvertierung, Diff, Reparatur."""

from __future__ import annotations

import json
from collections.abc import Callable

from fastapi.testclient import TestClient


def _ist_gueltiges_json(text: str) -> bool:
    try:
        json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return False
    return True


# --- Konvertierung ---------------------------------------------------------


def test_konvertieren_yaml_nach_json_meldet_verluste(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("yaml/typisch.yaml").decode("utf-8")

    antwort = client.post(
        "/api/transform/konvertieren",
        json={
            "dokument": {"inhalt_text": inhalt, "dateiname": "typisch.yaml"},
            "ziel_format": "json",
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["ziel_format"] == "json"
    assert _ist_gueltiges_json(daten["ergebnis"]["inhalt_text"])
    aspekte = {verlust["aspekt"] for verlust in daten["verluste"]}
    assert "kommentare" in aspekte
    assert "anker" in aspekte
    for verlust in daten["verluste"]:
        assert verlust["meldung"]  # jede Meldung ist gefüllt


def test_konvertieren_json_objekt_nach_csv_ist_unmoeglich(client: TestClient) -> None:
    antwort = client.post(
        "/api/transform/konvertieren",
        json={
            "dokument": {"inhalt_text": '{"a": 1, "b": 2}'},
            "ziel_format": "csv",
        },
    )

    assert antwort.status_code == 400
    assert antwort.json()["fehler"]["code"] == "konvertierung_unmoeglich"


def test_konvertieren_json_objektliste_nach_csv(client: TestClient) -> None:
    inhalt = json.dumps(
        [
            {"name": "Erika", "stadt": "Kiel"},
            {"name": "Sönke", "stadt": "Flensburg"},
        ]
    )

    antwort = client.post(
        "/api/transform/konvertieren",
        json={"dokument": {"inhalt_text": inhalt}, "ziel_format": "csv"},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["ziel_format"] == "csv"
    text = daten["ergebnis"]["inhalt_text"]
    zeilen = [zeile for zeile in text.splitlines() if zeile]
    assert zeilen[0] == "name;stadt"
    assert "Erika;Kiel" in zeilen
    assert "Sönke;Flensburg" in zeilen


def test_formatieren_json_nach_json_sortiert_schluessel(client: TestClient) -> None:
    antwort = client.post(
        "/api/transform/konvertieren",
        json={
            "dokument": {"inhalt_text": '{"b": 1, "a": 2}'},
            "ziel_format": "json",
            "optionen": {"sortiere_schluessel": True},
        },
    )

    assert antwort.status_code == 200
    text = antwort.json()["ergebnis"]["inhalt_text"]
    assert _ist_gueltiges_json(text)
    geladen = json.loads(text)
    assert list(geladen.keys()) == ["a", "b"]


# --- Diff ------------------------------------------------------------------


def test_diff_geaendert_hinzugefuegt_entfernt(client: TestClient) -> None:
    links = json.dumps({"summe": 100, "bezahlt": True, "notiz": "alt"})
    rechts = json.dumps({"summe": 120, "bezahlt": True, "lieferung": "morgen"})

    antwort = client.post(
        "/api/transform/diff",
        json={"links": {"inhalt_text": links}, "rechts": {"inhalt_text": rechts}},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    nach_pfad = {eintrag["pfad"]: eintrag for eintrag in daten["eintraege"]}
    assert daten["anzahl"] == len(daten["eintraege"])

    geaendert = nach_pfad["/summe"]
    assert geaendert["art"] == "geaendert"
    assert geaendert["wert_links"] == 100
    assert geaendert["wert_rechts"] == 120
    assert geaendert["position_links"] is not None

    hinzugefuegt = nach_pfad["/lieferung"]
    assert hinzugefuegt["art"] == "hinzugefuegt"
    assert hinzugefuegt["wert_rechts"] == "morgen"
    assert hinzugefuegt["position_rechts"] is not None

    entfernt = nach_pfad["/notiz"]
    assert entfernt["art"] == "entfernt"
    assert entfernt["wert_links"] == "alt"
    assert entfernt["position_links"] is not None


# --- Reparatur -------------------------------------------------------------


def test_reparatur_beispieldatei_ist_reparierbar(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/kaputte/fehlendes_komma.json").decode("utf-8")

    antwort = client.post(
        "/api/transform/reparatur",
        json={"dokument": {"inhalt_text": inhalt, "format_id": "json"}},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["reparierbar"] is True
    assert daten["veraendert"] is True
    assert _ist_gueltiges_json(daten["ergebnis_text"])
    assert daten["diff_unified"] != ""


def test_reparatur_abgeschnittenes_json(client: TestClient) -> None:
    antwort = client.post(
        "/api/transform/reparatur",
        json={"dokument": {"inhalt_text": '{"a":1', "format_id": "json"}},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["reparierbar"] is True
    assert daten["veraendert"] is True
    assert _ist_gueltiges_json(daten["ergebnis_text"])
    assert daten["diff_unified"] != ""


def test_reparatur_bereits_gueltiges_json_bleibt_unveraendert(client: TestClient) -> None:
    inhalt = '{\n  "a": 1,\n  "b": 2\n}\n'

    antwort = client.post(
        "/api/transform/reparatur",
        json={"dokument": {"inhalt_text": inhalt, "format_id": "json"}},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["reparierbar"] is True
    assert daten["veraendert"] is False
    assert daten["aenderungen"] == []


def test_reparatur_csv_ist_nicht_reparierbar(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("csv/typisch.csv").decode("utf-8")

    antwort = client.post(
        "/api/transform/reparatur",
        json={"dokument": {"inhalt_text": inhalt, "dateiname": "typisch.csv"}},
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["reparierbar"] is False
    assert daten["veraendert"] is False
    assert daten["aenderungen"]  # enthält einen Hinweis
