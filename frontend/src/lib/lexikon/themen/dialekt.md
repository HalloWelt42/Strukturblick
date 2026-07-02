---
title: CSV-Dialekt
subtitle: Trennzeichen, Anführungszeichen, Zeilenenden
category: Formate
icon: fa-language
---

CSV ist weniger ein Format als eine Familie von Dialekten. Was zwischen zwei
Feldern steht, wie Text geschützt wird und wie eine Zeile endet, ist von Datei
zu Datei verschieden. Im deutschsprachigen Raum ist das Semikolon als
Trennzeichen verbreitet, weil das Dezimalkomma sonst mit dem Feldtrenner
kollidiert.

| Merkmal        | Typische Varianten                       |
| -------------- | ---------------------------------------- |
| Trennzeichen   | Komma, Semikolon, Tabulator, senkrechter Strich |
| Textbegrenzung | doppelte oder einfache Anführungszeichen |
| Zeilenende     | LF oder CRLF                             |
| Dezimalzeichen | Punkt oder Komma                         |

Strukturblick bestimmt den Dialekt beim Einlesen automatisch: Es zählt
Kandidaten-Trennzeichen über mehrere Zeilen und wählt die Kombination, die die
gleichmäßigste Spaltenzahl ergibt. Der erkannte Dialekt steht im Inspektor und
lässt sich dort korrigieren, falls die Automatik daneben liegt.

Beim Export gilt der umgekehrte Weg: Man wählt den Dialekt des Zielsystems,
zum Beispiel Semikolon mit CRLF für eine deutschsprachige Tabellenkalkulation.
Erst ein sauber deklarierter Dialekt macht eine CSV-Datei zuverlässig
austauschbar.
