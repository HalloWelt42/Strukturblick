---
titel: TOML
unterzeile: Einstellungsdateien mit Tabellen, Tabellenlisten und eigenem Typ für Datum und Zeit
bereich: Formate
symbol: fa-file-lines
stichworte: toml, einstellungen, konfiguration, config, tabelle, table, tabellenliste, array of tables, [[ ]], punktschlüssel, dotted key, eingebettete tabelle, inline table, datum, zeit, offset date-time, local time, kein null
reihenfolge: 50
quellen: [TOML v1.0.0](https://toml.io/en/v1.0.0)
---

TOML ist ein Format für Einstellungsdateien: Zeilen der Form `schlüssel = wert`, Abschnitte mit Überschriften in eckigen Klammern, Kommentare mit `#`. Anders als bei [YAML](#yaml) ist der Typ jedes Werts eindeutig: Texte stehen immer in Anführungszeichen, und für Datum und Uhrzeit gibt es eigene Typen. Strukturblick liest TOML selbst, mit allen Stellen im Text. Ein Fehler betrifft nur seine Zeile, der Rest bleibt lesbar; beim Ändern bleiben Kommentare und Anordnung erhalten.

## Schlüssel und Werte

Der Anfang von webshop.toml (Beispiele zum Üben):

```toml
# Einstellungen des Webshops vom Hofladen Lindenhof (erfunden, zum Üben)
name = "Hofladen Lindenhof"
stand = 2026-11-10T08:15:00+01:00
waehrung = "EUR"
mindestbestellwert = 15.0
```

Die Werte, die TOML kennt:

| Art | Schreibweise |
|---|---|
| Text | `"mit Escapes\n"`, `'wörtlich, C:\pfad'`, mehrzeilig in `"""` oder `'''` |
| Zahl | `15`, `4.9`, `1_000`, `0xDEAD`, `0o17`, `0b101`, `inf`, `nan` |
| Wahrheitswert | `true`, `false` |
| Datum und Zeit | `2026-11-10T08:15:00+01:00`, `2026-11-10`, `08:00:00` |
| Liste | `["Di 9-18", "Fr 9-18", "Sa 8-13"]` |
| eingebettete Tabelle | `{ prozent = 2, tage = 10 }` |

TOML kennt kein null. Steht `x = null` im Text, meldet Strukturblick "Unbekannter Wert null".

## Tabellen

Eine **Tabelle** ist in TOML ein Objekt mit Überschrift. Alles unter `[kontakt]` bis zur nächsten Überschrift gehört zum Objekt `kontakt`:

```toml
[kontakt]
telefon = "030 23125 410"
mail = "laden@example.org"
oeffnungszeiten = ["Di 9-18", "Fr 9-18", "Sa 8-13"]
```

Punktschlüssel legen Zwischenobjekte an: `offen.tage = 3` unter `[kontakt]` ergibt `kontakt.offen.tage`. Eine eingebettete Tabelle in geschweiften Klammern steht in einer Zeile; in webshop.toml ist es `skonto` unter `[zahlung]`:

```jq
.zahlung.skonto.prozent
```

Ergebnis: `2`.

## Tabellenlisten

Doppelte eckige Klammern beginnen jedes Mal einen neuen Eintrag einer Liste. webshop.toml hat drei Abschnitte `[[versand]]`; Strukturblick liest sie als Liste `versand` mit drei Objekten. Die [Tabelle](#tabelle) (⌥ ⌘ 3, unter Windows und Linux Strg Alt 3) zeigt sie mit einer Zeile je Versandart.

Versandarten, die etwas kosten:

```jq
[.versand[] | select(.preis > 0) | .art]
```

Ergebnis: `["Kurier im Umkreis","Paket"]`.

In [SQL](#sql) heißt die Tabelle nach dem Dokument, `webshop`; ihre Zeilen kommen aus der längsten Liste von Objekten darin, hier `versand`:

```sql
SELECT art, preis FROM webshop ORDER BY preis DESC
```

Ergebnis: Paket 6.9, Kurier im Umkreis 4.9, Abholung 0.

## Datum und Zeit als eigene Typen

TOML hat vier Formen, alle nach RFC 3339 und ohne Anführungszeichen:

| Form | Beispiel |
|---|---|
| Zeitpunkt mit Zeitzone (Offset Date-Time) | `stand = 2026-11-10T08:15:00+01:00` |
| Datum mit Uhrzeit ohne Zone (Local Date-Time) | `2026-11-10T08:15:00` |
| Datum (Local Date) | `2026-11-10` |
| Uhrzeit (Local Time) | `ab = 08:00:00` |

webshop.toml hat drei solche Werte: `stand`, `ab` und `bis`. Strukturblick erkennt sie und zeigt sie so, wie sie im Text stehen. In Abfragen und für JSON Schema sind sie Text:

```jq
.stand
```

Ergebnis: `"2026-11-10T08:15:00+01:00"`. Die [Ansicht Struktur](#struktur) nennt `stand` "Datum und Zeit", die Uhrzeiten `ab` und `bis` "Text". Beim [Konvertieren](#konvertieren) in ein anderes Format sagt die Verlustkarte "Datum und Zeit werden Text": Der Inhalt bleibt gleich, nur der eigene Typ geht verloren. Mehr bei [Datum und Zeit](#datum-und-zeit).

Änderst du einen solchen Wert in Baum oder Tabelle, bleibt er Datum, solange du wieder ein gültiges Datum oder eine Zeit eingibst (etwa `2026-12-24` oder `2026-12-24T18:00:00+01:00`); andere Eingaben werden Text in Anführungszeichen. So hält es Strukturblick auch mit Zahlen.

## Meldungen

Ein Fehler betrifft nur seine Zeile; danach liest Strukturblick weiter. Typische Meldungen, alle als Fehler:

- "Doppelter Schlüssel a"
- "Die Tabelle t gibt es schon" (zwei gleiche Überschriften `[t]`)
- "Hier fehlt ein Wert" (`b =` ohne Wert)
- "Erwartet: , oder ]" (Liste ohne Ende)
- "Erwartet: = nach dem Schlüssel"
- "Nach dem Wert folgt noch Text in derselben Zeile"
- "Text ohne schließendes Anführungszeichen"
- "Unbekannter Wert null"

## Schreiben und Konvertieren

Ändern, Einträge entfernen und Spalten entfernen wirken nur an ihren Stellen; ein entfernter Abschnitt einer Tabellenliste verschwindet samt Überschrift. null lässt sich nicht setzen: "TOML kennt kein null; das Feld lässt sich nur entfernen oder mit einem Wert füllen".

[Konvertieren](#konvertieren) nach TOML braucht oben ein Objekt; eine Liste kommt unter `eintraege`, jeder Eintrag als eigener Abschnitt in doppelten eckigen Klammern. Felder mit null fallen weg; bei bestellungen.json nennt die Verlustkarte "TOML kennt kein null" mit 103 Stellen im Feld `notiz`.

## Passt dazu

- [YAML](#yaml) und [JSON](#json), die anderen Formate für Einstellungen
- [Datum und Zeit](#datum-und-zeit) für ISO 8601 und RFC 3339
- [Konvertieren](#konvertieren) mit der Verlustkarte
