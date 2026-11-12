---
titel: Erste Schritte
unterzeile: Ein Rundgang durch Strukturblick für alle, die neu hier sind
bereich: Anfang
symbol: fa-sitemap
stichworte: anfang, einstieg, rundgang, tour, überblick, start, neu, oberfläche, aufbau, getting started, tutorial, beispiele, üben, hilfe
reihenfolge: 10
quellen:
---

Strukturblick zeigt Strukturdaten so, dass du sie verstehst, prüfen und umbauen kannst. Strukturdaten sind Dateien mit einer festen Ordnung: JSON, JSON Lines, CSV, YAML, TOML, XML und Tabellen in Markdown, dazu Tabellendateien (XLSX) und HTML-Seiten, die beim Öffnen zu JSON werden. Dieser Rundgang zeigt dir, wo was liegt, und führt dich mit den Beispieldaten durch die ersten Handgriffe. Keine Sorge, kaputt geht dabei nichts, denn jede Änderung lässt sich zurücknehmen.

## Der Aufbau auf einen Blick

Die Oberfläche hat sechs Bereiche. Sobald ein Dokument offen ist, sind alle zu sehen:

| Bereich | Wo | Was dort steht |
|---|---|---|
| Kopf | ganz oben | Reiter der offenen Dokumente (Plus für ein neues), Rückgängig und Wiederholen, das [Befehlsfeld](#befehlsfeld) und das Zahnrad für Thema und Schriftgröße |
| Leiste | links | Ort der Ablage mit dem Ordnerknopf, "Datei öffnen", "Herunterladen", deine Dokumente und Ordner, die Werkzeuge, die Rezepte und unter "Nachschlagen" das Lexikon |
| Hauptbereich | Mitte | oben die Ansichtswahl (Baum, Editor, Tabelle, Statistik, Struktur, Graph, Vergleich, bei XML Schema auch Schema), darunter die gewählte Ansicht oder das offene Werkzeug |
| Abfrage | unten im Hauptbereich | eine Leiste mit jq, SQL, JSONPath, bei XML-Dokumenten XPath und der Suche; aufgeklappt rechnet sie beim Tippen |
| Inspektor | rechts | was du gerade gewählt hast, sein Pfad zum Kopieren, alle Werte desselben Pfads und der Verlauf; Werkzeuge zeigen hier ihre eigenen Karten |
| Fuß | ganz unten | Format und Größe, der [Stand](#begriffe/stand) im Verlauf, Fehler und Warnungen, ob alles abgelegt ist, "Hilfe" und die Fassung |

Ohne offenes Dokument zeigt die Mitte die Startseite: Datei öffnen, leeres Dokument, Beispiele zum Üben, ein Feld zum Einfügen von Text und die zuletzt benutzten Dokumente. Dateien kannst du auch einfach aus dem Dateimanager auf das Fenster ziehen.

Bei jedem Start erscheint ein kurzer Hinweis zu Nutzung, Daten, Betaphase und Beispielen. "Verstanden" oder Escape schließt ihn, später holt ihn "Über Strukturblick" im Befehlsfeld zurück.

## Beispiele zum Üben öffnen

Am schnellsten lernst du mit echten Daten, und dafür gibt es erfundene. "Beispiele zum Üben" findest du auf der Startseite, in der Seite Ablage und im Befehlsfeld als "Beispiele öffnen". Sie landen im Ordner Beispiele deiner Ablage und gehen alle als Reiter auf:

- bestellungen.json: 128 Bestellungen eines Hofladens mit Kunde und Positionen
- kunden.csv: 1.214 Kunden mit absichtlichen Unsauberkeiten
- dienste.yaml, webshop.toml: Einstellungen des Webshops in YAML und TOML
- bestellung.schema.json: ein JSON Schema zum Prüfen der Bestellungen
- kundenimport.ndjson: ein Kundenimport mit vier kaputten Zeilen zum Reparieren
- lieferungen.xml mit lieferungen.xsd und hofladen-position.xsd: Lieferscheine in XML und das XML Schema dazu

Die Namen, Adressen und Telefonnummern sind ausgedacht. Du darfst alles ändern. Ein zweites Öffnen zeigt die vorhandenen samt deinen Änderungen; wer frisch anfangen will, legt die Beispiele in der [Ablage](#ablage) in den Papierkorb und öffnet sie neu.

## Erste Schritte im Baum

Nach dem Öffnen der Beispiele steht bestellungen.json in der [Ansicht Baum](#ansicht:baum). Der Baum zeigt jedes Objekt und jede Liste als aufklappbaren [Knoten](#begriffe/knoten).

1. Öffne unter `bestellungen` den Eintrag `[1]` und darin `kunde`, falls sie noch zu sind. Das kleine Dreieck vor einer Zeile klappt auf und zu.
2. Klicke auf `stadt`. Der Inspektor rechts zeigt den Wert `"Leipzig"`, darunter "Pfad kopieren" mit allen Schreibweisen, etwa `.bestellungen[1].kunde.stadt` in jq.
3. Die Karte "Alle Werte dieses Pfads" zählt alle 128 Städte der Bestellungen; Leipzig steht mit 33 ganz oben.
4. Doppelklick auf den Wert (oder Enter) ändert ihn an Ort und Stelle. Enter übernimmt, Escape bricht ab.

Mit der Tastatur geht es genauso: Pfeiltasten wandern, Pfeil rechts klappt auf, Pfeil links zu. Mehr dazu bei [Tastatur](#tastatur) und [Baum](#baum).

## Erste Schritte in der Tabelle

Wähle den Reiter kunden.csv und dann oben [Tabelle](#ansicht:tabelle) (oder ⌥ ⌘ 3, unter Windows und Linux Strg Alt 3). Jede Datenzeile der Datei ist eine Zeile der Tabelle, jede Spalte hat oben einen Kopf mit [Typvorschlag](#begriffe/typvorschlag).

- Tippe ins Feld "Zeilen filtern ..." das Wort `leipzig`. Der Zähler zeigt dann 142 von 1.214 Zeilen.
- Schau dir die Spalte ort an: Dort steht Leipzig in drei Schreibweisen (`Leipzig`, `leipzig` und `Leipzig` mit Leerzeichen am Ende). Genau für so etwas gibt es das Werkzeug [Bereinigen](#werkzeug:bereinigen).
- Ein Klick auf einen Spaltenkopf wählt die Spalte und zeigt ihre Werte im Inspektor; der kleine Knopf im Kopf sortiert. Ein Doppelklick auf eine Zelle (oder Enter) bearbeitet sie.

Escape im Filterfeld hebt den Filter wieder auf. Mehr bei [Tabelle](#tabelle).

## Erste Schritte in der Abfrage

Unten im Hauptbereich liegt die Abfrage. Ein Klick auf "Öffnen" oder auf eine der Sprachen klappt sie auf (⌥ ⌘ E, unter Windows und Linux Strg Alt E). Das Ergebnis erscheint beim Tippen, gerechnet wird ganz in deinem Browser. Die Knöpfe "Ausprobieren" hier im Lexikon schreiben den Ausdruck ins Abfragefeld und rechnen ihn auf dem offenen Dokument; wähle dafür vorher den Reiter bestellungen.json.

Wie viele Bestellungen gibt es?

```jq
.bestellungen | length
```

Ergebnis: `128`.

Welche Bestellungen gingen nach Leipzig?

```jq
.bestellungen[] | select(.kunde.stadt == "Leipzig") | .nr
```

Ergebnis: 33 Bestellnummern, die erste ist `"B-24018"`. Die Treffer erscheinen auch im Baum, F3 springt von einem zum nächsten.

SQL rechnet über alle geöffneten Dokumente, jedes ist eine Tabelle. Die Städte mit den meisten Bestellungen:

```sql
SELECT kunde_stadt, COUNT(*) AS anzahl
FROM bestellungen
GROUP BY kunde_stadt
ORDER BY anzahl DESC
LIMIT 3
```

Ergebnis: Leipzig 33, Hamburg 28, Berlin 27. Das verschachtelte `kunde.stadt` heißt in SQL `kunde_stadt`.

Und wenn du gar keine Abfragesprache kennst, sucht die Suche einfach nach Text in Schlüsseln und Werten:

```suche
Leipzig
```

Ergebnis in bestellungen.json: 33 Treffer. Bei XML-Dokumenten wie lieferungen.xml steht zusätzlich XPath zur Wahl. Mehr zu den Sprachen bei [jq](#jq), [SQL](#sql), [JSONPath](#jsonpath), [XPath](#xpath) und [Suche](#suche).

## Ein Text, ein Verlauf

Baum, Editor, Tabelle und alle anderen Ansichten zeigen denselben Text, nur anders gelesen. Änderst du eine Zelle in der Tabelle, ändert sich genau diese Stelle im Text; Einrückung, Kommentare und das Trennzeichen einer CSV bleiben, wie sie waren. Darum gibt es auch nur einen [Verlauf](#begriffe/verlauf) je Dokument, gleich aus welcher Ansicht die Änderung kam.

- Rückgängig und Wiederholen stehen oben im Kopf, auch als ⌘ Z und ⇧ ⌘ Z (unter Windows und Linux Strg Z und Strg Umschalt Z).
- Jede Änderung zeigt kurz eine Meldung, oft mit einem eigenen Knopf "Rückgängig".
- Die Karte Verlauf im Inspektor listet die letzten Vorgänge; ein Klick springt zu diesem Stand. Der Fuß zeigt, bei welchem Stand du gerade bist.

Der Verlauf bleibt beim Neuladen erhalten. Abgelegt wird von selbst kurz nach jeder Änderung; ein Punkt im Reiter und "Wird abgelegt" im Fuß zeigen, dass es gerade läuft. Wohin abgelegt wird, hängt von der [Bauart](#bauarten) ab.

## Wo es Hilfe gibt

- **Lexikon**: "Hilfe" rechts im Fuß, F1 oder in der Leiste unter "Nachschlagen". Das Fenster schwebt über der Arbeit, lässt sich verschieben, verkleinern und durchsuchen.
- **i-Knöpfe**: Das kleine i neben einer Ansicht, einer Abfragesprache oder bei "Pfad kopieren" öffnet das Lexikon genau beim passenden Thema.
- **Hinweise beim Zeigen**: Fast jeder Knopf erklärt sich, wenn du mit der Maus kurz darauf bleibst, und nennt sein Tastenkürzel, falls er eins hat.
- **Fachwörter**: Was ein [Knoten](#begriffe/knoten), eine [Facette](#begriffe/facette) oder ein [Musterpfad](#begriffe/musterpfad) ist, steht in den [Begriffen](#begriffe).

## Wie es weitergeht

- Alle Kürzel auf einen Blick: [Tastatur](#tastatur)
- Ordner, Papierkorb und Sichern: [Ablage](#ablage)
- Pfade verstehen: [JSON Pointer und jq-Pfade](#json-pointer)
- Daten prüfen: [Validieren](#validieren) mit bestellung.schema.json
- Kaputte Zeilen retten: [Reparieren](#reparieren) mit kundenimport.ndjson
- Ergebnisse mitnehmen: [Exportieren](#exportieren)
