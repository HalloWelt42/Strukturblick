---
title: YAML
subtitle: Menschenfreundliches Strukturformat
category: Formate
icon: fa-file-lines
---

YAML beschreibt dieselben Strukturen wie JSON, setzt aber auf Einrückung statt
Klammern. Schlüssel-Wert-Paare werden mit Doppelpunkt notiert, Listeneinträge
mit einem Spiegelstrich, und Kommentare beginnen mit `#`. Das macht YAML
beliebt für Konfigurationsdateien, die Menschen lesen und pflegen.

```
geschaeft:
  name: Werkzeugkiste Nord   # Stammhaus
  filialen:
    - Hamburg
    - Lübeck
```

Die Freiheit hat Tücken: Werte stehen oft ohne Anführungszeichen, und der
Parser rät den Typ. Aus `version: 1.20` wird eine Zahl, aus `land: NO` je nach
YAML-Version ein Wahrheitswert statt eines Länderkürzels. Strukturblick zeigt
im Inspektor den tatsächlich erkannten Typ jedes Werts, so fallen solche
Überraschungen sofort auf.

Beim Konvertieren nach JSON gehen Kommentare, Anker und Alias sowie die
Aufteilung in mehrere Dokumente (`---`) verloren. Die Verlustwarnung führt
diese Aspekte vor der Umwandlung einzeln auf. Verwandte Themen: Anker und
Alias, Verlustwarnung.
