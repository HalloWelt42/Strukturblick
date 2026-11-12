---
titel: Bereinigen
unterzeile: Filtern, Schreibweisen zusammenführen und Typen vereinheitlichen
bereich: Werkzeuge
symbol: fa-broom
stichworte: bereinigen, aufräumen, säubern, data cleaning, cleanup, facette, facetten, facet, filter, ähnliche werte, schreibweisen, zusammenführen, cluster, kern, buchstabenpaare, dice, tippfehler-abstand, levenshtein, zielwert, typen, typvorschlag, betrag, datum, führende null, nur diese zeilen behalten
reihenfolge: 20
quellen:
---

Echte Daten sind selten sauber. Derselbe Ort steht als `Leipzig`, `leipzig` und `Leipzig ` (mit Leerzeichen am Ende) da, Beträge als Text mit Komma, Datumsangaben mal so, mal so. Bereinigen hilft dir, solche Unordnung zu finden und mit wenigen Klicks zu beseitigen. Es arbeitet auf derselben Liste, die auch die [Ansicht Tabelle](#ansicht:tabelle) zeigt: bei einer CSV die Zeilen, bei JSON etwa die Einträge von `bestellungen`. Jede Änderung ist genau ein Vorgang im Verlauf und lässt sich mit Rückgängig (⌘ Z, unter Windows und Linux Strg Z) zurücknehmen; aus diesen Vorgängen entsteht später auf Wunsch ein [Rezept](#rezepte).

## Wo du es findest

Leiste links, Abschnitt "Prüfen und umbauen", [Bereinigen](#werkzeug:bereinigen); oder in der Befehlspalette (⌘ K, Strg K) "Bereinigen" tippen. Das Werkzeug belegt den Platz der Ansicht, bis du es über den Knopf mit seinem Namen und dem Kreuz oben im Kopf des Hauptbereichs schließt. Oben stehen drei Reiter: **Facetten**, **Ähnliche Werte** und **Typen**. Der gewählte Reiter steht in der Adresse (`/bereinigen?reiter=aehnlich`).

Findet Strukturblick keine Liste gleich aufgebauter Einträge, sagt es das und bietet "Im Baum ansehen". Ist das Dokument nicht lesbar, heißt es "Erst reparieren, dann bereinigen", mehr bei [Reparieren](#reparieren).

Zum Mitmachen öffnest du aus den Beispielen kunden.csv: 1.214 Kunden mit absichtlichen Unsauberkeiten. Willst du das Original behalten, lege vorher mit Rechtsklick auf das Dokument in der Leiste und "Duplizieren" eine Kopie an.

## Facetten

Eine **Facette** zählt, welche Werte in einer Spalte stehen und wie oft. Ein Klick auf einen Wert filtert: Die Tabelle rechts zeigt nur noch Zeilen mit diesem Wert. Mehrere Facetten filtern zusammen, eine Zeile bleibt nur, wenn sie zu allen passt.

Beim ersten Öffnen schlägt Strukturblick bis zu vier Facetten vor: Datum und Zahlen immer, Text nur, wenn sich die Werte oft wiederholen (höchstens 50 verschiedene). Bei kunden.csv sind das `plz`, `ort`, `angelegt` und `umsatz`. Weitere Spalten holst du mit "Facette hinzufügen" oben rechts, das Kreuz im Kopf einer Facette schließt sie, der Trichter daneben hebt ihre Auswahl auf.

Je nach Inhalt sieht eine Facette anders aus:

| Art | Abzeichen | Bedienung |
|---|---|---|
| Text, Wahrheitswert, Liste | Text und andere | Werte mit Anzahl und Balken zum Ankreuzen; "Anzahl" oder "A bis Z" sortiert; nach 15 Werten klappt "Weitere" den Rest auf. Steckt in einer Zelle eine Liste, zählt jeder Eintrag. |
| Zahl oder Betrag | Zahl, Betrag | Verteilung in runden Schritten. Klick auf einen Balken wählt ihn, weitere Klicks erweitern den Bereich; die Griffe lassen sich ziehen, die Felder "ab" und "bis" nehmen genaue Grenzen (deutsch geschrieben, Komma für Nachkommastellen). |
| Datum | Datum | Anzahl je Monat ohne Lücken; Klick wählt einen Monat, weitere Klicks erweitern den Zeitraum. |

Ein **Betrag** ist eine Zahl in deutscher Schreibweise als Text, etwa `"3.309,23"`. Strukturblick liest sie für die Facette als Zahl, ohne die Datei zu ändern.

Facetten bemerken auch Unordnung: Unter `ort` steht bei kunden.csv der Hinweis "Leipzig steht in 3 Schreibweisen, Halle (Saale) und Dresden ebenso. Zusammenführen"; ein Klick führt zum Reiter Ähnliche Werte. Unter `angelegt` steht "Zwei Formen gelesen: 809 als JJJJ-MM-TT, 405 als TT.MM.JJJJ. Vereinheitlichen", das führt zu den Typen.

### Beispiel: Leipziger Kunden mit viel Umsatz

1. In der Facette `ort` auf `Leipzig` klicken: 53 von 1.214 Zeilen.
2. In der Facette `umsatz` erst den Balken 5.000 bis 6.000 und dann den letzten (9.000 bis 10.000) anklicken; gewählt ist der Bereich dazwischen: 25 Zeilen.

Über der Tabelle stehen die Filter als Marken mit Kreuz, dazu "Alle entfernen". Der Inspektor zählt je Schritt: `ort` 53 Zeilen, `+ umsatz` 25 Zeilen. Die Tabelle blättert in Seiten zu 50 Zeilen. Die erste Zahl prüfst du mit jq im Abfragefeld (bei einer CSV ist jede Zeile ein Objekt mit Text):

```jq
[.[] | select(.ort == "Leipzig")] | length
```

Ergebnis: `53`. Die beiden anderen Schreibweisen fehlen in dieser Zahl; das ist die Arbeit des nächsten Reiters.

### Zeilen mitnehmen oder behalten

- **Als neues Dokument** legt eine Kopie mit den gefilterten Zeilen an (`kunden-auswahl.csv` im selben Ordner; CSV bleibt CSV, sonst entsteht JSON). Das Original bleibt ganz.
- **Nur diese Zeilen behalten** zeigt zuerst eine Vorschau, im Hauptbereich und im Inspektor: "53 bleiben, 1.161 werden entfernt". Erst "Übernehmen" entfernt die übrigen Zeilen aus dem Text; Kopfzeile, Kommentare und Schreibweise bleiben. "Abbrechen" lässt alles, wie es ist.

## Ähnliche Werte

Hier findet Bereinigen verschiedene Schreibweisen desselben Werts und führt sie auf Wunsch zu einer zusammen. Oben rechts wählst du die Spalte; vorgewählt ist die erste mit Auffälligem, bei kunden.csv `ort`.

### Die drei Verfahren

Alle Verfahren arbeiten mit dem **Kern** eines Werts: alles klein, Leerzeichen und Satzzeichen weg, übrig bleiben Buchstaben und Ziffern. Aus `Halle (Saale)` wird `hallesaale`, aus `Halle/Saale` ebenfalls.

| Verfahren | Wann zwei Werte zusammengehören |
|---|---|
| Gleicher Kern | Ihre Kerne sind gleich. Das sicherste Verfahren; Abkürzungen findet es nicht. |
| Buchstabenpaare | Sie teilen mindestens 80 Prozent ihrer **Buchstabenpaare**, also der Paare benachbarter Buchstaben (`le`, `ei`, `ip` ...). Findet auch vertauschte und fehlende Buchstaben. |
| Tippfehler-Abstand | Höchstens zwei Änderungen führen vom einen zum anderen; eine Änderung ist ein eingefügter, gelöschter oder ersetzter Buchstabe. Findet am meisten, auch Falsches. |

Die beiden unscharfen Verfahren vergleichen jeden Wert mit jedem; das geht bis 1.500 verschiedene Werte je Spalte, darüber steht "zu viele Werte". Werte, deren Kern kürzer als 4 Zeichen ist, gruppieren sie nur bei gleichem Kern, weil kurze Wörter sonst zufällig ähnlich wären. Jedes Verfahren zeigt gleich, wie viele Gruppen es findet.

### Gruppen und Zielwert

Jede Gruppe ist eine Tafel mit ihren Schreibweisen, ihrer Anzahl und dem **Zielwert**: dem Wert, zu dem die Gruppe wird. Vorgeschlagen ist die häufigste Schreibweise, bei Gleichstand die ohne Leerzeichen am Rand und mit großem Anfangsbuchstaben. So änderst du ihn:

- das Kästchen vor einer anderen Schreibweise anklicken,
- oder unten in der Tafel "Eigenen Zielwert eingeben".

Hinter jeder anderen Schreibweise steht, wozu sie wird; ein Abzeichen warnt vor Leerzeichen am Rand. Mit **Zusammenführen: Nein** nimmst du eine Gruppe aus. Unten zählt die Leiste "Vorschau: ändert ... Zellen in ... Gruppen", **Übernehmen** setzt alles als einen Vorgang.

### Beispiel: Orte in kunden.csv

Die Spalte `ort` hat 12 verschiedene Werte. "Gleicher Kern" findet 3 Gruppen:

| Zielwert | Schreibweisen |
|---|---|
| Leipzig | `Leipzig` 53, `leipzig` 48, `Leipzig ` 41 |
| Halle (Saale) | `Halle (Saale)` 40, `Halle/Saale` 35 |
| Dresden | `Dresden` 30, `dresden` 27 |

Die Vorschau sagt: ändert 151 Zellen in 3 Gruppen. Der Inspektor zeigt die betroffenen Zellen (ein Klick springt in die Tabelle) und "Danach": `ort` hat 8 verschiedene Werte statt 12. Prüfen kannst du die Ausgangslage mit:

```jq
[.[].ort] | unique | length
```

Ergebnis: `12`; nach dem Übernehmen liefert derselbe Ausdruck `8`.

`Lpz.` (39 Zeilen) bleibt übrig: Sein Kern `lpz` ist nicht der von Leipzig und kürzer als 4 Zeichen, deshalb gruppiert es kein Verfahren. Solche Abkürzungen änderst du von Hand in der [Tabelle](#tabelle).

## Typen

Der **Typ** sagt, wie ein Wert gemeint ist: Text, Zahl, Betrag oder Datum. CSV und XML kennen nur Text; die Typen liest Strukturblick selbst aus den Werten. Oben steht eine Übersicht aller Spalten mit "Steht als", "Erkannt", "Vorschlag" und "Stand" (passt, Vorschlag oder Hinweis), darunter je Spalte mit Vorschlag eine Tafel. Ein **Typvorschlag** entsteht, wenn mindestens 80 Prozent der gefüllten Werte einer Spalte gleich aussehen; der Rest erscheint als nicht lesbar.

| Vorschlag | Wirkung |
|---|---|
| Betrag | `"1.234,50"` wird die Zahl `1234.50`. Punkt trennt Tausender, Komma die Nachkommastellen. |
| Datum JJJJ-MM-TT | `01.03.2024` wird `2024-03-01`; TT.MM.JJJJ gilt immer als Tag, Monat, Jahr. Was schon so steht, bleibt. |
| Text bleibt | Nur ein Hinweis: Die Werte bestehen aus Ziffern und sind Nummern mit führender Null (Postleitzahlen, Kundennummern). Als Zahl verlören sie die Null, darum ändert dieser Vorschlag nichts. Mehr bei [Zahlen als Text](#zahlen-als-text). |

Jede Tafel zeigt Vorher und Nachher an Beispielen, darunter nicht lesbare Werte mit Grund (etwa "Buchstabe O statt Null?" oder "Wort vor der Zahl"). Für sie wählst du **Unverändert lassen** oder **Leer setzen**. Nichts geschieht von selbst: **Umwandeln** ist je Spalte ein eigener Vorgang.

Bei kunden.csv steht in der Werkzeugzeile "8 Spalten, 2 Vorschläge, 1 Hinweis":

- `umsatz`: Betrag, deutsches Format. Ändert 1.214 Zellen, etwa `"3.309,23"` zu `3309.23`.
- `angelegt`: Datum, 2 Formate gemischt. 809 Werte stehen schon als JJJJ-MM-TT, 405 werden umgestellt, etwa `01.01.2024` zu `2024-01-01`.
- `plz`: Text, sieht aus wie Zahl. 313 Werte verlören ihre führende Null, aus `04109` würde `4109`.

Die Zahl der umzustellenden Daten prüfst du mit:

```jq
[.[] | select(.angelegt | test("^[0-9]{2}\\."))] | length
```

Ergebnis: `405`.

In einer CSV ist jede Zelle Text; nach dem Umwandeln steht dort `3309.23` in Rechenschreibweise, die andere Programme als Zahl verstehen. In JSON wird daraus eine echte Zahl. Mehr zu Datumsformen bei [Datum und Zeit](#datum-und-zeit).

## Was der Inspektor zeigt

- **Facetten**: "Treffer" mit der Zahl je Filterschritt; die Vorschau zu "Nur diese Zeilen behalten" mit Balken, "Bleiben", "Entfernt" und dem Stand im Verlauf danach; eine Karte zur Spalte des letzten Filters mit "Verschieden", "Leer" und "Auffällig" (etwa "Leipzig in 3, Halle (Saale) in 2, Dresden in 2 Schreibweisen").
- **Ähnliche Werte**: wie das gewählte Verfahren vergleicht (beim Kern mit Beispielen wie `Halle/Saale` wird `hallesaale`), die betroffenen Zellen und "Danach".
- **Typen**: die gewählte Spalte (Zeile in der Übersicht anklicken) mit "Steht als", "Erkannt", "Lesbar" und bei Beträgen der Spanne, dazu die nicht lesbaren Werte mit Sprung in die Tabelle.

## Ergebnisse übernehmen

Jedes Übernehmen, Umwandeln und Behalten ist ein Vorgang im Verlauf: Rückgängig im Kopf oder mit ⌘ Z, Wiederholen mit ⇧ ⌘ Z. Im Verlauf merkt sich Strukturblick dabei, was fachlich geschah (Spalte und Regel), nie Stellen im Text. Im Werkzeug [Rezepte](#rezepte) wird daraus mit "Neues Rezept aus dem Verlauf" eine Folge von Schritten für die nächste Datei gleicher Bauart. Ein Abzug der gefilterten Zeilen geht über "Als neues Dokument"; zum Herunterladen dann [Exportieren](#exportieren).

## Grenzen

- Bereinigen braucht eine Liste gleich aufgebauter Einträge; verschachtelte Objekte in einer Spalte zählt es nicht als Werte.
- Abkürzungen und ganz andere Wörter für dasselbe findet keines der Verfahren.
- Typvorschläge gibt es für Betrag und Datum; Wahrheitswerte wie `ja` und `nein` bleiben Text.
- Die unscharfen Verfahren enden bei 1.500 verschiedenen Werten je Spalte.
