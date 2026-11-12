---
titel: Befehlsfeld
unterzeile: Befehle, Dokumente und Ansichten finden, indem du ein paar Buchstaben tippst
bereich: Arbeitsplatz
symbol: fa-magnifying-glass
stichworte: befehlsfeld, befehlspalette, palette, command palette, suchen, finden, befehl, schnellzugriff, cmd k, strg k, ctrl k, unscharf, fuzzy, zuletzt benutzt
reihenfolge: 40
quellen:
---

Das Befehlsfeld ist das Suchfeld oben rechts im Kopf, mit der Lupe und dem Hinweis "Befehl oder Dokument". Statt dich durch Leiste und Knöpfe zu klicken, tippst du ein paar Buchstaben dessen, was du willst, und Enter erledigt den Rest. Es findet Befehle, Dokumente und Ordner deiner Ablage und Ansichten. Wer einmal damit angefangen hat, will meist nicht mehr zurück.

## Öffnen und bedienen

- Ins Feld klicken oder ⌘ K drücken (unter Windows und Linux Strg K). Das Kürzel gilt überall, auch mitten im Editor.
- Gleich lostippen. Die Treffer erscheinen als Liste direkt unter dem Feld, ohne eigenes Fenster und ohne dass der Rest dunkel wird.
- ↑ und ↓ wählen einen Treffer, Bild auf und Bild ab springen acht weiter, Enter führt ihn aus. Mit der Maus genügt ein Klick.
- Escape schließt die Liste, und der Fokus geht dorthin zurück, wo er vorher war, etwa in den Editor oder den Baum. Ein Klick irgendwo daneben schließt ebenfalls, ⌘ K noch einmal auch.

Am Fuß der Liste steht, wie viele Treffer es gibt. Jeder Befehl zeigt rechts sein Tastenkürzel, falls er eins hat; so lernst du die [Tastatur](#tastatur) ganz nebenbei.

## Was es findet

Die Treffer stehen in Gruppen:

| Gruppe | Inhalt |
|---|---|
| Zuletzt benutzt | die zuletzt ausgeführten Einträge, höchstens fünf |
| Befehle | alles, was gerade geht: Öffnen, Ablegen, Herunterladen, Schließen, die Werkzeuge, die Abfrage in jeder Sprache, "Pfad als ... kopieren", Thema und Schrift, Lexikon, "Über Strukturblick" |
| Dokumente | alle Dokumente der Ablage, zuletzt geänderte zuerst, und die Ordner |
| Ansichten | die Ansichten, die zum offenen Dokument passen |

Je Gruppe zeigt die Liste höchstens acht Treffer. Ohne Eingabe stehen die Gruppen in dieser festen Folge; sobald du tippst, rückt die Gruppe mit dem besten Treffer nach oben.

Manches erreichst du hier am schnellsten, etwa "Über Strukturblick", das den Hinweis vom Start wieder zeigt, "Beispiele öffnen" oder "XML Schema ableiten" bei XML-Dokumenten.

Befehle, die gerade nicht gehen, fehlen in der Liste. "Pfad als jq kopieren" erscheint erst, wenn im Baum oder in der Tabelle etwas gewählt ist, "Abmelden" nur in der Bauart mit Server. Bei einem Dokument nennt die Beschreibung den Ordner, den Ort der Ablage und ob es gerade offen ist; ein Klick auf ein Dokument öffnet es, ein Klick auf einen Ordner zeigt ihn in der Seite [Ablage](#ablage).

## Unscharf suchen

Du musst nicht genau wissen, wie ein Befehl heißt. Die Suche ist unscharf:

- Groß und klein ist gleich.
- Jedes getippte Wort muss im Titel vorkommen, entweder am Stück oder als Folge einzelner Buchstaben in der richtigen Reihenfolge.
- Treffer am Stück und Treffer am Wortanfang zählen mehr, kurze Titel stehen bei gleicher Güte vor langen.
- Passt der Titel nicht, zählt auch die Beschreibung unter dem Titel, dort aber nur zusammenhängende Stücke und viel schwächer.

Die getroffenen Buchstaben sind in der Liste hervorgehoben, so siehst du, warum etwas gefunden wurde. Ein paar Beispiele, nachdem die Beispiele zum Üben offen sind und im Baum etwas gewählt ist:

| Du tippst | Ganz oben steht |
|---|---|
| `pjq` | Pfad als jq kopieren |
| `pfad jq` | Pfad als jq kopieren |
| `dh` | Dokument herunterladen |
| `dunkel` | Thema: Dunkel |
| `kunden` | kunden.csv, danach kundenimport.ndjson |
| `xsd` | lieferungen.xsd und hofladen-position.xsd |

Findet die Suche nichts, sagt sie es: "Nichts gefunden. Andere Schreibweise oder weniger Buchstaben versuchen."

## Zuletzt benutzt

Alles, was du über das Befehlsfeld ausführst, merkt es sich, die jüngsten zuerst. Bis zu fünf davon stehen oben in der Gruppe "Zuletzt benutzt", sofern sie zur Eingabe passen und gerade gehen. So holst du einen Befehl, den du oft brauchst, mit ⌘ K und Enter zurück.

Die Liste gilt für dieses Gerät und diesen Browser; sie liegt im Speicher des Browsers und geht an keinen Server. Lässt der Browser kein Speichern zu, etwa in manchen privaten Fenstern, gilt sie nur bis zum Neuladen.

## Gut zu wissen

- Ansichten wählst du hier über ihren Namen ("Tabelle", "Graph"); schneller geht es mit ⌥ ⌘ 1 bis 8 (Strg Alt 1 bis 8).
- Das Befehlsfeld sammelt seine Einträge beim Öffnen. Ändert sich währenddessen etwas, etwa ein neues Dokument, siehst du es beim nächsten Öffnen.
- Nicht jede Funktion steht im Befehlsfeld; was zu einer Ansicht oder einem Werkzeug gehört (Filter, Facetten, Optionen), findest du dort selbst.
