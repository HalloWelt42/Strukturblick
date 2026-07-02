"""Typisierte Registries mit Dekorator-Registrierung und Modul-Discovery.

Neue Module entstehen, indem eine Datei ins passende Paket gelegt wird -
der Import beim App-Start löst die Dekoratoren aus, der Capabilities-Endpunkt
macht sie dem Frontend ohne weitere Änderung bekannt.
"""

from __future__ import annotations

import importlib
import pkgutil

from app import config
from app.fehler import ModulUnbekannt
from app.modelle.gemeinsam import FormatId
from app.modelle.system import CapabilitiesAntwort, KonvertierungsPaar, Limits
from app.schnittstellen.format_engine import FormatEngine


class RegistrierungsFehler(RuntimeError):
    pass


class Registry[T]:
    def __init__(self, name: str) -> None:
        self._name = name
        self._eintraege: dict[str, T] = {}

    def registriere(self, schluessel: str, eintrag: T) -> None:
        if schluessel in self._eintraege:
            raise RegistrierungsFehler(f"{self._name}: '{schluessel}' ist doppelt registriert")
        self._eintraege[schluessel] = eintrag

    def hole(self, schluessel: str) -> T:
        eintrag = self._eintraege.get(schluessel)
        if eintrag is None:
            bekannte = ", ".join(sorted(self._eintraege)) or "-"
            raise ModulUnbekannt(f"{self._name} '{schluessel}' ist unbekannt (bekannt: {bekannte})")
        return eintrag

    def alle(self) -> tuple[T, ...]:
        return tuple(self._eintraege.values())

    def leeren(self) -> None:
        self._eintraege.clear()


engines: Registry[FormatEngine] = Registry("FormatEngine")


def format_engine[T: type](cls: T) -> T:
    """Klassen-Dekorator: registriert eine Instanz der Engine unter ihrer FormatId."""
    engines.registriere(cls.faehigkeiten.format_id.value, cls())
    return cls


_MODUL_PAKETE = ("app.engines",)
_entdeckt = False


def entdecke_module() -> None:
    """Importiert alle Untermodule der Modul-Pakete; Importe lösen die Dekoratoren aus."""
    global _entdeckt
    if _entdeckt:
        return
    for paketname in _MODUL_PAKETE:
        paket = importlib.import_module(paketname)
        for modul_info in pkgutil.iter_modules(paket.__path__):
            importlib.import_module(f"{paketname}.{modul_info.name}")
    _entdeckt = True


def engine_fuer(format_id: FormatId) -> FormatEngine:
    return engines.hole(format_id.value)


def capabilities() -> CapabilitiesAntwort:
    formate = [engine.faehigkeiten for engine in engines.alle()]
    matrix: list[KonvertierungsPaar] = []
    for quelle in formate:
        if not quelle.kann_lesen:
            continue
        for ziel in formate:
            if not ziel.kann_schreiben or ziel.format_id == quelle.format_id:
                continue
            verluste = sorted(quelle.traegt - ziel.traegt)
            matrix.append(
                KonvertierungsPaar(von=quelle.format_id, nach=ziel.format_id, moegliche_verluste=verluste)
            )
    return CapabilitiesAntwort(
        version=config.APP_VERSION,
        formate=sorted(formate, key=lambda f: f.format_id.value),
        konvertierungsmatrix=matrix,
        limits=Limits(
            max_dokument_bytes=config.MAX_DOKUMENT_BYTES,
            cache_ttl_sekunden=config.CACHE_TTL_SEKUNDEN,
        ),
    )
