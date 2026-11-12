---
titel: JSON Lines (NDJSON)
unterzeile: Ein Datensatz je Zeile, kaputte Zeilen einzeln erkennen und reparieren
bereich: Formate
symbol: fa-file-lines
stichworte: ndjson, json lines, jsonl, newline delimited json, zeilen, datensatz, log, export, import, strom, stream, kaputte zeile, reparieren, slurp
reihenfolge: 20
quellen: [JSON Lines](https://jsonlines.org/), [NDJSON-Spezifikation](https://github.com/ndjson/ndjson-spec)
---

JSON Lines, auch NDJSON genannt (newline delimited JSON), ist [JSON](#json) mit einer einfachen Abmachung: Jede Zeile ist ein vollständiger JSON-Wert, meist ein Objekt, also ein Datensatz. Es gibt keine äußere Klammer und kein Komma zwischen den Zeilen. Deshalb lassen sich solche Dateien Zeile für Zeile schreiben und lesen, ohne die ganze Datei im Speicher zu halten; Protokolle, Exporte und Importe nutzen das gern. Eine kaputte Zeile verdirbt auch nicht gleich die ganze Datei, und genau darauf ist Strukturblick eingestellt.

## So sieht es aus

Die ersten drei Zeilen aus kundenimport.ndjson (Beispiele zum Üben):

```ndjson
{"kundennr":"K-10471","name":"Ole Hansen","plz":"06108","ort":"Halle (Saale)","angelegt":"2026-11-10"}
{"kundennr":"K-10472" "name":"Petra Nguyen","plz":"01067","ort":"Dresd
{"kundennr":"K-10473","name":"Karl Weiß","plz":"04229","ort":"Leipzig","angelegt":"2026-11-12"}
```

Die Regeln:

- Jede Zeile enthält genau einen Wert. Ein Objekt darf nicht über mehrere Zeilen umbrechen.
- Leere Zeilen sind erlaubt und zählen nicht mit.
- Kommentare und abschließende Kommas sind nicht erlaubt (anders als bei JSONC, siehe [JSON](#json)).
- Die Endungen sind `.ndjson` und `.jsonl`. Strukturblick erkennt das Format auch am Inhalt: mindestens zwei Zeilen, die je für sich gültiges JSON sind.

## Wie Strukturblick es zeigt

Die Wurzel ist die Liste der Zeilen: Zeile 1 ist der Eintrag `[0]`, Zeile 3 der Eintrag `[2]`. Der Zeiger `/2/ort` zeigt also auf den Ort in der dritten Zeile. Im [Baum](#baum) siehst du je Zeile einen Eintrag, die [Tabelle](#tabelle) zeigt je Datensatz eine Zeile. Entfernst du einen Eintrag, verschwindet seine ganze Zeile aus der Datei. Die Wurzel selbst lässt sich nicht ersetzen, sie ist ja nur die Folge der Zeilen.

## Kaputte Zeilen

Jede Zeile wird für sich gelesen. Eine Zeile, die kein gültiges JSON ist, ergibt eine Meldung mit ihrer Zeilennummer und bleibt als Eintrag stehen, als Text mit ihrem Rohtext. Alle übrigen Zeilen werden ganz normal gelesen. In kundenimport.ndjson sind 4 von 20 Zeilen kaputt:

| Zeile | Meldung | Was los ist |
|---|---|---|
| 2 | Unerwartetes Zeichen ". Erwartet: , oder } | Komma fehlt, die Zeile endet mitten im Ort |
| 7 | Unerwartetes Zeichen k. Erwartet: Schlüssel in doppelten Anführungszeichen | Schlüssel ohne, Texte in einfachen Anführungszeichen |
| 12 | Ungültige Zahl: führende Null | Postleitzahl `03046` als Zahl, dazu ein Komma vor `}` |
| 16 | Nach dem Wert folgt noch Text | zwei Datensätze in einer Zeile |

Abfragen wie [JSONPath](#jsonpath) und [SQL](#sql) arbeiten schon vorher mit den heilen Zeilen. Alle Orte:

```jsonpath
$[*].ort
```

Ergebnis: 16 Orte, von `"Halle (Saale)"` bis `"Weimar"`. Die vier kaputten Zeilen sind nur Text und haben kein Feld `ort`.

[jq](#jq) dagegen liest den Text der Datei direkt als Folge von JSON-Werten und fasst sie zu einer Liste zusammen. Solange kaputte Zeilen darin stehen, bricht jq mit einem Lesefehler ab. Erst reparieren, dann rechnen.

## Reparieren je Zeile

Das Werkzeug [Reparieren](#reparieren) (Leiste, "Prüfen und umbauen", oder "Reparieren" im Fuß) liest die Datei als JSON Lines, das ist hier vorgewählt. Je kaputter Zeile stehen Meldung und Vorschlag da, rechts die Vorschau als Unterschied. Für kundenimport.ndjson schlägt es vor:

- **Zeile 2**: Komma nach `"K-10472"` einfügen, Text und Objekt mit `"}` schließen. Dazu zwei Hinweise: der Ort `"Dresd"` ist vermutlich abgeschnitten, und `angelegt` fehlt; nichts wird erfunden, das ergänzt du von Hand.
- **Zeile 7**: Schlüssel und Texte in doppelte Anführungszeichen setzen.
- **Zeile 12**: `03046` wird Text `"03046"`, die Ziffern bleiben; das überzählige Komma fällt weg.
- **Zeile 16**: die zwei Datensätze auf zwei Zeilen verteilen.

Mit "Zeile so lassen" nimmst du einzelne Zeilen aus; "Übernehmen" ist ein Vorgang im Verlauf und lässt sich zurücknehmen. Danach hat die Datei 21 lesbare Datensätze und keine Fehler mehr. Den ganzen Ablauf zeigt [Reparieren](#reparieren/beispiel-kundenimport-ndjson).

## Zum Ausprobieren nach der Reparatur

Mit der reparierten kundenimport.ndjson offen, Zahl der Datensätze:

```jq
length
```

Ergebnis: `21`.

Wem fehlt das Anlagedatum?

```jq
[.[] | select(.angelegt == null) | .kundennr]
```

Ergebnis: `["K-10472"]`, die abgeschnittene Zeile 2. `select(.angelegt == null)` trifft auch Datensätze, in denen das Feld ganz fehlt.

## Umwandeln

[Konvertieren](#konvertieren) schreibt jedes Dokument als JSON Lines: Die Hauptliste (die Liste, die auch die Tabelle zeigt) wird je Eintrag eine Zeile. Felder außerhalb der Liste haben keinen Platz; bei bestellungen.json nennt die Verlustkarte "`shop` und `stand` fehlen". Umgekehrt wird aus JSON Lines mit Konvertieren nach JSON eine einzige Liste. Ergebnisse einer Abfrage und gefilterte Tabellen lassen sich ebenfalls als NDJSON herunterladen.

## Passt dazu

- [JSON](#json) für die Schreibweise der einzelnen Werte
- [Reparieren](#reparieren) für alle festen Regeln der Reparatur
- [Tabelle](#tabelle) und [Statistik](#statistik), um die Datensätze zu prüfen
