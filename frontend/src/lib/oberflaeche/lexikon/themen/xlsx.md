---
titel: Tabellendateien (XLSX)
unterzeile: Blätter einlesen als JSON-Dokument und Daten als Tabellendatei schreiben
bereich: Formate
symbol: fa-table-cells
stichworte: xlsx, tabellendatei, tabellenkalkulation, spreadsheet, arbeitsmappe, workbook, blatt, sheet, zelle, formel, verbundene zellen, merged, seriennummer, datum, office open xml, ecma-376, einlesen, herunterladen
reihenfolge: 70
quellen: [ECMA-376: Office Open XML File Formats](https://ecma-international.org/publications-and-standards/standards/ecma-376/)
---

XLSX ist das Dateiformat der Tabellenkalkulation: eine Arbeitsmappe mit einem oder mehreren Blättern, jedes Blatt ein Raster aus Zellen. Hinter der Endung steckt ein ZIP-Archiv mit XML-Teilen. Strukturblick arbeitet auf Text; deshalb wird beim Öffnen aus der Tabellendatei ein [JSON](#json)-Dokument mit einer Liste je Blatt. Die Datei selbst bleibt unverändert. In die andere Richtung schreibt [Konvertieren](#konvertieren) jedes Dokument als Tabellendatei.

## Öffnen

Öffne die Datei wie jede andere: "Datei öffnen" (⌘ O, unter Windows und Linux Strg O) oder hineinziehen. Aus `umsatz.xlsx` wird das Dokument `umsatz.json` in deiner Ablage, und eine Meldung fasst zusammen, was passiert ist:

```text
umsatz.xlsx als JSON geöffnet: 2 Blätter, 4 Zeilen; 1 Formel: übernommen ist das zuletzt berechnete Ergebnis; 1 verbundener Zellbereich: nur die erste Zelle trägt den Wert
```

Die Beispiele hier beziehen sich auf diese kleine Datei mit den Blättern "Umsatz November" und "Hinweise"; mit jeder eigenen XLSX-Datei geht es genauso.

## Aus Blättern werden Listen

Jedes Blatt wird eine Liste unter seinem Namen, jede Zeile ein Objekt. Die Regeln:

- **Kopfzeile**: Enthält die erste Zeile nur Texte (und gibt es darunter weitere Zeilen), liefert sie die Feldnamen. Sonst heißen die Felder nach den Spalten: `A`, `B`, `C`.
- **Leere Kopfzellen** heißen nach ihrer Spalte, etwa "Spalte B"; doppelte Namen bekommen eine Zahl dazu.
- **Leere Zellen** werden `null`, **ganz leere Zeilen** fallen weg.
- **Typen bleiben**: Zahlen bleiben Zahlen, Wahrheitswerte bleiben Wahrheitswerte, Texte bleiben Texte, auch `01067` mit führender Null.
- **Datum** erkennt Strukturblick am Zahlenformat der Zelle, denn intern ist ein Datum eine Zahl (Tage seit 1900). Es wird Text in ISO-Form: `"2026-11-03"`, mit Uhrzeit `"2026-11-05T14:30:00"`, eine reine Uhrzeit `"14:30:00"`. Mehr bei [Datum und Zeit](#datum-und-zeit).
- **Formeln** liefern ihr zuletzt berechnetes Ergebnis. Hat die Datei keins gespeichert, bleibt die Zelle leer.
- **Fehlerwerte** wie `#DIV/0!` stehen als Text da.
- **Verbundene Zellen**: Nur die erste Zelle des Bereichs trägt den Wert.

So sieht umsatz.json aus (gekürzt):

```json
{
  "Umsatz November": [
    { "Tag": "2026-11-03", "Artikel": "Honig 500 g", "Menge": 2, "Preis": 7.5, "Bezahlt": true, "Notiz": null },
    { "Tag": "2026-11-04", "Artikel": "Bergkäse 300 g", "Menge": 1, "Preis": 6.9, "Bezahlt": false, "Notiz": "Abholung Samstag" },
    { "Tag": "2026-11-05T14:30:00", "Artikel": "Hofeier 10 Stück", "Menge": 3, "Preis": 3.8, "Bezahlt": true, "Notiz": "Grüße & Dank" }
  ],
  "Hinweise": [
    { "Lindenhof": "PLZ", "Spalte B": "01067", "Spalte C": 42 }
  ]
}
```

Zwei Dinge fallen auf. Die Summenformel unter "Menge" hat kein gespeichertes Ergebnis, ihre Zeile ist deshalb leer und fällt weg. Auf dem Blatt "Hinweise" steht oben die verbundene Überschrift "Lindenhof"; sie ist die einzige Zelle der ersten Zeile und wird so zur Kopfzeile. Solche Blätter räumst du am besten vorher in der Tabellenkalkulation auf oder benennst die Felder danach um.

## Zum Ausprobieren

Mit umsatz.json offen. Die Blätter:

```jq
keys_unsorted
```

Ergebnis: `["Umsatz November","Hinweise"]`. Namen mit Leerzeichen stehen in jq in Anführungszeichen und eckigen Klammern. Alle Mengen zusammen:

```jq
.["Umsatz November"] | map(.Menge) | add
```

Ergebnis: `6`. Der Umsatz, Menge mal Preis:

```jq
[.["Umsatz November"][] | .Menge * .Preis] | add
```

Ergebnis: `33.3`. Was noch nicht bezahlt ist:

```jq
[.["Umsatz November"][] | select(.Bezahlt | not) | .Artikel]
```

Ergebnis: `["Bergkäse 300 g"]`.

## Als Tabellendatei schreiben

[Konvertieren](#konvertieren) hat das Ziel XLSX. Die Hauptliste (die Liste, die auch die [Tabelle](#tabelle) zeigt) wird ein Blatt, benannt nach der Liste; Felder außerhalb der Liste kommen auf ein zweites Blatt "Angaben" mit den Spalten "Feld" und "Wert". Bei bestellungen.json entsteht das Blatt "bestellungen" und auf "Angaben" stehen `shop` und `stand`.

- **Listen in den Einträgen** wie die `positionen` gehen wie bei CSV auf drei Wege: eine Zeile je Position (297 Zeilen, die übrigen Werte wiederholen sich), Spalten je Position (128 Zeilen, `positionen.0.artikel` bis `positionen.3.preis`) oder die Liste als JSON-Text in einer Zelle.
- **Typen bleiben**: Zahlen und Wahrheitswerte als solche, Datum in ISO-Form (`2026-11-01`, auch mit Uhrzeit ohne Zeitzone) als echtes Datum mit Datumsformat. Ein Zeitpunkt mit Zeitzone wie `2026-11-10T08:15:00+01:00` bleibt Text. Nummern mit führender Null bleiben Text.
- **Kopfzeile** fett und beim Rollen fest stehend.
- **Grenzen** eines Blatts: 1.048.576 Zeilen, 16.384 Spalten, 32.767 Zeichen je Zelle; Blattnamen höchstens 31 Zeichen ohne `[ ] : * ? / \`. Was darüber hinausgeht, nennt die Verlustkarte.

Die Verlustkarte sagt außerdem, wo null und leer gleich aussehen, bei bestellungen.json etwa "`notiz` ist in 242 von 297 Zeilen `null`". Das Ergebnis lädst du mit "Herunterladen" als Datei; ein neues Dokument entsteht daraus nicht, weil eine Tabellendatei kein Text ist.

## Passt dazu

- [CSV](#csv), die Tabelle als Text
- [Markdown- und HTML-Tabellen](#markdown), HTML-Seiten werden genauso eingelesen
- [Konvertieren](#konvertieren) mit allen Zielen und der Verlustkarte
- [Zahlen als Text](#zahlen-als-text) und [Datum und Zeit](#datum-und-zeit)
