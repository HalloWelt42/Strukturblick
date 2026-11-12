// XML gegen XML Schema: Befunde mit Stelle im Index und deutscher Meldung, Importe aus Paket und nach Dateinamen,
// fehlende Importe verständlich, Verweis im Dokument.

import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { verwiesenesSchema, xsdPruefen } from "./pruefen";
import { deuten, schemaGrund } from "./meldungen";

const BASIS = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:basis" xmlns="urn:basis">
  <xs:simpleType name="PLZ"><xs:restriction base="xs:string"><xs:pattern value="[0-9]{5}"/></xs:restriction></xs:simpleType>
  <xs:simpleType name="Art"><xs:restriction base="xs:string"><xs:enumeration value="Abholung"/><xs:enumeration value="Paket"/></xs:restriction></xs:simpleType>
</xs:schema>`;

const HAUPT = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:b="urn:basis">
  <xs:import namespace="urn:basis" schemaLocation="../basis/basis.xsd"/>
  <xs:element name="lieferungen"><xs:complexType><xs:sequence>
    <xs:element name="lieferung" maxOccurs="unbounded"><xs:complexType><xs:sequence>
      <xs:element name="kunde" type="xs:string"/>
      <xs:element name="plz" type="b:PLZ"/>
      <xs:element name="art" type="b:Art"/>
      <xs:element name="menge" type="xs:positiveInteger"/>
    </xs:sequence><xs:attribute name="nr" type="xs:string" use="required"/></xs:complexType></xs:element>
  </xs:sequence></xs:complexType></xs:element>
</xs:schema>`;

const XML = `<?xml version="1.0"?>
<lieferungen>
  <lieferung nr="L-1"><kunde>Ida</kunde><plz>4109</plz><art>Kurier</art><menge>0</menge></lieferung>
  <lieferung nr="L-2"><kunde>Ole</kunde><plz>01067</plz><art>Paket</art><menge>2</menge></lieferung>
  <lieferung><kunde>Karl</kunde><menge>1</menge></lieferung>
</lieferungen>`;

