"""API-Tests der Analyse-Endpunkte: Schema, Validierung, Statistik, Muster."""

from __future__ import annotations

import json
from collections.abc import Callable

from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator


def _bestellungen_schema(summen_typ: str) -> str:
    """Kleines JSON Schema für typisch.json; der Typ von 'summe' ist steuerbar."""
    return json.dumps(
        {
            "type": "object",
            "properties": {
                "bestellungen": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"summe": {"type": summen_typ}},
                    },
                }
            },
        }
    )


def _buecherei_xsd(titel_typ: str) -> str:
    """Mini-XSD für typisch.xml; der Typ von 'titel' ist steuerbar."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="buecherei">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="buch" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="titel" type="{titel_typ}"/>
              <xs:element name="autor" type="xs:string"/>
              <xs:element name="preis">
                <xs:complexType>
                  <xs:simpleContent>
                    <xs:extension base="xs:decimal">
                      <xs:attribute name="waehrung" type="xs:string"/>
                    </xs:extension>
                  </xs:simpleContent>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
            <xs:attribute name="isbn" type="xs:string"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
      <xs:attribute name="eroeffnet" type="xs:integer"/>
    </xs:complexType>
  </xs:element>
</xs:schema>"""


def test_schema_inferenz_liefert_gueltiges_json_schema(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post("/api/analyse/schema", json={"dokument": {"inhalt_text": inhalt}})

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["art"] == "json_schema"
    schema = daten["schema"]
    Draft202012Validator.check_schema(schema)
    assert "bestellungen" in schema["properties"]


def test_schema_inferenz_tabelle_aus_csv(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("csv/typisch.csv").decode("utf-8")

    antwort = client.post(
        "/api/analyse/schema",
        json={
            "dokument": {"inhalt_text": inhalt, "dateiname": "typisch.csv"},
            "art": "table_schema",
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["art"] == "table_schema"
    felder = {feld["name"]: feld["typ"] for feld in daten["schema"]["felder"]}
    assert felder["kunde_seit"] == "date"
    assert felder["aktiv"] == "boolean"
    assert felder["name"] == "string"
    assert felder["umsatz"] == "string (leer erlaubt)"
    assert "Aus 6 Datensätzen abgeleitet" in daten["hinweise"]


def test_schema_inferenz_tabelle_auf_objekt_ist_400(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post(
        "/api/analyse/schema",
        json={"dokument": {"inhalt_text": inhalt}, "art": "table_schema"},
    )

    assert antwort.status_code == 400
    assert antwort.json()["fehler"]["code"] == "konvertierung_unmoeglich"


def test_validieren_json_schema_meldet_typfehler_mit_position(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post(
        "/api/analyse/validieren",
        json={
            "dokument": {"inhalt_text": inhalt},
            "schema_art": "json_schema",
            "schema_dokument": {"inhalt_text": _bestellungen_schema("string")},
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["gueltig"] is False
    assert len(daten["fehler"]) == 3
    erster = daten["fehler"][0]
    assert erster["pfad"] == "/bestellungen/0/summe"
    assert erster["position"] is not None
    assert erster["position"]["start"]["zeile"] > 0
    assert erster["meldung"] == "Zahl gefunden, Text erwartet"
    assert erster["schema_pfad"] == "/properties/bestellungen/items/properties/summe/type"


def test_validieren_json_schema_gueltig(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post(
        "/api/analyse/validieren",
        json={
            "dokument": {"inhalt_text": inhalt},
            "schema_art": "json_schema",
            "schema_dokument": {"inhalt_text": _bestellungen_schema("number")},
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["gueltig"] is True
    assert daten["fehler"] == []


def test_validieren_xsd_gueltig(client: TestClient, beispiel: Callable[[str], bytes]) -> None:
    inhalt = beispiel("xml/typisch.xml").decode("utf-8")

    antwort = client.post(
        "/api/analyse/validieren",
        json={
            "dokument": {"inhalt_text": inhalt},
            "schema_art": "xsd",
            "xsd_text": _buecherei_xsd("xs:string"),
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["gueltig"] is True
    assert daten["fehler"] == []


def test_validieren_xsd_meldet_verletzung(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("xml/typisch.xml").decode("utf-8")

    antwort = client.post(
        "/api/analyse/validieren",
        json={
            "dokument": {"inhalt_text": inhalt},
            "schema_art": "xsd",
            "xsd_text": _buecherei_xsd("xs:integer"),
        },
    )

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["gueltig"] is False
    assert daten["fehler"]
    erster = daten["fehler"][0]
    assert erster["meldung"]
    assert erster["pfad"] == "/buecherei/buch/0/titel"
    assert erster["position"] is not None
    assert erster["position"]["start"]["zeile"] == 5


def test_validieren_xsd_auf_json_ist_400(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post(
        "/api/analyse/validieren",
        json={
            "dokument": {"inhalt_text": inhalt},
            "schema_art": "xsd",
            "xsd_text": _buecherei_xsd("xs:string"),
        },
    )

    assert antwort.status_code == 400
    assert antwort.json()["fehler"]["code"] == "konvertierung_unmoeglich"


def test_statistik_typisch_json(client: TestClient, beispiel: Callable[[str], bytes]) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post("/api/analyse/statistik", json={"dokument": {"inhalt_text": inhalt}})

    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["knoten_gesamt"] > 20
    assert daten["max_tiefe"] == 5
    assert daten["groesse_bytes"] == len(inhalt.encode("utf-8"))
    assert sum(daten["typverteilung"].values()) == daten["knoten_gesamt"]
    assert daten["typverteilung"]["wahrheitswert"] == 3
    assert daten["typverteilung"]["null"] == 2
    schluessel = {eintrag["schluessel"] for eintrag in daten["schluessel_haeufigkeit"]}
    assert "artikel" in schluessel
    assert daten["zahlen_histogramme"]
    assert any(
        eintrag["pfad_muster"].startswith("/bestellungen/*/")
        for eintrag in daten["zahlen_histogramme"]
    )
    assert daten["groessenanteile"]
    assert daten["dauer_ms"] > 0


def test_muster_typisch_json(client: TestClient, beispiel: Callable[[str], bytes]) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    antwort = client.post("/api/analyse/muster", json={"dokument": {"inhalt_text": inhalt}})

    assert antwort.status_code == 200
    funde = {(fund["pfad_muster"], fund["muster"]): fund for fund in antwort.json()["funde"]}
    uuid_fund = funde[("/bestellungen/*/id", "uuid")]
    assert uuid_fund["abdeckung"] == 1.0
    assert uuid_fund["anzahl_werte"] == 3
    assert len(uuid_fund["beispiele"]) == 3
    assert ("/bestellungen/*/kunde/email", "email") in funde
    assert ("/bestellungen/*/kunde/kundeSeit", "iso_datum") in funde


def test_muster_enum_kandidat(client: TestClient) -> None:
    status_werte = [
        "offen", "in_arbeit", "erledigt", "offen", "offen",
        "in_arbeit", "erledigt", "offen", "in_arbeit",
    ]
    dokument = json.dumps([{"status": wert} for wert in status_werte])

    antwort = client.post("/api/analyse/muster", json={"dokument": {"inhalt_text": dokument}})

    assert antwort.status_code == 200
    funde = [fund for fund in antwort.json()["funde"] if fund["muster"] == "enum_kandidat"]
    assert len(funde) == 1
    fund = funde[0]
    assert fund["pfad_muster"] == "/*/status"
    assert fund["anzahl_werte"] == 9
    # abdeckung = Wiederholungsgrad (1 - verschieden/gesamt): 1 - 3/9 = 0.667
    assert fund["abdeckung"] == 0.667
    assert fund["enum_werte"] == ["erledigt", "in_arbeit", "offen"]
    assert fund["beispiele"] == ["offen", "in_arbeit", "erledigt"]


def test_muster_freies_feld_ist_kein_enum(client: TestClient) -> None:
    # Neun voellig verschiedene Werte sind KEINE Aufzaehlung (keine Wiederholung).
    namen = [f"Artikel {n}" for n in range(9)]
    dokument = json.dumps([{"artikel": name} for name in namen])

    antwort = client.post("/api/analyse/muster", json={"dokument": {"inhalt_text": dokument}})

    assert antwort.status_code == 200
    enums = [fund for fund in antwort.json()["funde"] if fund["muster"] == "enum_kandidat"]
    assert enums == []


def test_capabilities_enthaelt_die_analyzer(client: TestClient) -> None:
    antwort = client.get("/api/capabilities")

    assert antwort.status_code == 200
    analyzer = antwort.json()["analyzer"]
    ids = {eintrag["id"] for eintrag in analyzer}
    assert ids == {"muster", "schema_inferenz", "statistik", "validierung"}
    assert all(eintrag["name"] for eintrag in analyzer)
