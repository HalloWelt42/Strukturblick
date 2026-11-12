---
titel: Suche
unterzeile: Text und reguläre Ausdrücke in Schlüsseln und Werten finden
bereich: Pfade und Abfragen
symbol: fa-magnifying-glass
stichworte: suche, suchen, finden, volltext, volltextsuche, regex, regulärer ausdruck, regular expression, muster, groß und klein, case, treffer, im baum suchen, find, search, f3
reihenfolge: 50
quellen: [Reguläre Ausdrücke in JavaScript](https://developer.mozilla.org/de/docs/Web/JavaScript/Guide/Regular_expressions), [ECMAScript: RegExp](https://tc39.es/ecma262/#sec-regexp-regular-expression-objects)
---

Manchmal weißt du nicht, wo etwas steht, nur, wie es heißt. Dann hilft die **Suche**: Sie geht durch alle Schlüssel und alle einfachen Werte des Dokuments und meldet jede Stelle, die passt. Du brauchst dafür keine Abfragesprache, ein Wort genügt. Wer mehr will, schaltet **reguläre Ausdrücke** ein, eine kleine Mustersprache für Text, und findet damit etwa alle Postleitzahlen mit führender Null.

Strukturblick hat zwei Suchen für das Dokument: das Feld "Im Baum suchen" in der Ansicht [Baum](#baum) für den schnellen Blick und die Suche im Abfragefeld am Fuß des Arbeitsplatzes mit mehr Möglichkeiten. Diese öffnest du mit ⌥ ⌘ E (unter Windows und Linux Strg Alt E) und wählst den Reiter "Suche".

## Die Suche im Abfragefeld

Tipp einen Text ins Feld. Kurz nach dem letzten Tastendruck steht rechts jeder Treffer mit seinem Wert, und im Baum sind alle Treffer markiert. F3 und ⇧ F3 springen im Baum von einem zum nächsten, ein Klick auf den Ort eines Treffers wählt ihn.

Gesucht wird so:

- **Schlüssel und einfache Werte.** Passt ein Schlüssel, ist der ganze Wert darunter der Treffer. Die Suche nach `kunde` liefert so die 128 Kundenobjekte.
- **Werte, wie sie im Text stehen.** Zahlen, `true`, `false` und `null` werden mitgesucht: `6.9` findet die 51 Preise des Bergkäses, `null` die 103 leeren Notizen.
- **Teile genügen.** `klingeln` findet `"Bitte klingeln"`.
- **Groß und Klein egal**, solange der Schalter **Aa** aus ist. Auch Umlaute zählen dabei richtig: `bergkäse` findet `"Bergkäse 300 g"`.
- **Jedes Zeichen zählt**, auch ein Leerzeichen am Anfang oder Ende, das du ins Feld tippst.
- Gesucht wird im **offenen Dokument**. Über mehrere Dokumente geht [SQL](#sql).

Die Beispiele passen zu den Beispieldaten (Leiste, "Beispiele zum Üben"). Öffne bestellungen.json; "Ausprobieren" schreibt den Text ins Suchfeld.

```suche
Leipzig
```

Ergebnis: 33 Treffer, alle bei `kunde.stadt`.

```suche
klingeln
```

Ergebnis: 25 Treffer, jede Notiz `"Bitte klingeln"`.

```suche
2,5
```

Ergebnis: 49 Treffer, alle `"Kartoffeln 2,5 kg"`. Das Komma ist hier ein gewöhnliches Zeichen im Artikelnamen.

### Die zwei Schalter

| Schalter | Wirkung |
|---|---|
| `.*` | Liest den Text als regulären Ausdruck |
| `Aa` | Unterscheidet Groß- und Kleinschreibung |

Mit **Aa** findet `leipzig` in bestellungen.json nichts mehr, denn dort steht die Stadt immer groß geschrieben. "Ausprobieren" ändert die Schalter nicht; schalte sie für die Beispiele unten selbst ein.

### Treffer mitnehmen

Wie bei [jq](#jq), [JSONPath](#jsonpath) und [XPath](#xpath) legt "Als neues Dokument" (⌘ Enter) alle gefundenen Werte als Liste in die Ablage, "Als Tabelle" zeigt sie gleich als Tabelle, und das Menü daneben lädt sie als JSON, NDJSON oder CSV herunter. "In den Verlauf" merkt sich den Suchtext. Das Ergebnis zeigt die ersten 200 Treffer, gezählt werden alle.

## Reguläre Ausdrücke

Ein **regulärer Ausdruck** (englisch regular expression, kurz Regex) ist ein Muster, das beschreibt, wie ein passender Text aussieht. Strukturblick nimmt die Schreibweise von JavaScript, wie sie auch in vielen anderen Programmen gilt. Ein Treffer liegt vor, wenn das Muster **irgendwo** im Schlüssel oder Wert passt. Ohne **Aa** ist auch hier Groß und Klein egal.

Die wichtigsten Bausteine:

| Baustein | Bedeutung | Beispiel |
|---|---|---|
| `^` | Anfang des Texts | `^B-` beginnt mit B- |
| `$` | Ende des Texts | `kg$` endet mit kg |
| `.` | Ein beliebiges Zeichen | `B.rg` |
| `[0-9]` oder `\d` | Eine Ziffer | `\d\d` zwei Ziffern |
| `[abc]` | Eines der Zeichen in der Klammer | `[äöü]` ein Umlaut |
| `\s` | Ein Leerraum (Leerzeichen, Tabulator) | `\s$` Leerzeichen am Ende |
| `*`, `+`, `?` | Das Vorige beliebig oft, mindestens einmal, höchstens einmal | `\d+` |
| `{5}`, `{2,4}` | Das Vorige genau fünfmal, zwei- bis viermal | `\d{5}` |
| `a\|b` | Das eine oder das andere | `Marta\|Greta` |
| `( )` | Gruppe | `^(Marta\|Greta)\s` |
| `\.` | Ein echter Punkt (der Rückstrich nimmt dem Punkt die Sonderbedeutung) | `\d{2}\.\d{2}` |

Schalte **.\*** ein und probiere:

Bestellnummern von B-24020 bis B-24024. `^` und `$` sorgen dafür, dass der ganze Wert passen muss, nicht nur ein Teil:

```suche
^B-2402[0-4]$
```

Ergebnis: 5 Treffer, `"B-24020"` bis `"B-24024"`.

Postleitzahlen mit führender Null, also fünf Ziffern, deren erste eine 0 ist:

```suche
^0\d{4}$
```

Ergebnis: 73 Treffer, darunter `"06108"` (Halle) und `"04109"` (Leipzig). Solche Werte müssen Text bleiben, mehr dazu bei [Zahlen als Text](#zahlen-als-text).

Vornamen am Anfang, mit einem Leerraum dahinter, damit ein Name wie "Martina" nicht mitzählt:

```suche
^(Marta|Greta)\s
```

Ergebnis: 19 Treffer, zuerst `"Marta Demir"`.

Ein Schlüssel als Ganzes: `^menge$` findet alle 297 Werte unter dem Schlüssel `menge`, aber keinen Schlüssel, der "menge" nur enthält.

Mit kunden.csv lohnt sich die Regex-Suche besonders. Dort findet `^\d{2}\.\d{2}\.\d{4}$` die 405 Datumsangaben in deutscher Form wie `"01.01.2024"`, und `^leipzig$` (ohne Aa) die 101 Einträge, in denen der Ort genau Leipzig heißt, groß oder klein geschrieben. Die 41 mit Leerzeichen am Ende findest du mit `^Leipzig\s+$`.

Dieselben Muster gehen auch in [jq](#jq) mit `test("...")` und in [SQL](#sql) mit `REGEXP`.

### Fehler und Zeitgrenze

Ist das Muster kaputt, etwa eine offene Klammer `[`, steht unter dem Feld "Regulärer Ausdruck ungültig" mit dem Grund; das letzte gültige Ergebnis bleibt gedimmt stehen.

Manche Muster brauchen sehr lange, vor allem verschachtelte Wiederholungen wie `(a+)+$` auf langen Texten: Das Programm probiert dann unzählige Möglichkeiten durch. Eine Abfrage darf deshalb höchstens **10 Sekunden** rechnen. Danach bricht Strukturblick ab und meldet "Nach 10 s abgebrochen (Zeitgrenze)". Die nächste Suche läuft wieder normal. Abhilfe: Wiederholungen nicht ineinander schachteln und das Muster mit `^` oder `$` festmachen.

## Suche im Baum

Das Feld "Im Baum suchen" oben in der Ansicht Baum sucht ebenfalls in Schlüsseln und einfachen Werten, ohne Rücksicht auf Groß und Klein. Es kennt keine regulären Ausdrücke und keine Schalter, dafür markiert es das Gefundene im Text jeder Zeile.

- **Enter** springt zum nächsten Treffer, **⇧ Enter** zum vorigen, **Escape** leert das Feld.
- **Nur Treffer** blendet alles aus, was keinen Treffer enthält.
- Das Menü **Treffer** nimmt die Werte aller Treffer mit, als Datei oder neues Dokument.
- Leerzeichen am Anfang und Ende des Suchtexts zählen hier nicht.

Ist das Feld im Baum leer, zeigt der Baum die Treffer der Abfrage, mit dem Zeichen der Abfrage vor dem Zähler. Tippst du im Baum, gilt dessen eigene Suche. Mehr dazu bei [Baum](#baum/suche-im-baum).

## Weitere Suchfelder

- Im [Editor](#editor) sucht ⌘ F im Text, ⌥ ⌘ F öffnet Suchen und Ersetzen, dort auch mit regulärem Ausdruck.
- In der [Tabelle](#tabelle) filtert "Zeilen filtern" die Zeilen, in denen der Text in einer Zelle vorkommt.
- Die Befehlspalette (⌘ K) findet Befehle, Dokumente, Ordner und Ansichten, siehe [Befehlsfeld](#befehlsfeld).
- In der [Ablage](#ablage) sucht das Feld oben nach Dokumenten.

## Wann welche?

- **Suche**, wenn du ein Wort oder Muster kennst, aber nicht die Stelle.
- **[JSONPath](#jsonpath)** oder **[jq](#jq)**, bei XML auch **[XPath](#xpath)**, wenn du den Aufbau kennst und gezielt auswählen willst: `select(.kunde.stadt == "Leipzig")` findet nur Städte, die Suche nach Leipzig fände auch einen Kunden, der Leipziger heißt.
- **[SQL](#sql)**, wenn du über mehrere Dokumente zählen oder vergleichen willst.
