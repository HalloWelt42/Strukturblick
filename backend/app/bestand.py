"""Bestand von Strukturblick in der Datenbank der App: Dokumente und Arbeitsstand je Konto. Die einzige Stelle, die
SQL kennt. Jedes Konto sieht nur seine eigenen Dokumente."""

from __future__ import annotations

import json
from datetime import datetime, timedelta

from appkern.datenbank import Datenbank

from .modelle import Arbeitsstand, Dokument, Dokumentkopf, Papierkorbeintrag

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
    # Stufe 2 (STB-18): Ordner eine Ebene tief und Papierkorb
    """
    ALTER TABLE dokumente ADD COLUMN ordner TEXT NOT NULL DEFAULT '';
    ALTER TABLE dokumente ADD COLUMN geloescht TEXT NOT NULL DEFAULT '';
    CREATE TABLE ordner (
        konto TEXT NOT NULL,
        name TEXT NOT NULL,
        PRIMARY KEY (konto, name)
    );
    """,
]

#: So lange bleibt ein entferntes Dokument im Papierkorb
PAPIERKORB_TAGE = 30


class Ablagefehler(Exception):
    """Fachlicher Fehler (Ordner nicht leer, Name doppelt); die Schnittstelle antwortet mit 409."""


def _jetzt() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


class Bestand:
    def __init__(self, db: Datenbank) -> None:
        self.db = db

    async def einrichten(self) -> None:
        await self.db.einrichten("strukturblick", STUFEN)

    async def liste(self, konto: str) -> list[Dokumentkopf]:
        zeilen = await self.db.zeilen(
            "SELECT kennung, name, ordner, groesse, geaendert FROM dokumente WHERE konto = ? AND geloescht = '' "
            "ORDER BY geaendert DESC", (konto,))
        return [Dokumentkopf(**z) for z in zeilen]

    async def laden(self, konto: str, kennung: str) -> Dokument | None:
        z = await self.db.zeile("SELECT inhalt, name, ordner FROM dokumente WHERE konto = ? AND kennung = ? AND geloescht = ''",
                                (konto, kennung))
        if not z:
            return None
        # Name und Ordner gelten aus den Spalten (Umbenennen und Verschieben ändern nur sie)
        return Dokument.model_validate_json(z["inhalt"]).model_copy(update={"name": z["name"], "ordner": z["ordner"]})

    async def speichern(self, konto: str, dok: Dokument) -> None:
        await self.db.ausfuehren(
            """INSERT INTO dokumente (konto, kennung, name, ordner, groesse, geaendert, inhalt) VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (konto, kennung) DO UPDATE SET name = excluded.name, ordner = excluded.ordner,
               groesse = excluded.groesse, geaendert = excluded.geaendert, inhalt = excluded.inhalt, geloescht = ''""",
            (konto, dok.kennung, dok.name, dok.ordner, len(dok.text), dok.geaendert, dok.model_dump_json()),
        )

    async def aendern(self, konto: str, kennung: str, name: str | None, ordner: str | None) -> bool:
        teile = [(f, w) for f, w in (("name", name), ("ordner", ordner)) if w is not None]
        if not teile:
            return True
        setzen = ", ".join(f"{f} = ?" for f, _ in teile)
        return await self.db.ausfuehren(f"UPDATE dokumente SET {setzen} WHERE konto = ? AND kennung = ? AND geloescht = ''",
                                        (*[w for _, w in teile], konto, kennung)) > 0

    async def entfernen(self, konto: str, kennung: str) -> bool:
        """In den Papierkorb."""
        return await self.db.ausfuehren("UPDATE dokumente SET geloescht = ? WHERE konto = ? AND kennung = ? AND geloescht = ''",
                                        (_jetzt(), konto, kennung)) > 0

    async def papierkorb(self, konto: str) -> list[Papierkorbeintrag]:
        grenze = (datetime.now().astimezone() - timedelta(days=PAPIERKORB_TAGE)).isoformat(timespec="seconds")
        await self.db.ausfuehren("DELETE FROM dokumente WHERE konto = ? AND geloescht != '' AND geloescht < ?", (konto, grenze))
        zeilen = await self.db.zeilen(
            "SELECT kennung, name, ordner, groesse, geaendert, geloescht FROM dokumente WHERE konto = ? AND geloescht != '' "
            "ORDER BY geloescht DESC", (konto,))
        return [Papierkorbeintrag(**z) for z in zeilen]

    async def wiederherstellen(self, konto: str, kennung: str) -> bool:
        return await self.db.ausfuehren("UPDATE dokumente SET geloescht = '' WHERE konto = ? AND kennung = ? AND geloescht != ''",
                                        (konto, kennung)) > 0

    async def endgueltig_entfernen(self, konto: str, kennung: str) -> bool:
        return await self.db.ausfuehren("DELETE FROM dokumente WHERE konto = ? AND kennung = ? AND geloescht != ''",
                                        (konto, kennung)) > 0

    async def ordner(self, konto: str) -> list[str]:
        zeilen = await self.db.zeilen(
            "SELECT name FROM ordner WHERE konto = ? UNION SELECT ordner FROM dokumente WHERE konto = ? AND ordner != ''",
            (konto, konto))
        return sorted((z["name"] for z in zeilen), key=str.casefold)

    async def ordner_anlegen(self, konto: str, name: str) -> None:
        if name in await self.ordner(konto):
            raise Ablagefehler(f"Den Ordner {name} gibt es schon")
        await self.db.ausfuehren("INSERT INTO ordner (konto, name) VALUES (?, ?)", (konto, name))

    async def ordner_umbenennen(self, konto: str, alt: str, neu: str) -> None:
        vorhanden = await self.ordner(konto)
        if alt not in vorhanden:
            raise Ablagefehler(f"Den Ordner {alt} gibt es nicht")
        if neu in vorhanden:
            raise Ablagefehler(f"Den Ordner {neu} gibt es schon")
        await self.db.ausfuehren("UPDATE dokumente SET ordner = ? WHERE konto = ? AND ordner = ?", (neu, konto, alt))
        await self.db.ausfuehren("DELETE FROM ordner WHERE konto = ? AND name = ?", (konto, alt))
        await self.db.ausfuehren("INSERT INTO ordner (konto, name) VALUES (?, ?)", (konto, neu))

    async def ordner_entfernen(self, konto: str, name: str) -> None:
        belegt = await self.db.zeile("SELECT 1 FROM dokumente WHERE konto = ? AND ordner = ? AND geloescht = '' LIMIT 1", (konto, name))
        if belegt:
            raise Ablagefehler(f"Im Ordner {name} liegen noch Dokumente")
        # Entferntes im Papierkorb kehrt beim Wiederherstellen auf die oberste Ebene zurück
        await self.db.ausfuehren("UPDATE dokumente SET ordner = '' WHERE konto = ? AND ordner = ?", (konto, name))
        await self.db.ausfuehren("DELETE FROM ordner WHERE konto = ? AND name = ?", (konto, name))

    async def arbeitsstand(self, konto: str) -> Arbeitsstand:
        z = await self.db.zeile("SELECT inhalt FROM arbeitsstaende WHERE konto = ?", (konto,))
        return Arbeitsstand.model_validate(json.loads(z["inhalt"])) if z else Arbeitsstand()

    async def arbeitsstand_speichern(self, konto: str, stand: Arbeitsstand) -> None:
        await self.db.ausfuehren(
            "INSERT INTO arbeitsstaende (konto, inhalt) VALUES (?, ?) ON CONFLICT (konto) DO UPDATE SET inhalt = excluded.inhalt",
            (konto, stand.model_dump_json()),
        )