describe("XML gegen XSD", () => {
  const index = format("xml").lesen(XML).index!;

  it("findet Fehler mit Stelle, deutscher Meldung und Vorschlag; Import aus dem Paket", async () => {
    const p = await xsdPruefen(index, XML, { pfad: "paket/haupt/haupt.xsd", text: HAUPT }, [{ pfad: "paket/basis/basis.xsd", text: BASIS }]);
    if (!p.ok) throw new Error(p.fehler);
    expect(p.befunde.map((b) => `${b.zeile} ${b.zeiger} ${b.meldung}`)).toEqual([
      "3 /lieferungen/lieferung/0/plz Hat 4 statt 5 Ziffern",
      "3 /lieferungen/lieferung/0/art Kurier ist keiner der erlaubten Werte",
      "3 /lieferungen/lieferung/0/menge '0' passt nicht zum Typ xs:positiveInteger",
      "5 /lieferungen/lieferung/2 Pflichtattribut nr fehlt",
      "5 /lieferungen/lieferung/2/menge menge steht hier nicht an der richtigen Stelle",
    ]);
    expect(p.befunde[0]).toMatchObject({ vorschlag: "04109", erwartet: "Muster [0-9]{5}", gefunden: "'4109'" });
    expect(p.befunde[4].erwartet).toBe("plz");
  });

  it("findet Importe auch nur nach Dateinamen (Ordner der Ablage)", async () => {
    const p = await xsdPruefen(index, XML, { pfad: "haupt.xsd", text: HAUPT }, [{ pfad: "basis.xsd", text: BASIS }]);
    expect(p.ok && p.befunde.length).toBe(5);
  });

  it("sagt, welcher Import fehlt", async () => {
    const p = await xsdPruefen(index, XML, { pfad: "haupt.xsd", text: HAUPT }, []);
    expect(p).toMatchObject({ ok: false, fehlend: ["basis.xsd"] });
    if (!p.ok) expect(p.fehler).toContain("basis.xsd");
  });

  it("gültiges Dokument ohne Befund; kaputtes Dokument verständlich", async () => {
    const gut = `<lieferungen><lieferung nr="1"><kunde>A</kunde><plz>01067</plz><art>Paket</art><menge>1</menge></lieferung></lieferungen>`;
    const p = await xsdPruefen(format("xml").lesen(gut).index, gut, { pfad: "h.xsd", text: HAUPT }, [{ pfad: "basis.xsd", text: BASIS }]);
    expect(p.ok && p.befunde).toEqual([]);
    const kaputt = await xsdPruefen(null, "<a><b></a>", { pfad: "h.xsd", text: HAUPT }, [{ pfad: "basis.xsd", text: BASIS }]);
    expect(kaputt).toMatchObject({ ok: false });
  });

  it("liest den Verweis auf das Schema im Dokument", () => {
    expect(verwiesenesSchema('<a xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="schemas/liefer.xsd"/>')).toBe("liefer.xsd");
    expect(verwiesenesSchema('<a xsi:schemaLocation="urn:x  ../x/haupt.xsd"/>')).toBe("haupt.xsd");
    expect(verwiesenesSchema("<a/>")).toBeNull();
  });

  it("Fehler im Schema selbst verständlich", async () => {
    expect(schemaGrund("Element '{http://www.w3.org/2001/XMLSchema}element', attribute 'type': References from this schema to components in the namespace 'urn:x' are not allowed, since not indicated by an import statement.")).toBe("Das Schema verweist auf Bausteine aus dem Namensraum urn:x, ohne ihn zu importieren (ein Fehler im Schema selbst)");
    const ohneImport = HAUPT.replace(/<xs:import[^>]*\/>/, "");
    const p = await xsdPruefen(index, XML, { pfad: "h.xsd", text: ohneImport }, [{ pfad: "basis.xsd", text: BASIS }]);
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.fehler).toContain("ohne ihn zu importieren");
  });

  it("unbekannte Meldungen bleiben im Wortlaut, gekennzeichnet", () => {
    expect(deuten("Element 'x': Something unusual.\n").meldung).toBe("libxml2: Element 'x': Something unusual.");
  });
});

describe("Dokumente, an denen libxml2 abbricht", () => {
  it("meldet Entities aus einer DTD statt abzustürzen", async () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE a [
  <!ENTITY extern SYSTEM "datei.txt">
]>
<a>&extern;</a>`;
    const p = await xsdPruefen(null, xml, { pfad: "a.xsd", text: '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="a" type="xs:string"/></xs:schema>' }, []);
    expect(p).toMatchObject({ ok: false });
    expect(p.ok ? "" : p.fehler).toContain("Entities in einer DTD");
  });
});

describe("Beispiel lieferungen.xml mit lieferungen.xsd", () => {
  it("findet über den Import die Positionen und meldet nur bezahlt (ja und nein sind keine Wahrheitswerte)", async () => {
    const { readFileSync } = await import("node:fs");
    const lies = (n: string) => readFileSync(new URL(`../../../../pruefdaten/${n}`, import.meta.url), "utf8");
    const xml = lies("lieferungen.xml");
    expect(verwiesenesSchema(xml)).toBe("lieferungen.xsd");
    const p = await xsdPruefen(format("xml").lesen(xml).index, xml, { pfad: "lieferungen.xsd", text: lies("lieferungen.xsd") }, [{ pfad: "hofladen-position.xsd", text: lies("hofladen-position.xsd") }]);
    if (!p.ok) throw new Error(p.fehler);
    expect(p.befunde).toHaveLength(12);
    expect(new Set(p.befunde.map((b) => b.regel))).toEqual(new Set(["type xs:boolean"]));
    expect(p.befunde[0]).toMatchObject({ zeiger: "/lieferungen/lieferung/0/bezahlt", meldung: "'nein' passt nicht zum Typ xs:boolean" });
  });
});
