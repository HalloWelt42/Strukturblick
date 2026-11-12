---
titel: Exportieren und Herunterladen
unterzeile: Dokumente, gefilterte Zeilen, Treffer und Abfrageergebnisse mitnehmen
bereich: Arbeitsplatz
symbol: fa-download
stichworte: export, exportieren, herunterladen, download, speichern unter, datei, als neues dokument, treffer, auswahl, gefiltert, csv, json, ndjson, json lines, semikolon, ergebnis, kopieren
reihenfolge: 30
quellen: [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259), [RFC 4180: CSV](https://www.rfc-editor.org/rfc/rfc4180), [JSON Lines](https://jsonlines.org/)
---

Alles, was du in Strukturblick siehst, kannst du auch mitnehmen: ein ganzes Dokument als Datei, die gefilterten Zeilen einer Tabelle, die Treffer einer Suche oder das Ergebnis einer Abfrage. Jedes Ergebnis geht auf zwei Wegen hinaus, als **Datei** auf dein Gerät oder als **neues Dokument** in deine [Ablage](#ablage), wo du gleich damit weiterarbeiten kannst. Das Original bleibt dabei immer, wie es ist.

## Ein Dokument herunterladen

- "Herunterladen" in der Leiste oder ⇧ ⌘ S (unter Windows und Linux Strg Umschalt S) lädt das offene Dokument herunter.
- Im Menü per Rechtsklick auf einen Reiter oder ein Dokument der Leiste steht ebenfalls "Herunterladen".
- In der Seite Ablage lädt "Herunterladen" alle gewählten Dokumente, eins nach dem anderen als eigene Datei.

Die Datei bekommt den Namen des Dokuments und genau seinen aktuellen Text, mit allen Änderungen, Kommentaren und Einrückungen. Geschrieben wird immer UTF-8, auch wenn die Datei beim Öffnen eine andere Kodierung hatte. Alle Dokumente auf einmal samt Verlauf sichert "Alles sichern" in der [Ablage](#ablage/alles-sichern-und-einspielen).

## Sichtbare Zeilen der Tabelle

In der [Ansicht Tabelle](#ansicht:tabelle) steht rechts in der Werkzeugzeile "Exportieren". Es nimmt genau die Zeilen, die du gerade siehst: mit Filter und in der Sortierung, wie angezeigt.

Zum Üben öffne kunden.csv aus den Beispielen, wähle die Tabelle und tippe ins Filterfeld `leipzig`. Der Zähler zeigt 142 von 1.214 Zeilen. "Exportieren" bietet dann:

- **Als neues Dokument in der Ablage**: Es landet im selben Ordner wie die Quelle und öffnet in der Tabelle. Aus CSV und Markdown-Tabellen wird eine CSV (hier `kunden-auswahl.csv`), aus allen anderen Formaten ein JSON-Dokument.
- **JSON, NDJSON oder CSV** als Datei, hier etwa `kunden-auswahl.csv`.

Der Name endet auf `-auswahl`, sobald gefiltert oder sortiert ist, sonst auf `-tabelle`. Aufgeklappte Spalten ändern nichts am Export; mitgenommen werden die ganzen Einträge der Liste.

## Treffer im Baum

Hat die Suche im Baum oder eine Abfrage Treffer, erscheint in der Werkzeugzeile des [Baums](#ansicht:baum) neben der Treffernavigation der Knopf "Treffer". Er bietet dieselben Wege: neues Dokument (`<name>-treffer.json`, im selben Ordner, öffnet im Baum) oder eine Datei `<name>-treffer.json`, `.ndjson` oder `.csv`.

Was dabei herauskommt, hängt von den Treffern ab:

- Sind alle Treffer Objekte, etwa ganze Bestellungen, kommen sie, wie sie sind.
- Sonst kommt jeder Treffer mit seinem Pfad in jq-Schreibweise, damit du weißt, woher er stammt.

Ein Beispiel für den ersten Fall, auf bestellungen.json:

```jq
.bestellungen[] | select(.bezahlt | not)
```

Ergebnis: 7 Bestellungen, als Treffer im Baum markiert. "Treffer" nimmt diese 7 Objekte vollständig mit.

Ein Beispiel für den zweiten Fall ist die Suche nach `Leipzig` im Feld "Im Baum suchen": 33 Treffer, alles einzelne Werte. Als CSV beginnt die Datei dann so:

```csv
pfad;wert
.bestellungen[1].kunde.stadt;Leipzig
```

## Ergebnisse der Abfrage

Die [Abfrage](#erste-schritte/erste-schritte-in-der-abfrage) hat am Fuß ihre eigenen Knöpfe, solange es ein Ergebnis gibt:

- **Als neues Dokument** legt das ganze Ergebnis als JSON an und öffnet es im Baum; ⌘ Enter (Strg Enter) im Ausdruck hat dieselbe Wirkung.
- **Als Tabelle** legt es ebenso an und öffnet es in der Tabelle.
- **Herunterladen** bietet JSON, NDJSON und CSV.
- Der Kopierknopf über dem Ergebnis legt das ganze Ergebnis als JSON in die Zwischenablage.

Bei SQL steht das Ergebnis als Tabelle im Hauptbereich, und die Knöpfe sitzen darüber: "Als neues Dokument" öffnet dort gleich in der Tabelle, daneben "Herunterladen" und "In den Verlauf".

Neue Dokumente aus der Abfrage heißen `abfrage-jq.json`, `abfrage-sql.json` und so weiter und liegen auf der obersten Ebene der Ablage. Dateien heißen nach dem Dokument und der Sprache, etwa `bestellungen-jq.csv`; bei SQL, das über alle offenen Dokumente rechnet, `abfrage-sql.csv`.

Gezeigt werden höchstens 200 Werte und bei SQL 2.000 Zeilen. Mitgenommen wird immer das ganze Ergebnis, gleich wie lang es ist.

## Die drei Formate

| Format | Endung | Aufbau |
|---|---|---|
| JSON | .json | eine Liste mit allen Ergebnissen, eingerückt |
| NDJSON | .ndjson | ein Ergebnis je Zeile ([JSON Lines](#ndjson)) |
| CSV | .csv | eine Tabelle mit Semikolon, wie Tabellenprogramme sie im deutschen Raum erwarten |

Für CSV werden die Ergebnisse zu Zeilen:

- Sind alle Ergebnisse Objekte, gibt es eine Spalte je Schlüssel, in der Reihenfolge, in der die Schlüssel zuerst vorkommen. Fehlt einem Objekt ein Schlüssel, bleibt seine Zelle leer.
- Sonst gibt es eine einzige Spalte `wert`.
- Verschachtelte Objekte und Listen stehen als JSON-Text in ihrer Zelle.
- `null` wird eine leere Zelle.
- Zellen mit Semikolon, Anführungszeichen, Zeilenumbruch oder Leerzeichen am Rand stehen in Anführungszeichen; ein Anführungszeichen darin wird verdoppelt.
- Zeilen enden mit CR LF, dem üblichen Zeilenende für CSV.

So sieht die erste unbezahlte Bestellung aus dem jq-Beispiel oben als CSV aus. Die Spalten kunde und positionen tragen JSON-Text:

```csv
nr;datum;kunde;positionen;bezahlt;notiz
B-24022;2026-11-06;"{""name"":""Marta Lange"",""plz"":""20095"",""stadt"":""Hamburg""}";"[{""artikel"":""Hofeier 10 Stück"",""menge"":5,""preis"":3.8},{""artikel"":""Apfelsaft naturtrüb 1 l"",""menge"":6,""preis"":2.49}]";false;
```

Brauchst du verschachtelte Werte als eigene Spalten oder ein anderes Trennzeichen, nimm das Werkzeug [Konvertieren](#konvertieren).

## Was sonst noch herunterlädt

Einige Ansichten und Werkzeuge haben eigene Knöpfe für ihre Ergebnisse:

| Wo | Was |
|---|---|
| [Konvertieren](#konvertieren) | das umgeschriebene Dokument als Datei oder neues Dokument; XLSX und HTML nur als Datei |
| [Struktur](#struktur) | "Als JSON Schema" lädt das abgeleitete Schema herunter |
| [Vergleich](#vergleich) | "Als JSON Patch" lädt die Unterschiede als Änderungsliste herunter |
| [Validieren](#validieren) | "Bericht herunterladen" schreibt alle Befunde als Text |
| [Code erzeugen](#code-erzeugen) | eine Datei, alle Dateien als ZIP oder "Projekt als ZIP" |
| [Testdaten](#testdaten) | die erzeugten Daten als Datei oder neues Dokument |
| [Rezepte](#rezepte) | ein Rezept als Datei zum Sichern oder Weitergeben |

Wohin eine Datei kommt, entscheidet dein Browser nach seinen Einstellungen, meist landet sie im Ordner für Downloads.
