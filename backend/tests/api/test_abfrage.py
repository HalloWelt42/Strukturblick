"""API-Tests der Abfrage-Schicht: JSONPath, XPath, Volltext, Regex, Grenzen."""

from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def _json(client: TestClient, beispiel: Callable[[str], bytes], **felder: object) -> dict:
    inhalt = beispiel("json/typisch.json").decode("utf-8")
    nutzlast = {"dokument": {"inhalt_text": inhalt}, **felder}
    return client.post("/api/abfrage", json=nutzlast).json()


def test_jsonpath_bestellsummen(client: TestClient, beispiel: Callable[[str], bytes]) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post(
        "/api/abfrage",
        json={
            "dokument": {"inhalt_text": inhalt},
            "sprache": "jsonpath",
            "ausdruck": "$.bestellungen[*].summe",
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["sprache"] == "jsonpath"
    assert daten["abgeschnitten"] is False
    pfade = [treffer["pfad"] for treffer in daten["treffer"]]
    assert pfade == ["/bestellungen/0/summe", "/bestellungen/1/summe", "/bestellungen/2/summe"]
    erster = daten["treffer"][0]
    assert isinstance(erster["wert"], (int, float))
    assert erster["position"] is not None
    assert erster["position"]["start"]["offset"] >= 0
    assert erster["kontext"] == "summe: 68.3"


def test_jsonpath_rekursiv_findet_emails(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    daten = _json(client, beispiel, sprache="jsonpath", ausdruck="$..email")

    werte = {treffer["wert"] for treffer in daten["treffer"]}
    assert werte == {
        "erika.musterfrau@beispiel.de",
        "juergen.schaefer@beispiel.de",
        "kaethe.groessner@beispiel.de",
    }
    assert all(treffer["pfad"].endswith("/email") for treffer in daten["treffer"])


def test_jsonpath_syntaxfehler_ist_400(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post(
        "/api/abfrage",
        json={
            "dokument": {"inhalt_text": inhalt},
            "sprache": "jsonpath",
            "ausdruck": "$.[[[",
        },
    )

    assert antwort.status_code == 400
    assert antwort.json()["fehler"]["code"] == "abfrage_syntaxfehler"


def test_volltext_findet_wert_mit_position(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    daten = _json(client, beispiel, sprache="volltext", ausdruck="Erika")

    assert len(daten["treffer"]) >= 1
    treffer = daten["treffer"][0]
    assert treffer["pfad"] == "/bestellungen/0/kunde/name"
    assert treffer["position"] is not None
    assert treffer["position"]["start"]["offset"] >= 0


def test_volltext_nur_schluessel_findet_schluesselpfad(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    daten = _json(
        client, beispiel, sprache="volltext", ausdruck="kunde", nur_schluessel=True
    )

    pfade = {treffer["pfad"] for treffer in daten["treffer"]}
    assert "/bestellungen/0/kunde" in pfade


def test_regex_findet_bestellnummern(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    daten = _json(client, beispiel, sprache="regex", ausdruck=r"B-2026-\d+")

    werte = {treffer["wert"] for treffer in daten["treffer"]}
    assert werte == {"B-2026-0412", "B-2026-0413", "B-2026-0414"}


def test_regex_kaputt_ist_400(client: TestClient, beispiel: Callable[[str], bytes]) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post(
        "/api/abfrage",
        json={
            "dokument": {"inhalt_text": inhalt},
            "sprache": "regex",
            "ausdruck": "[unbalanciert",
        },
    )

    assert antwort.status_code == 400
    assert antwort.json()["fehler"]["code"] == "abfrage_syntaxfehler"


def test_xpath_auf_xml_liefert_position_und_kontext(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("xml/typisch.xml").decode("utf-8")

    antwort = client.post(
        "/api/abfrage",
        json={
            "dokument": {"inhalt_text": inhalt, "dateiname": "typisch.xml"},
            "sprache": "xpath",
            "ausdruck": "//buch/titel",
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["anzahl"] == 2
    erster = daten["treffer"][0]
    assert erster["pfad"] == "/buecherei/buch/0/titel"
    assert erster["position"] is not None
    assert erster["position"]["start"]["zeile"] == 5
    assert erster["kontext"] == "titel: Der Datenbaum"


def test_xpath_auf_json_ist_konvertierung_unmoeglich(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post(
        "/api/abfrage",
        json={
            "dokument": {"inhalt_text": inhalt},
            "sprache": "xpath",
            "ausdruck": "//buch",
        },
    )

    assert antwort.status_code == 400
    assert antwort.json()["fehler"]["code"] == "konvertierung_unmoeglich"


def test_max_treffer_schneidet_ab(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    daten = _json(client, beispiel, sprache="jsonpath", ausdruck="$..*", max_treffer=2)

    assert daten["abgeschnitten"] is True
    assert daten["anzahl"] == 2
    assert len(daten["treffer"]) == 2


def test_abfrage_per_dokument_hash_nach_parsen(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")
    geparst = client.post("/api/dokumente/parsen", json={"inhalt_text": inhalt})
    hash_wert = geparst.json()["dokument_hash"]

    antwort = client.post(
        "/api/abfrage",
        json={
            "dokument": {"dokument_hash": hash_wert},
            "sprache": "jsonpath",
            "ausdruck": "$.bestellungen[*].nummer",
        },
    )

    assert antwort.status_code == 200
    werte = {treffer["wert"] for treffer in antwort.json()["treffer"]}
    assert werte == {"B-2026-0412", "B-2026-0413", "B-2026-0414"}
