"""Beispieldaten-Generator: aus einem JSON Schema deterministische Dokumente.

Auf Basis von jsf (JSON Schema Faker) werden Beispieldokumente erzeugt. Vor der
Erzeugung wird der Zufall (random und Faker) mit dem übergebenen Seed
initialisiert, sodass gleiche Eingaben stets gleiche Ausgaben liefern.
"""

from __future__ import annotations

import random

from faker import Faker
from jsf import JSF  # type: ignore[import-untyped]  # jsf bringt keine Typ-Stubs mit

from app.fehler import ParseFehler
from app.modelle.gemeinsam import JsonWert


def _seed_setzen(seed: int) -> None:
    """Initialisiert die von jsf genutzten Zufallsquellen deterministisch."""
    random.seed(seed)
    Faker.seed(seed)


def erzeuge_beispieldaten(
    schema: JsonWert, anzahl: int = 1, seed: int = 42
) -> list[JsonWert]:
    """Erzeugt 'anzahl' Beispieldokumente zum gegebenen JSON Schema.

    Der Seed macht die Erzeugung deterministisch. Ein ungültiges Schema führt zu
    einem ParseFehler mit erläuternder Meldung.
    """
    try:
        faker = JSF(schema)
    except Exception as fehler:  # jsf wirft je nach Defekt sehr unterschiedliche Fehler.
        raise ParseFehler(
            f"Das Schema ist für die Beispieldaten ungültig: {fehler}"
        ) from fehler

    dokumente: list[JsonWert] = []
    for _ in range(max(anzahl, 0)):
        _seed_setzen(seed)
        seed += 1
        try:
            dokumente.append(faker.generate())
        except Exception as fehler:
            raise ParseFehler(
                f"Das Schema ist für die Beispieldaten ungültig: {fehler}"
            ) from fehler
    return dokumente
