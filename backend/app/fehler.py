"""Fehlertaxonomie und FastAPI-Exception-Handler.

Jede fachliche Ausnahme trägt einen stabilen Maschinen-Code und einen HTTP-Status;
die Handler formen alles in das einheitliche FehlerAntwort-Modell um.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.modelle.gemeinsam import FehlerAntwort, FehlerDetail, JsonWert, QuellSpanne


class StrukturblickFehler(Exception):
    """Basis aller fachlichen Fehler."""

    code: str = "intern"
    status: int = 500

    def __init__(
        self,
        meldung: str,
        *,
        pfad: str | None = None,
        position: QuellSpanne | None = None,
        details: dict[str, JsonWert] | None = None,
    ) -> None:
        super().__init__(meldung)
        self.meldung = meldung
        self.pfad = pfad
        self.position = position
        self.details: dict[str, JsonWert] = details or {}


class ParseFehler(StrukturblickFehler):
    code = "parse_fehler"
    status = 400


class FormatUnbekannt(StrukturblickFehler):
    code = "format_unbekannt"
    status = 400


class AbfrageSyntaxFehler(StrukturblickFehler):
    code = "abfrage_syntaxfehler"
    status = 400


class ModulUnbekannt(StrukturblickFehler):
    code = "modul_unbekannt"
    status = 404


class DokumentNichtImCache(StrukturblickFehler):
    code = "dokument_nicht_im_cache"
    status = 410


class LimitUeberschritten(StrukturblickFehler):
    code = "limit_ueberschritten"
    status = 413


class KonvertierungUnmoeglich(StrukturblickFehler):
    code = "konvertierung_unmoeglich"
    status = 400


class KiNichtErreichbar(StrukturblickFehler):
    """Das lokale Sprachmodell antwortet nicht (Verbindungs- oder Netzwerkfehler)."""

    code = "ki_nicht_erreichbar"
    status = 502


class KiAntwortUngueltig(StrukturblickFehler):
    """Die Antwort des Sprachmodells ließ sich auch nach Wiederholungen nicht auswerten."""

    code = "ki_antwort_ungueltig"
    status = 502


def _request_id(request: Request) -> UUID:
    kennung = getattr(request.state, "request_id", None)
    return kennung if isinstance(kennung, UUID) else uuid4()


def _antwort(request: Request, status: int, detail: FehlerDetail) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=FehlerAntwort(fehler=detail).model_dump(mode="json"),
        headers={"X-Request-Id": str(detail.request_id)},
    )


def registriere_fehler_handler(app: FastAPI) -> None:
    @app.exception_handler(StrukturblickFehler)
    async def fachlicher_fehler(request: Request, exc: StrukturblickFehler) -> JSONResponse:
        detail = FehlerDetail(
            code=exc.code,
            meldung=exc.meldung,
            pfad=exc.pfad,
            position=exc.position,
            details=exc.details,
            request_id=_request_id(request),
        )
        return _antwort(request, exc.status, detail)

    @app.exception_handler(RequestValidationError)
    async def eingabe_fehler(request: Request, exc: RequestValidationError) -> JSONResponse:
        # exc.errors() kann rohe Exception-Objekte tragen (ctx.error bei model_validator) -
        # erst JSON-fähig machen, sonst scheitert der Bau des FehlerDetail-Modells.
        felder = jsonable_encoder(exc.errors(), custom_encoder={Exception: str})
        einzelheiten: dict[str, Any] = {"felder": felder}
        detail = FehlerDetail(
            code="eingabe_ungueltig",
            meldung="Die Anfrage ist ungültig - Details unter 'felder'.",
            details=einzelheiten,
            request_id=_request_id(request),
        )
        return _antwort(request, 422, detail)

    @app.exception_handler(Exception)
    async def unerwarteter_fehler(request: Request, exc: Exception) -> JSONResponse:
        detail = FehlerDetail(
            code="intern",
            meldung="Unerwarteter Fehler im Backend.",
            details={"art": type(exc).__name__},
            request_id=_request_id(request),
        )
        return _antwort(request, 500, detail)
