---
title: UUID
subtitle: Weltweit eindeutige Kennungen
category: Konzepte
icon: fa-hashtag
---

Eine UUID (Universally Unique Identifier) ist eine 128-Bit-Kennung, die ohne
zentrale Vergabestelle praktisch kollisionsfrei erzeugt werden kann.
Geschrieben wird sie als 36 Zeichen in fünf Gruppen:

```
3f9a2c74-5b1e-4c2a-9e77-d41b8a6c0f12
```

Am verbreitetsten ist Version 4, deren Wert im Wesentlichen aus Zufall
besteht. Version 7 stellt einen Zeitstempel voran, dadurch lassen sich
Datensätze nach Erzeugungszeit sortieren, ohne die Eindeutigkeit aufzugeben.
Die Version steht im ersten Zeichen der dritten Gruppe.

Gegenüber fortlaufenden Nummern haben UUIDs zwei Vorteile: Sie verraten nichts
über Anzahl oder Reihenfolge der Datensätze, und mehrere Systeme können
gleichzeitig Kennungen vergeben, ohne sich abzustimmen. Der Preis ist die
Länge und die schlechtere Lesbarkeit für Menschen.

In Daten tauchen UUIDs als schlichte Texte auf. Die Mustererkennung von
Strukturblick erkennt das Format und markiert solche Felder mit einem
Abzeichen; die Schema-Inferenz übernimmt daraus ein entsprechendes
Format für das Feld. Strukturblick selbst vergibt für Dokumente und
Testdaten ebenfalls UUIDs statt fortlaufender Nummern.
