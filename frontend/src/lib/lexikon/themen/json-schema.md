---
title: JSON Schema
subtitle: Struktur von JSON-Daten beschreiben
category: Schemas
icon: fa-diagram-project
---

Ein JSON Schema beschreibt, wie gültige Daten auszusehen haben: welche
Schlüssel ein Objekt hat, welche Typen die Werte tragen und welche Felder
Pflicht sind. Das Schema ist selbst ein JSON-Dokument und damit maschinell
prüfbar, versionierbar und austauschbar.

```
{
  "type": "object",
  "required": ["nummer", "summe"],
  "properties": {
    "nummer": { "type": "string", "pattern": "^B-\\d{4}-\\d{4}$" },
    "summe": { "type": "number", "minimum": 0 },
    "bezahlt": { "type": "boolean" }
  }
}
```

Neben Typen kennt JSON Schema Wertebereiche (`minimum`, `maxLength`), Muster
(`pattern`), Aufzählungen (`enum`) und Kombinationen (`oneOf`, `allOf`). Mit
`$ref` und JSON Pointer lassen sich Teilschemas wiederverwenden, so bleibt
auch ein großes Schema übersichtlich.

Strukturblick nutzt JSON Schema an zwei Stellen: Die Validieren-Funktion
prüft ein Dokument gegen ein Schema und meldet jede Verletzung mit Pfad und
Begründung. Und die Schema-Inferenz geht den umgekehrten Weg: Aus
Beispieldaten entsteht ein Schema-Vorschlag, den man in der Schema-Ansicht
prüft und übernimmt.
