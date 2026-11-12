// XML: Lesart (Attribute als @name, #text, gleichnamige Geschwister als Liste), Spannen, Entities und CDATA, Fehler,
// Erkennen und Schreiben an Spannen.

import { describe, expect, it } from "vitest";
import { anwenden } from "../kern/aenderung";
import { inhalt, KEIN, knotenAn, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { knotenZu } from "../kern/pfade";
import { erkennen } from "./registrierung";
import { XML_FORMAT } from "./xml";

/** Wert eines Knotens aus dem Index (eigen, weil Formate die Analyse nicht einbinden) */
function wertAus(index: Strukturindex, text: string, k = 0): unknown {
  const art = index.art[k];
  if (art === KnotenArt.objekt || art === KnotenArt.liste) {
    const kinder: number[] = [];
    for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) kinder.push(c);
    return art === KnotenArt.liste ? kinder.map((c) => wertAus(index, text, c)) : Object.fromEntries(kinder.map((c) => [schluessel(index, text, c), wertAus(index, text, c)]));
  }
  return inhalt(index, text, k);
}

const TEXT = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Lieferungen eines erfundenen Hofladens -->
<lieferungen xmlns:h="urn:hofladen" stand="2026-11-10">
  <lieferung nr="L-1">
    <kunde>Ida &amp; Ole Wendt</kunde>
    <plz>01067</plz>
    <h:position menge="2">Honig</h:position>
    <h:position menge="1">Saft</h:position>
    <notiz><![CDATA[Bitte <klingeln>]]></notiz>
    <leer/>
  </lieferung>
  <lieferung nr="L-2">
    <kunde>Karl Weiß</kunde>
    <plz>04229</plz>
    <h:position menge="6">Eier</h:position>
  </lieferung>
