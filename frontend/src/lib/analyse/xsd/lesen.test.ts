// Schema-Übersicht: XML Schema lesen über Importe und Includes, Elementbaum mit Erweiterung, Gruppen, Auswahl,
// Ersetzungsgruppen und Rekursion, Kennzahlen und Verwendungen, Erkennen am Wurzelelement.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kinderVon, wurzeln, type Baumknoten } from "./elementbaum";
import { istXmlSchema } from "./erkennen";
import { kennzahlen, verwendungen } from "./kennzahlen";
import { xsdLesen } from "./lesen";
import { anzeigename, type XsdModell } from "./modell";

const pruefdatei = (name: string) => ({ pfad: name, text: readFileSync(new URL(`../../../../pruefdaten/${name}`, import.meta.url), "utf8") });

const BASIS = `<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:basis" xmlns:b="urn:basis" elementFormDefault="qualified">
  <xsd:simpleType name="Waehrung"><xsd:annotation><xsd:documentation>Kürzel nach ISO 4217</xsd:documentation></xsd:annotation>
    <xsd:restriction base="xsd:string"><xsd:enumeration value="EUR"><xsd:annotation><xsd:documentation>Euro</xsd:documentation></xsd:annotation></xsd:enumeration><xsd:enumeration value="CHF"/></xsd:restriction></xsd:simpleType>
  <xsd:complexType name="Betrag"><xsd:simpleContent><xsd:extension base="xsd:decimal"><xsd:attribute name="waehrung" type="b:Waehrung" use="required"/></xsd:extension></xsd:simpleContent></xsd:complexType>
  <xsd:complexType name="Partner" abstract="true"><xsd:sequence><xsd:element name="name" type="xsd:string"/></xsd:sequence><xsd:attributeGroup ref="b:Kennung"/></xsd:complexType>
  <xsd:attributeGroup name="Kennung"><xsd:attribute name="id" type="xsd:ID" use="required"/><xsd:attribute name="alt" type="xsd:string"/></xsd:attributeGroup>
  <xsd:simpleType name="Ungenutzt"><xsd:list itemType="xsd:int"/></xsd:simpleType>
</xsd:schema>`;

const TEIL = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="Datum"><xs:restriction base="xs:date"/></xs:simpleType>
  <xs:group name="Zeitraum"><xs:sequence><xs:element name="beginn" type="Datum"/><xs:element name="ende" type="xs:date" minOccurs="0"/></xs:sequence></xs:group>
</xs:schema>`;

const HAUPT = `<?xml version="1.0"?>
<!-- Vertrag, erfunden -->
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:b="urn:basis" xmlns:v="urn:vertrag" targetNamespace="urn:vertrag" elementFormDefault="qualified">
  <xs:import namespace="urn:basis" schemaLocation="../basis/basis.xsd"/>
  <xs:include schemaLocation="teil.xsd"/>
  <xs:import namespace="urn:fehlt" schemaLocation="fehlt.xsd"/>
  <xs:complexType name="Person"><xs:complexContent><xs:extension base="b:Partner"><xs:sequence><xs:element name="geburt" type="xs:date"/></xs:sequence><xs:attribute name="alt" use="prohibited"/></xs:extension></xs:complexContent></xs:complexType>
  <xs:complexType name="Firma"><xs:complexContent><xs:extension base="b:Partner"><xs:sequence><xs:element name="register" type="xs:string"/></xs:sequence></xs:extension></xs:complexContent></xs:complexType>
  <xs:element name="partner" type="b:Partner" abstract="true"/>
  <xs:element name="person" type="v:Person" substitutionGroup="v:partner"/>
  <xs:element name="firma" type="v:Firma" substitutionGroup="v:partner"/>
  <xs:complexType name="Knoten"><xs:sequence><xs:element name="knoten" type="v:Knoten" minOccurs="0" maxOccurs="unbounded"/></xs:sequence></xs:complexType>
  <xs:simpleType name="Nummer"><xs:union memberTypes="xs:int xs:string"/></xs:simpleType>
  <xs:element name="vertrag">
    <xs:annotation><xs:documentation>Ein Vertrag
      mit Partnern</xs:documentation></xs:annotation>
    <xs:complexType>
      <xs:sequence>
        <xs:element name="nummer" type="v:Nummer"/>
        <xs:element ref="v:partner" maxOccurs="unbounded"/>
        <xs:group ref="v:Zeitraum"/>
        <xs:choice><xs:element name="beitrag" type="b:Betrag"/><xs:sequence><xs:element name="rate" type="b:Betrag"/><xs:element name="raten" type="xs:int"/></xs:sequence></xs:choice>
        <xs:element name="gliederung" type="v:Knoten" minOccurs="0"/>
        <xs:any namespace="##other" minOccurs="0"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

