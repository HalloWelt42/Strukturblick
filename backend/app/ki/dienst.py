"""KI über die Leitstelle (STB-60): der einzige Weg zu einem Sprachmodell. Der Dienst nennt immer das eingestellte Modell
(die Leitstelle wählt keins), verlangt die feste Antwortform und liest sie nachsichtig. Er speichert nichts: was gefragt
und vorgeschlagen wurde, hält die Oberfläche, und übernommen wird nur dort, auf Klick."""

import time
from collections.abc import Callable

from appkern.leitstelle import Leitstelle, LeitstellenFehler, Modell, Nachricht, antwortform, json_lesen, saeubern

from ..einstellungen import AppEinstellungen
from . import anweisungen
from .modelle import Auftrag, KiStand, Modellwahl, Verbrauch, Vorschlag

NICHT_EINGERICHTET = "Leitstelle noch nicht eingerichtet"


class KiFehler(Exception):
    """Ablehnung mit Satz für die Oberfläche und HTTP-Status."""

    def __init__(self, meldung: str, status: int) -> None:
        super().__init__(meldung)
        self.meldung = meldung
        self.status = status


def _name(m: Modell) -> str:
    return m.name or m.id


def _passt(m: Modell, gewaehlt: str) -> bool:
    return gewaehlt in (m.id, m.name)


class KiDienst:
    def __init__(self, leitstelle: Callable[[], Leitstelle | None], einstellungen: Callable[[], AppEinstellungen]) -> None:
        self._leitstelle = leitstelle
        self._einstellungen = einstellungen

    async def stand(self) -> KiStand:
        e = self._einstellungen()
        leer = KiStand(an=e.ki_an, eingerichtet=False, bereit=False, meldung=NICHT_EINGERICHTET, modell=e.ki_modell,
                       modellname=e.ki_modell)
        ls = self._leitstelle()
        if ls is None:
            return leer
        try:
            modelle = [m for m in await ls.modelle() if "text" in m.faehigkeiten]
        except LeitstellenFehler as f:
            return leer.model_copy(update={"eingerichtet": True, "meldung": f"Leitstelle antwortet nicht: {f.meldung}"})
        gewaehlt = next((m for m in modelle if _passt(m, e.ki_modell)), None)
        meldung = "" if gewaehlt else (f"Die Leitstelle bietet {e.ki_modell} nicht an" if modelle
                                       else "Die Leitstelle bietet Strukturblick kein Sprachmodell an")
        return KiStand(an=e.ki_an, eingerichtet=True, bereit=gewaehlt is not None, meldung=meldung, modell=e.ki_modell,
                       modellname=_name(gewaehlt) if gewaehlt else e.ki_modell,
                       modelle=[Modellwahl(id=m.id, name=_name(m), zweck=m.steckbrief.zweck if m.steckbrief else "",
                                           geladen=m.geladen, rechner=m.knoten_name or m.knoten, extern=m.extern)
                                for m in modelle])

    @staticmethod
    async def _rechnername(ls: Leitstelle, knoten: str | None) -> str | None:
        """Die Leitstelle nennt im Kopf die Kennung des Rechners; lesbar ist sein Name aus ihrem Angebot. Antwortet sie
        darauf nicht, bleibt die Kennung (der Vorschlag ist dann trotzdem da)."""
        if not knoten:
            return None
        try:
            return next((m.knoten_name for m in await ls.modelle() if m.knoten == knoten and m.knoten_name), knoten)
        except LeitstellenFehler:
            return knoten

    async def vorschlagen(self, a: Auftrag) -> Vorschlag:
        e = self._einstellungen()
        if not e.ki_an:
            raise KiFehler("KI ist in den Einstellungen ausgeschaltet", 409)
        ls = self._leitstelle()
        if ls is None:
            raise KiFehler(NICHT_EINGERICHTET, 503)
        if a.aufgabe == "abfrage" and a.sprache is None:
            raise KiFehler("Für eine Abfrage fehlt die Sprache", 400)
        if a.aufgabe in ("abfrage", "schema") and not a.frage.strip():
            raise KiFehler("Für diese Aufgabe fehlt die Frage", 400)
        beginn = time.monotonic()
        try:
            antwort = await ls.chat([Nachricht.system(anweisungen.system(a)), Nachricht.nutzer(anweisungen.nutzer(a))],
                                    modell=e.ki_modell, titel=anweisungen.TITEL[a.aufgabe],
                                    temperature=0.7 if a.vorher else 0.2,
                                    response_format=antwortform("vorschlag", anweisungen.ANTWORT))
        except LeitstellenFehler as f:
            raise KiFehler(f.meldung, f.status if f.status >= 400 else 503) from f
        dauer_ms = round((time.monotonic() - beginn) * 1000)
        if antwort.abgebrochen:
            raise KiFehler("Der Auftrag wurde in der Leitstelle abgebrochen", 503)
        try:
            roh = json_lesen(antwort.text)
            ergebnis, erklaerung = roh["ergebnis"], roh["erklaerung"]
            if not isinstance(ergebnis, str) or not isinstance(erklaerung, list):
                raise ValueError("Antwortform passt nicht")
        except (ValueError, KeyError, TypeError) as f:
            raise KiFehler(f"Die Antwort des Modells ließ sich nicht lesen ({f})", 502) from f
        # Prosa auf gerade Zeichen bringen; Ausdrücke und JSON bleiben wörtlich (Werte darin gehören dem Dokument)
        if a.aufgabe == "erklaeren":
            ergebnis = saeubern(ergebnis)
        modell = antwort.modell or e.ki_modell
        rechner = await self._rechnername(ls, antwort.knoten)
        return Vorschlag(ergebnis=ergebnis.strip(), erklaerung=[saeubern(str(s)).strip() for s in erklaerung if str(s).strip()],
                         modell=modell, rechner=rechner, dauer_ms=dauer_ms,
                         verbrauch=Verbrauch(eingabe=antwort.verbrauch.eingabe, ausgabe=antwort.verbrauch.ausgabe)
                         if antwort.verbrauch else None, auftrag=antwort.auftrag)
