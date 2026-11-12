// KI (STB-60): der Auszug geht nie ganz hinaus, nennt Felder und Tabellen; Vorschläge des Modells werden gegen das
// geprüft, was Strukturblick kennt.

import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import type { FormatKennung } from "../../kern/format";
import { ableiten } from "../testdaten/ableiten";
import { AUSZUG_ZEICHEN, auszugBauen, BEISPIELE } from "./auszug";
import { ausdruckAus, beschreibungAus, erzeugerKatalog, schemaAus, testdatenAus } from "./vorschlag";

const bestellungen = {
  bestellungen: Array.from({ length: 60 }, (_, i) => ({
    nr: `B-${1000 + i}`,
    kunde: { name: `Kunde ${i}`, plz: i % 3 ? "04109" : "01067" },
    positionen: [{ artikel: "Brot", preis: 2.49 }],
    bezahlt: i % 2 === 0,
  })),
};
const JSON_TEXT = JSON.stringify(bestellungen);
const quelle = (text: string, f: FormatKennung = "json", name = "bestellungen.json") => ({
  name, format: format(f).name, typen: format(f).faehigkeiten.typen, index: format(f).lesen(text).index!, text,
});

describe("Auszug", () => {
  it("nennt Liste, Felder mit Art und höchstens 20 Beispiele", () => {
    const a = auszugBauen(quelle(JSON_TEXT), "werte");
    expect(a.eintraege).toBe(60);
    expect(a.zeilen).toBe(BEISPIELE);
    expect(a.text).toContain("Liste .bestellungen mit 60 Einträgen");
    expect(a.text).toContain("- kunde.plz: Text");
    expect(a.text).toContain("mit führender Null");
    expect(a.text).toContain('"nr":"B-1019"');
    expect(a.text).not.toContain('"nr":"B-1020"');
  });

  it("gibt für SQL die Tabellen mit Spalten und Beispielzeilen", () => {
    const csv = "kundennr;name;ort;umsatz\n" + Array.from({ length: 30 }, (_, i) => `K-${i};Name ${i};Leipzig;1.234,50`).join("\n");
    const a = auszugBauen(quelle(csv, "csv", "kunden.csv"), "sql");
    expect(a.text).toContain("- kunden, 30 Zeilen: kundennr TEXT");
    expect(a.text).toContain("kundennr\tname\tort\tumsatz");
    expect(a.zeilen).toBe(BEISPIELE);
  });

  it("bleibt bei langen Einträgen unter der Grenze", () => {
    const lang = JSON.stringify({ liste: Array.from({ length: 40 }, (_, i) => ({ i, text: "x".repeat(5000) })) });
    const a = auszugBauen(quelle(lang), "werte");
    expect(a.text.length).toBeLessThanOrEqual(AUSZUG_ZEICHEN);
    expect(a.text).toContain("(gekürzt)");
  });

  it("bringt für XPath den Anfang des Textes mit", () => {
    const xml = '<?xml version="1.0"?><kunden><kunde nr="1"><ort>Leipzig</ort></kunde></kunden>';
    expect(auszugBauen(quelle(xml, "xml", "kunden.xml"), "xml").text).toContain('<kunde nr="1">');
  });
});

describe("Vorschläge lesen", () => {
  it("nimmt einen Ausdruck ohne Codezaun", () => {
    expect(ausdruckAus("```sql\nSELECT 1\n```")).toBe("SELECT 1");
  });

  it("liest ein Schema und warnt, wenn es nichts verlangt", () => {
    const s = schemaAus('{"$schema": "https://json-schema.org/draft/2020-12/schema", "title": "x"}');
    expect(s.ok && s.hinweise.length).toBe(1);
    expect(schemaAus("kein json").ok).toBe(false);
  });

  it("vergleicht Beschreibungen und nennt erfundene Felder", () => {
    const alt = '{"type":"object","properties":{"nr":{"type":"string"},"ort":{"type":"string"}}}';
    const neu = '{"type":"object","properties":{"nr":{"type":"string","description":"Nummer"},"plz":{"type":"string","description":"PLZ"}}}';
    const b = beschreibungAus(neu, alt);
    expect(b.ok && b.wert).toMatchObject({ vorher: 0, nachher: 2, dazu: ["plz"], weg: ["ort"] });
  });

  it("übernimmt bei Testdaten nur bekannte Pfade, Erzeuger und Einstellungen", () => {
    const index = format("json").lesen(JSON_TEXT).index!;
    const bisher = ableiten(index, JSON_TEXT, index.erstesKind[0]).spezifikation;
    const antwort = JSON.stringify({
      felder: [
        { pfad: "kunde.name", erzeuger: "name", einstellungen: { teil: "voll", erfunden: 1 }, leer: { anteil: 10, als: "null" } },
        { pfad: "kunde.plz", erzeuger: "zauberei" },
        { pfad: "gibtsnicht", erzeuger: "text" },
      ],
    });
    const t = testdatenAus(antwort, bisher);
    expect(t.ok).toBe(true);
    if (!t.ok) return;
    const name = t.wert.spezifikation.felder.find((f) => f.pfad === "kunde.name")!;
    expect(name).toMatchObject({ erzeuger: "name", einstellungen: { teil: "voll" }, leer: { anteil: 10, als: "null" } });
    expect(t.wert.spezifikation.felder.find((f) => f.pfad === "kunde.plz")!.erzeuger).toBe(bisher.felder.find((f) => f.pfad === "kunde.plz")!.erzeuger);
    expect(t.hinweise.join(" ")).toContain("gibtsnicht");
    expect(t.hinweise.join(" ")).toContain("zauberei");
    expect(t.hinweise.join(" ")).toContain("name.erfunden");
    expect(t.wert.spezifikation.felder.length).toBe(bisher.felder.length);
  });

  it("beschreibt die Erzeuger aus dem Katalog der Testdaten", () => {
    const k = erzeugerKatalog();
    expect(k).toContain("- email (");
    expect(k).not.toContain("- objekt (");
  });
});
