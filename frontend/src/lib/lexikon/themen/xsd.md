---
title: XSD
subtitle: Schemasprache für XML
category: Schemas
icon: fa-file-contract
---

XSD (XML Schema Definition) beschreibt den erlaubten Aufbau von
XML-Dokumenten: welche Elemente in welcher Reihenfolge und Häufigkeit
vorkommen, welche Attribute sie tragen und welchen Datentyp die Inhalte haben.
Ein XSD ist selbst ein XML-Dokument und wird über einen eigenen Namensraum
geschrieben.

```
<xs:element name="buch">
  <xs:complexType>
    <xs:sequence>
      <xs:element name="titel" type="xs:string" />
      <xs:element name="seiten" type="xs:positiveInteger" />
    </xs:sequence>
    <xs:attribute name="isbn" type="xs:string" use="required" />
  </xs:complexType>
</xs:element>
```

Gegenüber JSON Schema fällt das reichhaltige Typsystem auf: XSD bringt über
vierzig eingebaute Datentypen mit, darunter Datum, Uhrzeit, Dauer und
Dezimalzahlen mit fester Genauigkeit. Eigene Typen entstehen durch
Einschränkung (etwa ein Textmuster für ISBN-Nummern) oder Erweiterung
bestehender Typen.

Strukturblick prüft XML-Dokumente in der Validieren-Funktion gegen ein XSD
und zeigt Verstöße mit Pfad, Zeile und Spalte. Die Schema-Inferenz kann
umgekehrt aus Beispiel-XML einen XSD-Entwurf ableiten, der wie jeder Vorschlag
erst nach Durchsicht übernommen wird.