const lesen = (): XsdModell => xsdLesen({ pfad: "paket/vertrag/vertrag.xsd", text: HAUPT }, [
  { pfad: "paket/basis/basis.xsd", text: BASIS },
  { pfad: "paket/vertrag/teil.xsd", text: TEIL },
]);
const zeile = (k: Baumknoten) => `${k.name} ${k.typ ?? ""} ${k.vielfalt}${k.rekursiv ? " rekursiv" : ""}`.trim();
const kinder = (m: XsdModell, k: Baumknoten) => kinderVon(m, k).map(zeile);

describe("XML Schema lesen", () => {
  it("folgt Importen und Includes und meldet fehlende", () => {
    const m = lesen();
    expect(m.teile.map((t) => [t.pfad, t.zielnamensraum, t.haupt])).toEqual([
      ["paket/vertrag/vertrag.xsd", "urn:vertrag", true],
      ["paket/basis/basis.xsd", "urn:basis", false],
      ["paket/vertrag/teil.xsd", "urn:vertrag", true],
    ]);
    expect(m.fehlend).toEqual(["fehlt.xsd"]);
    // Das Include ohne Zielnamensraum übernimmt den des Hauptschemas
    expect(m.gruppen.has("{urn:vertrag}Zeitraum")).toBe(true);
    expect(anzeigename(m, "{urn:basis}Waehrung")).toBe("b:Waehrung");
    expect(anzeigename(m, "{http://www.w3.org/2001/XMLSchema}string")).toBe("xs:string");
    const w = m.typen.get("{urn:basis}Waehrung")!;
    expect([w.doku, w.werte]).toEqual(["Kürzel nach ISO 4217", [{ wert: "EUR", doku: "Euro" }, { wert: "CHF", doku: null }]]);
    expect(m.elemente.get("{urn:vertrag}vertrag")!.doku).toBe("Ein Vertrag mit Partnern");
  });

  it("baut den Elementbaum Ebene für Ebene", () => {
    const m = lesen();
    const alle = wurzeln(m);
    expect(alle.map((r) => r.name)).toEqual(["v:partner", "v:person", "v:firma", "v:vertrag"]);
    const vertrag = alle[3];
    expect(zeile(vertrag)).toBe("v:vertrag komplex 1");
    const k = kinderVon(m, vertrag);
    expect(k.map(zeile)).toEqual([
      "nummer v:Nummer 1",
      "v:partner eins von 2 1..n",
      "beginn v:Datum 1",
      "ende xs:date 0..1",
      "Auswahl eins von 2 1",
      "gliederung v:Knoten 0..1",
      "beliebiges Element ##other 0..1",
    ]);
    // Ersetzungsgruppe: die Elemente, die für den abstrakten Kopf stehen dürfen, mit geerbtem Inhalt und Attributen
    const [person, firma] = kinderVon(m, k[1]);
    expect(zeile(person)).toBe("v:person v:Person 1");
    expect(kinder(m, person)).toEqual(["@id xs:ID 1", "name xs:string 1", "geburt xs:date 1"]);
    expect(kinder(m, firma)).toEqual(["@id xs:ID 1", "@alt xs:string 0..1", "name xs:string 1", "register xs:string 1"]);
    // Auswahl: eine Folge darin bleibt eine Möglichkeit
    const auswahl = kinderVon(m, k[4]);
    expect(auswahl.map(zeile)).toEqual(["beitrag b:Betrag 1", "Folge 2 Teile 1"]);
    expect(kinder(m, auswahl[1])).toEqual(["rate b:Betrag 1", "raten xs:int 1"]);
    expect(kinder(m, auswahl[0])).toEqual(["@waehrung b:Waehrung 1"]);
    // Rekursion endet eine Ebene tiefer
    const [knoten] = kinderVon(m, k[5]);
    expect(zeile(knoten)).toBe("knoten v:Knoten 0..n rekursiv");
    expect(kinderVon(m, knoten)).toEqual([]);
  });

  it("zählt und findet Verwendungen", () => {
    const m = lesen();
    const z = kennzahlen(m);
    expect({ ...z, eingebaut: undefined, basen: undefined }).toMatchObject({
      dateien: 3, fehlend: 1, namensraeume: 2, elemente: 4, wurzeln: 4, abstrakt: 2, ersetzungsgruppen: 1,
      komplex: 5, einfach: 4, anonym: 1, gruppen: 1, attributgruppen: 1,
      ableitungen: { erweiterung: 3, einschraenkung: 2, liste: 1, vereinigung: 1 },
      aufzaehlungen: 1, werte: 2, ungenutzt: ["{urn:basis}Ungenutzt"], tiefe: 3, rekursiv: true,
    });
    expect(z.eingebaut.slice(0, 3)).toEqual([{ name: "xs:string", anzahl: 5 }, { name: "xs:date", anzahl: 3 }, { name: "xs:int", anzahl: 3 }]);
    expect(z.basen).toEqual([{ schluessel: "{urn:basis}Partner", anzahl: 2 }]);
    const v = verwendungen(m).nach;
    expect(v.get("{urn:basis}Betrag")!.map((x) => x.von)).toEqual(["Element v:vertrag/beitrag", "Element v:vertrag/rate"]);
    expect(v.get("{urn:vertrag}Knoten")!.map((x) => x.von)).toEqual(["Element v:vertrag/gliederung", "Typ v:Knoten/knoten"]);
  });

  it("behält bei Neudefinition (redefine) das Original als Basis", () => {
    const basis = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:b="urn:b" targetNamespace="urn:b" elementFormDefault="qualified">
  <xs:complexType name="Produkt" abstract="true"><xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence><xs:attribute name="Version" type="xs:string" use="required"/></xs:complexType>
  <xs:element name="produkt" type="b:Produkt"/>
</xs:schema>`;
    const sparte = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:b="urn:b" targetNamespace="urn:b" elementFormDefault="qualified">
  <xs:redefine schemaLocation="basis.xsd">
    <xs:complexType name="Produkt"><xs:complexContent><xs:extension base="b:Produkt"><xs:sequence><xs:element name="deckung" type="xs:decimal"/></xs:sequence></xs:extension></xs:complexContent></xs:complexType>
  </xs:redefine>
</xs:schema>`;
    const m = xsdLesen({ pfad: "sparte.xsd", text: sparte }, [{ pfad: "basis.xsd", text: basis }]);
    expect([...m.typen.keys()]).toEqual(["{urn:b}Produkt", "{urn:b}Produkt (Original)"]);
    expect(m.typen.get("{urn:b}Produkt")!.basis).toBe("{urn:b}Produkt (Original)");
    const [produkt] = wurzeln(m);
    expect(kinder(m, produkt)).toEqual(["@Version xs:string 1", "name xs:string 1", "deckung xs:decimal 1"]);
  });

  it("liest die Beispiele und meldet Dateien, die kein Schema sind", () => {
    const m = xsdLesen(pruefdatei("lieferungen.xsd"), [pruefdatei("hofladen-position.xsd")]);
    const [lieferungen] = wurzeln(m);
    expect(kinder(m, lieferungen)).toEqual(["@stand xs:date 1", "@anzahl xs:positiveInteger 0..1", "lieferung Lieferung 1..n"]);
    const lieferung = kinderVon(m, kinderVon(m, lieferungen)[2]);
    expect(lieferung.map(zeile)).toEqual(["@nr Lieferscheinnummer 1", "@datum xs:date 1", "@zahlweise Zahlweise 0..1", "kunde Kunde 1", "hl:position hl:Position 1..n", "hinweis xs:string 0..1", "bezahlt xs:boolean 1"]);
    expect(kinder(m, lieferung[3])).toEqual(["name xs:string 1", "plz PLZ 1", "ort xs:string 1"]);
    expect(kinder(m, lieferung[4])).toEqual(["@menge xs:positiveInteger 1", "@preis hl:Betrag 1", "@einheit hl:Einheit 0..1"]);
    expect(kennzahlen(m)).toMatchObject({ dateien: 2, fehlend: 0, komplex: 4, einfach: 5, aufzaehlungen: 2, werte: 7, tiefe: 4, rekursiv: false, ungenutzt: [] });
    expect(xsdLesen({ pfad: "a.xsd", text: "<a/>" }, []).fehler).toEqual([{ datei: "a.xsd", meldung: "kein XML Schema (Wurzel ist nicht xs:schema)" }]);
  });

  it("erkennt XML Schema am Wurzelelement", () => {
    expect(istXmlSchema(HAUPT)).toBe(true);
    expect(istXmlSchema(BASIS)).toBe(true);
    expect(istXmlSchema('<schema xmlns="http://www.w3.org/2001/XMLSchema"/>')).toBe(true);
    expect(istXmlSchema('<?xml version="1.0"?><!DOCTYPE x><lieferungen/>')).toBe(false);
    expect(istXmlSchema('<xs:schema xmlns:xs="urn:anders"/>')).toBe(false);
    expect(istXmlSchema('{"$schema": "x"}')).toBe(false);
  });
});
