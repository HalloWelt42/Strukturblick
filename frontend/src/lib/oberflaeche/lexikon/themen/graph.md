---
titel: Graph
unterzeile: Ein Ausschnitt der Daten als Wertkarten, ab einem Fokus wenige Ebenen tief
bereich: Ansichten
symbol: fa-circle-nodes
stichworte: graph, wertkarten, karten, knoten, fokus, ausschnitt, tiefe, ebenen, nachbarn, navigation, mind map, visualisierung, diagramm, plus, weitere
reihenfolge: 60
quellen:
---

Der Graph zeigt einen Ausschnitt deiner Daten als Karten, die von links nach rechts verbunden sind: links die Stelle, die dich gerade interessiert, rechts daneben, was darin steht, und so weiter, ein bis drei Ebenen tief. Diese Stelle heißt **Fokus**. Ein Klick auf eine Karte verschiebt den Fokus dorthin, so wanderst du durch die Daten wie durch Ordner. Das ist hilfreich, wenn ein Dokument tief verschachtelt ist und du den Zusammenhang sehen willst, ohne im [Baum](#baum) alles aufzuklappen. Du öffnest ihn über den Reiter [Graph](#ansicht:graph) oder mit ⌥ ⌘ 6 (unter Windows und Linux Strg Alt 6).

## Was du siehst

**Werkzeugzeile**: links der Pfad zum Fokus (`$ > bestellungen > [1]`), rechts die Wahl der **Tiefe** mit 1, 2 und 3. Vorgewählt ist 2.

**Hinweiszeile** darunter: wie groß der Ausschnitt ist, etwa "Ausschnitt: 16 von 2.472 Knoten".

**Leinwand**: ganz links die Karte eine Ebene über dem Fokus als Rückweg (mit einem Pfeil nach links), daneben der Fokus, leuchtend hervorgehoben, rechts davon seine Kinder und deren Kinder.

Jede **Wertkarte** nennt:

| Teil | Beispiel |
|---|---|
| Schlüssel oder Stelle | `kunde`, `[1]`, an der Wurzel `$` |
| Art | Objekt, Liste, Text, Zahl, Wahrheitswert, Nichts |
| Wert | bei einfachen Werten, etwa `"B-24018"` oder `true` |
| Erkennung | bei Objekten der erste Text darin, etwa `"B-24018"` an einer Bestellung |
| Umfang | bei Objekten und Listen, etwa "6 Schlüssel" oder "128 Einträge, gleich aufgebaut" |
| Plus | darunter liegt mehr, als die Tiefe zeigt |

Hat eine Liste sehr viele Einträge, zeigt der Graph am Fokus die ersten 50, auf tieferen Ebenen die ersten 12, und darunter eine Karte "und 116 weitere". Alle Einträge zeigen [Baum](#baum) und [Tabelle](#tabelle).

## Ein Rundgang mit bestellungen.json

1. Öffne bestellungen.json und wechsle in den Graph. Der Fokus liegt auf der Wurzel `$`. Rechts stehen `shop` mit `"Hofladen Lindenhof"`, `stand` und `bestellungen` mit "128 Einträge, gleich aufgebaut". Daneben die ersten 12 Bestellungen, jede mit ihrer Nummer, "6 Schlüssel" und einem Plus, darunter "und 116 weitere". Der Ausschnitt zeigt 16 von 2.472 Knoten.
2. Klick auf `bestellungen`. Jetzt ist die Liste der Fokus, links steht `$` als Rückweg. Rechts stehen die ersten 50 Bestellungen mit ihren Feldern, darunter "und 78 weitere". An `kunde` und `positionen` steht ein Plus.
3. Klick auf `[1]`. Die zweite Bestellung ist Fokus, links der Rückweg `bestellungen`. Rechts stehen `nr` mit `"B-24018"`, `datum`, `kunde`, `positionen`, `bezahlt` und `notiz`.
4. Stell die Tiefe auf 1. Der Ausschnitt schrumpft auf 8 von 2.472 Knoten; `kunde` und `positionen` tragen nun ein Plus.
5. Klick auf den Rückweg links oder auf `$` im Pfad oben, und du bist wieder weiter oben.

## Bedienung

| Klick auf | Wirkung |
|---|---|
| Objekt oder Liste mit Inhalt | Setzt den Fokus dorthin und richtet den Graph neu aus |
| Einfachen Wert | Wählt ihn; Inspektor und die anderen Ansichten folgen |
| Den Fokus selbst | Wählt ihn |
| Rückweg links | Setzt den Fokus eine Ebene höher |
| Teil des Pfads oben | Setzt den Fokus auf diesen Vorfahren |
| 1, 2, 3 | Ändert die Tiefe |

Nach jedem Wechsel rollt der Graph so, dass der Fokus in der Mitte steht. Fokus und Tiefe stehen in der Adresse; ein Lesezeichen führt genau zu diesem Ausschnitt (siehe [Adressen](#adressen)). Gibt es die Stelle nach einer Änderung nicht mehr, springt der Fokus auf die Wurzel.

## Der Inspektor rechts

**Gewählt** zeigt das Gewählte mit seinem Pfad in [jq](#jq)-Schreibweise, bei Objekten die Schlüssel (die ersten acht), bei Listen den Umfang, bei Werten den Wert, dazu die **Ebene** (die Wurzel ist Ebene 0). Zwei Knöpfe:

- **Fokus hierher** setzt den Fokus auf das Gewählte, wenn es ein Objekt oder eine Liste ist.
- **Im Baum zeigen** wechselt in den [Baum](#baum) mit derselben Wahl.

**Ausschnitt** nennt Fokus, Tiefe und die Zahl der gezeigten Knoten. Darunter blättern zwei Knöpfe zum vorigen und nächsten **Nachbarn** des Fokus, also zum Eintrag davor und danach in derselben Liste oder demselben Objekt. Ist `[1]` der Fokus, heißen sie "[0] B-24017" und "[2] B-24019". So gehst du Bestellung für Bestellung durch, ohne zurück auf die Liste zu müssen.

## Tastenkürzel

| Kürzel | Wirkung |
|---|---|
| ⌥ ⌘ 6 | Ansicht Graph |

Die Karten sind Knöpfe; mit Tab erreichst du sie, Enter oder die Leertaste lösen sie aus.

## Grenzen

- Der Graph zeigt immer nur einen Ausschnitt, höchstens drei Ebenen ab dem Fokus und je Liste die ersten 50 oder 12 Einträge.
- Werte zeigt eine Karte gekürzt; ganz stehen sie im Inspektor.
- Der Graph liest nur. Ändern geht in [Baum](#baum), [Editor](#editor) und [Tabelle](#tabelle).

## Passt dazu

- [Baum](#baum) für das ganze Dokument auf einmal
- [Struktur](#struktur) für den Aufbau als Typen statt als einzelne Werte
- [JSON Pointer und jq-Pfade](#json-pointer) für die Pfadschreibweisen
