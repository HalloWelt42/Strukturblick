// XML Schema aus Daten ableiten: Werttypen, Pflicht und Vielfalt, Reihenfolge, gemischter Inhalt, Namensräume mit
// eigener Datei. Probe aufs Exempel: Das Ausgangsdokument ist gegen das abgeleitete Schema gültig (libxml2).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { xsdAbleiten } from "./ableiten";
import { xsdSchreiben, type Schemaausgabe } from "./ausgeben";
import { xsdPruefen } from "./pruefen";
import { Wertsammler } from "./werttyp";

const lies = (name: string) => readFileSync(new URL(`../../../../pruefdaten/${name}`, import.meta.url), "utf8");
const typ = (...werte: string[]) => { const w = new Wertsammler(); for (const x of werte) w.hinzu(x); return w.typ(); };

function ableiten(xml: string): Schemaausgabe[] {
  const a = xsdAbleiten(xml);
  if (!a) throw new Error("nicht lesbar");
  return xsdSchreiben(a, { quelle: "probe.xml", dateiname: (_ns, p, haupt) => (haupt ? "probe.xsd" : `probe.${p}.xsd`) });
}

async function gueltig(xml: string, dateien: Schemaausgabe[]): Promise<string[]> {
  const haupt = dateien.find((d) => d.haupt)!;
  const p = await xsdPruefen(format("xml").lesen(xml).index, xml, { pfad: haupt.name, text: haupt.text }, dateien.filter((d) => !d.haupt).map((d) => ({ pfad: d.name, text: d.text })));
  if (!p.ok) return [p.fehler];
  return p.befunde.map((b) => b.meldung);
}

describe("Werttyp aus Werten", () => {
  it("nimmt den engsten passenden Typ", () => {
    expect(typ("1", "2", "-3")).toBe("integer");
    expect(typ("1", "0")).toBe("integer");
    expect(typ("true", "0")).toBe("boolean");
    expect(typ("5.10", "7")).toBe("decimal");
    expect(typ("1e3", "2")).toBe("double");
    expect(typ("06108", "1")).toBe("string");
    expect(typ("2026-11-01", "2026-02-28")).toBe("date");
    expect(typ("2026-11-01T10:00:00Z")).toBe("dateTime");
    expect(typ("08:15:00")).toBe("time");
    expect(typ("ja", "nein")).toBe("string");
    expect(typ("3", "")).toBe("string");
    expect(typ(" 4 ")).toBe("integer");
  });
});

