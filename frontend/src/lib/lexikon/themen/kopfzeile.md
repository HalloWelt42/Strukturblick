---
title: Kopfzeile
subtitle: Spaltennamen in der ersten Zeile
category: Formate
icon: fa-heading
---

Die Kopfzeile ist die erste Zeile einer CSV-Datei, wenn sie statt Daten die
Namen der Spalten enthält. Sie ist im Format selbst nicht gekennzeichnet: Ob
`kunde,ort,umsatz` eine Überschrift oder schon der erste Datensatz ist, steht
nirgends in der Datei.

Strukturblick entscheidet das mit einer Heuristik: Unterscheiden sich die
Werte der ersten Zeile im Muster deutlich vom Rest (nur Text, während darunter
Zahlen oder Datumsangaben stehen), wird sie als Kopfzeile gewertet. Die
Einschätzung lässt sich im Inspektor jederzeit umschalten, denn bei rein
textuellen Tabellen kann jede Automatik irren.

Mit einer erkannten Kopfzeile werden die Spaltennamen überall
weiterverwendet: als Spaltenköpfe der Tabellen-Ansicht, als Schlüssel bei der
Konvertierung nach JSON und als Feldnamen in Abfragen. Ohne Kopfzeile vergibt
Strukturblick neutrale Namen wie `spalte_1`.

Stolpersteine sind doppelte oder leere Spaltennamen: Beim Umwandeln in
Objektschlüssel müssen sie eindeutig gemacht werden, sonst überschreiben sich
Werte gegenseitig. Die Validierung weist auf solche Kopfzeilen hin, bevor
daraus stillschweigend Datenverlust wird.
