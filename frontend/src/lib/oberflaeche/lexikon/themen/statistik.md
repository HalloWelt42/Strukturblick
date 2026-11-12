---
titel: Statistik
unterzeile: Kennzahlen des Dokuments und ein Profil je Feld
bereich: Ansichten
symbol: fa-chart-column
stichworte: statistik, kennzahlen, profil, feldprofil, profiling, data profiling, auswertung, typverteilung, histogramm, verteilung, muster, eindeutig, schlüssel, datum, führende null, leer-anteil, fehlende werte, null, spanne, bereich, verschiedene werte
reihenfolge: 40
quellen:
---

Die Statistik verschafft dir einen Überblick, bevor du dich in einzelne Werte vertiefst: Wie groß ist das Dokument, welche Felder gibt es, wie oft fehlen sie, welche Werte kommen vor und was fällt auf. So merkst du früh, dass eine Postleitzahl als Text dasteht, dass eine Kundennummer doppelt vorkommt oder dass ein Datum in zwei Schreibweisen auftaucht. Du öffnest sie über den Reiter [Statistik](#ansicht:statistik) oder mit ⌥ ⌘ 4 (unter Windows und Linux Strg Alt 4).

## Welche Liste

Die Kennzahlen gelten immer für das ganze Dokument. Das Feld-Profil darunter gilt für eine Liste, und zwar dieselbe, die auch die [Tabelle](#tabelle) zeigen würde: bei bestellungen.json die 128 Bestellungen, bei kunden.csv die 1.214 Zeilen. Sie bleibt, solange das Gewählte darin liegt, auch tief darin wie bei einem Preis in den Positionen. Wählst du etwas außerhalb, sucht die Statistik die passende Liste neu. Gibt es keine Liste, wird das Dokument selbst profiliert.

Oben in der Werkzeugzeile steht der Pfad der profilierten Liste, bei den Bestellungen `.bestellungen[]`, rechts daneben "Liste, berechnet in" und die Rechenzeit.

## Kennzahlen und Typverteilung

Sechs Kacheln zählen das ganze Dokument:

| Kachel | bestellungen.json | kunden.csv |
|---|---|---|
| Knoten | 2.472 | 10.927 |
| Tiefe | 5 | 2 |
| Größe | 62 KB | 113 KB |
| Objekte | 554 | 1.214 |
| Listen | 129 | 1 |
| Texte | 964 | 9.712 |

Ein **Knoten** ist jede Stelle im Dokument: jedes Objekt, jede Liste, jeder einzelne Wert. Die **Tiefe** ist der längste Weg von der Wurzel bis zu einem Wert; fährst du über die Kachel, steht die tiefste Stelle da. In bestellungen.json ist das etwa der Artikel einer Position, fünf Schritte unter der Wurzel. Die **Größe** zählt Byte, so wie die Datei gespeichert würde.

Die **Typverteilung** darunter zeigt als Band, wie sich alle Knoten auf die Arten verteilen. Bei bestellungen.json: Objekt 554 (22,4 %), Liste 129 (5,2 %), Text 964 (39 %), Zahl 594 (24 %), Wahrheitswert 128 (5,2 %), Null 103 (4,2 %). Eine CSV kennt keine Arten, dort ist jeder Wert Text (siehe [CSV](#csv)).

## Feld-Profil

Das Feld-Profil hat eine Zeile je Feld der Liste. Verschachtelte Felder stehen als **Musterpfad** da: `kunde.plz` ist die Postleitzahl im Objekt `kunde`, `positionen[].preis` der Preis in jedem Eintrag der Liste `positionen`. Felder, die nur Objekte enthalten (wie `kunde` selbst), fehlen, denn ihre Felder darunter sagen mehr.

| Spalte | Bedeutung |
|---|---|
| Feld | Musterpfad; der Teil davor gedämpft |
| Typ | Die Arten der Werte, die häufigste zuerst, etwa "Zahl, ganz" oder "Null oder Text" |
| Vorkommen | Wie oft das Feld vorkommt |
| Verschiedene | Wie viele verschiedene einfache Werte; bei Listen und Objekten "-" |
| Textlänge | Kürzester und längster Text |
| Bereich | Kleinster und größter Wert, siehe unten |
| Leer-Anteil | Anteil, in dem das Feld fehlt, null ist oder ein leerer Text |

Der **Bereich** richtet sich nach den Werten: Bei Zahlen gilt der Zahlenwert, bei Texten, die wie ein Datum aussehen, das Datum (auch `01.03.2024` wird dafür als `2024-03-01` gelesen), bei Beträgen wie `1.234,50` der Betrag. Gleich lange Texte wie Kennungen und Postleitzahlen stehen nach dem Alphabet da. Bei Wahrheitswerten zählt der Bereich `true` und `false`, bei Listen die Zahl der Einträge.

Ab 20 % fällt der Leer-Anteil als Abzeichen auf. Fährst du darüber, steht aufgeschlüsselt da, worin er besteht ("null in 103").

Ein Ausschnitt aus dem Profil der Bestellungen:

| Feld | Typ | Vorkommen | Verschiedene | Bereich | Leer-Anteil |
|---|---|---|---|---|---|
| nr | Text | 128 | 128 | B-24017 bis B-24144 | 0 % |
| datum | Text | 128 | 10 | 2026-11-01 bis 2026-11-10 | 0 % |
| kunde.plz | Text | 128 | 5 | 01067 bis 20095 | 0 % |
| positionen | Liste | 128 | - | 1 bis 4 Einträge | 0 % |
| positionen[].menge | Zahl, ganz | 297 | 6 | 1 bis 6 | 0 % |
| positionen[].preis | Zahl | 297 | 6 | 2.49 bis 8.5 | 0 % |
| bezahlt | Wahrheitswert | 128 | 2 | true 121, false 7 | 0 % |
| notiz | Null oder Text | 128 | 1 | Bitte klingeln | 80,5 % |

Die Zahl bei `notiz` kannst du mit [jq](#jq) nachrechnen:

```jq
.bestellungen | map(select(.notiz == null)) | length
```

Ergebnis: `103`, also 103 von 128 Bestellungen ohne Notiz.

## Feld wählen und Histogramm

Ein **Klick auf eine Zeile** des Profils wählt das Feld. Strukturblick wählt dabei sein erstes Vorkommen im Dokument, deshalb zeigt der Inspektor rechts gleich Pfad und **alle Werte dieses Pfads**: Anzahl, Typen, die Spanne bei Zahlen und die häufigsten Werte (mehr dazu beim [Baum](#baum/der-inspektor-rechts)). Das gewählte Feld trägt ein Fadenkreuz.

Das **Histogramm** zeigt, wie sich die Zahlen eines Felds verteilen: eine Säule je Klasse, darüber die Anzahl. Ohne Wahl nimmt es das erste Feld mit Zahlen, bei den Bestellungen `positionen[].menge` mit 297 Werten. Die Klassen sind dort je 1 breit:

| Menge | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Positionen | 59 | 44 | 45 | 56 | 46 | 47 |

Wählst du `positionen[].preis`, zeigt es die Preise in Klassen von je 1, mit Lücken zwischen 5 und 6 und zwischen 7 und 8. Gibt es kein Feld mit Zahlen, steht dort "Kein Feld mit Zahlen in dieser Liste." Das gilt für jede CSV, denn dort sind auch Zahlen Text.

## Muster

Die Tafel Muster nennt Felder, die auffallen. Ein Klick auf einen Eintrag wählt das Feld.

| Muster | Wann | Beispiel |
|---|---|---|
| eindeutig | Jeder Wert kommt genau einmal vor und das Feld fehlt nie. Es taugt als Schlüssel. | `nr` in bestellungen.json: 128 von 128 Werten verschieden |
| Datum | Mindestens 95 von 100 Texten sehen aus wie ein Datum | `datum`, 128 Werte |
| sieht aus wie Zahl | Texte aus Ziffern, davon welche mit führender Null; sie bleiben Text | `kunde.plz`: 73 mit führender Null |

Bei kunden.csv stehen zwei Muster da: `plz` mit 313 Postleitzahlen mit führender Null und `angelegt` mit 1.214 Datumsangaben, obwohl dort zwei Schreibweisen gemischt sind (`2024-02-02` und `01.01.2024`). Auffällig ist, was fehlt: `kundennr` gilt dort nicht als eindeutig, denn das Profil zählt 1.213 verschiedene bei 1.214 Werten. Die doppelte Nummer findest du in der Tabelle mit "Duplikate prüfen" (siehe [Tabelle](#tabelle/duplikate-pruefen)).

Mehr zu solchen Werten bei [Zahlen als Text](#zahlen-als-text) und [Datum und Zeit](#datum-und-zeit). Umschreiben lassen sie sich im Werkzeug [Bereinigen](#bereinigen) unter Typen.

## Tastenkürzel

| Kürzel | Wirkung |
|---|---|
| ⌥ ⌘ 4 | Ansicht Statistik |

Die Statistik bedienst du mit der Maus; Kürzel für alle Ansichten stehen bei [Tastatur](#tastatur).

## Grenzen

- Verschiedene Werte zählt die Statistik je Feld genau bis 50.000; darüber steht "über 50.000".
- Die Statistik zeigt und ändert nichts am Dokument. Ändern geht im [Baum](#baum), in der [Tabelle](#tabelle) oder mit [Bereinigen](#bereinigen).
- Gezählt wird, was im Text steht. In einer CSV ist jeder Wert Text; dort sagen die Muster, wonach die Werte aussehen.

## Passt dazu

- [Struktur](#struktur) für das Schema, das sich aus denselben Feldern ableitet
- [Testdaten](#testdaten), das je Feld einen passenden Erzeuger aus diesem Profil wählt
- [Begriffe](#begriffe) für Knoten, Musterpfad und Schlüssel
