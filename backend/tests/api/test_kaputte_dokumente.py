"""Kaputte-Dokumente-Suite: jeder Defekt muss zu einem sauberen Fehler führen.

Zentrale Zusicherung: Egal wie ein Dokument kaputt ist - das Backend darf NIEMALS
mit einem 500er oder einem Absturz reagieren. Entweder das jeweilige Format
toleriert den Defekt bewusst (dann 200 mit Warnungen), oder es meldet ihn als
sauberen fachlichen Fehler (HTTP 4xx mit stabilem Code und nicht-leerer Meldung).

Der parametrisierte Kern liest ALLE Dateien unter tests/beispiele/*/kaputte/ per
Glob ein und parst jede mit ihrem beabsichtigten Format (aus dem Ordnernamen
abgeleitet). Ergänzt wird das um gezielte Einzeltests zur Reparatur.
"""

from __future__ import annotations

import base64
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.modelle.gemeinsam import FormatId

BEISPIELE_WURZEL = Path(__file__).resolve().parent.parent / "beispiele"

# Ordnername (unter tests/beispiele/<ordner>/kaputte/) -> beabsichtigtes Format.
# So wird jede Datei genau als das Format geparst, als das sie kaputt ist -
# ohne dass die Formaterkennung eine defekte Datei fälschlich anders einordnet.
ORDNER_FORMAT: dict[str, FormatId] = {
    "json": FormatId.JSON,
    "ndjson": FormatId.NDJSON,
    "yaml": FormatId.YAML,
    "toml": FormatId.TOML,
    "xml": FormatId.XML,
    "csv": FormatId.CSV,
    "md": FormatId.MD_TABELLE,
    "html": FormatId.HTML_TABELLE,
}

# Formate, die eine Quellposition tragen: hier muss ein harter Fehler zusätzlich
# eine Sprungmarke (position oder pfad) liefern. Tabellenformate ohne Zeilenbezug
# (md/html "keine Tabelle gefunden") bleiben bewusst positionslos.
POSITIONSFORMATE: frozenset[FormatId] = frozenset(
    {FormatId.JSON, FormatId.NDJSON, FormatId.YAML, FormatId.TOML, FormatId.XML}
)

# Dateien, deren Defekt das Format bewusst TOLERIERT (Antwort 200 mit Warnungen)
# statt ihn als Fehler zu melden. Beispiele: CSV gleicht Spaltenzahlen aus und
# liest über unbeendete Anführungszeichen hinweg; NDJSON überspringt einzelne
# defekte Zeilen, solange mindestens eine Zeile gültig bleibt; die JSON-Engine
# repariert JSON5/JSONC-Kleinigkeiten (etwa ungültige Escapes) im Tolerant-Modus.
# Für diese Fälle gilt nur die Grundregel "kein 500", nicht die 4xx-Zusicherung.
TOLERIERTE_DEFEKTE: frozenset[str] = frozenset(
    {
        "csv/kaputte/ragged.csv",
        "csv/kaputte/quote_unbeendet.csv",
        "json/kaputte/ungueltiges_escape.json",
        "ndjson/kaputte/zeile_defekt.ndjson",
        "ndjson/kaputte/leere_und_gemischte_zeile.ndjson",
    }
)


def _alle_kaputten_dateien() -> list[Path]:
    return sorted(BEISPIELE_WURZEL.glob("*/kaputte/*"))


def _relativ(pfad: Path) -> str:
    return pfad.relative_to(BEISPIELE_WURZEL).as_posix()


def _format_der_datei(pfad: Path) -> FormatId:
    # Struktur: .../beispiele/<ordner>/kaputte/<datei>
    ordner = pfad.parts[-3]
    return ORDNER_FORMAT[ordner]


def _parse_anfrage(pfad: Path) -> dict[str, object]:
    """Baut den Anfrage-Body: Text, wenn UTF-8-lesbar, sonst Base64."""
    roh = pfad.read_bytes()
    format_id = _format_der_datei(pfad).value
    try:
        return {"inhalt_text": roh.decode("utf-8"), "format_id": format_id}
    except UnicodeDecodeError:
        return {"inhalt_base64": base64.b64encode(roh).decode("ascii"), "format_id": format_id}


KAPUTTE_DATEIEN = _alle_kaputten_dateien()
KAPUTTE_IDS = [_relativ(p) for p in KAPUTTE_DATEIEN]


def test_es_gibt_kaputte_beispiele_zu_pruefen() -> None:
    """Absicherung, dass der Glob überhaupt Dateien findet (kein leerer Lauf)."""
    assert KAPUTTE_DATEIEN, "Keine kaputten Beispieldateien gefunden"
    # Jedes bekannte Format soll mindestens einen Defekt beitragen.
    gefundene_ordner = {p.parts[-3] for p in KAPUTTE_DATEIEN}
    assert gefundene_ordner == set(ORDNER_FORMAT), gefundene_ordner


