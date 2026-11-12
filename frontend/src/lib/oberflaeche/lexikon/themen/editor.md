---
titel: Editor
unterzeile: Der Text des Dokuments mit Farben, Faltung und Diagnosen
bereich: Ansichten
symbol: fa-code
stichworte: editor, text, quelltext, code, bearbeiten, tippen, formatieren, kompakt, einrücken, pretty print, minify, schlüssel sortieren, sort keys, suchen, ersetzen, find, replace, diagnose, fehler, warnung, hinweis, hervorhebung, syntax highlighting, faltung, folding, format wählen, codemirror
reihenfolge: 20
quellen:
---

Der Editor zeigt dein Dokument als Text, genau so, wie es in der Datei steht. Hier tippst du frei, siehst Fehler an der Stelle, an der sie stecken, und räumst die Schreibweise auf. Alle anderen Ansichten arbeiten auf demselben Text: Was du im Editor änderst, steht sofort im [Baum](#baum) und in der [Tabelle](#tabelle), und umgekehrt. Du öffnest ihn über den Reiter [Editor](#ansicht:editor) oder mit ⌥ ⌘ 2 (unter Windows und Linux Strg Alt 2).

## Was du siehst

- **Werkzeugzeile** oben: die Formatwahl, bei JSON und NDJSON die Knöpfe Formatieren, Kompakt und Schlüssel sortieren, rechts das Suchfeld.
- **Rinne** links: ein Zeichen für die schwerste Diagnose der Zeile, die Zeilennummern und die Pfeile zum Falten.
- **Textfeld** in der Mitte, mit farbiger Hervorhebung und markierter Cursorzeile.
- **Diagnose** unten: die Zahl der Fehler, Warnungen und Hinweise, die Stelle des Cursors ("Zeile 12, Spalte 5") und die Liste der Befunde.

## Tippen und Rückgängig

Du tippst wie in jedem Texteditor. Strukturblick fasst Tippen in einem Zug zu einem Schritt im Verlauf zusammen; nach einer Pause von einer Sekunde, nach einem Sprung des Cursors und bei Einfügen, Ausschneiden oder Ablegen beginnt ein neuer Schritt. ⌘ Z nimmt einen Schritt zurück, ⇧ ⌘ Z oder ⌘ Y holt ihn wieder. Der Verlauf gehört zum Dokument und gilt in allen Ansichten. Einen Wert, den du eben in der Tabelle geändert hast, nimmst du also auch hier mit ⌘ Z zurück.

Weitere Hilfen beim Schreiben:

- **Tab** rückt ein, **⇧ Tab** rückt aus.
- Zu einer Klammer wird die passende hervorgehoben, eine Klammer ohne Partner rot.
- Markierst du ein Wort, sind alle gleichen Stellen leicht hinterlegt. **⌘ D** nimmt die nächste gleiche Stelle in die Auswahl, du tippst dann an allen zugleich.
- Mit gedrückter ⌥ Taste ziehen markiert ein Rechteck über mehrere Zeilen.
- Unsichtbare Steuerzeichen (etwa ein verirrtes Zeichen ohne Breite) erscheinen rot, damit du sie findest.

## Wählen und Springen

Der Editor und die anderen Ansichten wissen voneinander. Setzt du den Cursor in einen Wert, wählt Strukturblick diesen Knoten: Der Inspektor rechts zeigt ihn mit Pfad und allen Werten dieses Pfads (siehe [Baum](#baum/der-inspektor-rechts)). Wählst du umgekehrt im Baum oder in der Tabelle etwas und wechselst in den Editor, steht der Cursor genau dort und die Zeile ist in die Mitte gerollt.

## Format und Hervorhebung

Der Knopf ganz links nennt das Format, in dem Strukturblick den Text liest. Vorgewählt ist **Erkennen**: Strukturblick schaut auf den Inhalt und die Dateiendung und nennt das Ergebnis daneben. Liest es einmal falsch, wählst du das Format von Hand: JSON, NDJSON, CSV, YAML, TOML, XML oder Markdown. Die Wahl wird mit dem Dokument gespeichert.

Die Farben folgen dem Format: Schlüssel, Texte, Zahlen, Wahrheitswerte, null, Klammern und Kommentare haben je eine eigene Farbe, dieselben wie im Baum. Hervorgehoben werden JSON und NDJSON, YAML, TOML, XML und Markdown. CSV bleibt einfarbig, dort hilft die [Tabelle](#tabelle) beim Lesen.

## Formatieren, Kompakt, Schlüssel sortieren

Diese drei Knöpfe gibt es bei JSON und NDJSON:

| Knopf | Wirkung |
|---|---|
| Formatieren | Einrückung und Abstände vereinheitlichen, ein Wert je Zeile |
| Kompakt | Ohne Einrückung und Leerzeilen schreiben |
| Schlüssel sortieren | Die Schlüssel jedes Objekts alphabetisch ordnen, auf allen Ebenen |

Formatieren und Kompakt ändern nur Leerraum, nie einen Wert. Bei NDJSON (ein Datensatz je Zeile, siehe [NDJSON](#ndjson)) bleibt jeder Datensatz in seiner Zeile; kaputte Zeilen bleiben unverändert stehen. Jeder Knopf ist ein Schritt im Verlauf und lässt sich zurücknehmen. Ist das Dokument nicht lesbar, sind die Knöpfe gesperrt; der Hinweis beim Darüberfahren sagt warum. Gibt es nichts zu ändern, meldet Strukturblick "Nichts zu ändern".

Ein kleiner Eindruck mit bestellungen.json: Kompakt schreibt die 3.155 Zeilen der Datei in eine einzige Zeile mit 34.608 Zeichen. Formatieren holt die Einrückung zurück, zwei Leerzeichen je Ebene.

## Diagnosen

Beim Lesen prüft Strukturblick den Text und meldet, was ihm auffällt, in drei Stufen:

- **Fehler**: Der Text verletzt die Regeln des Formats, etwa ein fehlendes Komma. Rot gewellt unterstrichen, die Zeilennummer rot hinterlegt.
- **Warnung**: Der Text ist lesbar, vermutlich ist er so jedoch nicht gemeint. In der Warnfarbe gewellt.
- **Hinweis**: zur Kenntnis, gepunktet unterstrichen.

Fährst du mit der Maus über die Unterstreichung oder das Zeichen in der Rinne, steht die Meldung da. Unter dem Editor stehen alle Befunde als Liste; ein Klick auf Meldung oder Stelle setzt den Cursor dorthin. Die Liste zeigt die ersten 200, die Zahlen im Kopf zählen alle. "Keine Befunde" heißt, alles ist in Ordnung; "liest" heißt, nach einer Änderung wird gerade neu gelesen.

Zum Üben:

- **kundenimport.ndjson** hat 4 Fehler, in den Zeilen 2, 7, 12 und 16, etwa "Ungültige Zahl: führende Null". Das Werkzeug [Reparieren](#reparieren) richtet sie nach festen Regeln.
- **dienste.yaml** hat 4 Hinweise. Sie erklären, dass ein Verweis wie `*standard` den Inhalt von `&standard` wiederholt; mehr dazu bei [YAML](#yaml).
- **bestellungen.json** und **kunden.csv** sind fehlerfrei.

Die Diagnosen kommen aus dem Lesen des Formats. Ob die Daten zu einem Schema passen, prüft das Werkzeug [Validieren](#validieren).

## Suchen und Ersetzen

Das Suchfeld rechts in der Werkzeugzeile sucht wörtlich, ohne Rücksicht auf Groß- und Kleinschreibung. Alle Treffer im sichtbaren Bereich sind hinterlegt.

| Taste | Wirkung |
|---|---|
| ⌘ F | Ins Suchfeld; ein markiertes Wort steht gleich darin |
| Enter, ⇧ Enter | Nächster, voriger Treffer (im Suchfeld) |
| F3, ⇧ F3 | Nächster, voriger Treffer (im Text) |
| Escape | Zurück in den Text |
| ⌘ ⌥ F | Leiste Suchen und Ersetzen über dem Text |
| ⌘ ⌥ G | Gehe zu Zeile |

Die Leiste Suchen und Ersetzen kann mehr: "Groß/klein beachten", "Regulärer Ausdruck", "Ganze Wörter", "ersetzen" und "alle ersetzen". Jedes Ersetzen ist ein Schritt im Verlauf.

## Falten

Der Pfeil in der Rinne neben einer öffnenden Klammer klappt den Bereich zu. Statt des Inhalts steht dann "12 Zeilen"; ein Klick darauf klappt wieder auf. Mit der Tastatur: ⌘ ⌥ [ faltet, ⌘ ⌥ ] entfaltet die Stelle am Cursor (unter Windows und Linux Strg ⇧ [ und Strg ⇧ ]).

## Tastenkürzel im Überblick

| Kürzel | Wirkung |
|---|---|
| ⌥ ⌘ 2 | Ansicht Editor |
| ⌘ Z, ⇧ ⌘ Z oder ⌘ Y | Rückgängig, Wiederholen |
| ⌘ F, ⌘ ⌥ F | Suchen, Suchen und Ersetzen |
| ⌘ D | Nächste gleiche Stelle dazu wählen |
| ⌘ K | Befehlsfeld, auch aus dem Editor heraus |

Unter Windows und Linux steht Strg für ⌘ und Alt für ⌥. Alle Kürzel der App stehen bei [Tastatur](#tastatur).

## Grenzen

- Formatieren, Kompakt und Schlüssel sortieren gibt es nur für JSON und NDJSON. YAML, TOML, XML, CSV und Markdown bleiben so geschrieben, wie du sie schreibst.
- Vorschläge beim Tippen (Schlüssel, Funktionen) bietet das Abfragefeld unten, im Editor schreibst du frei.
- Das Rechtsklickmenü im Editor ist das des Browsers, mit Kopieren und Einfügen.

## Passt dazu

- [Reparieren](#reparieren) für kaputtes JSON und NDJSON
- [Validieren](#validieren) für die Prüfung gegen ein Schema
- [Konvertieren](#konvertieren), um das Dokument in ein anderes Format umzuschreiben
- [JSON](#json), [YAML](#yaml), [TOML](#toml), [XML](#xml) für die Regeln der einzelnen Formate
