"""Bestand von Strukturblick in der Datenbank der App: Dokumente und Arbeitsstand je Konto. Die einzige Stelle, die
SQL kennt. Jedes Konto sieht nur seine eigenen Dokumente."""

from __future__ import annotations

import json

from appkern.datenbank import Datenbank

from .modelle import Arbeitsstand, Dokument, Dokumentkopf

STUFEN = [
    """
    CREATE TABLE dokumente (
        konto TEXT NOT NULL,
        kennung TEXT NOT NULL,
        name TEXT NOT NULL,
        groesse INTEGER NOT NULL,
        geaendert TEXT NOT NULL,
        inhalt TEXT NOT NULL,
        PRIMARY KEY (konto, kennung)
    );
    CREATE INDEX dokumente_geaendert ON dokumente (konto, geaendert);
    CREATE TABLE arbeitsstaende (
        konto TEXT PRIMARY KEY,
        inhalt TEXT NOT NULL
    );
    """,
]


class Bestand:
    def __init__(self, db: Datenbank) -> None:
        self.db = db

    async def einrichten(self) -> None:
        await self.db.einrichten("strukturblick", STUFEN)

    async def liste(self, konto: str) -> list[Dokumentkopf]:
        zeilen = await self.db.zeilen(
            "SELECT kennung, name, groesse, geaendert FROM dokumente WHERE konto = ? ORDER BY geaendert DESC", (konto,))
        return [Dokumentkopf(**z) for z in zeilen]

    async def laden(self, konto: str, kennung: str) -> Dokument | None:
        z = await self.db.zeile("SELECT inhalt FROM dokumente WHERE konto = ? AND kennung = ?", (konto, kennung))
        return Dokument.model_validate_json(z["inhalt"]) if z else None

    async def speichern(self, konto: str, dok: Dokument) -> None:
        await self.db.ausfuehren(
            """INSERT INTO dokumente (konto, kennung, name, groesse, geaendert, inhalt) VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT (konto, kennung) DO UPDATE SET name = excluded.name, groesse = excluded.groesse,
               geaendert = excluded.geaendert, inhalt = excluded.inhalt""",
            (konto, dok.kennung, dok.name, len(dok.text), dok.geaendert, dok.model_dump_json()),
        )

    async def entfernen(self, konto: str, kennung: str) -> bool:
        return await self.db.ausfuehren("DELETE FROM dokumente WHERE konto = ? AND kennung = ?", (konto, kennung)) > 0

    async def arbeitsstand(self, konto: str) -> Arbeitsstand:
        z = await self.db.zeile("SELECT inhalt FROM arbeitsstaende WHERE konto = ?", (konto,))
        return Arbeitsstand.model_validate(json.loads(z["inhalt"])) if z else Arbeitsstand()

    async def arbeitsstand_speichern(self, konto: str, stand: Arbeitsstand) -> None:
        await self.db.ausfuehren(
            "INSERT INTO arbeitsstaende (konto, inhalt) VALUES (?, ?) ON CONFLICT (konto) DO UPDATE SET inhalt = excluded.inhalt",
            (konto, stand.model_dump_json()),
        )
