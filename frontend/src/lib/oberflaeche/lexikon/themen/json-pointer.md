---
titel: JSON Pointer und jq-Pfade
unterzeile: Zwei Schreibweisen für den Weg zu einem Wert
bereich: Pfade und Abfragen
symbol: fa-route
stichworte: pfad, zeiger, pointer, rfc 6901, jq, weg, stelle, tilde, schrägstrich
reihenfolge: 10
quellen: [RFC 6901: JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901), [Handbuch von jq 1.8](https://jqlang.org/manual/)
---

Beide beschreiben den Weg zu einem Wert im Dokument. Ein **JSON Pointer** (kurz Zeiger) zeigt immer auf genau eine Stelle. Ein **jq-Pfad** kann auch viele Stellen auf einmal treffen und gleich weiterrechnen. Strukturblick zeigt für jede gewählte Stelle beide, dazu JSONPath und die Schreibweise in PHP, Python und TypeScript.

<div data-live="gewaehlt"></div>

## So sind sie gebaut

| Teil | JSON Pointer | jq-Pfad |
|---|---|---|
| Ganzes Dokument | `""` (leer) | `.` |
| Schlüssel | `/kunde` | `.kunde` |
| Listeneintrag | `/positionen/0` | `.positionen[0]` |
| Alle Einträge | gibt es nicht | `.positionen[]` |
| Schlüssel `a/b` | `/a~1b` | `.["a/b"]` |
| Schlüssel `a~b` | `/a~0b` | `.["a~b"]` |

Beide zählen Listen ab 0: der erste Eintrag ist `0`, der zweite `1`. Im Zeiger stehen `~1` für einen Schrägstrich und `~0` für eine Tilde im Schlüssel, weil der Schrägstrich dort die Teile trennt. In jq stehen Schlüssel mit Sonderzeichen in Anführungszeichen und eckigen Klammern.

## Beispiele mit bestellungen.json

Die Beispiele passen zu den Beispieldaten (Leiste, "Beispiele zum Üben"). "Ausprobieren" schreibt den Ausdruck ins Abfragefeld unten und rechnet ihn auf dem offenen Dokument.

Name der Kundin in der zweiten Bestellung, als Zeiger `/bestellungen/1/kunde/name`, in jq:

```jq
.bestellungen[1].kunde.name
```

Ergebnis: `"Marta Kowalski"`.

Alle Bestellnummern (das geht nur mit jq, ein Zeiger trifft immer nur eine Stelle):

```jq
.bestellungen[].nr
```

Ergebnis: `"B-24017"`, `"B-24018"` und so weiter, 128 Werte.

Noch nicht bezahlte Bestellungen:

```jq
.bestellungen[] | select(.bezahlt | not) | .nr
```

Ergebnis: 7 Treffer, darunter `"B-24022"`. Mehr zu Filtern wie `select` steht bei [jq-Filter](#jq).

## Wann welcher?

- **Zeiger**, wenn genau eine Stelle gemeint ist: in JSON Schema bei `$ref` (siehe [Verweise mit $ref](#ref)), in den Befunden beim [Validieren](#validieren) und überall dort, wo Strukturblick eine Stelle in der Adresse oder im Verlauf festhält.
- **jq**, wenn du suchst, filterst oder umbaust. Das Abfragefeld unten im Arbeitsplatz versteht jq direkt.
- **JSONPath**, wenn ein anderes Programm ihn verlangt; mehr bei [JSONPath](#jsonpath).

Pfade kopierst du im Inspektor rechts unter "Pfad kopieren", in der Schreibweise, die du gerade brauchst.
