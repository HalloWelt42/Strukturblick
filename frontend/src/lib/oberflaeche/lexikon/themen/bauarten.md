---
titel: Mit und ohne Server
unterzeile: Zwei Bauarten aus demselben Code, und was das für deine Daten heißt
bereich: Arbeitsplatz
symbol: fa-server
stichworte: bauart, server, ohne server, pi5b, heimnetz, browser, anmeldung, anmelden, abmelden, konto, koppeln, code, datenschutz, daten, speicher, indexeddb, offline, fassung, version, update, neu laden, aktualisieren, tab, github pages
reihenfolge: 50
quellen:
---

Strukturblick gibt es in zwei Bauarten, die aus demselben Code entstehen und gleich aussehen. Der Unterschied liegt darin, wo deine Dokumente liegen: **mit Server** in deiner Ablage auf pi5b im Heimnetz, **ohne Server** nur im Browser des Geräts, an dem du sitzt. Gerechnet wird in beiden Fällen in deinem Browser, ob du liest, abfragst, prüfst oder umbaust.

## Woran du erkennst, welche du benutzt

- Oben in der Leiste steht der Ort der Ablage: "Ablage auf pi5b" mit Server, "Dieser Browser" ohne.
- Mit Server meldest du dich beim ersten Besuch an; ohne Server geht es sofort los.
- Der Hinweis beim Start sagt unter "Deine Daten", was mit deinen Dokumenten geschieht.

## Mit Server auf pi5b

Diese Bauart läuft im Heimnetz auf dem Rechner pi5b und gehört zu deinem Konto der Kellerwolke.

- **Anmelden**: mit Name oder Kürzel und Passwort deines Kellerwolke-Kontos. Alternativ "Mit Code koppeln": Den Code zeigt die Kellerwolke unter Einstellungen, Geräte; danach bleibt dieses Gerät angemeldet, bis du es dort trennst.
- **Deine Dokumente** liegen samt Verlauf, Ordnern, Papierkorb und Rezepten in der Ablage auf pi5b, getrennt je Konto. Auf allen deinen Geräten siehst du denselben Stand, auch welche Dokumente offen waren.
- **Abmelden** geht über das Zahnrad oben rechts (Karte Konto) oder "Abmelden" im [Befehlsfeld](#befehlsfeld). Vorher wird alles abgelegt.
- **Grenze**: Ein einzelnes Dokument darf bis zu 100 MB groß sein.

Antwortet der Server gerade nicht, zeigt Strukturblick das an und geht von selbst weiter, sobald er wieder da ist; "Erneut versuchen" stößt es sofort an. Beim allerersten Start auf einem neuen Server fragt die App einmal nach der Adresse der Kellerwolke und dem App-Schlüssel. Das erledigt, wer den Server einrichtet.

## Ohne Server im Browser

Diese Bauart liegt als öffentliche Seite auf GitHub Pages unter `https://hallowelt42.github.io/Strukturblick/`. Sie braucht keine Anmeldung.

- **Deine Dokumente** liegen im Speicher dieses Browsers (IndexedDB) auf diesem Gerät, zusammen mit Verlauf, Ordnern, Papierkorb und Rezepten. Zum Server der Seite geht nichts davon, der liefert nur die App selbst aus.
- **Anderer Browser, anderes Gerät**: Dort ist die Ablage leer. Ein Link auf ein Dokument findet es dort nicht (mehr bei [Adressen](#adressen)).
- **Browserdaten löschen** löscht auch deine Dokumente. Sichere deshalb regelmäßig mit "Alles sichern" in der [Ablage](#ablage/alles-sichern-und-einspielen) oder lade einzelne Dokumente herunter.
- **Privates Fenster**: Manche Browser erlauben dort kein Speichern. Strukturblick startet dann trotzdem, warnt mit einer Meldung und hält die Dokumente nur, solange das Fenster offen ist; die Leiste zeigt als Ort "Nur in diesem Fenster".
- **Mehrere Tabs**: Ist Strukturblick in einem anderen Tab mit einer älteren Fassung offen, wartet der Start und sagt das; schließe oder lade jenen Tab neu, dann geht es von selbst weiter. Ein Tab, der einer neueren Fassung im Weg steht, legt alles ab und lädt selbst neu.

## Was das für deine Daten heißt

| | Mit Server | Ohne Server |
|---|---|---|
| Wo liegen die Dokumente? | in deiner Ablage auf pi5b | im Speicher dieses Browsers |
| Auf anderen Geräten? | ja, nach dem Anmelden | nein |
| Wer rechnet? | dein Browser | dein Browser |
| Geht etwas an fremde Server? | nein | nein |
| Wie sichern? | der Server sichert seine Datenbank; zusätzlich "Alles sichern" | nur selbst: "Alles sichern" oder Herunterladen |

Thema und Schriftgröße (Zahnrad oben rechts) und die zuletzt benutzten Einträge im Befehlsfeld gelten in beiden Bauarten nur für das Gerät, an dem du sie einstellst.

Eine Sicherung aus "Alles sichern" passt in beide Bauarten. So ziehst du mit allem vom Browser auf den Server um oder umgekehrt: sichern, in der anderen Bauart "Einspielen", fertig.

## Neue Fassung: erst fragen, dann laden

Rechts im Fuß steht die Fassung von Strukturblick, die du gerade benutzt. Ohne Server prüft die Seite beim Start, wenn du das Fenster wieder nach vorn holst, und alle fünf Minuten; mit Server meldet der Server die neue Fassung.

- **Gleich nach dem Start** (in den ersten zehn Sekunden, wenn alles abgelegt ist) lädt die Seite die neue Fassung von selbst; da hast du noch nichts getan, was verloren gehen könnte. Je Fassung versucht sie das nur einmal, damit ein Zwischenspeicher, der noch die alte Seite liefert, keine Endlosschleife auslöst.
- **Danach nie von selbst.** Unten rechts erscheint ein Band "Neue Fassung ... ist da" mit **Jetzt neu laden** und **Später**. Neu laden legt vorher alles ab; laufende Vorgänge wie ein Erzeugen oder eine Frage an die KI enden dabei, darum entscheidest du den Zeitpunkt.
- **Später** blendet das Band für diese Fassung aus. Der Fuß zeigt dann "2.34.1 → 2.35.0"; ein Klick darauf lädt neu, wann es dir passt.

Angeboten wird nur eine wirklich neuere Fassung. Meldet der Server eine ältere, etwa beim Entwickeln, bleibt alles, wie es ist. Nach dem Neuladen bist du dank [Adresse](#adressen) wieder beim selben Dokument, in derselben Ansicht und an derselben Stelle, und der Verlauf ist auch noch da.
