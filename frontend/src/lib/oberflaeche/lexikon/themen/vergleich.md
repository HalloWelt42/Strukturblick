---
titel: Vergleich
unterzeile: Zwei Fassungen nach ihrem Aufbau vergleichen, Unterschied für Unterschied
bereich: Ansichten
symbol: fa-code-compare
stichworte: vergleich, vergleichen, diff, compare, unterschied, unterschiede, gegenseite, vorher, jetzt, früherer stand, verlauf, schlüsselspalte, schlüsselfeld, nach stelle, reihenfolge ignorieren, json patch, rfc 6902, patch, seiten tauschen, übernehmen
reihenfolge: 70
quellen: [RFC 6902: JSON Patch](https://www.rfc-editor.org/rfc/rfc6902), [RFC 6901: JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901)
---

Der Vergleich stellt dein Dokument neben eine zweite Fassung und zeigt, was sich geändert hat, was hinzugekommen und was weggefallen ist. Strukturblick vergleicht dabei den Aufbau der Daten. Ein anders eingerücktes Dokument oder eines mit anders angeordneten Schlüsseln gilt deshalb als gleich, solange die Werte stimmen. Listen gleicht Strukturblick über ein Schlüsselfeld wie `nr` ab, damit ein eingefügter Eintrag nicht alle folgenden als geändert erscheinen lässt. Du öffnest die Ansicht über den Reiter [Vergleich](#ansicht:vergleich) oder mit ⌥ ⌘ 7 (unter Windows und Linux Strg Alt 7).

## Die Gegenseite wählen

Die zweite Fassung heißt **Gegenseite**. Oben in der Werkzeugzeile, hinter "Vergleichen mit", wählst du sie:

| Knopf | Gegenseite |
|---|---|
| Offenes Dokument | ein anderes Dokument, das gerade als Reiter offen ist, mit seinem aktuellen Text |
| Aus der Ablage | ein Dokument aus der [Ablage](#ablage), das nicht offen ist |
| Früherer Stand | eine frühere Fassung dieses Dokuments aus dem Verlauf; "Stand 0" ist der Anfang |
| Datei öffnen | eine Datei von deinem Gerät; sie wird dafür nicht abgelegt |

Hast du am Dokument schon etwas geändert und noch nichts gewählt, nimmt der Vergleich von selbst den Anfang des Verlaufs. So siehst du sofort alles, was du seit dem Öffnen geändert hast.

Die Gegenseite darf ein anderes Format haben, etwa YAML gegen JSON; verglichen werden die Werte. Beachte dabei, dass in CSV jeder Wert Text ist, eine `5` aus JSON und eine `"5"` aus CSV sind also verschieden.

## Was du siehst

**Links** stehen beide Seiten nebeneinander, Zeile für Zeile auf gleicher Höhe, mit den Köpfen **Vorher** (die Gegenseite) und **Jetzt** (dein Dokument). Gleiches ist eingeklappt, etwa "[0] bis [4]: 5 Einträge, gleich"; ein Klick klappt es auf. Geänderte Werte stehen links alt und rechts neu, Hinzugekommenes nur rechts, Weggefallenes nur links, die leere Seite schraffiert.

**Rechts** (bei schmalem Fenster darunter) stehen die **Unterschiede**: oben die Zahlen "geändert", "hinzu" und "weg", darunter jeder Unterschied mit Zeichen, Pfad und Werten. Der Pfad nennt Einträge über ihren Schlüssel, etwa `bestellungen[nr="B-24022"].bezahlt`. Ein Klick wählt den Unterschied, die Seiten rollen dorthin und der Inspektor zeigt ihn. Darunter steht, wie die Listen abgeglichen wurden, etwa "bestellungen über nr: 128 Paare".

## Ein Beispiel mit bestellungen.json

1. Öffne bestellungen.json. Im [Baum](#baum) wählst du die Bestellung B-24022 (sie ist eine der 7 unbezahlten), doppelklickst auf `bezahlt` und tippst `true`, dann Enter.
2. Wechsle in den Vergleich. Gegenseite ist schon "Stand 0", der Anfang.
3. Die Unterschiede zeigen "1 geändert, 0 hinzu, 0 weg" und den Eintrag `bestellungen[nr="B-24022"].bezahlt` mit `false` → `true`.
4. Links sind die Bestellungen davor und danach eingeklappt: "[0] bis [4]: 5 Einträge, gleich" und "[6] bis [127]: 122 Einträge, gleich".

Löschst du zusätzlich im [Editor](#editor) die ganze Bestellung B-24018, kommt ein zweiter Unterschied dazu: `bestellungen[nr="B-24018"]` als "weg". Alle späteren Bestellungen bleiben unverändert, obwohl sie im Text eine Stelle nach vorn gerückt sind, denn sie werden über `nr` gepaart. Der Fuß sagt dann "bestellungen über nr: 127 Paare, 1 nur vorher".

## Wie abgeglichen wird

**Objekte** werden nach Schlüsseln verglichen. Die Reihenfolge der Schlüssel zählt nicht.

**Listen** werden gepaart, also Eintrag für Eintrag einander zugeordnet:

- **Über ein Schlüsselfeld**, wenn eins taugt: ein Feld, das in beiden Listen in jedem Eintrag als Text oder Zahl steht, je Seite eindeutig ist und nach einer Kennung aussieht (`id`, `nr`, `nummer`, `code`, `kennung` und ähnliche, auch Endungen wie `kundennr`). Bei den Bestellungen ist das `nr`.
- **Nach Stelle**, wenn keins taugt oder du es so wählst. Dabei richtet Strukturblick gleiche Einträge aneinander aus: Ein eingefügter Eintrag erscheint als "hinzu", die folgenden bleiben gleich. Die Positionen einer Bestellung haben kein solches Feld und werden deshalb nach Stelle verglichen.

Die zweite Zeile der Werkzeugzeile steuert das:

- **Listen über Schlüssel abgleichen** schaltet das Abgleichen über Schlüsselfelder an oder aus. Daneben steht die oberste Liste mit geeigneten Feldern, bei bestellungen.json "bestellungen:", und ein Knopf mit dem gewählten Feld. Er öffnet die Wahl: jedes passende Feld oder "nach Stelle".
- **Reihenfolge ignorieren**: Stehen gepaarte Einträge in anderer Reihenfolge, ist das sonst ein eigener Unterschied, "Reihenfolge der Einträge geändert". Ist der Haken gesetzt, zählt die Reihenfolge nicht, und beim Abgleich nach Stelle findet Strukturblick gleiche Einträge auch an anderer Stelle. Vertauschst du B-24017 und B-24018, meldet der Vergleich ohne Haken genau diesen einen Unterschied an `bestellungen`, mit Haken keinen.

**Seiten tauschen** dreht die Richtung um: Dein Dokument wird Vorher, die Gegenseite Jetzt.

## Der Inspektor rechts

**Gewählter Unterschied** zeigt Art (geändert, hinzu, weg oder Reihenfolge), Pfad, den **Zeiger** (die Stelle als [JSON Pointer](#json-pointer), im ersten Beispiel `/bestellungen/5/bezahlt`), den Typ und die Werte Vorher und Jetzt. Zwei Knöpfe:

- **Vorher-Wert übernehmen** setzt in deinem Dokument den Wert der Gegenseite, bei getauschten Seiten heißt er "Jetzt-Wert übernehmen". Das geht bei geänderten einfachen Werten, wirkt sofort und ist ein Schritt im Verlauf.
- **Im Baum zeigen** wechselt in den Baum mit dieser Stelle gewählt.

**Als JSON Patch** zeigt die Änderungen als **JSON Patch**: eine Liste von Vorgängen nach RFC 6902, die Vorher Schritt für Schritt in Jetzt verwandeln. "Kopieren" legt sie in die Zwischenablage, "Herunterladen" speichert sie, bei bestellungen.json als `bestellungen.patch.json`. Denselben Download bietet der Knopf "Als JSON Patch" oben rechts. Für das Beispiel oben:

```json
[
  { "op": "remove", "path": "/bestellungen/1" },
  { "op": "replace", "path": "/bestellungen/4/bezahlt", "value": true }
]
```

Die Stellen beziehen sich auf den Stand während des Anwendens: Nach dem Entfernen von `/bestellungen/1` ist B-24022 von Stelle 5 auf 4 gerückt. Steht in einer Liste die Reihenfolge anders, ersetzt der Patch die Liste als Ganzes.

**Abgleich** nennt je Liste, ob über ein Feld oder nach Stelle gepaart wurde, und ob die Reihenfolge zählt.

## Tastenkürzel

| Kürzel | Wirkung |
|---|---|
| ⌥ ⌘ 7 | Ansicht Vergleich |
| ⌘ Z | Einen übernommenen Wert zurücknehmen |

## Grenzen

- Die Liste der Unterschiede zeigt die ersten 500, die Seiten die ersten 3.000 Zeilen; der JSON Patch enthält immer alle.
- Übernehmen geht nur für einfache Werte. Ganze Einträge oder Objekte übernimmst du im [Editor](#editor) oder wendest den Patch an anderer Stelle an.
- In der Adresse steht nur eine Gegenseite aus der Ablage. Ein früherer Stand oder eine Datei gilt nur, solange der Reiter offen ist.
- Ist die Gegenseite nicht lesbar, nennt der Vergleich ihr Format und zeigt keine Unterschiede.

## Passt dazu

- [Ablage](#ablage) für Dokumente als Gegenseite
- [JSON Pointer und jq-Pfade](#json-pointer) für die Zeiger im Patch
- [Validieren](#validieren), wenn du wissen willst, ob eine Fassung zum Schema passt
