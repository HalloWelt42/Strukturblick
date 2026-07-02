---
title: JSON
subtitle: Leichtgewichtiges Datenformat
category: Formate
icon: fa-file-code
---

JSON ist ein textbasiertes Datenformat für strukturierte Daten. Es kennt genau
sechs Bausteine: Objekte mit Schlüssel-Wert-Paaren, Listen, Texte, Zahlen,
Wahrheitswerte und `null`. Diese bewusste Beschränkung macht JSON leicht zu
lesen, leicht zu erzeugen und zum Referenzformat für den Datenaustausch
zwischen Programmen.

Die Syntax ist streng: Schlüssel und Texte stehen immer in doppelten
Anführungszeichen, Kommentare sind nicht erlaubt, und nach dem letzten Eintrag
darf kein Komma folgen. Genau diese Strenge nutzt Strukturblick bei der
Analyse: Jeder Verstoß lässt sich mit Zeile und Spalte melden, und das
Werkzeug Reparatur kann typische Tippfehler gezielt vorschlagen.

```
{
  "name": "Werkzeugkiste Nord",
  "filialen": ["Hamburg", "Lübeck"],
  "gegruendet": 2019,
  "aktiv": true
}
```

In Strukturblick ist JSON das Ankerformat: Die Baum-Ansicht zeigt die
Verschachtelung direkt, und bei Konvertierungen aus anderen Formaten dient
JSON oft als Zwischenschritt. Verwandte Themen: JSON5 und JSONC für lockerere
Schreibweisen, JSON Schema für die Beschreibung der Struktur.
