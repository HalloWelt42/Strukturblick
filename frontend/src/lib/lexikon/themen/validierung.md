---
title: Validierung
subtitle: Daten gegen Regeln prüfen
category: Schemas
icon: fa-clipboard-check
---

Validierung prüft ein Dokument in Stufen. Zuerst die Syntax: Ist die Datei
überhaupt gültiges JSON, YAML, XML oder CSV? Danach die Struktur: Entspricht
der Inhalt einem Schema, stimmen also Felder, Typen und Wertebereiche? Beide
Stufen beantworten verschiedene Fragen, und erst zusammen ergeben sie ein
belastbares Urteil.

| Stufe    | Prüfung                    | Beispiel für einen Fehler          |
| -------- | -------------------------- | ---------------------------------- |
| Syntax   | Ist das Format wohlgeformt? | fehlende Klammer, offenes Tag      |
| Struktur | Passt der Inhalt zum Schema? | Pflichtfeld fehlt, Text statt Zahl |

In Strukturblick läuft die Syntaxprüfung ständig mit: Fehler erscheinen als
Diagnosen mit Zeile und Spalte, die Statusleiste zählt sie mit. Die
Strukturprüfung startet man in der Validieren-Funktion gegen ein gewähltes
JSON Schema oder XSD; jede Verletzung wird mit dem Pfad zur Fundstelle
gemeldet, ein Klick springt im Baum dorthin.

Gute Fehlermeldungen benennen drei Dinge: wo (der Pfad, etwa als JSON
Pointer), was (die verletzte Regel) und warum (der beanstandete Wert). Nach
diesem Muster sind die Diagnosen in Strukturblick aufgebaut, damit sich auch
lange Fehlerlisten zügig abarbeiten lassen.
