"""Unit-Tests des spezifikations-getriebenen Testdaten-Generators.

Geprüft werden die Ableitung plausibler Erzeuger, die Determinismus- und
Blockstabilitäts-Garantien sowie die Strukturtreue zur Schablone (vorlage).
"""

from __future__ import annotations

from typing import Any

from app.generatoren.testdaten import (
    erzeuge_datensaetze,
    erzeuger_arten_infos,
    leite_spezifikation_ab,
)
from app.kern.dokument import GeparstesDokument
from app.modelle.gemeinsam import FormatId, JsonWert
from app.modelle.testdaten import FeldErzeuger, Spezifikation


def _dok(wurzel: JsonWert) -> GeparstesDokument:
    return GeparstesDokument(format_id=FormatId.JSON, wurzel=wurzel)


_BEISPIEL_LISTE: list[Any] = [
    {
        "nummer": "B-2026-0412",
        "kunde": {"name": "Erika Musterfrau", "email": "erika@beispiel.de"},
        "summe": 68.3,
        "aktiv": True,
        "kundeSeit": "2017-04-22",
    },
    {
        "nummer": "B-2026-0099",
        "kunde": {"name": "Max Mustermann", "email": "max@beispiel.de"},
        "summe": 12.0,
        "aktiv": False,
        "kundeSeit": "2020-01-01",
    },
]


def _erzeuger_je_pfad(spez: Spezifikation) -> dict[str, str]:
    return {feld.pfad_muster: feld.erzeuger for feld in spez.felder}


# --- Ableitung liefert plausible Erzeuger -----------------------------------


def test_ableitung_erkennt_typische_erzeuger() -> None:
    spez = leite_spezifikation_ab(_dok(_BEISPIEL_LISTE))
    je_pfad = _erzeuger_je_pfad(spez)

    assert je_pfad["/nummer"] == "muster"
    assert je_pfad["/kunde/name"] == "personenname"
    assert je_pfad["/kunde/email"] == "email"
    assert je_pfad["/summe"] == "dezimalzahl"
    assert je_pfad["/aktiv"] == "wahrheitswert"
    assert je_pfad["/kundeSeit"] == "datum"


def test_ableitung_muster_vorlage_hat_ziffern_und_buchstaben() -> None:
    spez = leite_spezifikation_ab(_dok(_BEISPIEL_LISTE))
    nummer = next(f for f in spez.felder if f.pfad_muster == "/nummer")

    vorlage = nummer.parameter["vorlage"]
    assert isinstance(vorlage, str)
    assert "#" in vorlage  # Ziffern -> #
    assert "?" in vorlage  # Buchstaben -> ?


def test_ableitung_email_wird_aus_name_abgeleitet() -> None:
    spez = leite_spezifikation_ab(_dok(_BEISPIEL_LISTE))
    email = next(f for f in spez.felder if f.pfad_muster == "/kunde/email")

    assert email.parameter.get("aus_feld") == "/kunde/name"


def test_ableitung_ganzzahl_bei_ganzzahligen_werten() -> None:
    spez = leite_spezifikation_ab(_dok([{"anzahl": 3}, {"anzahl": 9}, {"anzahl": 5}]))
    anzahl = next(f for f in spez.felder if f.pfad_muster == "/anzahl")

    assert anzahl.erzeuger == "ganzzahl"
    assert anzahl.parameter == {"min": 3, "max": 9}


def test_ableitung_uuid_wird_erkannt() -> None:
    kennung = "550e8400-e29b-41d4-a716-446655440000"
    spez = leite_spezifikation_ab(_dok([{"id": kennung}, {"id": kennung}]))
    feld = next(f for f in spez.felder if f.pfad_muster == "/id")

    assert feld.erzeuger == "uuid"


def test_ableitung_niedrige_kardinalitaet_wird_kategorie() -> None:
    datensaetze = [{"status": "offen"} for _ in range(6)] + [
        {"status": "bezahlt"} for _ in range(6)
    ]
    spez = leite_spezifikation_ab(_dok(datensaetze))
    status = next(f for f in spez.felder if f.pfad_muster == "/status")

    assert status.erzeuger == "kategorie"
    assert set(status.parameter["werte"]) == {"offen", "bezahlt"}  # type: ignore[arg-type]


