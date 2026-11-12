---
titel: Konvertieren
unterzeile: In ein anderes Format umschreiben und vorher sehen, was verloren geht
bereich: Werkzeuge
symbol: fa-shuffle
stichworte: konvertieren, umwandeln, umformen, convert, export, csv, json, json lines, ndjson, yaml, toml, xml, markdown, html, xlsx, tabellendatei, trennzeichen, semikolon, kopfzeile, header, verlustkarte, flach, flatten, verschachtelt
reihenfolge: 40
quellen: [RFC 4180: CSV](https://www.rfc-editor.org/rfc/rfc4180), [YAML 1.1](https://yaml.org/spec/1.1/), [TOML 1.0](https://toml.io/en/v1.0.0)
---

Konvertieren schreibt dein Dokument in ein anderes Format um: JSON in CSV, CSV in YAML, TOML in JSON und so weiter. Nicht jedes Format kann alles. CSV kennt keine Verschachtelung und keine Typen, TOML kein `null`, XML braucht ein Wurzelelement. Deshalb steht über dem Ergebnis die **Verlustkarte**: eine ehrliche Liste dessen, was das Ziel nicht abbilden kann, mit Zahlen aus deinem Dokument. Das Dokument selbst bleibt dabei unverändert; das Ergebnis wird ein neues Dokument oder eine Datei.

## Wo du es findest

Leiste links, Abschnitt "Prüfen und umbauen", [Konvertieren](#werkzeug:konvertieren); oder die Befehlspalette (⌘ K, unter Windows und Linux Strg K). Geschlossen wird es über den Knopf mit seinem Namen und dem Kreuz oben im Kopf des Hauptbereichs. Das gewählte Ziel steht in der Adresse (`/konvertieren?ziel=yaml`).

## Zielformate

Oben steht "Von JSON nach" (oder dem Format deines Dokuments) und ein Segment mit den Zielen; das eigene Format fehlt darin. Vorgewählt ist das erste, meist CSV.

| Ziel | Ergebnis | Mehr dazu |
|---|---|---|
| CSV | Text, eine Zeile je Eintrag der Hauptliste | [CSV](#csv) |
| JSON Lines | Text, ein Datensatz je Zeile | [JSON Lines](#ndjson) |
| JSON | Text, alles wie es ist | [JSON](#json) |
| YAML | Text nach den Regeln von YAML 1.1 | [YAML](#yaml) |
| TOML | Text, oben muss ein Objekt stehen | [TOML](#toml) |
| XML | Text mit einem Wurzelelement | [XML](#xml) |
| Markdown | Tabellen zum Lesen | [Markdown](#markdown) |
| HTML | eine Seite mit Tabellen, nur zum Herunterladen | |
| XLSX | eine Tabellendatei, nur zum Herunterladen | [XLSX](#xlsx) |

Die **Hauptliste** ist die Liste, die auch die [Ansicht Tabelle](#ansicht:tabelle) zeigt, bei bestellungen.json also `bestellungen`. Aus ihren Einträgen werden die Zeilen der Tabellenziele (CSV, XLSX, Markdown, HTML) und die Datensätze von JSON Lines.

## Optionen

Welche Optionen erscheinen, hängt vom Ziel ab:

| Option | Werte | Gilt für |
|---|---|---|
| Trennzeichen | `;` (Semikolon, wie es Tabellenprogramme im deutschen Raum erwarten), `,` (Komma), Tab | CSV |
| Objekte | **Als Spalten a.b**: aus `kunde` werden `kunde.name`, `kunde.plz` und so fort; **Als JSON-Text**: das Objekt steht als JSON in einer Zelle | CSV, Markdown, HTML, XLSX |
| Kopfzeile | **Mit** oder **Ohne** Zeile mit den Spaltennamen | CSV |

Steckt in den Einträgen eine Liste, bietet die Verlustkarte selbst drei Wege zur Wahl an (siehe unten). Vorgabe ist Semikolon, Objekte als Spalten, Kopfzeile mit, eine Zeile je Listeneintrag.

## Die Verlustkarte

Die Karte heißt "Was CSV nicht kann" (mit dem Namen des Ziels) und zählt ihre Punkte. Kann das Ziel alles abbilden, steht dort "Nichts geht verloren" mit dem Abzeichen "vollständig". Bei bestellungen.json nach YAML ist das so. Die Punkte, die vorkommen können:

- **Listen in den Einträgen** (CSV, XLSX, Markdown, HTML): drei Wege, jeder mit Zeilen und Spalten vorab gezählt. "Eine Zeile je Eintrag" wiederholt die übrigen Werte, "Spalten je Eintrag" legt `positionen.0.artikel`, `positionen.1.artikel` und so weiter an, "Liste als JSON-Text in einer Zelle" bleibt vollständig und lässt sich in der Tabelle nicht mehr rechnen. Weitere Listen im selben Eintrag stehen immer als JSON-Text.
- **Typen gehen verloren**: In CSV, Markdown und HTML ist jede Zelle Text. Mit Beispielen aus deinen Daten und dem Hinweis auf Nummern mit führender Null (mehr bei [Zahlen als Text](#zahlen-als-text)).
- **null und leer sehen gleich aus**: nennt die Spalte mit den meisten `null`.
- **Felder außerhalb der Hauptliste fehlen** (CSV, JSON Lines); XLSX, Markdown und HTML legen sie auf ein eigenes Blatt oder eine zweite Tabelle "Angaben".
- **Ohne Kopfzeile fehlen die Namen** (CSV ohne Kopfzeile).
- **Kommentare gehen verloren** (aus JSON mit Kommentaren, YAML, TOML, XML).
- **Datum und Zeit werden Text** (aus TOML, das dafür eigene Typen hat).
- **Werte bleiben Text** (aus CSV und XML, die keine Typen kennen); vorher umwandeln geht mit [Bereinigen](#bereinigen), Reiter Typen.
- **TOML braucht oben ein Objekt**: Ist dein Dokument oben eine Liste, steht sie unter `eintraege`, jeder Eintrag als eigener Abschnitt `[[eintraege]]`.
- **TOML kennt kein null**: solche Felder fallen weg, die Karte nennt sie. Bei bestellungen.json sind es 103 Stellen im Feld `notiz`.
- **XML**: braucht ein Wurzelelement (sonst steht alles unter `<daten>`), jeder Wert wird Text, `null` wird ein leeres Element; Namen, die XML nicht erlaubt, werden angepasst und genannt. Felder mit `@` werden Attribute, `#text` wird Text.
- **Nicht lesbare Stellen**: Was der Leser nicht versteht, kommt nur als Text oder gar nicht mit; vorher [Reparieren](#reparieren).

YAML wird nach den Regeln von 1.1 geschrieben: Texte wie `yes`, `on` oder `2026-11-01` stehen in Anführungszeichen und bleiben so in jedem Leser Text. XLSX behält Zahlen, Wahrheitswerte und Datum als Typ, Nummern mit führender Null bleiben Text, die Kopfzeile ist fett und bleibt beim Rollen stehen.

## Beispiel: bestellungen.json nach CSV

Öffne bestellungen.json aus den Beispielen und dann Konvertieren; CSV ist vorgewählt. Die Verlustkarte hat 4 Punkte:

1. `positionen` sind Listen: 3 Möglichkeiten. "Eine Zeile je Eintrag in positionen: 297 Zeilen", "Spalten je Eintrag: 128 Zeilen; positionen.0.artikel bis positionen.3.preis, 12 Spalten", "Liste als JSON-Text in einer Zelle: 128 Zeilen".
2. Typen gehen verloren: `1`, `4.2` und `true` kommen als Zeichen an; die Nummer `06108` in `kunde.plz` bleibt nur richtig, wenn das lesende Programm die Spalte als Text nimmt.
3. null und leer sehen gleich aus: `notiz` ist in 242 von 297 Zeilen `null`.
4. `shop` und `stand` fehlen: CSV kennt nur eine Tabelle.

Die Zahlen stammen aus deinen Daten. 297 ist die Summe aller Positionen:

```jq
[.bestellungen[].positionen | length] | add
```

Ergebnis: `297`. Die längste Bestellung hat 4 Positionen, daher die Spalten `positionen.0` bis `positionen.3`:

```jq
[.bestellungen[].positionen | length] | max
```

Ergebnis: `4`.

Das Ergebnis beginnt so:

```csv
nr;datum;kunde.name;kunde.plz;kunde.stadt;positionen.artikel;positionen.menge;positionen.preis;bezahlt;notiz
B-24017;2026-11-01;Marta Demir;06108;Halle (Saale);Kartoffeln 2,5 kg;1;4.2;true;
B-24017;2026-11-01;Marta Demir;06108;Halle (Saale);Apfelsaft naturtrüb 1 l;5;2.49;true;
```

Wählst du in der Karte "Spalten je Eintrag", hat die CSV 128 Zeilen und 19 Spalten; mit "Liste als JSON-Text" 128 Zeilen und 8 Spalten.

Andere Richtung: kunden.csv nach JSON hat einen Punkt, "Werte bleiben Text": Aus `3.309,23` wird `"3.309,23"`, kein Betrag. Willst du echte Zahlen, wandle die Spalte vorher mit [Bereinigen](#bereinigen) um.

## Quelle und Ergebnis

Unter der Karte stehen zwei Tafeln nebeneinander: **Quelle** mit deinem Dokument und **Ergebnis** mit dem neuen Namen (`bestellungen.csv`), je die ersten 40 Zeilen und darunter, wie viele noch folgen. Bei XLSX zeigt die Ergebnistafel die Zellen als Text, weil die Datei selbst kein Text ist.

## Was der Inspektor zeigt

- **Ergebnis**: Datensätze (bei JSON Lines) oder Zeilen, etwa "297 + Kopfzeile", Spalten, Größe, Kodierung UTF-8 oder bei XLSX die Zahl der Blätter.
- **Spalten**: woher jede Spalte kommt. Bei bestellungen.json nach CSV: `nr`, `datum` aus dem Eintrag; `kunde.name`, `kunde.plz`, `kunde.stadt` aufgeklappt; `positionen.artikel`, `positionen.menge`, `positionen.preis` eine Zeile je Eintrag; `bezahlt`, `notiz` aus dem Eintrag.
- **Wohin**: was die beiden Knöpfe unten bewirken.
- **Im Browser**: Nichts geht an einen Server.

## Ergebnis übernehmen

- **Als neues Dokument** legt das Ergebnis in deiner [Ablage](#ablage) ab, im selben Ordner wie die Quelle, und öffnet es als eigenen Reiter (CSV in der Tabelle, sonst im Baum).
- **Herunterladen** speichert die Datei auf deinem Gerät.

HTML und XLSX gibt es nur zum Herunterladen. Eine XLSX-Datei lässt sich später wieder öffnen; Strukturblick liest sie dann als JSON-Dokument mit einer Liste je Blatt. Konvertieren ändert dein Dokument nie; Rückgängig braucht es hier deshalb nicht.

## Grenzen

- Tabellenziele nehmen nur die Hauptliste; Felder daneben fehlen in CSV und JSON Lines.
- Nur die häufigste Liste in den Einträgen lässt sich aufteilen, weitere bleiben JSON-Text.
- Ein XLSX-Blatt fasst 1.048.576 Zeilen und 16.384 Spalten, eine Zelle 32.767 Zeichen; was darüber liegt, nennt die Karte und lässt es weg oder kürzt.
- Konvertieren schreibt immer UTF-8.
