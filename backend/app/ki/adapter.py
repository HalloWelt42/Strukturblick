"""Adapter für ein lokales, OpenAI-kompatibles Sprachmodell.

Ein Adapter, N Funktionen: alle KI-Aufrufe gehen durch strukturierte_antwort,
die eine strukturierte, gegen ein Pydantic-Modell validierte Antwort erzwingt
und liefert. Kein Streaming - einfache POST-Aufrufe, die die fertige, geprüfte
Struktur zurückgeben.

Robustheit steckt in zwei Achsen:

- Fallback-Kaskade des response_format, falls der Server das strengere Format
  ablehnt (HTTP 400): json_schema -> json_object (Schema als System-Text) ->
  Freitext mit json_repair vor der Validierung.
- Wiederholung (bis zu drei Versuche): scheitert das Auswerten, wird die
  Fehlermeldung als zusätzliche Nachricht angehängt und erneut gefragt.

SSRF-Schutz: die Basis-URL muss http/https sein und auf einen lokalen bzw.
privaten Host zeigen.
"""

from __future__ import annotations

import json
import time
from ipaddress import AddressValueError, IPv4Address, IPv6Address
from typing import Any
from urllib.parse import urlparse

import httpx
from json_repair import repair_json
from pydantic import BaseModel, ValidationError

from app import config
from app.fehler import KiAntwortUngueltig, KiNichtErreichbar
from app.modelle.ki import KiKontext, KiStatus

_MAX_VERSUCHE = 3
_STATUS_TIMEOUT_S = 3.0
_STATUS_CACHE_TTL_S = 10.0

# Modell-Ids, die nach Einbettung (Embedding) statt Chat aussehen - für die
# automatische Modellwahl übersprungen.
_EMBEDDING_HINWEISE = ("embed", "embedding")


class Nachricht(BaseModel):
    """Eine Chat-Nachricht (Rolle plus Inhalt) an das Sprachmodell."""

    rolle: str
    inhalt: str


def _sieht_wie_embedding_aus(modell_id: str) -> bool:
    kleingeschrieben = modell_id.lower()
    return any(hinweis in kleingeschrieben for hinweis in _EMBEDDING_HINWEISE)


def _pruefe_basis_url(basis_url: str) -> None:
    """SSRF-Schutz: nur http/https und lokale bzw. private Hosts zulassen."""
    zerlegt = urlparse(basis_url)
    if zerlegt.scheme not in ("http", "https"):
        raise KiNichtErreichbar(
            f"Die Basis-URL muss mit http oder https beginnen: {basis_url!r}",
            details={"basis_url": basis_url},
        )
    host = (zerlegt.hostname or "").lower()
    if not _host_ist_lokal(host):
        raise KiNichtErreichbar(
            "Aus Sicherheitsgründen sind nur lokale Adressen erlaubt (localhost, 127.*, "
            "192.168.*, 10.*, ::1).",
            details={"basis_url": basis_url, "host": host},
        )


def _host_ist_lokal(host: str) -> bool:
    if host in ("localhost", "::1"):
        return True
    try:
        adresse: IPv4Address | IPv6Address = IPv4Address(host)
    except AddressValueError:
        try:
            return IPv6Address(host).is_loopback
        except AddressValueError:
            return False
    if adresse.is_loopback:
        return True
    oktette = host.split(".")
    if oktette[0] == "10":
        return True
    return oktette[0] == "192" and len(oktette) > 1 and oktette[1] == "168"


