---
titel: Zahlen als Text
unterzeile: Postleitzahlen, Beträge mit Komma und große Kennungen, und warum Strukturblick sie nicht umwandelt
bereich: Formate
symbol: fa-hashtag
stichworte: zahl, text, führende null, postleitzahl, plz, kundennummer, nummer, betrag, komma, dezimalkomma, tausenderpunkt, 2^53, große zahl, kennung, id, genauigkeit, rundung, gleitkomma, ieee 754, typ, umwandeln
reihenfolge: 90
quellen: [RFC 8259, Abschnitt 6: Zahlen](https://www.rfc-editor.org/rfc/rfc8259#section-6), [YAML 1.2.2](https://yaml.org/spec/1.2.2/)
---

Viele Werte bestehen aus Ziffern und sind trotzdem keine Zahlen: Postleitzahlen, Kundennummern, Telefonnummern, Artikelnummern. Andere sind Zahlen, stehen aber so da, dass ein Programm sie nicht als Zahl lesen kann, etwa Beträge mit Komma. Wer solche Werte achtlos umwandelt, verliert führende Nullen, rechnet mit Text oder rundet lange Kennungen. Strukturblick lässt deshalb jeden Wert so stehen, wie er im Text steht, zeigt dir, wonach er aussieht, und wandelt nur um, wenn du es willst.

## Faustregel

Eine Zahl ist ein Wert, mit dem du rechnest: Menge, Preis, Anzahl. Ein Wert, den du nur vergleichst, sortierst oder nachschlägst, ist eine Nummer und gehört als Text gespeichert, auch wenn er nur aus Ziffern besteht. Niemand addiert Postleitzahlen. In JSON heißt das: `"plz": "06108"` mit Anführungszeichen, `"menge": 2` ohne.

## Führende Null

In bestellungen.json stehen die Postleitzahlen richtig als Text, etwa `"06108"` für Halle. Strukturblick zeigt, dass hier Vorsicht gilt:

- Im [Baum](#baum) trägt jeder solche Wert das Abzeichen "Text, sieht aus wie Zahl", mit der Erklärung "Steht als Text, führende Null bleibt erhalten".
- Die [Statistik](#statistik) (⌥ ⌘ 4, unter Windows und Linux Strg Alt 4) nennt unter Muster "sieht aus wie Zahl" mit dem Satz "kunde.plz: nur Ziffern, 73 mit führender Null. Bleibt Text."
- Die [Ansicht Struktur](#struktur) nennt den Typ "Text, nur Ziffern"; als JSON Schema wird daraus ein Text mit dem Muster `^[0-9]+$`.

Mit bestellungen.json offen, die Postleitzahlen mit führender Null:

```jq
[.bestellungen[].kunde.plz | select(startswith("0"))] | length
```

Ergebnis: `73`.

In kunden.csv sind es 313 Postleitzahlen. Das Werkzeug [Bereinigen](#bereinigen/typen) zeigt unter Typen für `plz` "Text, sieht aus wie Zahl" mit dem Stand "Hinweis" und warnt: "Als Zahl verlören 313 Werte ihre führende Null, aus 04109 würde 4109." Einen Knopf zum Umwandeln gibt es hier absichtlich nicht.

Wo die Null trotzdem verloren gehen kann:

- **JSON**: `"plz": 03046` ohne Anführungszeichen ist ungültig ("Ungültige Zahl: führende Null"). Die [Reparatur](#reparieren) setzt daraus den Text `"03046"`, die Ziffern bleiben.
- **YAML**: `plz: 04109` ohne Anführungszeichen ist nach YAML 1.2 die Zahl 4109. Der Baum zeigt noch `04109`, Abfragen und Konvertieren rechnen mit 4109. Schreib Nummern in YAML in Anführungszeichen, siehe [YAML](#yaml).
- **CSV und andere Programme**: Konvertieren nach CSV warnt in der Verlustkarte, bei bestellungen.json etwa "Die Nummer 06108 in kunde.plz bleibt nur richtig, wenn das lesende Programm die Spalte als Text nimmt." In [SQL](#sql) bleibt eine CSV-Spalte mit führenden Nullen Text; als Zahl gelten dort nur Spalten, in denen jeder Wert eindeutig eine Zahl ist.

## Beträge mit Komma

In kunden.csv steht der Umsatz in deutscher Schreibweise: `3.309,23`, Punkt für die Tausender, Komma vor den Cent. Für Programme ist das keine Zahl. Die [Tabelle](#tabelle) zeigt im Spaltenkopf "Text, sieht aus wie Betrag" und sortiert die Spalte trotzdem nach dem Wert. SQL dagegen vergleicht Texte Zeichen für Zeichen:

```sql
SELECT umsatz FROM kunden ORDER BY umsatz DESC LIMIT 1
```

Ergebnis: `996,28`. Der größte Umsatz ist `9.793,86`. Als Text verglichen steht nach der ersten `9` einmal eine `9` und einmal ein Punkt, und die Ziffer gilt als größer.

Abhilfe schafft [Bereinigen](#bereinigen/typen) unter Typen: Für `umsatz` erkennt es "Betrag, deutsches Format" und schlägt vor, alle 1.214 Werte umzuschreiben, `1.234,50` wird `1234.50`. Die Vorschau zeigt Vorher und Nachher, "Umwandeln" ist ein einziger Vorgang im Verlauf. Werte, die sich nicht lesen lassen, stehen getrennt da, mit Grund wie "Buchstabe O statt Null?" oder "Wort hinter der Zahl"; du wählst "Unverändert lassen" oder "Leer setzen". Nach dem Umwandeln steht in kunden.csv `3309.23`, und SQL nimmt die Spalte als Zahl: Absteigend sortiert kommt `9793.86` zuerst.

## Große Kennungen über 2^53

Die meisten Programme, auch Browser, speichern Zahlen als Gleitkommazahl mit 64 Bit (IEEE 754). Ganze Zahlen sind darin nur bis 2^53 = 9.007.199.254.740.992 sicher genau. Größere Kennungen, wie sie manche Datenbanken und Dienste vergeben, werden beim Einlesen still gerundet:

```json
{ "id": 12345678901234567890, "k": 9007199254740993 }
```

So geht Strukturblick damit um:

| Wo | Was du siehst |
|---|---|
| Baum, Editor, Tabelle | die Ziffern genau so, wie sie im Text stehen |
| Ändern anderer Werte | die lange Zahl bleibt Ziffer für Ziffer im Text |
| jq bei reinem JSON und JSON Lines | `.id` gibt `12345678901234567890` genau aus; wer damit rechnet, etwa `.k + 0`, bekommt `9007199254740992` |
| JSONPath, SQL, Statistik, Validieren, Konvertieren | gerundete Werte: `12345678901234567000` und `9007199254740992` |

Bei JSON mit Kommentaren, bei YAML, TOML und den übrigen Formaten bekommt auch jq den gerundeten Wert. Die Statistik nennt eine solche Spalte "Zahl" statt "Zahl, ganz". Sicher ist nur eins: Kennungen als Text speichern, `"id": "12345678901234567890"`.

## Warum Strukturblick nicht von selbst umwandelt

Ob `04109` eine Nummer und `1.234` ein Tausender oder eine Dezimalzahl ist, weiß nur, wer die Daten kennt. Strukturblick zeigt deshalb Abzeichen und Muster als Vorschlag und behält den Rohtext. Umgewandelt wird nur in Bereinigen auf Knopfdruck, nachvollziehbar im Verlauf und mit Rückgängig. Formate ohne eigene Typen wie [CSV](#csv), [XML](#xml) und [Markdown](#markdown) liefern ohnehin nur Text.

## Passt dazu

- [Bereinigen](#bereinigen) für Typen, Facetten und Schreibweisen
- [Statistik](#statistik) für Muster und Spannen je Feld
- [Datum und Zeit](#datum-und-zeit), die zweite große Falle
- [JSON Schema](#json-schema), um Text oder Zahl verbindlich festzulegen
