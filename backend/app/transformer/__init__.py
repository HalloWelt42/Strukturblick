"""Transformationsschicht: Formatkonvertierung, struktureller Diff, JSON-Reparatur.

Drei voneinander unabhängige Bausteine, die auf dem internen Dokumentmodell
(GeparstesDokument) arbeiten:

- konvertierung: serialisiert ein Dokument in ein Zielformat und meldet die
  dabei entstehenden Informationsverluste als verständliche Hinweise.
- diff: vergleicht zwei Dokumente strukturell (über deepdiff) und liefert je
  Unterschied den JSON-Pointer, die Art und - soweit bekannt - die
  Quelltext-Positionen beider Seiten.
- reparatur: repariert defektes, JSON-artiges Dokument über json_repair und
  liefert Ergebnis, Unified-Diff und eine kurze Änderungsübersicht.
"""

from __future__ import annotations

from app.transformer.diff import berechne_diff
from app.transformer.konvertierung import konvertiere
from app.transformer.reparatur import repariere

__all__ = ["berechne_diff", "konvertiere", "repariere"]