class OpenAiKompatiblerAdapter:
    """Spricht /v1/models und /v1/chat/completions eines lokalen Sprachmodells.

    Der AsyncClient ist injizierbar, damit Tests einen httpx.MockTransport
    einschleusen und ohne echtes Modell laufen können.
    """

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client or httpx.AsyncClient(timeout=config.KI_TIMEOUT_S)
        self._status_cache: dict[str, tuple[float, KiStatus]] = {}

    async def status(self, basis_url: str) -> KiStatus:
        """Fragt /v1/models ab (kurzer Timeout, 10-s-Mikro-Cache je URL).

        Wirft nie: jeder Fehler landet als erreichbar=False im Rückgabewert.
        """
        jetzt = time.monotonic()
        gemerkt = self._status_cache.get(basis_url)
        if gemerkt is not None and jetzt - gemerkt[0] < _STATUS_CACHE_TTL_S:
            return gemerkt[1]

        try:
            _pruefe_basis_url(basis_url)
            antwort = await self._client.get(
                f"{basis_url.rstrip('/')}/v1/models", timeout=_STATUS_TIMEOUT_S
            )
            antwort.raise_for_status()
            modelle = _modell_ids(antwort.json())
            status = KiStatus(erreichbar=True, basis_url=basis_url, modelle=modelle)
        except Exception as fehler:  # bewusst breit: status wirft nie
            status = KiStatus(erreichbar=False, basis_url=basis_url, fehler=str(fehler))

        self._status_cache[basis_url] = (jetzt, status)
        return status

    async def _modell_bestimmen(self, kontext: KiKontext) -> str:
        if kontext.modell:
            return kontext.modell
        status = await self.status(kontext.basis_url)
        for modell_id in status.modelle:
            if not _sieht_wie_embedding_aus(modell_id):
                return modell_id
        if status.modelle:
            return status.modelle[0]
        raise KiNichtErreichbar(
            "Es konnte kein Modell bestimmt werden - der Server nennt keine Modelle.",
            details={"basis_url": kontext.basis_url},
        )

    async def strukturierte_antwort[T: BaseModel](
        self,
        kontext: KiKontext,
        nachrichten: list[Nachricht],
        antwort_typ: type[T],
    ) -> T:
        """Fragt das Modell und liefert eine gegen antwort_typ validierte Antwort.

        Fallback-Kaskade des response_format bei HTTP 400 des Servers, dazu bis
        zu drei Wiederholungen mit angehängter Fehlermeldung.
        """
        _pruefe_basis_url(kontext.basis_url)
        modell = await self._modell_bestimmen(kontext)
        schema = antwort_typ.model_json_schema()
        verlauf = [{"role": n.rolle, "content": n.inhalt} for n in nachrichten]

        letzter_fehler: str | None = None
        for stufe in _antwort_formate(antwort_typ.__name__, schema):
            versuchs_verlauf = list(verlauf)
            if stufe.schema_als_text:
                versuchs_verlauf = _schema_in_system(versuchs_verlauf, schema)
            for _ in range(_MAX_VERSUCHE):
                try:
                    roh = await self._chat(kontext, modell, versuchs_verlauf, stufe.response_format)
                except _ServerLehntFormatAb:
                    break  # nächste Fallback-Stufe versuchen
                text = stufe.aufbereiten(roh)
                try:
                    return antwort_typ.model_validate_json(text)
                except ValidationError as fehler:
                    letzter_fehler = str(fehler)
                    versuchs_verlauf = versuchs_verlauf + [
                        {
                            "role": "user",
                            "content": (
                                "Deine letzte Antwort ließ sich nicht auswerten. Fehler: "
                                f"{letzter_fehler}\nAntworte erneut, ausschließlich mit gültigem "
                                "JSON im geforderten Schema, ohne weiteren Text."
                            ),
                        }
                    ]

        raise KiAntwortUngueltig(
            "Die Antwort des Sprachmodells ließ sich auch nach Wiederholungen nicht auswerten.",
            details={"technisch": letzter_fehler},
        )

    async def _chat(
        self,
        kontext: KiKontext,
        modell: str,
        verlauf: list[dict[str, str]],
        response_format: dict[str, Any] | None,
    ) -> str:
        """Ein POST an /v1/chat/completions; liefert den Nachrichtentext."""
        rumpf: dict[str, Any] = {
            "model": modell,
            "messages": verlauf,
            "temperature": kontext.temperatur,
        }
        if response_format is not None:
            rumpf["response_format"] = response_format
        try:
            antwort = await self._client.post(
                f"{kontext.basis_url.rstrip('/')}/v1/chat/completions", json=rumpf
            )
        except httpx.HTTPError as fehler:
            raise KiNichtErreichbar(
                "Das lokale Sprachmodell ist nicht erreichbar.",
                details={"basis_url": kontext.basis_url, "technisch": str(fehler)},
            ) from fehler
        if antwort.status_code == 400:
            # Server lehnt das response_format ab -> Fallback-Stufe.
            raise _ServerLehntFormatAb(antwort.text)
        if antwort.status_code >= 500:
            raise KiNichtErreichbar(
                "Das lokale Sprachmodell meldet einen Serverfehler.",
                details={"status": antwort.status_code, "technisch": antwort.text},
            )
        antwort.raise_for_status()
        return _inhalt_aus_antwort(antwort.json())


