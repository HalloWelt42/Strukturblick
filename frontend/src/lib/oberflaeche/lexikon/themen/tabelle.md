---
titel: Tabelle
unterzeile: Eine Liste des Dokuments als Tabelle zum Lesen, Sortieren, Filtern und Bearbeiten
bereich: Ansichten
symbol: fa-table
stichworte: tabelle, table, grid, raster, spalten, zeilen, spaltenkopf, typvorschlag, profil, filter, sortieren, sort, bearbeiten, zelle, duplikate, doppelte, spalte entfernen, exportieren, verschachtelt, aufklappen, hineingehen, zurück, dialekt, trennzeichen, kopfzeile, csv
reihenfolge: 30
quellen:
---

Die Tabelle zeigt eine Liste deines Dokuments mit einer Zeile je Eintrag und einer Spalte je Schlüssel. Für Daten wie kunden.csv oder die Bestellungen in bestellungen.json ist das die vertrauteste Form: Spalten sortieren, Zeilen filtern, Werte direkt in der Zelle ändern. Jede Änderung landet als Textänderung an genau dieser Stelle im Dokument; Trennzeichen, Kommentare und Formatierung bleiben. Du öffnest sie über den Reiter [Tabelle](#ansicht:tabelle) oder mit ⌥ ⌘ 3 (unter Windows und Linux Strg Alt 3).

## Welche Liste

Ein Dokument kann mehrere Listen enthalten. Die Tabelle nimmt:

1. die Liste, die sie gerade zeigt, solange du darin etwas wählst;
2. sonst die gewählte Liste oder die nächste Liste, in der das Gewählte liegt;
3. sonst das ganze Dokument, wenn es selbst eine Liste ist (wie bei CSV);
4. sonst die erste Liste gleich aufgebauter Objekte von oben.

Bei bestellungen.json ist das ohne Wahl die Liste `bestellungen` mit 128 Zeilen, bei kunden.csv die ganze Datei mit 1.214 Zeilen. Eine andere Liste zeigst du, indem du sie im [Baum](#baum) wählst und auf "Als Tabelle" klickst, oder über den Pfad oben in der Tabelle. Gibt es keine passende Liste, sagt die Tabelle das und bietet "Im Baum ansehen".

## Was du siehst

**Werkzeugzeile** von links nach rechts: "Zurück" (nur in einer verschachtelten Liste), der Pfad der gezeigten Liste, das Feld "Zeilen filtern ...", der Zähler ("128 von 128 Zeilen"), dann rechts "Spalte entfernen" (nur bei gewählter Spalte), "Duplikate prüfen", "Exportieren" und bei CSV die Leseweise.

**Raster**: ganz links die Spalte "Zeile" mit der Zeilennummer in der Datei. Kopf, Zeilennummer und erste Spalte bleiben beim Rollen stehen. Zahlen und Beträge stehen rechtsbündig.

Eine Zelle zeigt den Wert. Besondere Fälle:

| Anzeige | Bedeutung |
|---|---|
| fehlt | Dieser Eintrag hat den Schlüssel nicht |
| leer | Der Wert ist ein leerer Text |
| `null` | Der Schlüssel ist da, sein Wert ist null (ohne Inhalt) |
| Kästchen am Ende | Der Text endet mit einem Leerzeichen |
| `{Marta Demir, 06108, Halle (Saale)}` | Ein Objekt, als Auszug seiner Werte |
| `[2] Kartoffeln 2,5 kg, Apfelsaft naturtrüb 1 l` | Eine Liste mit 2 Einträgen, je Eintrag sein erster Wert |

## Der Spaltenkopf

Jeder Kopf hat drei Teile:

1. **Name** der Spalte. Er behält immer seinen Platz.
2. **Typvorschlag** als Abzeichen, daneben die Knöpfe zum Sortieren und, bei Objekten, zum Aufklappen.
3. **Profil**: der Anteil leerer Werte ("leer 0 %"), die Zahl verschiedener Werte ("128 verschiedene", bei Objekten und Listen "verschachtelt") und ein Balken mit den häufigsten Werten. Fährst du über ein Stück des Balkens, steht Wert und Anzahl da.

Der Typvorschlag sagt, welche Art die gefüllten Werte haben: Text, Zahl, Wahrheitswert, Objekt, Liste, Gemischt oder leer. Bei Text schaut Strukturblick zusätzlich, wonach mindestens 95 von 100 Werten aussehen: "Text, sieht aus wie Zahl", "Text, sieht aus wie Datum" oder "Text, sieht aus wie Betrag". Das ist nur ein Vorschlag, umgewandelt wird nichts. In kunden.csv steht so an `plz` "Text, sieht aus wie Zahl", an `angelegt` "Text, sieht aus wie Datum" und an `umsatz` "Text, sieht aus wie Betrag" (Beträge wie `3.309,23`). Einheitlich umschreiben lassen sich solche Werte im Werkzeug [Bereinigen](#bereinigen); warum Postleitzahlen besser Text bleiben, steht bei [Zahlen als Text](#zahlen-als-text).

Die Breite ziehst du am rechten Rand des Kopfs. Hast du den Griff mit der Tastatur erreicht, ändern ← und → die Breite schrittweise.

## Wählen, Sortieren, Filtern

- **Klick auf eine Zelle** wählt den Wert. Der Inspektor rechts zeigt ihn mit Pfad und allen Werten dieses Pfads, wie beim [Baum](#baum/der-inspektor-rechts).
- **Klick auf die Zeilennummer** wählt den ganzen Eintrag.
- **Klick auf einen Spaltenkopf** wählt die Spalte. Der Inspektor zählt dann alle Werte dieser Spalte: Bei `ort` in kunden.csv etwa 1.214 Stellen, am häufigsten `"Berlin"` 286, `"Hamburg"` 241, `"München"` 198.
- **Pfeiltasten** bewegen die Wahl von Zelle zu Zelle.

**Sortieren** geht über den Knopf im Kopf in drei Stufen: aufsteigend, absteigend, aus. Zahlen werden nach ihrem Wert sortiert, auch in deutscher Schreibweise wie `1.234,50`; Texte nach dem Alphabet, wobei `K-9` vor `K-10` kommt. Leere Zellen stehen immer am Ende.

**Filtern**: Tipp in "Zeilen filtern ...". Es bleiben die Zeilen, in denen der Text in einer Zelle vorkommt, ohne Rücksicht auf Groß- und Kleinschreibung. Escape oder "Filter aufheben" zeigt wieder alle. In kunden.csv lässt "leipzig" 142 von 1.214 Zeilen stehen.

Sortieren und Filtern sind nur Sicht: Das Dokument bleibt, wie es ist.

## Werte bearbeiten

**Doppelklick** auf eine Zelle, **Enter** oder **F2** öffnet das Eingabefeld mit dem markierten Inhalt. Tippen ersetzt ihn.

| Taste im Feld | Wirkung |
|---|---|
| Enter | Übernehmen |
| Tab, ⇧ Tab | Übernehmen und zur nächsten oder vorigen Zelle, über Zeilenenden hinweg |
| Escape | Abbrechen |
| Klick daneben | Übernehmen |

Eine eben geänderte Zelle trägt kurz ein Stiftzeichen; fährst du darüber, steht der alte Wert da. Für die Art des neuen Werts gelten dieselben Regeln wie im Baum (ein Text bleibt Text, eine Zahl bleibt Zahl, solange die Eingabe eine ist, siehe [Baum](#baum/wert-aendern)). In CSV ist jeder Wert Text. Jede Änderung ist ein Schritt im Verlauf, ⌘ Z nimmt sie zurück. Solange nach einer Änderung neu gelesen wird, steht "liest" in der Werkzeugzeile und Bearbeiten wartet.

Fehlt einer Zeile der Schlüssel (die Zelle zeigt "fehlt"), lässt sie sich hier nicht füllen; das geht im [Editor](#editor).

## Verschachtelte Werte

Steckt in einer Spalte ein Objekt oder eine Liste, zeigt die Zelle einen Auszug und einen kleinen Knopf.

### Objekte in Spalten aufklappen

Der Knopf in einer Objektzelle (oder der Knopf mit den Spalten im Kopf, oder ein Doppelklick) klappt die Felder als eigene Spalten auf. Aus `kunde` in bestellungen.json werden `kunde.name`, `kunde.plz` und `kunde.stadt`; das `kunde.` steht gedämpft davor. Liegt darin wieder ein Objekt, klappst du es genauso weiter auf. Der Knopf zum Zuklappen im Kopf einer aufgeklappten Spalte führt alles wieder zu einer Spalte zusammen.

Der Filter sucht nur in einfachen Werten. "Leipzig" findet in bestellungen.json deshalb erst etwas, wenn `kunde` aufgeklappt ist; dann sind es 33 Zeilen.

### In Listen hineingehen

Der Knopf in einer Listenzelle (oder ein Doppelklick) zeigt die Einträge dieser Liste als eigene Tabelle. Der Pfad oben sagt, wessen Liste es ist, mit dem ersten Wert des Eintrags: `$ > bestellungen > [1] B-24018 > positionen` zeigt die eine Position der zweiten Bestellung mit den Spalten `artikel`, `menge` und `preis`.

**Zurück** führt in die Liste, aus der du gekommen bist, mit dem Eintrag gewählt. Jeder Teil des Pfads führt ebenso hinaus: Eine Liste zeigt sich als Tabelle, ein Eintrag die Liste, in der er steht. Die gezeigte Liste und die aufgeklappten Spalten stehen in der Adresse, ein Lesezeichen führt also genau hierher (siehe [Adressen](#adressen)).

## Duplikate prüfen

"Duplikate prüfen" sucht Zeilen, die doppelt vorkommen. Strukturblick schlägt dafür eine Spalte vor, die als Schlüssel taugt: in jeder Zeile gefüllt, fast überall verschieden, Namen wie `nr`, `id` oder `kundennr` zuerst. Das Abzeichen am Knopf zählt die Gruppen schon vorab.

In kunden.csv ist das `kundennr`. Das Blatt "Doppelte kundennr" findet 1 Gruppe: `K-10005` steht in Zeile 6 und in Zeile 1.215, die Zeilen unterscheiden sich nur in `telefon`. Abweichende Werte sind markiert.

Im Blatt stellst du ein:

- **Gleich in**: die vorgeschlagene Spalte, "Ganze Zeile" oder über "Spalten wählen" mehrere Spalten, die alle gleich sein müssen. Nach ganzen Zeilen gibt es in kunden.csv keine Duplikate.
- **Vorauswahl**: welche Zeile je Gruppe bleibt, "Erste Zeile", "Letzte Zeile" oder "Meiste Angaben". Ein Klick auf "wird entfernt" in einer Gruppe behält stattdessen diese Zeile ("Eigene Wahl").

Unten steht die Vorschau ("Entfernt 1 Zeile, danach 1.213 Zeilen"). **Übernehmen** entfernt die Zeilen als ein Schritt im Verlauf, Escape oder "Abbrechen" schließt ohne Änderung. Nach einer Regel aufgelöst, wird der Vorgang ein Schritt für [Rezepte](#rezepte); eine eigene Wahl gilt nur für diese Datei.

## Spalte entfernen

Klick auf einen Spaltenkopf, dann auf "Spalte entfernen": Der Schlüssel verschwindet aus allen Einträgen der Liste, bei CSV samt Kopfzelle. Auch das ist ein Schritt im Verlauf und wird ein Schritt für [Rezepte](#rezepte).

## Exportieren

"Exportieren" nimmt genau die sichtbaren Zeilen, mit Filter und Sortierung wie angezeigt:

- **Als neues Dokument in der Ablage**, im selben Ordner wie die Quelle. Aus einer CSV wird wieder eine CSV, sonst JSON.
- **Als Datei** in JSON (eine Liste), NDJSON (ein Eintrag je Zeile) oder CSV mit Semikolon.

Der Name endet auf `-tabelle`, mit Filter oder Sortierung auf `-auswahl`, etwa `kunden-auswahl.csv`. Mehr bei [Exportieren](#exportieren); für andere Formate und für Listen in den Einträgen gibt es [Konvertieren](#konvertieren).

## Leseweise bei CSV

Bei CSV steht rechts in der Werkzeugzeile, wie Strukturblick die Datei liest, bei kunden.csv "Semikolon, Kopfzeile". "Ändern" öffnet die Wahl:

- **Trennzeichen**: Komma, Semikolon, Tab oder Senkrechter Strich.
- **Erste Zeile**: Kopfzeile (die Namen der Spalten) oder Daten.

Die Wahl gilt sofort und wird mit dem Dokument gespeichert. Mehr bei [CSV](#csv).

## Tastenkürzel

| Kürzel | Wirkung |
|---|---|
| ⌥ ⌘ 3 | Ansicht Tabelle |
| Pfeiltasten | Zelle wählen |
| Enter oder F2 | Zelle bearbeiten |
| Tab, ⇧ Tab | Im Feld: übernehmen und weiter |
| Escape | Feld abbrechen, Filter leeren, Blatt Duplikate schließen |
| ⌘ Z | Letzte Änderung zurücknehmen |

## Grenzen

- Eine Zelle zeigt höchstens 300 Zeichen; den ganzen Wert zeigt der Inspektor.
- Das Blatt Duplikate zeigt die ersten 50 Gruppen; die übrigen werden nach derselben Vorauswahl aufgelöst. Bei mehr als 20.000 Zeilen zählt das Abzeichen nicht vorab, das Blatt prüft trotzdem alle.
- Bei Listen aus einfachen Werten (etwa `["a", "b"]`) steht alles in einer Spalte namens "(Wert)"; sie lässt sich nicht entfernen.

## Passt dazu

- [Statistik](#statistik) für ein ausführliches Profil jeder Spalte
- [Bereinigen](#bereinigen) für Facetten, ähnliche Schreibweisen und Typen
- [SQL](#sql), um mehrere Tabellen zu verknüpfen
- [CSV](#csv) und [XLSX](#xlsx) für Tabellendateien
