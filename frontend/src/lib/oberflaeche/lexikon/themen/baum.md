---
titel: Baum
unterzeile: Das Dokument als aufklappbare Gliederung, Ebene für Ebene
bereich: Ansichten
symbol: fa-folder-tree
stichworte: baum, baumansicht, gliederung, tree, tree view, aufklappen, zuklappen, ebenen, knoten, suche im baum, treffer, wert ändern, bearbeiten, inspektor, pfad kopieren, alle werte dieses pfads, als tabelle
reihenfolge: 10
quellen:
---

Der Baum zeigt dein Dokument so, wie es aufgebaut ist: Objekte und Listen lassen sich auf- und zuklappen, darin stehen die einzelnen Werte. Das ist die schnellste Art, sich in fremden Daten zurechtzufinden, ohne Klammern zu zählen. Jede Zeile im Baum ist ein **Knoten**, also eine Stelle im Dokument: ein Objekt, eine Liste oder ein einzelner Wert. Du öffnest den Baum über den Reiter [Baum](#ansicht:baum) oder mit ⌥ ⌘ 1 (unter Windows und Linux Strg Alt 1).

## Was du siehst

Oben steht die Werkzeugzeile, darunter der Baum selbst, rechts der Inspektor.

- **Pfad** (links in der Werkzeugzeile): der Weg zum gewählten Knoten, etwa `$ > bestellungen > [1] > kunde`. Das `$` ist die Wurzel, also das ganze Dokument. Ein Klick auf einen Teil wählt diesen Knoten.
- **Im Baum suchen**: das Suchfeld rechts daneben, mit Trefferzähler und "Nur Treffer".
- **Ebenen**: die Knöpfe 1, 2, 3, 4 und Alle. Sie sagen, wie viele Ebenen der Baum von selbst aufklappt. Vorgewählt ist 3.

Jede Zeile im Baum zeigt von links nach rechts:

| Teil | Bedeutung |
|---|---|
| Pfeil | Klappt ein Objekt oder eine Liste auf oder zu |
| Schlüssel oder `[Stelle]` | Der Name im Objekt (`kunde`) oder die Stelle in der Liste (`[0]`, gezählt ab 0) |
| Wert | Texte in Anführungszeichen, Zahlen, `true`, `false` und `null` in eigener Farbe |
| Art und Umfang | Bei Objekten und Listen: `Objekt` mit "3 Schlüssel", `Liste` mit "128 Einträge, gleich aufgebaut" |
| Abzeichen | Hinweise wie "Text, sieht aus wie Zahl", "Datum" oder "Datum und Zeit" |
| Als Tabelle | Nur bei Listen gleich aufgebauter Objekte: zeigt sie in der Tabelle |

Ein zugeklappter Behälter (so heißen Objekte und Listen zusammen) zeigt statt des Umfangs eine Vorschau seiner ersten Werte. Bei bestellungen.json steht an der zugeklappten ersten Bestellung etwa `nr "B-24017", datum "2026-11-01", kunde "Marta Demir", positionen [2], ...`.

Die Abzeichen wandeln nichts um. "Text, sieht aus wie Zahl" steht an `"06108"`: Die Postleitzahl ist Text, und das ist gut so, denn als Zahl verlöre sie ihre führende Null. Mehr dazu bei [Zahlen als Text](#zahlen-als-text) und [Datum und Zeit](#datum-und-zeit).

## Bedienung

### Mit der Maus

- **Klick** auf eine Zeile wählt den Knoten. Der Inspektor rechts zeigt ihn, und die anderen Ansichten folgen: Wechselst du danach in den Editor, steht der Cursor genau an diesem Wert.
- **Klick auf den Pfeil** klappt auf oder zu, ohne zu wählen.
- **Doppelklick** auf einen einfachen Wert öffnet das Eingabefeld zum Ändern (siehe [Wert ändern](#baum/wert-aendern)).
- **Als Tabelle** zeigt diese Liste in der Ansicht [Tabelle](#tabelle).

### Mit der Tastatur

Klick einmal in den Baum, dann gilt:

| Taste | Wirkung |
|---|---|
| ↓ und ↑ | Nächste oder vorige Zeile wählen |
| Pos1 und Ende | Erste oder letzte Zeile |
| → | Zugeklappten Knoten aufklappen; ist er offen, zum ersten Kind |
| ← | Offenen Knoten zuklappen; sonst zum Elternknoten |
| Enter | Gewählten Wert ändern |
| F3 und ⇧ F3 | Nächster und voriger Treffer |

### Ebenen

Bei 1 ist nur die Wurzel aufgeklappt, bei bestellungen.json siehst du also `shop`, `stand` und `bestellungen`. Bei 3 sind Behälter bis zur dritten Ebene offen, Alle klappt alles auf. Was du einzeln auf- oder zugeklappt hast, gilt bis zur nächsten Wahl der Ebene. Strukturblick merkt sich das Aufgeklappte als Pfad, deshalb bleibt es auch nach einer Änderung am Text stehen. Wählst du von außen etwas, das gerade zugeklappt ist (etwa einen Treffer der Abfrage), klappen seine Eltern von selbst auf und der Baum rollt hin.

## Suche im Baum

Tipp ins Feld "Im Baum suchen". Gesucht wird in allen Schlüsseln und einfachen Werten, ohne Rücksicht auf Groß- und Kleinschreibung. Treffer sind farbig hinterlegt, das Gefundene im Text markiert.

- **Enter** springt zum nächsten Treffer, **⇧ Enter** zum vorigen, **Escape** leert das Feld.
- Die Pfeile neben dem Zähler ("Treffer 2 von 33") blättern ebenso.
- **Nur Treffer** blendet alles aus, was keinen Treffer enthält.
- Das Menü **Treffer** nimmt die Werte aller Treffer mit: als neues Dokument in der Ablage oder als Datei in JSON, NDJSON oder CSV. Mehr bei [Exportieren](#exportieren).

Bei bestellungen.json findet "Leipzig" 33 Treffer, "kartoffel" findet 49.

Dieselbe Suche gibt es im Abfragefeld unten, dort auch mit regulärem Ausdruck (siehe [Suche](#suche)):

```suche
Leipzig
```

Ergebnis: 33 Treffer, alle bei `kunde.stadt`.

Ist das eigene Suchfeld leer, zeigt der Baum die Treffer der Abfrage. Vor dem Zähler steht dann das Zeichen der Abfrage, damit du siehst, woher die Treffer kommen. So findest du alle noch offenen Bestellungen mit [jq](#jq):

```jq
.bestellungen[] | select(.bezahlt | not) | .nr
```

Ergebnis: 7 Treffer, darunter `"B-24022"`. Mit F3 springst du im Baum von einem zum nächsten.

## Wert ändern

Doppelklick auf einen einfachen Wert (oder Enter auf der gewählten Zeile) öffnet ein Eingabefeld mit dem markierten Inhalt. Tippen ersetzt ihn, **Enter** übernimmt, **Escape** oder ein Klick daneben bricht ab. Objekte und Listen lassen sich hier nicht als Ganzes ändern, dafür gibt es den [Editor](#editor).

Strukturblick behält die Art des alten Werts, wo es passt:

- Ein **Text** bleibt Text, auch wenn du `42` tippst.
- Eine **Zahl** bleibt Zahl, solange die Eingabe eine gültige Zahl ist; sonst wird es Text.
- Bei **Wahrheitswerten** und **null** werden `true`, `false`, `null` und gültige Zahlen zu dieser Art, alles andere zu Text.
- In CSV gibt es keine Arten, dort ist jede Eingabe Text.

Jede Änderung ist genau ein Schritt im Verlauf und lässt sich mit ⌘ Z zurücknehmen, gleich in welcher Ansicht. Geändert wird nur diese eine Stelle im Text; Einrückung, Kommentare und alles andere bleiben, wie sie sind. Solange das Dokument nach einer Änderung neu gelesen wird, steht oben "liest" und Bearbeiten wartet kurz.

## Der Inspektor rechts

Der Inspektor zeigt zum gewählten Knoten drei Karten und darunter den Verlauf.

**Gewählt** nennt die Art (Text, Zahl, Objekt ...), den Wert oder Umfang und die Stelle im Text als Zeile und Spalte. Bei einfachen Werten ändert "Ändern" den Wert, genau wie ein Doppelklick im Baum.

**Pfad kopieren** hat einen Knopf je Schreibweise: jq, JSONPath, Zeiger, PHP, Python und TypeScript. Ein Klick legt den Pfad in die Zwischenablage und zeigt ihn darunter. Für den Namen der Kundin in der zweiten Bestellung ergibt das etwa `.bestellungen[1].kunde.name` in jq und `/bestellungen/1/kunde/name` als Zeiger. Was die Schreibweisen bedeuten, steht bei [JSON Pointer und jq-Pfade](#json-pointer) und [JSONPath](#jsonpath).

**Alle Werte dieses Pfads** sucht alle gleichartigen Stellen im Dokument. Aus einer Listenstelle wird dafür "alle Einträge". Wählst du in bestellungen.json die Stadt der ersten Bestellung, zeigt die Karte:

| Angabe | Wert |
|---|---|
| Muster | `.bestellungen[].kunde.stadt` |
| Stellen | 128 |
| Fehlt | 0 |
| Typen | immer Text |
| Häufigste | `"Leipzig"` 33, `"Hamburg"` 28, `"Berlin"` 27 |

Bei Zahlen kommt die Spanne dazu: Für einen Preis in den Positionen sind es 297 Stellen von 2.49 bis 8.5. Wählst du eine Notiz, siehst du "Nichts 103, Text 25", denn 103 Bestellungen haben keine Notiz.

Die Karte **Verlauf** zeigt die letzten Änderungen; ein Klick springt zu diesem Stand.

## Wenn der Baum nichts zeigt

Lässt sich der Text nicht lesen (etwa ein fehlendes Komma in JSON), steht statt des Baums "Nicht lesbar" mit der ersten Fehlermeldung. "Reparieren" öffnet das Werkzeug [Reparieren](#reparieren), "Zum Editor" den [Editor](#editor), wo die Fehler im Text markiert sind.

## Grenzen

- Der Baum zeichnet nur die Zeilen, die gerade zu sehen sind. Auch Dokumente mit sehr vielen Knoten bleiben so flüssig.
- Sehr lange Werte schneidet die Zeile nach 400 Zeichen ab; ganz zeigt sie die Karte Gewählt.
- Die Suche im Baum findet nur Text, der genau so vorkommt. Muster, Groß und Klein oder reguläre Ausdrücke gehen über die [Suche](#suche) im Abfragefeld.

## Passt dazu

- [Tabelle](#tabelle) für Listen gleich aufgebauter Einträge
- [Graph](#graph) für einen grafischen Ausschnitt ab einer Stelle
- [Tastatur](#tastatur) für alle Kürzel
- [Begriffe](#begriffe) für Fachwörter wie Knoten, Behälter und Zeiger
