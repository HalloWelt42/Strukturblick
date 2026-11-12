---
titel: Struktur
unterzeile: Das Schema, das sich aus deinen Daten ergibt, als Karten je Typ
bereich: Ansichten
symbol: fa-diagram-project
stichworte: struktur, schema, abgeleitetes schema, schema ableiten, infer schema, typen, typkarte, datenmodell, felder, pflichtfelder, required, pflicht, optional, schlüssel, key, vielfalt, kardinalität, 0..n, json schema ableiten, export, xml schema ableiten, xsd
reihenfolge: 50
quellen: [JSON Schema 2020-12](https://json-schema.org/draft/2020-12), [JSON Schema: Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
---

Die Struktur zeigt, wie deine Daten gebaut sind, ohne dass du sie Wert für Wert lesen musst. Strukturblick schaut sich alle Werte an und leitet daraus ein **Schema** ab, also eine Beschreibung des Aufbaus: welche Arten von Objekten es gibt, welche Felder sie haben, welche Werte darin stehen und welche Felder immer da sind. Jede Art von Objekt wird ein **Typ** mit eigener Karte. Das Ergebnis kannst du als [JSON Schema](#json-schema) herunterladen und damit später neue Daten prüfen. Du öffnest die Ansicht über den Reiter [Struktur](#ansicht:struktur) oder mit ⌥ ⌘ 5 (unter Windows und Linux Strg Alt 5).

## Was du siehst

Für bestellungen.json zeichnet die Struktur vier Karten, von links nach rechts verbunden:

| Von | Feld | Kante | Zu |
|---|---|---|---|
| Wurzel | bestellungen | 0..n | Bestellung |
| Bestellung | kunde | 1 | Kunde |
| Bestellung | positionen | 0..n | Position |

Jede **Typkarte** hat oben den Namen und rechts die Zahl der Vorkommen, darunter eine Zeile je Feld mit Name, Art der Werte und einem Stern für Pflicht. Die Karte Bestellung sieht so aus:

| Feld | Werte | Pflicht |
|---|---|---|
| nr (mit Schlüsselzeichen) | Text | * |
| datum | Datum | * |
| kunde | Kunde | * |
| positionen | Liste von Position | * |
| bezahlt | Wahrheitswert | * |
| notiz | Text oder Null | * |

Kunde (128 Vorkommen) hat `name` als Text, `plz` als "Text, nur Ziffern" und `stadt` als Text. Position (297 Vorkommen) hat `artikel` als Text, `menge` als "Zahl, ganz" und `preis` als Zahl. Die Wurzel trägt `shop`, `stand` als "Datum und Zeit" und `bestellungen` als "Liste von Bestellung".

Oben in der Werkzeugzeile steht die Legende, rechts Zoom und die Knöpfe zum Herunterladen.

## So wird abgeleitet

Grundlage sind alle Knoten des Dokuments, vom ersten bis zum letzten Eintrag.

**Typen.** Jede Stelle, an der Objekte stehen, wird ein Typ. Der Name kommt aus dem Schlüssel (`kunde` wird Kunde). Einträge einer Liste heißen nach dem Listennamen in der Einzahl: `bestellungen` wird Bestellung, `positionen` wird Position. Ist das ganze Dokument eine Liste wie bei einer CSV, heißen die Einträge Eintrag. Kommt ein Name doppelt vor, bekommt der zweite eine Zahl dahinter.

**Arten der Werte.** Text, Zahl, Wahrheitswert, Null, ein Typ oder eine Liste davon. Kommen mehrere vor, stehen sie mit "oder" verbunden, wie bei `notiz`. Texte schaut Strukturblick genauer an; folgen mindestens 95 von 100 einem Muster, steht es dabei:

| Angabe | Wann | Im JSON Schema |
|---|---|---|
| Datum | `2026-11-01` | `"format": "date"` |
| Datum und Zeit | `2026-11-10T08:15:00+01:00` | `"format": "date-time"` |
| Datum, verschiedene Formen | `01.01.2024` oder gemischt | nur `"type": "string"` |
| Text, nur Ziffern | `06108` | `"pattern": "^[0-9]+$"` |
| Zahl, ganz | nur ganze Zahlen | `"type": "integer"` |

**Pflicht** (der Stern, "in jedem Eintrag") heißt: Das Feld steht in jedem Objekt dieses Typs. Fehlt es in manchen, steht neben der Art, in wie vielen der Objekte es vorkommt. Ein Feld mit `null` darin zählt als vorhanden; dass es leer sein darf, sagt die Art "oder Null".

**Schlüssel** (das Schlüsselzeichen) bekommt das erste Feld eines Typs, das in jedem Objekt steht, überall einen anderen einfachen Wert hat und weder Wahrheitswert noch Datum ist. Bei der Bestellung ist das `nr`. In kunden.csv bekommt `kundennr` kein Schlüsselzeichen, denn `K-10005` kommt zweimal vor (siehe [Tabelle](#tabelle/duplikate-pruefen)).

**Kanten** zwischen den Karten nennen, wie viele Objekte des Kindtyps an einem Eintrag hängen:

| Kante | Bedeutung |
|---|---|
| 1 | genau eines (Pflichtfeld, nie null) |
| 0..1 | keins oder eines |
| 0..n | beliebig viele, eine Liste |

## Bedienung

- **Klick auf eine Karte** wählt den Typ. Der Inspektor rechts zeigt ihn, und Strukturblick wählt sein erstes Vorkommen im Dokument, sodass Baum und Editor dorthin folgen. Mit der Tastatur geht das über Enter oder die Leertaste auf der Karte.
- **Klick auf ein Feld** wählt das erste Vorkommen dieses Felds.
- **Zoom**: Lupe mit Minus und Plus verkleinern und vergrößern (50 bis 150 %), "Einpassen" zeigt alles auf einmal.
- **Als JSON Schema** lädt das ganze abgeleitete Schema als Datei herunter, bei bestellungen.json als `bestellungen.schema.json`.

Der gewählte Typ steht in der Adresse, ein Lesezeichen führt also genau zu dieser Karte.

## Der Inspektor rechts

**Gewählter Typ** nennt den Namen und:

| Angabe | Bestellung in bestellungen.json |
|---|---|
| Vorkommen | 128, in `.bestellungen[]` |
| Felder | 6, davon 6 in jedem Eintrag |
| Schlüssel | `nr`, eindeutig |
| Name | aus dem Listennamen abgeleitet |

"Als Tabelle" zeigt die Objekte dieses Typs in der [Tabelle](#tabelle).

**Als JSON Schema** zeigt den Ausschnitt des gewählten Typs zum Kopieren, mit "Kopieren" und "Herunterladen" (das ganze Schema). Für Kunde:

```json
{
  "Kunde": {
    "type": "object",
    "required": ["name", "plz", "stadt"],
    "properties": {
      "name": { "type": "string" },
      "plz": { "type": "string", "pattern": "^[0-9]+$" },
      "stadt": { "type": "string" }
    }
  }
}
```

**Abgeleitet** fasst zusammen: bei bestellungen.json 4 Typen, 15 Felder, Grundlage alle 2.472 Knoten.

## Das JSON Schema

Die Datei folgt JSON Schema in der Fassung 2020-12. Die Wurzel steht oben, alle anderen Typen unter `$defs`, Verweise darauf mit `$ref` (siehe [Verweise mit $ref](#ref)). Pflichtfelder stehen in `required`, Arten mit "oder Null" als Liste wie `"type": ["string", "null"]`. Das Schema aus bestellungen.json beginnt so:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "bestellungen.json",
  "type": "object",
  "required": ["shop", "stand", "bestellungen"],
  "properties": {
    "shop": { "type": "string" },
    "stand": { "type": "string", "format": "date-time" },
    "bestellungen": { "type": "array", "items": { "$ref": "#/$defs/Bestellung" } }
  }
}
```

Die Datei bestellungen.json ist gegen ihr abgeleitetes Schema gültig. Für andere Daten ist es so streng, wie die Beispiele es zeigen: Kam ein Feld in allen 128 Bestellungen vor, verlangt das Schema es auch künftig. Prüf es deshalb vor dem Einsatz und lockere es, wo nötig.

Dasselbe Schema nutzen andere Teile von Strukturblick: [Validieren](#validieren) mit "Aus den Daten", [Code erzeugen](#code-erzeugen) mit der Quelle "Schema der Daten" und [Testdaten](#testdaten).

## XML Schema ableiten

Bei XML-Dokumenten steht in der Werkzeugzeile zusätzlich **XML Schema ableiten**. Es legt eine XSD-Datei (ein Schema für XML) neben das Dokument, bei lieferungen.xml etwa `lieferungen.abgeleitet.xsd`, und öffnet sie in der Ansicht [Schema](#schema-ansicht). Abgeleitet wird so streng, wie die Daten es zeigen. Mehr bei [XML Schema](#xsd).

## Tastenkürzel

| Kürzel | Wirkung |
|---|---|
| ⌥ ⌘ 5 | Ansicht Struktur |
| Enter, Leertaste | Gewählte Typkarte wählen |

## Grenzen

- Die Struktur zeigt nur Objekte als Karten. Ein Dokument ganz ohne Objekte (etwa eine Liste von Zahlen) beschreibt sie in einem Satz.
- Abgeleitet wird aus dem, was da ist. Erlaubte Werte, Längen oder Grenzen, die in den Daten nicht erkennbar sind, kommen nicht ins Schema; die ergänzt du von Hand.
- Die Ansicht liest nur. Ändern geht in [Baum](#baum), [Editor](#editor) und [Tabelle](#tabelle).

## Passt dazu

- [Statistik](#statistik) für die Zahlen hinter jedem Feld
- [JSON Schema](#json-schema) für die Sprache des Schemas
- [Validieren](#validieren) zum Prüfen anderer Daten gegen das Schema