@pytest.mark.parametrize("pfad", KAPUTTE_DATEIEN, ids=KAPUTTE_IDS)
def test_kaputtes_dokument_niemals_500(client: TestClient, pfad: Path) -> None:
    """Kein Defekt darf einen 500er oder Absturz auslösen - egal welches Format."""
    antwort = client.post("/api/dokumente/parsen", json=_parse_anfrage(pfad))

    assert antwort.status_code != 500, (
        f"{_relativ(pfad)} löste einen 500er aus: {antwort.text}"
    )
    # Antwort muss immer eine sinnvolle, auswertbare Struktur haben.
    daten = antwort.json()
    if antwort.status_code == 200:
        # Bewusst toleriert: dann muss es ein sauber geparstes Dokument sein.
        assert "dokument_hash" in daten
        assert daten["format_id"] == _format_der_datei(pfad).value
    else:
        assert 400 <= antwort.status_code < 500
        assert "fehler" in daten


@pytest.mark.parametrize("pfad", KAPUTTE_DATEIEN, ids=KAPUTTE_IDS)
def test_kaputtes_dokument_sauberer_fehler(client: TestClient, pfad: Path) -> None:
    """Harte Defekte: sauberer 4xx-Fehler mit Code und nicht-leerer Meldung.

    Wo das Format Positionen trägt, muss zusätzlich eine Sprungmarke gesetzt sein
    (position oder pfad). Bewusst tolerierte Defekte werden hier übersprungen.
    """
    if _relativ(pfad) in TOLERIERTE_DEFEKTE:
        pytest.skip("Dieser Defekt wird vom Format bewusst toleriert (siehe Toleranz-Test)")

    antwort = client.post("/api/dokumente/parsen", json=_parse_anfrage(pfad))

    assert 400 <= antwort.status_code < 500, (
        f"{_relativ(pfad)} sollte ein 4xx sein, war {antwort.status_code}: {antwort.text}"
    )
    fehler = antwort.json()["fehler"]
    assert fehler["code"], "Fehlercode darf nicht leer sein"
    assert fehler["meldung"].strip(), "Fehlermeldung darf nicht leer sein"

    if _format_der_datei(pfad) in POSITIONSFORMATE:
        assert fehler["position"] is not None or fehler["pfad"] is not None, (
            f"{_relativ(pfad)} trägt keine Sprungmarke (weder position noch pfad)"
        )
        if fehler["position"] is not None:
            # Die Sprungmarke muss auf eine reale Zeile (>= 1) zeigen.
            assert fehler["position"]["start"]["zeile"] >= 1


@pytest.mark.parametrize(
    "relativ_pfad",
    sorted(TOLERIERTE_DEFEKTE),
)
def test_tolerierter_defekt_liefert_200_mit_warnung(
    client: TestClient, relativ_pfad: str
) -> None:
    """Bewusst tolerierte Defekte: 200, geparst, und ein Hinweis in den Warnungen."""
    pfad = BEISPIELE_WURZEL / relativ_pfad
    antwort = client.post("/api/dokumente/parsen", json=_parse_anfrage(pfad))

    assert antwort.status_code == 200, antwort.text
    daten = antwort.json()
    assert daten["format_id"] == _format_der_datei(pfad).value
    # Ein tolerierter Defekt soll sich immer in einer Warnung niederschlagen
    # (Transparenz) - auch ein unbeendetes CSV-Anführungszeichen, das der Reader
    # sonst still verschlucken würde.
    assert daten["warnungen"], f"{relativ_pfad} toleriert still, ohne Warnung"


# --- Reparatur: JSON schlägt vor, Nicht-JSON lehnt sauber ab ----------------


@pytest.mark.parametrize(
    "relativ_pfad",
    [
        "json/kaputte/fehlendes_komma.json",
        "json/kaputte/nicht_geschlossen.json",
        "json/kaputte/fuehrende_null.json",
    ],
)
def test_reparatur_liefert_fuer_json_einen_vorschlag(
    client: TestClient, relativ_pfad: str
) -> None:
    """Für kaputte JSON-Fälle muss die Reparatur einen gültigen Vorschlag liefern."""
    inhalt = (BEISPIELE_WURZEL / relativ_pfad).read_text(encoding="utf-8")

    antwort = client.post(
        "/api/transform/reparatur",
        json={"dokument": {"inhalt_text": inhalt, "format_id": "json"}},
    )

    assert antwort.status_code == 200, antwort.text
    daten = antwort.json()
    assert daten["reparierbar"] is True
    assert daten["veraendert"] is True
    # Der Vorschlag muss sich wieder als striktes JSON lesen lassen.
    import json as _json

    _json.loads(daten["ergebnis_text"])
    assert daten["diff_unified"] != ""


@pytest.mark.parametrize(
    "format_id,dateiname",
    [
        (FormatId.YAML, "kaputt.yaml"),
        (FormatId.XML, "kaputt.xml"),
        (FormatId.TOML, "kaputt.toml"),
    ],
)
def test_reparatur_lehnt_nicht_json_sauber_ab(
    client: TestClient, format_id: FormatId, dateiname: str
) -> None:
    """Für Nicht-JSON-Formate lehnt die Reparatur sauber ab (200, nicht reparierbar)."""
    antwort = client.post(
        "/api/transform/reparatur",
        json={
            "dokument": {"inhalt_text": "irgendein: inhalt\n", "format_id": format_id.value},
        },
    )

    assert antwort.status_code == 200, antwort.text
    daten = antwort.json()
    assert daten["reparierbar"] is False
    assert daten["veraendert"] is False
    assert daten["aenderungen"], "Die Ablehnung soll einen erklärenden Hinweis tragen"
