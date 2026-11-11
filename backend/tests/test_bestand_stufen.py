"""Datenbank einer früheren Stufe: der Umstieg auf die neueste behält alle Dokumente (im Betrieb liegt Stufe 1)."""

from pathlib import Path

from appkern.datenbank import Datenbank

from app.bestand import STUFEN, Bestand
from app.modelle import Dokument

KENNUNG = "0b6f3a52-2a52-4a7e-9a52-1c2d3e4f5a6b"


async def test_stufe_1_auf_neueste(tmp_path: Path):
    pfad = tmp_path / "s.sqlite"
    async with Datenbank(pfad) as db:
        await db.einrichten("strukturblick", STUFEN[:1])
        dok = Dokument(kennung=KENNUNG, name="alt.csv", text="a;b\n1;2\n", geaendert="2026-11-11T20:00:00+01:00")
        await db.ausfuehren(
            "INSERT INTO dokumente (konto, kennung, name, groesse, geaendert, inhalt) VALUES (?, ?, ?, ?, ?, ?)",
            ("1", KENNUNG, dok.name, len(dok.text), dok.geaendert, dok.model_dump_json(exclude={"ordner"})),
        )
    async with Datenbank(pfad) as db:
        bestand = Bestand(db)
        await bestand.einrichten()
        assert [d.name for d in await bestand.liste("1")] == ["alt.csv"]
        geladen = await bestand.laden("1", KENNUNG)
        assert geladen is not None and geladen.text == "a;b\n1;2\n" and geladen.ordner == ""
        assert await bestand.papierkorb("1") == []
