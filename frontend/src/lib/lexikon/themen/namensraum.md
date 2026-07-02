---
title: XML-Namensraum
subtitle: Gleiche Namen sauber auseinanderhalten
category: Formate
icon: fa-layer-group
---

Wenn zwei Vokabulare im selben Dokument dasselbe Wort verwenden (etwa `titel`
für ein Buch und für eine Person), braucht es eine Unterscheidung. Ein
Namensraum ordnet Elementnamen einer eindeutigen Kennung zu, die als URI
geschrieben wird. Deklariert wird er mit dem Attribut `xmlns`, meist verbunden
mit einem kurzen Präfix.

```
<lager xmlns:art="https://beispiel.de/artikel"
       xmlns:per="https://beispiel.de/personal">
  <art:titel>Wasserwaage 60 cm</art:titel>
  <per:titel>Filialleitung</per:titel>
</lager>
```

Die URI muss nicht erreichbar sein, sie dient nur als eindeutiger Name. Ein
`xmlns` ohne Präfix setzt den Standard-Namensraum für das Element und seine
Kinder. Entscheidend ist immer das Paar aus Namensraum und lokalem Namen,
nicht das Präfix: `art:titel` und ein anderes Präfix mit derselben URI meinen
dasselbe Element.

Strukturblick zeigt Namensräume im Inspektor zum gewählten Knoten an. Beim
Konvertieren nach JSON oder CSV gibt es keine direkte Entsprechung; Präfixe
landen bestenfalls als Teil des Schlüsselnamens im Ergebnis. Die
Verlustwarnung führt den Aspekt Namensräume deshalb gesondert auf.