def test_ableitung_wurzelobjekt_ist_datensatz() -> None:
    spez = leite_spezifikation_ab(_dok({"titel": "Konfiguration", "aktiv": True}))
    je_pfad = _erzeuger_je_pfad(spez)

    assert je_pfad["/aktiv"] == "wahrheitswert"
    assert isinstance(spez.vorlage, dict)
    assert set(spez.vorlage) == {"titel", "aktiv"}


# --- Determinismus und Blockstabilität --------------------------------------


def test_erzeugung_ist_deterministisch() -> None:
    spez = leite_spezifikation_ab(_dok(_BEISPIEL_LISTE))

    assert erzeuge_datensaetze(spez, 5, 42, 0) == erzeuge_datensaetze(spez, 5, 42, 0)


def test_bloecke_sind_stabil() -> None:
    spez = leite_spezifikation_ab(_dok(_BEISPIEL_LISTE))

    ganz = erzeuge_datensaetze(spez, 200, 42, 0)
    block_eins = erzeuge_datensaetze(spez, 100, 42, 0)
    block_zwei = erzeuge_datensaetze(spez, 100, 42, 100)

    assert block_eins + block_zwei == ganz


def test_offset_verschiebt_den_block() -> None:
    spez = leite_spezifikation_ab(_dok(_BEISPIEL_LISTE))
    ganz = erzeuge_datensaetze(spez, 10, 7, 0)

    assert erzeuge_datensaetze(spez, 5, 7, 5) == ganz[5:]


def test_anderer_seed_andere_daten() -> None:
    spez = leite_spezifikation_ab(_dok(_BEISPIEL_LISTE))

    assert erzeuge_datensaetze(spez, 5, 1, 0) != erzeuge_datensaetze(spez, 5, 2, 0)


# --- Strukturtreue ----------------------------------------------------------


def test_datensatz_struktur_entspricht_vorlage() -> None:
    spez = leite_spezifikation_ab(_dok(_BEISPIEL_LISTE))
    (datensatz,) = erzeuge_datensaetze(spez, 1, 42, 0)

    assert isinstance(datensatz, dict)
    assert set(datensatz) == {"nummer", "kunde", "summe", "aktiv", "kundeSeit"}
    assert isinstance(datensatz["kunde"], dict)
    assert set(datensatz["kunde"]) == {"name", "email"}


def test_verschachtelte_liste_erhaelt_schablonen_laenge() -> None:
    wurzel = {"posten": [{"artikel": "A"}, {"artikel": "B"}, {"artikel": "C"}]}
    spez = leite_spezifikation_ab(_dok(wurzel))
    (datensatz,) = erzeuge_datensaetze(spez, 1, 42, 0)

    # Die Schablone reduziert die Liste auf ein Element -> genau ein Posten.
    assert isinstance(datensatz, dict)
    assert isinstance(datensatz["posten"], list)
    assert len(datensatz["posten"]) == 1


# --- Erzeuger-Ausführung robust ---------------------------------------------


def test_kategorie_erzeuger_waehlt_aus_werten() -> None:
    spez = Spezifikation(
        felder=[
            FeldErzeuger(
                pfad_muster="/status",
                erzeuger="kategorie",
                parameter={"werte": ["a", "b", "c"]},
            )
        ],
        vorlage={"status": "?"},
    )
    for datensatz in erzeuge_datensaetze(spez, 20, 42, 0):
        assert isinstance(datensatz, dict)
        assert datensatz["status"] in ("a", "b", "c")


def test_selbstauskunft_deckt_alle_arten() -> None:
    infos = erzeuger_arten_infos()
    ids = {info.id for info in infos}

    assert "muster" in ids
    assert "dezimalzahl" in ids
    dezimal = next(info for info in infos if info.id == "dezimalzahl")
    assert dezimal.parameter == ["min", "max", "nachkommastellen"]
