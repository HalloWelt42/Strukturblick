---
title: Mustererkennung
subtitle: Bedeutung in Werten erkennen
category: Konzepte
icon: fa-fingerprint
---

Viele Werte tragen mehr Bedeutung, als ihr Typ verrät: Ein Text kann eine
UUID, ein Datum oder eine E-Mail-Adresse sein. Die Mustererkennung von
Strukturblick prüft Werte gegen bekannte Muster und blendet das Ergebnis als
kleine Abzeichen in der Baum-Ansicht ein. Die Daten selbst bleiben unberührt,
es sind reine Hinweise.

| Muster       | Beispiel                               |
| ------------ | -------------------------------------- |
| UUID         | `3f9a2c74-5b1e-4c2a-9e77-d41b8a6c0f12` |
| Datum        | `2019-03-14`                           |
| E-Mail       | `erika@beispiel.de`                    |
| Zahl als Text | `"68.30"`                             |

Auch Strukturen werden erkannt: Enthält eine Liste lauter gleichförmige
Objekte, meldet Strukturblick eine erkannte Liste. Solche Listen sind die
Kandidaten für die Tabellen-Ansicht und liefern der Schema-Inferenz die
Grundlage für einen gemeinsamen Elementtyp.

Die Erkenntnisse fließen an mehreren Stellen ein: Die Schema-Inferenz schlägt
passende Formate vor, die Konvertierung kann Zahlen, die als Text abgelegt
sind, auf Wunsch typisieren, und die Verlustwarnung weiß, welche Feinheiten
ein Zielformat gefährden würde. Übernommen wird eine Deutung aber nie
automatisch, sondern immer erst nach Bestätigung.
