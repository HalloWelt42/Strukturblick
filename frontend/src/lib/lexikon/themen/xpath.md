---
title: XPath
subtitle: Pfadsprache für XML-Dokumente
category: Abfragen
icon: fa-signs-post
---

XPath wählt Knoten in XML-Dokumenten aus. Ein Ausdruck liest sich wie ein
Dateipfad: `/buecherei/buch/titel` steigt vom Wurzelelement zu allen
Titel-Elementen ab. Mit `//` durchsucht man alle Ebenen auf einmal, `@` greift
auf Attribute zu, und Prädikate in eckigen Klammern grenzen die Auswahl ein.

| Ausdruck                 | Bedeutung                                  |
| ------------------------ | ------------------------------------------ |
| `/buecherei/buch`        | Buch-Elemente direkt unter der Wurzel      |
| `//titel`                | Alle Titel-Elemente in jeder Tiefe         |
| `//buch[@sprache="de"]`  | Bücher mit passendem Attribut              |
| `//buch[seiten > 300]`   | Bücher mit mehr als 300 Seiten             |
| `count(//buch)`          | Anzahl aller Buch-Elemente                 |

Neben der Auswahl beherrscht XPath Funktionen für Text, Zahlen und Mengen,
etwa `contains()`, `starts-with()` oder `count()`. Über Achsen wie `parent::`
oder `following-sibling::` bewegt man sich auch rückwärts und seitwärts durch
den Baum, was Pfadsprachen für JSON in dieser Form nicht bieten.

In Strukturblick ist XPath das Gegenstück zu JSONPath: Liegt im aktiven Tab
ein XML-Dokument, nimmt die Abfrage-Konsole XPath-Ausdrücke entgegen und
markiert die Treffer im Baum. Namensräume werden dabei über die im Dokument
deklarierten Präfixe angesprochen.
