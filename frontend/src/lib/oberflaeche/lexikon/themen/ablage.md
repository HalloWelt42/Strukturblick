---
titel: Ablage
unterzeile: Wo deine Dokumente liegen und wie du sie ordnest, sicherst und zurückholst
bereich: Arbeitsplatz
symbol: fa-folder-open
stichworte: ablage, ordner, dateien, dokumente, umbenennen, verschieben, papierkorb, löschen, wiederherstellen, sichern, sicherung, backup, einspielen, import, hineinziehen, drag and drop, öffnen, xlsx, html, einlesen, kodierung, duplizieren
reihenfolge: 10
quellen:
---

Die Ablage ist der Ort, an dem Strukturblick deine Dokumente aufhebt: mit Text, [Verlauf](#begriffe/verlauf), gewählter Leseweise und der zuletzt offenen Ansicht. Ohne Server ist das der Speicher deines Browsers, mit Server deine Ablage auf pi5b im Heimnetz (mehr bei [Bauarten](#bauarten)). Abgelegt wird von selbst, kurz nach jeder Änderung. Die Seite Ablage ist dein Aktenschrank zum Aufräumen: Ordner, Umbenennen, Verschieben, Papierkorb und Sichern.

## Die Seite Ablage öffnen

- der Ordnerknopf oben in der Leiste, rechts neben dem Ort ("Dieser Browser" oder "Ablage auf pi5b")
- ⌥ ⌘ A (unter Windows und Linux Strg Alt A), noch einmal schließt sie
- ein Ordner in der Leiste oder "Ablage verwalten" im [Befehlsfeld](#befehlsfeld)
- im Menü eines Reiters (Rechtsklick) "Im Ordner zeigen"

Solange die Seite offen ist, belegt sie Hauptbereich und Inspektor; die Adresse lautet dann `/ablage`. Das Kreuz am Segment "Ablage" oben schließt sie, ein Klick auf eine Ansicht daneben auch.

## So ist die Seite gebaut

- **Links** die Ordner: ganz oben der Ort selbst (die oberste Ebene), darunter deine Ordner, ganz unten der Papierkorb. Jede Zeile zählt ihre Dokumente.
- **Oben** der Pfad (Ablage, dann der Ordner), das Suchfeld "In der Ablage suchen" und "Neuer Ordner". Die Suche findet Dokumente nach dem Namen in allen Ordnern und zeigt dann eine Spalte Ordner dazu.
- **In der Mitte** eine Fläche zum Hineinziehen von Dateien und die Liste der Dokumente mit Name, Format, Größe und Änderungszeit. Ein Klick auf "Name", "Größe" oder "Geändert" sortiert danach; zu Beginn stehen die zuletzt geänderten oben.
- **Rechts** der Inspektor: das gewählte Dokument mit "Öffnen", sonst eine Übersicht mit Ort, Zahl der Dokumente und Gesamtgröße, dazu die Karten Sichern, Beispiele zum Üben und Papierkorb.

## Dokumente wählen und öffnen

Ein Klick auf eine Zeile wählt das Dokument. Mit gedrückter ⌘-Taste, Strg-Taste oder Umschalttaste kommen weitere dazu (oder fallen wieder heraus); der Haken vorn schaltet ein einzelnes Dokument dazu oder weg, der Haken im Kopf wählt alle oder keins. Ein Doppelklick öffnet das Dokument als Reiter.

Sobald etwas gewählt ist, erscheint darüber eine Leiste: Herunterladen, Umbenennen (bei genau einem), Verschieben, In den Papierkorb und Auswahl aufheben. Alles wirkt auf alle gewählten Dokumente.

## Ordner

Ordner sind eine Ebene tief, Ordner in Ordnern gibt es nicht. Das hält die Ablage übersichtlich und die Leiste kurz.

- **Anlegen**: "Neuer Ordner", Namen tippen, "Anlegen". Erlaubt sind 1 bis 80 Zeichen ohne `/` und `\`. Escape bricht ab.
- **Umbenennen**: Doppelklick auf den Ordner links oder der Stift neben dem gewählten Ordner; in der Leiste F2 oder das Menü per Rechtsklick. Die Dokumente ziehen mit um.
- **Entfernen**: Nur leere Ordner lassen sich entfernen, über den Knopf neben dem gewählten Ordner oder "Ordner entfernen" im Menü der Leiste. Liegt noch etwas darin, erst verschieben oder in den Papierkorb legen.
- **Neues Dokument darin**: im Menü eines Ordners in der Leiste.

## Umbenennen, Verschieben, Duplizieren

Der Name eines Dokuments ist sein Dateiname, mit Endung. Umbenennen geht über die Auswahlleiste, das Menü per Rechtsklick (auf Dokument oder Reiter) oder F2 in der Leiste. Links auf das Dokument brechen dabei nicht, denn die [Adresse](#adressen) hängt an der Kennung und nicht am Namen.

"Verschieben" in der Auswahlleiste oder "Verschieben nach" im Menü bietet die oberste Ebene und alle Ordner an. Offene Reiter ziehen einfach mit.

"Duplizieren" im Menü legt eine Kopie im selben Ordner an, etwa `bestellungen Kopie.json`, und öffnet sie. Die Kopie beginnt mit einem leeren Verlauf.

## Papierkorb

"In den Papierkorb" gibt es in der Auswahlleiste, im Menü per Rechtsklick, als Knopf neben jedem Dokument der Leiste und im Befehlsfeld ("Dokument in den Papierkorb"). Ist das Dokument offen, wird es vorher abgelegt und geschlossen. Die Meldung danach hat einen Knopf "Rückgängig", falls es zu schnell ging.

Im Papierkorb (links ganz unten) stehen die entfernten Dokumente mit Zeitpunkt und ihrem alten Ordner:

- **Wiederherstellen** legt sie zurück an ihren Platz.
- **Endgültig entfernen** fragt in der Fläche noch einmal nach ("Ja, endgültig") und lässt sich danach nicht mehr rückgängig machen.
- Nach 30 Tagen im Papierkorb löscht die Ablage ein Dokument von selbst endgültig.

## Alles sichern und Einspielen

Die Karte Sichern im Inspektor der Seite Ablage hat zwei Knöpfe:

- **Alles sichern** lädt eine Datei `strukturblick-sicherung-JJJJ-MM-TT.json` herunter, etwa `strukturblick-sicherung-2026-11-12.json`. Darin stecken alle Ordner, alle Dokumente samt Verlauf und alle [Rezepte](#rezepte). Vorher wird alles Offene abgelegt.
- **Einspielen** nimmt eine solche Datei und fügt ihren Inhalt zu deiner Ablage hinzu. Überschrieben wird nichts; fehlende Ordner entstehen neu. Jedes eingespielte Dokument bekommt eine neue Kennung, alte Links auf die gesicherten Dokumente führen also nicht zu den eingespielten.

Das funktioniert auch zwischen den Bauarten, etwa vom Browser auf den Server. Ohne Server ist "Alles sichern" der einzige Schutz, falls die Browserdaten einmal gelöscht werden. Ein Dokument einzeln sicherst du mit "Herunterladen"; mehr bei [Exportieren](#exportieren). Spielst du dieselbe Sicherung zweimal ein, liegt alles doppelt da.

## Dateien öffnen und hineinziehen

Neue Dateien kommen auf drei Wegen in die Ablage:

- "Datei öffnen" in der Leiste, auf der Startseite oder ⌘ O (Strg O); mehrere auf einmal gehen auch.
- Dateien aus dem Dateimanager irgendwo auf das Fenster ziehen. Ein Rahmen zeigt "Loslassen zum Öffnen".
- "Text einfügen" auf der Startseite, dann "Als Dokument öffnen"; das Dokument heißt dann "eingefügt".

Ist die Seite Ablage offen, landen neue Dateien im gerade gewählten Ordner, sonst auf der obersten Ebene. Jede geöffnete Datei wird ein Dokument der Ablage und geht als Reiter auf. Die Datei auf deinem Gerät bleibt dabei unberührt.

Der Dateiwähler bietet diese Endungen an: json, jsonc, geojson, ndjson, jsonl, csv, tsv, txt, yaml, yml, toml, xml, xsd, wsdl, xsl, xslt, md, markdown, xlsx, html und htm. Über die Kodierung musst du nicht nachdenken: Strukturblick achtet auf eine Bytereihenfolge-Marke und bei XML auf die Angabe `encoding`, sonst liest es UTF-8. Ist eine Datei kein gültiges UTF-8, liest es sie als Windows-1252 und sagt das in einer Meldung. Dateien über 50 MB öffnen mit einem Hinweis, dass das Lesen dauern kann.

## Einlesen von Tabellendateien und HTML-Seiten

Strukturblick arbeitet auf Text. Tabellendateien (.xlsx) und HTML-Seiten (.html, .htm) werden deshalb beim Öffnen eingelesen und als JSON-Dokument abgelegt, mit demselben Namen und der Endung .json. Die Originaldatei bleibt, wie sie ist, und wird nicht mit abgelegt.

- Je Blatt der Tabellendatei (oder je Tabelle der HTML-Seite) entsteht eine Liste von Objekten, der Name des Blatts wird der Schlüssel.
- Die erste Zeile gibt die Feldnamen, wenn sie nur Texte enthält; sonst heißen die Felder A, B, C und so weiter. Leere Kopfzellen heißen nach ihrer Spalte, etwa "Spalte C", doppelte Namen bekommen eine Zahl ("Name 2").
- Leere Zellen werden `null`, ganz leere Zeilen fallen weg.
- In Tabellendateien behalten Zahlen, Wahrheitswerte und Datumsangaben ihren Typ, ein Datum steht dann etwa als `2026-11-03` da. Formeln liefern ihr zuletzt berechnetes Ergebnis.
- In HTML-Seiten sind alle Werte Text, und die Tabellen heißen nach ihrer Beschriftung oder der Überschrift davor.

Eine Meldung nennt beim Öffnen, wie viele Blätter oder Tabellen und Zeilen gelesen wurden, und was auffiel, etwa Formeln, Fehlerwerte oder verbundene Zellen. Mehr bei [XLSX](#xlsx).

## Gut zu wissen

- Schließen (Kreuz am Reiter oder ⌥ ⌘ W) legt ab und lässt das Dokument in der Ablage. Weg ist es erst im Papierkorb.
- Die Leiste zeigt die Dokumente der obersten Ebene und alle Ordner; ein Klick auf einen Ordner öffnet ihn in der Seite Ablage.
- Die [Beispiele zum Üben](#erste-schritte/beispiele-zum-ueben-oeffnen) liegen im Ordner Beispiele. Wer frisch anfangen will, legt sie in den Papierkorb und öffnet sie neu.
