// Schema ableiten: Typen mit Namen aus Schlüsseln und Listen, Pflichtfelder, Schlüssel, Formate und JSON Schema.

import { describe, expect, it } from "vitest";
import { format } from "../formate/registrierung";
import { alsJsonSchema, beschreiben, einzahl, schemaAbleiten, vielfalt } from "./schema";

const JSON_TEXT = JSON.stringify({
  shop: "Hofladen",
  stand: "2026-11-10T08:00:00Z",
  bestellungen: [
    { nr: "B-1", datum: "2026-09-14", kunde: { plz: "04109" }, positionen: [{ preis: 2.5, menge: 1 }], bezahlt: true, notiz: null },
    { nr: "B-2", datum: "2026-09-15", kunde: { plz: "01067" }, positionen: [{ preis: 4, menge: 3 }], bezahlt: false },
  ],
});

describe("Schema", () => {
  const index = format("json").lesen(JSON_TEXT).index!;
  const s = schemaAbleiten(index, JSON_TEXT);
  const typ = (name: string) => s.typen.find((t) => t.name === name)!;

  it("leitet Typen mit Namen aus Schlüsseln und Listen in der Einzahl ab", () => {
    expect(s.typen.map((t) => `${t.name}:${t.vorkommen}`)).toEqual(["Wurzel:1", "Bestellung:2", "Kunde:2", "Position:2"]);
    expect(typ("Bestellung").namensquelle).toBe("liste");
    expect(einzahl("kunden")).toBe("kunde");
    expect(einzahl("dienste")).toBe("dienste");
    expect(einzahl("items")).toBe("item");
  });

  it("beschreibt Felder mit Pflicht, Schlüssel, Format und Vielfalt", () => {
    const b = typ("Bestellung");
    expect(b.felder.map((f) => `${f.name}:${beschreiben(f.arten)}${f.pflicht ? "*" : ""}${f.schluessel ? " (Schlüssel)" : ""}`)).toEqual([
      "nr:Text* (Schlüssel)", "datum:Datum*", "kunde:Kunde*", "positionen:Liste von Position*", "bezahlt:Wahrheitswert*", "notiz:Null",
    ]);
    expect(typ("Wurzel").felder.map((f) => beschreiben(f.arten))).toEqual(["Text", "Datum und Zeit", "Liste von Bestellung"]);
    expect(typ("Kunde").felder[0].arten).toEqual([{ art: "text", format: "ziffern" }]);
    expect(typ("Position").felder.map((f) => beschreiben(f.arten))).toEqual(["Zahl", "Zahl, ganz"]);
    expect(b.felder.map(vielfalt)).toEqual(["1", "1", "1", "0..n", "1", "0..1"]);
  });

  it("schreibt JSON Schema mit $defs, required und Formaten", () => {
    const j = alsJsonSchema(s, "bestellungen.json") as { required: string[]; properties: Record<string, unknown>; $defs: Record<string, { required: string[]; properties: Record<string, unknown> }> };
    expect(j.required).toEqual(["shop", "stand", "bestellungen"]);
    expect(j.properties.bestellungen).toEqual({ type: "array", items: { $ref: "#/$defs/Bestellung" } });
    expect(j.$defs.Bestellung.required).toEqual(["nr", "datum", "kunde", "positionen", "bezahlt"]);
    expect(j.$defs.Bestellung.properties.datum).toEqual({ type: "string", format: "date" });
    expect(j.$defs.Position.properties.menge).toEqual({ type: "integer" });
  });

  it("nimmt eine Liste als Wurzel (CSV) und Schlüssel mit Sonderzeichen", () => {
    const csv = "kunden nr;e-mail\nK-1;a@example.org\nK-2;b@example.org\n";
    const ix = format("csv").lesen(csv).index!;
    const c = schemaAbleiten(ix, csv);
    expect(c.typen.map((t) => t.name)).toEqual(["Eintrag"]);
    expect(beschreiben(c.wurzel)).toBe("Liste von Eintrag");
    expect(c.typen[0].felder.map((f) => f.name)).toEqual(["kunden nr", "e-mail"]);
    // Datum in deutscher Form: kein "format: date" (das verlangt JJJJ-MM-TT), aber als Datum beschrieben
    const d = "angelegt\n01.02.2024\n2024-03-01\n";
    const dx = format("csv").lesen(d).index!;
    const ds = schemaAbleiten(dx, d);
    expect(beschreiben(ds.typen[0].felder[0].arten)).toBe("Datum, verschiedene Formen");
    expect((alsJsonSchema(ds, "d.csv") as { $defs: Record<string, { properties: Record<string, unknown> }> }).$defs.Eintrag.properties.angelegt).toEqual({ type: "string" });
    const j = alsJsonSchema(c, "kunden.csv") as { type: string; items: unknown; $defs: Record<string, { properties: Record<string, unknown> }> };
    expect(j.type).toBe("array");
    expect(Object.keys(j.$defs.Eintrag.properties)).toEqual(["kunden nr", "e-mail"]);
  });
});
