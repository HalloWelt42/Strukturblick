---
titel: JSON Schema
unterzeile: Regeln für Daten aufschreiben und Dokumente dagegen prüfen
bereich: Prüfen
symbol: fa-clipboard-check
stichworte: json schema, schema, validieren, prüfen, validation, regel, type, properties, required, items, enum, format, minimum, maximum, pattern, minitems, maxitems, additionalproperties, draft-07, 2020-12, fassung, entwurf, ableiten
reihenfolge: 10
quellen: [JSON Schema 2020-12: Kern](https://json-schema.org/draft/2020-12/json-schema-core), [JSON Schema 2020-12: Prüfregeln](https://json-schema.org/draft/2020-12/json-schema-validation), [JSON Schema Draft-07](https://json-schema.org/draft-07), [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
---

Ein **JSON Schema** ist ein Bauplan für Daten, selbst als JSON geschrieben. Es legt fest, welche Felder es geben muss, welche Art von Wert darin stehen darf (Text, Zahl, Liste ...) und welche Grenzen gelten: "Die Postleitzahl hat genau fünf Ziffern", "eine Bestellung hat höchstens drei Positionen". Ein Programm prüft dann Dokument für Dokument, ob es zum Bauplan passt, und nennt jede Abweichung. Das nennt man **validieren**.

Strukturblick prüft im Werkzeug [Validieren](#validieren) gegen JSON Schema und kann ein Schema auch aus deinen Daten ableiten. Das geht mit JSON und allen Formaten, die Strukturblick in denselben Baum liest: YAML, TOML, CSV, NDJSON und Markdown-Tabellen. Für XML gibt es [XML Schema](#xsd).

## Ein erstes Schema

Ein Schema für einen Kunden mit Name und Postleitzahl:

```json
{
  "type": "object",
  "required": ["name", "plz"],
  "properties": {
    "name": { "type": "string", "minLength": 2 },
    "plz": { "type": "string", "pattern": "^[0-9]{5}$" }
  }
}
```

Gelesen heißt das: Der Wert ist ein Objekt. `name` und `plz` müssen darin stehen. `name` ist Text mit mindestens zwei Zeichen, `plz` ist Text aus genau fünf Ziffern. Weitere Felder sind erlaubt, solange nichts anderes gesagt ist.

Jedes Wort mit einer Bedeutung, etwa `type` oder `required`, heißt **Schlüsselwort**. Was nicht im Schema steht, wird nicht geprüft. Ein leeres Schema `{}` lässt also alles durch.

## Die wichtigsten Schlüsselwörter

### Art des Werts

`type` nennt die erlaubte Art. Mehrere Arten stehen in einer Liste, etwa `["string", "null"]` für "Text oder leer".

| Art | Bedeutung | Beispiel |
|---|---|---|
| `string` | Text | `"Leipzig"` |
| `number` | Zahl, auch mit Komma | `2.49` |
| `integer` | Ganze Zahl | `5` |
| `boolean` | Wahrheitswert | `true` |
| `null` | Nichts | `null` |
| `object` | Objekt mit Schlüsseln | `{"name": "..."}` |
| `array` | Liste | `[1, 2, 3]` |

### Objekte

| Schlüsselwort | Bedeutung |
|---|---|
| `properties` | Regeln je Feld |
| `required` | Diese Felder müssen da sein |
| `additionalProperties: false` | Andere Felder als die genannten sind verboten |
| `minProperties`, `maxProperties` | Wie viele Felder mindestens oder höchstens |

### Listen

| Schlüsselwort | Bedeutung |
|---|---|
| `items` | Regel für jeden Eintrag |
| `minItems`, `maxItems` | Wie viele Einträge mindestens oder höchstens |
| `uniqueItems: true` | Kein Eintrag doppelt |

### Texte

| Schlüsselwort | Bedeutung |
|---|---|
| `minLength`, `maxLength` | Länge in Zeichen |
| `pattern` | Regulärer Ausdruck, dem der Text folgen muss (siehe [Suche](#suche/regulaere-ausdruecke)) |
| `format` | Bekannte Form wie `date` (2026-11-10), `date-time`, `time`, `email`, `uri`, `uuid` |

`pattern` gilt, wenn das Muster irgendwo im Text passt. Soll der ganze Text passen, gehören `^` an den Anfang und `$` ans Ende, wie in `^[0-9]{5}$`.

### Zahlen

| Schlüsselwort | Bedeutung |
|---|---|
| `minimum`, `maximum` | Kleinster und größter erlaubter Wert, Grenze eingeschlossen |
| `exclusiveMinimum`, `exclusiveMaximum` | Grenze ausgeschlossen: `"exclusiveMinimum": 0` heißt größer als 0 |
| `multipleOf` | Vielfaches, etwa `0.01` für Cent-Beträge |

### Feste Werte und Kombinationen

| Schlüsselwort | Bedeutung |
|---|---|
| `enum` | Einer der aufgezählten Werte: `["bar", "Rechnung", "Lastschrift"]` |
| `const` | Genau dieser Wert |
| `anyOf`, `oneOf`, `allOf` | Passt zu mindestens einer, genau einer oder allen der Formen |
| `not` | Darf nicht zu dieser Form passen |
| `$ref` | Verweis auf eine Regel an anderer Stelle, siehe [Verweise mit $ref](#ref) |

`title` und `description` sind Erklärungen für Menschen. Sie prüfen nichts und helfen beim Lesen eines Schemas.

## Das Beispiel bestellung.schema.json

In den Beispieldaten (Leiste, "Beispiele zum Üben") liegt das Schema eines erfundenen Lieferdiensts für bestellungen.json. Der Kern einer Bestellung:

```json
"Bestellung": {
  "type": "object",
  "required": ["nr", "datum", "kunde", "positionen", "bezahlt"],
  "additionalProperties": false,
  "properties": {
    "nr": { "type": "string", "pattern": "^B-[0-9]{5}$" },
    "datum": { "type": "string", "format": "date" },
    "kunde": { "$ref": "#/$defs/Kunde" },
    "positionen": { "type": "array", "minItems": 1, "maxItems": 3, "items": { "$ref": "#/$defs/Position" } },
    "bezahlt": { "type": "boolean" },
    "notiz": { "type": ["string", "null"] }
  }
}
```

Die Nummer folgt dem Muster B- und fünf Ziffern, das Datum steht in ISO-Form, eine Bestellung hat eine bis drei Positionen, und Felder außer den genannten sind verboten. Kunde und Position stehen einmal unter `$defs` und werden per `$ref` eingesetzt. Eine Position verlangt `menge` als ganze Zahl ab 1 und `preis` als Zahl über 0.

### Ausprobieren

1. Öffne bestellungen.json und wähle in der Leiste unter "Prüfen und umbauen" das Werkzeug [Validieren](#werkzeug:validieren).
2. Klick auf "Aus der Ablage" und wähle bestellung.schema.json. Die Liste zeigt alle JSON-Dokumente der Ablage, solche mit "schema" im Namen zuerst.
3. Strukturblick prüft sofort.

Ergebnis: 26 Fehler, alle von derselben Regel: "Liste hat 4 Einträge, erlaubt sind höchstens 3". Der erste steht bei der Bestellung B-24023 (Zeiger `/bestellungen/6/positionen`). Zum Gegencheck findet [JSONPath](#jsonpath) genau diese 26 Bestellungen:

```jsonpath
$.bestellungen[?(@.positionen.length > 3)].nr
```

Ergebnis: 26 Nummern, die erste ist `"B-24023"`.

## Was ein Befund zeigt

Jeder Befund nennt:

- **Stelle**: den Pfad als [JSON Pointer](#json-pointer), Zeile und Spalte im Text und, bei Listen, woran du den Eintrag erkennst (etwa Nummer und Name).
- **Erwartet** und **Gefunden**: was das Schema verlangt und was dasteht, etwa "höchstens 3 Einträge" gegen "Liste mit 4 Einträgen".
- **Regel**: das Schlüsselwort mit Wert (`maxItems 3`) und wo es im Schema steht (`#/$defs/Bestellung/properties/positionen`). Verweise sind dabei schon aufgelöst, du siehst also die Regel selbst.

Die Fundstelle zeigt die Zeilen rundherum mit der falschen Stelle unterstrichen und springt in Editor oder Baum. Fehler und Warnungen lassen sich getrennt filtern. "Bericht herunterladen" schreibt alle Befunde als Text.

Gibt es genau einen sinnvollen Vorschlag, bietet der Inspektor unter "Beheben" einen Knopf an, etwa "Auf "06108" setzen". Das ist der Fall, wenn ein Text nur aus Ziffern besteht und für ein Muster wie `^[0-9]{5}$` Ziffern fehlen: Aus `"6108"` würde `"06108"`, als ein Schritt im Verlauf, der sich zurücknehmen lässt. Mehr dazu bei [Zahlen als Text](#zahlen-als-text).

### Warnungen bei format

Ab Fassung 2019-09 ist `format` nur noch ein Hinweis, kein Muss. Strukturblick prüft es trotzdem und meldet Abweichungen als **Warnung**, nicht als Fehler. Ein Feld mit `"format": "date"` und dem Wert `"2026-11-10T08:15:00+01:00"` ergibt "Kein gültiges Format date", erwartet "Datum wie 2026-11-10".

### Wenn das Schema selbst nicht stimmt

Ist das Schema kein gültiges JSON, oder ist es kein Objekt, sagt das ein Hinweis statt der Befunde. Ein Verweis, der ins Leere zeigt, ergibt "Das Schema lässt sich nicht anwenden" mit dem Verweis im Wortlaut. Hast du das Schema geändert, holt "Erneut prüfen" die neue Fassung.

## Fassungen

JSON Schema wurde in mehreren Entwürfen weiterentwickelt. Welcher gemeint ist, sagt die Angabe `$schema` ganz oben:

| `$schema` enthält | Fassung | Hinweis |
|---|---|---|
| `draft-04` | Entwurf 4 | Ältere Form, `exclusiveMinimum` ist dort ein Schalter |
| `draft-06` oder `draft-07` | Entwurf 7 | Sehr verbreitet; Definitionen meist unter `definitions` |
| `2019-09` | 2019-09 | `$defs` statt `definitions` |
| `2020-12` oder nichts | 2020-12 | Aktuell; Listen mit fester Form über `prefixItems` |

Strukturblick liest die Fassung aus `$schema`; fehlt die Angabe, gilt 2020-12. `definitions` und `$defs` funktionieren beide, denn ein Verweis zeigt einfach auf eine Stelle im Schema.

## Ein Schema aus Daten ableiten

Du musst nicht bei null anfangen. Die Ansicht [Struktur](#ansicht:struktur) (⌥ ⌘ 5, unter Windows und Linux Strg Alt 5) leitet aus allen Werten eines Dokuments ein Schema ab:

- Je Art von Objekt gibt es einen Eintrag unter `$defs`, benannt nach dem Schlüssel; Listeneinträge bekommen den Listennamen in der Einzahl (aus `bestellungen` wird `Bestellung`, aus `positionen` wird `Position`).
- `required` nennt die Felder, die in jedem Objekt dieser Art stehen.
- `type` nennt jede Art, die vorkommt, bei der Notiz also `["string", "null"]`.
- Datumsangaben in ISO-Form bekommen `format: date` oder `date-time`, Texte nur aus Ziffern das Muster `^[0-9]+$`. Beides gilt, wenn mindestens 95 von 100 Werten so aussehen.

"Als JSON Schema" lädt das Ergebnis als bestellungen.schema.json herunter (Fassung 2020-12), der Inspektor zeigt den Ausschnitt des gewählten Typs zum Kopieren. Für bestellungen.json sieht der Kunde so aus:

```json
"Kunde": {
  "type": "object",
  "required": ["name", "plz", "stadt"],
  "properties": {
    "name": { "type": "string" },
    "plz": { "type": "string", "pattern": "^[0-9]+$" },
    "stadt": { "type": "string" }
  }
}
```

Ein abgeleitetes Schema ist so streng, wie die Daten es zeigen, und nicht strenger. Grenzen wie `maxItems` oder genaue Muster wie `^[0-9]{5}$` kennt es nicht; die trägst du selbst nach. Der übliche Weg: ableiten, herunterladen, verschärfen, in die Ablage legen und neue Lieferungen dagegen prüfen.

Im Werkzeug Validieren prüft "Aus den Daten" gegen genau dieses abgeleitete Schema. Das Dokument selbst besteht diese Prüfung meist ohne Befund; auffallen können Ausreißer, etwa ein einzelner Wert, der aus der Reihe fällt, wo fast alle anderen ein Datum sind.

## Gut zu wissen

- **CSV kennt nur Text.** In kunden.csv ist jede Zelle ein Text, auch `42`. Ein Schema für CSV verlangt deshalb `"type": "string"` und prüft Zahlen über `pattern`.
- **Das Schema muss als JSON in der Ablage liegen.** Öffne es einmal oder lege es per Datei öffnen ab, dann steht es in der Auswahl.
- **Verweise auf andere Dateien** löst Strukturblick nicht auf; alles muss in einem Schema stehen. Details bei [Verweise mit $ref](#ref).
- Aus einem Schema lässt sich auch Code erzeugen, siehe [Code erzeugen](#code-erzeugen), oder es dient als Vorlage für [Testdaten](#testdaten).
