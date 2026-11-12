---
titel: Verweise mit $ref
unterzeile: Regeln einmal aufschreiben und überall im Schema wiederverwenden
bereich: Prüfen
symbol: fa-link
stichworte: $ref, ref, verweis, referenz, reference, $defs, defs, definitions, definition, $id, $anchor, anker, json pointer, wiederverwenden, rekursion, externe datei, schema aufteilen
reihenfolge: 20
quellen: [JSON Schema 2020-12: Kern, Verweise](https://json-schema.org/draft/2020-12/json-schema-core), [Understanding JSON Schema: Strukturieren](https://json-schema.org/understanding-json-schema/structuring), [RFC 6901: JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901)
---

In einem [JSON Schema](#json-schema) kommt dieselbe Regel oft mehrfach vor: Ein Kunde sieht in der Bestellung genauso aus wie in der Rechnung, eine Adresse genauso beim Versand wie beim Einkauf. Statt sie jedes Mal neu abzuschreiben, legst du sie einmal unter einem Namen ab und **verweist** dann darauf. Der Verweis heißt `$ref` (von englisch reference). Ändert sich die Regel, änderst du sie an einer Stelle, und alle Verweise folgen.

## So sieht ein Verweis aus

Abgelegt werden die Regeln unter `$defs` (kurz für Definitionen). Wer sie braucht, schreibt `$ref` mit dem Weg dorthin:

```json
{
  "type": "object",
  "properties": {
    "rechnungsadresse": { "$ref": "#/$defs/Adresse" },
    "lieferadresse": { "$ref": "#/$defs/Adresse" }
  },
  "$defs": {
    "Adresse": {
      "type": "object",
      "required": ["plz", "ort"],
      "properties": {
        "plz": { "type": "string", "pattern": "^[0-9]{5}$" },
        "ort": { "type": "string" }
      }
    }
  }
}
```

Beide Adressen werden nun nach derselben Regel geprüft. An der Stelle des Verweises verhält sich das Schema so, als stünde dort der ganze Inhalt von `Adresse`.

## Der Weg im Verweis

Ein Verweis wie `#/$defs/Adresse` besteht aus zwei Teilen:

- `#` heißt "in diesem Schema".
- Danach folgt ein [JSON Pointer](#json-pointer), also der Weg Schritt für Schritt, getrennt durch Schrägstriche: erst in `$defs`, dann in `Adresse`.

Weil es ein gewöhnlicher Zeiger ist, kann er überall hinzeigen, nicht nur in `$defs`. `#/$defs/Position/properties/preis` holt nur die Regel für den Preis aus der Position. Für Sonderzeichen im Namen gelten die Regeln des Zeigers: `~1` steht für einen Schrägstrich, `~0` für eine Tilde. Weil der Verweis zugleich eine Adresse im Netz-Format ist (eine URI), wird ein Leerzeichen als `%20` geschrieben: Eine Definition namens "Eine Bestellung" erreichst du mit `#/$defs/Eine%20Bestellung`. Strukturblick versteht beides.

## Das Beispiel bestellung.schema.json

Das Schema aus den Beispieldaten (Leiste, "Beispiele zum Üben") nutzt drei Definitionen und verweist dreimal:

```json
"bestellungen": { "type": "array", "items": { "$ref": "#/$defs/Bestellung" } }
```

```json
"kunde": { "$ref": "#/$defs/Kunde" },
"positionen": { "type": "array", "minItems": 1, "maxItems": 3, "items": { "$ref": "#/$defs/Position" } }
```

Die Wurzel verlangt eine Liste von Bestellungen; jede Bestellung verweist für ihren Kunden auf `Kunde` und für jede Position auf `Position`. Die Definitionen selbst stehen unten in `$defs`.

Prüfst du bestellungen.json damit im Werkzeug [Validieren](#werkzeug:validieren), zeigt jeder Befund unter "Regel", wo die Regel wirklich steht, mit aufgelösten Verweisen: `#/$defs/Bestellung/properties/positionen` statt eines langen Wegs über `items` und `$ref`. Du landest beim Nachsehen also gleich an der richtigen Stelle.

## $defs oder definitions?

Bis Entwurf 7 hießen die Definitionen meist `definitions`, ab 2019-09 heißen sie `$defs`. Für die Prüfung ist der Name egal, denn der Verweis zeigt einfach auf eine Stelle im Schema: `#/definitions/Bestellung` funktioniert genauso. Strukturblick prüft Schemas mit beiden Namen. Auch das Werkzeug [Code erzeugen](#code-erzeugen) kennt beide und macht aus jeder Definition eines Objekts eine eigene Klasse.

Wenn Strukturblick selbst ein Schema schreibt (Ansicht [Struktur](#struktur), "Als JSON Schema"), nimmt es `$defs` und Fassung 2020-12.

## Weitere Formen

### Anker mit $anchor

Statt eines Wegs kann eine Definition einen eigenen Namen tragen. Mit `"$anchor": "bestellung"` in der Definition genügt der Verweis `"$ref": "#bestellung"`, egal wo die Definition steht. Strukturblick löst auch diese Form auf.

### Kennung mit $id

`$id` gibt einem Schema eine Adresse, etwa `"$id": "https://example.org/bestellung.json"`. Verweise innerhalb des Schemas dürfen diese Adresse dann voll ausschreiben (`https://example.org/bestellung.json#/$defs/Bestellung`), und eine Definition mit eigener `$id` ist unter ihrem Namen erreichbar. Beides funktioniert, solange alles in **einer** Datei steht. Die Adresse wird nie aus dem Netz geladen; sie ist nur ein Name.

### Rekursion

Eine Definition darf auf sich selbst verweisen. So beschreibst du verschachtelte Strukturen beliebiger Tiefe, etwa einen Ordner, der wieder Ordner enthält:

```json
"Ordner": {
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "unterordner": { "type": "array", "items": { "$ref": "#/$defs/Ordner" } }
  }
}
```

### Regeln neben $ref

Ob neben `$ref` noch weitere Schlüsselwörter wirken, hängt von der Fassung ab:

| Fassung | `{ "$ref": "#/$defs/Liste", "maxItems": 3 }` |
|---|---|
| 2019-09 und 2020-12 | Beides gilt: die Regel aus `Liste` und `maxItems` |
| Entwurf 7 und älter | Nur der Verweis gilt, `maxItems` wird übergangen |

Strukturblick hält sich daran. Geprüft gegen bestellungen.json findet der Entwurf-7-Fall deshalb keinen einzigen Befund, die Fassung 2020-12 die 26 Bestellungen mit mehr als drei Positionen. Wer in älteren Fassungen beides will, packt es in `allOf`: `{ "allOf": [ { "$ref": "#/definitions/Liste" }, { "maxItems": 3 } ] }`.

## Verweise auf andere Dateien

Große Schemas werden oft auf mehrere Dateien verteilt, etwa `"$ref": "adresse.json#/$defs/Adresse"`. Solche Verweise löst Strukturblick **nicht** auf, weder aus der Ablage noch aus dem Netz. Die Prüfung meldet dann "Das Schema lässt sich nicht anwenden: Unresolved $ref" mit dem Verweis im Wortlaut, und es gibt keine Befunde.

Abhilfe: die benötigten Definitionen aus der anderen Datei unter `$defs` ins Hauptschema kopieren und den Verweis auf `#/$defs/...` ändern. Ein Verweis auf eine Stelle, die es im Schema nicht gibt (Tippfehler im Namen), ergibt dieselbe Meldung.

Bei XML ist das anders: Ein XML Schema darf andere Dateien per import und include einbinden, und Strukturblick sucht sie in der Ablage. Mehr dazu bei [XML Schema](#xsd).

## Wo Strukturblick Verweise auflöst

| Wo | Was geht |
|---|---|
| [Validieren](#validieren) | Alle Verweise innerhalb eines Schemas: Zeiger mit `#/...`, `$anchor`, `$id`, Rekursion |
| Befunde und Bericht | Die Regel steht mit aufgelöstem Ort im Schema da |
| [Code erzeugen](#code-erzeugen) | Verweise auf `#/$defs/...` und `#/definitions/...`; jeder andere Verweis wird als "nicht aufgelöst" vermerkt und das Feld bekommt einen beliebigen Typ |
| Ansicht [Struktur](#struktur) | Schreibt selbst Verweise: jeder Objekttyp landet in `$defs` und wird per `$ref` eingesetzt |
| Überall | Keine Verweise auf andere Dateien |
