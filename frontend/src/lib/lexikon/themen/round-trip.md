---
title: Round-Trip
subtitle: Hin und zurück ohne Verlust
category: Konzepte
icon: fa-rotate
---

Round-Trip bezeichnet die Kette Konvertieren und Zurückkonvertieren: Ein
Dokument wird etwa von YAML nach JSON gewandelt und wieder zurück. Ideal ist
das Ergebnis mit dem Ausgangsdokument identisch. Ob das gelingt, hängt davon
ab, ob beide Formate alle genutzten Aspekte abbilden können.

Zwei Arten von Abweichungen sind zu unterscheiden. Inhaltliche Verluste
betreffen die Daten selbst: Kommentare verschwinden, Attribute werden zu
gewöhnlichen Feldern, Typen vergröbern zu Text. Kosmetische Abweichungen
betreffen nur die Darstellung: Einrückung, Anführungszeichenstil oder die
Reihenfolge von Schlüsseln ändern sich, während die Daten gleich bleiben.

Strukturblick stützt sich dabei auf zwei Werkzeuge: Die Verlustwarnung sagt
vor der Konvertierung voraus, welche Aspekte verloren gehen. Die
Vergleichs-Ansicht zeigt nach dem Rückweg jede tatsächliche Abweichung
zwischen Original und Ergebnis, mit Pfad zu jeder Fundstelle.

Als Faustregel gilt: JSON, NDJSON und die strukturellen Anteile von YAML sind
untereinander round-trip-fähig. Sobald Kommentare, Anker, XML-Eigenheiten
oder CSV-Verflachung im Spiel sind, ist der Rückweg nur noch eine Annäherung,
und man sollte das Original aufbewahren.
