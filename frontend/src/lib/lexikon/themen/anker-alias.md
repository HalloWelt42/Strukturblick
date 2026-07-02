---
title: Anker und Alias
subtitle: Wiederverwendung in YAML
category: Formate
icon: fa-anchor
---

Mit einem Anker (`&name`) markiert man in YAML einen Knoten, mit einem Alias
(`*name`) verweist man später darauf. So steht ein wiederkehrender Block nur
einmal in der Datei, alle weiteren Stellen zeigen auf dasselbe Original. Der
Zusammenführungsschlüssel `<<` mischt einen verankerten Block zusätzlich in
ein Objekt und erlaubt dort gezielte Abweichungen.

```
standard: &basis
  zeitzone: Europe/Berlin
  sprache: de

filiale_hamburg:
  <<: *basis
  sprache: de-HH
```

Beim Einlesen löst der Parser jeden Alias auf, im Datenmodell entstehen also
Kopien beziehungsweise geteilte Knoten. Die Baum-Ansicht von Strukturblick
zeigt den aufgelösten Zustand, denn nur der zählt für Abfragen und
Konvertierungen.

Wandelt man ein solches Dokument nach JSON, gibt es für Anker keine
Entsprechung: Der geteilte Block wird an jeder Stelle ausgeschrieben, die
Information über die Wiederverwendung geht verloren. Die Verlustwarnung führt
den Aspekt Anker und Alias deshalb vor der Umwandlung auf. Zurück nach YAML
entsteht kein Anker von selbst, der Round-Trip ist an dieser Stelle nicht
verlustfrei.
