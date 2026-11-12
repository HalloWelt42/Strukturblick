---
titel: Adressen und Links
unterzeile: Die Adresszeile sagt immer, wo du gerade bist
bereich: Arbeitsplatz
symbol: fa-link
stichworte: adresse, adresszeile, url, link, deeplink, lesezeichen, bookmark, favorit, teilen, neu laden, reload, zurück, vor, back, forward, kennung, verlauf des browsers
reihenfolge: 20
quellen:
---

Die Adresszeile deines Browsers zeigt bei Strukturblick immer genau, wo du bist: welches Dokument, welche Ansicht oder welches Werkzeug, welche Einstellungen davon und welche Stelle gewählt ist. Solche Adressen nennt man Deeplinks, Links tief hinein in eine Anwendung. Darum führen Neuladen, Zurück und Vor und ein Lesezeichen wieder genau dorthin, und du kannst dir eine Stelle einfach merken.

## So ist eine Adresse gebaut

Ein Beispiel, die Tabelle von bestellungen.json mit aufgeklappter Spalte kunde und gewähltem Namen in der zweiten Bestellung:

```text
/dokument/3f9c2a71/bestellungen-json/tabelle?auf=kunde&stelle=/bestellungen/1/kunde/name
```

| Teil | Bedeutung |
|---|---|
| `dokument` | eine Seite mit einem Dokument |
| `3f9c2a71` | die kurze [Kennung](#adressen/kennung-und-name) des Dokuments |
| `bestellungen-json` | der Name, nur zum Lesen |
| `tabelle` | die Ansicht oder das Werkzeug |
| `auf=kunde` | eine Einstellung, die von der Vorgabe abweicht |
| `stelle=/bestellungen/1/kunde/name` | die gewählte Stelle als [JSON Pointer](#json-pointer) |

Dazu gibt es zwei kurze Adressen: `/ablage` öffnet die Seite [Ablage](#ablage), und `/` allein führt zum zuletzt offenen Stand. Dort ersetzt Strukturblick die Adresse gleich durch die des aktiven Dokuments.

In der Bauart ohne Server steht ganz vorn noch der Pfad der Seite, also `/Strukturblick/dokument/...` statt `/dokument/...`. Mehr bei [Bauarten](#bauarten).

## Was in die Adresse kommt

Nach dem Fragezeichen stehen nur Einstellungen, die von der Vorgabe abweichen. Eine Ansicht mit lauter Vorgaben hat deshalb eine kurze Adresse. Welche Einstellungen eine Ansicht oder ein Werkzeug mitgibt, entscheidet sie selbst:

| Ansicht oder Werkzeug | Angaben |
|---|---|
| [Tabelle](#tabelle) | `liste` (gezeigte Liste als Zeiger), `auf` (aufgeklappte Spalten, mit Komma getrennt) |
| [Statistik](#statistik) | `liste`, `feld` (gewähltes Feld) |
| [Struktur](#struktur) | `typ` (gewählter Typ) |
| [Graph](#graph) | `fokus` (Zeiger), `tiefe` (1 bis 3, Vorgabe 2) |
| [Vergleich](#vergleich) | `mit` (Gegenseite aus der Ablage, als kurze Kennung) |
| [Schema](#schema-ansicht) | `reiter` (`baum`, `typen` oder `statistik`) |
| [Validieren](#validieren) | `schema` (Schema aus der Ablage, als kurze Kennung) |
| [Bereinigen](#bereinigen) | `reiter` (`facetten`, `aehnlich` oder `typen`) |
| [Konvertieren](#konvertieren) | `ziel` (Zielformat, etwa `csv` oder `yaml`) |
| [Code erzeugen](#code-erzeugen) | `ziel`, `schema`, `wurzel`, `namensraum`, `klassen`, `grenzen`, `dateien` |
| [Testdaten](#testdaten) | `anzahl`, `startwert`, `feld`, `ziel` |

Baum und Editor geben nur die Stelle mit. Ein Vergleich mit einem früheren Stand oder einer Datei vom Gerät steht nicht in der Adresse, denn beides gibt es nur in diesem Moment.

Ein Beispiel für den Graph mit Fokus auf der ersten Bestellung und drei Ebenen Tiefe:

```text
/dokument/3f9c2a71/bestellungen-json/graph?fokus=/bestellungen/0&tiefe=3
```

## Neuladen, Zurück und Vor

Beim Start und bei Zurück oder Vor führt die Adresse. Strukturblick öffnet das Dokument (falls es noch zu ist), wechselt in die Ansicht, übernimmt die Einstellungen und wählt die Stelle. Danach folgt die Adresse jeder deiner Änderungen.

Zurück soll sich sinnvoll anfühlen, darum unterscheidet Strukturblick zwei Arten von Änderungen:

- **Ortswechsel** legen einen neuen Eintrag im Verlauf des Browsers an: ein anderes Dokument, eine andere Ansicht, ein Werkzeug, die Seite Ablage.
- **Feinheiten** ersetzen nur den aktuellen Eintrag: eine andere gewählte Stelle oder eine geänderte Einstellung.

So bringt dich Zurück von der Tabelle in den Baum, ohne vorher durch jede einzelne angeklickte Zelle zu wandern.

## Lesezeichen und Links weitergeben

Ein Lesezeichen merkt sich alles, was in der Adresse steht. Öffnest du es später, landest du an derselben Stelle, solange das Dokument noch in deiner Ablage liegt.

Ein Link führt nur dorthin, wo es dasselbe Dokument gibt. Mit Server sind das alle deine Geräte, solange du mit demselben Konto angemeldet bist. Ohne Server liegt jedes Dokument nur in einem Browser; ein Link in einem anderen Browser oder auf einem anderen Gerät findet es nicht. Dann meldet Strukturblick "Das Dokument aus der Adresse gibt es in dieser Ablage nicht; es bleibt beim zuletzt offenen" und lässt alles, wie es war. Ebenso bleibt eine unbekannte Ansicht, wie sie ist, und eine unbekannte Einstellung fällt auf die Vorgabe zurück.

## Kennung und Name

Jedes Dokument hat eine feste, lange Kennung (eine UUID). In der Adresse steht nur ihr Anfang, mindestens 8 Zeichen. Teilen sich zwei Dokumente denselben Anfang, wird er so lang, bis er eindeutig ist, etwa `3f9c2a71-5`. Eine volle Kennung versteht die Adresse ebenfalls.

Der Name dahinter ist nur zum Lesen da. Strukturblick schreibt ihn klein, Umlaute aus und alles außer Buchstaben und Ziffern als Bindestrich: aus `Kunden März.csv` wird `kunden-maerz-csv`. Benennst du ein Dokument um, ändert sich dieser Teil von selbst, und alte Links und Lesezeichen führen weiter zum richtigen Dokument.

Beim [Einspielen](#ablage/alles-sichern-und-einspielen) einer Sicherung bekommt jedes Dokument eine neue Kennung. Links auf die gesicherten Dokumente führen also nicht zu den eingespielten Kopien.
