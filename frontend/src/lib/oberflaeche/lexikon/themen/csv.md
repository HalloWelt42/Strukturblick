---
titel: CSV
unterzeile: Tabellen als Text, der Dialekt und warum jede Zelle Text ist
bereich: Formate
symbol: fa-file-csv
stichworte: csv, comma separated values, tsv, tab, trennzeichen, delimiter, semikolon, komma, tabulator, senkrechter strich, pipe, anführungszeichen, quote, kopfzeile, header, zeilenende, lf, crlf, dialekt, leseweise, kodierung, rfc 4180
reihenfolge: 30
quellen: [RFC 4180: Common Format and MIME Type for CSV Files](https://www.rfc-editor.org/rfc/rfc4180)
---

CSV (comma separated values) ist eine Tabelle als reiner Text: eine Zeile je Datensatz, die Zellen durch ein Trennzeichen getrennt, oben meist eine Kopfzeile mit den Spaltennamen. Fast jedes Programm kann CSV schreiben und lesen. Eine feste Norm gibt es kaum: Jedes Programm wählt sein eigenes Trennzeichen und seine eigenen Gewohnheiten, und CSV kennt keine Typen. Strukturblick erkennt diese Gewohnheiten selbst, lässt dich die Leseweise ändern und zeigt die Datei als Liste von Objekten: eine Zeile, ein Objekt, eine Zelle, ein Text.

## Der Dialekt

Die Gewohnheiten einer CSV-Datei heißen zusammen **Dialekt**:

| Merkmal | Was es heißt | In kunden.csv |
|---|---|---|
| Trennzeichen | trennt die Zellen: Komma, Semikolon, Tabulator oder senkrechter Strich | Semikolon |
| Anführungszeichen | fasst eine Zelle ein, die selbst Trennzeichen, Anführungszeichen oder Zeilenumbrüche enthält; ein `"` darin wird verdoppelt (`""`) | `"3.309,23"` |
| Kopfzeile | die erste Zeile nennt die Spalten | ja |
| Zeilenende | LF (Linux und macOS), CRLF (Windows) oder CR (sehr alte Dateien) | LF |

Die ersten Zeilen von kunden.csv (Beispiele zum Üben):

```csv
kundennr;name;plz;ort;email;telefon;angelegt;umsatz
K-10001;Aylin Brandt;04109;Leipzig;aylin.brandt@example.org;030 23125 000;01.01.2024;"3.309,23"
K-10002;Ole Vogel;04109;Leipzig;ole.vogel@example.org;030 23125 001;2024-02-02;"4.607,86"
```

Deutsche Programme nehmen gern das Semikolon, weil das Komma schon in Beträgen wie `3.309,23` steckt. Eine Zelle mit Komma, Trennzeichen oder Umbruch steht in Anführungszeichen: `"Müller, Anna"` ist eine Zelle, `"sagt ""hallo"""` liest sich als `sagt "hallo"`.

## So erkennt Strukturblick den Dialekt

- **Trennzeichen**: Strukturblick prüft die ersten 50 Zeilen (höchstens 64 KB) und zählt je Zeile Komma, Semikolon, Tabulator und senkrechten Strich außerhalb von Anführungszeichen. Es gewinnt das Zeichen, das in den meisten Zeilen gleich oft vorkommt. Bei Gleichstand gilt die Reihenfolge Tabulator, Semikolon, Strich, Komma; das Komma kommt zuletzt, weil es auch in Zahlen und Fließtext steht.
- **Kopfzeile**: Die erste Zeile gilt als Kopfzeile, solange keine ihrer Zellen nach Zahl oder Datum aussieht. Ohne Kopfzeile heißen die Spalten "Spalte 1", "Spalte 2" und so weiter.
- **Zeilenende**: Erkannt wird das erste Zeilenende; gelesen werden LF, CRLF und CR gleichermaßen, auch gemischt.
- **Endungen**: `.csv`, `.tsv` und `.txt`.
- **Kodierung**: Beim Öffnen einer Datei gilt eine Bytereihenfolge-Marke, sonst UTF-8. Ist die Datei kein gültiges UTF-8, liest Strukturblick sie als Windows-1252 und sagt das in einer Meldung; dann lohnt ein Blick auf die Umlaute.

## Leseweise ändern

Hat die Erkennung danebengegriffen, stellst du sie in der [Ansicht Tabelle](#ansicht:tabelle) (⌥ ⌘ 3, unter Windows und Linux Strg Alt 3) um. Rechts in der Werkzeugzeile steht ein Abzeichen mit der Leseweise, bei kunden.csv "Semikolon, Kopfzeile". Fährst du darüber, sagt es, ob die Werte erkannt oder von dir gewählt sind. "Ändern" öffnet die Wahl:

- **Trennzeichen**: Komma, Semikolon, Tab oder Senkrechter Strich
- **Erste Zeile**: Kopfzeile oder Daten

Der Text der Datei bleibt dabei unverändert, nur die Lesart wechselt; die Wahl wird mit dem Dokument gespeichert. Mehr bei [Tabelle](#tabelle/leseweise-bei-csv). Wird ein Text gar nicht als CSV erkannt, wählst du das Format im [Editor](#editor) über den Knopf mit dem Formatnamen.

## Alles ist Text

CSV kennt keine Zahlen, kein Datum, keinen Wahrheitswert. Strukturblick liest deshalb jede Zelle als Text, auch `04109` und `3.309,23`. Was eine Zelle *bedeuten* könnte, zeigt Strukturblick nur an: In der Tabelle trägt der Spaltenkopf von `umsatz` das Abzeichen "Text, sieht aus wie Betrag", `angelegt` "Text, sieht aus wie Datum" und `plz` "Text, sieht aus wie Zahl". Umgewandelt wird nur auf Knopfdruck, im Werkzeug [Bereinigen](#bereinigen/typen) unter Typen. Auch was du in eine Zelle tippst, bleibt Text.

Mit kunden.csv offen, der Umsatz der ersten Zeile:

```jq
.[0].umsatz
```

Ergebnis: `"3.309,23"`, ein Text in Anführungszeichen.

In [SQL](#sql) heißt die Tabelle nach der Datei: `kunden`. Eine CSV-Spalte wird dort nur dann zur Zahl, wenn jeder gefüllte Wert eindeutig eine ist (ganze Zahl ohne führende Null oder Dezimalzahl mit Punkt). In kunden.csv trifft das keine Spalte:

```sql
SELECT typeof(plz), typeof(umsatz) FROM kunden LIMIT 1
```

Ergebnis: `text` und `text`. Gezählt wird trotzdem bequem:

```sql
SELECT ort, count(*) AS kunden FROM kunden GROUP BY ort ORDER BY kunden DESC LIMIT 3
```

Ergebnis: Berlin 286, Hamburg 241, München 198.

## Meldungen beim Lesen

| Meldung | Art | Was passiert |
|---|---|---|
| Zeile 2 hat 3 Zellen, erwartet sind 2. | Warnung | Überzählige Zellen heißen "Spalte 3" und so weiter; nach 20 solchen Zeilen folgt eine Sammelmeldung |
| Zeile 3: Das Anführungszeichen wird nicht geschlossen; die Zelle gilt bis zum Trennzeichen als Text. | Fehler | Die Zelle wird samt Anführungszeichen als Text gelesen |
| Zeile 4: Nach dem schließenden Anführungszeichen folgen noch Zeichen. | Warnung | Etwa `"abc"x` |
| Der Spaltenname "ort" kommt mehrfach vor; Zeiger erreichen nur die erste dieser Spalten. | Warnung | Zwei Spalten mit gleichem Namen in der Kopfzeile |

Leere Zeilen überspringt Strukturblick; sie zählen nicht als Datensatz.

## Schreiben in CSV

Änderst du eine Zelle, schreibt Strukturblick nur diese Zelle neu. Trennzeichen und Zeilenenden bleiben, Anführungszeichen kommen dazu, wenn der neue Inhalt sie braucht oder die Zelle sie schon hatte. "Spalte entfernen" in der Tabelle nimmt die Spalte samt Kopfzelle aus jeder Zeile.

Aus anderen Formaten schreibt [Konvertieren](#konvertieren) eine CSV-Datei: Trennzeichen Semikolon (Vorgabe), Komma oder Tab, mit oder ohne Kopfzeile. Verschachtelte Objekte werden Spalten mit Punkt (`kunde.name`), für Listen in den Einträgen gibt es drei Wege. Die Verlustkarte nennt vorab, was CSV nicht halten kann, etwa "Typen gehen verloren: Zahlen werden Text" und "null und leer sehen gleich aus". Ergebnisse der Abfrage lädst du als CSV mit Semikolon herunter.

## Passt dazu

- [Tabelle](#tabelle) für Sortieren, Filtern und die Leseweise
- [Bereinigen](#bereinigen) für Schreibweisen, Typen und Facetten
- [Zahlen als Text](#zahlen-als-text) und [Datum und Zeit](#datum-und-zeit) für die typischen Fallen in kunden.csv
- [Markdown- und HTML-Tabellen](#markdown), die Strukturblick ähnlich liest
