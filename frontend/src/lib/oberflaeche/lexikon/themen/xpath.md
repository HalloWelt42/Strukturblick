---
titel: XPath
unterzeile: Die Abfragesprache für XML-Dokumente
bereich: Pfade und Abfragen
symbol: fa-code
stichworte: xpath, xml, attribut, element, achse, prädikat, knoten, count, namensraum, präfix, libxml2
reihenfolge: 35
quellen: [XML Path Language (XPath) 1.0, W3C](https://www.w3.org/TR/1999/REC-xpath-19991116/)
---

XPath ist für XML, was jq für JSON ist: ein Ausdruck beschreibt einen Weg durch das Dokument und trifft dabei ein Element, ein Attribut, einen Text oder gleich viele davon. Strukturblick bietet XPath im Abfragefeld unten an, sobald ein XML-Dokument offen ist; bei JSON, YAML und den übrigen Formaten steht die Sprache nicht zur Wahl. Gerechnet wird mit libxml2 im Browser, derselben Bibliothek, die auch [gegen XML Schema prüft](#xsd).

Jeder Treffer wird zu einer Stelle im Baum: ein Klick im Ergebnis springt dorthin, als wäre es ein jq-Treffer. Dafür übersetzt Strukturblick den Knoten in seine eigene Lesart von XML (Attribute als `@name`, mehrere gleichnamige Elemente als Liste); mehr dazu bei [XML](#xml).

## So sind Ausdrücke gebaut

| Teil | Bedeutung | Beispiel |
|---|---|---|
| `/` am Anfang | ab der Wurzel des Dokuments | `/lieferungen` |
| `/` dazwischen | ein Kind-Element | `/lieferungen/lieferung` |
| `//` | irgendwo darunter, beliebig tief | `//kunde` |
| `@name` | ein Attribut | `//lieferung/@nr` |
| `[...]` | Bedingung (Prädikat) | `//lieferung[bezahlt = 'nein']` |
| `[2]` | das zweite (XPath zählt ab 1) | `/lieferungen/lieferung[2]` |
| `text()` | der Text eines Elements | `//hinweis/text()` |
| `*` | jedes Element | `//kunde/*` |

Achtung, Zählfalle: XPath zählt ab 1, jq und JSON Pointer ab 0. Die zweite Lieferung ist in XPath `lieferung[2]`, im Baum steht sie unter `lieferung/1`.

## Beispiele mit lieferungen.xml

Die Beispiele passen zu den Beispieldaten (Leiste, "Beispiele zum Üben", Datei lieferungen.xml). "Ausprobieren" schreibt den Ausdruck ins Abfragefeld und rechnet ihn auf dem offenen Dokument; dafür muss lieferungen.xml das offene Dokument sein.

Alle Lieferscheinnummern:

```xpath
//lieferung/@nr
```

Ergebnis: 12 Treffer, `L-2401` bis `L-2412`.

Noch nicht bezahlte Lieferungen:

```xpath
//lieferung[bezahlt = 'nein']/@nr
```

Ergebnis: 4 Treffer, darunter `L-2401` und `L-2404`.

Lieferungen nach Leipzig:

```xpath
//lieferung[kunde/ort = 'Leipzig']/@nr
```

Ergebnis: `L-2403` und `L-2409`.

XPath rechnet auch: `count(//lieferung)` ergibt `12`, `string(/lieferungen/@stand)` ergibt `2026-11-10`. Dann steht ein einzelner Wert im Ergebnis, ohne Sprungziel.

## Namensräume und Präfixe

In lieferungen.xml heißen die Positionen `hl:position`; `hl` ist ein Präfix für einen Namensraum (ein Namensraum trennt gleichnamige Elemente verschiedener Herkunft). Präfixe, die im Dokument erklärt sind, kannst du im Ausdruck direkt benutzen:

```xpath
//lieferung[count(hl:position) > 1]/@nr
```

Ergebnis: die Lieferungen mit mehr als einer Position, 8 Treffer ab `L-2402`. Ein Namensraum ohne Präfix (`xmlns="..."` am Element) lässt sich in XPath 1.0 nicht direkt ansprechen; dann hilft `//*[local-name() = 'position']`.

## Wann XPath, wann jq?

- **XPath**, wenn das Dokument XML ist und du mit Attributen, Namensräumen oder der Reihenfolge der Elemente arbeitest; die Ausdrücke kennst du vielleicht schon aus anderen XML-Programmen.
- **jq** oder **[JSONPath](#jsonpath)** gehen bei XML auch: sie arbeiten auf der Lesart von Strukturblick (`.lieferungen.lieferung[0]."@nr"`) und können Ergebnisse umbauen. Der Pfad eines gewählten Werts steht im Inspektor unter "Pfad kopieren"; mehr bei [JSON Pointer und jq-Pfade](#json-pointer).
