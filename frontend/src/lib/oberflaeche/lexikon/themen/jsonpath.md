---
titel: JSONPath
unterzeile: Werte über einen Pfad mit Platzhaltern und Filtern auswählen
bereich: Pfade und Abfragen
symbol: fa-signs-post
stichworte: jsonpath, json path, pfad, abfrage, filter, rekursion, platzhalter, wildcard, dollar, at, jsonpath-plus, rfc 9535, query, selektor, selector
reihenfolge: 20
quellen: [RFC 9535: JSONPath](https://www.rfc-editor.org/rfc/rfc9535), [JSONPath, der ursprüngliche Vorschlag](https://goessner.net/articles/JsonPath/), [Handbuch von jsonpath-plus](https://github.com/JSONPath-Plus/JSONPath)
---

**JSONPath** beschreibt einen Weg durch ein Dokument und liefert alle Werte, die an seinem Ende liegen. Anders als ein [JSON Pointer](#json-pointer), der immer genau eine Stelle meint, darf ein JSONPath Platzhalter und Filter enthalten: "die Nummern aller Bestellungen" oder "jede Position mit einem Preis über 8 Euro". JSONPath rechnet nichts aus und baut nichts um, es wählt nur aus. Viele Programme und Bibliotheken verlangen genau diese Schreibweise, deshalb lohnt es sich, sie lesen zu können.

Strukturblick rechnet JSONPath mit der Bibliothek jsonpath-plus, ganz im Browser. Du findest JSONPath im Abfragefeld am Fuß des Arbeitsplatzes (⌥ ⌘ E, unter Windows und Linux Strg Alt E), dort den Reiter "JSONPath" wählen.

<div data-live="gewaehlt"></div>

## So ist ein Pfad gebaut

Jeder Pfad beginnt mit `$`, das ist die Wurzel, also das ganze Dokument. Dahinter folgen Schritte, jeder führt eine Ebene tiefer.

| Schritt | Bedeutung | Beispiel |
|---|---|---|
| `$` | Das ganze Dokument | `$` |
| `.name` | Schlüssel in einem Objekt | `$.shop` |
| `['name']` | Schlüssel in Klammern, nötig bei Sonderzeichen | `$['bestellungen']` |
| `[0]` | Eintrag einer Liste, gezählt ab 0 | `$.bestellungen[0]` |
| `[*]` oder `.*` | Alle Einträge oder alle Werte eines Objekts | `$.bestellungen[*]` |
| `[0,2]` | Mehrere Einträge auf einmal | `$.bestellungen[0,2]` |
| `[0:3]` | Ein Ausschnitt: Einträge 0, 1 und 2 | `$.bestellungen[0:3]` |
| `[-1:]` | Ausschnitt vom Ende her: der letzte Eintrag | `$.bestellungen[-1:]` |
| `..` | Rekursion: auf jeder Ebene darunter suchen | `$..artikel` |
| `[?( )]` | Filter: nur Einträge, für die die Bedingung gilt | `$.bestellungen[?(@.bezahlt == false)]` |
| `@` | Im Filter: der Eintrag, der gerade geprüft wird | `@.preis > 8` |

Der Kasten oben zeigt zu deinem gewählten Wert den JSONPath neben den anderen Schreibweisen. Der Inspektor rechts kopiert ihn unter "Pfad kopieren" mit einem Klick auf "JSONPath".

## Erste Schritte mit bestellungen.json

Die Beispiele passen zu den Beispieldaten (Leiste, "Beispiele zum Üben"). Öffne bestellungen.json, dann schreibt "Ausprobieren" den Ausdruck ins Abfragefeld und rechnet ihn auf dem offenen Dokument.

Der Name des Hofladens:

```jsonpath
$.shop
```

Ergebnis: `"Hofladen Lindenhof"`.

Die Kundin der ersten Bestellung, Schritt für Schritt hinab:

```jsonpath
$.bestellungen[0].kunde.name
```

Ergebnis: `"Marta Demir"`.

Dasselbe geht in Klammern. Diese Form brauchst du, sobald ein Schlüssel Leerzeichen, Punkte oder andere Sonderzeichen enthält; einfache und doppelte Anführungszeichen gehen beide:

```jsonpath
$['bestellungen'][1]['kunde']['name']
```

Ergebnis: `"Marta Kowalski"`, die Kundin der zweiten Bestellung.

Alle Bestellnummern mit dem Platzhalter `[*]`:

```jsonpath
$.bestellungen[*].nr
```

Ergebnis: 128 Werte von `"B-24017"` bis `"B-24144"`.

Die ersten drei Bestellnummern als Ausschnitt:

```jsonpath
$.bestellungen[0:3].nr
```

Ergebnis: `"B-24017"`, `"B-24018"`, `"B-24019"`. Die Zahl hinter dem Doppelpunkt gehört nicht mehr dazu.

## Rekursion mit zwei Punkten

Zwei Punkte `..` suchen auf allen Ebenen darunter, egal wie tief. Du musst den Weg dorthin also nicht kennen:

```jsonpath
$..artikel
```

Ergebnis: 297 Werte, jeder Artikel jeder Position in jeder Bestellung. Der erste ist `"Kartoffeln 2,5 kg"`.

Rekursion ist bequem, kann aber mehr treffen als gedacht: `$..name` fände jeden Schlüssel `name` im ganzen Dokument, ganz gleich, wozu er gehört. Wenn du den Weg kennst, schreib ihn lieber aus.

## Filter

Ein Filter `[?( )]` steht dort, wo sonst eine Stelle in der Liste stünde. Er prüft jeden Eintrag; `@` ist dabei der Eintrag selbst. Nur wer die Bedingung erfüllt, kommt weiter.

Nummern der noch nicht bezahlten Bestellungen:

```jsonpath
$.bestellungen[?(@.bezahlt == false)].nr
```

Ergebnis: 7 Werte, darunter `"B-24022"`.

Texte stehen im Filter in Anführungszeichen. Alle Kundinnen und Kunden aus Leipzig:

```jsonpath
$.bestellungen[?(@.kunde.stadt == 'Leipzig')].kunde.name
```

Ergebnis: 33 Namen, der erste ist `"Marta Kowalski"`.

Filter und Rekursion zusammen: jede Position mit einem Preis über 8 Euro, davon der Artikel.

```jsonpath
$..positionen[?(@.preis > 8)].artikel
```

Ergebnis: 48 Treffer, alle `"Honig 500 g"`, denn nur der Honig kostet mehr als 8 Euro.

Bedingungen lassen sich mit `&&` (und), `||` (oder) und `!` (nicht) verknüpfen. Große Mengen eines günstigen Artikels:

```jsonpath
$..positionen[?(@.menge >= 5 && @.preis < 3)].artikel
```

Ergebnis: 19 Treffer, alle `"Apfelsaft naturtrüb 1 l"`.

Mit `.length` fragst du nach der Länge einer Liste. Bestellungen mit mehr als drei Positionen:

```jsonpath
$.bestellungen[?(@.positionen.length > 3)].nr
```

Ergebnis: 26 Werte, der erste ist `"B-24023"`. Genau diese 26 meldet auch das [Validieren](#json-schema) gegen bestellung.schema.json, das höchstens drei Positionen erlaubt.

Ein Filter ohne Vergleich fragt, ob es den Wert gibt und ob er etwas enthält. Bestellungen mit Notiz:

```jsonpath
$.bestellungen[?(@.notiz)].nr
```

Ergebnis: 25 Werte; die übrigen 103 Bestellungen haben `null` als Notiz.

### Vergleiche im Filter

| Zeichen | Bedeutung |
|---|---|
| `==` und `!=` | gleich, ungleich |
| `<`, `<=`, `>`, `>=` | kleiner, kleiner oder gleich, größer, größer oder gleich |
| `&&`, `\|\|`, `!` | und, oder, nicht |

Datumsangaben in ISO-Form (`2026-11-09`) lassen sich als Text vergleichen, weil die Reihenfolge der Buchstaben der Zeitfolge entspricht: `$.bestellungen[?(@.datum >= '2026-11-09')].nr` findet 24 Bestellungen vom 9. und 10. November.

## Besonderheiten von jsonpath-plus

Die Bibliothek folgt dem ursprünglichen Vorschlag für JSONPath und bringt ein paar Erweiterungen mit, die Strukturblick nicht abschaltet:

- `~` am Ende liefert die Schlüssel statt der Werte: `$.bestellungen[0].*~` ergibt `"nr"`, `"datum"`, `"kunde"`, `"positionen"`, `"bezahlt"` und `"notiz"`.
- `^` geht vom Treffer eine Ebene nach oben. `$..positionen[?(@.preis > 8)]^^.nr` steigt vom Honig zwei Ebenen auf, zur Bestellung, und liefert ihre 48 Nummern.
- `@property` ist im Filter der Schlüssel des geprüften Werts: `$..kunde[?(@property == 'plz')]` liefert alle 128 Postleitzahlen.

Filter laufen in einer sicheren Auswertung der Bibliothek, nie als freies Programm. Vergleiche, Verknüpfungen und `.length` gehen; eigene Funktionen gibt es nicht.

## Stolpersteine

- **`[-1]` trifft nichts.** Für den letzten Eintrag schreibst du den Ausschnitt `[-1:]`. `$.bestellungen[-1:].nr` liefert `"B-24144"`.
- **Filter brauchen runde Klammern.** Die Norm RFC 9535 erlaubt `[?@.bezahlt == false]` ohne Klammern; jsonpath-plus findet damit still nichts. Schreib `[?(@.bezahlt == false)]`.
- **Funktionen der Norm fehlen.** `length(@.positionen)` aus RFC 9535 meldet "length is not defined"; nimm `@.positionen.length`.
- **Rekursive Filter über alles stolpern an `null`.** `$..[?(@.preis > 9)]` prüft auch die Notizen mit `null` und bricht mit einer Meldung ab. Schränk die Rekursion ein, etwa mit `$..positionen[?(...)]`.
- **Leeres Ergebnis heißt nicht Fehler.** Ein Tippfehler im Schlüssel liefert einfach 0 Werte. Hilfreich ist die Ergänzung: Tippst du einen Punkt, schlägt das Feld die Schlüssel vor, die an dieser Stelle wirklich vorkommen; Tab übernimmt den Vorschlag.

## Was Strukturblick mit den Treffern macht

JSONPath kennt zu jedem Wert seinen Ort im Dokument. Deshalb:

- erscheinen alle Treffer im [Baum](#baum) markiert, F3 und ⇧ F3 springen von einem zum nächsten;
- trägt jeder Wert im Ergebnis seinen Ort, ein Klick darauf wählt ihn im Dokument;
- nimmt "Als neues Dokument" (⌘ Enter) alle Werte als Liste mit, "Als Tabelle" zeigt sie gleich in der [Tabelle](#tabelle), und das Menü daneben lädt sie als JSON, NDJSON oder CSV herunter.

Das Ergebnis zeigt die ersten 200 Werte, gezählt werden alle. Mehr zum Abfragefeld, zum Verlauf und zu den Grenzen steht bei [jq](#jq/so-arbeitest-du-mit-dem-abfragefeld).

JSONPath geht auf jedem Format, das Strukturblick lesen kann. Bei XML heißen Attribute `@name` und Text neben Attributen `#text`, das verlangt die Klammerform: In lieferungen.xml liefert `$.lieferungen.lieferung[0]['@nr']` die Nummer `"L-2401"`. Für XML-Dokumente gibt es außerdem [XPath](#xpath), die Abfragesprache, die XML von Haus aus spricht.

## Unterschiede zu jq

| Frage | JSONPath | jq |
|---|---|---|
| Was kann es? | Werte auswählen | Auswählen, rechnen, umbauen |
| Wurzel | `$` | `.` |
| Alle Einträge | `[*]` | `[]` |
| Rekursion | `$..artikel` | `.. \| .artikel? // empty` |
| Filter | `[?(@.bezahlt == false)]` | `select(.bezahlt == false)` |
| Neue Objekte bauen | geht nicht | `{nr, kunde: .kunde.name}` |
| Zählen, summieren | geht nicht | `length`, `add` |
| Ort jedes Werts | immer bekannt | nur, solange der Ausdruck nur auswählt |

Faustregel: **JSONPath**, wenn ein anderes Programm ihn verlangt oder du nur etwas finden willst. **[jq](#jq)**, sobald du zählen, rechnen oder ein neues Ergebnis bauen willst. Bei XML-Dokumenten steht zusätzlich [XPath](#xpath) zur Wahl. Für Auswertungen über mehrere Dateien gibt es [SQL](#sql), für eine einzelne Stelle den [JSON Pointer](#json-pointer).
