---
title: JSON5 und JSONC
subtitle: Lockerere Schreibweisen von JSON
category: Formate
icon: fa-comment-dots
---

JSONC und JSON5 erweitern JSON um Annehmlichkeiten für von Hand gepflegte
Dateien, etwa Konfigurationen. JSONC erlaubt Kommentare (`//` und `/* */`)
sowie ein Komma nach dem letzten Eintrag. JSON5 geht weiter: Schlüssel ohne
Anführungszeichen, einfache Anführungszeichen, mehrzeilige Texte,
Hexadezimalzahlen und führende Pluszeichen sind erlaubt.

| Merkmal                    | JSON | JSONC | JSON5 |
| -------------------------- | ---- | ----- | ----- |
| Kommentare                 | nein | ja    | ja    |
| Komma nach letztem Eintrag | nein | ja    | ja    |
| Schlüssel ohne Anführungszeichen | nein | nein | ja |
| Einfache Anführungszeichen | nein | nein  | ja    |

Strukturblick liest beide Varianten und zeigt sie wie gewohnt als Baum. Beim
Konvertieren in strenges JSON gehen Kommentare jedoch verloren, denn JSON hat
dafür keinen Platz. Genau dafür gibt es die Verlustwarnung: Vor der Umwandlung
listet sie den Aspekt Kommentare mit allen Fundstellen auf, und man entscheidet
bewusst, ob der Verlust in Ordnung ist.
