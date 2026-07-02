---
title: Verlustwarnung
subtitle: Was bei einer Konvertierung verloren ginge
category: Konzepte
icon: fa-triangle-exclamation
---

Formate sind unterschiedlich ausdrucksstark: YAML kennt Kommentare und Anker,
XML kennt Attribute und Namensräume, CSV kennt weder Verschachtelung noch
Typen. Bei jeder Konvertierung droht deshalb Verlust, und zwar nicht pauschal,
sondern an konkreten Stellen aus konkreten Gründen.

Strukturblick fasst jede solche Formateigenheit als Aspekt. Vor einer
Konvertierung wird das Dokument daraufhin untersucht, welche Aspekte es
tatsächlich nutzt, und diese Liste wird mit den Fähigkeiten des Zielformats
abgeglichen. Nur was wirklich betroffen ist, erscheint in der Warnung, mit
Fundstellen zum Anspringen.

| Aspekt              | Geht zum Beispiel verloren bei |
| ------------------- | ------------------------------ |
| Kommentare          | YAML oder JSONC nach JSON      |
| Anker und Alias     | YAML nach JSON                 |
| Attribute, Namensräume | XML nach JSON               |
| Verschachtelung     | JSON nach CSV                  |
| Schlüsselreihenfolge | Formate mit ungeordneten Objekten |

Die Entscheidung bleibt beim Menschen: Die Warnung zeigt Vorschau und
Konsequenzen, konvertiert wird erst nach Bestätigung. Wer regelmäßig zwischen
zwei Formaten wechselt, erkennt an der Aspektliste außerdem sofort, ob ein
verlustfreier Round-Trip möglich ist.
