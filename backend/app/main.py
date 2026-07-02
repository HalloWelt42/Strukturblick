"""App-Fabrik: Middleware, Fehler-Handler, Modul-Discovery, Router."""

from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app import config, registry
from app.fehler import registriere_fehler_handler
from app.routers import abfrage, analyse, dokumente, generieren, ki, system, transform


def create_app() -> FastAPI:
    app = FastAPI(
        title="Strukturblick",
        version=config.APP_VERSION,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.FRONTEND_URSPRUENGE),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_id_und_limit(request: Request, call_next) -> Response:  # type: ignore[no-untyped-def]
        request.state.request_id = uuid4()
        inhaltslaenge = request.headers.get("content-length")
        if inhaltslaenge is not None and inhaltslaenge.isdigit():
            # Grobfilter vor dem Einlesen; die feine Prüfung je Dokument macht der Router.
            if int(inhaltslaenge) > config.MAX_DOKUMENT_BYTES * 2:
                from fastapi.responses import JSONResponse

                from app.modelle.gemeinsam import FehlerAntwort, FehlerDetail

                detail = FehlerDetail(
                    code="limit_ueberschritten",
                    meldung="Die Anfrage ist zu groß.",
                    request_id=request.state.request_id,
                )
                return JSONResponse(status_code=413, content=FehlerAntwort(fehler=detail).model_dump(mode="json"))
        antwort: Response = await call_next(request)
        antwort.headers.setdefault("X-Request-Id", str(request.state.request_id))
        return antwort

    registriere_fehler_handler(app)
    registry.entdecke_module()

    app.include_router(system.router, prefix="/api")
    app.include_router(dokumente.router, prefix="/api")
    app.include_router(analyse.router, prefix="/api")
    app.include_router(abfrage.router, prefix="/api")
    app.include_router(transform.router, prefix="/api")
    app.include_router(generieren.router, prefix="/api")
    app.include_router(ki.router, prefix="/api")
    return app


app = create_app()
