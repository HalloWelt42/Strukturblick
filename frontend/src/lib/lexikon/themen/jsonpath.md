---
title: JSONPath
subtitle: Abfragesprache für JSON-Dokumente
category: Abfragen
icon: fa-route
---

JSONPath ist eine Abfragesprache, mit der sich Werte aus JSON-Dokumenten
gezielt auslesen lassen. Ein Ausdruck beginnt an der Wurzel `$` und beschreibt
Schritt für Schritt den Weg zu den gewünschten Knoten. Listen lassen sich
dabei mit einem Filter auf passende Einträge eingrenzen.

Ein Filterausdruck steht in eckigen Klammern und prüft für jeden Eintrag eine
Bedingung, zum Beispiel `[?(@.bezahlt == true)]`. Das Zeichen `@` steht dabei
für den gerade geprüften Eintrag. So lassen sich etwa alle Bestellungen
filtern, deren Summe über einem Grenzwert liegt.

Der rekursive Abstieg `..` durchsucht alle Ebenen eines Dokuments auf einmal.
In Kombination mit einem Filter findet ein einziger Ausdruck so auch tief
verschachtelte Treffer. Verwandte Themen: JSON Pointer für eindeutige
Einzelpfade und XPath für XML-Dokumente.

### Wichtige Operatoren

| Operator | Bedeutung                              |
| -------- | -------------------------------------- |
| `$`      | Wurzel des Dokuments                   |
| `..`     | Rekursiver Abstieg über alle Ebenen    |
| `[?()]`  | Einträge nach einer Bedingung eingrenzen |
| `[*]`    | Alle Einträge einer Liste              |

### Beispiel

```
$.bestellungen[?(@.summe > 50)].nummer

Ergebnis: ["B-2026-0412", "B-2026-0417"]
```
