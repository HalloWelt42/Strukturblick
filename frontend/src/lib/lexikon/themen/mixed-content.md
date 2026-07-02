---
title: Gemischter Inhalt
subtitle: Text und Elemente im selben Knoten
category: Formate
icon: fa-paragraph
---

Von gemischtem Inhalt spricht man, wenn ein XML-Element sowohl Text als auch
Kindelemente direkt nebeneinander enthält. Typisch ist das in dokumentartigen
Daten, etwa wenn mitten im Fließtext einzelne Wörter ausgezeichnet werden:

```
<hinweis>
  Bitte die <artikel>Wasserwaage</artikel> vor dem Versand
  <wichtig>sorgfältig</wichtig> verpacken.
</hinweis>
```

Für Datenformate wie JSON ist das ein Problem: Ein Objekt kann Schlüssel und
Werte abbilden, aber nicht die Reihenfolge, in der Textstücke und Elemente
einander abwechseln. Jede Abbildung muss die Textteile in Hilfsknoten
verpacken und ihre Position künstlich festhalten, was die Struktur aufbläht
und schwer abfragbar macht.

Strukturblick erkennt gemischten Inhalt bei der Analyse und markiert die
betroffenen Knoten. Vor einer Konvertierung meldet die Verlustwarnung den
Aspekt Gemischter Inhalt mit allen Fundstellen, denn hier droht nicht nur
Informationsverlust, sondern eine sinnentstellte Struktur. Reine Datendokumente
ohne gemischten Inhalt lassen sich dagegen sauber übertragen.
