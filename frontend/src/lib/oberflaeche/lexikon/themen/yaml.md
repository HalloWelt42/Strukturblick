---
titel: YAML
unterzeile: Einrückung statt Klammern, Typen aus der Schreibweise, Anker und Alias
bereich: Formate
symbol: fa-file-lines
stichworte: yaml, yml, einrückung, indent, liste, aufzählung, anker, anchor, alias, merge, <<, mehrere dokumente, ---, kommentar, core schema, yaml 1.2, yaml 1.1, block, typen, tabulator
reihenfolge: 40
quellen: [YAML Ain't Markup Language, Version 1.2.2](https://yaml.org/spec/1.2.2/)
---

YAML ist ein Format für Menschen: Statt Klammern und Kommas trägt die Einrückung den Aufbau, Kommentare beginnen mit `#`. Deshalb steht YAML oft in Einstellungsdateien von Diensten und Abläufen. Die Daten dahinter sind dieselben wie in [JSON](#json): Objekte, Listen, Texte, Zahlen, Wahrheitswerte und null. Strukturblick liest YAML nach Version 1.2 (Core-Schema), merkt sich jede Stelle im Text und ändert beim Bearbeiten nur den einen Wert; Kommentare, Anker und Einrückung bleiben.

## Einrückung und Listen

Der Anfang von dienste.yaml (Beispiele zum Üben):

```yaml
# Dienste des Webshops vom Hofladen Lindenhof, gelesen von der Überwachung
version: 3
standard: &standard
  neustart: immer
  gesundheit: &gesundheit
    pfad: /gesund
    intervall: 30s
    versuche: 3

dienste:
  - name: katalog
    <<: *standard
    port: 8080
```

- `schlüssel: wert` ist ein Feld eines Objekts; nach dem Doppelpunkt steht ein Leerzeichen.
- Was tiefer eingerückt ist, gehört dazu: `neustart` und `gesundheit` liegen in `standard`.
- `- ` beginnt einen Listeneintrag; `dienste` ist eine Liste von drei Objekten.
- Eingerückt wird nur mit Leerzeichen. Ein Tabulator ergibt den Fehler "Tabulatoren sind als Einrückung nicht erlaubt".
- Kurzformen wie in JSON gehen auch: `[8080, 8081]` und `{pfad: /gesund}`.
- Längere Texte schreibt man als Block: Nach `|` bleiben die Zeilenumbrüche erhalten, nach `>` werden die Zeilen zu einer Zeile zusammengefaltet.

Mit dienste.yaml offen, alle Ports:

```jq
[.dienste[].port]
```

Ergebnis: `[8080,8081,8082]`. Abgeschaltete Dienste:

```jq
[.dienste[] | select(.aktiv == false) | .name]
```

Ergebnis: `["versand"]`.

## Typen aus der Schreibweise

YAML kennt keine Anführungszeichen-Pflicht. Ob ein Wert Zahl, Wahrheitswert oder Text ist, folgt aus der Schreibweise, und genau da lauern Fallen. So liest Strukturblick nach YAML 1.2:

| Geschrieben | Gelesen als |
|---|---|
| `3`, `+12`, `1e3` | Zahl |
| `0x1F`, `0o17` | Zahl zur Basis 16 und 8 (31 und 15) |
| `010`, `04109` | Zahl 10 und 4109, die führende Null geht verloren |
| `true`, `True`, `false` | Wahrheitswert |
| `yes`, `no`, `on`, `off` | Text |
| `null`, `~` oder gar nichts nach dem Doppelpunkt | null |
| `2026-11-10` | Text |
| `30s`, `08:00`, `1_000` | Text |
| `"04109"`, `'08:00'` | Text, immer |

Faustregel: Alles, was Text bleiben soll und nach Zahl aussieht, gehört in Anführungszeichen, vor allem Postleitzahlen und Kennungen (mehr bei [Zahlen als Text](#zahlen-als-text)). Ältere Programme lesen nach YAML 1.1 und verstehen `yes` und `on` als Wahrheitswert und `010` als Oktalzahl 8. Darum schreibt [Konvertieren](#konvertieren) nach den Regeln von 1.1: Texte wie `yes`, `on` oder `2026-11-01` stehen dort in Anführungszeichen und bleiben in jedem Leser Text.

## Anker und Alias

Mit `&name` gibst du einem Wert einen Namen (Anker), mit `*name` wiederholst du ihn an anderer Stelle (Alias). In dienste.yaml trägt `standard` den Anker `&standard`, `gesundheit` darin den Anker `&gesundheit`; der Dienst katalog verweist mit `*gesundheit` darauf.

So zeigt Strukturblick Aliase:

- **Alias auf einen einfachen Wert** übernimmt den Wert. Der Hinweis lautet etwa "*x übernimmt den Wert von &x (Zeile 1)".
- **Alias auf ein Objekt oder eine Liste** erscheint im Baum als Verweis auf die Zeile des Ankers. Die Einträge stehen nur dort. Der Hinweis lautet "*gesundheit wiederholt den Inhalt von &gesundheit (Zeile 6); die Einträge stehen dort".

Für Abfragen und beim Konvertieren steht an der Stelle eines solchen Verweises ein leeres Objekt. Frag deshalb die Stelle des Ankers ab:

```jq
.standard.gesundheit.intervall
```

Ergebnis: `"30s"`. Die Abfrage `.dienste[0].gesundheit` ergibt dagegen `{}`.

`<<: *standard` ist in vielen Programmen ein Zusammenführen: Die Felder von `standard` sollen in jeden Dienst wandern. YAML 1.2 kennt diese Regel nicht mehr; für Strukturblick ist `<<` ein gewöhnlicher Schlüssel mit einem Verweis darunter. `neustart` steht also nur unter `standard`, und `.dienste[0].neustart` ergibt `null`.

## Mehrere Dokumente

Eine YAML-Datei darf mehrere Dokumente enthalten, getrennt durch eine Zeile `---`. Strukturblick liest sie als Liste: Die Wurzel ist die Liste der Dokumente, das erste ist der Eintrag `[0]`. Ein Hinweis sagt das, etwa "Der Text enthält 2 Dokumente; die Wurzel ist die Liste der Dokumente". In jq greifst du mit `.[1]` auf das zweite Dokument zu.

## Meldungen

Strukturblick übersetzt die Meldungen ins Deutsche. Häufig sind:

| Meldung | Art |
|---|---|
| Falsche Einrückung | Fehler |
| Tabulatoren sind als Einrückung nicht erlaubt | Fehler |
| Hier fehlt ein Zeichen, etwa ein schließendes Anführungszeichen oder eine Klammer | Fehler |
| Der Anker &nix ist nicht definiert | Fehler |
| Der Schlüssel "a" kommt mehrfach vor | Warnung |
| Unbekannte Typangabe; der Wert wird als Text gelesen | Warnung |

YAML-Dateien über einigen MB brauchen Sekunden zum Lesen; die Oberfläche bleibt bedienbar, der Fuß zeigt "liest".

## Schreiben und Konvertieren

Änderst du einen Wert in Baum oder Tabelle, ersetzt Strukturblick nur diesen Wert im Text. Ein neuer Text, der sonst als Zahl, Wahrheitswert oder Datum gelesen würde, kommt dabei in Anführungszeichen. Kommentare und Anker bleiben stehen. Einen Alias (`*name`) und einen Block-Text (`|` oder `>`) änderst du im [Editor](#editor); Baum und Tabelle sagen dir das mit einer Meldung. Beim [Konvertieren](#konvertieren) nach YAML gehen Kommentare der Quelle nicht mit; die Verlustkarte sagt das vorher.

## Passt dazu

- [JSON](#json) für die Grundbausteine
- [TOML](#toml), ein weiteres Format für Einstellungsdateien
- [Baum](#baum) und [Editor](#editor), um Anker und Verweise zu sehen
- [jq](#jq) für Abfragen auf YAML
