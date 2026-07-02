---
title: NDJSON
subtitle: Ein JSON-Dokument pro Zeile
category: Formate
icon: fa-bars-staggered
---

NDJSON (Newline Delimited JSON) reiht vollständige JSON-Werte zeilenweise
aneinander: Jede Zeile ist für sich ein gültiges JSON-Dokument, meist ein
Objekt. Es gibt keine umschließende Liste und kein Komma zwischen den
Einträgen, der Zeilenumbruch ist das Trennzeichen.

```
{"nummer": "B-2026-0412", "summe": 68.30, "bezahlt": true}
{"nummer": "B-2026-0413", "summe": 12.90, "bezahlt": false}
{"nummer": "B-2026-0417", "summe": 154.00, "bezahlt": true}
```

Das Format eignet sich für Protokolle und Datenströme: Neue Datensätze werden
einfach angehängt, und ein Leser kann Zeile für Zeile verarbeiten, ohne die
ganze Datei zu laden. Kaputte Einzelzeilen beschädigen nicht den Rest, was
NDJSON robuster macht als eine einzige riesige JSON-Liste.

Strukturblick behandelt eine NDJSON-Datei als Folge von Datensätzen. Sind die
Zeilen gleichförmig aufgebaut, meldet die Mustererkennung eine erkannte Liste,
und die Tabellen-Ansicht zeigt die Datensätze als Zeilen mit gemeinsamen
Spalten. Die Umwandlung in eine normale JSON-Liste (und zurück) ist
verlustfrei.
