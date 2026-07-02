---
title: TOML
subtitle: Klar definiertes Konfigurationsformat
category: Formate
icon: fa-sliders
---

TOML ist ein Format für Konfigurationsdateien mit einer bewusst eindeutigen
Grammatik. Jede Zeile ist ein Schlüssel-Wert-Paar, Abschnitte werden mit
eckigen Klammern eingeleitet, Kommentare beginnen mit `#`. Anders als in YAML
ist die Typzuordnung nie ein Ratespiel: Texte stehen immer in
Anführungszeichen, Zahlen, Wahrheitswerte sowie Datum und Uhrzeit haben eine
feste Schreibweise.

```
titel = "Werkzeugkiste Nord"

[laden]
eroeffnet = 2019-03-14
plaetze = 12
aktiv = true

[[filialen]]
ort = "Hamburg"

[[filialen]]
ort = "Lübeck"
```

Verschachtelung entsteht über Abschnittsnamen mit Punkten (`[laden.kasse]`)
und Tabellenlisten (`[[filialen]]`). Sehr tiefe Strukturen werden dadurch
schnell unhandlich, TOML spielt seine Stärke bei flachen bis mittel tiefen
Konfigurationen aus.

Strukturblick zeigt TOML als denselben Baum wie JSON oder YAML. Beim
Konvertieren gehen Kommentare und die native Datumsangabe verloren (in JSON
wird daraus Text), beides meldet die Verlustwarnung als eigene Aspekte.
