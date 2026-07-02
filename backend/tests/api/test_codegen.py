"""API-Tests der Codegenerierung: TypeScript, Pydantic v2, dataclasses, PHP 8.4+."""

from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def _codegen(client: TestClient, inhalt: str, ziel: str) -> dict[str, object]:
    antwort = client.post(
        "/api/transform/codegen",
        json={"dokument": {"inhalt_text": inhalt}, "ziel": ziel},
    )
    assert antwort.status_code == 200
    daten: dict[str, object] = antwort.json()
    return daten


def test_codegen_typescript_interfaces(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    daten = _codegen(client, inhalt, "typescript")

    assert daten["ziel"] == "typescript"
    assert daten["dateiendung"] == "ts"
    code = daten["code"]
    assert isinstance(code, str)
    assert "export interface Wurzel" in code
    assert "export interface Bestellung" in code
    assert "export interface Kunde" in code
    # lieferdatum ist optional (kommt einmal als null vor) und darf null sein.
    assert "lieferdatum?: string | null;" in code


def test_codegen_pydantic_v2(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    daten = _codegen(client, inhalt, "pydantic_v2")

    assert daten["ziel"] == "pydantic_v2"
    assert daten["dateiendung"] == "py"
    code = daten["code"]
    assert isinstance(code, str)
    assert "from pydantic import BaseModel" in code
    assert "class Wurzel(BaseModel)" in code
    assert "class Kunde(BaseModel)" in code
    assert "lieferdatum: str | None = None" in code


def test_codegen_dataclasses(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    daten = _codegen(client, inhalt, "dataclasses")

    assert daten["ziel"] == "dataclasses"
    assert daten["dateiendung"] == "py"
    code = daten["code"]
    assert isinstance(code, str)
    assert "from dataclasses import dataclass" in code
    assert "@dataclass" in code
    assert "class Kunde:" in code


def test_codegen_php_84(
    client: TestClient, beispiel: Callable[[str], bytes]
) -> None:
    inhalt = beispiel("json/typisch.json").decode("utf-8")

    daten = _codegen(client, inhalt, "php_84")

    assert daten["ziel"] == "php_84"
    assert daten["dateiendung"] == "php"
    code = daten["code"]
    assert isinstance(code, str)
    assert code.startswith("<?php")
    assert "declare(strict_types=1);" in code
    assert "final class Wurzel" in code
    assert "public readonly" in code
    assert "public static function fromArray(array $data): self" in code
    # lieferdatum ist optional -> nullable Typdeklaration.
    assert "?string $lieferdatum = null" in code


def test_codegen_wurzelname_wird_uebernommen(client: TestClient) -> None:
    antwort = client.post(
        "/api/transform/codegen",
        json={
            "dokument": {"inhalt_text": '{"a": 1}'},
            "ziel": "typescript",
            "wurzelname": "Konfiguration",
        },
    )

    assert antwort.status_code == 200
    assert "export interface Konfiguration" in antwort.json()["code"]


def test_codegen_gemischte_liste_meldet_warnung(client: TestClient) -> None:
    # Ein Feld mit gemischten primitiven Typen wird zu 'any' mit Warnung.
    inhalt = '{"werte": [1, "zwei", true]}'

    daten = _codegen(client, inhalt, "typescript")

    code = daten["code"]
    assert isinstance(code, str)
    assert "werte: unknown[];" in code
    warnungen = daten["warnungen"]
    assert isinstance(warnungen, list)
    assert any("gemischte Typen" in str(warnung) for warnung in warnungen)


def test_codegen_liste_von_objekten_als_wurzel(client: TestClient) -> None:
    # Tabellarische Wurzel (Liste von Objekten) -> Wurzeltyp mit Feldern.
    inhalt = '[{"name": "Erika", "alter": 30}, {"name": "Sönke", "alter": 41}]'

    daten = _codegen(client, inhalt, "typescript")

    code = daten["code"]
    assert isinstance(code, str)
    assert "export interface Wurzel" in code
    assert "name: string;" in code
    assert "alter: number;" in code
