---
titel: jq-Filter
unterzeile: Daten auswählen, filtern, zählen und umbauen, ein kleiner Kurs
bereich: Pfade und Abfragen
symbol: fa-terminal
stichworte: jq, filter, abfrage, query, pipe, röhre, select, map, length, group_by, sort_by, unique, add, keys, string, zeichenkette, interpolation, test, split, join, webassembly, jq-wasm, ausdruck
reihenfolge: 30
quellen: [Handbuch von jq 1.8](https://jqlang.org/manual/), [jq im Netz](https://jqlang.org/)
---

**jq** ist eine kleine Sprache für Strukturdaten. Ein jq-Ausdruck, auch **Filter** genannt, nimmt das Dokument, wählt etwas daraus und gibt das Ergebnis weiter: einzelne Werte, gefilterte Listen, Summen oder ganz neu gebaute Objekte. Was in einem Tabellenprogramm eine Stunde Klickerei kostet, ist in jq oft eine Zeile.

In Strukturblick läuft echtes jq 1.8, übersetzt nach WebAssembly (Paket jq-wasm). Das heißt: Ausdrücke verhalten sich genau wie in jq auf der Kommandozeile, und alles rechnet in deinem Browser, nichts geht an einen Server. Du findest jq im Abfragefeld am Fuß des Arbeitsplatzes: ⌥ ⌘ E (unter Windows und Linux Strg Alt E) oder "Öffnen" in der Leiste unten.

## So arbeitest du mit dem Abfragefeld

- **Ergebnis beim Tippen.** Kurz nach dem letzten Tastendruck rechnet Strukturblick. Rechts steht das Ergebnis mit der Zahl der Werte und der Rechenzeit.
- **Fehler an der Stelle.** Stimmt der Ausdruck nicht, markiert das Feld das Zeichen, an dem jq hängen blieb, mit einer Blase darunter, etwa "Ausdruck unvollständig". Das letzte gültige Ergebnis bleibt gedimmt stehen und ist als "veraltet" markiert, damit du beim Tippen nicht ins Leere schaust.
- **Ergänzung.** Tippst du einen Punkt, schlägt das Feld die Schlüssel vor, die an dieser Stelle im Dokument wirklich vorkommen, die häufigsten zuerst. Nach `.bestellungen[].kunde.` sind das `name`, `plz` und `stadt`. Tab übernimmt den Vorschlag. Schlüssel mit Sonderzeichen setzt die Ergänzung gleich in Anführungszeichen.
- **Treffer im Baum.** Solange dein Ausdruck nur auswählt, kennt Strukturblick den Ort jedes Werts: Die Treffer erscheinen im [Baum](#baum), F3 und ⇧ F3 springen weiter, und ein Klick auf den Ort im Ergebnis wählt die Stelle.
- **Mitnehmen.** "Als neues Dokument" (⌘ Enter, unter Windows und Linux Strg Enter) legt das ganze Ergebnis als Liste in die Ablage (abfrage-jq.json) und öffnet es im Baum. "Als Tabelle" öffnet es gleich in der [Tabelle](#tabelle). Das Menü daneben lädt es als JSON, NDJSON oder CSV herunter, der Kopierknopf über dem Ergebnis legt es in die Zwischenablage.
- **Verlauf.** "In den Verlauf" merkt sich den Ausdruck, ebenso jedes "Als neues Dokument". Der Knopf "Abfragen-Verlauf" oben im Abfragefeld zeigt die letzten 40 Ausdrücke dieses Geräts; ein Klick setzt Sprache und Ausdruck zurück ins Feld.
- **Einklappen.** Escape im Ausdruck klappt das Abfragefeld ein, ⌥ ⌘ E öffnet es wieder.

Die Beispiele unten passen zu bestellungen.json aus den Beispieldaten (Leiste, "Beispiele zum Üben"). "Ausprobieren" schreibt den Ausdruck ins Abfragefeld und rechnet ihn auf dem offenen Dokument.

## Der Punkt und die Pfade

In jq steht `.` für "das, was gerade hereinkommt". Am Anfang ist das das ganze Dokument. Mit `.name` gehst du in einen Schlüssel, mit `[0]` zum ersten Eintrag einer Liste (gezählt wird ab 0).

```jq
.shop
```

Ergebnis: `"Hofladen Lindenhof"`.

```jq
.bestellungen[0].positionen
```

Ergebnis: die Liste der zwei Positionen der ersten Bestellung, Kartoffeln und Apfelsaft.

Mit `[]` ohne Zahl gehst du in **alle** Einträge einer Liste. Das Ergebnis ist dann eine Folge von Werten, einer je Eintrag:

```jq
.bestellungen[].kunde.stadt
```

Ergebnis: 128 Werte, zuerst `"Halle (Saale)"`, dann zweimal `"Leipzig"`.

Wie Pfade genau gebaut sind, auch mit Sonderzeichen im Schlüssel, steht bei [JSON Pointer und jq-Pfade](#json-pointer).

## Die Röhre

Der senkrechte Strich `|` heißt Röhre, englisch Pipe. Er reicht jedes Ergebnis links als Eingabe nach rechts weiter. So baust du lange Ausdrücke aus kleinen Schritten:

```jq
.bestellungen | length
```

Ergebnis: `128`. `length` zählt die Einträge einer Liste, die Schlüssel eines Objekts oder die Zeichen eines Texts.

Steht links eine Folge, läuft der rechte Teil für jeden Wert einzeln:

```jq
.bestellungen[] | .positionen | length
```

Ergebnis: 128 Zahlen, je Bestellung die Zahl ihrer Positionen: `2`, `1`, `1` und so weiter.

## Filtern mit select

`select(Bedingung)` lässt einen Wert durch, wenn die Bedingung wahr ist, und verwirft ihn sonst. Alle Bestellnummern aus Leipzig:

```jq
.bestellungen[] | select(.kunde.stadt == "Leipzig") | .nr
```

Ergebnis: 33 Werte, der erste ist `"B-24018"`.

Bedingungen verknüpfst du mit `and` und `or`, verneinen geht mit `not` hinter einer Röhre:

```jq
.bestellungen[] | select(.kunde.stadt == "Leipzig" and .bezahlt == false) | .nr
```

Ergebnis: `"B-24037"` und `"B-24096"`, die beiden offenen Bestellungen aus Leipzig.

Innerhalb von `select` darf wieder eine Röhre stehen. Bestellungen mit mehr als drei Positionen:

```jq
.bestellungen[] | select(.positionen | length > 3) | .nr
```

Ergebnis: 26 Werte, der erste ist `"B-24023"`.

Vergleiche: `==`, `!=`, `<`, `<=`, `>`, `>=`. Als falsch gelten in jq nur `false` und `null`; alles andere ist wahr. Deshalb findet `select(.notiz)` genau die 25 Bestellungen, die eine Notiz haben.

## Listen bauen und zählen

Eckige Klammern um einen Ausdruck sammeln seine Folge wieder zu einer Liste. Damit kannst du zählen, was ein Filter durchlässt:

```jq
[.bestellungen[] | select(.bezahlt | not)] | length
```

Ergebnis: `7` offene Bestellungen.

`map(f)` wendet `f` auf jeden Eintrag einer Liste an und gibt wieder eine Liste. `unique` sortiert und entfernt Doppelte:

```jq
.bestellungen | map(.kunde.stadt) | unique
```

Ergebnis: `["Berlin", "Dresden", "Halle (Saale)", "Hamburg", "Leipzig"]`.

Weitere nützliche Helfer für Listen: `first` und `last`, `min` und `max`, `add` (zählt Zahlen zusammen, hängt Texte und Listen aneinander), `any` und `all`, `limit(n; f)` für die ersten n Werte.

## Objekte bauen

Geschweifte Klammern bauen ein neues Objekt. `{nr}` ist die Kurzform für `{nr: .nr}`:

```jq
.bestellungen[] | {nr, kunde: .kunde.name}
```

Ergebnis: 128 Objekte, das erste ist `{"nr": "B-24017", "kunde": "Marta Demir"}`.

Im Objekt darf gerechnet werden. Die Summe jeder Bestellung, auf Cent gerundet:

```jq
.bestellungen[] | {nr, summe: (.positionen | map(.menge * .preis) | add * 100 | round / 100)}
```

Ergebnis: 128 Objekte, das erste ist `{"nr": "B-24017", "summe": 16.65}`. Ohne das Runden stünde dort `16.650000000000002`: Kommazahlen rechnet jq wie fast jedes Programm binär, und 0,1 lässt sich binär nicht genau darstellen.

Ein gebautes Objekt hat keinen Ort im Dokument. Strukturblick markiert dann im Baum die Einträge, aus denen es stammt, hier die 128 Bestellungen.

## Sortieren und gruppieren

`sort_by(f)` sortiert eine Liste nach dem, was `f` liefert; ein Minus davor dreht die Reihenfolge bei Zahlen um. Die drei größten Bestellungen:

```jq
[.bestellungen[] | {nr, summe: (.positionen | map(.menge * .preis) | add * 100 | round / 100)}] | sort_by(-.summe) | .[0:3]
```

Ergebnis: `B-24049` mit 117.7, `B-24101` mit 106.57 und `B-24072` mit 102.2 Euro.

`group_by(f)` sortiert und fasst Einträge mit gleichem `f` zu Teillisten zusammen. Bestellungen je Stadt:

```jq
.bestellungen | group_by(.kunde.stadt) | map({stadt: .[0].kunde.stadt, anzahl: length}) | sort_by(-.anzahl)
```

Ergebnis: Leipzig 33, Hamburg 28, Berlin 27, Halle (Saale) 23, Dresden 17.

Dasselbe Muster über alle Positionen ergibt, wie oft jeder Artikel verkauft wurde:

```jq
[.bestellungen[].positionen[]] | group_by(.artikel) | map({artikel: .[0].artikel, menge: (map(.menge) | add)}) | sort_by(-.menge)
```

Ergebnis: Bergkäse 300 g 184 Stück vorn, Kartoffeln 2,5 kg mit 152 hinten, sechs Artikel insgesamt.

## Zeichenketten

Zeichenketten (Texte) stehen in jq in doppelten Anführungszeichen. Mit `\( ... )` setzt du Werte in einen Text ein:

```jq
.bestellungen[] | "\(.nr): \(.kunde.name)"
```

Ergebnis: 128 Texte, der erste ist `"B-24017: Marta Demir"`.

`startswith`, `endswith` und `contains` prüfen Teile eines Texts:

```jq
.bestellungen[] | select(.kunde.name | startswith("Marta")) | .nr
```

Ergebnis: 11 Bestellungen von Kundinnen namens Marta.

`test` prüft gegen einen regulären Ausdruck, also ein Suchmuster (mehr dazu bei [Suche](#suche/regulaere-ausdruecke)). Ein `"i"` als zweite Angabe ignoriert Groß und Klein:

```jq
.bestellungen[] | select(.kunde.stadt | test("^halle"; "i")) | .nr
```

Ergebnis: 23 Bestellungen aus Halle (Saale).

`split` zerlegt, `join` fügt zusammen:

```jq
.bestellungen[0].positionen | map(.artikel) | join(", ")
```

Ergebnis: `"Kartoffeln 2,5 kg, Apfelsaft naturtrüb 1 l"`.

`ascii_downcase` und `ascii_upcase` ändern nur die Buchstaben A bis Z; Umlaute bleiben, wie sie sind.

## Andere Formate

jq versteht JSON. Ist dein Dokument reines JSON, bekommt jq den Text unverändert, große Zahlen bleiben dabei genau. YAML, TOML, CSV, XML und die anderen Formate übersetzt Strukturblick vorher in denselben Wert, den auch der Baum zeigt. Bei CSV ist das eine Liste von Objekten mit Texten, eine Zeile je Eintrag; bei NDJSON eine Liste mit einem Eintrag je Zeile.

Bei XML-Dokumenten bietet das Abfragefeld zusätzlich [XPath](#xpath) an, das Elemente und Attribute so anspricht, wie sie im XML stehen.

In kunden.csv findest du so die verschiedenen Schreibweisen der Orte: `map(.ort) | unique` ergibt zwölf Werte, darunter `"Leipzig"`, `"leipzig"`, `"Leipzig "` mit Leerzeichen und `"Lpz."`. Aufräumen lässt sich das im Werkzeug [Bereinigen](#bereinigen).

## Grenzen

- jq rechnet auf dem **offenen Dokument**. Über mehrere Dateien zugleich geht [SQL](#sql).
- Das Ergebnis zeigt die **ersten 200 Werte**, gezählt werden alle. Ein einzelner Wert wird nach 20.000 Zeichen gekürzt. Ganz kommt alles mit "Als neues Dokument".
- Eine Abfrage darf **10 Sekunden** rechnen, dann bricht Strukturblick sie ab, etwa bei einer Endlosschleife. Die nächste Abfrage läuft wieder normal.
- Sammelt ein Ausdruck sehr viele Werte auf einmal, etwa `[range(...)]` über riesige Folgen, meldet Strukturblick "jq brauchte mehr Speicher". Begrenzen hilft: `limit(1000; ...)` oder `first(...)`.
- jq **ändert dein Dokument nie**. Auch Ausdrücke wie `.kunde.name |= ascii_upcase` bauen nur ein neues Ergebnis; übernehmen kannst du es als neues Dokument.

## Häufige Fehlermeldungen

| Meldung | Ursache |
|---|---|
| Ausdruck unvollständig | Eine Klammer oder ein Anführungszeichen ist noch offen |
| Unbekannt: selekt/1 is not defined | Tippfehler im Namen einer Funktion |
| Fehler beim Rechnen: string ... and number ... cannot be added | Text und Zahl lassen sich nicht addieren |
| Fehler beim Rechnen: Cannot iterate over null | `[]` an einer Stelle, an der gar nichts steht, etwa nach einem Tippfehler im Schlüssel |

Ein `?` hinter einem Schritt (`.positionen[]?`) schluckt solche Fehler, wenn manche Einträge anders gebaut sind.

## Weiter

- [JSONPath](#jsonpath), wenn ein anderes Programm genau diese Schreibweise verlangt
- [XPath](#xpath) für XML-Dokumente
- [SQL](#sql) für Auswertungen über mehrere Dokumente mit JOIN und GROUP BY
- [Suche](#suche) für Text und reguläre Ausdrücke ohne Programmieren
- [Rezepte](#rezepte), um wiederkehrende Umbauten festzuhalten