</lieferungen>
`;

describe("XML lesen", () => {
  const r = XML_FORMAT.lesen(TEXT);
  const index = r.index!;

  it("Lesart: Attribute mit @, Text neben Attributen als #text, Wiederholungen als Liste", () => {
    expect(r.diagnosen).toEqual([]);
    expect(wertAus(index, TEXT)).toEqual({
      lieferungen: {
        "@xmlns:h": "urn:hofladen",
        "@stand": "2026-11-10",
        lieferung: [
          { "@nr": "L-1", kunde: "Ida & Ole Wendt", plz: "01067", "h:position": [{ "@menge": "2", "#text": "Honig" }, { "@menge": "1", "#text": "Saft" }], notiz: "Bitte <klingeln>", leer: "" },
          { "@nr": "L-2", kunde: "Karl Weiß", plz: "04229", "h:position": { "@menge": "6", "#text": "Eier" } },
        ],
      },
    });
  });

  it("Spannen: Element ganz, Inhalt zwischen den Tags, Attribut in Anführungszeichen", () => {
    const kunde = knotenZu(index, TEXT, "/lieferungen/lieferung/0/kunde");
    expect(TEXT.slice(index.von[kunde], index.bis[kunde])).toBe("<kunde>Ida &amp; Ole Wendt</kunde>");
    expect(TEXT.slice(index.inhaltVon[kunde], index.inhaltBis[kunde])).toBe("Ida &amp; Ole Wendt");
    const nr = knotenZu(index, TEXT, "/lieferungen/lieferung/1/@nr");
    expect(TEXT.slice(index.von[nr], index.bis[nr])).toBe('"L-2"');
    const liste = knotenZu(index, TEXT, "/lieferungen/lieferung");
    expect(index.art[liste]).toBe(KnotenArt.liste);
    expect(TEXT.slice(index.von[liste], index.bis[liste])).toMatch(/^<lieferung nr="L-1">[\s\S]*<\/lieferung>$/);
    expect(knotenAn(index, TEXT.indexOf("Eier"))).toBe(knotenZu(index, TEXT, "/lieferungen/lieferung/1/h:position/#text"));
  });

  it("meldet Fehler mit Stelle und liest, so weit es geht", () => {
    const f = XML_FORMAT.lesen("<a><b>1</c><d x=1>2</d></a>");
    expect(f.diagnosen.map((d) => d.meldung)).toEqual(["Ende-Tag </c> ohne passendes Start-Tag", "Wert von x ohne Anführungszeichen", "<b> ist nicht geschlossen"]);
    expect(XML_FORMAT.lesen("<a>").diagnosen[0].meldung).toBe("<a> ist nicht geschlossen");
    expect(XML_FORMAT.lesen("kein xml").index).toBeNull();
    expect(XML_FORMAT.lesen("<a>&unbekannt;</a>").diagnosen[0]).toMatchObject({ schwere: "fehler", meldung: "Unbekannte Entity &unbekannt;" });
  });

  it("prüft streng wie ein XML-Parser: &, <, Deklaration, Namensräume, Kommentare, Steuerzeichen", () => {
    const meldung = (t: string) => XML_FORMAT.lesen(t).diagnosen.map((d) => d.schwere + ": " + d.meldung);
    expect(meldung("<a>A & B</a>")).toEqual(["fehler: Ein & muss als &amp; stehen"]);
    expect(meldung('<a x="1<2"/>')).toEqual(["fehler: < ist im Wert von x nicht erlaubt"]);
    expect(meldung(' \n<?xml version="1.0"?><a/>')).toEqual(["fehler: Die XML-Deklaration muss ganz am Anfang stehen"]);
    expect(meldung("<p:a/>")).toEqual(["fehler: Das Präfix p ist nicht erklärt"]);
    expect(meldung('<a xmlns:p="u"><p:b p:c="1" xml:lang="de"/></a>')).toEqual([]);
    expect(meldung('<a xmlns:p="u"><b xmlns:p=""/></a>')).toEqual(["fehler: Das Präfix p darf nicht auf leer gesetzt werden"]);
    expect(meldung("<a><!-- a -- b --></a>")).toEqual(["fehler: -- ist in einem Kommentar nicht erlaubt"]);
    expect(meldung("<a><!----></a>")).toEqual([]);
    expect(meldung("<a>\u0001</a>")).toEqual(["fehler: Steuerzeichen U+0001 ist in XML nicht erlaubt"]);
    expect(meldung('<!DOCTYPE a [<!ENTITY fern SYSTEM "file:///etc/passwd">]><a>&fern;</a>')).toEqual(["warnung: Entity &fern; aus der DTD wird nicht aufgelöst"]);
  });

  it("Zeichenreferenzen, DOCTYPE und gemischter Inhalt", () => {
    const t = '<!DOCTYPE a [<!ENTITY x "y">]>\n<a>Euro &#8364; &#x20AC;<b/>und mehr</a>';
    const f = XML_FORMAT.lesen(t);
    expect(wertAus(f.index!, t)).toEqual({ a: { "#text": ["Euro € €", "und mehr"], b: "" } });
  });
});

describe("XML erkennen", () => {
  it("XML gewinnt mit Deklaration oder Tags, andere bleiben, was sie sind", () => {
    expect(erkennen(TEXT).kennung).toBe("xml");
    expect(erkennen("<a><b>1</b></a>").kennung).toBe("xml");
    expect(erkennen('{"a": "<b>"}').kennung).toBe("json");
    expect(erkennen("a = 1\n").kennung).toBe("toml");
  });
});

describe("XML schreiben", () => {
  const r = XML_FORMAT.lesen(TEXT);
  const index = r.index!;
  const aendern = (a: readonly { von: number; bis: number; einfuegen: string }[]) => anwenden(TEXT, a).text;

  it("ersetzt Inhalt und Attribut maskiert, leeres Element bekommt Tags", () => {
    const kunde = knotenZu(index, TEXT, "/lieferungen/lieferung/1/kunde");
    expect(aendern([XML_FORMAT.wertSchreiben(TEXT, index, kunde, { art: "text", wert: "A < B & C" }, r.merkmale)])).toContain("<kunde>A &lt; B &amp; C</kunde>");
    const nr = knotenZu(index, TEXT, "/lieferungen/lieferung/0/@nr");
    expect(aendern([XML_FORMAT.wertSchreiben(TEXT, index, nr, { art: "text", wert: 'L-"9"' }, r.merkmale)])).toContain('nr="L-&quot;9&quot;"');
    const leer = knotenZu(index, TEXT, "/lieferungen/lieferung/0/leer");
    expect(aendern([XML_FORMAT.wertSchreiben(TEXT, index, leer, { art: "text", wert: "x" }, r.merkmale)])).toContain("<leer>x</leer>");
    expect(() => XML_FORMAT.wertSchreiben(TEXT, index, leer, { art: "nichts" }, r.merkmale)).toThrow(/kein null/);
  });

  it("entfernt Einträge und Felder mit ihren Zeilen, Attribute samt Leerraum", () => {
    const liste = knotenZu(index, TEXT, "/lieferungen/lieferung");
    const ohneErste = aendern(XML_FORMAT.eintraegeEntfernen(TEXT, index, liste, [0]));
    expect(ohneErste).not.toContain("L-1");
    expect(ohneErste).toContain('<lieferungen xmlns:h="urn:hofladen" stand="2026-11-10">\n  <lieferung nr="L-2">');
    const ohnePlz = aendern(XML_FORMAT.spalteEntfernen(TEXT, index, liste, "plz"));
    expect(ohnePlz).not.toContain("<plz>");
    expect(ohnePlz).toContain("</kunde>\n    <h:position");
    const ohneNr = aendern(XML_FORMAT.spalteEntfernen(TEXT, index, liste, "@nr"));
    expect(ohneNr).toContain("<lieferung>\n");
    const ohnePos = aendern(XML_FORMAT.spalteEntfernen(TEXT, index, liste, "h:position"));
    expect(ohnePos).not.toContain("position");
    for (const t of [ohneErste, ohnePlz, ohneNr, ohnePos]) expect(XML_FORMAT.lesen(t).diagnosen).toEqual([]);
  });
});

describe("Beispiel lieferungen.xml", () => {
  it("liest ohne Befund, die Lieferungen sind eine Liste", async () => {
    const { readFileSync } = await import("node:fs");
    const text = readFileSync(new URL("../../../pruefdaten/lieferungen.xml", import.meta.url), "utf8");
    const r = XML_FORMAT.lesen(text);
    expect(r.diagnosen).toEqual([]);
    expect(erkennen(text, "lieferungen.xml").kennung).toBe("xml");
    const liste = knotenZu(r.index!, text, "/lieferungen/lieferung");
    expect(r.index!.kinder[liste]).toBe(12);
  });
});
