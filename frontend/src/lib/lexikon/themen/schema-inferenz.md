---
title: Schema-Inferenz
subtitle: Vom Beispiel zum Schema-Vorschlag
category: Schemas
icon: fa-wand-magic-sparkles
---

Schema-Inferenz leitet aus vorhandenen Daten eine Strukturbeschreibung ab.
Strukturblick durchläuft dazu das Dokument, sammelt je Pfad die beobachteten
Typen und Wertemuster und verdichtet sie zu einem Schema-Entwurf: gleiche
Objekte in einer Liste werden zu einem gemeinsamen Objekttyp, Felder, die
nicht überall vorkommen, werden optional.

Die Grenzen liegen in der Natur der Sache: Ein Beispiel zeigt nur, was
vorkommt, nicht, was erlaubt ist. Eine leere Liste verrät nichts über ihren
Elementtyp, ein Feld mit `null` nichts über den eigentlichen Wert, und ob
`"42"` wirklich Text bleiben soll, weiß nur der Mensch. Je mehr und je
vielfältigere Datensätze vorliegen, desto tragfähiger wird der Vorschlag.

Die Mustererkennung fließt mit ein: Erkennt Strukturblick in einer Spalte
durchgehend UUIDs, Datumsangaben oder E-Mail-Adressen, schlägt das Schema ein
entsprechendes Format oder Muster vor statt nur `string`.

Wie überall in Strukturblick gilt: Das Ergebnis ist ein Vorschlag. Die
Schema-Ansicht zeigt den Entwurf zur Durchsicht, einzelne Festlegungen lassen
sich lockern oder verschärfen, und erst die Übernahme macht daraus das
gültige Schema für die Validierung.
