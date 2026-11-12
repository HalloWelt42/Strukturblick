---
titel: Validieren
unterzeile: Daten gegen ein Schema prüfen, mit Stelle, Soll, Ist und Vorschlag
bereich: Werkzeuge
symbol: fa-clipboard-check
stichworte: validieren, prüfen, validierung, validate, validator, schema, json schema, xsd, xml schema, befund, fehler, warnung, fundstelle, prüfbericht, bericht, beheben, libxml2, schema-paket, zip, maxitems, pattern, format
reihenfolge: 10
quellen: [JSON Schema 2020-12: Validation](https://json-schema.org/draft/2020-12/json-schema-validation), [W3C XML Schema Part 1: Structures](https://www.w3.org/TR/xmlschema-1/)
---

Ein **Schema** ist eine Bauvorschrift für Daten: welche Felder es gibt, welche Pflicht sind, welchen Typ sie haben und welche Grenzen gelten (etwa "höchstens drei Positionen" oder "Postleitzahl aus fünf Ziffern"). Validieren legt dein Dokument neben so eine Vorschrift und meldet jede Stelle, die nicht passt. Jede Meldung heißt **Befund**; sie nennt, wo es klemmt, was erwartet war und was tatsächlich dasteht. JSON, YAML, TOML, CSV und die anderen Formate prüft das Werkzeug gegen ein [JSON Schema](#json-schema), XML-Dokumente gegen ein [XML Schema (XSD)](#xsd). Alles rechnet in deinem Browser, an einen Server geht dafür nichts.

## Wo du es findest

In der Leiste links im Abschnitt "Prüfen und umbauen" steht [Validieren](#werkzeug:validieren), ebenso in der Befehlspalette (⌘ K, unter Windows und Linux Strg K, dann "Validieren" tippen). Ohne offenes Dokument ist der Eintrag grau. Das Werkzeug belegt den Platz der Ansicht; oben im Kopf des Hauptbereichs steht dann ein Knopf mit seinem Namen und einem Kreuz, der es wieder schließt.

Das gewählte Schema steht in der Adresse (`/validieren?schema=...`). Ein Lesezeichen oder Neuladen öffnet also genau diese Prüfung wieder.

## Das Schema wählen

Oben in der Optionszeile steht **Schema** mit zwei Wegen:

| Knopf | Was er nimmt |
|---|---|
| Aus der Ablage | ein `.json`-Dokument aus deiner [Ablage](#ablage) als JSON Schema; Dokumente mit "schema" im Namen stehen in der Liste oben |
| Aus den Daten | das Schema, das Strukturblick aus deinen Daten ableitet, dasselbe wie in der [Ansicht Struktur](#struktur); es prüft Typen und Pflichtfelder |

Strukturblick leitet das Schema "Aus den Daten" bei jeder Prüfung aus dem aktuellen Stand ab; es passt deshalb in aller Regel zu den Daten. Bei bestellungen.json lautet das Ergebnis "Keine Befunde: Das Dokument entspricht dem Schema." Nützlich ist es als Anfang für ein eigenes Schema: In der Ansicht Struktur lädt "Als JSON Schema" es herunter. Dort ergänzt du Grenzen wie `maxItems`, öffnest die Datei wieder in Strukturblick und wählst sie hier unter "Aus der Ablage".

Hast du ein Schema aus der Ablage gewählt und es inzwischen geändert, liest "Erneut prüfen" rechts in der Optionszeile es neu ein. Strukturblick versteht JSON Schema 2020-12 und die älteren Entwürfe 2019-09, 7 (auch 6) und 4; welcher gilt, steht im Feld `$schema` des Schemas, ohne Angabe gilt 2020-12. Verweise mit `$ref` innerhalb des Schemas folgt die Prüfung, mehr dazu bei [Verweise mit $ref](#ref).

## Befunde lesen

Links steht die Tafel **Befunde**, rechts die **Fundstelle**. Jeder Befund nennt:

- Art: **Fehler** (rot) oder **Warnung** (gelb).
- Pfad: die Stelle als JSON Pointer, etwa `/bestellungen/6/positionen` (siehe [JSON Pointer](#json-pointer)).
- Meldung: was nicht stimmt, auf Deutsch.
- **Erwartet**: was das Schema verlangt, dahinter die Regel im Wortlaut des Schemas, etwa `maxItems 3`.
- **Gefunden**: was dasteht; bei Objekten und Listen eine kurze Beschreibung wie "Liste mit 4 Einträgen".
- Den Eintrag, in dem die Stelle liegt (die ersten zwei Texte dieses Listeneintrags), und Zeile und Spalte im Text.

Über der Liste filtert ein Segment nach **Alle**, **Fehler** und **Warnungen**, jeweils mit Anzahl. Warnungen entstehen aus dem Schlüsselwort `format` (Datum, E-Mail, UUID und ähnliche): In JSON Schema 2020-12 ist `format` nur ein Hinweis, keine Pflicht. Der Befund sagt das dann auch selbst.

Ein Klick auf einen Befund wählt ihn. Die **Fundstelle** zeigt zehn Zeilen davor und danach mit Zeilennummern, die betroffene Zeile hervorgehoben und den Wert rot unterstrichen. "Im Editor" und "Im Baum" springen mit genau dieser Stelle in die [Ansicht Editor](#ansicht:editor) oder die [Ansicht Baum](#ansicht:baum).

Die Liste zeigt die ersten 200 Befunde. Alle stehen in der Datei, die "Bericht herunterladen" unten rechts schreibt (`bestellungen.pruefbericht.txt`): je Befund Zeile, Spalte, Art, Pfad, Meldung, Erwartet, Gefunden und Regel. Die Zeile unten zählt außerdem, wie viele Einträge der Hauptliste ohne Befund sind, und erinnert: Das Werkzeug prüft nach jeder Änderung neu. Du kannst also im Editor korrigieren und siehst die Befunde sofort schrumpfen.

## Beispiel: Bestellungen an den Lieferdienst

Öffne die Beispiele (Leiste, "Beispiele zum Üben"), dann bestellungen.json. In Validieren wählst du "Aus der Ablage" und dort bestellung.schema.json. Das Schema beschreibt, was ein erfundener Lieferdienst annimmt, und der liefert höchstens drei Positionen je Bestellung.

Ergebnis: 26 Befunde, alle Fehler mit der Regel `maxItems 3`. Der erste:

```text
Fehler  /bestellungen/6/positionen
Liste hat 4 Einträge, erlaubt sind höchstens 3
Erwartet  höchstens 3 Einträge   maxItems 3
Gefunden  Liste mit 4 Einträgen
B-24023, 2026-11-07          Zeile 131, Spalte 21
```

Unten steht "102 von 128 Einträgen ohne Befund." Dieselben 26 Bestellungen findest du mit jq im Abfragefeld:

```jq
[.bestellungen[] | select(.positionen | length > 3)] | length
```

Ergebnis: `26`.

Und ihre Nummern:

```jq
.bestellungen[] | select(.positionen | length > 3) | .nr
```

Ergebnis: 26 Werte, beginnend mit `"B-24023"`, `"B-24025"` und `"B-24026"`.

## Beheben

Wo es genau eine richtige Lösung gibt, schlägt der Befund sie vor. Das gilt für einen Fall: Ein Muster verlangt eine feste Zahl Ziffern (`^[0-9]{5}$`), und dem Wert fehlen vorn Nullen. Probier es aus: Ändere in bestellungen.json im Editor die erste Postleitzahl `"06108"` in `"6108"`. Validieren meldet sofort einen 27. Befund:

```text
Fehler  /bestellungen/0/kunde/plz
Hat 4 statt 5 Ziffern
Erwartet  Text aus 5 Ziffern   pattern ^[0-9]{5}$
Gefunden  "6108"
```

Die Fundstelle ergänzt "Vermutlich fehlt die führende Null: "06108"". Im Inspektor erscheint die Karte **Beheben** mit dem Knopf `Auf "06108" setzen`. Das ändert nur diese eine Stelle, als ein Vorgang im Verlauf; Rückgängig (⌘ Z, Strg Z) holt den alten Wert zurück.

## Was der Inspektor zeigt

Die rechte Spalte, der **Inspektor**, hat bei Validieren diese Karten:

- **Gewählter Befund**: der gefundene Wert, die Regel, der Ort der Regel im Schema (etwa `#/$defs/Bestellung/properties/positionen`) und der Eintrag.
- **Beheben**: nur bei einem eindeutigen Vorschlag, siehe oben.
- **Schema**: Quelle (Dokumentname oder "aus bestellungen.json abgeleitet"), Fassung (etwa JSON Schema 2020-12) und wie viele Befunde in welcher Zeit gefunden wurden.
- **Im Browser**: der Hinweis, dass nichts an einen Server geht.

## XML gegen XML Schema

Ist das offene Dokument XML, wechselt die Optionszeile zu **XML Schema**. Geprüft wird mit libxml2, einer verbreiteten XML-Bibliothek, die als WebAssembly im Browser läuft und beim ersten Prüfen nachlädt; dann steht rechts kurz "prüft".

| Knopf | Was er nimmt |
|---|---|
| Aus der Ablage | eine `.xsd`-Datei der Ablage; Schemas, die sie importiert oder einbindet, sucht Strukturblick im selben Ordner nach Dateinamen |
| Schema-Paket (ZIP) | ein ZIP mit allen Schemas; es bleibt nur in diesem Browser und wird nicht abgelegt, Importe werden nach ihrem Pfad im Paket gefunden |

Verweist das Dokument selbst auf ein Schema (`xsi:schemaLocation` oder `xsi:noNamespaceSchemaLocation`), ist es vorgewählt und in der Liste mit "laut Dokument" markiert. Befunde stehen wie oben mit Stelle, Meldung, Soll und Ist. Die häufigen Meldungen von libxml2 sind übersetzt; seltene stehen im Wortlaut mit "libxml2:" davor. Fehlt ein importiertes Schema, nennt der Inspektor es unter "Fehlt".

Zum Üben: lieferungen.xml öffnen. Es verweist auf lieferungen.xsd, das wiederum hofladen-position.xsd importiert; beide liegen im Ordner Beispiele, die Prüfung startet also von selbst. Ergebnis: 12 Fehler, je einer pro Lieferschein, etwa `'nein' passt nicht zum Typ xs:boolean`. Das Schema verlangt für `bezahlt` einen Wahrheitswert (`true`, `false`, `1` oder `0`), die Daten schreiben `ja` und `nein`. Mit jq siehst du die Verteilung:

```jq
[.lieferungen.lieferung[].bezahlt] | group_by(.) | map({(.[0]): length}) | add
```

Ergebnis: `{"ja": 8, "nein": 4}`.

Unten steht dann "0 von 12 Einträgen ohne Befund." Mehr über das Schema selbst zeigt die [Ansicht Schema](#schema-ansicht).

## Grenzen

- Beheben gibt es nur für fehlende führende Nullen vor Ziffern; alles andere korrigierst du im [Editor](#editor) oder in der [Tabelle](#tabelle).
- Verweise mit `$ref` gehen nur innerhalb des Schemas (`#/$defs/...`). Zeigt einer auf eine andere Datei (`andere.json#/...`) oder eine Webadresse, meldet das Band "Das Schema lässt sich nicht anwenden"; dann die Teile in ein Schema unter `$defs` zusammenziehen.
- Ein Dokument, das sich gar nicht lesen lässt, kann nicht geprüft werden: erst [Reparieren](#reparieren).
- Ein Schema aus den Daten kennt nur, was die Daten zeigen. Grenzen wie `maxItems` stehen erst in einem Schema, das jemand geschrieben hat.