describe("XML Schema aus Daten", () => {
  it("leitet Pflicht, Vielfalt, Typen und Reihenfolge ab", async () => {
    const xml = `<katalog stand="2026-11-12">
  <artikel nr="1" neu="true"><name>Quark</name><preis>2.49</preis><tag>milch</tag><tag>frisch</tag></artikel>
  <artikel nr="2"><name>Honig</name><preis>7</preis><notiz>Glas</notiz></artikel>
</katalog>`;
    const [d] = ableiten(xml);
    expect(d.text).toContain('<xs:element name="katalog">');
    expect(d.text).toContain('<xs:element name="artikel" maxOccurs="unbounded">');
    expect(d.text).toContain('<xs:element name="preis" type="xs:decimal"/>');
    expect(d.text).toContain('<xs:element name="tag" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>');
    expect(d.text).toContain('<xs:element name="notiz" type="xs:string" minOccurs="0"/>');
    expect(d.text).toContain('<xs:attribute name="nr" type="xs:integer" use="required"/>');
    expect(d.text).toContain('<xs:attribute name="neu" type="xs:boolean"/>');
    expect(d.text).toContain('<xs:attribute name="stand" type="xs:date" use="required"/>');
    // name vor preis vor tag und notiz: Reihenfolge der Daten
    expect(d.text.indexOf('name="name"')).toBeLessThan(d.text.indexOf('name="preis"'));
    expect(await gueltig(xml, [d])).toEqual([]);
  });

  it("nimmt bei wechselnder Reihenfolge eine Auswahl, bei Text neben Elementen gemischten Inhalt", async () => {
    const xml = `<a><b>1</b><c x="y">Text</c><b>2</b><d/><e>Hallo <f>Welt</f>!</e><e>nur Text</e></a>`;
    const [d] = ableiten(xml);
    expect(d.text).toContain('<xs:choice minOccurs="0" maxOccurs="unbounded">');
    expect(d.text).toContain('<xs:complexType mixed="true">');
    expect(d.text).toContain('<xs:extension base="xs:string">');
    expect(await gueltig(xml, [d])).toEqual([]);
  });

  it("schreibt je Namensraum eine Datei mit Import; xml:-Attribute sind pauschal erlaubt", async () => {
    const xml = lies("lieferungen.xml");
    const dateien = ableiten(xml);
    expect(dateien.map((d) => [d.name, d.ns, d.haupt])).toEqual([["probe.xsd", "", true], ["probe.hl.xsd", "urn:example:hofladen", false]]);
    expect(dateien[0].text).toContain('<xs:import namespace="urn:example:hofladen" schemaLocation="probe.hl.xsd"/>');
    expect(dateien[0].text).toContain('<xs:element ref="hl:position" maxOccurs="unbounded"/>');
    expect(dateien[0].text).toContain('<xs:element name="plz" type="xs:string"/>');
    expect(dateien[0].text).toContain('<xs:element name="bezahlt" type="xs:string"/>');
    expect(dateien[1].text).toContain('targetNamespace="urn:example:hofladen" elementFormDefault="qualified"');
    expect(dateien[1].text).toContain('<xs:attribute name="preis" type="xs:decimal" use="required"/>');
    expect(await gueltig(xml, dateien)).toEqual([]);

    const mitSprache = `<t:text xmlns:t="urn:t" xml:lang="de"><t:absatz>Eins</t:absatz><fuss>x</fuss></t:text>`;
    const [t] = ableiten(mitSprache);
    expect(t.text).toContain('processContents="skip"');
    expect(t.text).toContain('<xs:element name="fuss" form="unqualified" type="xs:string"/>');
    expect(await gueltig(mitSprache, [t])).toEqual([]);
  });

  it("erklärt Typen aus xsi:type benannt und erlaubt xsi:nil", async () => {
    const xml = `<v:vertrag xmlns:v="urn:v" xmlns:p="urn:p" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <v:partner xsi:type="p:Person"><p:name>Ida</p:name><p:geburt>1990-01-01</p:geburt></v:partner>
  <v:partner xsi:type="p:Firma"><p:name>Hof GmbH</p:name><p:register>HRB 1</p:register></v:partner>
  <v:betrag xsi:type="xsd:decimal" xmlns:xsd="http://www.w3.org/2001/XMLSchema">12.5</v:betrag>
  <v:ende xsi:nil="true"/>
  <v:ende>2026-12-31</v:ende>
</v:vertrag>`;
    const dateien = ableiten(xml);
    expect(dateien.map((d) => d.name)).toEqual(["probe.xsd", "probe.p.xsd"]);
    expect(dateien[0].text).toContain('<xs:element name="partner" maxOccurs="unbounded"/>');
    expect(dateien[0].text).toContain('<xs:element name="betrag"/>');
    expect(dateien[0].text).toContain('<xs:element name="ende" type="xs:date" nillable="true" maxOccurs="unbounded"/>');
    expect(dateien[1].text).toContain('<xs:complexType name="Person">');
    expect(dateien[1].text).toContain('<xs:complexType name="Firma">');
    expect(await gueltig(xml, dateien)).toEqual([]);
  });

  it("hält sich an libxml2: Leerraum, Kalender, xsi:nil=false, eingebettetes Schema", async () => {
    const xml = `<a xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><n> 4 </n><b> true </b><z>
      2018-07-13T09:12:25Z
    </z><d>2026-02-30</d><k xsi:nil="false"/><w:types xmlns:w="urn:w"><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="e"/></xs:schema></w:types></a>`;
    const dateien = ableiten(xml);
    expect(dateien[0].text).toContain('<xs:element name="n" type="xs:integer"/>');
    expect(dateien[0].text).toContain('<xs:element name="z" type="xs:string"/>');
    expect(dateien[0].text).toContain('<xs:element name="d" type="xs:string"/>');
    expect(dateien[0].text).toContain('<xs:element name="k" type="xs:string" nillable="true"/>');
    expect(await gueltig(xml, dateien)).toEqual([]);
  });

  it("gibt bei kaputtem XML nichts", () => {
    expect(xsdAbleiten("<a><b></a>")).toBeNull();
  });
});
