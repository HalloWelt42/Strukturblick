---
titel: Datum und Zeit
unterzeile: ISO 8601, RFC 3339 und deutsche Schreibweise, und woran Strukturblick ein Datum erkennt
bereich: Formate
symbol: fa-calendar
stichworte: datum, zeit, uhrzeit, zeitpunkt, date, time, datetime, date-time, iso 8601, rfc 3339, zeitzone, utc, z, tt.mm.jjjj, deutsches datum, format, json schema, toml, xlsx, seriennummer, sortieren
reihenfolge: 100
quellen: [RFC 3339: Date and Time on the Internet](https://www.rfc-editor.org/rfc/rfc3339), [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html), [JSON Schema 2020-12 Validation, Datum und Zeit](https://json-schema.org/draft/2020-12/json-schema-validation#name-dates-times-and-duration), [TOML v1.0.0, Datum und Zeit](https://toml.io/en/v1.0.0#offset-date-time)
---

Für Datum und Uhrzeit hat [JSON](#json) keinen eigenen Baustein, [CSV](#csv), [XML](#xml) und Markdown kennen ohnehin nur Text. Ein Datum steht dort als Text, und welche Schreibweise gilt, bestimmt allein, wer die Datei schreibt. Nur [TOML](#toml) und [Tabellendateien](#xlsx) haben eigene Typen dafür. Strukturblick erkennt, was nach einem Datum aussieht, zeigt es in Baum, Tabelle, Statistik und Struktur an und wandelt nur um, wenn du es in Bereinigen auslöst.

## ISO 8601 und RFC 3339

ISO 8601 ist die internationale Norm für Datumsangaben: vom Großen zum Kleinen, Jahr, Monat, Tag. RFC 3339 ist ein strenges Profil davon für Daten im Netz, und JSON Schema und TOML verweisen darauf.

| Form | Beispiel | Bedeutung |
|---|---|---|
| Datum | `2026-11-10` | 10. November 2026 |
| Zeitpunkt mit Zeitzone | `2026-11-10T08:15:00+01:00` | 8:15 Uhr deutscher Winterzeit |
| Zeitpunkt in UTC | `2026-11-10T07:15:00Z` | derselbe Augenblick, `Z` steht für UTC |
| Uhrzeit | `08:15:00` | ohne Tag |

RFC 3339 verlangt vier Stellen für das Jahr, je zwei für Monat und Tag, im Zeitpunkt Sekunden und eine Zeitzone. Der große Vorteil: Solche Texte lassen sich als Text sortieren und vergleichen, die Reihenfolge stimmt von selbst. In bestellungen.json (Beispiele zum Üben) steht jedes Datum so; Bestellungen ab dem 9. November:

```jq
[.bestellungen[] | select(.datum >= "2026-11-09")] | length
```

Ergebnis: `24`. Dasselbe als JSONPath:

```jsonpath
$.bestellungen[?(@.datum >= '2026-11-09')].nr
```

Ergebnis: 24 Bestellnummern, beginnend mit `"B-24025"`.

## Deutsche Schreibweise

`01.01.2024` heißt Tag, Monat, Jahr. Für Menschen vertraut, für Programme mehrdeutig (in anderen Ländern steht der Monat vorn), und als Text sortiert landet der 1. Dezember vor dem 2. Januar. Strukturblick liest `TT.MM.JJJJ` immer als Tag, Monat, Jahr; einstellige Tage und Monate und zweistellige Jahre gehen auch, `1.3.24` ist der 1. März 2024.

kunden.csv mischt beide Schreibweisen in der Spalte `angelegt`: 809 Werte stehen als `2024-02-02`, 405 als `01.01.2024`. Mit kunden.csv offen:

```sql
SELECT count(*) FROM kunden WHERE angelegt LIKE '__.__.____'
```

Ergebnis: `405`. Die ISO-Form zählt jq:

```jq
[.[] | select(.angelegt | test("^[0-9]{4}-"))] | length
```

Ergebnis: `809`.

## Woran Strukturblick ein Datum erkennt

- **Baum**: Ein Text, der genau ein gültiges Kalenderdatum `JJJJ-MM-TT` ist, trägt das Abzeichen "Datum"; ein Zeitpunkt nach ISO 8601 das Abzeichen "Datum und Zeit". `2026-02-30` bekommt keins.
- **Tabelle**: Der Spaltenkopf sagt "Text, sieht aus wie Datum", wenn mindestens 95 Prozent der gefüllten Werte nach einem Datum aussehen, in ISO-Form (auch mit Uhrzeit) oder als `TT.MM.JJJJ`. Bei `angelegt` in kunden.csv ist das so.
- **[Statistik](#statistik)**: Unter Muster steht "Datum", etwa "1.214 Werte sehen aus wie ein Datum". Die Spanne rechnet nach Datum, deutsche Formen umgerechnet: für `angelegt` "2024-01-01 bis 2024-12-28".
- **[Struktur](#struktur)**: Der Typ heißt "Datum" (ISO-Datum), "Datum und Zeit" (Zeitpunkt nach RFC 3339 mit Sekunden und Zeitzone) oder "Datum, verschiedene Formen" wie bei `angelegt`.
- **[Bereinigen](#bereinigen)**: Die Facette einer Datumsspalte zählt je Monat.

Umschreiben geht in [Bereinigen](#bereinigen/typen) unter Typen. Für `angelegt` erkennt es "Datum, 2 Formate gemischt": 809 Werte stehen schon als JJJJ-MM-TT und bleiben, 405 werden umgestellt. Die Vorschau zeigt Vorher und Nachher, "Umwandeln" ist ein Vorgang im Verlauf. Werte, die kein Datum sind, bleiben stehen oder werden auf Wunsch leer.

## JSON Schema: format date und date-time

In [JSON Schema](#json-schema) legt `"format": "date"` fest, dass ein Text ein Datum nach RFC 3339 ist (`2026-11-10`), `"format": "date-time"` einen Zeitpunkt mit Zeitzone. bestellung.schema.json aus den Beispielen nutzt beides:

```json
"stand": { "type": "string", "format": "date-time" },
"datum": { "type": "string", "format": "date" }
```

Seit dem Entwurf 2020-12 ist `format` von Haus aus eine Anmerkung. Darum meldet [Validieren](#validieren) einen Verstoß als Warnung: "Kein gültiges Format date", erwartet "Datum wie 2026-11-10". Ein Datum `10.11.2026` oder ein Zeitpunkt `2026-11-10 08:15` ohne Sekunden und Zone fallen so auf; bestellungen.json hat keine solche Warnung.

Leitet Strukturblick selbst ein Schema ab ("Als JSON Schema" in der Ansicht Struktur), setzt es `format` nur, wenn mindestens 95 Prozent der Texte in ISO-Form stehen. Für gemischte Spalten wie `angelegt` bleibt es beim einfachen Text. [Code erzeugen](#code-erzeugen) setzt für Datum und Zeitpunkt passende Typen der Zielsprache ein, in TypeScript bleiben sie Text.

## TOML: eigener Typ für Datum und Zeit

TOML schreibt Datum und Zeit ohne Anführungszeichen und kennt vier Formen: Zeitpunkt mit Zone, Datum mit Uhrzeit ohne Zone, Datum, Uhrzeit. In webshop.toml sind es drei Werte, `stand = 2026-11-10T08:15:00+01:00` sowie `ab` und `bis` als Uhrzeiten. Strukturblick zeigt sie so, wie sie dastehen; in Abfragen sind sie Text, und [Konvertieren](#konvertieren) nennt in der Verlustkarte "Datum und Zeit werden Text". Mehr bei [TOML](#toml).

## Tabellendateien: Datum als Zahl

Eine Tabellenkalkulation speichert ein Datum als Zahl der Tage seit 1900, die Uhrzeit als Bruchteil; erst das Zahlenformat der Zelle sagt, dass es ein Datum ist. Beim Öffnen einer XLSX-Datei liest Strukturblick daraus ISO-Text: `2026-11-03`, mit Uhrzeit `2026-11-05T14:30:00`. Beim Schreiben als XLSX wird ein ISO-Datum (auch mit Uhrzeit ohne Zone) wieder ein echtes Datum mit Datumsformat; ein Zeitpunkt mit Zeitzone bleibt Text. Mehr bei [Tabellendateien](#xlsx).

## YAML

YAML 1.2, nach dem Strukturblick liest, kennt keinen Datumstyp: `2026-11-10` ohne Anführungszeichen ist Text. Ältere Programme lesen nach YAML 1.1 ein Datum daraus; deshalb setzt Konvertieren nach YAML solche Texte in Anführungszeichen. Mehr bei [YAML](#yaml).

## Passt dazu

- [Zahlen als Text](#zahlen-als-text), die andere große Falle
- [Bereinigen](#bereinigen) zum Vereinheitlichen
- [Validieren](#validieren) und [JSON Schema](#json-schema) für verbindliche Formate
- [Testdaten](#testdaten), die auch Datum und Zeitpunkt erfinden
