---
title: XML
subtitle: Auszeichnungssprache mit Elementen und Attributen
category: Formate
icon: fa-code
---

XML strukturiert Daten mit Elementen: Ein Start-Tag, Inhalt und ein End-Tag
bilden einen Knoten, Knoten dürfen beliebig tief geschachtelt werden. Zusätzlich
kann jedes Element Attribute im Start-Tag tragen. Sonderzeichen wie `<` und `&`
müssen im Text als Entitäten (`&lt;`, `&amp;`) geschrieben werden.

```
<buecherei stadt="Lübeck">
  <buch isbn="978-3-16-148410-0">
    <titel>Strukturen verstehen</titel>
    <seiten>312</seiten>
  </buch>
</buecherei>
```

Man unterscheidet zwei Qualitätsstufen: Wohlgeformt ist ein Dokument, wenn die
Syntax stimmt (jedes Tag wird geschlossen, Attribute sind in Anführungszeichen).
Gültig ist es erst, wenn es zusätzlich einem Schema wie XSD entspricht. Die
Validieren-Funktion von Strukturblick prüft beide Stufen und meldet Verstöße
mit Zeile und Spalte.

XML kennt Konzepte, die JSON und CSV fehlen: Attribute, Namensräume,
Kommentare, Verarbeitungsanweisungen und gemischten Inhalt. Bei einer
Konvertierung listet die Verlustwarnung diese Aspekte einzeln auf. Verwandte
Themen: XML-Attribut, XML-Namensraum, Gemischter Inhalt, XSD, XPath.
