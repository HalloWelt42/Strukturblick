---
titel: Mit KI
unterzeile: Daten erklären, Fragen in Abfragen übersetzen, Schemas und Testdaten vorschlagen, alles erst als Vorschau
bereich: Werkzeuge
symbol: fa-wand-magic-sparkles
stichworte: ki, künstliche intelligenz, sprachmodell, llm, modell, leitstelle, qwen, frage, übersetzen, abfrage aus text, sql schreiben, jq schreiben, erklären, schema aus text, beschreibung, description, testdaten vorschlagen, vorschau, probelauf, auszug, datenschutz, heimnetz
reihenfolge: 80
---

Mit KI hilft dir ein Sprachmodell bei Aufgaben, die mit Sprache zu tun haben: erklären, was in den Daten steht, eine Frage in Worten in eine Abfrage übersetzen, ein Schema aus einer Beschreibung schreiben, ein Schema mit Beschreibungen versehen und bessere Testdaten vorschlagen. Jedes Ergebnis ist zuerst ein **Vorschlag** mit Erklärung und Probelauf. Übernommen wird nur, was du anklickst; dein Dokument ändert sich dabei nie.

Mit KI gibt es nur in der Fassung mit Server. Das Modell rechnet im Heimnetz über die **Leitstelle**, die zentrale Vermittlung für alle KI-Aufträge im Haus; welches Modell, stellst du am Zahnrad oben rechts unter KI ein.

## Was hinausgeht

An die Leitstelle geht ein **Auszug**, nie das ganze Dokument:

- Name und Format des Dokuments
- die Felder mit Art und Auffälligkeiten, etwa "Text, nur Ziffern, 73 mit führender Null" oder "12 leer"
- bis zu 20 Beispieleinträge, jeder auf 1.200 Zeichen gekürzt
- für SQL die Tabellen mit ihren Spalten und 20 Beispielzeilen, für XPath zusätzlich der Anfang des Textes
- deine Frage und, je nach Aufgabe, das Schema oder die bisherige Spezifikation der Testdaten

Der ganze Auszug ist höchstens 40.000 Zeichen lang. Der Inspektor zeigt unter **Gesendet** genau, wie viele Felder und Beispiele es waren und wie viele Zeichen. Rechnet das gewählte Modell außer Haus, steht das dort als Warnung.

## Die Aufgaben

| Aufgabe | Was du schreibst | Was zurückkommt |
|---|---|---|
| Daten erklären | wahlweise eine Frage | eine Erklärung der Felder, Auffälligkeiten |
| Frage in Abfrage übersetzen | die Frage in Worten | ein Ausdruck in SQL, jq, JSONPath oder XPath |
| Schema aus Beschreibung | was die Daten enthalten sollen | ein JSON Schema |
| Beschreibung aus Schema | wahlweise einen Hinweis zum Ton | dasselbe Schema mit Beschreibungen |
| Testdaten vorschlagen | wahlweise einen Wunsch | eine Spezifikation für das Werkzeug [Testdaten](#testdaten) |

Mit ⌘ Enter (Strg Enter) stellst du die Frage aus dem Eingabefeld heraus.

## Vorschau und Probelauf

Ein Vorschlag erscheint mit dem Abzeichen "Vorschau, noch nichts übernommen". Links steht das Ergebnis, rechts erklärt das Modell, wie es die Frage gelesen hat, etwa ob "mehr als 1.000" die 1.000 selbst einschließt. Darunter prüft Strukturblick den Vorschlag selbst:

- **Abfrage**: Sie rechnet einmal auf dem offenen Dokument, die ersten fünf Zeilen oder Werte stehen da, dazu die Zahl der Treffer und die Dauer. SQL trägt "liest nur", wenn der Ausdruck nichts ändern will. Ist der Ausdruck falsch, steht die Meldung der Abfrage da.
- **Schema**: Das offene Dokument wird gegen das neue Schema geprüft, mit der Zahl der Befunde und den ersten fünf.
- **Beschreibung**: Wie viele Beschreibungen vorher und nachher im Schema stehen; hat das Modell Felder erfunden oder weggelassen, steht das als Warnung da.
- **Testdaten**: fünf Datensätze mit dem neuen Vorschlag, Startwert 4711. Erzeuger und Einstellungen, die es nicht gibt, und Felder, die nicht in der Vorlage stehen, fallen weg und werden genannt.

## Übernehmen

| Knopf | Was passiert |
|---|---|
| In Abfrage übernehmen | Der Ausdruck steht im Abfragefeld und rechnet, wie von Hand getippt |
| Ergebnis als neues Dokument | Das ganze Ergebnis der Abfrage wird ein eigenes Dokument |
| Als neues Dokument | Schema, beschriebenes Schema oder Erklärung werden ein eigenes Dokument neben diesem |
| In Testdaten übernehmen | Die Spezifikation gilt im Werkzeug Testdaten; Zurücksetzen holt die alte zurück |
| Kopieren | Ausdruck, Schema oder Text in die Zwischenablage |
| Anders vorschlagen | Fragt neu und nennt dem Modell den vorigen Vorschlag, damit ein anderer Ansatz kommt |
| Verwerfen | Wirft den Vorschlag weg oder bricht das Warten ab |

Im Werkzeug Testdaten führt **Von KI vorschlagen** direkt hierher und fragt gleich.

## Modell und Leitstelle

Am Zahnrad oben rechts stehen unter **KI** der Schalter "KI-Funktionen anbieten", der Stand der Leitstelle und die Sprachmodelle, die sie Strukturblick anbietet, mit "geladen" oder "bereit" und dem Rechner. Vorgabe ist das gründlichste allgemeine Modell. Die Wahl gilt für alle Geräte. Ausgeschaltet verschwindet Mit KI aus Leiste und Befehlsfeld; alles andere bleibt gleich.

Lädt die Leitstelle das Modell erst, dauert die erste Antwort länger; der Vorschlag wartet ohne Zeitgrenze, bis sie fertig ist, und **Abbrechen** beendet das Warten. Meldungen der Leitstelle stehen so da, wie sie kommen, etwa wenn der Hauptregler auf Halt steht.

Unter **Zuletzt gefragt** im Inspektor stehen deine letzten Fragen mit Dokument und Zeit; ein Klick stellt Aufgabe und Frage wieder ein, gefragt wird erst auf Knopfdruck. Die Liste bleibt in diesem Browser.

## Grenzen

- Das Modell sieht nur den Auszug. Fragen, die alle Einträge brauchen, etwa "wie viele", beantwortet erst der Probelauf auf dem ganzen Dokument richtig.
- Schreibweisen außerhalb der 20 Beispiele kennt das Modell nicht. Für gemischte Schreibweisen hilft zuerst [Bereinigen](#bereinigen).
- Ein Vorschlag kann falsch sein. Darum gibt es Erklärung und Probelauf, und darum wird nichts von selbst übernommen.

## Passt dazu

- [Abfrage mit jq](#jq), [SQL](#sql), [JSONPath](#jsonpath) und [XPath](#xpath) für die Sprachen der Abfragen
- [JSON Schema](#json-schema) und [Validieren](#validieren) für Schemas
- [Testdaten](#testdaten) für die Spezifikation
