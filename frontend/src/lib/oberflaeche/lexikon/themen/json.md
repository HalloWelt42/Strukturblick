---
titel: JSON
unterzeile: Das Grundformat für Strukturdaten und was Strukturblick beim Lesen meldet
bereich: Formate
symbol: fa-file-code
stichworte: json, javascript object notation, objekt, object, liste, array, text, string, zahl, number, wahrheitswert, boolean, null, jsonc, kommentar, komma, trailing comma, syntax, fehler, diagnose, rfc 8259, ecma-404
reihenfolge: 10
quellen: [RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259), [ECMA-404: The JSON Data Interchange Syntax](https://ecma-international.org/publications-and-standards/standards/ecma-404/)
---

JSON (JavaScript Object Notation) ist ein Textformat für verschachtelte Daten: Objekte mit benannten Feldern, Listen, darin Texte, Zahlen und ein paar feste Wörter. Fast jede Schnittstelle im Netz spricht JSON, viele Programme speichern ihre Daten so. Strukturblick liest JSON selbst, Zeichen für Zeichen, und merkt sich zu jedem Wert die genaue Stelle im Text. Deshalb springt ein Klick im [Baum](#baum) an die richtige Zeile im [Editor](#editor), und eine Änderung schreibt nur diesen einen Wert neu; Einrückung, Reihenfolge und alles andere bleiben, wie sie sind.

## Die sechs Bausteine

Mehr gibt es in JSON nicht:

| Baustein | Schreibweise | Beispiel aus bestellungen.json |
|---|---|---|
| Objekt | `{ "schlüssel": wert, ... }` | `"kunde": { "name": "Marta Demir", ... }` |
| Liste | `[ wert, wert, ... ]` | `"positionen": [ ... ]` |
| Text | in doppelten Anführungszeichen | `"nr": "B-24017"` |
| Zahl | ohne Anführungszeichen, Punkt als Dezimaltrenner | `"preis": 4.2` |
| Wahrheitswert | `true` oder `false` | `"bezahlt": true` |
| null | `null` für "kein Wert" | `"notiz": null` |

Objekte und Listen heißen zusammen **Behälter**, weil sie andere Werte enthalten; Text, Zahl, Wahrheitswert und null sind **einfache Werte**. So sieht die erste Bestellung aus:

```json
{
  "nr": "B-24017",
  "datum": "2026-11-01",
  "kunde": { "name": "Marta Demir", "plz": "06108", "stadt": "Halle (Saale)" },
  "positionen": [
    { "artikel": "Kartoffeln 2,5 kg", "menge": 1, "preis": 4.2 },
    { "artikel": "Apfelsaft naturtrüb 1 l", "menge": 5, "preis": 2.49 }
  ],
  "bezahlt": true,
  "notiz": null
}
```

Ein paar Regeln, über die Neulinge oft stolpern:

- Schlüssel stehen immer in doppelten Anführungszeichen. Einfache Anführungszeichen gibt es in JSON nicht.
- Zwischen den Einträgen steht ein Komma, nach dem letzten keins.
- Zahlen haben keine führende Null (`007` ist ungültig), kein Plus vorn und kein Komma als Dezimaltrenner. `NaN` und `Infinity` gibt es nicht.
- Sonderzeichen in Texten werden mit Rückstrich maskiert: `\"` für ein Anführungszeichen, `\\` für den Rückstrich, `\n` für einen Zeilenumbruch, `ä` für ein ä.
- Datum und Zeit haben keinen eigenen Baustein; sie stehen als Text da, am besten in ISO-Form wie `"2026-11-01"`. Mehr bei [Datum und Zeit](#datum-und-zeit).

Welcher Baustein wo steht, verrät jq mit `type` (jq nennt die Arten englisch):

```jq
.bestellungen[0] | map_values(type)
```

Ergebnis: `{"nr":"string","datum":"string","kunde":"object","positionen":"array","bezahlt":"boolean","notiz":"null"}`. Die Zahl fehlt hier, sie steckt eine Ebene tiefer: `.bestellungen[0].positionen[0].menge | type` ergibt `"number"`.

## Wie Strukturblick JSON liest

- **Erkennen**: Ein Text, der nach Leerraum mit `{` oder `[` beginnt und sich lesen lässt, gilt als JSON. Die Endungen `.json`, `.jsonc` und `.geojson` geben bei Gleichstand den Ausschlag. Passt die Erkennung nicht, wählst du das Format im Editor über den Knopf mit dem Formatnamen.
- **Zahlen bleiben Rohtext**: `4.20` bleibt `4.20`, auch sehr lange Zahlen bleiben Ziffer für Ziffer erhalten. Warum das zählt, steht bei [Zahlen als Text](#zahlen-als-text).
- **Texte bleiben Texte**: `"06108"` ist und bleibt Text, auch wenn es nach Zahl aussieht. Der Baum zeigt dann das Abzeichen "Text, sieht aus wie Zahl".
- **Bei einem Fehler** liest Strukturblick bis zur Fehlerstelle; der Baum zeigt alles davor, offene Behälter enden an der Fehlerstelle.

## Was Strukturblick meldet

Fehler, Warnungen und Hinweise stehen unter dem Editor (⌥ ⌘ 2, unter Windows und Linux Strg Alt 2) mit Zeile und Spalte; ein Klick springt hin, die Stelle ist im Text unterstrichen. Die häufigsten Meldungen:

| Meldung | Art | Auslöser |
|---|---|---|
| Unerwartetes Zeichen 1. Erwartet: : nach dem Schlüssel | Fehler | `{"a" 1}` |
| Unerwartetes Zeichen '. Erwartet: Schlüssel in doppelten Anführungszeichen | Fehler | `{'a': 1}` |
| Ungültige Zahl: führende Null | Fehler | `{"a": 007}` |
| NaN und Infinity sind in JSON nicht erlaubt | Fehler | `{"a": NaN}` |
| Text ohne schließendes Anführungszeichen | Fehler | `{"a": "x` |
| Der Text endet zu früh (] fehlt) | Fehler | `[1, 2` |
| Nach dem Ende des Dokuments folgt noch Text | Fehler | `{"a": 1} x` |
| Das Dokument ist leer | Fehler | leerer Text |
| Doppelter Schlüssel "a" | Warnung | `{"a": 1, "a": 2}` |

Die Norm verbietet doppelte Schlüssel nicht; viele Programme behalten dann still nur den letzten Wert, deshalb die Warnung. Bei Fehlern bietet Strukturblick im Fuß und im Baum den Knopf "Reparieren"; das Werkzeug [Reparieren](#reparieren) ergänzt fehlende Kommas, Klammern und Anführungszeichen nach festen Regeln.

## Kommentare und abschließende Kommas

Reines JSON kennt keine Kommentare. Viele Einstellungsdateien nutzen trotzdem eine erweiterte Form, oft JSONC genannt (JSON with Comments): Kommentare mit `//` bis zum Zeilenende oder zwischen `/*` und `*/`, dazu ein Komma nach dem letzten Eintrag. Strukturblick liest diese Form und meldet sie je einmal als Hinweis:

```json
{
  "port": 8080, // Kommentar bis zum Zeilenende
  "pfade": ["/katalog", "/kasse",],
}
```

Die Hinweise lauten "Kommentare sind kein Standard-JSON (JSONC)" und "Abschließendes Komma ist kein Standard-JSON (JSONC)". Baum, Tabelle und Abfragen arbeiten ganz normal; beim Bearbeiten bleiben die Kommentare stehen. Beim [Konvertieren](#konvertieren) nennt die Verlustkarte "Kommentare gehen verloren".

Andere Schreibweisen aus JavaScript, etwa Schlüssel ohne Anführungszeichen, Texte in einfachen Anführungszeichen, `True` und `None` oder `NaN`, liest Strukturblick als Fehler. Die Reparatur schreibt sie in gültiges JSON um. In [JSON Lines](#ndjson) sind auch Kommentare nicht erlaubt.

## Zum Ausprobieren

Öffne bestellungen.json aus "Beispiele zum Üben"; "Ausprobieren" schreibt den Ausdruck in die Abfrage unten (⌥ ⌘ E) und rechnet ihn auf dem offenen Dokument.

Wie viele Bestellungen gibt es?

```jq
.bestellungen | length
```

Ergebnis: `128`.

Wie oft ist die Notiz `null`?

```jq
[.bestellungen[].notiz | select(. == null)] | length
```

Ergebnis: `103`. Die übrigen 25 Bestellungen haben eine Notiz als Text.

Bestellnummern vom 10. November, als JSONPath:

```jsonpath
$.bestellungen[?(@.datum == '2026-11-10')].nr
```

Ergebnis: 12 Treffer, von `"B-24026"` bis `"B-24136"`.

## Passt dazu

- [JSON Pointer und jq-Pfade](#json-pointer), [jq](#jq) und [JSONPath](#jsonpath) für den Weg zu einem Wert
- [JSON Schema](#json-schema) und [Validieren](#validieren), um Regeln für die Daten festzulegen und zu prüfen
- [JSON Lines](#ndjson) für einen Datensatz je Zeile
- [Konvertieren](#konvertieren) in CSV, YAML, TOML, XML und weitere Formate
