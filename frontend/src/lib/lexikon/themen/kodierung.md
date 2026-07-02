---
title: Zeichenkodierung
subtitle: Wie aus Bytes Buchstaben werden
category: Formate
icon: fa-font
---

Eine Textdatei besteht aus Bytes; erst die Zeichenkodierung legt fest, welcher
Buchstabe hinter welchen Bytes steckt. Heute ist UTF-8 der Standard und deckt
alle Schriftzeichen ab. Ältere Dateien verwenden aber oft Ein-Byte-Kodierungen
wie Latin-1 oder Windows-1252, bei denen Umlaute anders abgelegt sind.

Wird eine Datei mit der falschen Annahme gelesen, entsteht Zeichensalat, an
dem sich das Problem gut erkennen lässt:

| Gemeint | UTF-8-Bytes als Latin-1 gelesen |
| ------- | ------------------------------- |
| ä       | Ã¤                              |
| ö       | Ã¶                              |
| ß       | ÃŸ                              |

Strukturblick prüft beim Import zunächst auf eine BOM (eine optionale
Markierung am Dateianfang) und rät sonst anhand der Bytemuster. Die erkannte
Kodierung steht im Inspektor; sieht das Ergebnis falsch aus, kann man sie dort
umstellen und die Datei wird neu eingelesen. Gespeichert und exportiert wird
grundsätzlich als UTF-8.

Besonders CSV-Dateien aus älteren Systemen sind anfällig, weil das Format
keine Stelle hat, an der die Kodierung deklariert wird. XML dagegen nennt sie
in der ersten Zeile (`<?xml version="1.0" encoding="UTF-8"?>`), und JSON ist
per Definition UTF-8.
