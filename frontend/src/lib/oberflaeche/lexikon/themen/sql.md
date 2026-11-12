---
titel: SQL
unterzeile: Alle geöffneten Dokumente als Tabellen abfragen, verbinden und auswerten
bereich: Pfade und Abfragen
symbol: fa-database
stichworte: sql, sqlite, sql.js, datenbank, tabelle, select, where, join, group by, order by, count, sum, abfrage, query, regexp, lower, upper, auswertung, verknüpfen
reihenfolge: 40
quellen: [SQLite: die Sprache SQL](https://www.sqlite.org/lang.html), [SQLite: Kernfunktionen](https://www.sqlite.org/lang_corefunc.html), [SQLite: Funktionen zum Zusammenfassen](https://www.sqlite.org/lang_aggfunc.html), [sql.js](https://sql.js.org/)
---

**SQL** ist die Sprache der Datenbanken. Du beschreibst darin, welche Zeilen und Spalten du aus welchen Tabellen haben willst, und die Datenbank sucht sie zusammen. Strukturblick macht aus jedem geöffneten Dokument eine Tabelle und lässt dich mit SQL darüber fragen: Was wurde in welcher Stadt bestellt? Welche Bestellung ist die größte? Welche Kunden stehen in der Bestellliste, aber nicht in der Kundendatei?

Gerechnet wird mit SQLite, einer weit verbreiteten Datenbank, als WebAssembly im Browser (Bibliothek sql.js). Nichts geht an einen Server, und deine Dokumente bleiben unverändert. Du findest SQL im Abfragefeld am Fuß des Arbeitsplatzes: ⌥ ⌘ E (unter Windows und Linux Strg Alt E), dort den Reiter "SQL" wählen. Anders als [jq](#jq), [JSONPath](#jsonpath) und [XPath](#xpath) rechnet SQL **über alle geöffneten Dokumente** zugleich.

## Wie aus Dokumenten Tabellen werden

Eine Tabelle besteht aus Zeilen und Spalten, wie in einem Tabellenprogramm. Strukturdaten sind dagegen oft verschachtelt. Strukturblick legt sie deshalb nach festen Regeln flach:

- **Jedes Dokument wird eine Tabelle.** Ihr Name ist der Dateiname ohne Endung, klein geschrieben, Sonderzeichen werden zu `_`: Aus bestellungen.json wird `bestellungen`, aus bestellung.schema.json wird `bestellung_schema`. Gibt es einen Namen schon, bekommt der nächste eine Zahl: lieferungen.xsd heißt `lieferungen_2`, weil lieferungen.xml schon `lieferungen` ist.
- **Die Zeilen kommen aus der Hauptliste.** Ist das Dokument selbst eine Liste (wie kunden.csv), ist jeder Eintrag eine Zeile. Sonst sucht Strukturblick von oben nach unten die erste Ebene mit einer Liste von Objekten (höchstens drei Ebenen tief) und nimmt dort die längste, bei bestellungen.json also die 128 Bestellungen. Werte neben der Hauptliste (dort `shop` und `stand`) kommen in keine Tabelle.
- **Verschachtelte Objekte werden Spalten mit Unterstrich.** Aus `kunde.name` wird die Spalte `kunde_name`, aus `kunde.stadt` die Spalte `kunde_stadt`.
- **Listen von Objekten werden eigene Tabellen.** Die Positionen jeder Bestellung landen in der Tabelle `positionen`, je Position eine Zeile. Damit du weißt, wozu eine Zeile gehört, steht vorn eine Spalte mit dem Schlüssel der Elternzeile: `positionen.nr` verweist auf `bestellungen.nr`. Als Schlüssel nimmt Strukturblick die erste Spalte, die in jeder Zeile gefüllt und überall verschieden ist; gibt es keine, eine Spalte `zeile` mit der Zeilennummer.
- **Listen einfacher Werte** (etwa eine Liste von Texten) stehen als JSON-Text in einer Zelle.
- **Wahrheitswerte** werden zu `1` und `0`. "Noch nicht bezahlt" heißt in SQL also `bezahlt = 0`.
- **CSV kennt keine Arten**, dort ist alles Text. Spalten, in denen jeder Wert eindeutig eine Zahl ist (`42`, `3.5`), werden zu Zahlen. Postleitzahlen mit führender Null bleiben Text, deutsche Beträge wie `3.309,23` ebenso.

Entfaltet wird bis zur dritten Ebene; was tiefer liegt, steht als JSON-Text in der Zelle.

## Die Tabellenübersicht

Ist SQL gewählt, steht links im Abfragefeld die Übersicht "Tabellen": je Tabelle Name, Quelldatei und Zeilenzahl, darunter die Spalten mit ihrer Art (Text, Ganzzahl, Zahl, Wahrheitswert, Verweis auf ...). Bei entfalteten Listen steht ein Satz dabei, etwa "Aus der Liste positionen entfaltet, je Eintrag eine Zeile". Ein Klick auf einen Namen fügt ihn in deinen Ausdruck ein, der kleine Pfeil davor klappt die Spalten zu.

Mit den Beispieldaten (Leiste, "Beispiele zum Üben") sind alle neun Beispiele offen. Die drei wichtigsten Tabellen daraus:

| Tabelle | Quelle | Zeilen | Spalten |
|---|---|---|---|
| `bestellungen` | bestellungen.json | 128 | nr, datum, kunde_name, kunde_plz, kunde_stadt, bezahlt, notiz |
| `positionen` | bestellungen.json | 297 | nr (Verweis auf bestellungen), artikel, menge, preis |
| `kunden` | kunden.csv | 1214 | kundennr, name, plz, ort, email, telefon, angelegt, umsatz |

Beim Tippen ergänzt das Feld Tabellen, Spalten und Schlüsselwörter; Tab übernimmt den Vorschlag.

## Erste Abfragen

Die Beispiele passen zu den Beispieldaten. "Ausprobieren" schreibt den Ausdruck ins Abfragefeld und rechnet ihn. Großschreibung der Schlüsselwörter ist nur Gewohnheit, `select` geht genauso.

`SELECT` wählt Spalten, `FROM` die Tabelle, `LIMIT` begrenzt die Zahl der Zeilen. `*` heißt "alle Spalten":

```sql
SELECT * FROM bestellungen LIMIT 5
```

Ergebnis: 5 Zeilen, die erste ist B-24017 von Marta Demir aus Halle (Saale).

`WHERE` filtert Zeilen. Texte stehen in einfachen Anführungszeichen:

```sql
SELECT nr, kunde_name, kunde_stadt FROM bestellungen WHERE bezahlt = 0
```

Ergebnis: 7 Zeilen, die erste ist B-24022 von Marta Lange aus Hamburg.

Die Positionen einer Bestellung:

```sql
SELECT * FROM positionen WHERE nr = 'B-24017'
```

Ergebnis: 2 Zeilen, Kartoffeln 2,5 kg (1 zu 4.2) und Apfelsaft naturtrüb 1 l (5 zu 2.49).

### Was in WHERE geht

| Ausdruck | Bedeutung |
|---|---|
| `=`, `<>`, `<`, `>`, `<=`, `>=` | Vergleiche |
| `AND`, `OR`, `NOT` | Verknüpfen |
| `LIKE 'Honig%'` | Muster: `%` steht für beliebig viel, `_` für genau ein Zeichen |
| `IN ('Leipzig', 'Dresden')` | Einer von mehreren Werten |
| `BETWEEN 2 AND 5` | Bereich, beide Grenzen eingeschlossen |
| `IS NULL`, `IS NOT NULL` | Leer oder gefüllt |
| `REGEXP '^B-2402'` | Regulärer Ausdruck (siehe unten) |

## Gruppieren und zählen

`GROUP BY` fasst Zeilen mit gleichem Wert zusammen; Funktionen wie `COUNT`, `SUM`, `AVG`, `MIN` und `MAX` rechnen dann je Gruppe. `ORDER BY ... DESC` sortiert absteigend, `AS` gibt einer Spalte einen Namen:

```sql
SELECT kunde_stadt, COUNT(*) AS bestellungen, SUM(bezahlt = 0) AS offen FROM bestellungen GROUP BY kunde_stadt ORDER BY bestellungen DESC
```

Ergebnis: Leipzig 33 Bestellungen (2 offen), Hamburg 28 (3), Berlin 27 (0), Halle (Saale) 23 (1), Dresden 17 (1). `SUM(bezahlt = 0)` zählt die Zeilen, in denen die Bedingung stimmt, weil ein Vergleich in SQLite 1 oder 0 ergibt.

Was jeder Artikel gebracht hat:

```sql
SELECT artikel, SUM(menge) AS stueck, ROUND(SUM(menge * preis), 2) AS umsatz FROM positionen GROUP BY artikel ORDER BY stueck DESC
```

Ergebnis: 6 Zeilen, vorn Bergkäse 300 g mit 184 Stück und 1269.6 Euro; den meisten Umsatz bringt Honig 500 g mit 1419.5 Euro.

`HAVING` filtert nach dem Gruppieren, `WHERE` davor.

## Tabellen verbinden mit JOIN

`JOIN` setzt Zeilen zweier Tabellen nebeneinander, wenn die Bedingung hinter `ON` stimmt. Hier kommen Bestellung und Positionen über die Nummer zusammen; `b` und `p` sind Kurznamen für die Tabellen:

```sql
SELECT b.nr, b.kunde_name, ROUND(SUM(p.menge * p.preis), 2) AS summe FROM bestellungen b JOIN positionen p ON p.nr = b.nr GROUP BY b.nr ORDER BY summe DESC LIMIT 5
```

Ergebnis: B-24049 von Mehmet Wagner mit 117.7 Euro vorn, danach B-24101 (106.57) und B-24072 (102.2).

Die offenen Bestellungen mit ihrem Betrag, als Mahnliste:

```sql
SELECT b.nr, b.kunde_name, COUNT(p.artikel) AS positionen, ROUND(SUM(p.menge * p.preis), 2) AS summe FROM bestellungen b JOIN positionen p ON p.nr = b.nr WHERE b.bezahlt = 0 GROUP BY b.nr ORDER BY summe DESC
```

Ergebnis: 7 Zeilen, vorn B-24083 von Jonas Hansen mit 52.76 Euro.

### Über zwei Dateien

SQL sieht alle geöffneten Dokumente, deshalb lassen sich auch verschiedene Dateien verbinden. Bestellungen, deren Kunde nicht in kunden.csv steht, findest du mit einem `LEFT JOIN`: Er behält auch Zeilen ohne Partner, deren Spalten aus der zweiten Tabelle sind dann leer.

```sql
SELECT b.nr, b.kunde_name FROM bestellungen b LEFT JOIN kunden k ON k.name = b.kunde_name WHERE k.name IS NULL
```

Ergebnis: 1 Zeile, B-24120 von Karl Nguyen.

Achte beim Verbinden darauf, ob die Spalte eindeutig ist. In kunden.csv kommen viele Namen mehrfach vor (Aylin Krüger 13 Mal), ein `JOIN` über den Namen vervielfacht dann die Zeilen.

## Unsaubere Daten finden

kunden.csv enthält absichtliche Unsauberkeiten. SQL zeigt sie schnell:

```sql
SELECT ort, COUNT(*) AS anzahl FROM kunden GROUP BY ort ORDER BY anzahl DESC
```

Ergebnis: 12 verschiedene Orte, darunter `Leipzig` (53), `leipzig` (48), `Leipzig ` mit Leerzeichen am Ende (41) und `Lpz.` (39). Ein Leerzeichen am Ende zeigt die Ergebnistabelle mit einem eigenen Zeichen an.

`lower` und `upper` kennen in Strukturblick auch Umlaute, `trim` entfernt Leerzeichen am Rand. Zusammen fassen sie die Schreibweisen zusammen:

```sql
SELECT trim(ort) AS ort, COUNT(*) AS anzahl FROM kunden GROUP BY lower(trim(ort)) ORDER BY anzahl DESC
```

Ergebnis: 9 Zeilen, Leipzig nun mit 142, Dresden mit 57. `Lpz.` und `Halle/Saale` bleiben eigene Gruppen; das richtest du im Werkzeug [Bereinigen](#bereinigen).

`REGEXP` prüft gegen einen regulären Ausdruck in der Schreibweise von JavaScript (mehr bei [Suche](#suche/regulaere-ausdruecke)). Er unterscheidet Groß und Klein. Kunden mit deutschem Datum statt ISO-Form:

```sql
SELECT kundennr, name, angelegt FROM kunden WHERE angelegt REGEXP '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$'
```

Ergebnis: 405 Zeilen, die erste ist K-10001 mit `01.01.2024`. Mehr zu Datumsformen bei [Datum und Zeit](#datum-und-zeit).

Deutsche Beträge rechnest du so in Zahlen um: `CAST(replace(replace(umsatz, '.', ''), ',', '.') AS REAL)`. Danach lässt sich nach dem Umsatz sortieren; ganz vorn steht K-10321 mit 9793.86.

## Das Ergebnis

- Das Ergebnis **belegt die Ansicht** im Hauptbereich, oben mit der Zahl der Zeilen und der Rechenzeit. Der Reiter "Abfrageergebnis" schließt es wieder.
- Jede Spalte nennt ihre Art. Die letzte Zahlenspalte bekommt Balken zum Vergleich, wenn keiner ihrer Werte negativ ist.
- Gezeigt werden die **ersten 2.000 Zeilen**, gezählt werden alle.
- "Als neues Dokument" legt alle Zeilen als JSON in die Ablage (abfrage-sql.json) und zeigt sie als Tabelle. Das Menü daneben lädt sie als JSON, NDJSON oder CSV (mit Semikolon) herunter. "In den Verlauf" merkt sich den Ausdruck.
- Stehen mehrere Anweisungen hintereinander (getrennt durch `;`), zählt das Ergebnis der letzten.

## Gut zu wissen

- **Spalten mit Sonderzeichen** schreibst du in doppelte Anführungszeichen. Aus lieferungen.xml stammen Spalten wie `@nr` (ein Attribut) oder `#text`: `SELECT "@nr", kunde_name, bezahlt FROM lieferungen` liefert die zwölf Lieferscheine.
- **Fehlermeldungen** stehen auf Deutsch da, etwa `Tabelle tabelle gibt es nicht`, `Spalte kunde gibt es nicht` (die Spalte heißt `kunde_name`), `SQL ungültig bei "SELEC"` oder `SQL unvollständig`. Das letzte gültige Ergebnis bleibt sichtbar.
- **Die Tabellen sind eine Kopie.** `UPDATE`, `INSERT` oder `DELETE` ändern nie dein Dokument. Ändert sich ein Dokument oder öffnest du ein weiteres, baut Strukturblick die Tabellen neu.
- **Zeitgrenze:** Eine Abfrage darf 10 Sekunden rechnen, dann bricht Strukturblick sie ab.
- Ein leeres SQL-Feld rechnet nichts, zeigt aber die Tabellen. Wer gar nicht weiß, wo er anfangen soll: `SELECT * FROM` und dann einen Namen aus der Übersicht anklicken.

## Weiter

- [jq](#jq), um innerhalb eines Dokuments zu filtern und Ergebnisse neu zu bauen
- [Tabelle](#tabelle), um eine Liste ohne SQL zu sortieren und zu filtern
- [Statistik](#statistik) für Kennzahlen je Feld auf einen Blick
- [CSV](#csv) zu Trennzeichen, Kopfzeile und Zahlen in CSV-Dateien