class _ServerLehntFormatAb(Exception):
    """Der Server hat das response_format mit HTTP 400 abgelehnt."""


class _AntwortFormat(BaseModel):
    """Eine Stufe der Fallback-Kaskade: wie gefragt und wie ausgewertet wird."""

    response_format: dict[str, Any] | None
    schema_als_text: bool

    def aufbereiten(self, text: str) -> str:
        """Freitext-Stufe repariert vorher; strukturierte Stufen nehmen den Text direkt."""
        if self.response_format is None:
            repariert = repair_json(text)
            return repariert if isinstance(repariert, str) else json.dumps(repariert)
        return text


def _antwort_formate(name: str, schema: dict[str, Any]) -> list[_AntwortFormat]:
    """Die drei Stufen der Fallback-Kaskade in Reihenfolge."""
    return [
        _AntwortFormat(
            response_format={
                "type": "json_schema",
                "json_schema": {"name": name, "strict": True, "schema": schema},
            },
            schema_als_text=False,
        ),
        _AntwortFormat(response_format={"type": "json_object"}, schema_als_text=True),
        _AntwortFormat(response_format=None, schema_als_text=True),
    ]


def _schema_in_system(verlauf: list[dict[str, str]], schema: dict[str, Any]) -> list[dict[str, str]]:
    """Hängt das Schema als System-Nachricht an, wenn json_schema nicht erzwungen wird."""
    hinweis = (
        "Antworte ausschließlich mit einem einzigen JSON-Objekt, das exakt diesem "
        "JSON Schema genügt (kein Fließtext, keine Markdown-Umrandung):\n"
        + json.dumps(schema, ensure_ascii=False)
    )
    return [{"role": "system", "content": hinweis}, *verlauf]


def _modell_ids(daten: object) -> list[str]:
    """Liest die Modell-Ids aus einer /v1/models-Antwort."""
    if not isinstance(daten, dict):
        return []
    liste = daten.get("data")
    if not isinstance(liste, list):
        return []
    ids: list[str] = []
    for eintrag in liste:
        if isinstance(eintrag, dict):
            kennung = eintrag.get("id")
            if isinstance(kennung, str):
                ids.append(kennung)
    return ids


def _inhalt_aus_antwort(daten: object) -> str:
    """Zieht choices[0].message.content aus einer Chat-Completion-Antwort."""
    if not isinstance(daten, dict):
        raise KiAntwortUngueltig("Die Antwort des Sprachmodells hatte kein erwartetes Format.")
    auswahl = daten.get("choices")
    if not isinstance(auswahl, list) or not auswahl:
        raise KiAntwortUngueltig("Die Antwort des Sprachmodells enthielt keine Auswahl.")
    erste = auswahl[0]
    nachricht = erste.get("message") if isinstance(erste, dict) else None
    inhalt = nachricht.get("content") if isinstance(nachricht, dict) else None
    if not isinstance(inhalt, str):
        raise KiAntwortUngueltig("Die Antwort des Sprachmodells enthielt keinen Text.")
    return inhalt


# Prozessweiter Adapter - ein Modul-Singleton genügt.
adapter = OpenAiKompatiblerAdapter()
