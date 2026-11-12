---
titel: Markdown- und HTML-Tabellen
unterzeile: Tabellen aus Markdown-Texten lesen und bearbeiten, Tabellen aus HTML-Seiten einlesen
bereich: Formate
symbol: fa-table-list
stichworte: markdown, md, tabelle, table, pipe, senkrechter strich, trennzeile, ausrichtung, gfm, html, htm, webseite, caption, colspan, rowspan, th, thead, einlesen
reihenfolge: 80
quellen: [GFM-Spezifikation, Abschnitt Tabellen](https://github.github.com/gfm/#tables-extension-), [HTML Living Standard, Tabellen](https://html.spec.whatwg.org/multipage/tables.html)
---

Markdown ist ein Textformat für Dokumente mit wenig Auszeichnung: `#` für Überschriften, Sternchen für Betonung. Tabellen schreibt man darin mit senkrechten Strichen. Strukturblick liest solche Tabellen wie [CSV](#csv): eine Liste mit einem Objekt je Zeile, die Kopfzeile liefert die Namen. Der Text um die Tabellen herum bleibt unberührt, auch beim Bearbeiten. Tabellen aus HTML-Seiten liest Strukturblick ebenfalls, dort als eigenes JSON-Dokument.

## So sieht eine Tabelle aus

```markdown
# Preise

| Artikel      | Preis |
|--------------|------:|
| Honig        |  7,50 |
| Käse \| hart |  6,90 |
```

- Oben steht die **Kopfzeile**, darunter die **Trennzeile** aus mindestens drei Bindestrichen je Zelle, dann die Datenzeilen bis zur ersten Zeile ohne senkrechten Strich.
- Doppelpunkte in der Trennzeile richten die Spalte aus: `:---` links, `:---:` mittig, `---:` rechts.
- Die äußeren Striche am Zeilenanfang und Zeilenende sind freiwillig.
- `\|` steht für einen Strich im Inhalt, `<br>` für einen Zeilenumbruch in der Zelle.
- Alle Werte sind Text, wie bei CSV; `7,50` bleibt `"7,50"`.

Die Tabelle oben liest Strukturblick als `[{"Artikel":"Honig","Preis":"7,50"},{"Artikel":"Käse | hart","Preis":"6,90"}]`.

## Eine oder mehrere Tabellen

Steht nur eine Tabelle im Text, ist sie selbst die Wurzel. Stehen mehrere darin, ist die Wurzel ein Objekt, und jede Tabelle heißt nach der Überschrift direkt davor, etwa `Preise`; ohne Überschrift heißt sie "Tabelle 1", "Tabelle 2". Gleiche Namen bekommen eine Zahl dazu, ebenso doppelte Spaltennamen (`a`, `a 2`); eine leere Kopfzelle heißt "Spalte 3" nach ihrer Stelle.

Meldungen:

- "Die Zeile hat 1 Zelle, die Kopfzeile 2" (Warnung), wenn eine Zeile weniger oder mehr Zellen hat als die Kopfzeile
- `Keine Tabelle gefunden (Kopfzeile, darunter eine Trennzeile wie |---|---|)` (Fehler), wenn der Text keine Tabelle enthält

Ändern, Zeilen entfernen und Spalten entfernen wirken nur an ihren Stellen; der übrige Text und die Ausrichtung der anderen Zellen bleiben.

## Erkennen

Eine Datei mit der Endung `.md` oder `.markdown` liest Strukturblick als Markdown, ebenso einen Text, in dem Tabellen zwischen anderem Text stehen. Eine nackte Tabelle ohne Dateinamen sieht für die Erkennung genauso nach CSV mit dem senkrechten Strich als Trennzeichen aus und wird so gelesen. Dann wählst du im [Editor](#editor) über den Knopf mit dem Formatnamen "Markdown".

## Zum Ausprobieren

Ein Markdown-Dokument entsteht schnell aus den Beispielen: Öffne kunden.csv, wähle [Konvertieren](#konvertieren) mit dem Ziel Markdown und lege das Ergebnis mit "Als neues Dokument" als kunden.md an. Die Verlustkarte sagt vorher "Werte bleiben Text". Mit kunden.md offen:

```jq
length
```

Ergebnis: `1214`, so viele Zeilen wie in kunden.csv.

```jq
.[0].ort
```

Ergebnis: `"Leipzig"`.

Konvertieren nach Markdown schreibt Zahlen rechtsbündig (Trennzelle `---:`), null als leere Zelle und Felder außerhalb der Hauptliste als zweite Tabelle "Angaben" mit eigener Überschrift. Aus bestellungen.json werden so die Tabellen "bestellungen" und "Angaben".

## HTML-Tabellen einlesen

HTML-Seiten (`.html` und `.htm`) öffnest du über "Datei öffnen" (⌘ O, unter Windows und Linux Strg O) oder durch Hineinziehen. Strukturblick nimmt nur die Tabellen heraus und legt daraus ein JSON-Dokument an mit einer Liste je Tabelle, ähnlich wie bei [Tabellendateien](#xlsx); die Seite selbst bleibt unverändert.

- **Name** der Liste: die Beschriftung `<caption>`, sonst die Überschrift davor, sonst "Tabelle 1".
- **Kopfzeile**: wenn die erste Zeile nur aus Kopfzellen `<th>` besteht oder in `<thead>` steht. Sonst heißen die Felder `A`, `B`, `C`.
- **Inhalt**: Text ohne Tags, Entities wie `&amp;` aufgelöst, Leerraum zusammengefasst, `<br>` als Zeilenumbruch. Alle Werte sind Text.
- **Zellen über mehrere Spalten** (`colspan`): Der Wert steht in der ersten, die übrigen sind leer. Über mehrere Zeilen (`rowspan`): Der Wert steht nur in der ersten Zeile. Steht eine Tabelle in einer anderen, liest Strukturblick nur die innere.

Was nicht ganz mitkommt, sagt die Meldung beim Öffnen, etwa:

```text
preise.html als JSON geöffnet: 1 Tabelle, 2 Zeilen; Werte sind Text (HTML kennt keine Typen); 1 Zelle reicht über mehrere Spalten: der Wert steht in der ersten, die übrigen sind leer
```

Enthält die Seite keine Tabelle, lautet die Meldung "Die Seite enthält keine Tabelle; Strukturblick liest aus HTML nur Tabellen". Umgekehrt schreibt Konvertieren eine HTML-Seite mit Tabellen zum Herunterladen.

## Passt dazu

- [CSV](#csv), die nächste Verwandte
- [Tabellendateien (XLSX)](#xlsx), die genauso eingelesen werden
- [Tabelle](#tabelle) zum Sortieren, Filtern und Bearbeiten
- [Konvertieren](#konvertieren) nach Markdown und HTML
