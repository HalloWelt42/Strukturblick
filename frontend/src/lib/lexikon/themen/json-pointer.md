---
title: JSON Pointer
subtitle: Eindeutiger Pfad zu genau einem Wert
category: Abfragen
icon: fa-arrow-pointer
---

Ein JSON Pointer (RFC 6901) bezeichnet genau einen Wert in einem
JSON-Dokument. Der Pfad beginnt mit `/` und reiht Schlüsselnamen und
Listenindizes aneinander. Anders als JSONPath ist ein Pointer keine Abfrage:
Er filtert nicht und liefert nie mehrere Treffer, sondern zeigt auf eine
einzige Stelle.

```
/bestellungen/0/kunde/name
```

Kommen in einem Schlüssel die Zeichen `~` oder `/` vor, werden sie maskiert:

| Zeichen | Schreibweise im Pointer |
| ------- | ----------------------- |
| ~       | ~0                      |
| /       | ~1                      |

Der leere Pointer `""` steht für das ganze Dokument. Verwendet wird JSON
Pointer überall dort, wo eine Stelle exakt benannt werden muss: in
Fehlermeldungen der Validierung, in Verweisen von JSON Schema (`$ref`) und in
Änderungsbeschreibungen.

In Strukturblick ist der Pointer der Standardpfad: Der Inspektor zeigt ihn zum
gewählten Knoten an, und über Pfad kopieren als Zeiger landet er in der
Zwischenablage. Auch die Vergleichs-Ansicht benennt Unterschiede zwischen zwei
Dokumenten über solche Pfade.
