---
titel: Reparieren
unterzeile: Kaputtes JSON und JSON Lines nach festen Regeln lesbar machen
bereich: Werkzeuge
symbol: fa-screwdriver-wrench
stichworte: reparieren, reparatur, kaputt, defekt, fehlerhaft, repair, fix, json, json lines, ndjson, komma fehlt, anführungszeichen, klammer, abgeschnitten, trailing comma, zeile so lassen, lesen als, unterschied, diff
reihenfolge: 30
quellen: [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259), [JSON Lines](https://jsonlines.org/)
---

Manchmal ist eine Datei fast JSON: Ein Komma fehlt, jemand hat einfache Anführungszeichen benutzt, ein Export ist mitten in einer Zeile abgebrochen. Ein strenger Leser verweigert dann die ganze Datei. Reparieren schlägt für jede kaputte Stelle eine Korrektur vor, zeigt sie dir als Unterschied und übernimmt nur, was du freigibst. Es folgt **festen Regeln**: Gleiche Datei ergibt immer denselben Vorschlag, eine KI rät hier nichts. Werte werden nie erfunden; wo einer fehlt, steht `null` und ein Hinweis.

## Wo du es findest

Leiste links, Abschnitt "Prüfen und umbauen", [Reparieren](#werkzeug:reparieren); oder die Befehlspalette (⌘ K, unter Windows und Linux Strg K). Lässt sich ein JSON- oder JSON-Lines-Dokument nicht lesen, bieten auch der Fuß des Arbeitsplatzes und die [Ansicht Baum](#ansicht:baum) einen Knopf "Reparieren" an. Geschlossen wird das Werkzeug mit "Verwerfen" unten oder über den Knopf mit seinem Namen und dem Kreuz oben im Kopf des Hauptbereichs.

## Lesen als

Oben links wählst du, wie der Text gemeint ist:

- **JSON Lines**: ein Datensatz je Zeile (mehr bei [JSON Lines](#ndjson)). Jede Zeile wird für sich repariert.
- **JSON**: die ganze Datei ist ein Dokument (mehr bei [JSON](#json)).

Vorgewählt ist das Format des Dokuments; daneben steht, warum ("Format des Dokuments", "am Inhalt erkannt" oder "von Hand gewählt"). Die Wahl ist wichtig: Liest du kundenimport.ndjson als JSON, gibt es nur einen Befund in Zeile 2, "Nach dem ersten Wert folgt ein weiterer; mehrere Datensätze lassen sich als JSON Lines lesen", und keine Regel greift. Als JSON Lines gelesen, wird jede Zeile einzeln geprüft. Übernimmst du in einer Leseart, die vom Format des Dokuments abweicht, liest Strukturblick das Dokument danach in der gewählten Leseart.

## Die festen Regeln

| Was kaputt ist | Was die Reparatur vorschlägt |
|---|---|
| Komma oder Doppelpunkt fehlt | ergänzen |
| Zeile endet mitten im Text oder Objekt | Text und Klammern schließen, mit Hinweis "vermutlich abgeschnitten" |
| Klammer fehlt oder ist zu viel | ergänzen oder entfernen |
| Text in einfachen Anführungszeichen `'K-10477'` | in doppelte setzen |
| Schlüssel oder Text ohne Anführungszeichen | einfassen |
| `True`, `False`, `None`, `nil` | in `true`, `false`, `null` umschreiben |
| `NaN`, `Infinity`, `undefined` | durch `null` ersetzen, mit Hinweis "bitte prüfen" |
| Zahlen wie `+1`, `.5` oder `5.` | als `1`, `0.5`, `5.0` schreiben |
| Zahl mit führender Null wie `03046` | als Text `"03046"` setzen, die Ziffern bleiben |
| doppeltes Komma, Komma ohne Wert davor | entfernen |
| Komma vor `}` oder `]` ohne Eintrag danach (JSON Lines) | entfernen |
| Kommentare (JSON Lines) | entfernen; in JSON bleiben sie, ein offener Blockkommentar bekommt sein `*/` |
| Rückstrich vor einem Zeichen, das keine Maskierung ist | Rückstrich verdoppeln |
| Steuerzeichen wie ein Tabulator mitten im Text | maskieren, etwa als `\t` |
| zwei Datensätze in einer Zeile (JSON Lines) | auf zwei Zeilen verteilen |

Fehlt ein Wert, setzt die Reparatur `null` und sagt es. Fehlen in JSON Lines einem Datensatz Felder, die die übrigen haben (mindestens 90 Prozent der heilen Zeilen), sagt ein Hinweis welche, etwa "angelegt fehlt. Nichts wird erfunden: bitte von Hand ergänzen". Wo keine Regel greift, steht "Hier greift keine feste Regel: bitte von Hand" mit der Spalte; diese Stelle löst du im [Editor](#editor).

## Die Ansicht

Ein Band oben fasst zusammen, wie viele Zeilen unverändert bleiben und wie viele Zeichen ergänzt und gelöscht werden. Darunter zwei Tafeln:

- **Befund je Zeile**: je kaputte Zeile die Fehler mit Spalte, Meldung und Vorschlag, dazu Hinweise. Bei kleinen JSON-Lines-Dateien (bis 100 Zeilen) stehen die heilen Zeilen still dazwischen, mit "In Ordnung" und einem kurzen Steckbrief. Unter jeder Zeile mit Vorschlag wählst du **Vorschlag übernehmen** oder **Zeile so lassen**.
- **Vorschau als Unterschied**: je Zeile die alte Fassung mit `-` und der Stelle unterstrichen, die neue mit `+` und dem Ergänzten hervorgehoben, dazu die Nachbarzeilen. Ein Abzeichen zählt "+ ... Zeichen" und "... gelöscht".

Unten steht, wie lesbar der Text danach ist ("Danach 21 lesbare Zeilen."), daneben **Verwerfen** und **Übernehmen**.

## Beispiel: kundenimport.ndjson

Öffne aus den Beispielen kundenimport.ndjson: 20 Zeilen, vier davon kaputt. Die Liste zeigt:

**Zeile 2**, Nicht lesbar: 2 Fehler

```text
{"kundennr":"K-10472" "name":"Petra Nguyen","plz":"01067","ort":"Dresd
```

- Spalte 22: Komma fehlt nach "K-10472". Vorschlag: Komma einfügen.
- Spalte 71: Zeile endet mitten im Text. Vorschlag: Text und Objekt schließen mit `"}`.
- Hinweise: ort "Dresd" ist vermutlich abgeschnitten; angelegt fehlt, bitte von Hand ergänzen.

**Zeile 7**, Nicht lesbar: 10 Fehler. Alle fünf Schlüssel stehen ohne Anführungszeichen, alle fünf Werte in einfachen:

```text
{kundennr:'K-10477',name:'Bernd Löwe',plz:'08056',ort:'Zwickau',angelegt:'2026-11-11'}
```

**Zeile 12**, 2 Fehler: Spalte 51 "Zahl mit führender Null: 03046", Vorschlag als Text setzen; Spalte 96 "Komma vor } ohne Eintrag danach", Vorschlag Komma entfernen.

**Zeile 16**, 1 Fehler: Spalte 101 "Zwei Datensätze in einer Zeile", Vorschlag auf zwei Zeilen verteilen.

Das Band sagt: "16 von 20 Zeilen unverändert. In 4 Zeilen werden 26 Zeichen ergänzt, 11 gelöscht." Unten: "Danach 21 lesbare Zeilen." (Aus Zeile 16 werden zwei.) Stellst du Zeile 7 auf "Zeile so lassen", werden es 6 ergänzte und 1 gelöschtes Zeichen in 3 Zeilen, und unten steht "Danach 20 lesbare Zeilen, 1 noch nicht."

Nach "Übernehmen" lässt sich die Datei wieder abfragen. Welcher Datensatz hat kein Anlagedatum?

```jq
select(has("angelegt") | not) | .kundennr
```

Ergebnis: `"K-10472"`, die abgeschnittene Zeile 2. Und die Postleitzahl aus Zeile 12 ist Text geblieben:

```jq
select(.kundennr == "K-10482") | .plz
```

Ergebnis: `"03046"`.

## Was der Inspektor zeigt

- **Gewählt: Zeile ...** mit dem Rohtext der Zeile, ihrer Länge, "Lesbar bis" (bis zu welcher Spalte ein Leser kommt) und bei JSON Lines den Feldern nach der Reparatur; fehlende stehen in Klammern, bei Zeile 2 etwa "kundennr, name, plz, ort (angelegt fehlt)".
- **Was die Reparatur tut**: Sie ergänzt nur Zeichen, die zum Lesen fehlen, und rät keine Werte.
- **Datei**: Name, Ordner in der Ablage, Zeilen und wie viele davon kaputt sind.
- **Im Browser**: Nichts geht an einen Server.

## Übernehmen und zurücknehmen

"Übernehmen" ändert alle Zeilen mit gewähltem Vorschlag als **einen** Vorgang im Verlauf, mit einem Titel wie "Repariert: 4 Zeilen, 26 Zeichen ergänzt, 11 gelöscht". Rückgängig im Kopf oder mit ⌘ Z (Strg Z) stellt den alten Text wieder her. "Verwerfen" schließt das Werkzeug, ohne etwas zu ändern. Eine Kopie mit dem reparierten Text bekommst du, indem du vorher das Dokument dupliziert hast (Rechtsklick in der Leiste, "Duplizieren") oder danach herunterlädst (⇧ ⌘ S).

## Grenzen

- Nur JSON und JSON Lines; für YAML, TOML, CSV und XML gibt es kein Reparieren, dort hilft der Editor mit seinen Fehlermarken.
- Abgeschnittene Werte bleiben abgeschnitten (`"Dresd"`), fehlende Felder fehlen weiter. Nach der Reparatur ist die Datei lesbar, vollständig ist sie deshalb noch nicht.
- Die Listen zeigen die ersten 200 Zeilen mit Befund; "Übernehmen" gilt trotzdem für alle.
- Nach dem Reparieren lohnt sich oft [Validieren](#validieren), um auch inhaltliche Fehler zu finden.
