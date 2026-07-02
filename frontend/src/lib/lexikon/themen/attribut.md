---
title: XML-Attribut
subtitle: Name-Wert-Paare am Start-Tag
category: Formate
icon: fa-tag
---

Ein Attribut hängt zusätzliche Information direkt an ein Element: Es steht im
Start-Tag als `name="wert"`. Pro Element darf jeder Attributname nur einmal
vorkommen, und der Wert ist immer Text. Attribute eignen sich für Metadaten
wie Kennungen, Einheiten oder Sprachangaben, während der eigentliche Inhalt
in Kindelementen liegt.

```
<buch isbn="978-3-16-148410-0" sprache="de">
  <titel>Strukturen verstehen</titel>
</buch>
```

Ob eine Angabe als Attribut oder als Kindelement modelliert wird, ist eine
Designentscheidung; beide Varianten transportieren dieselben Daten. Faustregel:
Was zum Datensatz gehört, wird Element; was den Datensatz beschreibt, wird
Attribut.

JSON kennt keine Attribute. Beim Konvertieren nutzt Strukturblick daher eine
Namenskonvention und stellt Attributen ein Präfix wie `@` voran, damit sie von
Kindelementen unterscheidbar bleiben. Diese Konvention muss beim Rückweg
wieder erkannt werden, sonst bricht der Round-Trip. Die Verlustwarnung weist
auf den Aspekt Attribute hin, sobald ein Zielformat sie nicht direkt abbilden
kann.
