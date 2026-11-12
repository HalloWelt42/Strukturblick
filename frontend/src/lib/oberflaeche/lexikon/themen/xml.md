---
titel: XML
unterzeile: Elemente, Attribute und Namensräume, und wie Strukturblick sie auf Baum und Tabelle abbildet
bereich: Formate
symbol: fa-file-code
stichworte: xml, extensible markup language, element, tag, attribut, attribute, text, cdata, kommentar, namensraum, namespace, präfix, xmlns, entity, wohlgeformt, xpath, xsd, lesart, @, #text
reihenfolge: 60
quellen: [Extensible Markup Language (XML) 1.0, W3C](https://www.w3.org/TR/xml/), [Namespaces in XML 1.0, W3C](https://www.w3.org/TR/xml-names/)
---

XML (Extensible Markup Language) beschreibt Daten mit Elementen in spitzen Klammern: `<name>Ole Hansen</name>`. Elemente lassen sich verschachteln, tragen Attribute und Text. Viele Schnittstellen, Behörden und ältere Programme tauschen Daten als XML aus, oft mit einem [XML Schema](#xsd), das den Aufbau festlegt. Strukturblick liest XML selbst, prüft es streng und bildet es nach festen Regeln auf Objekte, Listen und Texte ab. So arbeiten Baum, Tabelle, Statistik und die Abfragen jq, JSONPath und SQL auch mit XML; dazu kommt [XPath](#xpath), die Abfragesprache für XML.

## Die Bausteine

Ein Lieferschein aus lieferungen.xml (Beispiele zum Üben):

```xml
<lieferung nr="L-2401" datum="2026-11-01">
  <kunde>
    <name>Ole Hansen</name>
    <plz>06108</plz>
    <ort>Halle (Saale)</ort>
  </kunde>
  <hl:position menge="2" preis="5.10">Quark &amp; Schmand Paket</hl:position>
  <bezahlt>nein</bezahlt>
</lieferung>
```

- **Element**: von `<lieferung>` bis `</lieferung>`; ein leeres Element darf `<c/>` heißen.
- **Attribut**: `nr="L-2401"` im Start-Tag, Werte immer in Anführungszeichen.
- **Text**: zwischen den Tags. `&amp;` steht für `&`, `&lt;` für `<`.
- **CDATA**: `<![CDATA[ ... ]]>` nimmt Text wörtlich auf, auch mit `<` darin.
- **Kommentar**: `<!-- ... -->`.
- **Namensraum**: Das Präfix `hl:` ordnet `position` einem Namensraum zu (siehe unten).

## So bildet Strukturblick XML ab

| In XML | In Strukturblick | Beispiel |
|---|---|---|
| Wurzelelement | Objekt mit genau einem Feld | `lieferungen` |
| Element mit Attributen oder Kind-Elementen | Objekt | `lieferung` |
| Attribut | Feld mit `@` vor dem Namen | `@nr` mit `"L-2401"` |
| Element nur mit Text | Text | `name` mit `"Ole Hansen"` |
| leeres Element | leerer Text | `<c/>` wird `""` |
| Text neben Attributen oder Kind-Elementen | Feld `#text` | `#text` mit `"Quark & Schmand Paket"` |
| gleichnamige Geschwister | Liste | `lieferung` mit 12 Einträgen |
| CDATA | Text, so wie er dasteht | `"Bitte beim Nachbarn <Haus 2> abgeben"` |
| Kommentar | nicht im Baum; er bleibt im Text stehen | |

Der Lieferschein von oben sieht in dieser Lesart so aus:

```json
{
  "@nr": "L-2401",
  "@datum": "2026-11-01",
  "kunde": { "name": "Ole Hansen", "plz": "06108", "ort": "Halle (Saale)" },
  "hl:position": { "@menge": "2", "@preis": "5.10", "#text": "Quark & Schmand Paket" },
  "bezahlt": "nein"
}
```

In jq stehen Namen mit `@`, `#` oder `:` in Anführungszeichen und eckigen Klammern, etwa `.["@nr"]`. Die [Tabelle](#tabelle) zeigt bei lieferungen.xml die Liste `lieferung` mit einer Zeile je Lieferschein.

## Mal einzeln, mal Liste

Kommt ein Element nur einmal vor, wird es ein Objekt; kommt es mehrfach vor, eine Liste. In lieferungen.xml hat L-2401 eine Position, L-2402 zwei: `hl:position` ist 4-mal ein einzelnes Objekt und 8-mal eine Liste. Wer alle Positionen zählt, fängt beide Fälle ab:

```jq
[.lieferungen.lieferung[] | .["hl:position"] | if type == "array" then .[] else . end] | length
```

Ergebnis: `24`. Beim [Konvertieren](#konvertieren) aus XML nennt die Verlustkarte genau das: "`hl:position` ist mal Liste, mal einzeln".

## Alle Werte sind Text

XML selbst kennt keine Typen. `menge="2"` ist Text, `bezahlt` enthält `ja` oder `nein`. Strukturblick liest deshalb jeden Wert als Text und zeigt in Tabelle und [Statistik](#statistik) nur an, wonach er aussieht. Umwandeln geht im Werkzeug [Bereinigen](#bereinigen/typen) unter Typen; festlegen lässt sich der Typ mit einem XML Schema.

Mit lieferungen.xml offen, die Zahl der Lieferscheine:

```jq
.lieferungen.lieferung | length
```

Ergebnis: `12`.

Noch nicht bezahlt:

```jq
[.lieferungen.lieferung[] | select(.bezahlt == "nein") | .["@nr"]]
```

Ergebnis: `["L-2401","L-2404","L-2407","L-2410"]`.

Alle Lieferscheinnummern als JSONPath:

```jsonpath
$.lieferungen.lieferung[*]['@nr']
```

Ergebnis: 12 Treffer, `"L-2401"` bis `"L-2412"`.

## Abfragen mit XPath

Bei XML-Dokumenten bietet die Abfrage (⌥ ⌘ E, unter Windows und Linux Strg Alt E) zusätzlich [XPath](#xpath). XPath arbeitet direkt auf dem XML, so wie es dasteht: Elemente, Attribute mit `@`, Präfixe der Namensräume. Gerechnet wird mit libxml2 im Browser. Jeder Treffer wird in die Lesart von Strukturblick übersetzt und ist damit ein Sprungziel im Baum wie bei jq.

Die Kunden der unbezahlten Lieferungen:

```xpath
//lieferung[bezahlt = 'nein']/kunde/name
```

Ergebnis: 4 Treffer, `Ole Hansen`, `Mira Albers`, `Ole Hansen`, `Mira Albers`.

Alle Positionen zählen, ohne sich um einzeln oder Liste zu kümmern:

```xpath
count(//hl:position)
```

Ergebnis: `24`. XPath zählt Positionen ab 1, jq ab 0; mehr dazu bei [XPath](#xpath).

## Namensräume

Ein Namensraum trennt gleichnamige Elemente verschiedener Herkunft. Erklärt wird er mit einem Attribut: `xmlns:hl="urn:example:hofladen"` bindet das Präfix `hl` an eine Kennung. In Strukturblick bleibt das Präfix Teil des Namens (`hl:position`), und die Erklärung steht als Feld `@xmlns:hl` an ihrem Element. Strukturblick prüft, dass jedes Präfix erklärt ist; sonst meldet es "Das Präfix q ist nicht erklärt". In XPath benutzt du die Präfixe so, wie das Dokument sie erklärt.

## Strenge Prüfung

Strukturblick prüft wie ein XML-Parser, ob das Dokument wohlgeformt ist. Typische Meldungen, alle als Fehler:

- `<b> ist nicht geschlossen` und `Ende-Tag </b> ohne passendes Start-Tag`
- `Ein & muss als &amp; stehen` und `Unbekannte Entity &nbsp;` (HTML-Namen wie `&nbsp;` kennt XML nicht)
- `Die XML-Deklaration muss ganz am Anfang stehen`
- `-- ist in einem Kommentar nicht erlaubt`
- `Nach dem Wurzelelement folgt ein weiteres` und `Text außerhalb des Wurzelelements`
- `Steuerzeichen U+0001 ist in XML nicht erlaubt`

Entities aus einer DTD (der alten Form, Regeln und Abkürzungen im Kopf zu erklären) löst Strukturblick aus Sicherheitsgründen nicht auf; die Warnung lautet etwa `Entity &e; aus der DTD wird nicht aufgelöst`. Die Kodierung liest Strukturblick aus der XML-Deklaration (`encoding="ISO-8859-1"`); Herunterladen schreibt immer UTF-8.

## Prüfen gegen ein Schema

Ob die Daten auch inhaltlich passen, prüft das Werkzeug [Validieren](#validieren) gegen ein XML Schema; zum Üben lieferungen.xml mit lieferungen.xsd. Das Schema verlangt `bezahlt` als Wahrheitswert, die Daten sagen `ja` und `nein`. Hast du kein Schema, leitet der Befehl "XML Schema ableiten" eines aus den Daten ab. Mehr bei [XML Schema](#xsd) und in der [Ansicht Schema](#schema-ansicht).

## Schreiben und Konvertieren

Änderungen in Baum oder Tabelle wirken nur an ihrer Stelle; Kommentare, Einrückung und Namensräume bleiben. [Konvertieren](#konvertieren) aus XML nennt in der Verlustkarte, dass Attribute Felder mit `@` werden, Kommentare verloren gehen und alle Werte Text bleiben. Umgekehrt schreibt Konvertieren nach XML Felder mit `@` als Attribute und `#text` als Text; ohne einzelne Wurzel steht alles unter `<daten>`, null wird ein leeres Element.

## Passt dazu

- [XPath](#xpath) für Abfragen direkt auf dem XML
- [XML Schema](#xsd), [Validieren](#validieren) und [Ansicht Schema](#schema-ansicht)
- [jq](#jq) und [JSONPath](#jsonpath) für die Lesart von Strukturblick
- [Bereinigen](#bereinigen), um Texte in Zahlen oder Datum umzuschreiben
