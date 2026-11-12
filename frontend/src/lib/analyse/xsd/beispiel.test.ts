// Beispieldokument aus XML Schema: Muster, Werte in den Grenzen, und die Probe aufs Exempel mit libxml2 (das erzeugte
// Dokument ist gegen sein Schema gültig), für die Beispiele und ein Schema mit Ableitung, Ersetzung, Auswahl und Rekursion.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { beispielErzeugen } from "./beispiel";
import { xsdLesen } from "./lesen";
import { textZumMuster } from "./muster";
import { xsdPruefen, type Schemadatei } from "./pruefen";
import { einschraenkungen, MUSTERWERTE } from "./werte";

const lies = (name: string): Schemadatei => ({ pfad: name, text: readFileSync(new URL(`../../../../pruefdaten/${name}`, import.meta.url), "utf8") });

async function befunde(xml: string, haupt: Schemadatei, weitere: Schemadatei[]): Promise<string[]> {
  const p = await xsdPruefen(format("xml").lesen(xml).index, xml, haupt, weitere);
  return p.ok ? p.befunde.map((b) => b.meldung) : [p.fehler];
}

describe("Text zum Muster", () => {
  it("nimmt den kürzesten passenden Text", () => {
    expect(textZumMuster("[0-9]{5}")).toBe("00000");
    expect(textZumMuster("L-[0-9]{4}")).toBe("L-0000");
    expect(textZumMuster("[A-Z]{2}\\d{2}[A-Z0-9]{1,30}")).toBe("AA11A");
    expect(textZumMuster("(ja|nein)")).toBe("ja");
    expect(textZumMuster("[^0-9]+")).toBe("a");
    expect(textZumMuster("\\p{Lu}\\p{Ll}*")).toBe("A");
    expect(textZumMuster("[a-z-[aeiou]]")).toBe("x");
    expect(textZumMuster("\\d+(\\.\\d{1,2})?")).toBe("1");
    expect(textZumMuster("(?=x)")).toBeNull();
  });
});

describe("Werte aus den Einschränkungen", () => {
  it("hält Grenzen, Stellen und Längen ein", () => {
    const m = xsdLesen({ pfad: "a.xsd", text: `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="Menge"><xs:restriction base="xs:positiveInteger"><xs:minInclusive value="10"/><xs:maxExclusive value="99"/></xs:restriction></xs:simpleType>
  <xs:simpleType name="Kurz"><xs:restriction base="xs:string"><xs:minLength value="12"/><xs:maxLength value="12"/></xs:restriction></xs:simpleType>
  <xs:simpleType name="Klein"><xs:restriction base="xs:decimal"><xs:maxInclusive value="0.5"/><xs:fractionDigits value="1"/></xs:restriction></xs:simpleType>
  <xs:simpleType name="Ab"><xs:restriction base="xs:date"><xs:minInclusive value="2030-01-01"/></xs:restriction></xs:simpleType>
</xs:schema>` }, []);
    const w = (q: string) => MUSTERWERTE.wert({ einschraenkungen: einschraenkungen(m, q, null), name: "x", nummer: 1 });
    expect(w("Menge")).toBe("10");
    expect(w("Kurz")).toHaveLength(12);
    expect(w("Klein")).toBe("0.5");
    expect(w("Ab")).toBe("2030-01-01");
    // Erklärt das Schema xs:ID selbst (Schema der Schemasprache), bleibt es eine eindeutige Kennung
    const xs = xsdLesen({ pfad: "x.xsd", text: `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.w3.org/2001/XMLSchema"><xs:simpleType name="ID"><xs:restriction base="xs:NCName"/></xs:simpleType></xs:schema>` }, []);
    expect(MUSTERWERTE.wert({ einschraenkungen: einschraenkungen(xs, "{http://www.w3.org/2001/XMLSchema}ID", null), name: "id", nummer: 7 })).toBe("id7");
    // Muster bei Zeitpunkten: der übliche Wert, wenn er passt, statt eines Musters ohne gültigen Monat
    const z = xsdLesen({ pfad: "z.xsd", text: `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:simpleType name="Z"><xs:restriction base="xs:dateTime"><xs:pattern value="\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"/></xs:restriction></xs:simpleType></xs:schema>` }, []);
    expect(MUSTERWERTE.wert({ einschraenkungen: einschraenkungen(z, "Z", null), name: "x", nummer: 1 })).toBe("2026-01-15T10:30:00");
  });
});

describe("Beispieldokument", () => {
  it("ist für die Lieferscheine gültig, nur Pflicht und mit allem", async () => {
    const haupt = lies("lieferungen.xsd");
    const weitere = [lies("hofladen-position.xsd")];
    const m = xsdLesen(haupt, weitere);
    for (const umfang of ["pflicht", "alles"] as const) {
      const b = beispielErzeugen(m, { wurzel: "lieferungen", umfang, schemaOrt: "lieferungen.xsd" });
      expect(b.hinweise).toEqual([]);
      expect(await befunde(b.text, haupt, weitere)).toEqual([]);
      expect(b.text).toContain('xsi:noNamespaceSchemaLocation="lieferungen.xsd"');
      expect(b.text).toContain("<plz>00000</plz>");
      if (umfang === "alles") expect(b.text).toContain('zahlweise="bar"');
      else expect(b.text).not.toContain("hinweis");
    }
  });

  it("findet Ersatz für Abstraktes, wählt in Auswahl und beendet Rekursion", async () => {
    const haupt: Schemadatei = { pfad: "v.xsd", text: `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:v="urn:v" targetNamespace="urn:v" elementFormDefault="qualified">
  <xs:complexType name="Partner" abstract="true"><xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence><xs:attribute name="id" type="xs:ID" use="required"/></xs:complexType>
  <xs:complexType name="Person"><xs:complexContent><xs:extension base="v:Partner"><xs:sequence><xs:element name="geburt" type="xs:date"/></xs:sequence></xs:extension></xs:complexContent></xs:complexType>
  <xs:element name="partner" type="v:Partner" abstract="true"/>
  <xs:element name="person" type="v:Person" substitutionGroup="v:partner"/>
  <xs:complexType name="Knoten"><xs:sequence><xs:element name="titel" type="xs:token"/><xs:element name="knoten" type="v:Knoten" minOccurs="0" maxOccurs="unbounded"/></xs:sequence></xs:complexType>
  <xs:simpleType name="Nummer"><xs:union memberTypes="xs:int xs:string"/></xs:simpleType>
  <xs:element name="vertrag">
    <xs:complexType><xs:sequence>
      <xs:element name="nummer" type="v:Nummer"/>
      <xs:element ref="v:partner" maxOccurs="unbounded"/>
      <xs:element name="inhaber" type="v:Partner"/>
      <xs:choice><xs:element name="beitrag" type="xs:decimal"/><xs:element name="frei" type="xs:boolean"/></xs:choice>
      <xs:element name="gliederung" type="v:Knoten"/>
    </xs:sequence><xs:attribute name="stand" type="xs:dateTime"/></xs:complexType>
  </xs:element>
</xs:schema>` };
    const m = xsdLesen(haupt, []);
    for (const umfang of ["pflicht", "alles"] as const) {
      const b = beispielErzeugen(m, { wurzel: "{urn:v}vertrag", umfang, schemaOrt: "v.xsd" });
      expect(b.hinweise).toEqual([]);
      expect(b.text).toContain('xsi:schemaLocation="urn:v v.xsd"');
      expect(b.text).toContain("<v:person");
      expect(b.text).toContain('xsi:type="v:Person"');
      expect(await befunde(b.text, haupt, [])).toEqual([]);
    }
  });
});
