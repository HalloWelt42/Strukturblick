---
titel: Rezepte
unterzeile: Aufräumschritte speichern und auf die nächste Datei gleicher Bauart anwenden
bereich: Werkzeuge
symbol: fa-scroll
stichworte: rezept, rezepte, recipe, makro, macro, automatisieren, wiederholen, schritte, aufzeichnen, verlauf, anwenden, vorschau, spalten prüfen, übersprungen, export, import, rezept.json
reihenfolge: 50
quellen:
---

Wer jeden Monat denselben Kundenexport bekommt, räumt jeden Monat dieselbe Unordnung auf: Orte zusammenführen, Beträge in Zahlen wandeln, Datumsangaben vereinheitlichen. Ein **Rezept** merkt sich diese Arbeit als Folge von **Schritten** und wendet sie auf die nächste Datei gleicher Bauart an. Ein Schritt nennt nur, was fachlich geschah (Spalte und Regel, etwa "ort: `leipzig` wird `Leipzig`"), nie eine Stelle im Text. Darum passt er auch auf eine Datei mit anderen und mehr Zeilen.

## Wo du es findest

In der Leiste links gibt es einen eigenen Abschnitt **Rezepte**. Der Knopf mit der Liste rechts neben der Überschrift öffnet das Werkzeug [Rezepte](#werkzeug:rezepte) mit allen Rezepten; darunter steht jedes gespeicherte Rezept mit der Zahl seiner Schritte und öffnet es direkt. Solange es noch keins gibt, steht dort "Noch keine Rezepte". Wie die anderen Werkzeuge braucht es ein offenes Dokument und schließt über den Knopf mit seinem Namen und dem Kreuz oben im Kopf des Hauptbereichs.

## Woher die Schritte kommen

Schritte entstehen aus Vorgängen, die du schon erledigt hast. Diese Vorgänge bringen einen Schritt mit:

| Vorgang | Schritt im Rezept | Abzeichen |
|---|---|---|
| [Bereinigen](#bereinigen), Ähnliche Werte übernehmen | `ort zusammenführen`: jede Schreibweise und ihr Zielwert | Bereinigen |
| Bereinigen, Typen, Betrag umwandeln | `umsatz als Betrag` | Typ |
| Bereinigen, Typen, Datum umwandeln | `angelegt vereinheitlichen` | Datum |
| Bereinigen, Facetten, Nur diese Zeilen behalten | `Zeilen nach ort behalten`: die Filter | Zeilen |
| [Tabelle](#tabelle), Duplikate prüfen | `Duplikate nach kundennr`: welche Spalten gleich sein müssen und welche Zeile bleibt | Zeilen |
| Tabelle, Spalte entfernen | `Spalte telefon entfernen` | Spalten |

Bearbeitungen von Hand im Editor oder in einer Tabellenzelle gehören nicht dazu, ebenso wenig eine Duplikatgruppe, bei der du die Zeile selbst ausgesucht hast: Diese Wahl gilt nur für genau diese Datei.

## Ein Rezept anlegen

1. Öffne aus den Beispielen kunden.csv und lege mit Rechtsklick in der Leiste und "Duplizieren" eine Kopie an (`kunden Kopie.csv`). An ihr probierst du das Rezept später aus.
2. Gehe in kunden.csv zu [Bereinigen](#bereinigen) und erledige drei Vorgänge: Ähnliche Werte in `ort` mit "Gleicher Kern" übernehmen (151 Zellen), im Reiter Typen `umsatz` als Betrag umwandeln (1.214 Zellen) und `angelegt` umwandeln (405 Zellen).
3. Öffne Rezepte und klicke **Neues Rezept aus dem Verlauf**. Die Seite listet die drei Vorgänge, jeden mit Schalter (alle an), Abzeichen, einem Satz zur Wirkung und dem Stand im Verlauf.
4. Name: vorgeschlagen ist "kunden säubern". **Rezept speichern**.

Der Knopf "Neues Rezept aus dem Verlauf" ist grau, solange der Verlauf des Dokuments keinen passenden Vorgang enthält; die Seite bietet dann "Zum Bereinigen". Rückgängig gemachte Vorgänge zählen nicht mit.

## Ein Rezept ansehen und ändern

Links steht die Liste aller Rezepte (ab sechs mit Suchfeld), je mit Herkunft und wann zuletzt angewendet. Rechts das gewählte:

- Kopf mit **Umbenennen**, **Herunterladen** (als `kunden-säubern.rezept.json`, zum Sichern oder Weitergeben) und dem Papierkorb. Entfernen meldet sich mit Rückgängig in der Meldung.
- **Schritte**, von oben nach unten ausgeführt. Jeder hat einen Schalter zum Ausschalten, Pfeile nach oben und unten und ein Kreuz zum Entfernen. Bei Ersetzungen stehen die Zuordnungen da (`leipzig`, `Leipzig ` wird `Leipzig`), bei Betrag und Datum die Wahl **Nicht lesbar: Stehen lassen** oder **Leer setzen**, bei Duplikaten **Es bleibt: Erste Zeile, Letzte Zeile, Meiste Angaben**.
- **Erwartete Spalten**: alle Spalten der Datei, aus der das Rezept entstand, und welcher Schritt welche braucht. Bei kunden säubern sind es 8: `ort` für Schritt 1, `umsatz` für Schritt 2, `angelegt` für Schritt 3, die übrigen nur zum Vergleich.

Jede Änderung wird sofort abgelegt.

## Anwenden

Öffne die Datei, auf die das Rezept soll, hier `kunden Kopie.csv`, wähle das Rezept und klicke **Anwenden**. Das läuft in drei Schritten, und bis zum letzten ändert sich nichts:

**1. Spalten prüfen.** Strukturblick vergleicht die erwarteten Spalten mit denen der Datei: "Passt: alle erwarteten Spalten da". Fehlt eine, wird nur der Schritt übersprungen, der sie braucht ("umsatz fehlt, Schritt 2 wird übersprungen"); zusätzliche Spalten der neuen Datei bleiben, wie sie sind ("neu, bleibt").

**2. Vorschau je Schritt.** Je Schritt die häufigsten Änderungen mit Anzahl. Bei der Kopie von kunden.csv:

| Schritt | Ändert | Beispiele |
|---|---|---|
| 1 ort zusammenführen | 151 Zellen | `leipzig` wird `Leipzig` (48), `Leipzig ` wird `Leipzig` (41), `Halle/Saale` wird `Halle (Saale)` (35) |
| 2 umsatz als Betrag | 1.214 Zellen | `9.146,66` wird `9146.66` (2), `3.309,23` wird `3309.23` |
| 3 angelegt vereinheitlichen | 405 Zellen | `01.01.2024` wird `2024-01-01` (15) |

Darüber steht "1.770 Zellen ändern sich". Ein Schritt ohne Wirkung zeigt "ändert hier nichts", ein ausgeschalteter "ausgeschaltet", ein übersprungener seinen Grund. Nicht lesbare Werte stehen mit "nicht lesbar, bleibt stehen" oder "wird leer" da.

Die 405 prüfst du vor dem Anwenden auf der Kopie mit:

```jq
[.[] | select(.angelegt | test("^[0-9]{2}\\."))] | length
```

Ergebnis: `405`.

**3. Ergebnis.** Wähle **Als neues Dokument** (Name vorgeschlagen mit `-sauber`, etwa `kunden Kopie-sauber.csv`, im selben Ordner; die Quelle bleibt unberührt) oder **Ins Dokument** (ein Vorgang im Verlauf, rückgängig mit ⌘ Z, unter Windows und Linux Strg Z). **Übernehmen** ist grau, wenn das Rezept an dieser Datei nichts ändert. Wendest du kunden säubern ein zweites Mal auf dieselbe Datei an, ändert es nichts mehr: Die Schritte erkennen, was schon passt.

## Was der Inspektor zeigt

- **Beim Ansehen**: "Anwenden auf" mit diesem und allen anderen offenen Dokumenten (ein Klick wechselt dorthin und startet das Anwenden), "Zuletzt angewendet" mit Datum, Dokument und Ergebnis (die letzten zehn), und "Ablage" mit dem Ort, an dem Rezepte liegen.
- **Beim Anwenden**: die Datei (Name, Ordner, Größe, Format), die Schritte des Rezepts und was "Als neues Dokument" und "Ins Dokument" bewirken.
- **Beim Anlegen**: der Hinweis, dass ein Rezept Spalte und Regel speichert, nicht Stellen im Text.

## Wo Rezepte liegen

Rezepte gehören zu deiner Ablage, nicht zu einem Dokument: mit Server auf dem Server je Konto, ohne Server im Browser. Sie stehen damit in jedem Dokument zur Verfügung. "Alles sichern" in der [Ablage](#ablage) nimmt sie mit; einzeln sicherst du sie über Herunterladen.

## Grenzen

- Rezepte arbeiten auf Tabellen, also auf einer Liste gleich aufgebauter Einträge; Spalten werden nach ihrem Namen gefunden. Heißt die Spalte in der neuen Datei anders, wird ihr Schritt übersprungen.
- Ein Schritt "Zeilen behalten", dessen Filter keine Zeile trifft, wird übersprungen, statt alle Zeilen zu entfernen.
- Ersetzungen gelten genau für die gespeicherten Schreibweisen. Kommt in der neuen Datei eine weitere Schreibweise vor, bleibt sie; bereinige sie und lege das Rezept neu an.
- Bearbeitungen von Hand lassen sich nicht aufzeichnen.
