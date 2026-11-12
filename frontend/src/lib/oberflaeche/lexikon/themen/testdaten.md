---
titel: Testdaten
unterzeile: Erfundene Daten nach dem Vorbild deines Dokuments
bereich: Werkzeuge
symbol: fa-dice
stichworte: testdaten, beispieldaten, dummy, fake, mock, mockdaten, generator, zufallsdaten, synthetisch, erzeuger, spezifikation, vorlage, startwert, seed, leer-anteil, null, anzahl, blöcke, anhalten, fortsetzen, uuid, postleitzahl, e-mail, telefon, testdaten.json
reihenfolge: 70
quellen: [RFC 2606: reservierte Namen wie .example](https://www.rfc-editor.org/rfc/rfc2606), [RFC 9562: UUID](https://www.rfc-editor.org/rfc/rfc9562)
---

Für Tests, Vorführungen oder Schulungen brauchst du oft Daten, die echt aussehen und niemandem gehören. Testdaten erfindet sie nach dem Vorbild deines Dokuments: gleiche Felder, gleicher Aufbau, ähnliche Werte, nur erfunden. Je Feld wählt ein **Erzeuger** die Werte, etwa "Name", "Postleitzahl" oder "Zahl oder Betrag". Ein **Startwert** sorgt dafür, dass sich alles wiederholen lässt: gleicher Startwert, gleiche Daten. Alles rechnet in deinem Browser; Namen, Adressen und Nummern sind erfunden.

## Wo du es findest

Leiste links, Abschnitt "Erzeugen", [Testdaten](#werkzeug:testdaten); oder die Befehlspalette (⌘ K, unter Windows und Linux Strg K). Geschlossen wird es über den Knopf mit seinem Namen und dem Kreuz oben im Kopf des Hauptbereichs. Anzahl, Startwert, gewähltes Feld und Zielformat stehen in der Adresse (`/testdaten?anzahl=1000&startwert=42&ziel=csv`).

## Die Vorlage

Die **Vorlage** ist das offene Dokument. Strukturblick nimmt dieselbe Liste, die auch die [Ansicht Statistik](#ansicht:statistik) und die [Tabelle](#tabelle) zeigen, und leitet je Feld einen Erzeuger samt Einstellungen aus den Werten ab. Oben links steht, woraus: "Vorlage kunden.csv, 8 Felder aus 1.214 Einträgen abgeleitet". Ist das offene Dokument eine gespeicherte Spezifikation (siehe unten), steht dort "Abgelegte Spezifikation".

Hat die Vorlage Unordnung, etwa Datumsangaben in zwei Formen, sagt ein Hinweis unter der Tafel, dass die Testdaten eine Schreibweise nehmen. Bei kunden.csv: "angelegt steht mal als ISO-Datum, mal anders; die Testdaten nehmen eine Schreibweise."

## Die Spezifikation

Die **Spezifikation** ist die Tafel mit allen Feldern: je Zeile Feld, Erzeuger (Menü), Einstellungen als kurze Marken und ein Beispiel. Verschachtelte Felder sind eingerückt; `(je Eintrag)` steht für die Einträge einer Liste. Ein Klick auf eine Zeile wählt das Feld, geändert wird es im Inspektor.

Bei kunden.csv leitet Strukturblick ab:

| Feld | Erzeuger | Einstellungen |
|---|---|---|
| kundennr | Laufende Nummer mit Muster | Muster K-#####, ab 10001, eindeutig |
| name | Name | Vor- und Nachname |
| plz | Postleitzahl | Gebiet 01 bis 80, führende Null bleibt |
| ort | Ort zur Postleitzahl | passt zur Postleitzahl |
| email | E-Mail | Domain example.org |
| telefon | Telefonnummer | Festnetz, 0341 5583214 |
| angelegt | Datum | von 2024-01-01, bis 2024-12-28, Schreibweise 2024-03-01 |
| umsatz | Zahl oder Betrag | 56,05 bis 9.793,86, Tausenderpunkt |

Die Spanne für `kundennr` kommt aus der Vorlage:

```jq
[.[].kundennr] | min, max
```

Ergebnis: `"K-10001"` und `"K-11213"`.

Oben rechts fügt **Feld hinzufügen** ein neues Feld `feld1` mit "Text aus Wörtern" an. Sobald du etwas änderst, steht oben "geändert", und **Zurücksetzen** holt die Spezifikation wieder aus der Vorlage.

## Die Erzeuger

| Erzeuger | Einstellungen |
|---|---|
| Laufende Nummer mit Muster | **Muster**: `#` steht für eine Ziffer, mehrere `#` füllen mit Nullen auf (`K-#####` wird `K-00001`); **ab**: erste Nummer; **Schritt**: Abstand; **Als**: Text oder Zahl (Zahl nur, wenn das Muster nur aus `#` besteht). Immer eindeutig. |
| Name | **Teil**: Vor- und Nachname, Vorname oder Nachname |
| Postleitzahl | **Gebiet von**, **Gebiet bis**: erste zwei Ziffern (01 bis 99). Fünf Ziffern als Text, damit die führende Null bleibt. |
| Ort zur Postleitzahl | keine; passt zu Postleitzahl und Vorwahl im selben Datensatz |
| Straße | **Hausnummer**: mit oder ohne |
| E-Mail | **Domain**: Teil nach dem @, leer für verschiedene Domains mit der Endung `.example`; **Eindeutig**: hängt eine laufende Zahl an (`lena.hartmann1@...`) |
| Telefonnummer | **Netz**: Festnetz (mit der Vorwahl des Orts) oder Mobil; **Schreibweise**: `0341 5583214`, `0341/5583214` oder `+49 341 5583214` |
| Datum | **von**, **bis** (JJJJ-MM-TT, auch TT.MM.JJJJ wird angenommen); **Schreibweise**: `2024-03-01` oder `01.03.2024` |
| Zeitpunkt | **von**, **bis**; Datum mit Uhrzeit in ISO-Form, in UTC |
| Zahl oder Betrag | **von**, **bis**, **Nachkommastellen** (0 bis 6); **Schreibweise**: Zahl, Text `1087.15` oder Text `1.087,15` |
| Ja oder nein | **Anteil ja (%)**; **Schreibweise**: `true/false`, `"true"/"false"` als Text oder `ja/nein` |
| Auswahl aus Werten | **Werte**: je Zeile ein Wert, nach `=` sein Gewicht (`Leipzig=12`); ein Wert mit Gewicht 3 kommt dreimal so oft wie einer mit 1. **Als**: Text oder Zahl |
| Text aus Wörtern | **Wörter von**, **Wörter bis**; neutrale Wörter, das erste groß |
| Fester Wert | **Wert**; **Als**: Text, Zahl, Wahrheitswert oder null |
| UUID | keine; zufällige Kennung der Version 4, aus dem Startwert wiederholbar |

Dazu kommen zwei Erzeuger, die nur Aufbau tragen: **Objekt** fasst die Felder darunter zusammen, **Liste** hat **Länge von** und **Länge bis**, ihre Einträge beschreibt das Feld mit `[]` darunter. Bei bestellungen.json entstehen so `kunde` als Objekt und `positionen` als Liste mit "1 bis 4 Einträge".

Je Datensatz passen Name und E-Mail zusammen, ebenso Postleitzahl, Ort und Vorwahl. Ohne eigene Domain enden E-Mail-Adressen auf `.example`, eine Endung, die für Beispiele reserviert ist und niemanden erreicht. Stehen in der Vorlage alle Adressen unter einer Domain, übernimmt die Spezifikation diese nur, wenn sie ebenfalls für Beispiele reserviert ist (bei kunden.csv `example.org`); eine echte Domain aus der Vorlage übernimmt sie nie, damit erfundene Adressen niemanden erreichen.

## Leer-Anteil

Echte Daten haben Lücken. Im Inspektor stellst du je Feld ein, in wie viel Prozent der Datensätze es leer bleibt ("Leer in % der Datensätze"), und wie: **Schlüssel fehlt**, **null** oder **leerer Text**. In der Tafel steht das als Marke, etwa "leer 80 % null". Den Anteil übernimmt die Ableitung aus der Vorlage: In bestellungen.json ist `notiz` in 103 von 128 Bestellungen `null`,

```jq
[.bestellungen[] | select(.notiz == null)] | length
```

Ergebnis: `103`, also leer 80 % als null, sonst die Auswahl "Bitte klingeln".

## Erzeugen

Unter der Spezifikation liegt die Karte **Erzeugen**:

| Angabe | Bedeutung |
|---|---|
| Anzahl | wie viele Datensätze, bis 1.000.000; Vorgabe 100 |
| Startwert | Zahl, aus der der Zufall folgt; Vorgabe 4711; der Würfel im Feld wählt einen neuen |
| Zielformat | CSV, JSON, NDJSON oder YAML; vorgewählt wie die Vorlage |
| Trennzeichen | bei CSV: Semikolon, Komma oder Tabulator; vorgewählt wie in der Vorlage |
| Name | Name des Ergebnisses; leer heißt aus dem Dokumentnamen (`kunden-testdaten.csv`) |

**Erzeugen** startet den Lauf. Er rechnet in **Blöcken** von mindestens 100 Datensätzen, meist etwa zehn Stück; ein Balken zeigt jeden Block, darüber "Block 3 von 10" und die geschätzte Restzeit. **Anhalten** hält nach dem laufenden Block an, **Fortsetzen** läuft weiter; schon Erzeugtes lässt sich auch angehalten nehmen. Jede Änderung an Spezifikation, Anzahl oder Startwert verwirft den Lauf. Blöcke ändern nichts am Ergebnis: Mit dem Startwert 4711 entstehen in einem Rutsch oder in Etappen dieselben Datensätze.

## Beispiel: Kunden zum Testen

Öffne kunden.csv aus den Beispielen und dann Testdaten. Zielformat ist CSV mit Semikolon, Anzahl 100, Startwert 4711. Die Vorschau zeigt schon vor dem Lauf die ersten fünf:

```csv
kundennr;name;plz;ort;email;telefon;angelegt;umsatz
K-10001;Ida Lehmann;04244;Leipzig;ida.lehmann@example.org;0341 441386;2024-02-25;1.885,36
K-10002;Lina Nguyen;81815;München;lina.nguyen@example.org;089 6754049;2024-07-15;5.899,33
```

Postleitzahl, Ort und Vorwahl passen jeweils zusammen, die führende Null von `04244` bleibt. Nach "Erzeugen" und "Als neues Dokument" liegt `kunden-testdaten.csv` neben der Vorlage und öffnet in der Tabelle. Darin prüfst du:

```jq
[.[].kundennr] | first, last
```

Ergebnis: `"K-10001"` und `"K-10100"`.

## Was der Inspektor zeigt

- **Gewählt**: der Name des Felds (hier umbenennen), die Beschreibung des Erzeugers, die Erzeuger als Knöpfe zum Wechseln (ein Wechsel setzt die Einstellungen auf dessen Vorgaben), alle Einstellungen des Erzeugers, der Leer-Anteil mit seiner Art und "Feld entfernen" (samt allem darunter).
- **In der Vorlage**: wie das Feld im Dokument aussieht, mit Typ, wie oft es fehlt, wie viele verschiedene Werte und welche Spanne. Bei `plz` in kunden.csv: immer Text, 5 Zeichen, 12 verschiedene, Spanne `01067` bis `80331`, und der Satz "Als Zahl gelesen ginge die führende Null verloren, darum Text."
- **Beispiele mit Startwert 4711**: fünf Werte des Felds, bei `umsatz` etwa `1.885,36`, `5.899,33`, `7.631,00`, `1.140,57`, `9.708,62`.
- **Im Browser**: Die Daten entstehen nur hier.

Die Karte **Vorschau** im Hauptbereich zeigt die ersten fünf Datensätze als **Tabelle** oder als **Text** im Zielformat; nach dem Lauf die ersten fünf des Ergebnisses.

## Ergebnis übernehmen und Spezifikation speichern

- **Als neues Dokument** legt das Ergebnis in der [Ablage](#ablage) ab, im selben Ordner wie die Vorlage, und öffnet es in der Tabelle.
- **Herunterladen** speichert es als Datei.
- **Spezifikation speichern** (oben rechts) legt Spezifikation, Anzahl, Startwert, Zielformat und Trennzeichen als Dokument `kunden.testdaten.json` ab. Geöffnet dient es dem Werkzeug als Vorlage und erzeugt dieselben Daten wieder, auch auf einem anderen Gerät.

Geänderte Einstellungen halten, solange das Dokument offen ist; dauerhaft nur über Spezifikation speichern. Die Vorlage selbst ändert Testdaten nie.

## Grenzen

- Höchstens 1.000.000 Datensätze je Lauf; darüber wird der Speicher des Browsers knapp.
- Orte, Postleitzahlen, Straßen und Vorwahlen stammen aus Deutschland; Adressen anderer Länder gibt es nicht.
- Zusammenhänge über Felder hinweg gibt es nur für Person (Name, E-Mail) und Wohnort (Postleitzahl, Ort, Vorwahl); ein Datum "geliefert nach bestellt" kennen die Erzeuger nicht.
- Ein Muster wie bei der laufenden Nummer gibt es für freie Texte nicht; dafür Auswahl aus Werten oder Text aus Wörtern nehmen.
